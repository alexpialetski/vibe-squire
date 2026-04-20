---
id: P2.1
title: GraphQL server foundation (code-first Nest + Apollo driver)
status: todo
impact: M
urgency: later
tags:
  - area:graphql
  - area:ports
  - theme:dx
openspec: recommended
updated: 2026-04-20
roadmap_ref: P2.1
depends_on: []
adr_refs:
  - 001-graphql-pilot.md
---

## Problem / outcome

Establish the minimum viable GraphQL endpoint on the Nest server so subsequent stories can port real queries/mutations/subscriptions onto it. No functional change for existing users — purely scaffolding.

## Acceptance criteria

- [ ] Add dependencies to `apps/server/package.json`: `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `graphql`, `graphql-ws`, `graphql-subscriptions`.
- [ ] New module `apps/server/src/graphql/graphql.module.ts` wires `GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: …, subscriptions: { 'graphql-ws': true }, sortSchema: true })` in code-first mode.
- [ ] Emitted SDL lives at `apps/server/src/generated/schema.graphql` (gitignored — same treatment as `apps/server/src/generated/prisma/`).
- [ ] `HealthResolver` returns `{ ok: Boolean!, version: String!, timestamp: DateTime! }` via a `health: HealthStatus!` query. No Prisma, no `gh`, no integration imports — only `SettingsService` if needed for `version`.
- [ ] `GraphqlModule` is imported from `AppModule.forRoot` so it participates in the normal boot flow.
- [ ] Apollo Sandbox is available at `/graphql` in dev with `introspection: true` gated on `NODE_ENV !== 'production'`; both are disabled in prod builds.
- [ ] Integration test under `apps/server/test/` hits `POST /graphql` with `query { health { ok version } }` and asserts the response — follows existing `*.integration-spec.ts` conventions.
- [ ] `/graphql` survives the static-client middleware (Nest serves `dist/client`) — route registration order verified.

## Notes

- Hexagonal rule (see `.cursor/rules/architecture.mdc`): resolvers are driving adapters, peers of HTTP controllers. They live under `apps/server/src/graphql/` (or colocated with their feature module once ported) and call application services. They must never import from `apps/server/src/integrations/` or `apps/server/src/generated/prisma/`.
- OpenSpec recommended because: new top-level transport, new ports-layer concern (resolver == driving adapter), affects module graph and distribution bundle size.
- Bundle-size budget: record `apps/server/dist` size before and after in the PR description via `pnpm --filter vibe-squire run build && du -sh apps/server/dist`. Flag if growth exceeds expectations for the added deps.
- Keep the `HealthResolver` as a regression anchor for future work — do not delete it when real resolvers arrive.
