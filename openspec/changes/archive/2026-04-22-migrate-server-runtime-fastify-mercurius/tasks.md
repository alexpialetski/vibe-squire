## 1. Audit & Preparation

- [x] 1.1 Grep `apps/server/src/` for imports from `class-validator` and `class-transformer`; list live importers (if any) and decide per-file whether to drop them in this change or defer with a follow-up story reference (resolves design Open Question Q1).
- [x] 1.2 Inspect `apps/server/bin/vibe-squire.js` and any remaining bundler script under `apps/server/scripts/` for Express-specific assumptions (entry file name, module layout, asset paths). Document findings in the PR description (resolves design Open Question Q3).
- [x] 1.3 Grep `apps/server/src/` for `@Req(`, `@Res(`, `express.Request`, `express.Response`; confirm zero matches (expected) and halt migration with a report if any are found.
- [x] 1.4 Confirm `docs/ARCHITECTURE.md` Transport decision table currently lists exactly `POST /api/sync/run` and `POST /api/reinit` as `kept (operator tool)`, so no table rows will change as part of this migration.

## 2. Dependencies

- [x] 2.1 Add `@nestjs/platform-fastify` to `apps/server/package.json` dependencies at a version compatible with the existing Nest `^11` line.
- [x] 2.2 Add `@nestjs/mercurius` and `mercurius` to `apps/server/package.json` dependencies at versions compatible with Nest `^11` and `@nestjs/graphql@^13`.
- [x] 2.3 Add `@fastify/static` to `apps/server/package.json` dependencies.
- [x] 2.4 Run `pnpm install` with the old workarounds still in place (overrides + legacy-peer-deps); commit the lockfile update. Do NOT remove the workarounds yet.

## 3. HTTP Adapter Swap

- [x] 3.1 Rename `apps/server/src/configure-express-app.ts` to `apps/server/src/configure-fastify-app.ts`; change its signature to accept `NestFastifyApplication`.
- [x] 3.2 Inside `configure-fastify-app.ts`, replace `express.json()` / `express.urlencoded()` usage with reliance on Fastify's built-in JSON parser (no registration required for current endpoints).
- [x] 3.3 Replace `express.static(...)` with `app.register(fastifyStatic, { root: clientRoot, prefix: '/', wildcard: false, maxAge: '1h' })`, preserving the `resolveClientRoot` helper.
- [x] 3.4 Reimplement the SPA fallback: install a Fastify `setNotFoundHandler` (or `onRequest` hook) that, for GET/HEAD requests whose path does not start with `/api/`, `/graphql`, or (in non-production) `/graphiql`, sends the contents of `<clientRoot>/index.html` with `Content-Type: text/html`. All other requests SHALL fall through to Nest's default 404 behaviour (resolves Open Question Q2 with an explicit `/graphiql` exclusion).
- [x] 3.5 Update `apps/server/src/main.ts`: import `NestFastifyApplication` and `FastifyAdapter` from `@nestjs/platform-fastify`, construct the app via `NestFactory.create<NestFastifyApplication>(AppModule.forRoot(env), new FastifyAdapter(), { bufferLogs: true })`, call the renamed `configureFastifyApp(app)`, keep `app.enableCors({ origin: true })`, keep `app.useLogger(app.get(Logger))`, and call `await app.listen(env.port, env.host)`.
- [x] 3.6 Audit `app.useGlobalPipes(new ValidationPipe(...))` in `main.ts`: if task 1.1 showed no live `class-validator` decorators, remove the pipe registration; otherwise, keep it and note the deferred cleanup in the PR description.

## 4. GraphQL Driver Swap

- [x] 4.1 In `apps/server/src/graphql/graphql.module.ts`, replace the `@nestjs/apollo` / `ApolloDriver` imports with `@nestjs/mercurius` / `MercuriusDriver` and `MercuriusDriverConfig`.
- [x] 4.2 Delete the `@apollo/server/plugin/landingPage/*` imports.
- [x] 4.3 Rewrite the `useFactory` body to return a `MercuriusDriverConfig` with: `path: '/graphql'`, `autoSchemaFile: SCHEMA_FILE`, `sortSchema: true`, `graphiql: !prod`, `subscription: true` (enables `graphql-ws` at the same URL), and an `errorFormatter`/`formatError` equivalent that extracts `HttpException#getStatus()` from `originalError` and places it at `extensions.statusCode`.
- [x] 4.4 Verify `StatusEventsModule` and its `graphql-subscriptions` `PubSub` usage is untouched; the subscription transport migrates without changes to event-producer code.
- [x] 4.5 Regenerate `apps/server/src/generated/schema.graphql` by running `pnpm --filter vibe-squire build` (the driver swap must not introduce type, field, or directive drift). Diff the file; if any non-whitespace change appears, stop and investigate.

## 5. Integration Tests

- [x] 5.1 In each of `apps/server/test/graphql-status.integration-spec.ts`, `ui-smoke.integration-spec.ts`, `graphql-operator-triage.integration-spec.ts`, `graphql-health.integration-spec.ts`, `graphql-operator-bff.integration-spec.ts`, replace `NestExpressApplication` with `NestFastifyApplication` and `createNestApplication<NestExpressApplication>()` with `createNestApplication<NestFastifyApplication>(new FastifyAdapter())`.
- [x] 5.2 Replace each spec's `configureExpressApp(app)` call with `configureFastifyApp(app)`.
- [x] 5.3 After `await app.init()`, add `await app.getHttpAdapter().getInstance().ready()` before any `supertest(app.getHttpServer())` call.
- [x] 5.4 Add an integration test that throws a Nest `HttpException` from a test resolver, sends the operation over `/graphql`, and asserts the response error's `extensions.statusCode` equals the thrown status.
- [x] 5.5 Add an integration test that connects a `graphql-ws` client to `/graphql`, subscribes to the `status` subscription, publishes an event on the in-process `PubSub`, and asserts the client receives it.
- [x] 5.6 Run `pnpm --filter vibe-squire test:integration` and verify all specs pass. Fix any regressions before proceeding.

## 6. Remove Retired Dependencies

- [x] 6.1 Remove `@apollo/server`, `@apollo/server-plugin-landing-page-graphql-playground` (if present in the graph), `@as-integrations/express5`, `@nestjs/apollo`, `@nestjs/platform-express`, and `@types/express` from `apps/server/package.json`.
- [x] 6.2 If task 1.1 concluded removal is safe, remove `class-validator` and `class-transformer` from `apps/server/package.json`.
- [x] 6.3 Run `pnpm install`; commit the lockfile update. Confirm `pnpm --filter vibe-squire build`, `pnpm --filter vibe-squire typecheck`, and `pnpm --filter vibe-squire test` pass.

## 7. Remove Install Workarounds

- [x] 7.1 Delete the `overrides` block from `apps/server/package.json`.
- [x] 7.2 Delete the `legacy-peer-deps=true` line from the root `.npmrc`; if the file becomes empty, delete the file.
- [x] 7.3 From a clean state (`rm -rf node_modules apps/*/node_modules pnpm-lock.yaml` in a throwaway clone), run `pnpm install` and confirm it exits `0` without warnings about peer-dep resolution. Regenerate `pnpm-lock.yaml` and commit.
- [x] 7.4 From a clean state in another throwaway clone, run `npm install` (no flags) against the production tarball / the repo, and confirm it exits `0` without requiring `--legacy-peer-deps`. If it fails, stop and debug — do NOT re-add either workaround.
- [x] 7.5 Smoke-test `npx vibe-squire --help` (or whatever the bin supports) from a published-equivalent install to confirm the bin entry still resolves under the new dependency tree.

## 8. Documentation & Rules

- [x] 8.1 Update `docs/ARCHITECTURE.md` wherever Express or Apollo is named as the platform default: rewrite those references to "NestJS on Fastify (via `@nestjs/platform-fastify`) with Mercurius (via `@nestjs/mercurius`) as the GraphQL driver". Leave the Transport decision table unchanged.
- [x] 8.2 Update `.cursor/rules/architecture.mdc` with the same platform-default rewording.
- [x] 8.3 Update `AGENTS.md` with the same platform-default rewording.
- [x] 8.4 If `README.md` (root or `apps/server/`) names Express or Apollo, update it likewise.
- [x] 8.5 In `docs/stories/p4-fastify-mercurius-migration.md`, tick each acceptance criterion as its corresponding task group completes; set `openspec: migrate-server-runtime-fastify-mercurius`; update `status` / `updated` per `docs/stories/` conventions once the change merges.

## 9. Verification

- [x] 9.1 Run the full matrix locally: `pnpm --filter vibe-squire build`, `pnpm --filter vibe-squire typecheck`, `pnpm --filter vibe-squire test`, `pnpm --filter vibe-squire test:integration`. All commands SHALL exit `0`.
- [x] 9.2 Start the built server (`pnpm --filter vibe-squire start:prod`) and hit: `GET /` (expect SPA `index.html`), `GET /anything/arbitrary` (expect SPA `index.html`), `POST /graphql` with a trivial `__typename` query (expect `200` with `data: { __typename: "Query" }` equivalent), `POST /api/sync/run` with a minimal JSON body (expect current behaviour), `POST /api/reinit` with a minimal JSON body (expect current behaviour). Record results in PR description.
- [x] 9.3 Grep `apps/server/` for any leftover references to `express`, `ApolloDriver`, `@apollo/server`, `@as-integrations/express5`, `legacy-peer-deps`, or the old `overrides` block; confirm zero matches.
