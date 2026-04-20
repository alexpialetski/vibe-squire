## Context

P2.2 exposed `status` / `statusUpdated` on the Nest GraphQL server; P2.3 wired Apollo into `apps/web` for the dashboard. This change moves operator-console reads and writes (settings, mappings, activity, integration nav, sync/triage, and **dashboard setup detail** via `dashboardSetup`) onto GraphQL in `apps/web`, with TanStack Query removed from the web app. REST handlers under `/api/ui/*` and elsewhere stay registered for backwards compatibility and tests until `P2.5` sunset. Application logic remains in Nest modules (`settings`, `mappings`, `ui/activity-api.controller.ts`, `sync`, `ui-nav.service.ts`, `setup`); HTTP controllers stay thin adapters beside GraphQL.

Constraints from [ADR 001](../../../docs/adr/001-graphql-pilot.md): code-first GraphQL, resolvers stay thin over application services (no Prisma or integration adapters in resolvers), Zod in `@vibe-squire/shared` remains validation source of truth, GraphQL types mirror or bridge Zod with the same pattern chosen in P2.2. REST endpoints stay registered until explicitly sunset later.

## Goals / Non-Goals

**Goals:**

- Expose the operator BFF read/write surface through GraphQL (`Query` / `Mutation` / `Subscription`) so settings (with field metadata), mappings CRUD with update, activity feed with per-item triage, manual sync/reinit, integration nav, and dashboard setup checklist (`dashboardSetup`, parity with `GET /api/ui/setup`) are available to `apps/web` without new REST aggregation endpoints.
- Restore the UX lost in the monorepo split (commit `2b71f909`) on Settings, Mappings, and Activity in the same change that rewrites those pages for Apollo — see `proposal.md` for the concrete regressions.
- Drive **all** live updates on migrated screens via GraphQL subscriptions (`statusUpdated`, `activityEvents`). No client-side interval polling — including for in-progress sync runs — anywhere in `apps/web` after this change.
- Migrate the Settings, Mappings, and Activity experiences (including sync trigger and triage UX owned by this story) to Apollo hooks with deliberate cache policies and optimistic updates on mapping, settings, and triage mutations.
- Split migrated screens across **atoms / molecules / organisms / templates** with pages as the only data-hook boundary — no monolithic page files for those routes after migration.
- Add server integration tests per new resolver family and for the `activityEvents` subscription; keep existing REST integration tests green.
- Introduce GraphQL codegen for `apps/web` when the operation surface warrants it, with generated artifacts checked in under `apps/web/src/__generated__/` (or the path chosen in implementation).

**Non-Goals:**

- Removing REST controllers or TanStack Query from screens outside this story’s scope (e.g. GitHub, VibeKanban) unless they are the last REST consumers and removal falls out naturally — if any intentional REST holdout remains, document it and keep dependencies.
- Sunsetting `GET /api/status` or SSE (`P2.5`).
- Multi-instance PubSub scaling; single-process `graphql-subscriptions` or equivalent remains sufficient.
- Re-implementing the pre-split `localStorage`-backed optimistic triage layer — Apollo optimistic responses supersede it.

## Decisions

1. **Schema layout — one root slice vs. namespaces.** Use descriptive root field names (`effectiveSettings`, `mappings`, `activityFeed`, `integrationNav`, mutations as verbs) consistent with existing `status` naming. Avoid redundant nested `operator` wrapper types unless SDL readability suffers.

2. **Activity pagination — Relay-style connections.** `activityFeed` uses the connection pattern (edges/nodes/pageInfo) for forward pagination, matching the story note and append-only log semantics. Cursors are opaque server-issued values (e.g. encoded ids), not offset integers in the public API.

3. **`activityEvents` subscription is required (no polling).** Ship `activityEvents` bridged from the existing domain signals (`StatusEventsService` ticks plus emit sites inside the sync / triage flows) using the same PubSub / Observable pattern chosen in P2.2 for `statusUpdated`. The Activity page consumes this subscription to refresh while a run is in progress; the client performs no interval polling. Payload is either a changed `ActivityRun` (or item) node or a connection-level invalidation signal — implementation chooses the shape that lets the Apollo cache merge correctly.

4. **Cache policies (Apollo).** Define `typePolicies` for list roots affected by mutations or subscriptions: `Query.mappings` merge strategy, `Query.activityFeed` Relay connection (via `relayStylePagination` or an equivalent merge) so `fetchMore` and subscription updates compose cleanly, normalized `Mapping` / `ActivityRun` / `ActivityItem` by stable `id`, and a singleton policy for the settings payload. Prefer `merge` functions and mutation `update` / optimistic paths over blanket `refetchQueries`.

5. **Optimistic UX.** Use Apollo optimistic responses for `updateSettings`, `upsertMapping`, `updateMapping`, `deleteMapping`, and the triage mutations (`acceptTriage`, `declineTriage`, `reconsiderTriage`) — restoring the pre-split triage UX via first-class Apollo machinery rather than the old `localStorage` (`vs_triage_optimistic`) trick. Roll back on error using Apollo’s built-in behaviour.

6. **Settings field metadata on the server.** `effectiveSettings` (or a sibling query such as `settingsMetadata`) exposes per-field `label`, `key`, `envVar`, `description`, and the resolved source/destination adapter labels so the Settings "Sync adapters" info card and muted setting-key hints can render without the client hard-coding strings. Integration tests assert parity with the pre-split `/api/ui/settings-meta` shape.

7. **Mappings update mutation.** Add `updateMapping(input)` alongside `upsertMapping` / `deleteMapping` so the restored inline row-edit UX has a dedicated mutation with clear semantics. If `upsertMapping` can cover update-by-id without semantic ambiguity, document the choice in the PR and expose an `updateMapping` thin-alias; otherwise prefer two distinct mutations.

8. **Atomic decomposition granularity.** One template per migrated page (or shared template if two pages share layout) and focused organisms (settings adapters info, settings form, mappings editable table with row-edit molecules, activity runs + run-items organisms, triage-action molecule). Molecules group repeated row/control patterns; atoms stay presentational. Pages remain thin: hooks + error/loading gates + template composition.

9. **Zod↔GraphQL.** Reuse the P2.2 approach (manual decorator types aligned with Zod enums / shapes, or shared helper if one already exists in the repo). Do not introduce a second validation truth.

## Risks / Trade-offs

- **[Risk] Cache inconsistency after partial migration** (TanStack + Apollo) → **Mitigation:** Finish in-repo consumers for the targeted screens in the same change; gate removal of `QueryClientProvider` on zero `useQuery` usages from `@tanstack/react-query` in `apps/web`.

- **[Risk] Connection spec verbosity on the client** → **Mitigation:** Codegen types + small adapter hooks for “load more” on activity; keep resolver implementation straightforward.

- **[Risk] Over-fetching on `integrationNav`** → **Mitigation:** Resolver delegates to existing `UiNavService` aggregation; GraphQL field selection limits payload on the wire compared to a fixed REST blob only if the schema exposes granular fields — if the current service returns one DTO, mirror it as a single object type first, refine later.

- **[Risk] `activityEvents` subscription payload design** → **Mitigation:** Prefer emitting the changed node(s) with enough context for Apollo to merge into the normalized cache; if a connection-level invalidation is simpler, document it and provide a light `update` function on the client side. Add tests asserting no duplicated nodes after a subscription tick during a live sync run.

- **[Risk] Subscription delivery gaps during reconnect** → **Mitigation:** On `graphql-ws` reconnect, the Activity page refetches the first page of `activityFeed` — no interval polling is introduced; the refetch is a one-shot triggered by the transport lifecycle.

- **[Risk] Triage optimistic rollback UX on server error** → **Mitigation:** Use Apollo’s built-in rollback; surface a toast explaining the rollback. Drop the legacy `vs_triage_optimistic` `localStorage` key in the same commit that removes the pre-split activity JS usage (if any residue remains).

## Migration Plan

1. Land server schema + resolvers + tests while REST remains authoritative for any not-yet-switched client paths during development.
2. Switch `apps/web` screens feature-by-feature behind the same deployment (no feature flag required per ADR): each screen moves to Apollo, then remove its REST/TanStack usage.
3. Run `pnpm --filter @vibe-squire/web build` / `typecheck` and server test suite in CI.
4. Remove TanStack Query dependency when grep shows no remaining consumers in `apps/web`; shrink `main.tsx` providers accordingly.
5. **Rollback:** Revert client commits; server GraphQL additions are backward-compatible additions and do not require rollback unless broken.

## Open Questions

- Exact `activityFeed` node shape vs. current REST payload: confirm field parity during implementation walkthrough of `activity-api.controller.ts` responses.
- Whether `integrationNav` should be a single `JSON`-like scalar vs. structured types — prefer structured GraphQL types for codegen and cache normalization unless the legacy DTO is deeply dynamic.
- Codegen watch vs. one-off `pnpm` script: align with repo’s existing `package.json` patterns when implementing.

## PR / reviewer notes (task 7.3)

- **`activityEvents` payload:** `{ invalidate: boolean }`. When `invalidate` is `true`, the web client refetches `activityFeed` (and related queries as needed). No changed-node embedding in the payload for this iteration.
- **Apollo `InMemoryCache` policies (see `apps/web/src/graphql/apollo-client.ts`):** `Query.mappings` uses `merge` replace-incoming; `Query.activityFeed` uses `relayStylePagination(['first', 'after'])`; `Query.effectiveSettings` uses `merge: true`; `ActivityRunGql`, `ActivityItemGql`, and `MappingGql` use `keyFields: ['id']`.
- **Restored pre-split UX (parity checklist):** Settings — “Sync adapters” card (`SyncAdaptersInfoCard`) + per-field `key` / `envVar` / `description` hints (`GeneralSettingsForm`); Mappings — data table with inline edit/save/cancel + VK repos error handling; Activity — per-run item tables with Review / Decline / Reconsider + `activityEvents` subscription (no polling); manual sync / reinit on Dashboard, General, Activity, and Mappings (`OperatorSyncActions` / dashboard mutations).
