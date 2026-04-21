import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import request from 'supertest';
import { configureExpressApp } from '../src/configure-express-app';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { validateStatusSnapshot } from '../src/status/status-snapshot.contract';
import { VibeKanbanBoardService } from '../src/vibe-kanban/vibe-kanban-board.service';
import { testingAppModule } from './testing-app-module';

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
    .overrideProvider(VibeKanbanBoardService)
    .useValue(vkStub)
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureExpressApp(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
  await app.init();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

/**
 * SPA static wiring, status/reinit/sync contracts — real Prisma + migrations, stubbed gh / VK board.
 */
describe('App HTTP smoke (integration)', () => {
  describe('default operator env (no VIBE_SQUIRE_SOURCE_TYPE)', () => {
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

    it('GET / serves SPA shell', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);
      expect(res.text).toContain('<div id="root">');
      expect(res.text).toContain('vibe-squire');
    });

    it('GET /dashboard serves SPA shell', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard')
        .expect(200);
      expect(res.text).toContain('<div id="root">');
    });

    it('GET /api/ui/nav returns entries array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/ui/nav')
        .expect(200);
      const body = res.body as { entries: unknown[] };
      expect(Array.isArray(body.entries)).toBe(true);
    });

    it('GET /api/ui/setup returns evaluation + checklist', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/ui/setup')
        .expect(200);
      const body = res.body as {
        evaluation: { complete: boolean };
        checklist: unknown[];
        reasonMessages: Record<string, string>;
      };
      expect(typeof body.evaluation.complete).toBe('boolean');
      expect(Array.isArray(body.checklist)).toBe(true);
      expect(typeof body.reasonMessages).toBe('object');
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
          vibe_kanban_board_active: boolean;
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
      expect(typeof body.configuration.vibe_kanban_board_active).toBe(
        'boolean',
      );
      expect(Array.isArray(body.destinations)).toBe(true);
      expect(body.destinations.length).toBeGreaterThanOrEqual(1);
      expect(typeof body.destinations[0].state).toBe('string');
      expect(Array.isArray(body.scouts)).toBe(true);
      expect(body.scouts.length).toBe(1);
      expect(typeof body.scouts[0].state).toBe('string');
      expect(typeof body.manual_sync.canRun).toBe('boolean');
      if (!body.setup.complete) {
        expect(body.manual_sync.canRun).toBe(false);
      }
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
