import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { testingAppModule } from './testing-app-module';
import { configureExpressApp } from '../src/configure-express-app';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { VibeKanbanMcpService } from '../src/vibe-kanban/vibe-kanban-mcp.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { validateStatusSnapshot } from '../src/status/status-snapshot.contract';

const HTTP_SMOKE_ENV_KEYS = ['VIBE_SQUIRE_SOURCE_TYPE'] as const;

function snapshotHttpSmokeEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of HTTP_SMOKE_ENV_KEYS) {
    out[k] = process.env[k];
  }
  return out;
}

function restoreHttpSmokeEnv(snap: Record<string, string | undefined>): void {
  for (const k of HTTP_SMOKE_ENV_KEYS) {
    const v = snap[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

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

async function createSmokeApp(): Promise<NestExpressApplication> {
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

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureExpressApp(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

/**
 * HBS + Express wiring, status/reinit/sync contracts — real Prisma + migrations, stubbed gh / MCP.
 */
describe('App HTTP smoke (integration)', () => {
  describe('default operator env (no VIBE_SQUIRE_SOURCE_TYPE / VK MCP env)', () => {
    let app: NestExpressApplication;
    let prevEnv: Record<string, string | undefined>;

    beforeAll(async () => {
      prevEnv = snapshotHttpSmokeEnv();
      delete process.env.VIBE_SQUIRE_SOURCE_TYPE;
      app = await createSmokeApp();
    });

    afterAll(async () => {
      await app.close();
      restoreHttpSmokeEnv(prevEnv);
    });

    it('GET / redirects to operator UI', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(302)
        .expect('Location', '/ui/dashboard');
    });

    it('GET /ui/dashboard renders dashboard HTML', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/dashboard')
        .expect(200);
      expect(res.text).toContain('Dashboard');
      expect(res.text).toContain('Technical details (raw JSON)');
      expect(res.text).toContain('operator-ui-shared.js');
      expect(res.text).toContain('operator-shell.js');
      expect(res.text).toContain('favicon.svg');
    });

    it('GET /ui/settings renders general settings HTML', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/settings')
        .expect(200);
      expect(res.text).toContain('General');
      expect(res.text).toContain('Sync adapters');
      expect(res.text).toContain('Resolved for this process');
      expect(res.text).toContain('Kanban issue creation');
      expect(res.text).toContain('name="auto_create_issues"');
    });

    it('GET /ui/activity renders activity HTML', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/activity')
        .expect(200);
      expect(res.text).toContain('Activity');
      expect(res.text).toContain('Per-sync');
      expect(res.text).toContain('operator-ui-shared.js');
      expect(res.text).toContain('operator-shell.js');
      expect(res.text).toContain('operator-activity.js');
    });

    it('GET /api/activity/runs returns runs array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/activity/runs')
        .expect(200);
      const body = res.body as { runs: unknown[] };
      expect(Array.isArray(body.runs)).toBe(true);
    });

    it('GET /api/status returns a valid snapshot', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/status')
        .expect(200);
      const body = res.body as {
        timestamp: string;
        gh: { state: string };
        database: { state: string };
        setup: { complete: boolean; reason?: string };
        configuration: {
          source_type: string;
          destination_type: string;
          vk_mcp_configured: boolean;
        };
        destinations: Array<{ id: string; state: string }>;
        scouts: Array<{ id: string; state: string }>;
        manual_sync: { canRun: boolean };
        scheduled_sync: { enabled: boolean };
      };
      expect(typeof body.timestamp).toBe('string');
      expect(typeof body.gh.state).toBe('string');
      expect(typeof body.database.state).toBe('string');
      expect(typeof body.setup.complete).toBe('boolean');
      expect(typeof body.configuration.source_type).toBe('string');
      expect(typeof body.configuration.destination_type).toBe('string');
      expect(typeof body.configuration.vk_mcp_configured).toBe('boolean');
      expect(Array.isArray(body.destinations)).toBe(true);
      expect(body.destinations.length).toBeGreaterThanOrEqual(1);
      expect(typeof body.destinations[0].state).toBe('string');
      expect(Array.isArray(body.scouts)).toBe(true);
      expect(body.scouts.length).toBe(1);
      expect(typeof body.scouts[0].state).toBe('string');
      expect(typeof body.manual_sync.canRun).toBe('boolean');
      expect(typeof body.scheduled_sync.enabled).toBe('boolean');

      expect(validateStatusSnapshot(body)).toBeNull();
    });

    it('POST /api/reinit returns subsystem states', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reinit')
        .expect(201);
      const body = res.body as {
        ok: boolean;
        database: { state: string };
        source: { state: string };
        destination: { state: string };
      };
      expect(body.ok).toBe(true);
      expect(body.database.state).toBe('ok');
      expect(typeof body.source.state).toBe('string');
      expect(typeof body.destination.state).toBe('string');
    });

    it('POST /api/sync/run returns 409 when setup incomplete', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/run')
        .expect(409);
      const body = res.body as { error: string; reason: string };
      expect(body.error).toBe('setup_incomplete');
      expect(typeof body.reason).toBe('string');
    });
  });
});
