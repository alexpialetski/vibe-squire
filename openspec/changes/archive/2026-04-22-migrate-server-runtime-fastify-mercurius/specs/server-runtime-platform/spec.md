## ADDED Requirements

### Requirement: Server runs on the Fastify HTTP adapter

The NestJS server SHALL boot on `@nestjs/platform-fastify`. The application entrypoint in `apps/server/src/main.ts` SHALL create the app with `NestFactory.create<NestFastifyApplication>(AppModule.forRoot(env), new FastifyAdapter(...), { bufferLogs: true })` and SHALL NOT import `@nestjs/platform-express` or `NestExpressApplication`. No source file under `apps/server/src/` SHALL import from `express` or `@types/express`.

#### Scenario: Entrypoint uses the Fastify adapter type

- **WHEN** `apps/server/src/main.ts` is inspected after this change lands
- **THEN** it SHALL import `NestFastifyApplication` from `@nestjs/platform-fastify`
- **AND** it SHALL create the Nest application with a `FastifyAdapter` instance
- **AND** it SHALL NOT import from `@nestjs/platform-express`

#### Scenario: No source file imports Express

- **WHEN** `apps/server/src/` is searched for imports from `express`, `@types/express`, or `@nestjs/platform-express`
- **THEN** zero matches SHALL be found

### Requirement: GraphQL runs on the Mercurius driver

The `GraphQLModule` in `apps/server/src/graphql/graphql.module.ts` SHALL be configured with `MercuriusDriver` from `@nestjs/mercurius`. No source file under `apps/server/src/` SHALL import from `@nestjs/apollo`, `@apollo/server`, or `@as-integrations/express5`. The Mercurius configuration SHALL preserve the pre-migration behaviour: `/graphql` path, auto-generated schema file at `src/generated/schema.graphql`, sorted schema, introspection enabled only when `NODE_ENV !== 'production'`, GraphiQL / landing page enabled only outside production, and an error formatter that, when the resolver threw a Nest `HttpException`, propagates the status code into the formatted error's `extensions.statusCode`.

#### Scenario: Graphql module configures MercuriusDriver

- **WHEN** `apps/server/src/graphql/graphql.module.ts` is inspected after this change lands
- **THEN** it SHALL import `MercuriusDriver` and `MercuriusDriverConfig` from `@nestjs/mercurius`
- **AND** `GraphQLModule.forRootAsync<MercuriusDriverConfig>({ driver: MercuriusDriver, ... })` SHALL be the only GraphQL driver registration
- **AND** it SHALL NOT import anything from `@nestjs/apollo`, `@apollo/server`, or `@as-integrations/express5`

#### Scenario: GraphQL endpoint path and schema file are preserved

- **WHEN** the server boots with any `NODE_ENV`
- **THEN** `POST /graphql` SHALL accept GraphQL queries and mutations
- **AND** the schema file emitted at `apps/server/src/generated/schema.graphql` SHALL be equivalent to the pre-migration schema (no type, field, or directive additions, removals, or renames introduced by this change)

#### Scenario: HttpException status propagates into GraphQL errors

- **WHEN** a resolver throws `new HttpException('boom', 418)`
- **AND** a client sends the corresponding operation to `POST /graphql`
- **THEN** the response JSON SHALL contain an error whose `extensions.statusCode` is `418`

#### Scenario: Introspection is disabled in production

- **WHEN** the server is started with `NODE_ENV=production`
- **AND** a client sends an `__schema` introspection query to `/graphql`
- **THEN** the response SHALL NOT include the full schema introspection payload (matching current behaviour where introspection is disabled in production)

### Requirement: `graphql-ws` subscriptions continue to work on Mercurius

The Mercurius configuration SHALL enable GraphQL subscriptions over the `graphql-ws` protocol at the same `/graphql` URL used for queries and mutations. The in-process event bus (`StatusEventsModule`'s `graphql-subscriptions` `PubSub`) SHALL continue to be the source of subscription events without modification.

#### Scenario: Status subscription delivers events

- **WHEN** a `graphql-ws` client connects to `/graphql` and subscribes to the `status` subscription
- **AND** a status event is published on the in-process `PubSub`
- **THEN** the client SHALL receive the event over the WebSocket transport
- **AND** the event payload SHALL match the current pre-migration shape

### Requirement: SPA static assets are served by `@fastify/static` with a GET/HEAD fallback

The compiled web client SHALL be served from the same directory resolution that was used pre-migration (`dist/client/` next to the compiled `main.js`, with a monorepo-dev fallback to `apps/web/dist/`). Static hosting SHALL be implemented using `@fastify/static` (registered from the Nest bootstrap, equivalent to the current `configure-express-app.ts`). A request-level fallback SHALL serve `index.html` when all of the following are true: the request method is `GET` or `HEAD`, the path does not start with `/api/`, the path does not start with `/graphql`, and (in non-production only) the path does not start with `/graphiql`. For any other request that does not match a static file, the fallback SHALL pass through so Nest's normal 404 handling applies.

#### Scenario: Deep SPA link returns index.html

- **WHEN** the server is running the built SPA
- **AND** a client sends `GET /any/non-api/path`
- **THEN** the response SHALL be `200 OK`
- **AND** the body SHALL be the contents of `index.html`

#### Scenario: `/api/*` paths do not receive the SPA fallback

- **WHEN** a client sends `GET /api/this-route-does-not-exist`
- **THEN** the response SHALL NOT be the SPA `index.html`
- **AND** the response status SHALL be `404`

#### Scenario: `/graphql` does not receive the SPA fallback

- **WHEN** a client sends `GET /graphql`
- **THEN** the response SHALL be the Mercurius-handled GraphQL response (or 400 for a malformed GET, matching pre-migration Apollo behaviour)
- **AND** the response body SHALL NOT be the SPA `index.html`

#### Scenario: Non-GET/HEAD requests do not receive the SPA fallback

- **WHEN** a client sends `POST /some/random/path` with no matching handler
- **THEN** the response status SHALL be `404`
- **AND** the response body SHALL NOT be the SPA `index.html`

### Requirement: Retained REST operator-tool endpoints work under Fastify

`POST /api/sync/run` and `POST /api/reinit` SHALL continue to accept JSON request bodies and return their current response shapes after the migration. Their controllers SHALL NOT import from `express` or `@nestjs/platform-express` and SHALL NOT rely on `@Req()` or `@Res()` parameters.

#### Scenario: `POST /api/sync/run` accepts JSON

- **WHEN** a client sends `POST /api/sync/run` with `Content-Type: application/json` and a valid JSON body
- **THEN** the response status SHALL match pre-migration behaviour (`200 OK` on success)
- **AND** the response body SHALL deserialize as JSON

#### Scenario: `POST /api/reinit` accepts JSON

- **WHEN** a client sends `POST /api/reinit` with `Content-Type: application/json` and a valid JSON body
- **THEN** the response status SHALL match pre-migration behaviour (`200 OK` on success)
- **AND** the response body SHALL deserialize as JSON

### Requirement: Apollo and Express packages are removed from the server manifest

`apps/server/package.json` SHALL NOT list `@apollo/server`, `@apollo/server-plugin-landing-page-graphql-playground`, `@as-integrations/express5`, `@nestjs/apollo`, `@nestjs/platform-express`, or `@types/express` as dependencies (runtime or dev) after this change lands. It SHALL list `@nestjs/platform-fastify`, `@nestjs/mercurius`, `mercurius`, and `@fastify/static` as runtime dependencies.

#### Scenario: Retired adapter/driver deps are absent

- **WHEN** `apps/server/package.json` is inspected after this change lands
- **THEN** the `dependencies` and `devDependencies` maps SHALL NOT contain any of `@apollo/server`, `@apollo/server-plugin-landing-page-graphql-playground`, `@as-integrations/express5`, `@nestjs/apollo`, `@nestjs/platform-express`, or `@types/express`

#### Scenario: New adapter/driver deps are present

- **WHEN** `apps/server/package.json` is inspected after this change lands
- **THEN** the `dependencies` map SHALL contain `@nestjs/platform-fastify`, `@nestjs/mercurius`, `mercurius`, and `@fastify/static`

### Requirement: Apollo-targeted install workarounds are removed

The `overrides` block in `apps/server/package.json` that pinned `@apollo/server-plugin-landing-page-graphql-playground`'s transitive `@apollo/server` SHALL be removed. The `legacy-peer-deps=true` line in the root `.npmrc` SHALL be removed (and if that leaves the file empty, the file SHALL be deleted). A clean `pnpm install` and a clean `npm install` SHALL both succeed from this repository without either workaround in place.

#### Scenario: `overrides` block is absent

- **WHEN** `apps/server/package.json` is inspected after this change lands
- **THEN** it SHALL NOT contain a top-level `overrides` field, and if it does, the field SHALL NOT reference `@apollo/server-plugin-landing-page-graphql-playground` or `@apollo/server`

#### Scenario: Root `.npmrc` does not enable `legacy-peer-deps`

- **WHEN** the root `.npmrc` is inspected after this change lands
- **THEN** it SHALL NOT contain the line `legacy-peer-deps=true`

#### Scenario: Clean installs succeed

- **WHEN** the repository is cloned fresh and `pnpm install` is run
- **THEN** the command SHALL exit `0`
- **AND WHEN** the repository is cloned fresh and `npm install` is run
- **THEN** the command SHALL also exit `0` without requiring `--legacy-peer-deps`

### Requirement: Integration test harnesses target `NestFastifyApplication`

Every integration spec under `apps/server/test/` SHALL type the Nest application as `NestFastifyApplication`, construct it via the Fastify adapter, and SHALL `await app.getHttpAdapter().getInstance().ready()` (or equivalent) before issuing HTTP traffic. No integration spec SHALL import `NestExpressApplication` or the pre-migration `configureExpressApp` helper.

#### Scenario: No spec imports Express types

- **WHEN** `apps/server/test/` is searched for imports from `@nestjs/platform-express` or `../src/configure-express-app`
- **THEN** zero matches SHALL be found

#### Scenario: Specs await Fastify readiness before HTTP

- **WHEN** `apps/server/test/*.integration-spec.ts` is inspected after this change lands
- **THEN** each spec that issues HTTP requests via `supertest(app.getHttpServer())` SHALL first `await app.getHttpAdapter().getInstance().ready()` after `app.init()`

### Requirement: Documentation and agent rules reflect the Fastify/Mercurius defaults

`docs/ARCHITECTURE.md`, `.cursor/rules/architecture.mdc`, and `AGENTS.md` SHALL each state that the server runtime is NestJS on Fastify with Mercurius as the GraphQL driver, wherever Express or Apollo is currently named. The Transport decision table in `docs/ARCHITECTURE.md` SHALL continue to list exactly the same endpoints with the same status values — this requirement does not touch `api-transport-policy`.

#### Scenario: Platform defaults are named correctly

- **WHEN** `docs/ARCHITECTURE.md`, `.cursor/rules/architecture.mdc`, and `AGENTS.md` are read after this change lands
- **THEN** none of them SHALL name Express or Apollo as the platform default for the server runtime
- **AND** each SHALL name Fastify (HTTP adapter) and Mercurius (GraphQL driver) where the platform is discussed
