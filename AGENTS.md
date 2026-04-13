# AGENTS.md

Context file for AI coding agents (Cursor, Claude Code, Copilot, Codex, etc.) working on the vibe-squire codebase.

## What is vibe-squire?

A local background orchestrator that polls GitHub for pull requests requesting your review and syncs them as issues into Vibe Kanban via its local HTTP API. Built with NestJS, Prisma + SQLite, and hexagonal architecture.

## Architecture

Hexagonal (ports & adapters). Core domain logic has no dependency on NestJS, GitHub `gh` CLI, or Vibe Kanban HTTP details. Adapters implement port interfaces in `src/ports/`; NestJS modules wire them via DI.

**Layers:**
- **Ports:** `src/ports/` — interfaces (`SyncPrScoutPort`, `DestinationBoardPort`, `SourceStatusPort`, `DestinationStatusPort`) and DI tokens.
- **Adapters:** `src/integrations/github/` (gh CLI), `src/integrations/vibe-kanban/` (local HTTP API client).
- **Core:** `src/sync/` (poll scheduler, dispatcher, reconciliation), `src/settings/`, `src/mappings/`, `src/status/`, `src/setup/`.
- **Driving:** NestJS controllers (`src/ui/`, `src/sync/sync.controller.ts`, `src/reinit/`).

**Key rule:** Domain code imports port interfaces, never concrete adapter types.

## Distribution

Published to npm; end users run `npx vibe-squire`. No clone required. SQLite migrations are applied at startup via a lightweight `better-sqlite3` runner (`src/database/sqlite-migrate.ts`) — the Prisma CLI is not needed at runtime.

## Key directories

| Directory | Contents |
|-----------|----------|
| `src/config/` | Zod env schema (`parseAppEnv`), `AppEnv` token, `EnvModule` |
| `src/database/` | SQLite path resolution, SQLite migration runner |
| `src/ports/` | Port interfaces and DI injection tokens |
| `src/integrations/github/` | `gh` CLI scout, PR search schema, GitHub settings |
| `src/integrations/vibe-kanban/` | Vibe Kanban HTTP board adapter, VK settings |
| `src/sync/` | Poll scheduler, sync service, poll-cycle pipeline |
| `src/sync/poll-cycle/` | Core sync logic: guard → scout → route → dedupe → create → reconcile |
| `src/settings/` | Key-value settings with env > SQLite > default precedence |
| `src/mappings/` | Repo → project mapping CRUD |
| `src/status/` | Aggregate health endpoint, SSE stream |
| `src/ui/` | Handlebars operator UI (views, assets, controllers) |
| `src/generated/prisma/` | Auto-generated Prisma client — do not edit |
| `prisma/` | Schema and migrations |
| `test/` | Integration specs (`*.integration-spec.ts`) |
| `docs/` | Architecture documentation |
| `bin/` | CLI entry point (`vibe-squire.js`) |

## Build and run (development)

```bash
npm install                    # install deps
npx prisma generate            # generate Prisma client
cp .env.example .env           # configure settings
npm run start:dev              # dev mode with watch (loads .env automatically)
npm run build                  # compile to dist/
npm run start:prod             # production: node dist/main
```

## Test

```bash
npm test                   # unit tests (src/**/__tests__/**/*.spec.ts)
npm run test:integration   # integration tests (test/*.integration-spec.ts)
npm run test:cov           # unit tests with coverage
npm run lint:check         # ESLint
npm run typecheck          # tsc --noEmit
```

## Test conventions

- **Unit tests:** `src/**/__tests__/**/*.spec.ts` — pure logic, Zod schemas, helpers. No Nest runtime, no real DB.
- **Integration tests:** `test/*.integration-spec.ts` — real Prisma + SQLite (`:memory:`), Nest module wiring, Supertest HTTP. External boundaries (GitHub `gh`, Vibe Kanban HTTP) are stubbed with fakes.
- New unit specs must sit under `__tests__/` directories or Jest won't discover them.
- Do not colocate `*.spec.ts` next to source files under `src/`.

## Coding conventions

- **Files:** kebab-case with NestJS suffixes (`.service.ts`, `.controller.ts`, `.module.ts`)
- **Port interfaces:** in `src/ports/`, named `*Port`
- **DI tokens:** UPPER_SNAKE Symbols in `src/ports/injection-tokens.ts`
- **Settings keys:** snake_case, matching `Setting.key` in Prisma
- **Bootstrap:** Always use `AppModule.forRoot(env)`, never bare `AppModule`
- **Config precedence:** env var > SQLite > code default (via `SettingsService`)
- **No CLS for settings** — CLS is for per-request context only; process-wide config uses `SettingsService`
- **Commits:** Conventional Commits format enforced by `commitlint` (husky `commit-msg` hook). Pushes to `main` trigger `semantic-release` → npm publish.

## Configuration

Boot-time env validated by Zod (`src/config/env-schema.ts`): `VIBE_SQUIRE_DATABASE_URL`, `VIBE_SQUIRE_HOST`, `VIBE_SQUIRE_PORT`, `VIBE_SQUIRE_SOURCE_TYPE`, `VIBE_SQUIRE_DESTINATION_TYPE`, `VIBE_SQUIRE_LOG_LEVEL`, etc.

Runtime settings stored in SQLite `Setting` table, managed via `SettingsService` and exposed at `PATCH /api/settings`.

Precedence for each key: **env (non-empty) > SQLite row > code default**.

## Adding an integration

1. Create module in `src/integrations/<name>/`
2. Implement port interface (`SyncPrScoutPort` or `DestinationBoardPort`)
3. Add type string to `src/config/integration-types.ts`
4. Register in `IntegrationsModule.register()`
5. Implement status port (`SourceStatusPort` or `DestinationStatusPort`)
