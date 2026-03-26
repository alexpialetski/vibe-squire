# Vibe-Squire — Requirements & Technical Agreements

This document is the single source of truth for product scope and engineering decisions. It supersedes informal notes in `initial.md` where they conflict.

**References**

- [Vibe Kanban MCP Server](https://vibekanban.com/docs) — example destination; local MCP via `npx vibe-kanban@latest --mcp` (stdio; HTTP transport optional).
- Local copy: `vibe-kanban-mcp-server.md`.

---

## 1. Project identity

| Field    | Agreement     |
| -------- | ------------- |
| **Name** | `vibe-squire` |

| **Role** | Extensible, **local** background orchestrator that polls external systems (**Scouts**), normalizes findings into **task candidates**, and syncs them into **one or more work-tracking destinations** (e.g. Vibe Kanban today; other MCP- or API-based systems later). |
| **Topology** | **Pull-based polling** for scouts. **HTTP server** on **localhost** for operator UI: **setup / settings**, **sync schedule** (“next sync in” + **run now** — §9.4), status API, **Server-Sent Events (SSE)**, and control actions (e.g. reinit). No requirement for **public** inbound exposure; bind to **`127.0.0.1`** by default unless overridden via **effective configuration** (§5). **Distribution:** publish to **npm** and run via **`npx`** (§13.1). |

---

## 2. Architecture: hexagonal (ports & adapters)

The codebase must follow **hexagonal architecture** so **core logic** does not depend on Vibe Kanban, SQLite, NestJS HTTP, or `gh` directly.

### 2.1 Core (domain + application)

- **Domain concepts:** Task candidate (stable external id, title, URLs, metadata), sync/dedupe rules, scout run results, **application health aggregate** (exposed via API/SSE — §9), **repository ↔ board routing configuration** (§4).
- **Inbound ports (application API):** Services invoked by adapters or Nest controllers — e.g. “run poll cycle”, **“run sync now”** (manual trigger — §9.4), “get status snapshot”, “reinitialize after operator action”, **CRUD for setup/mappings** (§4), **CRUD for runtime settings** (§5).
- **Outbound ports (interfaces):**
  - **`Scout`** — Poll a **source** (GitHub via `gh`, later others); return normalized **task candidates** (no knowledge of destinations).
  - **`WorkBoardDestination`** (or equivalent name) — List/create/update **work items** on a **specific system** (Vibe Kanban via MCP, future: other boards). The core uses this abstraction only; **multiple destinations** may be configured.
  - **`AppStateRepository`** — Persist cursors, last poll times, dedupe keys, **user configuration** (mappings §4, **runtime settings** §5), and related metadata — backed by **SQL** (§7), not ad hoc JSON unless used only as export/debug.

### 2.2 Adapters (infrastructure)

- **Driving adapters:** NestJS **controllers** (HTTP + SSE), schedulers (cron/interval), CLI entrypoints if any — they call **application services**, not databases or `gh` directly from controllers except through injected use cases.
- **Driven adapters:**
  - **GitHub:** `child_process` + **`gh` CLI** (see §8); use **effective `GH_HOST`** from §5 when spawning or env-injecting.
  - **Vibe Kanban:** MCP client adapter implementing **`WorkBoardDestination`** (`list_issues`, `create_issue`, `update_issue`, etc. — see §6); connects using **effective MCP base URL** from §5.
  - **Future destinations:** New adapters implementing the same port (e.g. another MCP server, REST API).
  - **SQLite:** Adapter implementing persistence port (ORM in §7).

**Rule:** NestJS modules wire ports to implementations; **domain and application layers** import **interfaces**, not concrete MCP/SDK types.

---

## 3. Functional requirements

### 3.1 Scout architecture (plugins)

Each **Scout** implements the **outbound scout port**:

1. **Polling** — Query a specific external source on a schedule (e.g. GitHub; later Linear/Jira/Slack).
2. **Normalization** — Map external events into a shared **task candidate** shape for the dispatcher. For GitHub PRs, include **base repository** identity (`owner/repo`) for routing (§4).

Scouts do **not** call work-board APIs; they return candidates to the **dispatcher**.

### 3.2 Core engine (dispatcher)

The dispatcher:

1. **Routing** — For each candidate, resolve the **target work-board context** using **stored configuration** (§4): e.g. GitHub **`owner/repo`** → Vibe Kanban **`project_id`** (and **`organization_id`** when required for API calls). Support **multiple destinations** in the design; v1 may configure a single Vibe Kanban destination with many repo→project rows.
2. **Unmapped repos** — If a PR’s base repo has **no mapping** and no **optional default project** policy is configured, **do not** create an issue; **log** and surface in status (e.g. “skipped: unmapped repo”). Policy for default vs strict must be **explicit** in settings.
3. **Deduplication** — Before creating work, use the destination port to **list/search** existing items with the **same `project_id`** (and equivalent scoping for other destinations). Apply a documented **matching rule** (e.g. PR URL or `owner/repo#number` in title or description). **Dedupe is always scoped** to the target project (or destination-specific equivalent) so issues in other projects are not mistaken for matches.
4. **State awareness** — Use returned **status** (or equivalent) so completed or in-progress items are not duplicated.
5. **Creation / updates** — Create or update items through the **destination port**, passing the resolved **`project_id`** (Vibe Kanban) or analogous fields for other adapters.
6. **Prompt / description templating** — Map event types to default text per destination capabilities (description body, tags, priority where supported).
7. **Reconciliation — PR left review queue (v1)** — After applying **new** PRs from the scout, reconcile **open** board issues that **match** a PR by the same **dedupe rule** as **point 3** above but whose PR **no longer appears** in the **latest** scout result (e.g. no longer in **`review-requested:@me`**). For each such issue still in a **non-terminal** status, call **`update_issue`** (or destination equivalent) to set a **closed** / **done** terminal **status** permitted by Vibe Kanban. **Skip** issues already terminal. **Semantics:** “Off my review queue” — the raw list does not distinguish merged, closed, or reviewer removed; all are treated the same for v1. **Optional later:** refine using **`gh pr view`** or API when merge/close detection is required.

### 3.3 Initial scout: GitHub PR review requests (v1)

| Item                        | Agreement                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Detection**               | **`gh pr list --search "review-requested:@me"`** (or equivalent documented `gh` invocation).                                                                                                                       |
| **Repository key**          | Use the PR’s **base** repository (`owner/repo`) for **mapping** and dedupe identity (fork PRs target the base repo, not the fork head).                                                                            |
| **Action**                  | For each PR that passes routing and dedupe, create a **work item** in the **mapped** Kanban **project** with title/description reflecting the PR; map **status** / **priority** to what the destination supports.  |
| **PR leaves queue**         | If a PR **disappears** from the scout’s latest results (no longer **`review-requested:@me`**), **close** the **matched** Kanban issue (terminal **status** via **`update_issue`**) if it is still open — **§3.2**. |
| **Default prompt template** | _Examine the diff for PR [URL]. Highlight architectural risks and logic bugs. Provide a summary report in the workspace._                                                                                          |

### 3.4 Roadmap (out of v1 unless specified)

- Additional **`WorkBoardDestination`** adapters (same port, different backends).
- **Linear / Jira scout**, **Slack scout**, **Calendar scout** — same scout port pattern.
- **Optional:** Link GitHub `owner/repo` to Vibe Kanban **`repo_id`** (from `list_repos`) for alignment with **workspace / `start_workspace`** flows — not required for “create issue from PR” v1.

---

## 4. Configuration, setup, and GitHub ↔ Kanban mapping

### 4.1 Why project context is required

Vibe Kanban organizes work into **organisations** and **projects**. MCP tools such as **`list_projects`** require **`organization_id`**; **`create_issue`** accepts optional **`project_id`** but the product **must** set **`project_id`** whenever issues must land in a known board — and **`list_issues`** / dedupe should use the **same** **`project_id`** scope.

### 4.2 Mapping model (v1)

| Concept                  | Agreement                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary key (source)** | GitHub repository **`owner/repo`** (base repo for the PR).                                                                                                                                   |
| **Target (Vibe Kanban)** | **`project_id`** (UUID) where issues from that repo are created. Persist **`organization_id`** if the app needs it for `list_projects` or other calls.                                       |
| **Cardinality**          | **One row per `owner/repo` → one `project_id`** is the normal case. Deliberate **one repo → multiple projects** (duplicate issues) is out of scope for v1 unless explicitly specified later. |
| **Storage**              | **SQLite** via the configuration / app-state persistence port; **no** reliance on hand-edited JSON for production config.                                                                    |

### 4.3 Setup & settings UI (operator)

Before the GitHub PR scout can sync meaningfully, the user completes (or updates) configuration through the **frontend** backed by Nest APIs:

1. **Validate** connectivity prerequisites: **`gh`** (§8) and **Vibe Kanban MCP reachable** at the **effective MCP URL** (§5) — aligned with overall status §9.
2. **Choose organisation** — Load organisations via MCP (`list_organizations`), then **projects** via **`list_projects`** with selected **`organization_id`**.
3. **Define mappings** — Add, edit, remove rows: **GitHub `owner/repo`** → **Kanban `project_id`** (with labels for display, e.g. project name).
4. **Optional default project** — If enabled, PRs from **unmapped** repos create issues in that project; if disabled, unmapped PRs are **skipped** (§3.2).

**Ongoing:** Same screen (or section) for **add/change/remove** mappings without reinstalling the app.

### 4.4 Setup-complete gate

| State          | Behavior                                                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incomplete** | e.g. zero mappings **and** no usable default project, or destination not configured. GitHub PR scout **must not** run as “healthy sync” — **idle / skipped** with a clear **reason** in **overall status** and **SSE** (§9). |
| **Complete**   | At least one mapping **or** a valid default project policy; scouts may run per other guards (`gh` auth, MCP reachable).                                                                                                      |

### 4.5 Relation to Vibe Kanban “repositories”

Vibe Kanban **`list_repos`** returns **Kanban-side** repository records (for workspaces, scripts, etc.). **v1 does not require** mapping to **`repo_id`** for issue creation. An optional later enhancement can link **`owner/repo`** to **`repo_id`** for workflows that combine **issues** and **start_workspace**.

---

## 5. Runtime configuration: env vars, SQLite settings, and MCP prerequisite

### 5.1 Single process per machine

- **One running `vibe-squire` process** per **SQLite database file** (typical: one per machine / user profile). Multiple instances contending on the same file are **unsupported** in v1; document this for operators (systemd / pm2 must not start duplicates).

### 5.2 Vibe Kanban MCP prerequisite and connection

- The **Vibe Kanban MCP server** (HTTP transport) is expected to be **already running** and **reachable** before sync — the same class of **external prerequisite** as **`gh`** (operator starts or installs it separately).
- **v1:** vibe-squire connects using a configurable **base URL** (env and/or SQLite — §5.3–5.4). Spawning **`npx vibe-kanban --mcp`** stdio from inside vibe-squire is **out of scope** for v1 unless explicitly added later.
- **Protocol (not generic REST):** Use an **MCP client** with **HTTP transport** (e.g. **`@modelcontextprotocol/sdk`**). The wire format is **Model Context Protocol** (e.g. JSON-RPC–style **`tools/list`**, **`tools/call`**), **not** ad-hoc REST resources unless Vibe Kanban separately documents a public REST API for the same operations.
- Bootstrap and **reinit** (§10) must **probe** MCP reachability (lightweight MCP **initialize** / **tools** ping or documented health) and reflect **ok | degraded | error** in **overall status** (§9).

### 5.3 Precedence (effective configuration)

For each tunable key, resolve **effective value** in this order:

1. **Environment variable** — if **set** (non-empty), use it (12-factor / systemd / Docker).
2. **SQLite** — user-edited value from **settings** storage.
3. **Code default** — compiled-in default when no env and no DB row.

Document exact **env var names** and **setting keys** in README / OpenAPI.

### 5.4 Settings stored in SQLite (v1 minimum)

Persist at least:

| Area        | Examples (keys / semantics)                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **MCP**     | **Vibe Kanban MCP base URL** (same logical setting as env, e.g. `VK_MCP_URL`).                                           |
| **GitHub**  | **`gh_host`** — maps to **`GH_HOST`** for `gh` / GitHub Enterprise (empty = default github.com behavior).                |
| **Polling** | **Base poll interval** (minutes), **jitter** (seconds or range), **run-now cooldown** (seconds) — align with §12 / §9.4. |

**HTTP bind** (`HOST`, `PORT` for vibe-squire’s own API) may remain **env-only** for process managers; if stored in SQLite, apply **restart or dynamic reload** policy and document it.

All of the above have **code defaults**; SQLite rows may be created lazily on first edit or seeded by migration.

### 5.5 NestJS modules: process env (`parseAppEnv` / `APP_ENV`) vs `SettingsService` (not CLS)

- **Process environment** — **`parseAppEnv`** (Zod in `src/config/env-schema.ts`) validates env at bootstrap (e.g. `DATABASE_URL`, `PORT`, `LOG_LEVEL`), produces a typed **`AppEnv`**, and registers it for DI via the **`APP_ENV`** token (`EnvModule.forRoot`). **`AppModule.forRoot(env)`** (with a parsed **`AppEnv`**) must be used to wire the graph (the `AppModule` class alone has no feature imports). **Do not** use **CLS** (continuation-local storage) for **global** application settings; CLS is for **per-request** context (e.g. correlation IDs), not process-wide config.
- **`SettingsModule` + `SettingsService`** — Read settings from SQLite on startup, keep an **in-memory cache** of resolved **effective** values, expose `getEffective(key)` (or equivalent) using **§5.3** precedence.
- **On settings write** (REST from UI): update SQLite, **refresh cache**, emit a **`SettingsChanged`** (or domain) **event** so **schedulers** re-read interval/jitter and **recompute `nextPollAt`** (§12), and **SSE** pushes an updated status snapshot (§9).

### 5.6 Adapter behavior

- **`gh` runner:** pass **`GH_HOST`** (or equivalent) from **effective `gh_host`** into the child process environment for every invocation.
- **MCP client:** use **effective MCP base URL** only with the **SDK HTTP transport**; never hardcode; do not replace the MCP client with undocumented raw **`fetch`** REST unless explicitly specified.

### 5.7 SQLite database file location

The database file must live in a **user-writable** path **outside** the **npm package** and **`npx` extract/cache** directories (those are not durable or appropriate for SQLite).

| Rule                             | Agreement                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default directory (examples)** | **Linux:** `~/.local/state/vibe-squire/` (respect **`XDG_STATE_HOME`** when set). **macOS:** `~/Library/Application Support/vibe-squire/`. **Windows:** `%APPDATA%\vibe-squire\`. Default **filename** e.g. `vibe-squire.db` (exact name documented in README). |
| **Env override**                 | Support at least one of: **`VIBE_SQUIRE_DATA_DIR`** (directory; app creates it and uses a fixed filename inside) and/or **`SQLITE_DATABASE_PATH`** / **`DATABASE_PATH`** (full path to the `.db` file). Precedence: **env →** then default paths above.         |
| **Startup**                      | **Create parent directories** if missing before opening the DB.                                                                                                                                                                                                 |
| **Tests / CI**                   | Use **`:memory:`** or a **temporary file**; never rely on the user data path.                                                                                                                                                                                   |

---

## 6. Reference: Vibe Kanban as one destination

When the configured destination is Vibe Kanban, use **official** MCP tool names (see `vibe-kanban-mcp-server.md`).

**Typical surface:**

| Concern         | MCP tools (examples)                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| List / inspect  | `list_issues` (**with `project_id`** for scoped dedupe), `get_issue`                                                         |
| Create / update | `create_issue` (**supply `project_id`** per mapping), `update_issue` (**including terminal status** when reconciling — §3.2) |
| Project context | `list_organizations`, `list_projects` as needed                                                                              |

**Transport (v1):** **MCP over HTTP** to a **running** server at the URL from **§5**, via **`@modelcontextprotocol/sdk`** (or equivalent) **HTTP client** — same tools as stdio MCP, different transport. This is **not** “call Vibe Kanban as a regular REST CRUD API” unless upstream documents such an API. Stdio MCP remains a possible future adapter variant.

---

## 7. Technical stack

| Area             | Agreement                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**    | **NestJS** — modules, DI, lifecycle hooks for bootstrap checks, schedulers, and HTTP/SSE.                                                                                                                                                                                                                                                                                                                                                                                              |
| **Runtime**      | **Node.js** (LTS).                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **SQL database** | **SQLite** for v1 (single file, local dev simplicity). Access via a Nest-friendly stack (**TypeORM**, **Prisma**, or **Drizzle** — pick one and document in README). **File path** rules: **§5.7**.                                                                                                                                                                                                                                                                                    |
| **Migrations**   | Schema changes **versioned** (migration files in repo); no manual “edit the sqlite file” as the primary workflow. **Apply pending migrations automatically on application bootstrap** after the DB path is resolved and **before** the HTTP server accepts traffic — **idempotent**, fast, suitable for **`npx vibe-squire`** with no separate migrate step. Optional **`vibe-squire migrate`** (or equivalent) subcommand for operators who want an explicit CLI; document in README. |
| **JSON files**   | **Optional** for debug export only; **authoritative** operational state lives in **SQL** (poll cursors, errors, **mappings**, **runtime settings** §5, etc.).                                                                                                                                                                                                                                                                                                                          |
| **Job queue**    | **No BullMQ / Redis for v1.** Scheduling = Nest **scheduler** or interval + **in-process exponential backoff**; persist “next run” / backoff in SQLite if needed across restarts.                                                                                                                                                                                                                                                                                                      |
| **GitHub**       | **`gh` CLI** + `gh auth`; see §8.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **MCP client**   | `@modelcontextprotocol/sdk` (or equivalent) **inside** the Vibe Kanban adapter only — **HTTP transport** for MCP (**§5.2**, **§6**), not hand-rolled REST.                                                                                                                                                                                                                                                                                                                             |
| **Secrets**      | Env vars / OS patterns; never commit credentials.                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## 8. GitHub CLI: authentication & startup checks

| Requirement  | Agreement                                                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Startup**  | On application bootstrap, run a **non-interactive** check that `gh` is installed and **authenticated** (e.g. `gh auth status` or equivalent that exits successfully only when logged in).                                                            |
| **Failure**  | If the check fails, the app **still runs** (HTTP + SSE remain available) but **overall status** must show **GitHub / `gh` unavailable or unauthenticated**; **GitHub-dependent scouts must not run** as if healthy (skip or idle with clear reason). |
| **Recovery** | After the user runs `gh auth login` (or fixes VPN/path), they must be able to **re-run checks without manually killing the OS process** — see **§10 Restart / reinit**.                                                                              |

---

## 9. Observability: overall status, SSE, and operator UI contract

### 9.1 Overall application status

Expose a **single aggregate model** (for API + SSE) including at least:

- **`gh`:** ok | not installed | not authenticated | error (message).
- **Database:** ok | error.
- **Setup:** complete | incomplete — with **reason** (e.g. missing mappings, no default project, destination not configured) — see §4.
- **Each configured destination** (e.g. Vibe Kanban MCP): ok | degraded | error (message), last successful call time if applicable.
- **Configuration (non-secret):** Whether **MCP URL** and **`gh_host`** overrides are **in effect** (boolean or redacted host), for operator debugging — see §5.
- **Scheduler / scouts:** idle | running | skipped (reason) | error per scout; **`lastPollAt`**, **`nextPollAt`** (machine-readable timestamps for countdown UI), last error.
- **Manual sync:** whether a **run-now** is allowed (e.g. not already running, cooldown satisfied — §9.4).
- **Timestamp** of the snapshot.

This drives both **JSON API** responses and **SSE** payloads.

### 9.2 Server-Sent Events (SSE)

- Provide an **SSE endpoint** consumed by the **frontend application** (separate repo or same monorepo — not prescribed here).
- **Events:** Push **status snapshot** updates when material changes occur (bootstrap complete, `gh` recheck, poll finished, **manual sync started/completed**, destination error, reinit completed, **mapping or setup changed**, **runtime settings changed**). Optionally **heartbeat** at a low rate if the client needs keep-alive.
- **Scope:** **Localhost-first**; same binding and security assumptions as the HTTP API (**§14**).

### 9.3 Logging

Structured logging (Nest **Logger** or **pino**) for polls, MCP errors, and `gh` failures; correlate with status fields where useful.

### 9.4 Sync schedule UI: “next sync” and run now

The operator UI includes a **sync schedule** area (dedicated page or dashboard section):

| Requirement               | Agreement                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next sync**             | Surface **`nextPollAt`** (and optionally **`lastPollAt`**) from the status model so the client can show **“Next sync in …”** (countdown derived client-side from ISO / epoch timestamps). Per-scout times if intervals differ; otherwise one global **next** time. |
| **Run now**               | **HTTP POST** (or equivalent) **“Sync now” / “Run poll now”** invokes the same **poll pipeline** as the scheduled run (subject to guards: setup complete, `gh` ok for GitHub scout, destination reachable — same rules as automatic runs).                         |
| **Scope (v1)**            | Trigger **all enabled scouts** in one action unless a scout is individually skipped (e.g. setup incomplete for that source). **Per-scout “sync now”** is a **roadmap** enhancement.                                                                                |
| **While running**         | Status shows **running** / **syncing**; the button is **disabled** or request is **rejected** until the run finishes to avoid **overlapping** polls.                                                                                                               |
| **Cooldown**              | After **run now** (and after each scheduled run), enforce a **configurable minimum gap** (effective value from §5) before another **run now**; reflect **disabled + reason** in status when cooldown active.                                                       |
| **Scheduler interaction** | After a **successful manual run**, **reset the next scheduled tick** from **`now + interval (+ jitter)`** (same policy as §12) so the UI countdown stays coherent.                                                                                                 |

**SSE:** Emit updated snapshots when a manual run **starts**, **ends** (success or failure), and when **`nextPollAt`** changes.

---

## 10. Restart / reinit (operator control)

| Requirement          | Agreement                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use case**         | User fixed `gh` auth (or VPN) while the server was already running; they need the app to **re-evaluate** readiness and **resume** scouts without guessing.                                                                                                                                                                                       |
| **Primary behavior** | **Soft reinit:** HTTP **POST** (or PATCH) action **“Restart / Reinitialize”** that: re-runs **`gh` auth check**, re-probes **database**, re-validates **destination** (MCP **§5**) connections where feasible, clears or updates **degraded** flags, and **resumes** the normal scheduling loop. **Process exit is not required** for this flow. |
| **Optional**         | Document whether a **hard restart** (exit code for process manager) is supported later; v1 emphasizes **soft reinit**.                                                                                                                                                                                                                           |
| **UI**               | Frontend shows a **button** (e.g. “Restart” / “Reconnect”) wired to this endpoint; after success, UI updates via SSE.                                                                                                                                                                                                                            |

---

## 11. Resilience & backoff

- Network / MCP / `gh` errors: log, persist error summary for status, apply **backoff**; do not tight-loop.
- VPN disconnected: **degraded** status; process stays up; retries per backoff.
- **Idempotency:** Repeated polls must not create duplicate work items when matching rules are correct **within each target project**.

---

## 12. Polling & timing

- **Base interval:** Configurable via **effective settings** (§5); recommend **5–15 minutes** for GitHub PRs unless rate limits dictate otherwise — **code default** documented in README.
- **Jitter:** Small random delay when multiple scouts exist; **effective** from §5.
- **Manual run (§9.4):** After **run now** completes, compute the **next** scheduled execution as **`now + interval (+ jitter)`** so automatic and manual schedules do not fight.
- **Persist** **`nextPollAt`** (or enough data to derive it) in **SQLite** so the countdown survives process restarts.
- **On settings change** (§5): **recompute** schedule from **new** effective interval/jitter without requiring process restart (unless bind address changed and product requires restart — document).

---

## 13. Deployment & process management

| Topic              | Agreement                                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preferred (v1)** | Run **NestJS** **natively in WSL** (or host OS) for **`gh`**, **VPN**, and MCP behavior aligned with the developer environment. **systemd** user unit, **pm2**, or similar with **restart on failure**. **Ensure a single instance** per DB (§5.1). |
| **Docker**         | **Optional**; document `gh` mount or token strategy, **MCP URL** reachability on the container network, **§5.1**, and **persisted volume** for the SQLite file (§5.7).                                                                              |

### 13.1 Distribution via npm and `npx`

- Publish a **`vibe-squire`** package (or scoped **`@org/vibe-squire`**) to the **public npm registry** (or private registry — document for enterprise).
- **`package.json`** declares a **`bin`** field mapping the CLI name to a **compiled** entry point (e.g. **`dist/main.js`** with `#!/usr/bin/env node`, or a one-line wrapper script).
- **End users** run e.g. **`npx vibe-squire@latest`** (or a **pinned version**) without a global install, analogous in spirit to **`npx vibe-kanban@latest --mcp`** for Vibe Kanban’s CLI usage.
- **Publish pipeline:** run **`nest build`** (or project equivalent), include **`dist/`** (and only needed assets) via **`files`** in `package.json`; document **Node.js LTS** requirement. If the SQLite driver uses **native addons**, document **prebuild** / platform support.
- **Prerequisites unchanged:** **`gh`** and **Vibe Kanban MCP** are **not** installed by `npx`; operators still provide them (§5.2, §8).
- **Data:** the SQLite file is created under **§5.7** defaults or env — **never** inside the extracted package under the npm cache.

### 13.2 Migrations and `npx` startup

- A single command **`npx vibe-squire`** must leave the database at the **current schema**: migrations run per **§7** on **each process start** before serving. No mandatory separate **`migrate`** step for normal use (optional subcommand remains allowed).

---

## 14. Security summary

- **Default bind:** **`127.0.0.1`** for HTTP/SSE unless explicitly configured otherwise (e.g. trusted LAN — document risk).
- **No public exposure** required for core operation.
- **Credentials:** `gh` auth and env; no secrets in git.
- **Reinit endpoint** and **sync-now (§9.4):** Treat as **operator-only** (localhost assumption); if exposed beyond loopback later, add **auth** (out of v1 unless needed).
- **Status / SSE:** Do not leak full MCP URLs or tokens in logs if they contain secrets; **redact** where appropriate.

---

## 15. Implementation pointer (non-normative)

Suggested Nest layout: **`CoreModule`** (domain + application services + port tokens), **`InfrastructureModule`** (SQLite path §5.7, **migrate on bootstrap** §7, `gh` runner), **`DestinationsModule`** (Vibe Kanban MCP HTTP adapter + future adapters), **`EnvModule` / `parseAppEnv`** (typed env + **`APP_ENV`** injection), **`SettingsModule`** (`SettingsService`, effective config §5, mapping CRUD, setup validation), **`ApiModule`** (REST: status, settings, mappings + **POST sync-now** + SSE + reinit). Schedulers invoke **application** use cases only; **sync-now** should call the **same** use case as the timer-driven poll; subscribe to **settings changed** to **reschedule**. **npm:** `bin` → compiled entry; publish **`dist`** per **§13.1**.

---

## 16. Testing strategy

Testing prioritizes **fast, deterministic** suites. **Real `gh` and real Vibe Kanban MCP** are **not** required in CI; use **port fakes** and optional **manual smoke** checks locally.

### 16.1 Unit tests

- **Scope:** Domain and **application** logic with **no** Nest runtime, **no** real DB: routing (`owner/repo` → `project_id`), dedupe rules, unmapped-repo skip, **cooldown** / “sync allowed,” **`nextPollAt`** after scheduled vs manual run (pure time + policy), **§5.3 precedence** resolution.
- **Approach:** Inject **in-memory fakes** for `Scout`, `WorkBoardDestination`, and config ports.

### 16.2 Integration tests (Nest + SQLite)

- **Scope:** Boot the app via **`testingAppModule()`** from `test/testing-app-module.ts` (or **`AppModule.forRoot(...)`** with an explicit **`AppEnv`** / env snapshot), not the bare **`AppModule`** class — see §5.5. Use **SQLite** (`:memory:` or temp file) and migrations applied.
- **Driving:** **HTTP** via **`supertest`**: status JSON, mapping CRUD, **settings CRUD**, **POST sync-now**, **POST reinit** — assert responses and persisted state.
- **SSE:** Prefer testing the **service that emits** status events in isolation; optionally one test that consumes the **SSE stream** if maintenance cost is acceptable.
- **Adapters:** Register **fake** `gh` runner and **fake** work-board implementations (see §16.3).

### 16.3 Port fakes (CI-stable)

| Port                       | Fake behavior                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`gh` / process runner**  | Fixed stdout (PR list JSON), configurable exit codes (auth failure, empty list, error).                                                                |
| **`WorkBoardDestination`** | In-memory issue list; implement `list_issues` / `create_issue` (and whatever the dispatcher calls); optionally **spy** on call order and `project_id`. |

Do **not** depend on **`gh auth`** or a running Vibe Kanban instance in default CI pipelines.

### 16.4 Contract / shape tests

- **Status DTO** (and similar API models): schema or snapshot checks so **frontend** consumers break visibly when field names or enums change.

### 16.5 End-to-end tests (few, high value)

- **Happy path:** Fake `gh` returns one PR; fake board empty → **sync** → exactly **one** create with correct **`project_id`** and dedupe identity in title/description.
- **Idempotency:** Second sync with same PR → **no second create**.
- **Reconciliation:** Fake `gh` returns **no** PRs on a later sync; fake board still has the matching open issue → **`update_issue`** (or port equivalent) called to **terminal / closed** status (§3.2).

### 16.6 Deferred / optional

- **Load testing** — not required until scale demands it.
- **Real `gh` + real MCP** — **manual** or **optional** CI job (nightly / labeled) if desired; document a short **local smoke checklist** (MCP running, URL in env or DB, `gh` auth, one PR, one issue created).

### 16.7 Tooling (non-normative)

- **Jest** (Nest default), **`@nestjs/testing`** with **`overrideProvider`**, **`supertest`** for HTTP.

---

## 17. Document maintenance

When adding a destination or changing MCP tools, update **§6** and adapter notes. When **§5** keys, **§5.7** paths, precedence, status fields, **setup rules**, **sync-now / cooldown** behavior, SSE event names, **§13.1** packaging, **§7** migration policy, or **testing fakes** change, update **§16** and **OpenAPI** / README as needed.
