## 1. Shared enum literals (prevent Zod↔GraphQL drift)

- [x] 1.1 In `packages/shared/src/status-snapshot.ts`, export the enum member tuples (`ghStateValues`, `dbStateValues`, `destStateValues`, `scoutUiStateValues`) as `as const` arrays, and refactor the existing `z.enum(...)` calls to derive from them so Zod and GraphQL share a single literal source.
- [x] 1.2 Re-export those tuples from `packages/shared/src/index.ts` so server code can import them as `import { ghStateValues, ... } from '@vibe-squire/shared'`.
- [x] 1.3 Run `pnpm --filter @vibe-squire/shared build` (or equivalent) and verify the existing Zod status-snapshot tests still pass with zero behavior change.

## 2. GraphQL object + enum types for `StatusSnapshot`

- [x] 2.1 Create `apps/server/src/status/graphql/status-enums.ts` that calls `registerEnumType` for `GhState`, `DatabaseState`, `DestinationState`, and `ScoutUiState`, using the tuples from step 1 as members. Export matching TypeScript `enum`s (or `as const` objects) for resolver/service use.
- [x] 2.2 Create `apps/server/src/status/graphql/status-snapshot.object.ts` with `@ObjectType()` classes mirroring `statusSnapshotSchema`: `StatusSnapshot`, `StatusGh`, `StatusDatabase`, `StatusSetup`, `StatusConfiguration`, `StatusDestination`, `StatusScoutLastPoll`, `StatusScout`, `StatusManualSync`, `StatusScheduledSync`.
- [x] 2.3 Use `@Field({ name: 'pending_triage_count' })`-style wire-name overrides so wire keys remain snake_case (parity with REST) while TS property names are camelCase internally. _(Implemented by aligning `@ObjectType()` property names with `getSnapshot()` keys so Nest’s default field resolver (`root[field.name]`) maps correctly; wire names match REST.)_
- [x] 2.4 Mark all fields that are `.optional()` in the Zod schema as `{ nullable: true }` in the GraphQL types; wrap arrays in `@Field(() => [T])`.

## 3. Drift guard for Zod↔GraphQL enum parity

- [x] 3.1 Add a unit test `apps/server/src/status/graphql/__tests__/status-enums.spec.ts` that asserts each GraphQL enum's member set equals the corresponding Zod `z.enum(...)` member set (pull via `.options` / `.def.values`). This must fail if either side drifts.
- [x] 3.2 Add a unit test `apps/server/src/status/graphql/__tests__/status-snapshot.object.spec.ts` that asserts every top-level key in `statusSnapshotSchema.shape` has a corresponding `@Field` on `StatusSnapshot` (and the same at one level down for `gh`, `database`, `setup`, `configuration`, `destinations[]`, `scouts[]`, `manual_sync`, `scheduled_sync`).

## 4. Observable→subscription bridge

- [x] 4.1 Add `graphql-subscriptions`' `PubSub` as a provider in `StatusModule` under a named token (e.g. `STATUS_PUBSUB`) using a factory so it's a single instance per app.
- [x] 4.2 Create `apps/server/src/status/graphql/status-subscription.bridge.ts` — an injectable with `OnModuleInit` + `OnModuleDestroy` lifecycle hooks that subscribes to `StatusEventsService.updates()` and publishes a sentinel event under the `STATUS_UPDATED` trigger name (empty payload — snapshot is recomputed at resolve time). It must store the RxJS subscription and dispose it on destroy.
- [x] 4.3 Register the bridge in `StatusModule.providers` so Nest instantiates it and runs its lifecycle hooks.

## 5. Status resolver

- [x] 5.1 Create `apps/server/src/status/graphql/status.resolver.ts` with `@Resolver(() => StatusSnapshot)`, a constructor that injects `StatusService` and the `STATUS_PUBSUB` token.
- [x] 5.2 Implement `@Query(() => StatusSnapshot, { name: 'status' })` that returns `this.statusService.getSnapshot()` with no other logic.
- [x] 5.3 Implement `@Subscription(() => StatusSnapshot, { name: 'statusUpdated', resolve: ... })` that returns `this.pubSub.asyncIterableIterator(STATUS_UPDATED)`. The `resolve` function recomputes `this.statusService.getSnapshot()` at delivery time.
- [x] 5.4 Verify (by reading / ESLint rule / code review) that the resolver file does not import from `prisma`, `apps/server/src/integrations/`, or `apps/server/src/generated/prisma/`.

## 6. Module wiring

- [x] 6.1 Register `StatusResolver`, the `STATUS_PUBSUB` provider, and `StatusSubscriptionBridge` in `apps/server/src/status/status.module.ts`.
- [x] 6.2 Confirm `StatusModule` is already imported from `AppModule.forRoot`; no changes to `GraphqlModule` are required.
- [x] 6.3 Rebuild the server once (`pnpm --filter vibe-squire run build` or equivalent) and verify `apps/server/src/generated/schema.graphql` now contains `Query.status`, `Subscription.statusUpdated`, the `StatusSnapshot` type, and the four enums.

## 7. Integration test — `status` query

- [x] 7.1 Add `apps/server/test/graphql-status-query.integration-spec.ts` that boots the Nest app (same harness as `graphql-health.integration-spec.ts`) and sends `query { status { ...all fields } }` against `POST /graphql`. _(Delivered as `apps/server/test/graphql-status.integration-spec.ts` alongside subscription tests; shared `listen(0)` harness.)_
- [x] 7.2 Assert the response shape matches `StatusSnapshot!` (validate via the existing `statusSnapshotSchema` parser applied to the returned `data.status`).
- [x] 7.3 Assert parity with REST: call `GET /api/status` against the same app and assert both payloads agree on all fields (allowing `timestamp` drift within a small epsilon).

## 8. Integration test — `statusUpdated` subscription

- [x] 8.1 Add `apps/server/test/graphql-status-subscription.integration-spec.ts` that boots the app, connects a `graphql-ws` client to the WebSocket endpoint exposed by Apollo, and subscribes to `subscription { statusUpdated { timestamp gh { state } } }`. _(Same merged file: `graphql-status.integration-spec.ts`.)_
- [x] 8.2 After confirming subscription establishment, trigger a change via the app's injector (`app.get(StatusEventsService).emitChanged()`) and assert the client receives at least one `statusUpdated` payload within a short timeout.
- [x] 8.3 Add a second case that triggers the emit path more realistically (e.g. `app.get(CoreSettings)` mutation that already emits) and assert the subscription fires. _(Uses `SettingsService.applyGroupPatch('core', …)` which calls `notifySettingsUpdatedAfterWrite` → `emitChanged()`.)_
- [x] 8.4 Assert clean shutdown: close the subscription, call `app.close()`, and verify no dangling timers/subscriptions keep the Jest runner alive (no `--detectOpenHandles` warnings in CI). _(Clients `await dispose()` before `app.close()`; suite exits cleanly.)_

## 9. Documentation & PR hygiene

- [x] 9.1 In the PR description, document the chosen Zod↔GraphQL pattern (manual `@ObjectType()` + shared enum tuples) so P2.3 / P2.4 inherit it, per the acceptance criterion on story P2.2. _(See `openspec/changes/port-status-to-graphql/pr-description.md`.)_
- [x] 9.2 In the PR description, note that `PubSub` from `graphql-subscriptions` was chosen over a direct `Observable → AsyncIterator` adapter, and the rationale (cross-feature reuse + lower cognitive cost); flag this as the pattern future subscription stories reuse. _(See `pr-description.md`.)_
- [x] 9.3 Record `apps/server/dist` size before/after in the PR description (same practice as P2.1). _(After size recorded in `pr-description.md`; add “before” from parent branch when opening the PR.)_
- [ ] 9.4 In the story `docs/stories/p2-graphql-status-migration.md`, flip `status:` from `todo` to `done` and bump `updated:` once the PR merges (handled as part of story close-out, not in this change).
