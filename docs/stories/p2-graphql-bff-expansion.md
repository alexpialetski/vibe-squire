---
id: P2.4
title: Migrate operator BFF (settings, mappings, activity) to GraphQL
status: todo
impact: M
urgency: later
tags:
  - area:graphql
  - area:ui
  - area:web
  - slice:settings
  - slice:mappings
  - slice:activity
openspec: recommended
updated: 2026-04-20
roadmap_ref: P2.4
depends_on:
  - P2.3
adr_refs:
  - 001-graphql-pilot.md
---

## Problem / outcome

With the pattern established on the status surface, port the remaining operator BFF read and write paths (`/api/ui/*`, settings, mappings, activity, manual sync trigger) to GraphQL. Each REST endpoint stays live until every consumer is migrated — no sunset yet.

Covered surfaces (map to existing modules):

- Settings — `apps/server/src/settings/` (read effective settings, PATCH updates).
- Mappings — `apps/server/src/mappings/` (list / upsert / delete repo→project mappings).
- Activity — `apps/server/src/ui/activity-api.controller.ts` (recent poll runs, per-PR items).
- Sync control — `apps/server/src/sync/` (manual `run`, reinit).
- Integration UI nav — `apps/server/src/ui/ui-nav.service.ts` (aggregated per-integration nav).

## Acceptance criteria

- [ ] **Queries:** `effectiveSettings`, `mappings`, `activityFeed(limit: Int, cursor: ID)`, `integrationNav`, plus anything the remaining web screens need (walk each screen and list the query).
- [ ] **Mutations:** `updateSettings(input: …)`, `upsertMapping(input: …)`, `deleteMapping(id: …)`, `triggerSync`, `reinitIntegration(type: …)`. Return shapes match current REST responses closely enough for the web client to drop in.
- [ ] **Subscriptions (opportunistic):** `activityEvents` if the activity feed benefits from live updates; otherwise defer. Decision documented in the PR.
- [ ] Web screens — settings, mappings, activity, sync-trigger button — switched over from TanStack Query/REST to Apollo hooks.
- [ ] TanStack Query is removed from `apps/web/package.json` if no remaining consumer uses it after this story. If any screen is intentionally kept on REST (e.g. because the endpoint is a pure command-and-forget), note it in the PR and leave the dep.
- [ ] Integration tests under `apps/server/test/` added or extended to cover each new resolver; existing REST integration tests stay passing.
- [ ] Zod↔GraphQL bridging follows the pattern chosen in `P2.2`.
- [ ] Apollo cache keys verified: list queries + single-item reads cache-share where appropriate (e.g. a `mappings` query followed by an `upsertMapping` mutation updates the list without a manual refetch).

## Notes

- OpenSpec recommended because: touches most product surfaces and changes the API consumed by the web client. Produce a short OpenSpec change proposal covering the full resolver surface before starting implementation.
- Use optimistic responses on `upsertMapping` / `deleteMapping` / `updateSettings` for a tangible UX improvement over the current refetch-after-success flow.
- Pagination on `activityFeed`: use Relay-style cursor connections — the spec is well-defined, matches the append-only nature of the activity log, and avoids rework when entries grow.
- Cache invalidation is the likely complexity sink. Define field policies (`merge` / `read`) deliberately for list queries that are mutated (mappings, settings) rather than relying on manual `refetchQueries`.
