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
import { DEFAULT_KANBAN_DONE_STATUS } from '../src/sync/sync-constants';

/**
 * §16.5 — PR disappears from scout → reconcile calls update_issue to terminal status and drops sync row.
 */
describe('Sync reconciliation (integration)', () => {
  let app: INestApplication<App>;
  let scoutCalls = 0;
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
    scoutCalls = 0;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testingAppModule()],
    })
      .overrideProvider(GhCliService)
      .useValue({
        checkAuth: () => ({ state: 'ok' as const }),
      })
      .overrideProvider(GithubPrScoutService)
      .useValue({
        listReviewRequestedForMe: () => {
          const i = scoutCalls++;
          if (i === 0) {
            return [
              {
                number: 1,
                title: 'Reconcile me',
                url: 'https://github.com/acme/demo/pull/1',
                githubRepo: 'acme/demo',
                createdAt: '2026-01-01T00:00:00Z',
                headRefName: 'main',
                authorLogin: 'human',
              },
            ];
          }
          return [];
        },
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

  it('second sync with empty PR list updates issue to terminal and removes sync row', async () => {
    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
    const prisma = app.get(PrismaService);
    expect(await prisma.syncedPullRequest.count()).toBe(1);

    await request(app.getHttpServer()).post('/api/sync/run').expect(201);
    expect(vkStub.getIssue).toHaveBeenCalledWith('fake-issue-id');
    expect(vkStub.updateIssue).toHaveBeenCalledTimes(1);
    expect(vkStub.updateIssue).toHaveBeenCalledWith('fake-issue-id', {
      status: DEFAULT_KANBAN_DONE_STATUS,
    });
    expect(await prisma.syncedPullRequest.count()).toBe(0);
    expect(vkStub.createIssue).toHaveBeenCalledTimes(1);
  });
});
