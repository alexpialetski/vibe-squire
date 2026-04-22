import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { testingAppModule } from './testing-app-module';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { GithubPrScoutService } from '../src/integrations/github/github-pr-scout.service';
import { VibeKanbanBoardService } from '../src/vibe-kanban/vibe-kanban-board.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';

describe('Triage mode (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const vkStub = {
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

  beforeAll(async () => {
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
      .useValue(vkStub)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
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
    vkStub.createIssue.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sync with auto_create_issues=false produces skipped_triage items', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    expect(vkStub.createIssue).not.toHaveBeenCalled();
    expect(await prisma.syncedPullRequest.count()).toBe(0);

    const runs = await prisma.pollRun.findMany({
      include: { items: true },
      orderBy: { startedAt: 'desc' },
      take: 1,
    });
    expect(runs[0].phase).toBe('completed');
    expect(runs[0].skippedTriage).toBe(2);
    const triageItems = runs[0].items.filter(
      (i) => i.decision === 'skipped_triage',
    );
    expect(triageItems).toHaveLength(2);
  });

  it('decline marks a PR and next sync records skipped_declined', async () => {
    // First sync to generate poll run items
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    // Decline PR #11
    const declineRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Decline($prUrl: String!) {
            declineTriage(prUrl: $prUrl) {
              id
            }
          }
        `,
        variables: { prUrl: 'https://github.com/acme/demo/pull/11' },
      })
      .expect(200);
    expect((declineRes.body as { errors?: unknown[] }).errors).toBeUndefined();

    const declined = await prisma.declinedPullRequest.findUnique({
      where: { prUrl: 'https://github.com/acme/demo/pull/11' },
    });
    expect(declined).not.toBeNull();

    // Second sync should see PR #11 as declined
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

  it('accept creates Kanban issue for a triaged PR', async () => {
    // First sync to generate poll run items
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);

    // Accept PR #10
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Accept($prUrl: String!) {
            acceptTriage(prUrl: $prUrl) {
              id
              kanbanIssueId
              effectiveDecision
            }
          }
        `,
        variables: { prUrl: 'https://github.com/acme/demo/pull/10' },
      })
      .expect(200);
    const body = res.body as {
      data?: {
        acceptTriage?: {
          id: string;
          kanbanIssueId: string;
          effectiveDecision: string;
        };
      };
      errors?: unknown[];
    };
    expect(body.errors).toBeUndefined();
    expect(body.data?.acceptTriage?.id).toBe(
      'https://github.com/acme/demo/pull/10',
    );
    expect(body.data?.acceptTriage?.kanbanIssueId).toBe('triage-issue-id');
    expect(body.data?.acceptTriage?.effectiveDecision).toBe('linked_existing');
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);

    const synced = await prisma.syncedPullRequest.findUnique({
      where: { prUrl: 'https://github.com/acme/demo/pull/10' },
    });
    expect(synced).not.toBeNull();
    expect(synced?.kanbanIssueId).toBe('triage-issue-id');
  });

  it('reconsider removes declined status', async () => {
    // First sync + decline
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    const declineRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Decline($prUrl: String!) {
            declineTriage(prUrl: $prUrl) {
              id
            }
          }
        `,
        variables: { prUrl: 'https://github.com/acme/demo/pull/11' },
      })
      .expect(200);
    expect((declineRes.body as { errors?: unknown[] }).errors).toBeUndefined();

    expect(
      await prisma.declinedPullRequest.findUnique({
        where: { prUrl: 'https://github.com/acme/demo/pull/11' },
      }),
    ).not.toBeNull();

    // Reconsider
    const reconsiderRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Reconsider($prUrl: String!) {
            reconsiderTriage(prUrl: $prUrl) {
              id
            }
          }
        `,
        variables: { prUrl: 'https://github.com/acme/demo/pull/11' },
      })
      .expect(200);
    expect(
      (reconsiderRes.body as { errors?: unknown[] }).errors,
    ).toBeUndefined();

    expect(
      await prisma.declinedPullRequest.findUnique({
        where: { prUrl: 'https://github.com/acme/demo/pull/11' },
      }),
    ).toBeNull();
  });
});
