---
id: P2.5
title: Sunset duplicate REST/SSE surfaces superseded by GraphQL
status: todo
impact: L
urgency: later
tags:
  - area:graphql
  - area:status
  - area:ui
  - theme:release
  - theme:dx
openspec: recommended
updated: 2026-04-20
roadmap_ref: P2.5
depends_on:
  - P2.4
adr_refs:
  - 001-graphql-pilot.md
---

## Problem / outcome

After every web consumer is on GraphQL, decide per endpoint whether to delete the REST/SSE equivalent or keep it (operator-tool endpoints that are convenient from `curl` / `gh` CLI / shell scripts should stay). Update architecture docs so future contributors and agents know the transport policy.

## Acceptance criteria

- [ ] Decision table published in `docs/ARCHITECTURE.md` listing each previously REST-exposed surface with status: `removed`, `kept (operator tool)`, or `kept (internal)`. Include reasoning in one sentence per row.
- [ ] **SSE endpoint removed:** `GET /api/status/stream` and its `@Sse` handler deleted; `StatusEventsService.updates()` now only feeds the GraphQL PubSub.
- [ ] **REST GET endpoints removed** where fully covered by GraphQL (e.g. `GET /api/status`, `GET /api/ui/*` reads, settings GETs, mappings GETs, activity GETs). Each removal is a separate commit or a clearly bullet-pointed PR for reversibility.
- [ ] **REST endpoints kept** (default candidates; adjust per the decision table): `POST /api/sync/run`, `POST /api/reinit`, Swagger / OpenAPI endpoints if useful. Justify each keeper in the decision table.
- [ ] Integration tests for removed endpoints are deleted; tests for kept endpoints stay. GraphQL integration specs remain the coverage for removed REST surfaces.
- [ ] `apps/server/src/ui/operator-bff.controller.ts` slimmed or deleted if its surface is fully superseded.
- [ ] `AGENTS.md` and `.cursor/rules/architecture.mdc` updated to reflect the transport change (mention `/graphql`, WebSocket subscriptions, and the remaining REST surface).
- [ ] `nestjs-zod` usage audited — legacy class-validator DTOs may no longer have consumers.

## Notes

- OpenSpec recommended because: removing API endpoints, even internal ones, warrants a documented change proposal in the archive. A short "to remove" vs "to keep" list is cheap insurance against future debate.
- Do not remove the SSE endpoint before the web client's last SSE consumer is gone (verified in `P2.3` and `P2.4`). Double-check by grepping `apps/web/src/` for `EventSource` before cutting.
- Bundle-size check after cleanup: confirm the dev-only Apollo Sandbox gating did not leak into prod, and that removed controllers actually drop their imports from the server bundle.
- For every endpoint marked "kept (operator tool)" in the decision table, include one sentence of justification so the rationale survives in `docs/ARCHITECTURE.md` and is not re-litigated later.
