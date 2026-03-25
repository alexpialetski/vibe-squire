# vibe-squire

Local background service that polls **GitHub** (via `gh`) for PRs requesting your review and syncs them into **Vibe Kanban** over **MCP stdio** (spawned subprocess). See [REQUIREMENTS.md](./REQUIREMENTS.md) for scope and contracts.

**Prerequisites:** Node.js **LTS**, [`gh`](https://cli.github.com/) authenticated, and a working **Vibe Kanban MCP** stdio command (see [Vibe Kanban](https://vibekanban.com/docs)).

## Quick start

```bash
npm install
cp .env.example .env   # set DATABASE_URL and VK MCP stdio JSON (see table below)
npm run start:dev
```

- **API + SSE:** default bind `127.0.0.1`:`PORT` (env, default `3000`).
- **OpenAPI:** [http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs) unless `OPENAPI_ENABLED=false`.
- **Logs:** structured HTTP logs via **pino** (`nestjs-pino`). Set `LOG_LEVEL` (e.g. `debug`). Pretty output is used when `NODE_ENV` is not `production`.

## Operator UI (server-rendered)

Handlebars templates + static CSS/JS are served by the same Nest process (no separate dev server).

- **URLs:** [http://127.0.0.1:3000/ui/dashboard](http://127.0.0.1:3000/ui/dashboard) (root `/` redirects here), plus `/ui/settings`, `/ui/mappings`, `/ui/vibe-kanban` (legacy `/ui/kanban` redirects here).
- **Assets:** `/ui/assets/*` (CSS + small scripts for SSE, inline mapping edits, Vibe Kanban page).
- **Templates:** `src/ui/views/` (and `src/ui/public/`). Copied to `dist/ui/` on `npm run build` via `nest-cli.json` assets.

After `npm run start:dev`, open `/ui/dashboard` in the browser. CORS remains enabled for direct JSON API use (e.g. curl, other tools).

## Configuration (§5, §5.7)

| Mechanism | Purpose |
|-----------|---------|
| `DATABASE_URL` | SQLite `file:` URL for Prisma. If unset, see `src/database/resolve-database-url.ts` (`SQLITE_DATABASE_PATH`, `DATABASE_PATH`, `VIBE_SQUIRE_DATA_DIR`, OS defaults). |
| `VK_MCP_STDIO_JSON` / `vk_mcp_stdio_json` | JSON array `[command, ...args]` to spawn the Vibe Kanban MCP server, e.g. `npx` + `-y` + `vibe-kanban@latest` + `--mcp`. |
| `GH_HOST` / `gh_host` | GitHub Enterprise host for `gh`. |
| `POLL_INTERVAL_MINUTES`, `JITTER_MAX_SECONDS`, `RUN_NOW_COOLDOWN_SECONDS` | Scheduled poll interval (**minimum 5 minutes**; values below 5 are clamped). **Manual “Sync now”** is not limited by this interval (only by cooldown). |
| `default_organization_id`, `default_project_id`, `vk_workspace_executor`, `kanban_done_status`, `pr_review_body_template` | **No env vars** — set via operator UI (Vibe Kanban / Settings) or `PATCH /api/settings`. Code defaults apply when unset (e.g. empty board UUIDs until you configure them). |
| `HOST`, `PORT` | HTTP server bind (env-only). |

Effective precedence where an env var exists for a key: **env (non-empty) → SQLite → code default**. Keys listed above without env mapping use **SQLite → code default** only (`SettingsService`, `resolveEffectiveSetting`).

## HTTP surface (summary)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Aggregate health / setup / scheduler snapshot. Each scout includes `last_poll` (`candidates_count`, `skipped_unmapped`, `issues_created`) after a successful GitHub PR poll. |
| GET | `/api/status/stream` | SSE status snapshots (heartbeat + events). |
| POST | `/api/sync/run` | Run poll pipeline now (cooldown + guards). |
| POST | `/api/reinit` | Soft reinit: DB, `gh`, MCP probe, reset scout backoff. |
| CRUD | `/api/settings`, `/api/mappings` | Runtime settings and repo → project mappings. |
| GET | `/api/vibe-kanban/organizations` | MCP `list_organizations`. |
| GET | `/api/vibe-kanban/projects?organization_id=` | MCP `list_projects`. |
| GET | `/ui/*` | Operator UI (Handlebars): dashboard, settings, mappings, Vibe Kanban. `/` redirects to `/ui/dashboard`. |

## CLI / npm package (§13)

After `npm run build`, the package exposes `vibe-squire` via `bin/vibe-squire.js` (requires `dist/`). Published tarball includes `dist`, `prisma`, `prisma.config.ts`, and `bin` per `package.json` `files`.

**Single instance:** use one process per SQLite file (see REQUIREMENTS §5.1).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | `nest build` |
| `npm run start:prod` | `node dist/main` |
| `npm run test` | Unit tests (`src/**/*.spec.ts`) |
| `npm run test:e2e` | Supertest against bootstrapped app |
| `npm run test:integration` | Fakes for `gh` / scout / MCP; DB in temp dir per worker |

## Tests (§16)

- **Unit:** setting precedence (`resolve-effective-setting.spec.ts`), poll backoff (`poll-backoff.spec.ts`).
- **Integration:** happy path + idempotency (`sync-with-fakes.integration-spec.ts`), reconciliation (`sync-reconcile.integration-spec.ts`), settings / mappings / Kanban context (`settings-mappings-vk.integration-spec.ts`).
- **Contract:** `validateStatusSnapshot` on `GET /api/status` in e2e.

## Docker (optional)

Example image build from the repo root (adjust `DATABASE_URL` / volume for persistence):

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "dist/main"]
```

Run with a mounted data directory and `DATABASE_URL=file:/data/vibe-squire.sqlite` (see Prisma SQLite URL rules). For local-only use, prefer binding `HOST=127.0.0.1` without publishing the port globally.

## systemd (user unit, optional)

Example `~/.config/systemd/user/vibe-squire.service` after `npm run build` and a writable SQLite path:

```ini
[Unit]
Description=vibe-squire orchestrator
After=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/projects/vibe-squire
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
Environment=DATABASE_URL=file:%h/.local/share/vibe-squire/data.sqlite
ExecStart=/usr/bin/node dist/main
Restart=on-failure

[Install]
WantedBy=default.target
```

Then: `systemctl --user daemon-reload`, `systemctl --user enable --now vibe-squire.service`.

---

This project was bootstrapped with [Nest](https://github.com/nestjs/nest). Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
