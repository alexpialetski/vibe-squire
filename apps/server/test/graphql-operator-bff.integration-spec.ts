import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import request from 'supertest';
import { configureExpressApp } from '../src/configure-express-app';
import { APP_ENV } from '../src/config/app-env.token';
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

const GITHUB_FIELDS = /* GraphQL */ `
  query Ghf {
    githubFields {
      disabled
      fields {
        key
        label
        value
      }
    }
  }
`;

const VIBE_KANBAN_UI_STATE = /* GraphQL */ `
  query VkUi {
    vibeKanbanUiState {
      saved
      error
      vkBoardPicker
      boardOrg
      boardProj
      kanbanDoneStatus
      vkExecutor
      executorOptions {
        value
        label
      }
      vkLabels {
        default_organization_id
        vk_workspace_executor
        kanban_done_status
      }
      orgError
    }
  }
`;

const VIBE_KANBAN_ORGS = /* GraphQL */ `
  query VkOrgs {
    vibeKanbanOrganizations {
      id
      name
    }
  }
`;

const VIBE_KANBAN_PROJECTS = /* GraphQL */ `
  query VkProjects($organizationId: ID!) {
    vibeKanbanProjects(organizationId: $organizationId) {
      id
      name
    }
  }
`;

const VIBE_KANBAN_REPOS = /* GraphQL */ `
  query VkRepos {
    vibeKanbanRepos {
      id
      name
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
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

  it('effectiveSettings returns expected metadata fields', async () => {
    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: EFFECTIVE_SETTINGS });
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
    expect(es.coreFields.length).toBeGreaterThan(0);
    expect(typeof es.resolvedSourceLabel).toBe('string');
    expect(typeof es.resolvedDestinationLabel).toBe('string');
    expect(typeof es.scheduledSyncEnabled).toBe('boolean');
    expect(typeof es.autoCreateIssues).toBe('boolean');
  });

  it('dashboardSetup returns evaluation, checklist, and reason messages', async () => {
    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: DASHBOARD_SETUP });
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
    expect(typeof gql.evaluation.complete).toBe('boolean');
    expect(Array.isArray(gql.checklist)).toBe(true);
    expect(Array.isArray(gql.reasonMessages)).toBe(true);
  });

  it('githubFields returns disabled flag and field rows', async () => {
    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: GITHUB_FIELDS });
    expect(gqlRes.status).toBe(200);
    const gqlBody = graphBody<{
      githubFields: {
        disabled: boolean;
        fields: Array<{ key: string; label: string; value: string }>;
      };
    }>(gqlRes);
    expect(gqlBody.errors).toBeUndefined();
    expect(typeof gqlBody.data?.githubFields.disabled).toBe('boolean');
    expect(Array.isArray(gqlBody.data?.githubFields.fields)).toBe(true);
  });

  it('vibeKanbanUiState returns page bootstrap shape', async () => {
    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: VIBE_KANBAN_UI_STATE });
    const gqlBody = graphBody<{ vibeKanbanUiState: unknown }>(gqlRes);
    expect(gqlBody.errors).toBeUndefined();
    expect(gqlBody.data?.vibeKanbanUiState).toBeDefined();
  });

  it('vibeKanbanOrganizations and repos return list payloads', async () => {
    const [orgGql, repoGql] = await Promise.all([
      request(app.getHttpServer())
        .post('/graphql')
        .send({ query: VIBE_KANBAN_ORGS }),
      request(app.getHttpServer())
        .post('/graphql')
        .send({ query: VIBE_KANBAN_REPOS }),
    ]);
    const orgBody = graphBody<{
      vibeKanbanOrganizations: Array<{ id: string; name?: string | null }>;
    }>(orgGql);
    const repoBody = graphBody<{
      vibeKanbanRepos: Array<{ id: string; name?: string | null }>;
    }>(repoGql);
    expect(orgBody.errors).toBeUndefined();
    expect(repoBody.errors).toBeUndefined();
    expect(Array.isArray(orgBody.data?.vibeKanbanOrganizations)).toBe(true);
    expect(Array.isArray(repoBody.data?.vibeKanbanRepos)).toBe(true);
  });

  it('vibeKanbanProjects returns projects for selected organization', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: VIBE_KANBAN_ORGS });
    const orgBody = graphBody<{
      vibeKanbanOrganizations: Array<{ id: string }>;
    }>(orgRes);
    expect(orgBody.errors).toBeUndefined();
    const orgId = orgBody.data?.vibeKanbanOrganizations?.[0]?.id;
    expect(orgId).toBeTruthy();
    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VIBE_KANBAN_PROJECTS,
        variables: { organizationId: orgId },
      });
    const gqlBody = graphBody<{
      vibeKanbanProjects: Array<{ id: string; name?: string | null }>;
    }>(gqlRes);
    expect(gqlBody.errors).toBeUndefined();
    expect(Array.isArray(gqlBody.data?.vibeKanbanProjects)).toBe(true);
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

  it('updateSourceSettings persists source patch and returns effective settings', async () => {
    const settings = app.get(SettingsService);
    const before = settings.getEffective('pr_review_body_template');
    const next = `${before}\n\n# graphql-test`;

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Uss($input: UpdateSourceSettingsInput!) {
            updateSourceSettings(input: $input) {
              coreFields {
                key
                value
              }
            }
          }
        `,
        variables: { input: { pr_review_body_template: next } },
      });
    const body = graphBody<{
      updateSourceSettings: {
        coreFields: Array<{ key: string; value: string }>;
      };
    }>(res);
    expect(body.errors).toBeUndefined();
    expect(settings.getEffective('pr_review_body_template')).toBe(next);

    await settings.applyGroupPatch('source', {
      pr_review_body_template: before,
    });
  });

  it('updateDestinationSettings persists destination patch and returns effective settings', async () => {
    const settings = app.get(SettingsService);
    const before = settings.getEffective('kanban_done_status');
    const next = before === 'Done' ? 'Closed' : 'Done';

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Uds($input: UpdateDestinationSettingsInput!) {
            updateDestinationSettings(input: $input) {
              coreFields {
                key
                value
              }
            }
          }
        `,
        variables: { input: { kanban_done_status: next } },
      });
    const body = graphBody<{
      updateDestinationSettings: {
        coreFields: Array<{ key: string; value: string }>;
      };
    }>(res);
    expect(body.errors).toBeUndefined();
    expect(settings.getEffective('kanban_done_status')).toBe(next);

    await settings.applyGroupPatch('destination', {
      kanban_done_status: before,
    });
  });

  it('updateDestinationSettings surfaces validation error', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: /* GraphQL */ `
          mutation Uds($input: UpdateDestinationSettingsInput!) {
            updateDestinationSettings(input: $input) {
              coreFields {
                key
              }
            }
          }
        `,
        variables: { input: { vk_workspace_executor: 'invalid-executor' } },
      });
    const body = graphBody<{ updateDestinationSettings: unknown }>(res);
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(String((body.errors?.[0] as { message?: string }).message)).toMatch(
      /executor|invalid/i,
    );
  });

  it('vibeKanban queries return GraphQL error when destination is not active', async () => {
    const env = app.get<{ destinationType: string }>(APP_ENV);
    const prev = env.destinationType;
    env.destinationType = 'not_vibe_kanban';
    try {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: VIBE_KANBAN_REPOS });
      const body = graphBody<{ vibeKanbanRepos: unknown }>(res);
      expect(body.errors?.length).toBeGreaterThan(0);
      const firstError = body.errors?.[0];
      const message =
        typeof firstError === 'object' &&
        firstError !== null &&
        'message' in firstError
          ? (() => {
              const raw = (firstError as { message?: unknown }).message;
              return typeof raw === 'string' ? raw : '';
            })()
          : '';
      expect(message).toMatch(/vibe.*kanban.*require/i);
    } finally {
      env.destinationType = prev;
    }
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

  it('integrationNav returns configured nav entries', async () => {
    const gqlRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: INTEGRATION_NAV });
    const gqlWrap = graphBody<{
      integrationNav: {
        entries: { id: string; label: string; href: string }[];
      };
    }>(gqlRes);
    expect(gqlWrap.errors).toBeUndefined();
    const entries = gqlWrap.data!.integrationNav.entries;
    expect(entries.length).toBeGreaterThan(0);
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
