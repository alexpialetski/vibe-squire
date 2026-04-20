## Why

Story [P2.2](../../../docs/stories/p2-graphql-status-migration.md) asks us to prove the GraphQL pilot end-to-end by porting the richest existing surface — the runtime status snapshot (`GET /api/status`) and its SSE stream (`GET /api/status/stream`) — onto the Nest + Apollo foundation shipped in P2.1.

The status surface is the ideal exercise because it combines nested object types, enum fields, and a non-trivial live subscription. Completing it validates three things the rest of the P2 migration depends on: (a) the Zod↔GraphQL object-type pattern is usable, (b) the existing `StatusEventsService` `Observable` can be bridged into a GraphQL subscription transport without invasive changes to the event bus, and (c) resolvers can stay thin driving adapters over `StatusService.getSnapshot()` per ADR 001 and the hexagonal rule.

## What Changes

- Add a `status: StatusSnapshot!` query on the GraphQL schema that returns the same logical payload as `GET /api/status`, routed through `StatusService.getSnapshot()`.
- Add a `statusUpdated: StatusSnapshot!` subscription that emits a fresh snapshot on every `StatusEventsService.updates()` tick, delivered over the `graphql-ws` transport already configured in P2.1.
- Introduce GraphQL object types mirroring `StatusSnapshotDto` (plus its nested DTOs) under `apps/server/src/status/graphql/` so the resolver has a typed return shape. Enumerated fields (`gh.state`, `database.state`, `destinations[].state`, `scouts[].state`) must become proper GraphQL enums — not `String`.
- Adopt and document the Zod↔GraphQL type pattern: manual duplication of `statusSnapshotSchema` (from `@vibe-squire/shared`) into `@ObjectType()` classes, with Zod kept as the server-side validation source of truth. This sets the precedent for `P2.4` and the rest of the migration.
- Add a small adapter that bridges the existing RxJS `Observable<void>` from `StatusEventsService.updates()` into an async iterator (via `graphql-subscriptions` `PubSub`), and extend `StatusEventsService` with a non-invasive subscription helper that resolvers can call without depending on RxJS directly.
- Integration test coverage under `apps/server/test/` for both the query (parity with the existing REST integration spec) and the subscription (start subscription → trigger change → assert payload received over `graphql-ws`).
- **Not changed:** `GET /api/status` and `GET /api/status/stream` remain live — sunsetting them is deferred to P2.5. The REST controller and SSE stream are untouched. No changes to `apps/server/src/events/` beyond the new adapter.

## Capabilities

### New Capabilities
- `graphql-status`: GraphQL query and live subscription surface for the runtime status snapshot, mirroring the REST/SSE status endpoint contract end-to-end.

### Modified Capabilities
<!-- No existing openspec specs exist yet in openspec/specs/, so there is nothing to delta. -->

## Impact

- **Server code:** `apps/server/src/status/` gains a `graphql/` subfolder with object/enum type classes and a `StatusResolver`; `StatusModule` registers the resolver. `apps/server/src/events/status-events.service.ts` (or a sibling file) gains a thin `PubSub`/async-iterator bridge — no behavioural change to the existing `emitChanged` / `updates` API. `apps/server/src/graphql/graphql.module.ts` stays as-is; the new resolver is wired via `StatusModule`.
- **Schema output:** `apps/server/src/generated/schema.graphql` grows a `Query.status`, `Subscription.statusUpdated`, a `StatusSnapshot` object (and nested types), and the status-related enums. Still gitignored.
- **Shared contracts (`packages/shared`):** no runtime changes — `statusSnapshotSchema` remains the Zod source of truth. The GraphQL type classes import enum literals from it where convenient to keep the two representations aligned.
- **REST + SSE contracts:** unchanged. The existing integration tests for `GET /api/status` and `GET /api/status/stream` continue to pass without modification.
- **Dependencies:** no new dependencies — `graphql-ws` and `graphql-subscriptions` were added in P2.1.
- **Operator / client:** no user-visible change in this story. `apps/web` continues to consume REST/SSE; client migration happens in later P2 stories.
- **Hexagonal boundary:** the new resolver is a driving adapter and must not import Prisma, integration adapters, or `apps/server/src/generated/prisma/` — it only depends on `StatusService` and the new event-bus bridge.
