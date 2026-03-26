# Refactoring plan — vibe-squire

This app has no external users yet, so we can refactor aggressively: rename symbols, split modules, and change internal APIs without migration windows. The main constraint is **keeping behavior correct** for our own sanity; tests are the safety net we add as we go.

## Guiding principles

1. **Combined approach** — A short architecture pass (boundaries and vocabulary) plus **vertical slices** (one user-visible flow at a time). Avoid “rewrite everything” and avoid endless module-by-module churn without tests.
2. **Test-first on hot paths** — Large orchestrators (`RunPollCycleService`, MCP integration, UI controller) have thin unit coverage today. Before or alongside extractions, add **integration tests with fake ports** and/or **unit tests for pure extracted functions**.
3. **Small diffs** — Each PR or step should be reviewable: one theme (e.g. “extract poll phase X”, “rename work-board port”).
4. **Match existing style** — Naming, Nest patterns, and file layout should stay consistent unless a batch rename is the explicit goal.

## Phase 0 — Map the system (half day)

Draw or document three layers:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| **Ingress** | HTTP, UI, DTOs | `ui.controller.ts`, API controllers, guards |
| **Orchestration / domain** | Rules and workflows | `RunPollCycleService`, setup evaluation, sync manual run |
| **Adapters** | IO and external systems | `GhCliService`, `VkMcpStdioSessionService` (`VK_MCP_STDIO_SESSION_PORT`), `VibeKanbanMcpService`, Prisma |
| **Orchestration ports (target)** | Role-based DI tokens resolved from `source_type` / `destination_type` | Generic “sync destination board” + factory (see §G); per-vendor adapters behind it |

**Look for:** controllers or services that mix layers (e.g. heavy business logic in `ui.controller.ts`), duplicate validation, or settings reads scattered without going through one refresh/emit path.

Deliverable: a short note or diagram in this file’s appendix, or a linked doc—whatever you will actually maintain.

**Appendix — layer map (Phase 0):** **Ingress** talks HTTP/SSE and renders UI. **Orchestration** (`RunPollCycleService`, setup guards, listeners) applies rules and calls **orchestration ports** (`SYNC_PR_SCOUT_PORT`, `SYNC_DESTINATION_BOARD_PORT`) whose facades read `source_type` / `destination_type`. **Adapters** implement vendor IO: `GhCliService`, `GithubPrScoutService`, `VibeKanbanMcpService`, `VkMcpStdioSessionService` (exposed as `VK_MCP_STDIO_SESSION_PORT`), Prisma. Cross-cutting: `SettingsService`, events (`StatusEventsService`, integration-settings emitter).

## Phase 1 — Stabilize critical paths with tests

**Priority order:**

1. **`RunPollCycleService`** — Highest line count and central behavior. Integration tests override `GithubPrScoutService` / `VibeKanbanMcpService` (board port impl) to cover branches before splitting the class.
2. **`VkMcpIntegrationListener` + settings emit path** — Ensure “settings changed → reconcile MCP / health / status event” stays correct when you rename modules or extract stdio helpers.
3. **`UiController`** — Smoke or focused integration tests for key POST flows if you start moving handlers out.

**Look for:** untested branches (error paths, cooldown, board limits, unmapped repos). Add one test per risky branch rather than 100% coverage on day one.

### Progress (started)

- [x] **`RunPollCycleService` branch coverage** — `test/run-poll-cycle-branches.integration-spec.ts` exercises:
  - `execute('manual')` **setup_incomplete** (no mappings; HTTP would be blocked by `SetupCompleteGuard`, so the service is called directly).
  - `execute('manual')` **gh_not_authenticated** (second Nest app with fake `GhCliService`; same guard note for manual HTTP).
  - **MCP probe failure** → failed run with `mcp_probe:` message.
  - **skipped_bot** and **skipped_board_limit** via `POST /api/sync/run` with VK + scout fakes.
- Each suite calls `PollSchedulerService.onModuleDestroy()` and seeds `scheduled_sync_enabled=false` so scheduled ticks do not interfere.
- [x] **`VkMcpIntegrationListener` + settings emit** — `test/vk-mcp-integration-listener.integration-spec.ts`: bootstrap probe + `PATCH /api/settings` drives `IntegrationSettingsEmitterService` → listener (stdio `shutdown`, health `unknown` / `ok` / `degraded`, destination cleared). `VibeKanbanMcpService` and `VkMcpStdioSessionService` overridden to avoid real MCP/spawn.
- [x] **`UiController` smoke tests** — `test/ui-smoke.integration-spec.ts`: `configureExpressApp` + fake `GhCliService` / `VibeKanbanMcpService`; GET `/ui/dashboard`, `/ui/settings`, `/ui/activity` return 200 with expected copy.

Phase 1 integration coverage is in place for poll-cycle branches, VK MCP listener, and UI smoke. **Phase 2A–2B** (poll pipeline extraction, VK adapter port) and **§G** (destination + source orchestration facades) are done. **Deferred (not on roadmap now):** a second destination/source adapter and narrowing `SyncDestinationBoardPort` until that work resumes.

## Phase 2 — Structural refactors (safe order)

Do these in any order that unblocks you, but **prefer completing Phase 1 tests for a file before splitting it**.

### A. Poll cycle as an explicit pipeline

`RunPollCycleService` is a natural fit for **named phases** with a small shared context (settings snapshot, quotas, logger):

- Load / validate prerequisites  
- Scout PRs (via port)  
- Reconcile issues vs board (mappings, limits, heal)  
- Persist + run state / history  

**Look for:** private methods that are already “steps”; extract to functions or small classes with **typed inputs/outputs** so they can be unit-tested without Nest.

**Progress:** Prerequisites (setup → `gh` auth → board `probe`) live in `run-poll-prerequisites.ts`. Aborted / error scout rows: `persistScoutSkippedAfterPoll` + `persistScoutErrorAfterPoll` in `persist-scout-run-outcome.ts` (with specs); `RunPollCycleService` still calls `completeAborted` / `completeFailed` on `PollRunHistoryService`.

Scout phase (candidates, `urlsNow`, board cap vs `countActiveVibeSquireIssues`, `pr_ignore_author_logins`) is `buildPollScoutContext()` in `src/sync/poll-cycle/poll-scout-context.ts` with `poll-scout-context.spec.ts`. `VkCreateQuota` is defined there and re-exported from `run-poll-cycle.service.ts` for compatibility.

Per-PR loop: `processPollCandidatesLoop()` (`process-poll-candidates.ts`). `EnsureIssueOutcome`: `ensure-issue-outcome.ts`.

**Post-loop success path:** `reconcileRemovedSyncRows()` (`reconcile-removed-sync-rows.ts`), `isTerminalKanbanStatus()` (`kanban-terminal-status.ts`), `upsertScoutStateAfterSuccessfulPoll()` + `formatPollSuccessLog()` (`finalize-successful-poll-cycle.ts`), each with specs. `RunPollCycleService.execute` still calls `pollRunHistory.completeSuccess` and `markPollCompleted` (Nest wiring).

**Kanban copy (titles / workspace names):** `issueTitleForPr`, `workspaceNameForPr`, `isValidVkRepoId` live in `poll-cycle/poll-pr-kanban-copy.ts` with `poll-pr-kanban-copy.spec.ts`. `PLACEHOLDER_VK_REPO_ID` is in `sync-constants.ts`.

**Ensure issue per PR:** `ensureIssueForPr` + `buildPollIssueDescription` in `poll-cycle/ensure-issue-for-pr.ts` (`ensure-issue-for-pr.spec.ts` for description builder). **`looksLikeMcpOrNetworkError`** in `poll-cycle/mcp-network-error-heuristic.ts`. `RunPollCycleService` keeps scheduling, prerequisites, loop wiring, `appendPollRunItem`, `kanbanDoneStatus`, and destination failure side-effects only.

### B. VK-specific adapter port — done (adapter layer)

`VibeKanbanBoardPort` (alias of `SyncDestinationBoardPort`) + `VIBE_KANBAN_BOARD_PORT` name the **Vibe Kanban MCP adapter**. `VibeKanbanMcpService` implements it. **Sync orchestration** injects `SYNC_DESTINATION_BOARD_PORT` (`SyncDestinationBoardFacade`), not this token directly.

This stays useful for **VK-only** wiring (MCP stdio, `VkMcpIntegrationListener`, VK context routes). It is **not** the long-term boundary for “any destination.”

### G. Generic orchestration port + factory — destination + source (v1 done)

**Goal:** `RunPollCycleService` and `src/sync/poll-cycle/*` depend on **role-based** ports resolved from settings: sync destination board (`destination_type`) and PR scout (`source_type`), not concrete VK / GitHub services directly.

**Principles (destination):**

1. **Orchestration port** — `SyncDestinationBoardPort` in `src/ports/sync-destination-board.port.ts` (v1: same surface as VK; **narrow or split** when a second destination differs).
2. **Adapters** — `VibeKanbanMcpService` implements `VibeKanbanBoardPort` (= `SyncDestinationBoardPort`). Future destinations: new services + branch in the facade.
3. **Resolver** — `SyncDestinationBoardFacade` (`src/sync/sync-destination-board.facade.ts`) reads `destination_type` on **each call** and delegates to `VIBE_KANBAN_BOARD_PORT` when `vibe_kanban`; otherwise throws `Sync destination not supported: …`.
4. **Nest tokens** — `SYNC_DESTINATION_BOARD_PORT` → `useExisting: SyncDestinationBoardFacade` in `SyncModule`. Keep `VIBE_KANBAN_BOARD_PORT` for VK-only wiring (stdio, listener, context routes).

**Principles (source, symmetric):**

5. **Orchestration port** — `SyncPrScoutPort` in `src/ports/sync-pr-scout.port.ts` (v1: same surface as GitHub; narrow when a second SCM differs).
6. **Adapters** — `GithubPrScoutService` implements `GithubPrScoutPort` (= `SyncPrScoutPort`). Future sources: new services + branch in `SyncPrScoutFacade`.
7. **Resolver** — `SyncPrScoutFacade` reads `source_type` on **each call** and delegates to `GITHUB_PR_SCOUT_PORT` when `github`; otherwise throws `Sync source not supported: …`.
8. **Nest tokens** — `SYNC_PR_SCOUT_PORT` → `useExisting: SyncPrScoutFacade` in `SyncModule`. Keep `GITHUB_PR_SCOUT_PORT` for scout-module wiring.

**Implementation checklist — destination**

- [x] Orchestration interface `SyncDestinationBoardPort` + token `SYNC_DESTINATION_BOARD_PORT`.
- [x] `SyncDestinationBoardFacade` registered in `SyncModule`; `RunPollCycleService` injects orchestration token.
- [x] `poll-cycle/*` + `RunPollCycleService` use `SyncDestinationBoardPort` / `destinationBoard` deps.
- [x] Unit tests: `sync-destination-board.facade.spec.ts` (VK delegate + unsupported destination).
- [x] Integration tests: still override `VibeKanbanMcpService` — facade receives the stub via `VIBE_KANBAN_BOARD_PORT`.

**Implementation checklist — source**

- [x] Orchestration interface `SyncPrScoutPort` + token `SYNC_PR_SCOUT_PORT`.
- [x] `SyncPrScoutFacade` registered in `SyncModule`; `RunPollCycleService` injects orchestration token.
- [x] `buildPollScoutContext` takes `prScout: SyncPrScoutPort`.
- [x] Unit tests: `sync-pr-scout.facade.spec.ts` (GitHub delegate + unsupported source).
- [x] Integration tests: still override `GithubPrScoutService` — facade receives the stub via `GITHUB_PR_SCOUT_PORT`.

**Roadmap note**

- [x] Document in `README` — sync orchestration table (`source_type` / `destination_type`, tokens, unsupported values).
- [ ] **Deferred:** additional destination/source adapters + facade branches — **not planned for now**; revisit when product needs a second vendor.

**Look for:** forcing every future destination to implement VK-only methods — prefer a **narrow** port or capability splits early (only when adding that second vendor).

### C. MCP stdio and subprocess boundaries

`VkMcpStdioSessionService` centralizes lifecycle. **`VkMcpStdioSessionPort`** (`src/ports/vk-mcp-stdio-session.port.ts`) + **`VK_MCP_STDIO_SESSION_PORT`** wire `shutdown` + `runWithClient`; `VkMcpIntegrationListener` and `VibeKanbanMcpService` inject the port. Integration tests can still `overrideProvider(VkMcpStdioSessionService)` (`useExisting` resolves to the stub).

**Progress:** `isVibeKanbanDestination` / `isVibeKanbanMcpConfigured` accept **`EffectiveSettings`** (`Pick<SettingsService, 'getEffective'>`) in `mcp-transport-config.ts` so call sites and tests do not need a full service shape.

**Look for:** duplicated “is VK destination + MCP configured?” checks; consider one small helper or service used by listener + session + UI.

### D. Events and global module clarity

`StatusEventsModule` bundles status broadcasting and integration-settings emission. Consider splitting or renaming so **“integration settings changed”** vs **“status snapshot changed”** are discoverable for new contributors.

**Progress:** Module JSDoc in `status-events.module.ts` names both providers and notes not to rely on cross-listener order without tests. A future split could move integration emission to its own module if the graph grows.

**Look for:** new features that need `emitAsync` ordering—document whether listeners must be synchronous or can run in parallel.

### E. Validation consistency

Zod is used in several places; class-validator appears on Nest DTOs. Pick a **boundary rule** (e.g. “HTTP body → Zod parse in controller or pipe; class-validator only where Nest requires it”) and converge over time.

**Boundary rule (v1):** Prefer **Zod** for JSON/API payloads and internal parsing; use **class-validator** on Nest DTO classes where the OpenAPI stack or decorators already depend on it. When adding new routes, default to Zod + explicit parse in the handler (or a small pipe) unless there is a strong reason to add a DTO class.

**Look for:** duplicate schemas (same shape validated twice); consolidate to one schema + mapper.

### F. UI controller decomposition

`ui.controller.ts` should become mostly **wiring**: extract form parsers, checklist builders, and label maps to dedicated modules or “presenter” helpers (`integration-ui-registry.ts` / `setting-labels.ts` are a start).

**Progress:** Pure helpers live in `src/ui/ui-presenter.ts` (`escapeForPre`, setup type parsers, labels, `buildSetupChecklist`, `uiNavLocals`, integration guard redirect URLs). Covered by `ui-presenter.spec.ts`. **`buildVibeKanbanPageLocals`** — `src/ui/ui-vibe-kanban-presenter.ts` + `ui-vibe-kanban-presenter.spec.ts` (MCP gate, org/project lists, executor labels). Controller wires HTTP + services only.

**Look for:** functions that do not need `Request`/`Response`—move them out and unit test.

## Phase 3 — Polish and consistency

- **File size:** aim for &lt; ~300 lines per file where it improves navigation; not a hard rule.  
- **Dead code / comments:** remove obsolete “vibe coded” notes if they no longer help.  
- **Docs:** keep `README` / MCP notes in sync when public behavior or env vars change.

**Progress:** No `TODO`/`FIXME`/`vibe coded` markers in `src/` (spot-check when touching files). Larger orchestrators (`RunPollCycleService`, `UiController`) shrink incrementally via extractions above—not a single hard split.

## Commands to run after each slice

```bash
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Fix failures before starting the next slice.

## Success criteria

- Critical flows are covered by integration or focused unit tests.  
- Boundaries (ingress / orchestration / adapters) are obvious from folder names or a one-page map.  
- Names match reality (ports, modules, events).  
- No single file blocks all understanding of “how does one poll cycle work?”  
- **Orchestration** depends on **settings-resolved** destination/source ports (§G), not on a single vendor type, once §G is implemented.

---

## Appendix — Optional checklist per PR

- [ ] Behavior change intentional? If not, tests added or extended first.  
- [ ] Layer violation reduced (not increased)?  
- [ ] Public HTTP/API or env contract updated in docs if needed?  
- [ ] `npm test` + `npm run test:integration` + `npm run build` green?
