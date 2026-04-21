# graphql-operator-bff Specification

## Purpose
TBD - created by archiving change p2-graphql-bff-expansion. Update Purpose after archive.
## Requirements
### Requirement: GraphQL exposes `effectiveSettings` query with field metadata and resolved adapter labels

The GraphQL server SHALL expose an `effectiveSettings` query on the root `Query` type returning the effective operator settings payload equivalent to the current `/api/ui/settings-meta` shape consumed by the Settings screen. The returned type SHALL include: (a) per-field metadata — `key`, `label`, `value`, `envVar` (the `VIBE_SQUIRE_*` environment variable that overrides it when present), and `description` where the pre-split UI surfaced one; (b) the top-level booleans `scheduledSyncEnabled` and `autoCreateIssues`; (c) `resolvedSourceLabel` and `resolvedDestinationLabel` derived from the current process configuration so the "Sync adapters" info card can render without hard-coding strings on the client. The resolver SHALL delegate to existing settings application services (`apps/server/src/settings/`) and MUST NOT access Prisma or integration adapters directly.

#### Scenario: Query returns metadata parity with `/api/ui/settings-meta`

- **WHEN** a client issues `query { effectiveSettings { coreFields { key label value envVar description } scheduledSyncEnabled autoCreateIssues resolvedSourceLabel resolvedDestinationLabel } }` and the same server state is queried via the legacy REST `/api/ui/settings-meta` endpoint
- **THEN** overlapping field values (labels, keys, current values, `scheduledSyncEnabled`, `autoCreateIssues`) SHALL match between GraphQL and REST responses

#### Scenario: Resolved adapter labels reflect the current process

- **WHEN** the GraphQL server runs with `VIBE_SQUIRE_SOURCE_TYPE=github` and `VIBE_SQUIRE_DESTINATION_TYPE=vibe_kanban`
- **THEN** `effectiveSettings.resolvedSourceLabel` and `resolvedDestinationLabel` SHALL be the human-readable labels (e.g. "GitHub" / "Vibe Kanban") used by the pre-split Settings "Sync adapters" info card

### Requirement: GraphQL exposes `mappings` query listing repository-to-project mappings

The GraphQL server SHALL expose a `mappings` query (non-null list or connection per implementation choice documented in the PR) returning all mappings the operator UI can list today via REST. Each mapping entity exposed to the client SHALL include a stable `id` suitable for Apollo normalization. The resolver SHALL use the existing mappings module services.

#### Scenario: Listed mappings match REST list

- **WHEN** a client queries `mappings` and the REST mappings list endpoint is called for the same state
- **THEN** the set of mapping identities and their display fields SHALL correspond between the two responses

### Requirement: GraphQL exposes `activityFeed` as a forward cursor connection with per-run item detail

The GraphQL server SHALL expose `activityFeed` on `Query` using a Relay-style connection shape (`edges`, `pageInfo` with `endCursor` and `hasNextPage`, `nodes` or `edges.node` per schema choice) with an argument to bound page size (e.g. `first` or `limit` mapped internally). Ordering SHALL be stable for append-only activity (newest-first unless the REST UI today implies otherwise, in which case match the REST ordering). The resolver SHALL reuse the same data assembly path as `apps/server/src/ui/activity-api.controller.ts` logic, refactored into a callable service if needed.

Each node (`ActivityRun`) SHALL expose at minimum `id`, `startedAt`, `completedAt`, `status`, aggregate counts (`candidatesCount`, `issuesCreated`, `skippedUnmapped`), and a nested `items` list. Each `ActivityItem` SHALL expose fields required by the restored Activity page: stable `id` (or `prUrl` key), `prNumber`, `prUrl`, `prTitle`, `authorLogin`, `githubRepo`, `decision`, `decisionLabel`, `effectiveDecision`, `detail`, and `kanbanIssueId`. Enumerated fields (`decision`, `effectiveDecision`, run `status`) SHALL be GraphQL enums matching the existing Zod contracts in `@vibe-squire/shared`.

#### Scenario: First page returns recent activity runs with items

- **WHEN** a client requests the first page of `activityFeed` with a reasonable page size and selects `items { prNumber decisionLabel effectiveDecision kanbanIssueId }`
- **THEN** the response SHALL include `pageInfo` and run nodes with items whose values match the current REST activity feed for the same state

#### Scenario: Second page uses opaque cursor

- **WHEN** a client requests `activityFeed` with the cursor returned in `pageInfo.endCursor` from a prior page
- **THEN** the server SHALL return the next slice without duplicating runs from the prior page

#### Scenario: Enumerated decision fields are GraphQL enums

- **WHEN** the emitted SDL is inspected
- **THEN** `ActivityItem.decision`, `ActivityItem.effectiveDecision`, and `ActivityRun.status` SHALL each be named GraphQL `enum` types with members matching the Zod enums used by the existing REST response

### Requirement: GraphQL exposes `integrationNav` aggregated navigation

The GraphQL server SHALL expose an `integrationNav` query returning the aggregated per-integration navigation structure currently produced by `apps/server/src/ui/ui-nav.service.ts` (or successor), shaped as GraphQL object types sufficient for the operator header/side nav consumption.

#### Scenario: Nav payload matches REST aggregation

- **WHEN** the client queries `integrationNav` and compares to the existing REST UI nav response
- **THEN** entries and labels/routes needed by the web nav SHALL be present with the same routing targets the React app used before migration

### Requirement: GraphQL exposes `dashboardSetup` query mirroring `GET /api/ui/setup`

The GraphQL server SHALL expose a `dashboardSetup` query on the root `Query` type returning the same logical payload as the existing `GET /api/ui/setup` REST endpoint consumed by the dashboard setup checklist: the setup evaluation booleans/state, the ordered checklist rows, and the per-reason human-readable messages currently sourced from `SETUP_REASON_MESSAGES`. The resolver SHALL delegate to `SetupEvaluationService` (and `buildSetupChecklist` / `SETUP_REASON_MESSAGES`) used by the REST path and MUST NOT access Prisma or integration adapters directly.

#### Scenario: Query returns parity with `/api/ui/setup`

- **WHEN** a client issues `query { dashboardSetup { /* evaluation, checklist, reasonMessages */ } }` and the same server state is queried via the legacy REST `/api/ui/setup` endpoint
- **THEN** the evaluation fields, checklist rows (order + copy + links), and per-reason messages SHALL match between GraphQL and REST responses

#### Scenario: Dashboard refetches `dashboardSetup` after sync or reinit

- **WHEN** the web dashboard consumes `dashboardSetup` alongside `status` / `statusUpdated`
- **THEN** a successful `triggerSync` or `reinitIntegration` mutation SHALL cause `dashboardSetup` to refetch (or receive a cache-invalidating signal) so the checklist reflects the new server state without a page reload

### Requirement: GraphQL exposes settings and mapping mutations with REST-parity results

The GraphQL server SHALL expose mutations `updateSettings`, `upsertMapping`, `updateMapping`, and `deleteMapping` whose inputs validate with the same Zod contracts as the REST handlers and whose success payloads echo the REST shapes closely enough for the web client to swap transports without bespoke mapping layers. `updateMapping(id: ID!, input: UpdateMappingInput!)` SHALL correspond to `PATCH /api/mappings/:id` semantics used by the restored inline row-edit UX; `upsertMapping(input: UpsertMappingInput!)` SHALL correspond to `POST /api/mappings` (create, or update when a matching identity exists per current REST semantics).

#### Scenario: Settings mutation persists and returns updated effective settings

- **WHEN** a client calls `updateSettings` with a valid patch matching the Zod contract
- **THEN** persisted settings SHALL match the behaviour of the REST PATCH handler and the response SHALL expose the fields the settings screen needs to refresh local state

#### Scenario: Mapping upsert, update, and delete mutate backing store like REST

- **WHEN** a client calls `upsertMapping` followed by `mappings`
- **THEN** the created row SHALL appear in `mappings`
- **AND WHEN** `updateMapping` is called against an existing id with a modified `label`
- **THEN** the returned row SHALL reflect the new `label` and a subsequent `mappings` query SHALL show the same update
- **AND WHEN** `deleteMapping` is called with that id
- **THEN** subsequent `mappings` queries SHALL not return the deleted mapping

### Requirement: GraphQL exposes triage mutations mirroring `/api/triage/*`

The GraphQL server SHALL expose `acceptTriage(prUrl: String!)`, `declineTriage(prUrl: String!)`, and `reconsiderTriage(prUrl: String!)` mutations bound to the same application logic (`apps/server/src/sync/pr-triage.service.ts` and related) as the existing REST `/api/triage/*` endpoints. Inputs and return payloads SHALL share Zod validation semantics with the REST path and return enough information (updated `ActivityItem` or equivalent) for the Apollo cache to update the affected row without a full refetch.

#### Scenario: Accepting a triage item transitions its decision

- **WHEN** a triageable item is visible via `activityFeed` and a client calls `acceptTriage(prUrl: <url>)`
- **THEN** the server SHALL transition the item the same way the REST `/api/triage/accept` path does (e.g. to `linked_existing` / non-triageable state)
- **AND** the mutation payload SHALL carry the updated item (or a reference sufficient for cache merging)

#### Scenario: Declining and reconsidering a triage item round-trips

- **WHEN** a client calls `declineTriage` against a triageable item
- **THEN** the item's `effectiveDecision` SHALL become `skipped_declined`
- **AND WHEN** `reconsiderTriage` is called against the same item
- **THEN** the item SHALL return to a triageable state (e.g. `skipped_triage`)

### Requirement: GraphQL exposes sync control mutations

The GraphQL server SHALL expose `triggerSync` and `reinitIntegration` mutations that invoke the same application flows as the existing sync endpoints in `apps/server/src/sync/` (manual run and reinit). Authorization and error semantics SHALL match REST behaviour.

#### Scenario: Manual sync mutation triggers a run

- **WHEN** an authorised client calls `triggerSync` under the same preconditions where REST accepts a manual run
- **THEN** the server SHALL start the same sync workflow as the REST command

### Requirement: GraphQL exposes `activityEvents` subscription (no client polling)

The GraphQL server SHALL expose a `Subscription.activityEvents` field delivered over the existing `graphql-ws` transport, bridged from the same domain event sources as `statusUpdated` (sync start/end, poll-run completion, triage decisions) plus any additional emit site added inside the sync/triage flows to cover per-item transitions. Each payload SHALL carry enough data for the Apollo cache to update affected `ActivityRun` or `ActivityItem` nodes (either the changed node(s) by id or a connection-level invalidation signal — choice documented in the PR). The subscription MUST NOT be deferred — it is the required source of live activity updates and the web client SHALL NOT use interval polling for activity data.

#### Scenario: Subscription delivers after a new sync run completes

- **WHEN** a `graphql-ws` client subscribes to `subscription { activityEvents { /* shipped payload */ } }`
- **AND** a sync run completes (or the equivalent existing signal fires)
- **THEN** the subscriber SHALL receive at least one payload that allows the client to update its cached view of `activityFeed` without a full refetch

#### Scenario: Subscription delivers after a triage mutation

- **WHEN** a subscriber is active and a client calls `acceptTriage`, `declineTriage`, or `reconsiderTriage`
- **THEN** the subscriber SHALL receive a payload that reflects the updated item (or carries a signal that triggers the client to merge its cache) within the integration-test timeout

### Requirement: Integration tests cover new resolvers and the subscription

For each new query (including `dashboardSetup`), mutation, and the `activityEvents` subscription, the server integration suite under `apps/server/test/` SHALL contain tests asserting success paths and at least one representative validation or error path mirroring REST tests where applicable. The subscription test SHALL subscribe via `graphql-ws`, trigger a domain signal (completed run or triage mutation), and assert a payload is received.

#### Scenario: Resolver and subscription tests pass in CI

- **WHEN** the server test command runs for `apps/server`
- **THEN** all new GraphQL integration tests — queries (including `dashboardSetup` parity with `/api/ui/setup`), mutations, and the `activityEvents` subscription — SHALL pass alongside unchanged REST tests

