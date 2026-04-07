import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { testingAppModule } from './testing-app-module';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { GithubPrScoutService } from '../src/integrations/github/github-pr-scout.service';
import { VibeKanbanMcpService } from '../src/vibe-kanban/vibe-kanban-mcp.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';

/**
 * Board cap is enforced from live VK list_issues count of [vibe-squire] issues,
 * not SQLite queue cardinality. Only createIssue consumes per-poll quota.
 */
describe('Sync VK-first board cap (integration)', () => {
  let app: INestApplication<App>;
  let createSeq = 0;
  const vkStub = {
    probe: jest.fn().mockResolvedValue(undefined),
    listOrganizations: jest.fn().mockResolvedValue([]),
    listProjects: jest.fn().mockResolvedValue([]),
    listRepos: jest.fn().mockResolvedValue([]),
    listIssues: jest.fn().mockResolvedValue([]),
    countActiveVibeSquireIssues: jest.fn().mockResolvedValue(4),
    getIssue: jest.fn().mockResolvedValue(null),
    createIssue: jest.fn().mockImplementation(() => {
      createSeq += 1;
      return Promise.resolve(`new-issue-${createSeq}`);
    }),
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
            number: 1,
            title: 'One',
            url: 'https://github.com/acme/demo/pull/1',
            githubRepo: 'acme/demo',
            createdAt: '2026-01-01T00:00:00Z',
            headRefName: 'a',
            authorLogin: 'human',
          },
          {
            number: 2,
            title: 'Two',
            url: 'https://github.com/acme/demo/pull/2',
            githubRepo: 'acme/demo',
            createdAt: '2026-01-02T00:00:00Z',
            headRefName: 'b',
            authorLogin: 'human',
          },
          {
            number: 3,
            title: 'Three',
            url: 'https://github.com/acme/demo/pull/3',
            githubRepo: 'acme/demo',
            createdAt: '2026-01-03T00:00:00Z',
            headRefName: 'c',
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
        { key: 'max_board_pr_count', value: '5' },
        { key: 'auto_create_issues', value: 'true' },
      ],
    });
    await app.get(SettingsService).refreshCache();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows at most (max_board_pr_count − active VK marker issues) creates in one poll', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
    const prisma = app.get(PrismaService);
    expect(await prisma.syncedPullRequest.count()).toBe(1);
  });
});
