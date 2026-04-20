import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import request from 'supertest';
import { configureExpressApp } from '../src/configure-express-app';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { GithubPrScoutService } from '../src/integrations/github/github-pr-scout.service';
import { VibeKanbanBoardService } from '../src/vibe-kanban/vibe-kanban-board.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';
import { testingAppModule } from './testing-app-module';

type GraphqlEnvelope<T> = { data?: T; errors?: unknown[] };

function graphBody<T>(res: { body: unknown }): GraphqlEnvelope<T> {
  return res.body as GraphqlEnvelope<T>;
}

const DECLINE_TRIAGE = /* GraphQL */ `
  mutation Decline($prUrl: String!) {
    declineTriage(prUrl: $prUrl) {
      ok
    }
  }
`;

const ACCEPT_TRIAGE = /* GraphQL */ `
  mutation Accept($prUrl: String!) {
    acceptTriage(prUrl: $prUrl) {
      kanbanIssueId
    }
  }
`;

const RECONSIDER_TRIAGE = /* GraphQL */ `
  mutation Reconsider($prUrl: String!) {
    reconsiderTriage(prUrl: $prUrl) {
      ok
    }
  }
`;

const triageVkStub = {
  probe: jest.fn().mockResolvedValue(undefined),
  listOrganizations: jest.fn().mockResolvedValue([]),
  listProjects: jest.fn().mockResolvedValue([]),
  listRepos: jest.fn().mockResolvedValue([]),
  listIssues: jest.fn().mockResolvedValue([]),
  countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
  getIssue: jest.fn().mockResolvedValue(null),
  createIssue: jest.fn().mockResolvedValue('triage-issue-id'),
  updateIssue: jest.fn().mockResolvedValue(undefined),
  startWorkspace: jest.fn().mockResolvedValue('ws-triage'),
};

async function createApp(): Promise<NestExpressApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [testingAppModule()],
  })
    .overrideProvider(GhCliService)
    .useValue({
      checkAuth: () => ({ state: 'ok' as const }),
    })
    .overrideProvider(GithubPrScoutService)
    .useValue({
      listReviewRequestedForMe: () => [
        {
          number: 10,
          title: 'Triage PR',
          url: 'https://github.com/acme/demo/pull/10',
          githubRepo: 'acme/demo',
          createdAt: '2026-01-01T00:00:00Z',
          headRefName: 'feature/triage',
          authorLogin: 'dev',
        },
        {
          number: 11,
          title: 'Decline PR',
          url: 'https://github.com/acme/demo/pull/11',
          githubRepo: 'acme/demo',
          createdAt: '2026-01-02T00:00:00Z',
          headRefName: 'feature/decline',
          authorLogin: 'dev2',
        },
      ],
    })
    .overrideProvider(VibeKanbanBoardService)
    .useValue(triageVkStub)
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureExpressApp(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
  await app.init();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

describe('GraphQL operator triage mutations (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.pollRun.deleteMany();
    await prisma.syncedPullRequest.deleteMany();
    await prisma.declinedPullRequest.deleteMany();
    await prisma.repoProjectMapping.deleteMany();
    await prisma.setting.deleteMany();

    await prisma.repoProjectMapping.create({
      data: {
        githubRepo: 'acme/demo',
        vibeKanbanRepoId: 'vk-repo-uuid-1',
      },
    });
    await prisma.setting.createMany({
      data: [
        { key: 'default_organization_id', value: 'org-default-1' },
        { key: 'default_project_id', value: 'project-uuid-1' },
        { key: 'auto_create_issues', value: 'false' },
        { key: 'run_now_cooldown_seconds', value: '0' },
        { key: 'scheduled_sync_enabled', value: 'false' },
      ],
    });
    await app.get(SettingsService).refreshCache();
    triageVkStub.createIssue.mockClear();
  });

  it('declineTriage marks a PR and next sync records skipped_declined (REST parity)', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: DECLINE_TRIAGE,
        variables: { prUrl: 'https://github.com/acme/demo/pull/11' },
      });
    expect(gqlRes.status).toBe(200);
    const declineWrap = graphBody<{ declineTriage: { ok: boolean } }>(gqlRes);
    expect(declineWrap.errors).toBeUndefined();
    expect(declineWrap.data?.declineTriage.ok).toBe(true);

    const declined = await prisma.declinedPullRequest.findUnique({
      where: { prUrl: 'https://github.com/acme/demo/pull/11' },
    });
    expect(declined).not.toBeNull();

    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    const runs = await prisma.pollRun.findMany({
      include: { items: true },
      orderBy: { startedAt: 'desc' },
      take: 1,
    });
    expect(runs[0].phase).toBe('completed');

    const declinedItems = runs[0].items.filter(
      (i) => i.decision === 'skipped_declined',
    );
    expect(declinedItems).toHaveLength(1);
    expect(declinedItems[0].prUrl).toBe('https://github.com/acme/demo/pull/11');

    const triageItems = runs[0].items.filter(
      (i) => i.decision === 'skipped_triage',
    );
    expect(triageItems).toHaveLength(1);
    expect(triageItems[0].prUrl).toBe('https://github.com/acme/demo/pull/10');
  });

  it('acceptTriage creates Kanban issue for a triaged PR (REST parity)', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: ACCEPT_TRIAGE,
        variables: { prUrl: 'https://github.com/acme/demo/pull/10' },
      });
    expect(gqlRes.status).toBe(200);
    const acceptWrap = graphBody<{ acceptTriage: { kanbanIssueId: string } }>(
      gqlRes,
    );
    expect(acceptWrap.errors).toBeUndefined();
    expect(acceptWrap.data?.acceptTriage.kanbanIssueId).toBe('triage-issue-id');

    expect(triageVkStub.createIssue).toHaveBeenCalledTimes(1);

    const synced = await prisma.syncedPullRequest.findUnique({
      where: { prUrl: 'https://github.com/acme/demo/pull/10' },
    });
    expect(synced).not.toBeNull();
    expect(synced?.kanbanIssueId).toBe('triage-issue-id');
  });

  it('reconsiderTriage removes declined status (REST parity)', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    const declineRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: DECLINE_TRIAGE,
        variables: { prUrl: 'https://github.com/acme/demo/pull/11' },
      });
    expect(graphBody(declineRes).errors).toBeUndefined();

    expect(
      await prisma.declinedPullRequest.findUnique({
        where: { prUrl: 'https://github.com/acme/demo/pull/11' },
      }),
    ).not.toBeNull();

    const reconRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: RECONSIDER_TRIAGE,
        variables: { prUrl: 'https://github.com/acme/demo/pull/11' },
      });
    expect(reconRes.status).toBe(200);
    const reconWrap = graphBody<{ reconsiderTriage: { ok: boolean } }>(
      reconRes,
    );
    expect(reconWrap.errors).toBeUndefined();
    expect(reconWrap.data?.reconsiderTriage.ok).toBe(true);

    expect(
      await prisma.declinedPullRequest.findUnique({
        where: { prUrl: 'https://github.com/acme/demo/pull/11' },
      }),
    ).toBeNull();
  });
});
