# vibe-squire

Local background orchestrator that polls **GitHub** for PRs requesting your review and syncs them as issues into **[Vibe Kanban](https://vibekanban.com)** over its **local HTTP API** (same backend the desktop app exposes).

Built with [NestJS](https://nestjs.com), [Prisma](https://www.prisma.io) + SQLite, and a hexagonal architecture that keeps source/destination adapters pluggable.

## How it works

```mermaid
graph LR
    GH["GitHub (PRs)"] -- "gh pr list<br/>review-requested:@me" --> VS["vibe-squire<br/>(localhost)"]
    VS -- "local HTTP API<br/>create / update issue" --> VK["Vibe Kanban<br/>(board)"]
    VS -- "state" --> DB["SQLite"]
```

1. **Scout** — polls GitHub via `gh pr list --search "review-requested:@me"` on a configurable interval.
2. **Dispatcher** — routes each PR to a Kanban project based on `owner/repo` mappings, deduplicates, and creates/updates issues via the Vibe Kanban local API.
3. **Reconciliation** — when a PR leaves your review queue, the matching Kanban issue is closed automatically.

## Prerequisites

- **Node.js** >= 20 (LTS)
- **[`gh`](https://cli.github.com/)** — installed and authenticated (`gh auth login`)
- **[Vibe Kanban](https://vibekanban.com)** — run the desktop app on the same machine so the local HTTP API (and OAuth session) are available to vibe-squire

## Quick start

```bash
npx vibe-squire
```

That's it. On first run the app resolves a SQLite database path automatically (see [Database location](#database-location)), applies migrations, and opens the operator UI at **http://127.0.0.1:3000/ui/dashboard**.

Override defaults with environment variables:

```bash
VIBE_SQUIRE_PORT=4000 VIBE_SQUIRE_LOG_LEVEL=debug npx vibe-squire
```

## Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIBE_SQUIRE_HOST` | `127.0.0.1` | HTTP bind address. |
| `VIBE_SQUIRE_PORT` | `3000` | HTTP bind port. |
| `VIBE_SQUIRE_SOURCE_TYPE` | `github` | Scout adapter (`github`). |
| `VIBE_SQUIRE_DESTINATION_TYPE` | `vibe_kanban` | Board adapter (`vibe_kanban`). |
| `VIBE_SQUIRE_SCHEDULED_SYNC_ENABLED` | `true` | Set `false` to disable the automatic poll timer (manual "Sync now" still works). |
| `VIBE_SQUIRE_POLL_INTERVAL_MINUTES` | `10` | Minutes between scheduled polls (minimum 5, clamped). |
| `VIBE_SQUIRE_JITTER_MAX_SECONDS` | `30` | Random jitter added to the poll interval. |
| `VIBE_SQUIRE_RUN_NOW_COOLDOWN_SECONDS` | `60` | Minimum gap after a manual sync before another is allowed. |
| `VIBE_SQUIRE_LOG_LEVEL` | `info` | Pino log level (`fatal` / `error` / `warn` / `info` / `debug` / `trace` / `silent`). |
| `VIBE_SQUIRE_LOG_FILE_PATH` | — | Path for JSON file logging (in addition to console). |
| `VIBE_SQUIRE_OPENAPI_ENABLED` | `true` | Expose Swagger UI at `/api/docs`. |

### Runtime settings (SQLite)

These have no env var equivalent — set them via the operator UI or `PATCH /api/settings`:

`default_organization_id`, `default_project_id`, `vk_workspace_executor`, `kanban_done_status`, `pr_ignore_author_logins`, `pr_review_body_template`, `max_board_pr_count`.

### Effective precedence

For keys that have both an env var and a SQLite row: **env (non-empty) > SQLite > code default**.

### Database location

When `VIBE_SQUIRE_DATABASE_URL` is not set (the default for `npx`), the app resolves a path automatically:

| OS | Default directory |
|----|-------------------|
| Linux | `~/.local/state/vibe-squire/` (respects `XDG_STATE_HOME`) |
| macOS | `~/Library/Application Support/vibe-squire/` |
| Windows | `%APPDATA%\vibe-squire\` |

Override with `VIBE_SQUIRE_DATABASE_URL` (SQLite `file:` URL), `VIBE_SQUIRE_DATA_DIR` (directory), or `VIBE_SQUIRE_DATABASE_PATH` (full file path).

SQLite migrations are applied automatically on every startup via a lightweight `better-sqlite3` runner — no Prisma CLI is needed at runtime.

**Important:** Run a single vibe-squire process per SQLite file. Concurrent processes on the same database are unsupported.

## Operator UI

Server-rendered Handlebars templates served by the same Nest process — no separate frontend build.

| URL | Page |
|-----|------|
| `/ui/dashboard` | Health status, sync schedule, "Sync now" button |
| `/ui/settings` | Poll interval, board limits, PR filters |
| `/ui/mappings` | GitHub `owner/repo` → Vibe Kanban project mappings |
| `/ui/vibe-kanban` | Organisation/project picker, workspace executor |

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Aggregate health, setup, and scheduler snapshot |
| `GET` | `/api/status/stream` | SSE status stream (heartbeat + events) |
| `POST` | `/api/sync/run` | Trigger manual sync (cooldown + guards) |
| `POST` | `/api/reinit` | Soft reinit: re-probe `gh`, DB, Vibe Kanban API; reset backoff |
| `CRUD` | `/api/settings` | Runtime settings |
| `CRUD` | `/api/mappings` | Repo → project mappings |
| `GET` | `/api/vibe-kanban/organizations` | Proxies VK `GET /api/organizations` |
| `GET` | `/api/vibe-kanban/projects?organization_id=` | Proxies VK `GET /api/remote/projects` |

OpenAPI docs (when enabled): **http://127.0.0.1:3000/api/docs**

## Running as a service

### systemd (user unit)

```ini
[Unit]
Description=vibe-squire orchestrator
After=network-online.target

[Service]
Type=simple
Environment=NODE_ENV=production
Environment=VIBE_SQUIRE_HOST=127.0.0.1
Environment=VIBE_SQUIRE_PORT=3000
ExecStart=/usr/bin/npx vibe-squire
Restart=on-failure

[Install]
WantedBy=default.target
```

## Development

```bash
git clone https://github.com/alexpialetski/vibe-squire.git
cd vibe-squire
npm install
npx prisma generate           # generate Prisma client
cp .env.example .env           # review and adjust settings
npm run start:dev              # dev mode with watch (loads .env automatically)
```

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile with `nest build` |
| `npm run start:dev` | Dev mode with file watching (preloads `.env` via `-r dotenv/config`) |
| `npm run start:prod` | Production: `node dist/main` |
| `npm test` | Unit tests |
| `npm run test:cov` | Unit tests with coverage |
| `npm run test:integration` | Integration tests (Prisma + migrations + Supertest) |
| `npm run lint` | Lint and auto-fix |
| `npm run typecheck` | TypeScript type checking |

### Testing

- **Unit tests** — `src/**/__tests__/**/*.spec.ts`. Pure logic, Zod schemas, helpers.
- **Integration tests** — `test/*.integration-spec.ts`. Real Prisma + SQLite, Nest module wiring, Supertest HTTP. External boundaries (GitHub `gh`, Vibe Kanban HTTP client) are stubbed.

```bash
npm test && npm run test:integration
```

### Commits and releases

This project uses [Conventional Commits](https://www.conventionalcommits.org/). A `commitlint` hook enforces the format on every commit.

Pushes to `main` trigger [semantic-release](https://semantic-release.gitbook.io/) via GitHub Actions, which determines the version bump from commit types (`fix` → patch, `feat` → minor, `feat!` → major) and publishes to npm automatically.

## License

MIT
