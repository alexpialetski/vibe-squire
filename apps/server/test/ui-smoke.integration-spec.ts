import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { configureFastifyApp } from '../src/configure-fastify-app';
import { GhCliService } from '../src/integrations/github/gh-cli.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
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

async function createSmokeApp(): Promise<NestFastifyApplication> {
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

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await configureFastifyApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

/**
 * SPA static wiring, status/reinit/sync contracts — real Prisma + migrations, stubbed gh / VK board.
 */
describe('App HTTP smoke (integration)', () => {
  describe('default operator env (no VIBE_SQUIRE_SOURCE_TYPE)', () => {
    let app: NestFastifyApplication;
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
