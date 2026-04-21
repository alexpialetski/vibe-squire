## Context

P2.1 shipped the GraphQL foundation: a code-first `@nestjs/graphql` + `@apollo/server` module with `graphql-ws` subscriptions enabled, a placeholder `health` query, and an integration test asserting the wiring (`apps/server/src/graphql/graphql.module.ts`, `apps/server/test/graphql-health.integration-spec.ts`). The schema is emitted to `apps/server/src/generated/schema.graphql`.

Today, runtime status reaches the operator UI over two REST surfaces:

- `StatusController.snapshot()` → `GET /api/status`, returning `StatusService.getSnapshot()` shape validated by `statusSnapshotSchema` in `@vibe-squire/shared`.
- `StatusController.stream()` → `GET /api/status/stream`, an SSE endpoint that pipes `StatusEventsService.updates()` ticks through `getSnapshot()` and a 30s keep-alive.

`StatusEventsService` is already reactive: it exposes `updates(): Observable<void>` backed by an RxJS `Subject<void>`. Anything in the codebase that mutates observable state — sync start/end, settings changes, reinit — already calls `emitChanged()`. We do not need to add more emit points for this story; we only need to consume the existing stream from a new transport.

The constraints we care about:

- Hexagonal rule (`.cursor/rules/architecture.mdc`, reaffirmed in ADR 001): resolvers are driving adapters, peers of HTTP controllers. They may depend on application services (`StatusService`, `StatusEventsService`) but must not import Prisma or integration adapters directly.
- Zod remains the validation source of truth per ADR 001 — GraphQL types are declared in parallel.
- This is the first real GraphQL feature, so the pattern we pick here (type duplication, subscription bridge) is the one we want to reuse in P2.3 / P2.4. Consistency matters more than local cleverness.
- Single-process deployment (SQLite), so no multi-instance PubSub coordination is required.

## Goals / Non-Goals

**Goals:**

- Expose `status: StatusSnapshot!` and `statusUpdated: StatusSnapshot!` on `/graphql` with parity to the existing REST/SSE payload.
- Keep `StatusService.getSnapshot()` as the sole snapshot producer. The resolver must be a thin wrapper.
- Establish the **Zod↔GraphQL type pattern** that P2.3 / P2.4 will reuse: manual `@ObjectType()` classes mirroring the Zod schema, with Zod kept as server-side validator.
- Establish the **Observable→subscription bridge pattern**: one small, well-located adapter that converts `StatusEventsService.updates()` into an async iterator the resolver can return, without polluting the resolver with RxJS details.
- Add integration tests that exercise both the query and the `graphql-ws` subscription end-to-end (start subscription → trigger a change → receive payload).

**Non-Goals:**

- Sunsetting `GET /api/status` or `GET /api/status/stream`. Both stay live and untouched; removal is deferred to P2.5 after the client migrates.
- Changing `StatusEventsService` emit semantics or adding new emit sites.
- Touching `apps/web` to consume the new GraphQL surface. The status screen keeps using SSE/REST until its own migration story.
- Introducing a schema derivation library (zod-to-graphql, etc.). We evaluate derivation later if manual duplication churn becomes painful.
- Cross-instance PubSub (Redis, etc.) — out of scope for a single-process SQLite app.

## Decisions

### D1: Where the resolver and object types live

**Decision.** Put the resolver and object/enum types under `apps/server/src/status/graphql/`, registered by `StatusModule`.

Layout:

```
apps/server/src/status/
  graphql/
    status-snapshot.object.ts       # @ObjectType() StatusSnapshot + nested @ObjectType()s
    status-enums.ts                  # registerEnumType() for GhState, DbState, DestState, ScoutUiState
    status.resolver.ts               # @Resolver() StatusResolver
```

`StatusModule` already imports `EventsModule` (which provides `StatusEventsService`) and provides `StatusService`. Adding `StatusResolver` to its `providers` array makes Nest auto-discover it because `GraphqlModule` is imported from `AppModule`.

**Alternatives considered.**

- Put resolvers under a central `apps/server/src/graphql/` tree. Rejected — it re-introduces a "BFF layer" and fights the feature-module layout; the hexagonal rule already says resolvers are peers of controllers, and controllers live next to their feature.
- Put object types in `@vibe-squire/shared`. Rejected for now — GraphQL decorators are a server-only concern; `shared` stays framework-free Zod.

### D2: Zod↔GraphQL duplication strategy (the pattern the rest of P2 inherits)

**Decision.** Manually declare `@ObjectType()` classes that mirror `statusSnapshotSchema`. Zod stays the server-side validation source of truth for anything that parses external input or REST payloads. GraphQL object types are hand-kept in sync; tests compare actual shapes at runtime (see D6) so drift is caught.

Concretely:

- One `@ObjectType()` class per Zod `z.object` / `z.looseObject` in `status-snapshot.ts`.
- One GraphQL enum (via `registerEnumType`) per Zod `z.enum` — `gh.state`, `database.state`, `destinations[].state`, `scouts[].state`. Enum *members* are imported from `@vibe-squire/shared` where possible (as arrays) so the GraphQL enum can't drift from the Zod enum without a TS error.
- Nullable / optional fields use `{ nullable: true }` on `@Field`, matching Zod `.optional()`.
- Array fields use explicit `@Field(() => [T])`.
- The scout `last_poll` sub-object and the `configuration` extras (`vibe_kanban_board_active`) stay typed — not `JSON` — because the story explicitly forbids collapsing enumerated fields to strings, and extending that principle to "don't hide structure as `JSON`" keeps the GraphQL schema useful for codegen downstream.

**Alternatives considered.**

- **Derive `@ObjectType` from Zod via a helper / third-party lib** (e.g. `zod-to-graphql`). Rejected for this story: every such library has opinionated tradeoffs (enum naming, optional-vs-nullable, extensibility) and picking one now couples the whole migration to that choice. Manual duplication is O(lines) not O(features) and is cheaper to revert. We can revisit once we have 3+ feature modules to inform the choice.
- **Mark every snapshot field as `GraphQLJSON`.** Rejected — story explicitly forbids collapsing enums, and it defeats the purpose of adopting a typed transport.
- **Make GraphQL the single source of truth (generate Zod from GraphQL).** Rejected — Zod is already wired into `@vibe-squire/shared` and consumed at REST boundaries; flipping the direction is a bigger change than this story owns.

This pattern — parallel `@ObjectType()` next to a Zod schema, with shared enum literals — is what P2.3 (triage/mapping) and P2.4 (settings) will copy.

### D3: Bridging `StatusEventsService.updates()` into a GraphQL subscription

**Decision.** Add `graphql-subscriptions`' `PubSub` as a provider in `StatusModule`, and wire it once from `StatusEventsService.updates()` → `pubSub.publish('statusUpdated', {})`. The resolver's subscription method returns `pubSub.asyncIterableIterator('statusUpdated')` and resolves the payload to a fresh `getSnapshot()` via a resolver-level `resolve`.

Sketch:

```ts
// status.module.ts providers (additions):
//   StatusResolver,
//   { provide: STATUS_PUBSUB, useFactory: () => new PubSub() },
//   StatusSubscriptionBridge,  // OnModuleInit subscribes pubSub to statusEvents.updates()

// status.resolver.ts
@Subscription(() => StatusSnapshot, {
  name: 'statusUpdated',
  resolve: (_payload, _args, ctx, _info) => ctx.req?.statusService?.getSnapshot()
    ?? this.statusService.getSnapshot(),
})
statusUpdated() {
  return this.pubSub.asyncIterableIterator('statusUpdated');
}
```

The bridge lives next to `StatusEventsService` (or as `status/graphql/status-subscription.bridge.ts`) and holds the RxJS subscription so it can be cleaned up on module shutdown (`OnModuleDestroy`). The resolver does **not** touch RxJS.

We do **not** publish the snapshot through `pubSub.publish` — we publish a sentinel (empty payload) and recompute in `resolve`. This matches how the SSE controller works (`switchMap(() => from(getSnapshot()))`) and avoids stale snapshots if multiple emits collapse.

**Alternatives considered.**

- **Direct `Observable → AsyncIterator` adapter**, no `PubSub`. Attractive because it removes a dependency and keeps state out of a long-lived singleton. Rejected for *this* story: `PubSub` is the path of least surprise for future resolvers that will want to publish on their own events (not just `StatusEventsService`), and `graphql-subscriptions` is already a transitive dep of `@nestjs/graphql` in P2.1. The ADR is also neutral ("either is fine"), so we pick the one with the lower ongoing cognitive cost.
- **Publish the full snapshot in `pubSub.publish` at emit time.** Rejected — `getSnapshot()` does real Prisma work; running it in the RxJS callback when there may be zero subscribers is wasteful. Lazy recompute in `resolve` is strictly cheaper.
- **Add a second emit site for "snapshot ready" instead of reusing `updates()`.** Rejected — violates the story's "no changes to `apps/server/src/events/` beyond a GraphQL adapter" constraint.

### D4: Query payload parity with REST

**Decision.** `status` query resolver calls `this.statusService.getSnapshot()` and returns it directly. The `@ObjectType()` field names match the Zod/JSON keys (e.g. `pending_triage_count`, `manual_sync`, `scheduled_sync`) — we do *not* rename to camelCase in this story. Field rename is a future polish (cosmetic) and is deliberately kept out to minimize diff against the REST baseline for comparative tests.

`@Field({ name: 'pending_triage_count' })` lets the class property stay camelCase (`pendingTriageCount`) internally while the wire name is snake_case, preserving TypeScript ergonomics.

**Alternatives considered.** Rename to camelCase now. Rejected — it breaks the parity-with-REST test we want to keep cheap, and should be a deliberate, separate cosmetic pass once the client has migrated.

### D5: Auth / context

**Decision.** No GraphQL-level auth in this story. The existing REST endpoints are currently unauthenticated (localhost operator console), and adding auth now would scope-creep P2.2. `context` stays the default Nest/Apollo context (`{ req, res }`).

### D6: Test strategy

**Decision.** Two integration specs under `apps/server/test/`, both built on the same Nest test harness already used by `graphql-health.integration-spec.ts`:

- `graphql-status-query.integration-spec.ts` — boots the full app, fires `query { status { ... } }` with all fields, and asserts the response matches what `StatusService.getSnapshot()` returns for the same fixture. Uses the same seeded state as the existing `status.controller` integration spec so parity is obvious.
- `graphql-status-subscription.integration-spec.ts` — starts a `graphql-ws` client against the running server, subscribes to `statusUpdated`, triggers a change (cheapest path: call `StatusEventsService.emitChanged()` directly via the app's injector, or — more realistically — toggle a core setting and let `SettingsService` emit), and asserts at least one payload is received with the expected shape within a timeout. Also asserts the subscription cleans up without dangling timers on `app.close()`.

A small schema-shape test (compile-time + light runtime check that every key in `statusSnapshotSchema.shape` has a corresponding `@Field` on `StatusSnapshot`) guards against Zod/GraphQL drift without a full codegen pipeline.

## Risks / Trade-offs

- **[Risk] Zod/GraphQL drift.** Hand-kept parallel types are only as good as the test that compares them. **Mitigation.** The schema-shape drift test in D6, plus the integration test asserting full-field parity, catches shape drift at CI time.
- **[Risk] Subscription memory leak.** An RxJS subscription held by the `PubSub` bridge will leak if not cleaned up on module shutdown. **Mitigation.** Bridge implements `OnModuleDestroy` and unsubscribes; a test asserts the app closes cleanly with an active subscriber.
- **[Risk] `getSnapshot()` on every emit overloads Prisma under rapid bursts.** `updates()` can fire several times in a tight window (e.g. mid-sync). **Mitigation.** The resolver-level `resolve` recomputes on each delivered event, but subscribers-per-process is ~1 in practice (single operator UI). If this ever matters, add an RxJS `auditTime`/`debounceTime` in the bridge without changing the resolver contract. Not needed in this story.
- **[Risk] Enum drift between Zod and GraphQL.** Two places that list `['ok', 'error', 'unknown']` can diverge. **Mitigation.** Export enum member arrays from `@vibe-squire/shared` (or re-export via a typed `as const` tuple) so both the Zod schema and the GraphQL enum registration import the same list — TS compile fails on drift.
- **[Trade-off] Parallel REST + GraphQL status surface until P2.5.** Two transports, two test paths. Accepted — per ADR 001 and the P2 plan — because it de-risks the migration by allowing the client to move one screen at a time.
- **[Trade-off] Wire field names stay snake_case.** Trades cosmetic friction for cheap REST-parity tests in this story. Will be revisited post-migration.

## Migration Plan

- **Deploy.** Normal PR: merge adds `status`/`statusUpdated` to the schema and new tests. REST endpoints are unchanged, so no client coordination required.
- **Schema file.** The generated `schema.graphql` diff is informative-only (gitignored). CI still builds the app; reviewers can re-run it locally if they want to eyeball the SDL.
- **Rollback.** Revert the PR. Nothing on disk / in DB changes, and REST continues to serve the operator UI.
- **Follow-on (P2.3, P2.4).** Reuse the `graphql/` sub-folder layout, the manual `@ObjectType` + shared-enum-literals pattern, and the `PubSub` bridge shape. If the manual duplication pattern becomes painful by the second or third feature, open an ADR-level discussion on derivation before P2.4 lands.

## Open Questions

- None blocking implementation. One editorial note: the story mentions `manualSync.phase` as an enum example, but the current `manual_sync` payload in `statusSnapshotSchema` does not yet include a `phase` field. We treat the concrete enum set as the one present today (`gh.state`, `database.state`, `destinations[].state`, `scouts[].state`). If `manual_sync.phase` is added later, it slots in as another enum under the same pattern.
