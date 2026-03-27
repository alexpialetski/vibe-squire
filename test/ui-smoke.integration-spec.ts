import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { testingAppModule } from './testing-app-module';
import { configureExpressApp } from '../src/configure-express-app';
import { GhCliService } from '../src/gh/gh-cli.service';
import { VibeKanbanMcpService } from '../src/vibe-kanban/vibe-kanban-mcp.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';

const vkStub = {
  probe: jest.fn().mockResolvedValue(undefined),
  listOrganizations: jest.fn().mockResolvedValue([]),
  listProjects: jest.fn().mockResolvedValue([]),
  listRepos: jest.fn().mockResolvedValue([]),
  listIssues: jest.fn().mockResolvedValue([]),
  countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
  getIssue: jest.fn().mockResolvedValue(null),
  createIssue: jest.fn().mockResolvedValue('fake-issue-id'),
  updateIssue: jest.fn().mockResolvedValue(undefined),
  startWorkspace: jest.fn().mockResolvedValue('ws-1'),
};

/**
 * Phase 1 — UiController smoke: HBS stack + status snapshot without real gh / MCP.
 */
describe('UI smoke (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testingAppModule()],
    })
      .overrideProvider(GhCliService)
      .useValue({
        checkAuth: () => ({ state: 'ok' as const }),
      })
      .overrideProvider(VibeKanbanMcpService)
      .useValue(vkStub)
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureExpressApp(app);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const scheduler = app.get(PollSchedulerService);
    scheduler.onModuleDestroy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ui/dashboard renders dashboard HTML', async () => {
    const res = await request(app.getHttpServer())
      .get('/ui/dashboard')
      .expect(200);
    expect(res.text).toContain('Dashboard');
    expect(res.text).toContain('Technical details (raw JSON)');
  });

  it('GET /ui/settings renders general settings HTML', async () => {
    const res = await request(app.getHttpServer())
      .get('/ui/settings')
      .expect(200);
    expect(res.text).toContain('General');
    expect(res.text).toContain('Sync adapters');
    expect(res.text).toContain('Resolved for this process');
  });

  it('GET /ui/activity renders activity HTML', async () => {
    const res = await request(app.getHttpServer())
      .get('/ui/activity')
      .expect(200);
    expect(res.text).toContain('Activity');
  });
});
