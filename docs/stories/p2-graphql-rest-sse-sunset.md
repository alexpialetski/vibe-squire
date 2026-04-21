---
id: P2.5
title: Sunset duplicate REST/SSE surfaces superseded by GraphQL
status: done
impact: L
urgency: later
tags:
  - area:graphql
  - area:status
  - area:ui
  - theme:release
  - theme:dx
openspec: recommended
updated: 2026-04-21
roadmap_ref: P2.5
depends_on:
  - P2.4
adr_refs:
  - 001-graphql-pilot.md
---

## Problem / outcome

After **every** consumer of a REST/SSE surface is migrated (web, integration tests, smoke tests, scripts, docs examples) — or explicitly exempted — decide per endpoint whether to delete the REST/SSE equivalent or keep it (operator-tool endpoints that are convenient from `curl` / `gh` CLI / shell scripts should stay). Update architecture docs so future contributors and agents know the transport policy.

**Do not delete controllers or routes “because GraphQL exists”** while `apps/web` still calls the same paths via `fetch` / `apiJson` or while tests/docs rely on them. P2.4 moved the operator console and dashboard setup detail onto GraphQL; **integration-only pages** may still use REST until a dedicated migration or a documented permanent REST carve-out (see Notes).

## Acceptance criteria

- [x] Decision table published in `docs/ARCHITECTURE.md` listing each previously REST-exposed surface with status: `removed`, `kept (operator tool)`, or `kept (internal)`. Include reasoning in one sentence per row.
- [x] **SSE endpoint removed:** `GET /api/status/stream` and its `@Sse` handler deleted; `StatusEventsService.updates()` now only feeds the GraphQL PubSub.
- [x] **REST GET endpoints removed** only where **no remaining callers** exist (grep `apps/web`, `apps/server/test`, `README`, scripts). Candidates once clear include: `GET /api/status`, `GET /api/ui/setup` (superseded for web by GraphQL `dashboardSetup` — still verify smoke tests and any external tooling), other `GET /api/ui/*` reads, settings/mappings/activity GETs that duplicate GraphQL. Each removal is a separate commit or a clearly bullet-pointed PR for reversibility.
- [x] **Web REST holdouts closed or documented:** today `apps/web/src/api.ts` (`apiJson`) is still used from `GithubPage`, `VibeKanbanPage`, and VK repo loading on `MappingsPage` (paths under `/api/ui/*`, `/api/vibe-kanban/*`, `/api/settings/*`). Either migrate these to GraphQL and then drop the redundant REST reads/writes, or list them as **kept (REST)** in the decision table with rationale — do not leave them implicit.
- [x] **REST endpoints kept** (default candidates; adjust per the decision table): `POST /api/sync/run`, `POST /api/reinit`, Swagger / OpenAPI endpoints if useful. Justify each keeper in the decision table.
- [x] Integration tests for removed endpoints are deleted; tests for kept endpoints stay. GraphQL integration specs remain the coverage for removed REST surfaces.
- [x] `apps/server/src/ui/operator-bff.controller.ts` slimmed or deleted if its surface is fully superseded.
- [x] `AGENTS.md` and `.cursor/rules/architecture.mdc` updated to reflect the transport change (mention `/graphql`, WebSocket subscriptions, and the remaining REST surface).
- [x] `nestjs-zod` usage audited — legacy class-validator DTOs may no longer have consumers.

## Notes

- OpenSpec recommended because: removing API endpoints, even internal ones, warrants a documented change proposal in the archive. A short "to remove" vs "to keep" list is cheap insurance against future debate.
- Do not remove the SSE endpoint before the web client's last SSE consumer is gone (verified in `P2.3` and `P2.4`). Double-check by grepping `apps/web/src/` for `EventSource` before cutting.
- **Pre-flight before any REST deletion:** `rg 'apiJson|/api/' apps/web/src` (and any other clients) so GitHub/Vibe Kanban/Mappings VK flows are not accidentally broken. Same for `apps/server/test` and `README` API tables.
- **`GET /api/ui/setup`:** Web dashboard consumes `dashboardSetup` on GraphQL; REST can remain as an operator/smoke surface until the decision table says otherwise — if removed, update `ui-smoke.integration-spec.ts` and docs that still mention the route.
- Bundle-size check after cleanup: confirm the dev-only Apollo Sandbox gating did not leak into prod, and that removed controllers actually drop their imports from the server bundle.
- For every endpoint marked "kept (operator tool)" in the decision table, include one sentence of justification so the rationale survives in `docs/ARCHITECTURE.md` and is not re-litigated later.
