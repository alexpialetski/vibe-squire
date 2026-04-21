import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { testingAppModule } from './testing-app-module';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { GithubPrScoutService } from '../src/integrations/github/github-pr-scout.service';
import { VibeKanbanBoardService } from '../src/vibe-kanban/vibe-kanban-board.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';

describe('Sync with fakes (integration)', () => {
  let app: INestApplication<App>;
  const vkStub = {
    probe: jest.fn().mockResolvedValue(undefined),
    listOrganizations: jest.fn().mockResolvedValue([]),
    listProjects: jest.fn().mockResolvedValue([]),
    listRepos: jest.fn().mockResolvedValue([]),
    listIssues: jest.fn().mockResolvedValue([]),
    countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
    getIssue: jest
      .fn()
      .mockResolvedValue({ id: 'fake-issue-id', status: 'Open' }),
    createIssue: jest.fn().mockResolvedValue('fake-issue-id'),
    updateIssue: jest.fn().mockResolvedValue(undefined),
    startWorkspace: jest.fn().mockResolvedValue('ws-stub-id'),
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
            number: 42,
            title: 'Hello',
            url: 'https://github.com/acme/demo/pull/42',
            githubRepo: 'acme/demo',
            createdAt: '2026-01-01T00:00:00Z',
            headRefName: 'feature/foo',
            authorLogin: 'human',
          },
        ],
      })
      .overrideProvider(VibeKanbanBoardService)
      .useValue(vkStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: false, transform: true }),
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
        { key: 'auto_create_issues', value: 'true' },
      ],
    });
    await app.get(SettingsService).refreshCache();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/sync/run creates one board issue and row (idempotent on second run)', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
    expect(vkStub.startWorkspace).toHaveBeenCalledTimes(1);
    expect(vkStub.startWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 'fake-issue-id',
        repositories: [{ repoId: 'vk-repo-uuid-1', branch: 'feature/foo' }],
      }),
    );

    const prisma = app.get(PrismaService);
    expect(await prisma.syncedPullRequest.count()).toBe(1);
    const row = await prisma.syncedPullRequest.findFirst();
    expect(row?.vibeKanbanWorkspaceId).toBe('ws-stub-id');

    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
    expect(vkStub.startWorkspace).toHaveBeenCalledTimes(1);
    expect(await prisma.syncedPullRequest.count()).toBe(1);
  });
});
