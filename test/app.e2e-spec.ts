import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { testingAppModule } from './testing-app-module';
import { validateStatusSnapshot } from './../src/status/status-snapshot.contract';
import { configureExpressApp } from './../src/configure-express-app';

const E2E_ENV_KEYS = ['SOURCE_TYPE', 'VK_MCP_STDIO_JSON'] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of E2E_ENV_KEYS) {
    out[k] = process.env[k];
  }
  return out;
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  for (const k of E2E_ENV_KEYS) {
    const v = snap[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testingAppModule()],
    }).compile();

    const nestApp =
      moduleFixture.createNestApplication<NestExpressApplication>();
    configureExpressApp(nestApp);
    app = nestApp;
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('with complete setup env', () => {
    let prev: Record<string, string | undefined>;

    beforeAll(() => {
      prev = snapshotEnv();
      delete process.env.SOURCE_TYPE;
      delete process.env.VK_MCP_STDIO_JSON;
    });

    afterAll(() => {
      restoreEnv(prev);
    });

    it('/ (GET) redirects to operator UI', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(302)
        .expect('Location', '/ui/dashboard');
    });

    it('/ui/dashboard (GET) renders operator UI', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/dashboard')
        .expect(200);
      expect(res.text).toContain('Dashboard');
      expect(res.text).toContain('Technical details (raw JSON)');
    });

    it('GET /ui/activity renders sync activity page', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/activity')
        .expect(200);
      expect(res.text).toContain('Activity');
      expect(res.text).toContain('Per-sync');
    });

    it('GET /ui/kanban redirects to /ui/vibe-kanban', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/kanban')
        .expect(302);
      expect(res.headers.location).toBe('/ui/vibe-kanban');
    });

    it('/api/status (GET)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/status')
        .expect(200);
      const body = res.body as {
        timestamp: string;
        gh: { state: string };
        database: { state: string };
        setup: {
          complete: boolean;
          reason?: string;
        };
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

      const contractErr = validateStatusSnapshot(body);
      expect(contractErr).toBeNull();
    });

    it('POST /api/reinit', async () => {
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
  });

  describe('incomplete setup without integration UI gate (invalid MCP config)', () => {
    let prev: Record<string, string | undefined>;

    beforeAll(() => {
      prev = snapshotEnv();
      delete process.env.SOURCE_TYPE;
      process.env.VK_MCP_STDIO_JSON = '[]';
    });

    afterAll(() => {
      restoreEnv(prev);
    });

    it('GET /ui/dashboard still renders (no integration gate redirect)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/dashboard')
        .expect(200);
      expect(res.text).toContain('Dashboard');
    });

    it('GET /ui/activity still renders', async () => {
      const res = await request(app.getHttpServer())
        .get('/ui/activity')
        .expect(200);
      expect(res.text).toContain('Activity');
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
