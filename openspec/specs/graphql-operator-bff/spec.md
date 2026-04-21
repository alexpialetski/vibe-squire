# graphql-operator-bff Specification

## Purpose
TBD - created by archiving change p2-graphql-bff-expansion. Update Purpose after archive.
## Requirements
### Requirement: GraphQL exposes `effectiveSettings` query with field metadata and resolved adapter labels

The GraphQL server SHALL expose an `effectiveSettings` query on the root `Query` type returning the effective operator settings payload whose shape was previously served by the `/api/ui/settings-meta` REST endpoint (now removed per this change). The returned type SHALL include: (a) per-field metadata — `key`, `label`, `value`, `envVar` (the `VIBE_SQUIRE_*` environment variable that overrides it when present), and `description` where the pre-split UI surfaced one; (b) the top-level booleans `scheduledSyncEnabled` and `autoCreateIssues`; (c) `resolvedSourceLabel` and `resolvedDestinationLabel` derived from the current process configuration so the "Sync adapters" info card can render without hard-coding strings on the client. The resolver SHALL delegate to existing settings application services (`apps/server/src/settings/`) and MUST NOT access Prisma or integration adapters directly.

#### Scenario: Query matches the archived `/api/ui/settings-meta` contract

- **WHEN** a client issues `query { effectiveSettings { coreFields { key label value envVar description } scheduledSyncEnabled autoCreateIssues resolvedSourceLabel resolvedDestinationLabel } }`
- **THEN** the response SHALL match the field-level payload that the archived `/api/ui/settings-meta` REST endpoint returned for the same server state, as captured by the P2.4 archived spec (`openspec/changes/archive/2026-04-20-p2-graphql-bff-expansion/`) and the remaining GraphQL integration tests

#### Scenario: Resolved adapter labels reflect the current process

- **WHEN** the GraphQL server runs with `VIBE_SQUIRE_SOURCE_TYPE=github` and `VIBE_SQUIRE_DESTINATION_TYPE=vibe_kanban`
- **THEN** `effectiveSettings.resolvedSourceLabel` and `resolvedDestinationLabel` SHALL be the human-readable labels (e.g. "GitHub" / "Vibe Kanban") used by the pre-split Settings "Sync adapters" info card

### Requirement: GraphQL exposes `mappings` query listing repository-to-project mappings

The GraphQL server SHALL expose a `mappings` query (non-null list or connection per implementation choice documented in the PR) returning all `RepoProjectMapping` entries the operator UI renders. Each mapping entity exposed to the client SHALL include a stable `id` suitable for Apollo normalization. The resolver SHALL use the existing mappings module services.

#### Scenario: Listed mappings reflect the backing store

- **WHEN** a client queries `mappings` against a server with `N` `RepoProjectMapping` rows persisted
- **THEN** the response SHALL contain exactly `N` mapping entities whose `id`, `owner`, `repo`, and `kanbanProjectId` correspond one-to-one to the persisted rows
- **AND** each entity SHALL carry a stable `id` reused on subsequent queries so Apollo cache normalization works across refetches and mutations

### Requirement: GraphQL exposes `activityFeed` as a forward cursor connection with per-run item detail

The GraphQL server SHALL expose `activityFeed` on `Query` using a Relay-style connection shape (`edges`, `pageInfo` with `endCursor` and `hasNextPage`, `nodes` or `edges.node` per schema choice) with an argument to bound page size (e.g. `first` or `limit` mapped internally). Ordering SHALL be stable for append-only activity (newest-first unless the archived P2.4 contract implies otherwise, in which case match the archived ordering). The resolver SHALL reuse the same data assembly path as the historic `apps/server/src/ui/activity-api.controller.ts` logic, refactored into a callable service as needed.

Each node (`ActivityRun`) SHALL expose at minimum `id`, `startedAt`, `completedAt`, `status`, aggregate counts (`candidatesCount`, `issuesCreated`, `skippedUnmapped`), and a nested `items` list. Each `ActivityItem` SHALL expose fields required by the restored Activity page: stable `id` (or `prUrl` key), `prNumber`, `prUrl`, `prTitle`, `authorLogin`, `githubRepo`, `decision`, `decisionLabel`, `effectiveDecision`, `detail`, and `kanbanIssueId`. Enumerated fields (`decision`, `effectiveDecision`, run `status`) SHALL be GraphQL enums matching the existing Zod contracts in `@vibe-squire/shared`.

#### Scenario: First page returns recent activity runs with items

- **WHEN** a client requests the first page of `activityFeed` with a reasonable page size and selects `items { prNumber decisionLabel effectiveDecision kanbanIssueId }`
- **THEN** the response SHALL include `pageInfo` and run nodes with items whose values correspond to the current `PollRun` / `SyncedPullRequest` rows in the backing store, and whose shape matches the archived P2.4 activity payload (`openspec/changes/archive/2026-04-20-p2-graphql-bff-expansion/`)

#### Scenario: Second page uses opaque cursor

- **WHEN** a client requests `activityFeed` with the cursor returned in `pageInfo.endCursor` from a prior page
- **THEN** the server SHALL return the next slice without duplicating runs from the prior page

#### Scenario: Enumerated decision fields are GraphQL enums

- **WHEN** the emitted SDL is inspected
- **THEN** `ActivityItem.decision`, `ActivityItem.effectiveDecision`, and `ActivityRun.status` SHALL each be named GraphQL `enum` types with members matching the Zod enums in `@vibe-squire/shared`

### Requirement: GraphQL exposes `integrationNav` aggregated navigation

The GraphQL server SHALL expose an `integrationNav` query returning the aggregated per-integration navigation structure produced by `apps/server/src/ui/ui-nav.service.ts` (or successor), shaped as GraphQL object types sufficient for the operator header/side nav consumption.

#### Scenario: Nav payload matches the UiNav service output

- **WHEN** the client queries `integrationNav`
- **THEN** the entries, labels, and route targets in the response SHALL equal those produced by `UiNavService.getEntries()` (or its successor) for the same server state, as asserted by the GraphQL integration test suite

### Requirement: GraphQL exposes `dashboardSetup` query mirroring the archived setup checklist contract

The GraphQL server SHALL expose a `dashboardSetup` query on the root `Query` type returning the logical payload whose shape was previously served by the `GET /api/ui/setup` REST endpoint (now removed): the setup evaluation booleans/state, the ordered checklist rows, and the per-reason human-readable messages currently sourced from `SETUP_REASON_MESSAGES`. The resolver SHALL delegate to `SetupEvaluationService` (and `buildSetupChecklist` / `SETUP_REASON_MESSAGES`) and MUST NOT access Prisma or integration adapters directly.

#### Scenario: Query matches the archived `/api/ui/setup` contract

- **WHEN** a client issues `query { dashboardSetup { /* evaluation, checklist, reasonMessages */ } }`
- **THEN** the evaluation fields, checklist rows (order + copy + links), and per-reason messages SHALL match the payload shape captured by the P2.4 archived spec (`openspec/changes/archive/2026-04-20-p2-graphql-bff-expansion/specs/graphql-operator-bff/spec.md`) and the remaining GraphQL integration tests under `apps/server/test/`

#### Scenario: Dashboard refetches `dashboardSetup` after sync or reinit

- **WHEN** the web dashboard consumes `dashboardSetup` alongside `status` / `statusUpdated`
- **THEN** a successful `triggerSync` or `reinitIntegration` mutation SHALL cause `dashboardSetup` to refetch (or receive a cache-invalidating signal) so the checklist reflects the new server state without a page reload

### Requirement: GraphQL exposes settings and mapping mutations with REST-parity results

The GraphQL server SHALL expose mutations `updateSettings`, `upsertMapping`, and `deleteMapping` whose inputs validate with the same Zod contracts as the REST handlers and whose success payloads echo the REST shapes closely enough for the web client to swap transports without bespoke mapping layers. `upsertMapping(input: UpsertMappingInput!)` SHALL correspond to `POST /api/mappings` semantics.

#### Scenario: Settings mutation persists and returns updated effective settings

- **WHEN** a client calls `updateSettings` with a valid patch matching the Zod contract
- **THEN** persisted settings SHALL match the behaviour of the REST PATCH handler and the response SHALL expose the fields the settings screen needs to refresh local state

#### Scenario: Mapping create and delete mutate backing store like REST

- **WHEN** a client calls `upsertMapping` followed by `mappings`
- **THEN** the created row SHALL appear in `mappings`
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

For each query (including `dashboardSetup`, `githubFields`, `vibeKanbanUiState`, `vibeKanbanOrganizations`, `vibeKanbanProjects`, `vibeKanbanRepos`), mutation (including `updateSourceSettings` and `updateDestinationSettings`), and the `activityEvents` subscription, the server integration suite under `apps/server/test/` SHALL contain tests asserting success paths and at least one representative validation or error path. The subscription test SHALL subscribe via `graphql-ws`, trigger a domain signal (completed run or triage mutation), and assert a payload is received. Integration tests whose sole target was a REST/SSE endpoint recorded as `removed` in the `docs/ARCHITECTURE.md` transport decision table SHALL be deleted in the same commit as their handler; no `.skip`ed or no-op REST tests are retained.

#### Scenario: Resolver and subscription tests pass in CI

- **WHEN** the server test command runs for `apps/server`
- **THEN** all GraphQL integration tests — queries (including `dashboardSetup`, `githubFields`, and the four Vibe Kanban context queries), mutations (including `updateSourceSettings` and `updateDestinationSettings`), and the `activityEvents` subscription — SHALL pass
- **AND** the only remaining REST integration tests SHALL correspond to `POST /api/sync/run` and `POST /api/reinit`

### Requirement: GraphQL exposes `githubFields` query for the GitHub integration settings page

The GraphQL server SHALL expose a `githubFields` query on the root `Query` type returning the logical payload previously served by `GET /api/ui/github-fields` (now removed per this change). The response SHALL include `disabled: Boolean!` (true when `AppEnv.sourceType !== 'github'`) and `fields: [GithubField!]!` where each `GithubField` includes `key`, `label`, `value`, and any additional fields enumerated by the Zod `githubFieldsResponseSchema` in `@vibe-squire/shared`. The resolver SHALL delegate to existing settings application services (`SettingsService.listEffectiveNonSecret()` plus `integrationFieldsForUi(GITHUB_SOURCE_UI_KEYS, values)`) and MUST NOT access Prisma or integration adapters directly.

#### Scenario: Query returns disabled payload when source is not GitHub

- **WHEN** the server runs with `VIBE_SQUIRE_SOURCE_TYPE` set to anything other than `github`
- **AND** a client issues `query { githubFields { disabled fields { key label value } } }`
- **THEN** the response SHALL contain `disabled: true` and `fields: []`

#### Scenario: Query returns enabled fields when GitHub source is active

- **WHEN** the server runs with `VIBE_SQUIRE_SOURCE_TYPE=github`
- **AND** a client issues `query { githubFields { disabled fields { key label value } } }`
- **THEN** the response SHALL contain `disabled: false`
- **AND** `fields` SHALL contain one entry per `GITHUB_SOURCE_UI_KEYS` key, each with the current effective non-secret value from `SettingsService`

### Requirement: GraphQL exposes `vibeKanbanUiState` query for the Vibe Kanban settings page

The GraphQL server SHALL expose a `vibeKanbanUiState` query on the root `Query` type returning the payload previously served by `GET /api/vibe-kanban/ui-state` (now removed per this change). The response type SHALL match the shape of the Zod `vibeKanbanUiStateSchema` in `@vibe-squire/shared` — including the board picker state, destination-configured flag, VK labels, executor options, and any aggregated fields the Vibe Kanban settings page consumes. The resolver SHALL reuse `buildVibeKanbanPageLocals` (refactored into a callable service if needed) and delegate to `SettingsService`, `SetupEvaluationService`, and `UiNavService`. The resolver SHALL be gated by the same "Vibe Kanban destination active" precondition that the retired REST `VibeKanbanDestinationConfiguredGuard` enforced, surfaced as a GraphQL error when the destination is inactive.

#### Scenario: Query returns UI state when destination is Vibe Kanban

- **WHEN** the server runs with `VIBE_SQUIRE_DESTINATION_TYPE=vibe_kanban`
- **AND** a client issues `query { vibeKanbanUiState { vkBoardPicker boardOrg boardProj kanbanDoneStatus vkExecutor executorOptions { value label } vkLabels { default_organization_id kanban_done_status vk_workspace_executor } } }`
- **THEN** the response SHALL contain values equal to `buildVibeKanbanPageLocals` for the same server state

#### Scenario: Query returns a GraphQL error when destination is not active

- **WHEN** the server runs with a non-Vibe-Kanban destination
- **AND** a client issues the `vibeKanbanUiState` query
- **THEN** the response SHALL contain a GraphQL error carrying the same "Vibe Kanban destination not active" semantics that `VibeKanbanDestinationConfiguredGuard` surfaced over REST

### Requirement: GraphQL exposes `vibeKanbanOrganizations`, `vibeKanbanProjects`, and `vibeKanbanRepos` queries

The GraphQL server SHALL expose three Vibe Kanban context queries on the root `Query` type, each bound to `VibeKanbanBoardService` and gated by the "Vibe Kanban destination active" precondition:

- `vibeKanbanOrganizations: [VibeKanbanOrganization!]!` — delegates to `VibeKanbanBoardService.listOrganizations()`.
- `vibeKanbanProjects(organizationId: ID!): [VibeKanbanProject!]!` — delegates to `VibeKanbanBoardService.listProjects(organizationId)`.
- `vibeKanbanRepos: [VibeKanbanRepo!]!` — delegates to `VibeKanbanBoardService.listRepos()`.

Each object type SHALL expose at minimum `id: ID!` and `name: String` (nullable to match the backing Vibe Kanban payload). These queries replace the REST endpoints `GET /api/vibe-kanban/organizations`, `GET /api/vibe-kanban/projects?organization_id=…`, and `GET /api/vibe-kanban/repos` (now removed per this change).

#### Scenario: `vibeKanbanOrganizations` returns the list from `VibeKanbanBoardService`

- **WHEN** a client issues `query { vibeKanbanOrganizations { id name } }`
- **AND** `VibeKanbanBoardService.listOrganizations()` returns `N` organizations for the current server state
- **THEN** the response SHALL contain exactly `N` entries whose `id` and `name` correspond one-to-one to that service output

#### Scenario: `vibeKanbanProjects` requires `organizationId` and returns projects for that org

- **WHEN** a client issues `query { vibeKanbanProjects(organizationId: "ORG-1") { id name } }`
- **THEN** the response SHALL contain entries equal to `VibeKanbanBoardService.listProjects("ORG-1")`

#### Scenario: All three queries error when destination is not active

- **WHEN** the server runs with a non-Vibe-Kanban destination
- **AND** a client issues any of `vibeKanbanOrganizations`, `vibeKanbanProjects`, or `vibeKanbanRepos`
- **THEN** the response SHALL carry a GraphQL error matching the "Vibe Kanban destination not active" semantics of the retired REST guard

### Requirement: GraphQL exposes `updateSourceSettings` and `updateDestinationSettings` mutations

The GraphQL server SHALL expose two mutations on the root `Mutation` type, each bound to `SettingsService.applyGroupPatch(groupId, body)`:

- `updateSourceSettings(input: UpdateSourceSettingsInput!): EffectiveSettings!` — `groupId = 'source'`. Replaces `PATCH /api/settings/source`.
- `updateDestinationSettings(input: UpdateDestinationSettingsInput!): EffectiveSettings!` — `groupId = 'destination'`. Replaces `PATCH /api/settings/destination`.

Both mutations SHALL return the updated `EffectiveSettings` payload (the same object type returned by the `effectiveSettings` query) so Apollo's normalized cache refreshes the settings page without an explicit refetch. Input validation SHALL go through the same Zod contracts the REST `patchSource` / `patchDestination` handlers used (the `PATCH_SETTINGS_SCHEMA`-driven application logic in `SettingsService.applyGroupPatch`).

#### Scenario: `updateSourceSettings` persists the patch and returns updated settings

- **WHEN** a client calls `mutation { updateSourceSettings(input: { github_app_private_key: "…" }) { coreFields { key value } } }`
- **THEN** `SettingsService.applyGroupPatch('source', { github_app_private_key: "…" })` SHALL be invoked
- **AND** the response payload SHALL reflect the updated effective settings
- **AND** a subsequent `effectiveSettings` query SHALL return the same updated value

#### Scenario: `updateDestinationSettings` persists the patch and returns updated settings

- **WHEN** a client calls `mutation { updateDestinationSettings(input: { default_organization_id: "ORG-1", default_project_id: "PROJ-1", kanban_done_status: "Done", vk_workspace_executor: "codex" }) { coreFields { key value } } }`
- **THEN** `SettingsService.applyGroupPatch('destination', <input>)` SHALL be invoked
- **AND** the response payload SHALL reflect the updated effective settings
- **AND** a subsequent `effectiveSettings` query or `vibeKanbanUiState` query SHALL return the same updated value

#### Scenario: Invalid source input surfaces as a GraphQL validation error

- **WHEN** a client calls `updateSourceSettings` with an input that fails Zod validation (e.g. an unknown key or malformed value)
- **THEN** the mutation SHALL return a GraphQL error with semantics equivalent to the `BadRequestException` that the REST handler threw

