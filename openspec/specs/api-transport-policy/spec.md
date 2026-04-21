# api-transport-policy Specification

## Purpose
TBD - created by archiving change graphql-rest-sse-sunset. Update Purpose after archive.
## Requirements
### Requirement: GraphQL is the sole operator-console transport

The server SHALL treat GraphQL (`POST /graphql` plus `graphql-ws` subscriptions) as the only transport for operator-console reads, writes, and subscriptions. A new or modified operator-console capability (status, settings, mappings, activity, triage, dashboard setup, integration nav, GitHub integration fields, Vibe Kanban context, source/destination settings, sync control) MUST be implemented as a GraphQL query, mutation, or subscription. A REST or SSE handler MUST NOT be added for such a capability unless the `docs/ARCHITECTURE.md` transport decision table contains a row justifying it as an operator tool (see "Transport decision table" requirement below).

#### Scenario: Adding a new operator-console read uses GraphQL

- **WHEN** a contributor adds a new operator-console read (e.g. "list disabled integrations")
- **THEN** the handler SHALL be a GraphQL resolver on the root `Query` type
- **AND** no new `@Controller('api/...')` HTTP GET SHALL be added for the same read

#### Scenario: Adding a new operator-console event uses GraphQL subscriptions

- **WHEN** a contributor adds a new operator-console live event (e.g. "mapping created")
- **THEN** the handler SHALL be a GraphQL `Subscription.*` field delivered over the existing `graphql-ws` transport
- **AND** no new `@Sse` endpoint SHALL be added for the same event stream

#### Scenario: Adding a new operator-console mutation uses GraphQL

- **WHEN** a contributor adds a new operator-console write (e.g. "disable an integration")
- **THEN** the handler SHALL be a GraphQL resolver on the root `Mutation` type
- **AND** no new `@Post` / `@Patch` / `@Delete` REST handler SHALL be added for the same write

### Requirement: `docs/ARCHITECTURE.md` publishes the Transport decision table

`docs/ARCHITECTURE.md` SHALL contain a top-level section titled `## Transport decision table` listing every HTTP endpoint under `/api/*` that existed before this change or has been introduced since, including the SSE endpoint `GET /api/status/stream`. Each row SHALL record the HTTP method, the full path, exactly one status value from the enum `removed | kept (operator tool)`, and a one-sentence justification. The enum SHALL NOT contain any other status value — in particular, no `kept (REST)` category SHALL exist. Rows SHALL be sorted by path. When a REST endpoint is added, removed, or reclassified, the table SHALL be updated in the same commit as the code change.

#### Scenario: Status enum is exactly two values

- **WHEN** the transport decision table is inspected
- **THEN** every row's Status column value SHALL be either `removed` or `kept (operator tool)`
- **AND** no row SHALL carry any other status string

#### Scenario: Every retired endpoint has a `removed` row

- **WHEN** the transport decision table is inspected after this change lands
- **THEN** `GET /api/status`, `GET /api/status/stream`, and every other REST endpoint deleted by this change SHALL appear as rows with status `removed` and a one-sentence justification referencing the GraphQL operation that supersedes them

#### Scenario: Only operator-tool endpoints have a `kept (operator tool)` row

- **WHEN** the transport decision table is inspected after this change lands
- **THEN** the rows with status `kept (operator tool)` SHALL be exactly `POST /api/sync/run` and `POST /api/reinit`
- **AND** each justification SHALL name a concrete `curl` / `gh` / shell-script use case

#### Scenario: Adding a new REST endpoint requires a table row and an operator-tool justification

- **WHEN** a contributor adds a new `@Controller` handler under `/api/*` in a subsequent change
- **THEN** the same commit SHALL add a row to the transport decision table with status `kept (operator tool)` and a one-sentence justification naming the curl/gh/shell-script use case that makes it worth exposing over HTTP

### Requirement: SSE and REST duplicates of a live GraphQL operation are not retained

The server SHALL NOT expose a REST or SSE endpoint that duplicates a live GraphQL query, mutation, or subscription. `@Sse` handlers SHALL NOT be used for any transport that a GraphQL subscription already covers; SSE is reserved for future non-GraphQL use cases only and requires its own `kept (operator tool)` decision-table entry.

#### Scenario: Status SSE handler is absent

- **WHEN** `apps/server/src/status/status.controller.ts` is inspected (or the file is confirmed deleted) after this change lands
- **THEN** no `@Sse('stream')` handler or equivalent SSE route SHALL be present anywhere in `apps/server/src`

#### Scenario: No retained REST handler shadows a live GraphQL operation

- **WHEN** `apps/server/src/` is searched for `@Get(`, `@Post(`, `@Patch(`, or `@Delete(` handlers after this change lands
- **THEN** the only surviving handlers SHALL be `POST /api/sync/run` and `POST /api/reinit`
- **AND** no handler SHALL duplicate a live GraphQL query (`status`, `effectiveSettings`, `mappings`, `activityFeed`, `integrationNav`, `dashboardSetup`, `githubFields`, `vibeKanbanUiState`, `vibeKanbanOrganizations`, `vibeKanbanProjects`, `vibeKanbanRepos`) or mutation (`updateSettings`, `upsertMapping`, `deleteMapping`, `acceptTriage`, `declineTriage`, `reconsiderTriage`, `updateSourceSettings`, `updateDestinationSettings`)

### Requirement: Web client contains no REST data-loading helper

The web client SHALL NOT contain a generic REST fetch helper. `apps/web/src/api.ts` (and any equivalent `apiJson` export) SHALL be deleted. Any HTTP request from `apps/web/src/` for operator-console data SHALL be issued by Apollo (via `useQuery`, `useMutation`, `useSubscription`, or the imperative client). The only exceptions permitted are direct calls to the two operator-tool POSTs listed in the decision table, and even those SHALL NOT reintroduce a helper module — inline `fetch` at the call site if ever needed.

#### Scenario: `apiJson` and `apps/web/src/api.ts` are absent

- **WHEN** `apps/web/src/` is searched after this change lands
- **THEN** no file named `api.ts` (or equivalent) exporting a generic REST helper SHALL exist
- **AND** no source file SHALL export or import an identifier named `apiJson`

#### Scenario: No source file fetches `/api/*` outside the operator-tool endpoints

- **WHEN** `apps/web/src/` is grepped for `fetch('/api/` or `fetch("/api/` or string-template equivalents targeting `/api/`
- **THEN** zero matches SHALL be found, except at most direct `fetch` calls to `/api/sync/run` or `/api/reinit` from page-level code that is not a shared helper

### Requirement: `AGENTS.md` and `.cursor/rules/architecture.mdc` reflect the transport policy

`AGENTS.md` and `.cursor/rules/architecture.mdc` SHALL each state that GraphQL (`/graphql` plus `graphql-ws` subscriptions) is the sole operator-console transport, that `POST /api/sync/run` and `POST /api/reinit` are retained as operator tools, and SHALL link to the transport decision table in `docs/ARCHITECTURE.md` as the source of truth for the REST surface.

#### Scenario: Agent-facing rules direct contributors to the decision table

- **WHEN** `AGENTS.md` or `.cursor/rules/architecture.mdc` is read after this change lands
- **THEN** each document SHALL name `/graphql` and `graphql-ws` as the sole operator-console transports
- **AND** SHALL name `POST /api/sync/run` and `POST /api/reinit` as the retained operator-tool endpoints
- **AND** SHALL reference the `docs/ARCHITECTURE.md` transport decision table as the authoritative list

### Requirement: Integration tests for removed endpoints are deleted, not skipped

When an endpoint's row becomes `removed`, every integration test under `apps/server/test/` whose sole target is that endpoint SHALL be deleted in the same commit as the handler. Tests MUST NOT be left in a `.skip` state, stubbed as no-ops, or rewritten to assert 404. GraphQL integration specs introduced by P2.2–P2.4 (plus the new resolver specs added by this change) remain the authoritative coverage for the retired behaviour.

#### Scenario: No test file targets a removed endpoint

- **WHEN** `apps/server/test/` is searched for references to a path whose decision-table row is `removed`
- **THEN** no spec file SHALL hit that path
- **AND** no spec file SHALL be marked `.skip` pending cleanup
- **AND** no spec file SHALL assert the endpoint returns 404

### Requirement: Controller files and DTO folders for retired surface are deleted

When every handler in a controller is retired, the controller file SHALL be deleted entirely (not left as an empty class) and SHALL be unregistered from its enclosing Nest module in the same commit. DTO folders (e.g. `apps/server/src/ui/dto/`, `apps/server/src/mappings/dto/`, `apps/server/src/settings/dto/`, `apps/server/src/vibe-kanban/` DTO equivalents) whose only consumers were removed handlers SHALL be deleted entirely.

#### Scenario: Removed controllers are absent from the tree

- **WHEN** `apps/server/src/` is inspected after this change lands
- **THEN** `apps/server/src/ui/operator-bff.controller.ts`, `apps/server/src/ui/activity-api.controller.ts`, and `apps/server/src/vibe-kanban/vibe-kanban-context.controller.ts` SHALL NOT exist
- **AND** `apps/server/src/status/status.controller.ts`, `apps/server/src/settings/settings.controller.ts`, and `apps/server/src/mappings/mappings.controller.ts` SHALL either not exist or contain zero `@Get`/`@Post`/`@Patch`/`@Delete`/`@Sse` handlers (and in the zero-handlers case SHALL have been deleted)

#### Scenario: Nest modules no longer register removed controllers

- **WHEN** the Nest module files enclosing removed controllers are inspected after this change lands
- **THEN** no `controllers: [...]` array SHALL reference a deleted controller class

### Requirement: `nestjs-zod`, `class-validator`, and `class-transformer` are removed

`apps/server/package.json` SHALL NOT list `nestjs-zod`, `class-validator`, or `class-transformer` as runtime dependencies after this change lands. No source file under `apps/server/src/` SHALL import from any of these packages. `@nestjs/swagger` MAY remain only if the surviving operator-tool endpoints use it; otherwise it SHALL also be removed.

#### Scenario: Retired deps are absent from package.json

- **WHEN** `apps/server/package.json` is inspected after this change lands
- **THEN** the `dependencies` and `devDependencies` maps SHALL NOT contain `nestjs-zod`, `class-validator`, or `class-transformer`

#### Scenario: No source file imports retired deps

- **WHEN** `apps/server/src/` is grepped for imports from `nestjs-zod`, `class-validator`, or `class-transformer`
- **THEN** zero matches SHALL be found

