import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import request from 'supertest';
import { configureExpressApp } from '../src/configure-express-app';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { StatusEventsService } from '../src/events/status-events.service';
import { SettingsService } from '../src/settings/settings.service';
import { testingAppModule } from './testing-app-module';

type GraphqlEnvelope<T> = { data?: T; errors?: unknown[] };

function graphBody<T>(res: { body: unknown }): GraphqlEnvelope<T> {
  return res.body as GraphqlEnvelope<T>;
}

const EFFECTIVE_SETTINGS = /* GraphQL */ `
  query Es {
    effectiveSettings {
      coreFields {
        key
        label
        value
        envVar
      }
      resolvedSourceLabel
      resolvedDestinationLabel
      scheduledSyncEnabled
      autoCreateIssues
    }
  }
`;

const ACTIVITY_FEED = /* GraphQL */ `
  query Af($first: Int, $after: String) {
    activityFeed(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          startedAt
          itemCount
          items {
            id
            prUrl
            prNumber
            decision
            decisionLabel
            effectiveDecision
            detail
            kanbanIssueId
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const INTEGRATION_NAV = /* GraphQL */ `
  query Nav {
    integrationNav {
      entries {
        id
        label
        href
      }
    }
  }
`;

const DASHBOARD_SETUP = /* GraphQL */ `
  query Ds {
    dashboardSetup {
      evaluation {
        complete
        reason
        mappingCount
        sourceType
        destinationType
        vibeKanbanBoardActive
        hasRouting
      }
      checklist {
        text
        linkHref
        linkLabel
      }
      reasonMessages {
        code
        message
      }
    }
  }
`;

const ACTIVITY_EVENTS_SUB = /* GraphQL */ `
  subscription Sub {
    activityEvents {
      invalidate
    }
  }
`;

async function createApp(): Promise<NestExpressApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [testingAppModule()],
  }).compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureExpressApp(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
  await app.init();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

function listenPort(
  server: ReturnType<NestExpressApplication['getHttpServer']>,
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

describe('GraphQL operator BFF (integration)', () => {
  jest.setTimeout(35_000);

  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  function wsUrl(): string {
    const port = listenPort(app.getHttpServer());
    return `ws://127.0.0.1:${port}/graphql`;
  }

  it('effectiveSettings matches GET /api/ui/settings-meta (core parity)', async () => {
    const [restRes, gqlRes] = await Promise.all([
      request(app.getHttpServer()).get('/api/ui/settings-meta'),
      request(app.getHttpServer())
        .post('/graphql')
        .send({ query: EFFECTIVE_SETTINGS }),
    ]);
    expect(restRes.status).toBe(200);
    expect(gqlRes.status).toBe(200);
    const gqlBody = gqlRes.body as {
      data?: { effectiveSettings?: unknown };
      errors?: unknown[];
    };
    expect(gqlBody.errors).toBeUndefined();
    const es = gqlBody.data?.effectiveSettings as {
      coreFields: { key: string; label: string; value: string }[];
      resolvedSourceLabel: string;
      resolvedDestinationLabel: string;
      scheduledSyncEnabled: boolean;
      autoCreateIssues: boolean;
    };
    const rest = restRes.body as {
      coreFields: { key: string; label: string; value: string }[];
      resolvedSourceLabel: string;
      resolvedDestinationLabel: string;
      scheduledSyncEnabled: boolean;
      autoCreateIssues: boolean;
    };
    expect(es.resolvedSourceLabel).toBe(rest.resolvedSourceLabel);
    expect(es.resolvedDestinationLabel).toBe(rest.resolvedDestinationLabel);
    expect(es.scheduledSyncEnabled).toBe(rest.scheduledSyncEnabled);
    expect(es.autoCreateIssues).toBe(rest.autoCreateIssues);
    const gqlTextFields = es.coreFields.filter((f) =>
      [
        'poll_interval_minutes',
        'jitter_max_seconds',
        'run_now_cooldown_seconds',
        'max_board_pr_count',
      ].includes(f.key),
    );
    const restTextFields = rest.coreFields;
    expect(
      gqlTextFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
      })),
    ).toEqual(
      restTextFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
      })),
    );
  });

  it('dashboardSetup matches GET /api/ui/setup', async () => {
    const [restRes, gqlRes] = await Promise.all([
      request(app.getHttpServer()).get('/api/ui/setup'),
      request(app.getHttpServer())
        .post('/graphql')
        .send({ query: DASHBOARD_SETUP }),
    ]);
    expect(restRes.status).toBe(200);
    expect(gqlRes.status).toBe(200);
    const gqlBody = graphBody<{
      dashboardSetup: {
        evaluation: {
          complete: boolean;
          reason: string | null;
          mappingCount: number;
          sourceType: string;
          destinationType: string;
          vibeKanbanBoardActive: boolean;
          hasRouting: boolean;
        };
        checklist: Array<{
          text: string;
          linkHref: string | null;
          linkLabel: string | null;
        }>;
        reasonMessages: Array<{ code: string; message: string }>;
      };
    }>(gqlRes);
    expect(gqlBody.errors).toBeUndefined();
    const gql = gqlBody.data!.dashboardSetup;
    const rest = restRes.body as {
      evaluation: {
        complete: boolean;
        reason?: string;
        mappingCount: number;
        sourceType: string;
        destinationType: string;
        vibeKanbanBoardActive: boolean;
        hasRouting: boolean;
      };
      checklist: Array<{
        text: string;
        linkHref?: string;
        linkLabel?: string;
      }>;
      reasonMessages: Record<string, string>;
    };
    expect(gql.evaluation.complete).toBe(rest.evaluation.complete);
    expect(gql.evaluation.reason ?? null).toBe(rest.evaluation.reason ?? null);
    expect(gql.evaluation.mappingCount).toBe(rest.evaluation.mappingCount);
    expect(gql.evaluation.sourceType).toBe(rest.evaluation.sourceType);
    expect(gql.evaluation.destinationType).toBe(
      rest.evaluation.destinationType,
    );
    expect(gql.evaluation.vibeKanbanBoardActive).toBe(
      rest.evaluation.vibeKanbanBoardActive,
    );
    expect(gql.evaluation.hasRouting).toBe(rest.evaluation.hasRouting);
    const gqlReasonMessages = Object.fromEntries(
      gql.reasonMessages.map((r) => [r.code, r.message]),
    );
    expect(gqlReasonMessages).toEqual(rest.reasonMessages);
    expect(gql.checklist).toEqual(
      rest.checklist.map((row) => ({
        text: row.text,
        linkHref: row.linkHref ?? null,
        linkLabel: row.linkLabel ?? null,
      })),
    );
  });

  it('updateSettings applies core patch and returns ok', async () => {
    const beforeRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: EFFECTIVE_SETTINGS });
    const beforeWrap = graphBody<{
      effectiveSettings: { coreFields: { key: string; value: string }[] };
    }>(beforeRes);
    const es0 = beforeWrap.data!.effectiveSettings;
    const before =
      es0.coreFields.find((f) => f.key === 'poll_interval_minutes')?.value ??
      '5';
    const next = before === '7' ? '8' : '7';

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation M($input: UpdateSettingsInput!) {
            updateSettings(input: $input) {
              ok
            }
          }
        `,
        variables: { input: { poll_interval_minutes: next } },
      });
    expect(res.status).toBe(200);
    const body = res.body as {
      data?: { updateSettings?: { ok: boolean } };
      errors?: unknown[];
    };
    expect(body.errors).toBeUndefined();
    expect(body.data?.updateSettings?.ok).toBe(true);

    const afterRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: EFFECTIVE_SETTINGS });
    const afterWrap = graphBody<{
      effectiveSettings: { coreFields: { key: string; value: string }[] };
    }>(afterRes);
    const poll = afterWrap.data!.effectiveSettings.coreFields.find(
      (f) => f.key === 'poll_interval_minutes',
    )?.value;
    expect(poll).toBe(next);

    await app
      .get(SettingsService)
      .applyGroupPatch('core', { poll_interval_minutes: before });
  });

  it('updateSettings returns GraphQL error for invalid patch', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation M($input: UpdateSettingsInput!) {
            updateSettings(input: $input) {
              ok
            }
          }
        `,
        variables: { input: { poll_interval_minutes: 'not-a-number' } },
      });
    expect(res.status).toBe(200);
    const body = res.body as { errors?: { message: string }[] };
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(String(body.errors?.[0]?.message)).toMatch(
      /poll|interval|number|invalid/i,
    );
  });

  it('mappings CRUD via GraphQL', async () => {
    const list0 = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          {
            mappings {
              id
              githubRepo
              vibeKanbanRepoId
            }
          }
        `,
      });
    const list0Wrap = graphBody<{ mappings: { id: string }[] }>(list0);
    expect(list0Wrap.errors).toBeUndefined();
    const initialCount = list0Wrap.data!.mappings.length;

    const createRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation C($input: UpsertMappingInput!) {
            upsertMapping(input: $input) {
              id
              githubRepo
              vibeKanbanRepoId
            }
          }
        `,
        variables: {
          input: {
            githubRepo: 'acme/graphql-op-bff-test',
            vibeKanbanRepoId: 'vk-repo-test-id',
            label: 't',
          },
        },
      });
    const createWrap = graphBody<{ upsertMapping: { id: string } }>(createRes);
    expect(createWrap.errors).toBeUndefined();
    const id = createWrap.data!.upsertMapping.id;

    const upd = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation U($id: ID!, $input: UpdateMappingInput!) {
            updateMapping(id: $id, input: $input) {
              id
              label
            }
          }
        `,
        variables: { id, input: { label: 'updated' } },
      });
    const updWrap = graphBody<{ updateMapping: { label: string | null } }>(upd);
    expect(updWrap.errors).toBeUndefined();
    expect(updWrap.data!.updateMapping.label).toBe('updated');

    const del = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation D($id: ID!) {
            deleteMapping(id: $id) {
              ok
            }
          }
        `,
        variables: { id },
      });
    const delWrap = graphBody<{ deleteMapping: { ok: boolean } }>(del);
    expect(delWrap.errors).toBeUndefined();
    expect(delWrap.data!.deleteMapping.ok).toBe(true);

    const list1 = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          {
            mappings {
              id
            }
          }
        `,
      });
    const list1Wrap = graphBody<{ mappings: { id: string }[] }>(list1);
    expect(list1Wrap.data!.mappings.length).toBe(initialCount);
  });

  it('activityFeed returns connection (no duplicate ids across pages when hasNextPage)', async () => {
    const first = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: ACTIVITY_FEED, variables: { first: 5 } });
    const firstWrap = graphBody<{
      activityFeed: {
        edges: { node: { id: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(first);
    expect(firstWrap.errors).toBeUndefined();
    const conn = firstWrap.data!.activityFeed;
    const ids1 = new Set(conn.edges.map((e) => e.node.id));
    expect(ids1.size).toBe(conn.edges.length);
    if (!conn.pageInfo.hasNextPage || !conn.pageInfo.endCursor) {
      return;
    }
    const second = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: ACTIVITY_FEED,
        variables: { first: 5, after: conn.pageInfo.endCursor },
      });
    const secondWrap = graphBody<{
      activityFeed: { edges: { node: { id: string } }[] };
    }>(second);
    expect(secondWrap.errors).toBeUndefined();
    const conn2 = secondWrap.data!.activityFeed;
    for (const e of conn2.edges) {
      expect(ids1.has(e.node.id)).toBe(false);
    }
  });

  it('integrationNav matches GET /api/ui/nav', async () => {
    const [restRes, gqlRes] = await Promise.all([
      request(app.getHttpServer()).get('/api/ui/nav'),
      request(app.getHttpServer())
        .post('/graphql')
        .send({ query: INTEGRATION_NAV }),
    ]);
    expect(restRes.status).toBe(200);
    const gqlWrap = graphBody<{
      integrationNav: {
        entries: { id: string; label: string; href: string }[];
      };
    }>(gqlRes);
    expect(gqlWrap.errors).toBeUndefined();
    const entries = gqlWrap.data!.integrationNav.entries;
    const restBody = restRes.body as { entries: typeof entries };
    expect(entries).toEqual(restBody.entries);
  });

  it('reinitIntegration returns subsystem summary', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation {
            reinitIntegration {
              ok
              database {
                state
              }
              source {
                state
              }
              destination {
                state
              }
            }
          }
        `,
      });
    expect(res.status).toBe(200);
    const body = res.body as {
      data?: {
        reinitIntegration: {
          ok: boolean;
          database: { state: string };
          source: { state: string };
          destination: { state: string };
        };
      };
      errors?: unknown[];
    };
    expect(body.errors).toBeUndefined();
    expect(body.data?.reinitIntegration?.ok).toBe(true);
    expect(body.data?.reinitIntegration?.database.state).toBeDefined();
  });

  it('triggerSync returns setup_incomplete when evaluation incomplete', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation {
            triggerSync {
              ok
            }
          }
        `,
      });
    expect(res.status).toBe(200);
    const body = res.body as {
      errors?: { message: string; extensions?: { statusCode?: number } }[];
    };
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(body.errors?.[0]?.extensions?.statusCode).toBe(409);
  });

  it('subscription activityEvents receives payload after StatusEventsService.emitChanged', async () => {
    const client = createClient({
      url: wsUrl(),
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      shouldRetry: () => false,
    });

    let received = 0;
    const unsubscribe = client.subscribe(
      { query: ACTIVITY_EVENTS_SUB },
      {
        next: (msg) => {
          if (msg.errors?.length) {
            throw new Error(
              `subscription errors: ${JSON.stringify(msg.errors)}`,
            );
          }
          const inv = (
            msg.data as
              | { activityEvents?: { invalidate: boolean } }
              | null
              | undefined
          )?.activityEvents?.invalidate;
          if (inv === true) {
            received += 1;
          }
        },
        error: (e) => {
          throw e;
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
});
