---
id: P2.2
title: Port /api/status to a GraphQL query plus live subscription
status: done
impact: M
urgency: later
tags:
  - area:graphql
  - area:status
  - theme:observability
openspec: recommended
updated: 2026-04-20
roadmap_ref: P2.2
depends_on:
  - P2.1
adr_refs:
  - 001-graphql-pilot.md
---

## Problem / outcome

Prove the GraphQL pilot end-to-end by porting the richest existing surface: the runtime status snapshot (`GET /api/status`) and its SSE stream (`GET /api/status/stream`). This exercises object types, a non-trivial subscription, and the bridge from the existing `EventEmitter2`-based domain event bus into GraphQL PubSub.

Existing wiring for reference:

- `apps/server/src/status/status.service.ts` — `getSnapshot()` aggregate.
- `apps/server/src/status/status.controller.ts` — REST + SSE controllers.
- `apps/server/src/events/status-events.service.ts` — `updates(): Observable<void>` emitted on sync start/end, settings changes, reinit, etc. Already an `Observable`, so no new event bus is needed.

## Acceptance criteria

- [ ] `status: StatusSnapshot!` query returns the same logical payload as `GET /api/status`. GraphQL object types declared in `apps/server/src/status/graphql/` (or similar) with `@ObjectType()` / `@Field()` matching `StatusSnapshotDto`.
- [ ] `statusUpdated: StatusSnapshot!` subscription emits a fresh snapshot on every `StatusEventsService.updates()` tick. Implementation bridges the existing Observable into `PubSub` from `graphql-subscriptions` (or uses `Observable → async iterator` adapter — author's call, document the choice in a PR note).
- [ ] `graphql-ws` subscription transport validated: subscribing from a test client receives events triggered by a manual sync run and a settings change.
- [ ] Integration test under `apps/server/test/` covers the query (same assertions as the REST status integration spec) and the subscription (start subscription, trigger a settings change, assert at least one payload received).
- [ ] The REST `GET /api/status` and SSE `GET /api/status/stream` endpoints remain untouched — sunset is deferred to `P2.5`.
- [ ] No changes to `apps/server/src/events/` beyond adding a GraphQL adapter — the event bus stays the source of truth.
- [ ] Decide and document the Zod-vs-GraphQL-type pattern for this story: either (a) manually duplicate with Zod still the server-side validation source of truth, or (b) derive via a helper. Whichever is chosen, reuse it in `P2.4`.

## Notes

- OpenSpec recommended because: introduces a new live transport (`graphql-ws`), touches the event bus, and sets the Zod↔GraphQL type-bridging precedent for the rest of the migration.
- Enumerated fields in the status payload (e.g. `gh.state`, `manualSync.phase`) must become proper GraphQL enums — do not collapse to `String`.
- Keep snapshot production routed through `StatusService.getSnapshot()`; the resolver is a thin wrapper. This keeps the application service transport-agnostic and the hexagonal boundary clean.
- Subscription transport: prefer `PubSub` from `graphql-subscriptions` for the bridge since the app is a single Node process on SQLite (no multi-instance coordination needed). A direct `Observable → AsyncIterator` adapter is an acceptable alternative if it removes a dependency; whichever is chosen, use it consistently for the rest of the migration.
