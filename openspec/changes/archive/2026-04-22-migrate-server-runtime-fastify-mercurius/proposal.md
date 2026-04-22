## Why

`npx vibe-squire` install stability is currently sensitive to transitive npm resolver behaviour around the Apollo dependency tree. The root `.npmrc` forces `legacy-peer-deps=true`, and `apps/server/package.json` ships a bespoke `overrides` block that pins `@apollo/server-plugin-landing-page-graphql-playground`'s transitive `@apollo/server` to the app's version so the install graph resolves under npm. Both of these are workarounds for Apollo — the GraphQL runtime is the only subsystem that imposes them.

Switching the server runtime from Express + `@nestjs/apollo` (ApolloDriver) to Fastify + `@nestjs/mercurius` (MercuriusDriver) removes Apollo from the dependency graph entirely, eliminates the need for both workarounds, and moves the stack onto an actively maintained pair of adapters that Nest documents as first-class. Doing it now — before more operator-console surface accretes — keeps migration scope bounded to bootstrap, transport, and test-harness code.

## What Changes

- Replace Nest's HTTP adapter with Fastify: swap `@nestjs/platform-express` for `@nestjs/platform-fastify`, `NestExpressApplication` for `NestFastifyApplication`, and bootstrap via `NestFactory.create<NestFastifyApplication>(..., new FastifyAdapter(...))`.
- Replace the GraphQL driver: swap `@nestjs/apollo` + `@apollo/server` + `@as-integrations/express5` for `@nestjs/mercurius` + `mercurius`. Configure `MercuriusDriver` in `apps/server/src/graphql/graphql.module.ts` with equivalent options: `path: '/graphql'`, `autoSchemaFile`, `sortSchema`, introspection gating on `NODE_ENV`, GraphiQL (Mercurius built-in) in non-production, disabled in production, and `HttpException` status propagation in `formatError`.
- Keep GraphQL subscriptions on `graphql-ws` (the transport layered on top of `mercurius`) so the browser client (Apollo Client + `graphql-ws`) continues to work without changes. The `graphql-subscriptions` `PubSub` used by `StatusEventsModule` is transport-agnostic and stays.
- Replace the Express-specific bootstrap wiring: `apps/server/src/configure-express-app.ts` (body parsers, `express.static`, SPA fallback) is replaced by a Fastify equivalent built on `@fastify/static` for the SPA assets plus a fall-through handler that serves `index.html` for non-API, non-GraphQL GET/HEAD routes. Body parsing for `POST /api/sync/run` / `POST /api/reinit` uses Fastify's built-in JSON parsing.
- Update the two retained REST controllers (`apps/server/src/sync/sync.controller.ts`, `apps/server/src/reinit/reinit.controller.ts`) to remain adapter-agnostic (no `@Req`/`@Res` are used today, so no controller signature changes are expected) and confirm they run under Fastify.
- Update all integration test harnesses (`apps/server/test/*.integration-spec.ts`) to use `NestFastifyApplication`, the Fastify bootstrap equivalent, and Fastify's `app.inject(...)` where appropriate — or keep `supertest` against `app.getHttpServer()` (Fastify supports this after `await app.getHttpAdapter().getInstance().ready()`). Jest config (`apps/server/test/jest-integration.json`) stays.
- **BREAKING (internal API surface only)**: The exported helper `configureExpressApp` is renamed to a Fastify-flavoured equivalent (e.g. `configureFastifyApp`) and changes signature to accept `NestFastifyApplication`. All call sites inside the repo are updated in the same change; this helper is not part of any published interface.
- Remove `class-validator` and `class-transformer` from `apps/server/package.json` if the existing `ValidationPipe` in `main.ts` can be dropped (no DTO validation survives the GraphQL sunset). If removal is unsafe in this change, flag it explicitly and keep for a follow-up — do **not** silently drag it along.
- Remove the Apollo workarounds once the runtime migration is proven: delete the `overrides` block from `apps/server/package.json` and flip `legacy-peer-deps=true` off in the root `.npmrc` (or delete the file if empty). Verify a clean `npm install` + `npx vibe-squire` smoke-install succeeds without either escape hatch.
- Update `docs/ARCHITECTURE.md`, `.cursor/rules/architecture.mdc`, and `AGENTS.md` to name Fastify + Mercurius as the platform defaults wherever Express/Apollo is currently mentioned (the Transport decision table stays — the endpoint inventory does not change).
- Update `docs/stories/p4-fastify-mercurius-migration.md` acceptance criteria progress as tasks complete, and link this OpenSpec change from the story's `openspec` field once opened.

## Capabilities

### New Capabilities

- `server-runtime-platform`: Governs the HTTP adapter, GraphQL driver, static-asset hosting, and bootstrap wiring for the NestJS server process. Captures the requirements "server uses Fastify", "GraphQL uses Mercurius", "SPA static hosting served by `@fastify/static`", and the npm-install hygiene invariants (no Apollo `overrides`, no root `legacy-peer-deps`) that result from retiring Apollo.

### Modified Capabilities

_None._ The `api-transport-policy` spec constrains which transports operator-console features may use (`GraphQL` vs `REST` vs `SSE`) — it is intentionally agnostic to the underlying HTTP adapter or GraphQL driver, so its requirements do not change. `graphql-operator-bff`, `graphql-status`, `web-graphql-client`, `web-status-dashboard`, and `web-ui-atomic-design` describe contract- and UI-level behaviour that is preserved byte-for-byte by this migration.

## Impact

- **Server dependencies**: remove `@apollo/server`, `@as-integrations/express5`, `@nestjs/apollo`, `@nestjs/platform-express`, `@types/express`; add `@nestjs/mercurius`, `mercurius`, `@nestjs/platform-fastify`, `@fastify/static`. Evaluate and likely remove `class-validator` / `class-transformer`.
- **Server code**: `apps/server/src/main.ts`, `apps/server/src/configure-express-app.ts` (renamed), `apps/server/src/graphql/graphql.module.ts`, the two retained controllers if any adapter-specific types leak, and all five integration specs under `apps/server/test/`.
- **Monorepo install hygiene**: `.npmrc` `legacy-peer-deps` setting, `apps/server/package.json` `overrides` block, and any CI step that relies on either.
- **Docs & agent rules**: `docs/ARCHITECTURE.md`, `.cursor/rules/architecture.mdc`, `AGENTS.md`, `README.md` (if it names the adapter), and the `docs/stories/p4-fastify-mercurius-migration.md` story.
- **Client (`apps/web`)**: no contract changes. The Apollo Client HTTP link targets `/graphql`; `graphql-ws` subscriptions use the same URL. No code changes expected beyond possibly regenerating types from the Mercurius-emitted schema (schema content is unchanged).
- **Ops surface**: no change to public endpoints, ports, CORS behaviour, or the bundled SPA layout — purely a runtime-stack swap.
