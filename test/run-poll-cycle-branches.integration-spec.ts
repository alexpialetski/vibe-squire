import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { testingAppModule } from './testing-app-module';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { GithubPrScoutService } from '../src/scout/github-pr-scout.service';
import { VibeKanbanMcpService } from '../src/vibe-kanban/vibe-kanban-mcp.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';
import { RunPollCycleService } from '../src/sync/run-poll-cycle.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import {
  POLL_RUN_ITEM_DECISION,
  POLL_RUN_PHASE,
} from '../src/sync/poll-run-decisions';
import { GITHUB_PR_SCOUT_ID } from '../src/sync/sync-constants';

function vkStubBase() {
  return {
    probe: jest.fn().mockResolvedValue(undefined),
    listOrganizations: jest.fn().mockResolvedValue([]),
    listProjects: jest.fn().mockResolvedValue([]),
    listRepos: jest.fn().mockResolvedValue([]),
    listIssues: jest.fn().mockResolvedValue([]),
    countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
    getIssue: jest
      .fn()
      .mockResolvedValue({ id: 'fake-issue-id', status: 'Open' }),
    createIssue: jest.fn().mockResolvedValue('new-issue-id'),
    updateIssue: jest.fn().mockResolvedValue(undefined),
    startWorkspace: jest.fn().mockResolvedValue('ws-stub-id'),
  };
}

const humanPr = {
  number: 42,
  title: 'Human PR',
  url: 'https://github.com/acme/demo/pull/42',
  githubRepo: 'acme/demo',
  createdAt: '2026-01-01T00:00:00Z',
  headRefName: 'feature/foo',
  authorLogin: 'human',
};

async function seedCompleteRouting(
  prisma: PrismaService,
  settings: SettingsService,
): Promise<void> {
  await prisma.pollRunItem.deleteMany();
  await prisma.pollRun.deleteMany();
  await prisma.syncedPullRequest.deleteMany();
  await prisma.repoProjectMapping.deleteMany();
  await prisma.setting.deleteMany({
    where: {
      key: {
        in: [
          'default_organization_id',
          'default_project_id',
          'scheduled_sync_enabled',
          'max_board_pr_count',
        ],
      },
    },
  });
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
      { key: 'scheduled_sync_enabled', value: 'false' },
    ],
  });
  await settings.refreshCache();
}

/**
 * Phase 1 (REFACTORING-PLAN): lock RunPollCycleService branches before pipeline extraction.
 * HTTP guards skip some paths — those are exercised via execute() directly.
 */
describe('RunPollCycleService branches (integration)', () => {
  describe('with gh OK and VK stub', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let settings: SettingsService;
    let runPoll: RunPollCycleService;
    const vkStub = vkStubBase();
    const listReviewRequestedForMe = jest.fn().mockReturnValue([humanPr]);

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
          listReviewRequestedForMe,
        })
        .overrideProvider(VibeKanbanMcpService)
        .useValue(vkStub)
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      prisma = app.get(PrismaService);
      settings = app.get(SettingsService);
      runPoll = app.get(RunPollCycleService);

      const scheduler = app.get(PollSchedulerService);
      scheduler.onModuleDestroy();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(async () => {
      jest.clearAllMocks();
      listReviewRequestedForMe.mockReturnValue([humanPr]);
      vkStub.probe.mockResolvedValue(undefined);
      vkStub.listIssues.mockResolvedValue([]);
      vkStub.countActiveVibeSquireIssues.mockResolvedValue(0);
      vkStub.getIssue.mockResolvedValue({
        id: 'fake-issue-id',
        status: 'Open',
      });
      vkStub.createIssue.mockResolvedValue('new-issue-id');
      vkStub.startWorkspace.mockResolvedValue('ws-stub-id');
      await seedCompleteRouting(prisma, settings);
    });

    it('execute() aborts with setup_incomplete when there are no mappings (bypasses HTTP guard)', async () => {
      await prisma.repoProjectMapping.deleteMany();
      await settings.refreshCache();

      await runPoll.execute('manual');

      const run = await prisma.pollRun.findFirst({
        orderBy: { startedAt: 'desc' },
      });
      expect(run?.phase).toBe(POLL_RUN_PHASE.aborted);
      expect(run?.abortReason).toBe('setup_incomplete');

      const scout = await prisma.scoutState.findUnique({
        where: { scoutId: GITHUB_PR_SCOUT_ID },
      });
      expect(scout?.lastError).toContain('skipped: setup_incomplete');
    });

    it('POST /api/sync/run records skipped_bot for ignored author (default ignore list)', async () => {
      listReviewRequestedForMe.mockReturnValue([
        {
          ...humanPr,
          number: 99,
          url: 'https://github.com/acme/demo/pull/99',
          authorLogin: 'dependabot[bot]',
        },
      ]);

      await request(app.getHttpServer()).post('/api/sync/run').expect(201);

      expect(vkStub.createIssue).not.toHaveBeenCalled();

      const run = await prisma.pollRun.findFirst({
        orderBy: { startedAt: 'desc' },
        include: { items: true },
      });
      expect(run?.phase).toBe(POLL_RUN_PHASE.completed);
      expect(run?.skippedBot).toBe(1);
      expect(run?.items).toHaveLength(1);
      expect(run?.items[0]?.decision).toBe(POLL_RUN_ITEM_DECISION.skippedBot);
    });

    it('POST /api/sync/run records skipped_board_limit when create quota is zero', async () => {
      await prisma.setting.create({
        data: { key: 'max_board_pr_count', value: '3' },
      });
      await settings.refreshCache();
      vkStub.countActiveVibeSquireIssues.mockResolvedValue(3);

      await request(app.getHttpServer()).post('/api/sync/run').expect(201);

      expect(vkStub.createIssue).not.toHaveBeenCalled();

      const run = await prisma.pollRun.findFirst({
        orderBy: { startedAt: 'desc' },
        include: { items: true },
      });
      expect(run?.phase).toBe(POLL_RUN_PHASE.completed);
      expect(run?.skippedBoardLimit).toBe(1);
      expect(run?.items[0]?.decision).toBe(
        POLL_RUN_ITEM_DECISION.skippedBoardLimit,
      );
    });

    it('execute() fails run when MCP probe throws', async () => {
      vkStub.probe.mockRejectedValue(new Error('probe failed'));

      await runPoll.execute('manual');

      const run = await prisma.pollRun.findFirst({
        orderBy: { startedAt: 'desc' },
      });
      expect(run?.phase).toBe(POLL_RUN_PHASE.failed);
      expect(run?.errorMessage).toContain('mcp_probe: probe failed');
    });
  });

  describe('with GitHub CLI reporting not authenticated', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let settings: SettingsService;
    let runPoll: RunPollCycleService;
    const vkStub = vkStubBase();

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [testingAppModule()],
      })
        .overrideProvider(GhCliService)
        .useValue({
          checkAuth: () => ({
            state: 'not_authenticated' as const,
            message: 'no token',
          }),
        })
        .overrideProvider(GithubPrScoutService)
        .useValue({
          listReviewRequestedForMe: () => [humanPr],
        })
        .overrideProvider(VibeKanbanMcpService)
        .useValue(vkStub)
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      prisma = app.get(PrismaService);
      settings = app.get(SettingsService);
      runPoll = app.get(RunPollCycleService);

      const scheduler = app.get(PollSchedulerService);
      scheduler.onModuleDestroy();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(async () => {
      await seedCompleteRouting(prisma, settings);
    });

    it('execute() aborts with source_gh_not_authenticated (manual HTTP would be blocked by SyncDependenciesGuard)', async () => {
      await runPoll.execute('manual');

      const run = await prisma.pollRun.findFirst({
        orderBy: { startedAt: 'desc' },
      });
      expect(run?.phase).toBe(POLL_RUN_PHASE.aborted);
      expect(run?.abortReason).toBe('source_gh_not_authenticated');

      const scout = await prisma.scoutState.findUnique({
        where: { scoutId: GITHUB_PR_SCOUT_ID },
      });
      expect(scout?.lastError).toContain(
        'skipped: source_gh_not_authenticated',
      );
    });
  });
});
