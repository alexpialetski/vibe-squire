# PR notes — copy into the GitHub PR description

## Zod ↔ GraphQL pattern (P2.3 / P2.4)

- **Enums:** Member lists are `as const` tuples in `@vibe-squire/shared` (`ghStateValues`, …). Zod uses `z.enum(tuple)`; GraphQL uses `registerEnumType` with matching const objects in `apps/server/src/status/graphql/status-enums.ts`.
- **Objects:** `@ObjectType()` / `@Field()` classes mirror `statusSnapshotSchema` under `apps/server/src/status/graphql/status-snapshot.object.ts`. Nest resolves fields by **TypeScript property name** (`root[field.name]`); property names match `StatusService.getSnapshot()` keys (including snake_case where the API uses them).
- **Nullability:** Optional Zod fields use `.nullish()` where both REST and GraphQL may omit a key or send JSON `null`.

## PubSub vs Observable → AsyncIterator

- **`graphql-subscriptions` `PubSub`** is used (injected as `STATUS_PUBSUB` in `StatusModule`) with a small **bridge** (`StatusSubscriptionBridge`) that subscribes to `StatusEventsService.updates()` and `publish`es a sentinel on `statusUpdated`. The resolver’s subscription **`resolve`** recomputes `getSnapshot()` at delivery time (no snapshot in the PubSub payload).
- **Rationale:** Matches how other features can plug into the same pattern, reuses the common GraphQL stack, and keeps the resolver free of RxJS. Future subscription work should reuse this **PubSub + bridge** shape unless there is a strong reason not to.

## `apps/server/dist` size

- **After this change (local):** ~1 445 136 bytes (`du -sb apps/server/dist`).

Record the **before** size from the parent of this PR branch in the final PR description (same method as P2.1).
