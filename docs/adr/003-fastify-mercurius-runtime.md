# ADR 003: Run the server on Fastify + Mercurius (retire Express + Apollo)

**Status:** Accepted

## Context

[ADR 001](001-graphql-pilot.md) introduced GraphQL alongside REST and named a concrete server stack for the Nest runtime: `@nestjs/graphql` + `@nestjs/apollo` + `@apollo/server` on `@nestjs/platform-express`. That decision has held well on the GraphQL-as-transport axis — every operator-console capability shipped since has been a resolver rather than a REST handler, culminating in the REST/SSE sunset ([story P2.5](../stories/p2-graphql-rest-sse-sunset.md)) that made GraphQL the sole operator-console transport.

It has aged less well on the dependency-tree axis:

- `@apollo/server` v5 ships with peer-dep expectations that do not line up cleanly with some of its own published plugins (e.g. `@apollo/server-plugin-landing-page-graphql-playground`). Under npm's stricter peer-dep enforcement, the install graph for `vibe-squire` did not resolve.
- The workarounds were defensive and bluntly scoped: a bespoke `overrides` block in `apps/server/package.json` pinning the plugin's transitive `@apollo/server` to the app's version, and `legacy-peer-deps=true` set at the **repo root** (`/.npmrc`) which silently relaxed peer-dep guarantees for *every* dependency, not just Apollo's.
- `vibe-squire` is distributed via `npx vibe-squire` and consumed by operators whose npm client is whatever ships with their Node install. Keeping the install graph happy under plain `npm install` — with no flags — is a shipped-product requirement, not a nice-to-have.
- The NestJS public API documents Mercurius on Fastify as a first-class peer of ApolloDriver on Express. Mercurius is actively maintained, has a smaller dependency surface, and has no equivalent transitive-plugin hazard.

The question this ADR answers is narrowly: **does the server runtime stay on Express + Apollo, or move to Fastify + Mercurius, and is the GraphQL-alongside-REST decision itself affected?**

## Decision

**Migrate the server runtime to NestJS on Fastify (via `@nestjs/platform-fastify`) with Mercurius (via `@nestjs/mercurius`) as the GraphQL driver.** Retire `@apollo/server`, `@nestjs/apollo`, `@as-integrations/express5`, `@nestjs/platform-express`, and the Apollo landing-page plugin.

Concretely:

- **HTTP adapter:** `NestFactory.create<NestFastifyApplication>(AppModule.forRoot(env), new FastifyAdapter(), { bufferLogs: true })`. The app helper formerly named `configureExpressApp` becomes `configureFastifyApp` and serves the SPA via `@fastify/static` plus a GET/HEAD fallback that excludes `/api/*`, `/graphql`, and (in non-production) `/graphiql`.
- **GraphQL driver:** `MercuriusDriver` with `path: '/graphql'`, `autoSchemaFile`, `sortSchema: true`, `graphiql: !prod`, `subscription: true` for `graphql-ws`, and an `errorFormatter` that lifts `HttpException#getStatus()` into `extensions.statusCode` (preserving the Apollo-era contract). Production introspection is blocked via `NoSchemaIntrospectionCustomRule` in `validationRules`.
- **GraphQL schema and wire contract are preserved byte-for-byte.** Code-first `@nestjs/graphql` stays. Apollo Client in `apps/web` is untouched; it continues to target `/graphql` for queries/mutations and `graphql-ws` for subscriptions.
- **Install hygiene:** the `overrides` block in `apps/server/package.json` and the `legacy-peer-deps=true` line in the root `.npmrc` are **deleted**, not merely superseded. A clean `pnpm install` and a clean `npm install` both succeed without flags; this is a post-migration invariant, not a nice-to-have.
- **Adjacent cleanup (permitted because `main.ts` is being rewritten anyway):** `class-validator` and `class-transformer` are removed from `apps/server/package.json`; the `ValidationPipe` registration in `main.ts` goes with them. This closes out an `api-transport-policy` requirement already on the books.

**Relationship to ADR 001:** this ADR **amends the server-stack sub-decision** of ADR 001 (it names a different adapter + driver) while leaving ADR 001's primary decision — "GraphQL alongside REST, sunset REST per-endpoint once unused" — in full force. ADR 001 is *not* superseded, only partially updated; the GraphQL-vs-REST axis remains the operative record.

This decision is recorded alongside the OpenSpec change `migrate-server-runtime-fastify-mercurius` (archived under `openspec/changes/archive/`) and the implementation story [P4.1](../stories/p4-fastify-mercurius-migration.md).

## Consequences

- \+ `npx vibe-squire` installs cleanly on plain npm without `--legacy-peer-deps`; install guarantees for unrelated dependencies are restored across the whole monorepo.
- \+ Dependency surface shrinks: four Apollo-ecosystem packages plus two validator packages gone; two slimmer Fastify/Mercurius packages plus `@fastify/static` added. Net reduction in `apps/server/dist` install weight.
- \+ Mercurius' `errorFormatter` is a simpler shape than Apollo's `formatError`; the Nest-`HttpException`-to-status-code bridge is two lines.
- \+ Fastify is actively maintained and the Nest team publishes `@nestjs/platform-fastify` as a first-class adapter; no "Apollo 5 landed, re-audit everything" fire drills from one specific upstream.
- \- GraphiQL replaces Apollo Sandbox for local dev. Both introspection-driven, functionally equivalent for the one-off queries we run — but muscle memory differs.
- \- Fastify's `app.inject(...)` testing helper is *more* capable than Express's, but the integration harness keeps `supertest(app.getHttpServer())` for continuity; anyone adding new specs must remember to `await app.getHttpAdapter().getInstance().ready()` after `app.init()`.
- \- The resolvers' error-shape contract is now Mercurius-specific (`errorFormatter` return shape). If we ever migrate drivers again we re-cross this bridge — but an integration test in `apps/server/test/graphql-operator-bff.integration-spec.ts` pins the `extensions.statusCode` guarantee.
- \- `class-validator` / `class-transformer` removal means any future DTO validation must be reintroduced via Zod (already the project's validation library of record) rather than decorator-based validators. This is consistent with the archived `api-transport-policy` decision and is the preferred direction.

## Alternatives considered

- **Keep Apollo, pin harder.** Replace the `overrides` block with a patch file or more-targeted pins. Rejected: every Apollo minor bump re-triggers the same investigation, and it keeps `legacy-peer-deps=true` alive at the repo root — which silently relaxes install-time guarantees for every dependency in the workspace, not just Apollo's. Fragile and indiscriminate.
- **Apollo on Fastify via `@as-integrations/fastify`.** Would keep the `@apollo/server` dependency tree (and therefore the plugin peer-dep hazard) in the graph despite the adapter swap. Defeats the point of the migration.
- **Swap to `graphql-yoga` on Express.** Rejected: no Nest-first integration at the quality of `@nestjs/mercurius`, and it doesn't address the underlying complaint (operators report Apollo-specific install friction, not "any GraphQL server").
- **Drop Nest entirely and go raw Fastify + Mercurius.** The DI / module graph is load-bearing for the hexagonal architecture (`AppModule.forRoot(env)`, `IntegrationsModule.register(env)`, port-token injection). Throwing that out to fix an npm-resolution paper cut is wildly disproportionate to the problem.
- **Opportunistically upgrade Nest to the next major in the same change.** Rejected: bundling a Nest upgrade with a platform swap multiplies the blast radius of regressions. Nest stays on `^11`; peer-compatible versions of `@nestjs/platform-fastify` and `@nestjs/mercurius` are pulled in.
