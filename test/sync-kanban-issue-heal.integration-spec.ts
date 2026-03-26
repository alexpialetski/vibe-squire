import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { testingAppModule } from './testing-app-module';
import { GhCliService } from '../src/gh/gh-cli.service';
import { GithubPrScoutService } from '../src/scout/github-pr-scout.service';
import { VibeKanbanMcpService } from '../src/vibe-kanban/vibe-kanban-mcp.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';

/**
 * When the Kanban issue is deleted in Vibe Kanban but the PR stays on the review queue,
 * the next sync drops the stale SyncedPullRequest row. A new issue is created only when
 * the poll's create quota allows (live VK [vibe-squire] count vs max_board_pr_count).
 */
describe('Sync heal deleted Kanban issue (integration)', () => {
  let app: INestApplication<App>;
  let kanbanIssueGone = false;

  const vkStub = {
    probe: jest.fn().mockResolvedValue(undefined),
    listOrganizations: jest.fn().mockResolvedValue([]),
    listProjects: jest.fn().mockResolvedValue([]),
    listRepos: jest.fn().mockResolvedValue([]),
    listIssues: jest.fn().mockResolvedValue([]),
    countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
    getIssue: jest.fn().mockImplementation(async (issueId: string) => {
      if (kanbanIssueGone) {
        return null;
      }
      return { id: issueId, status: 'Open' as const };
    }),
    createIssue: jest.fn().mockResolvedValue('fake-issue-id-2'),
    updateIssue: jest.fn().mockResolvedValue(undefined),
    startWorkspace: jest.fn().mockResolvedValue('ws-stub-id'),
  };

  beforeAll(async () => {
    kanbanIssueGone = false;
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
            number: 7,
            title: 'Heal me',
            url: 'https://github.com/acme/demo/pull/7',
            githubRepo: 'acme/demo',
            createdAt: '2026-01-01T00:00:00Z',
            headRefName: 'main',
            authorLogin: 'human',
          },
        ],
      })
      .overrideProvider(VibeKanbanMcpService)
      .useValue(vkStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.pollRun.deleteMany();
    await prisma.syncedPullRequest.deleteMany();
    await prisma.repoProjectMapping.deleteMany();
    await prisma.setting.deleteMany({
      where: {
        key: { in: ['default_organization_id', 'default_project_id'] },
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
      ],
    });
    await app.get(SettingsService).refreshCache();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    kanbanIssueGone = false;
    const prisma = app.get(PrismaService);
    await prisma.pollRun.deleteMany();
    await prisma.syncedPullRequest.deleteMany();
    vkStub.createIssue.mockReset();
    vkStub.createIssue.mockResolvedValue('fake-issue-id-2');
    vkStub.countActiveVibeSquireIssues.mockReset();
    vkStub.countActiveVibeSquireIssues.mockResolvedValue(0);
    vkStub.getIssue.mockReset();
    vkStub.getIssue.mockImplementation(async (issueId: string) => {
      if (kanbanIssueGone) {
        return null;
      }
      return { id: issueId, status: 'Open' as const };
    });
  });

  it('recreates board issue after get_issue returns null for stored id', async () => {
    vkStub.createIssue
      .mockResolvedValueOnce('fake-issue-id')
      .mockResolvedValue('fake-issue-id-2');

    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
    const prisma = app.get(PrismaService);
    expect(await prisma.syncedPullRequest.count()).toBe(1);
    const row1 = await prisma.syncedPullRequest.findFirst();
    expect(row1?.kanbanIssueId).toBe('fake-issue-id');

    kanbanIssueGone = true;

    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.getIssue).toHaveBeenCalledWith('fake-issue-id');
    expect(vkStub.createIssue).toHaveBeenCalledTimes(2);
    expect(await prisma.syncedPullRequest.count()).toBe(1);
    const row2 = await prisma.syncedPullRequest.findFirst();
    expect(row2?.id).not.toBe(row1?.id);
    expect(row2?.kanbanIssueId).toBe('fake-issue-id-2');
  });

  it('does not recreate Kanban row when live VK count is already at board limit', async () => {
    vkStub.countActiveVibeSquireIssues
      .mockResolvedValueOnce(0)
      .mockResolvedValue(5);
    vkStub.createIssue
      .mockResolvedValueOnce('issue-first')
      .mockResolvedValue('issue-should-not-run');

    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);

    kanbanIssueGone = true;
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
    const prisma = app.get(PrismaService);
    expect(await prisma.syncedPullRequest.count()).toBe(0);
  });
});
