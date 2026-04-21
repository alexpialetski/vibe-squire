# graphql-status Specification

## Purpose

Defines the GraphQL `status` query and `statusUpdated` subscription — the live operator-console surface that mirrors `GET /api/status` and `GET /api/status/stream`, delivered over the code-first Apollo driver set up in `graphql-server-foundation`. Resolvers are thin driving adapters over `StatusService.getSnapshot()` and must stay decoupled from Prisma and integration adapters. Zod (`statusSnapshotSchema` in `@vibe-squire/shared`) remains the single validation source of truth; GraphQL types mirror it with shared enum literals so the two representations cannot drift.
## Requirements
### Requirement: GraphQL schema exposes `status` query returning `StatusSnapshot!`

The GraphQL server SHALL expose a non-nullable query field `status: StatusSnapshot!` on the root `Query` type. The `StatusSnapshot` GraphQL object type MUST mirror the logical payload of `GET /api/status` — i.e. the shape produced by `StatusService.getSnapshot()` and validated by `statusSnapshotSchema` in `@vibe-squire/shared` — including the top-level fields `timestamp`, `pending_triage_count`, `gh`, `database`, `setup`, `configuration`, `destinations`, `scouts`, `manual_sync`, and `scheduled_sync`, and their nested sub-objects.

Enumerated fields from the Zod contract (`gh.state`, `database.state`, `destinations[].state`, `scouts[].state`) MUST be declared as GraphQL enums — they MUST NOT be represented as `String`.

#### Scenario: Query returns the same logical payload as the REST endpoint

- **WHEN** a client sends `query { status { timestamp pending_triage_count gh { state message } database { state } setup { complete mappingCount reason } configuration { source_type destination_type vibe_kanban_board_active } destinations { id state } scouts { id state last_poll { candidates_count skipped_unmapped issues_created } } manual_sync { canRun reason cooldownUntil } scheduled_sync { enabled } } }` to `POST /graphql`
- **THEN** the response `data.status` payload SHALL contain the same field values, for the same server state, as a concurrent call to `GET /api/status`

#### Scenario: Enumerated state fields are typed as GraphQL enums

- **WHEN** the emitted SDL at `apps/server/src/generated/schema.graphql` is inspected
- **THEN** the types of `StatusSnapshot.gh.state`, `StatusSnapshot.database.state`, `StatusSnapshot.destinations[].state`, and `StatusSnapshot.scouts[].state` SHALL each be a named GraphQL `enum` with members matching the corresponding Zod `z.enum` in `@vibe-squire/shared`

#### Scenario: Resolver is a thin wrapper over `StatusService.getSnapshot()`

- **WHEN** the `status` query is resolved
- **THEN** the resolver SHALL obtain the payload exclusively by calling `StatusService.getSnapshot()` and MUST NOT import `PrismaService`, any `apps/server/src/integrations/` adapter, or `apps/server/src/generated/prisma/` directly

### Requirement: GraphQL schema exposes `statusUpdated` subscription emitting fresh snapshots

The GraphQL server SHALL expose a non-nullable subscription field `statusUpdated: StatusSnapshot!` on the root `Subscription` type, delivered over the `graphql-ws` transport configured in `GraphqlModule`. Every `StatusEventsService.updates()` tick (emitted by existing sync start/end, settings changes, and reinit flows) SHALL cause exactly one `statusUpdated` event to be pushed to each active subscriber, carrying a freshly-computed `StatusService.getSnapshot()` payload.

The subscription MUST reuse the existing `StatusEventsService.updates()` Observable as its source of truth — no new emit sites are added inside `apps/server/src/events/`.

#### Scenario: Subscribing client receives a snapshot after a status change

- **WHEN** a `graphql-ws` client subscribes to `subscription { statusUpdated { timestamp gh { state } } }`
- **AND** `StatusEventsService.emitChanged()` fires (e.g. through a manual sync start or a core settings change)
- **THEN** the subscriber SHALL receive at least one `statusUpdated` payload whose shape matches `StatusSnapshot!` within the test timeout

#### Scenario: Subscription payload reflects state at delivery time

- **WHEN** `StatusEventsService.updates()` emits once
- **AND** the subscription pipeline resolves the payload for a subscriber
- **THEN** the delivered payload SHALL equal the return of `StatusService.getSnapshot()` evaluated at delivery time, not at emit time

#### Scenario: Subscription cleans up on shutdown

- **WHEN** the Nest application is closed while a `graphql-ws` subscriber is active
- **THEN** the RxJS bridge between `StatusEventsService.updates()` and the GraphQL subscription SHALL be unsubscribed and MUST NOT keep the event loop alive

### Requirement: REST and SSE status endpoints are removed once GraphQL parity is shipped

The `GET /api/status` REST controller and the `GET /api/status/stream` SSE controller SHALL be deleted. The status snapshot and live-update transports are served exclusively by the GraphQL `status` query and `statusUpdated` subscription delivered over `graphql-ws`. `StatusEventsService.updates()` SHALL feed only the GraphQL PubSub — no `@Sse` consumer, interceptor, or bridge SHALL subscribe to it outside the GraphQL subscription pipeline. The transport decision table in `docs/ARCHITECTURE.md` SHALL record both endpoints as `removed` with a one-sentence justification naming the GraphQL operation that supersedes them.

#### Scenario: REST status endpoint responds 404

- **WHEN** a client sends `GET /api/status` after this change is deployed
- **THEN** the server SHALL respond `404 Not Found`, because the route handler has been deleted

#### Scenario: SSE status stream responds 404

- **WHEN** a client sends `GET /api/status/stream` after this change is deployed
- **THEN** the server SHALL respond `404 Not Found`, because the `@Sse('stream')` handler has been deleted

#### Scenario: `StatusEventsService.updates()` has exactly one downstream subscriber

- **WHEN** the status module is initialised after this change lands
- **THEN** the only code path subscribing to `StatusEventsService.updates()` SHALL be the `statusUpdated` subscription resolver (directly or via the GraphQL PubSub bridge)
- **AND** no `@Sse` handler, SSE gateway, or non-GraphQL HTTP interceptor SHALL subscribe to it

#### Scenario: Transport decision table records the removal

- **WHEN** `docs/ARCHITECTURE.md` is inspected after this change lands
- **THEN** the transport decision table SHALL contain rows for `GET /api/status` and `GET /api/status/stream`, each with status `removed`
- **AND** each justification SHALL name the GraphQL operation (`status` query and `statusUpdated` subscription respectively) that supersedes the removed endpoint

### Requirement: Zod remains the server-side validation source of truth

This change SHALL NOT move validation authority from Zod to GraphQL. The `statusSnapshotSchema` in `@vibe-squire/shared` remains the server-side validator for the status contract. GraphQL `@ObjectType()` classes declared for this feature MAY duplicate field names, types, and enum members manually, but they MUST derive enum *members* from the same literal source used by the Zod schema so that the two representations cannot silently drift.

#### Scenario: GraphQL enum members are aligned with Zod enum members

- **WHEN** the set of GraphQL enum members for `gh.state`, `database.state`, `destinations[].state`, and `scouts[].state` is compared to the corresponding Zod `z.enum` member list
- **THEN** the two sets SHALL be equal, and any drift SHALL cause a TypeScript compile error or a failing test

