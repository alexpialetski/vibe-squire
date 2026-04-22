## Context

The vibe-squire server is a NestJS 11 process that exposes GraphQL at `/graphql` (plus `graphql-ws` subscriptions), two operator-tool REST endpoints (`POST /api/sync/run`, `POST /api/reinit`), and the compiled SPA from `apps/server/dist/client/`. Today this runs on:

- `@nestjs/platform-express` as the HTTP adapter, created via `NestFactory.create<NestExpressApplication>(...)`, configured by `apps/server/src/configure-express-app.ts` (body parsers + `express.static` + SPA fallback).
- `@nestjs/apollo` (`ApolloDriver`) in `apps/server/src/graphql/graphql.module.ts`, which pulls in `@apollo/server` and `@as-integrations/express5`.
- `nestjs-pino` for request logging (adapter-agnostic).
- `graphql-ws` subscriptions, a `graphql-subscriptions` `PubSub` instance in `StatusEventsModule` (transport-agnostic), and a single Apollo Client in the browser.

The install pain that motivates this change is entirely in the Apollo dependency tree. Two workarounds currently paper over it:

1. `apps/server/package.json` has an `overrides` block pinning `@apollo/server-plugin-landing-page-graphql-playground`'s transitive `@apollo/server` to the app's version.
2. `.npmrc` sets `legacy-peer-deps=true` at the repo root.

Both workarounds are brittle (they depend on Apollo's transitive plugins keeping their current peer-dep shape) and they silently relax install guarantees for *every* dependency, not just Apollo's. The Mercurius driver is a drop-in peer of `ApolloDriver` in Nest's public API, and it runs on Fastify — a stack with no equivalent transitive hazard.

Server code outside `main.ts`, `configure-express-app.ts`, and `graphql.module.ts` does not import Express or Apollo types (`@Req`/`@Res` are not used; controllers speak pure Nest). That is a narrow enough surface to migrate in a single change.

## Goals / Non-Goals

**Goals:**

- Run the server on Fastify via `@nestjs/platform-fastify` with no regressions in behaviour for `/api/*`, `/graphql`, `graphql-ws` subscriptions, CORS, or SPA hosting.
- Run GraphQL on `@nestjs/mercurius` with an equivalent config: same `/graphql` path, same auto-generated schema file, same introspection/playground gating, same `HttpException` → `statusCode` extension mapping in `formatError`.
- Delete both Apollo-related install workarounds: the `overrides` block and root `legacy-peer-deps=true`. A clean `pnpm install` **and** `npm install` (since `npx vibe-squire` consumers hit the latter) must succeed without either.
- Keep the GraphQL schema and the browser client untouched; operator UI flows work as-is.
- Keep integration test coverage for GraphQL operations, `POST /api/sync/run`, `POST /api/reinit`, and SPA hosting green on CI.
- Update project-level docs and agent-facing rules so they name Fastify + Mercurius as the defaults and don't leave stale Apollo/Express references.

**Non-Goals:**

- No new GraphQL features, schema changes, or resolver refactors. This is a transport migration, not a contract change.
- No changes to the `api-transport-policy` capability. The REST surface (`POST /api/sync/run`, `POST /api/reinit`) and its justification table in `docs/ARCHITECTURE.md` stay exactly as they are.
- No changes to the Apollo Client in `apps/web`. Mercurius speaks the standard GraphQL HTTP + `graphql-ws` protocol that the client already uses.
- No changes to the Prisma/SQLite layer, the sync pipeline, the scheduler, or the `POST /api/reinit` semantics.
- No migration of non-Apollo workarounds (e.g. bundling). If the Apollo migration does not by itself unblock a clean `npx vibe-squire` install, that is a separate story — we stop and report rather than accreting scope.

## Decisions

### Decision 1: Fastify + Mercurius (not Fastify + keep-Apollo, not Express + different Apollo plugin)

**Choice:** Migrate to Fastify **and** swap the GraphQL driver to Mercurius in the same change.

**Rationale:** The install pain is Apollo-specific, not Express-specific. We could in principle keep Express and swap only the GraphQL driver to Mercurius — Mercurius has a Fastify-only design, so that isn't actually possible without also adopting Fastify. The inverse (Fastify + Apollo via `@as-integrations/fastify`) would keep Apollo (and its dependency tree) in play, defeating the whole point. The Nest-documented pair for Fastify-based GraphQL is `@nestjs/mercurius`, so doing both together is also the least-surprising path.

**Alternatives considered:**

- *Keep Apollo, just pin harder:* Replace `overrides` with more targeted pins or a patched plugin. Rejected — each Apollo minor bump retriggers the same investigation, and it keeps `legacy-peer-deps` alive.
- *Swap to a different GraphQL server on Express* (e.g. `graphql-yoga`). Rejected — no Nest-first integration and it doesn't address the root complaint (operators report Apollo-specific install friction, not "any GraphQL server").
- *Drop Nest entirely and go raw Fastify + Mercurius.* Rejected — the DI/module graph is load-bearing for the hexagonal architecture (`AppModule.forRoot(env)`, `IntegrationsModule.register(env)`). Throwing that out to fix an npm-resolution paper cut is wildly disproportionate.

### Decision 2: `@fastify/static` for SPA hosting, with a manual SPA fallback

**Choice:** Replace `express.static` + the current `spaFallback` middleware in `configure-express-app.ts` with `app.register(fastifyStatic, { root: clientRoot, prefix: '/', wildcard: false, maxAge: '1h' })` plus a Fastify `setNotFoundHandler` (or an `onRequest` hook) that serves `index.html` for GET/HEAD requests that are not under `/api/*` or `/graphql`.

**Rationale:** `@fastify/static` is the maintained Fastify ecosystem plugin for this exact use case and Nest's Fastify recipes document it. Keeping the current SPA-fallback rule (no fallthrough for `/api/*` or `/graphql`, no fallthrough for non-GET/HEAD) preserves the existing contract.

**Alternatives considered:**

- *Use `@nestjs/serve-static`.* Rejected — it adds another module to wire and the current hand-rolled handler is tiny; porting it 1:1 onto Fastify primitives is simpler and keeps the fallback logic co-located with the bootstrap code, matching today's structure.

### Decision 3: Keep `supertest` in integration tests, gated on Fastify `ready()`

**Choice:** Leave the existing `supertest` usage in `apps/server/test/*.integration-spec.ts` in place, but after `app.init()` call `await app.getHttpAdapter().getInstance().ready()` so Fastify's internal routing is fully built before the first request. Use `app.inject(...)` only if a test genuinely needs it.

**Rationale:** Minimises test-harness churn. `NestFastifyApplication#getHttpServer()` returns the underlying Node HTTP server once Fastify is `ready()`, so `supertest(app.getHttpServer())` continues to work. Switching every spec to `app.inject` would be a bigger edit with no behavioural benefit.

**Alternatives considered:**

- *Rewrite all specs to use `app.inject`.* Rejected — larger diff, no correctness gain, and `app.inject` does not exercise the real Node HTTP server (which is what runs in production).

### Decision 4: Remove Apollo workarounds **after** runtime migration is green, in the same change

**Choice:** Land the runtime swap first (commits 1..N), then in a terminal commit delete `apps/server/package.json`'s `overrides` block and the root `.npmrc` `legacy-peer-deps` setting, and re-verify `pnpm install` + a full `npm install` from a clean cache + `npx vibe-squire` smoke flow all succeed.

**Rationale:** Keeping the workarounds in place during the migration commits means the build never enters a half-broken state. Removing them only after Apollo is fully gone proves that *Apollo* was the reason they existed (and, if removal fails, tells us clearly that some other dependency had quietly hitched a ride — information we want before merging).

**Alternatives considered:**

- *Remove overrides first, then migrate.* Rejected — install would be broken between commits, and bisecting across that range would be painful.
- *Leave the workarounds in "just in case".* Rejected — acceptance criterion #6 of the P4.1 story explicitly calls for their removal, and leaving them silently relaxes install guarantees for unrelated dependencies.

### Decision 5: Deletion-over-adaptation for Apollo-specific utilities

**Choice:** The `apollo-server-plugin-landing-page-*` imports in `graphql.module.ts`, the `@apollo/server`, `@as-integrations/express5`, and `@nestjs/apollo` packages, and `@nestjs/platform-express` + `@types/express` are **removed** from `apps/server/package.json` in the same change. The `ValidationPipe` in `main.ts` and the `class-validator` / `class-transformer` runtime deps are audited: if no resolver, controller, or service actually relies on validator decorators, they are removed; otherwise, their removal is explicitly deferred with a TODO referencing a follow-up story — but no silent retention.

**Rationale:** The `api-transport-policy` spec (archived from `graphql-rest-sse-sunset`) already requires `class-validator` / `class-transformer` / `nestjs-zod` to be absent. A quick grep confirms `nestjs-zod` is gone; `class-validator` / `class-transformer` are still in `package.json` but may not have any live importers. Either way, this migration is the right moment to confirm and clean up, because the `ValidationPipe` wiring lives in `main.ts` — exactly the file we are rewriting.

**Alternatives considered:**

- *Defer the validator cleanup to a separate change.* Rejected if the removal is trivial (no importers). Accepted if there are live importers — in that case flag them and stop.

### Decision 6: Nest version and peer ranges are held constant

**Choice:** Keep Nest at `^11` and pull `@nestjs/platform-fastify` / `@nestjs/mercurius` at versions that are peer-compatible with Nest 11. Do not opportunistically upgrade Nest itself as part of this change.

**Rationale:** Bundling a Nest upgrade with a platform swap multiplies the blast radius. `@nestjs/mercurius` 13.x is published for the Nest 11 line and integrates cleanly with `@nestjs/graphql` 13.x (already installed).

## Risks / Trade-offs

- **[Risk] Mercurius GraphQL error shape differs subtly from Apollo's.** → Mitigation: the current `formatError` hook normalises errors via `HttpException.getStatus()` on `originalError`. Mercurius exposes `originalError` in the same shape for `HttpException`s thrown from Nest-level code. We'll add an integration test that asserts: resolver throws `HttpException` → response body carries `extensions.statusCode`. If Mercurius proves to differ, we widen `formatError` rather than accept regression.
- **[Risk] `graphql-ws` wiring on Mercurius requires different config than Apollo.** → Mitigation: Mercurius' `subscription: true` option plus the published `@nestjs/mercurius` driver config surface `graphql-ws` natively. We will keep the current `StatusEventsModule` `PubSub` as the event bus (it is transport-agnostic) and add a targeted integration test that connects a WS client, runs a status subscription, and asserts events.
- **[Risk] Fastify's stricter body-parsing defaults reject requests Express accepted.** → Mitigation: only two REST endpoints consume bodies (`POST /api/sync/run`, `POST /api/reinit`). Both are JSON-only today; Fastify's default JSON parser is equivalent. Add an explicit test asserting each returns `200` on a minimal JSON body. If any path needs `application/x-www-form-urlencoded` we'll register `@fastify/formbody` — but we expect not to.
- **[Risk] `@fastify/static` SPA fallback misroutes deep links.** → Mitigation: the existing integration spec `apps/server/test/ui-smoke.integration-spec.ts` already asserts SPA fallback semantics (`/arbitrary/route` → 200 + `index.html`). Port this spec's assertions verbatim onto the Fastify harness before declaring done.
- **[Risk] Removing `legacy-peer-deps` surfaces *other* latent peer-dep conflicts the flag was silently papering over.** → Mitigation: run `pnpm install` **and** a clean `npm install` (because `npx vibe-squire` uses npm) after removing the flag. If new conflicts surface, stop — do not re-enable `legacy-peer-deps`. Either fix them in this change (small, direct fix) or carve them out into a named follow-up story (larger, reportable fix). Do not silently ship with `legacy-peer-deps` re-enabled.
- **[Trade-off] Contributors have to learn Fastify lifecycle and plugin registration.** → Acceptable: Nest hides most of it. The touch points are `main.ts` and the renamed `configure-fastify-app.ts`. Fastify hooks are documented and well-trodden.
- **[Trade-off] GraphiQL UI differs from Apollo Sandbox.** → Acceptable: both provide introspection-driven queries against `/graphql`, which is the only local-dev affordance we use. Production still has it disabled.

## Migration Plan

This is a single-release, in-place migration. There is no staged rollout — vibe-squire is a local operator tool, not a multi-tenant service — so "migration" here means the order of operations within the change.

1. **Install new deps, keep old ones** (commit 1): add `@nestjs/platform-fastify`, `@nestjs/mercurius`, `mercurius`, `@fastify/static`. Typecheck only; don't wire anything yet. Old install still works, old stack still runs.
2. **Swap HTTP adapter** (commit 2): rewrite `main.ts` and rename `configure-express-app.ts` → `configure-fastify-app.ts`. Keep `ApolloDriver` by using `@as-integrations/fastify` *temporarily only if* it is trivially available; otherwise do steps 2 and 3 as one commit to avoid a broken intermediate state. Prefer the combined commit — Mercurius is the intended endpoint, and carrying Apollo on Fastify for a single commit is strictly worse than not having that commit at all.
3. **Swap GraphQL driver** (commit 2 or 3): update `graphql.module.ts` to `MercuriusDriver` + equivalent config. Update `formatError`. Verify `graphql-ws` subscriptions resolve.
4. **Port integration tests** (commit 4): flip specs to `NestFastifyApplication`, add `ready()` call after `init()`, run them all. Add the two new coverage tests (`HttpException` status propagation, subscription smoke).
5. **Remove dead deps** (commit 5): drop `@apollo/server`, `@as-integrations/express5`, `@nestjs/apollo`, `@nestjs/platform-express`, `@types/express`. Evaluate `class-validator` / `class-transformer`; remove if unused, note in PR if retained.
6. **Remove install workarounds** (commit 6): delete the `overrides` block from `apps/server/package.json`, delete `legacy-peer-deps=true` from `.npmrc`. Run `pnpm install` and `npm install` from clean caches. If either fails, stop and debug — **do not** re-add the workarounds.
7. **Update docs & rules** (commit 7): `docs/ARCHITECTURE.md`, `.cursor/rules/architecture.mdc`, `AGENTS.md`, README if it names the adapter, and the story file. Tick acceptance criteria.

**Rollback:** `git revert` the migration merge. Because no data migration, schema change, on-disk format change, or external-API contract change is introduced, revert is safe at any time. For local operators who have already `npx`-installed the Fastify build, `npx vibe-squire@<previous>` pulls the previous release cleanly.

## Open Questions

- **Q1.** Do any source files under `apps/server/src/` still import from `class-validator` or `class-transformer`? (If zero, remove them as part of this change. If non-zero, enumerate the importers in tasks.md and decide per-file whether to migrate to Zod/GraphQL validation or defer.) **Resolution path:** first task in tasks.md is an audit grep; answer is deterministic, not a design decision.
- **Q2.** Does Mercurius' default GraphiQL path collide with the SPA route? (Default is `/graphiql`, not `/graphql`, so the SPA fallback's "don't fall through for `/graphql` or `/api/*`" rule needs a parallel exclusion for `/graphiql` in non-production.) **Resolution path:** add `/graphiql` to the excluded prefix list in the Fastify SPA fallback, gated on `nodeEnv !== 'production'`.
- **Q3.** Is the `npx vibe-squire` bin script (`apps/server/bin/vibe-squire.js`) sensitive to Express-era module layout (e.g. does it require any Express-specific file)? **Resolution path:** inspect `bin/vibe-squire.js` and the existing `scripts/bundle.mjs` reference (recently viewed but not currently present) during task 1; answer is deterministic.
