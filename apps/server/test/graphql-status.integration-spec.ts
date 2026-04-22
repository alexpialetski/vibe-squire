import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import request from 'supertest';
import { configureFastifyApp } from '../src/configure-fastify-app';
import { StatusEventsService } from '../src/events/status-events.service';
import { SettingsService } from '../src/settings/settings.service';
import { statusSnapshotSchema } from '../src/status/status-snapshot.contract';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { testingAppModule } from './testing-app-module';

const STATUS_QUERY = /* GraphQL */ `
  query StatusFull {
    status {
      timestamp
      pending_triage_count
      gh {
        state
        message
      }
      database {
        state
        message
      }
      setup {
        complete
        mappingCount
        reason
      }
      configuration {
        source_type
        destination_type
        vibe_kanban_board_active
      }
      destinations {
        id
        state
        lastOkAt
        message
      }
      scouts {
        id
        state
        lastPollAt
        nextPollAt
        lastError
        skipReason
        last_poll {
          candidates_count
          skipped_unmapped
          issues_created
        }
      }
      manual_sync {
        canRun
        reason
        cooldownUntil
      }
      scheduled_sync {
        enabled
      }
    }
  }
`;

const SUBSCRIPTION = /* GraphQL */ `
  subscription StatusUpdated {
    statusUpdated {
      timestamp
      gh {
        state
      }
    }
  }
`;

async function createGraphqlTestApp(): Promise<NestFastifyApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [testingAppModule()],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await configureFastifyApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

function listenPort(
  server: ReturnType<NestFastifyApplication['getHttpServer']>,
): number {
  const addr = server.address();
  if (typeof addr === 'object' && addr !== null && 'port' in addr) {
    return addr.port;
  }
  throw new Error('expected listening HTTP server with a port');
}

async function waitFor(
  predicate: () => boolean,
  options: { timeoutMs: number; intervalMs?: number },
): Promise<void> {
  const start = Date.now();
  const interval = options.intervalMs ?? 20;
  while (!predicate()) {
    if (Date.now() - start > options.timeoutMs) {
      throw new Error(`waitFor: timeout after ${options.timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

describe('GraphQL status (integration)', () => {
  jest.setTimeout(25_000);

  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createGraphqlTestApp();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  function wsUrl(): string {
    const port = listenPort(app.getHttpServer());
    return `ws://127.0.0.1:${port}/graphql`;
  }

  function graphqlWsClient() {
    return createClient({
      url: wsUrl(),
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      shouldRetry: () => false,
    });
  }

  it('POST /graphql returns status that validates with statusSnapshotSchema', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: STATUS_QUERY })
      .expect(200);

    const body = res.body as {
      data?: { status?: unknown };
      errors?: unknown[];
    };
    expect(body.errors).toBeUndefined();
    const snap = body.data?.status;
    expect(snap).toBeDefined();
    expect(() => statusSnapshotSchema.parse(snap)).not.toThrow();
  });

  it('subscription: receives statusUpdated after StatusEventsService.emitChanged()', async () => {
    const client = graphqlWsClient();

    let received = 0;
    const unsubscribe = client.subscribe(
      { query: SUBSCRIPTION },
      {
        next: (msg) => {
          if (msg.errors?.length) {
            throw new Error(
              `GraphQL subscription errors: ${JSON.stringify(msg.errors)}`,
            );
          }
          const data = msg.data as
            | { statusUpdated?: unknown }
            | null
            | undefined;
          const snap = data?.statusUpdated as
            | Record<string, unknown>
            | undefined;
          if (snap && typeof snap.timestamp === 'string' && snap.gh) {
            const gh = snap.gh as Record<string, unknown>;
            expect(typeof gh.state).toBe('string');
            expect(['ok', 'error', 'unknown']).toContain(gh.state);
            received += 1;
          }
        },
        error: (err) => {
          throw err;
        },
        complete: () => {},
      },
    );

    await new Promise((r) => setTimeout(r, 250));
    app.get(StatusEventsService).emitChanged();
    await waitFor(() => received > 0, { timeoutMs: 15_000 });
    unsubscribe();
    await client.dispose();
  });

  it('subscription: receives statusUpdated after SettingsService.applyGroupPatch (core)', async () => {
    const client = graphqlWsClient();

    const settings = app.get(SettingsService);
    const before = settings.getEffective('scheduled_sync_enabled');

    let received = 0;
    const unsubscribe = client.subscribe(
      { query: SUBSCRIPTION },
      {
        next: (msg) => {
          if (msg.errors?.length) {
            throw new Error(
              `GraphQL subscription errors: ${JSON.stringify(msg.errors)}`,
            );
          }
          const data = msg.data as
            | { statusUpdated?: unknown }
            | null
            | undefined;
          if (data?.statusUpdated) {
            received += 1;
          }
        },
        error: (err) => {
          throw err;
        },
        complete: () => {},
      },
    );

    await new Promise((r) => setTimeout(r, 250));
    const flip = before === 'true' ? 'false' : 'true';
    await settings.applyGroupPatch('core', {
      scheduled_sync_enabled: flip,
    });
    await waitFor(() => received > 0, { timeoutMs: 15_000 });

    await settings.applyGroupPatch('core', { scheduled_sync_enabled: before });
    unsubscribe();
    await client.dispose();
  });

  it('subscription: teardown disposes graphql-ws client cleanly', async () => {
    const client = graphqlWsClient();

    const unsubscribe = client.subscribe(
      { query: SUBSCRIPTION },
      {
        next: () => {},
        error: () => {},
        complete: () => {},
      },
    );
    await new Promise((r) => setTimeout(r, 100));
    unsubscribe();
    await client.dispose();
  });
});
