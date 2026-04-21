# AGENTS.md

Context file for AI coding agents (Cursor, Claude Code, Copilot, Codex, etc.) working on the vibe-squire codebase.

## What is vibe-squire?

A local background orchestrator that polls GitHub for pull requests requesting your review and syncs them as issues into Vibe Kanban via its local HTTP API. Built with NestJS, Prisma + SQLite, and hexagonal architecture.

## Architecture

Hexagonal (ports & adapters). Core domain logic has no dependency on NestJS, GitHub `gh` CLI, or Vibe Kanban HTTP details. Adapters implement port interfaces in `apps/server/src/ports/`; NestJS modules wire them via DI.

**Monorepo (pnpm):** `apps/server` — publishable Nest app (`vibe-squire`); `apps/web` — Vite + React SPA (static files copied into `apps/server/dist/client` on build); `packages/shared` — Zod contracts shared by server and web.

**Layers:**
- **Ports:** `apps/server/src/ports/` — interfaces (`SyncPrScoutPort`, `DestinationBoardPort`, `SourceStatusPort`, `DestinationStatusPort`) and DI tokens.
- **Adapters:** `apps/server/src/integrations/github/` (gh CLI), `apps/server/src/integrations/vibe-kanban/` (local HTTP API client).
- **Core:** `apps/server/src/sync/`, `apps/server/src/settings/`, `apps/server/src/mappings/`, `apps/server/src/status/`, `apps/server/src/setup/`.
- **Driving:** GraphQL resolvers (`apps/server/src/graphql/`), a thin set of operator-tool REST controllers (`apps/server/src/sync/`, `apps/server/src/reinit/`), and the React operator UI in `apps/web`.

**Key rule:** Domain code imports port interfaces, never concrete adapter types.

## Transport policy

GraphQL is the sole operator-console transport:
- Queries/mutations via `POST /graphql`
- Subscriptions via `graphql-ws`

The only retained REST endpoints are `POST /api/sync/run` and `POST /api/reinit`, both kept strictly as operator tools for shell/curl workflows.

Treat `docs/ARCHITECTURE.md` (`## Transport decision table`) as the source of truth for endpoint keep/remove decisions. Any `/api/*` route addition or removal must update that table in the same change.

## Distribution

Published to npm from `apps/server`; end users run `npx vibe-squire`. No clone required. SQLite migrations are applied at startup via a lightweight `better-sqlite3` runner (`apps/server/src/database/sqlite-migrate.ts`) — the Prisma CLI is not needed at runtime.

## Key directories

| Directory | Contents |
|-----------|----------|
| `apps/server/src/config/` | Zod env schema (`parseAppEnv`), `AppEnv` token, `EnvModule` |
| `apps/server/src/database/` | SQLite path resolution, SQLite migration runner |
| `apps/server/src/ports/` | Port interfaces and DI injection tokens |
| `apps/server/src/integrations/github/` | `gh` CLI scout, PR search schema, GitHub settings |
| `apps/server/src/integrations/vibe-kanban/` | Vibe Kanban HTTP board adapter, VK settings |
| `apps/server/src/sync/` | Poll scheduler, sync service, poll-cycle pipeline |
| `apps/server/src/sync/poll-cycle/` | Core sync logic: guard → scout → route → dedupe → create → reconcile |
| `apps/server/src/settings/` | Key-value settings with env > SQLite > default precedence |
| `apps/server/src/mappings/` | Repo → project mapping CRUD |
| `apps/server/src/status/` | Aggregate health service feeding GraphQL `status` query and `statusUpdated` subscription |
| `apps/server/src/ui/` | Operator BFF presenters (GitHub fields, VK UI state, setup checklist, nav) consumed by GraphQL resolvers |
| `apps/server/src/graphql/` | GraphQL schema, resolvers, and PubSub wiring (operator console transport) |
| `apps/web/` | React + Vite SPA (served as static files from Nest) |
| `packages/shared/` | Zod schemas/types (`@vibe-squire/shared`) |
| `apps/server/src/generated/prisma/` | Auto-generated Prisma client — do not edit |
| `apps/server/prisma/` | Schema and migrations |
| `apps/server/test/` | Integration specs (`*.integration-spec.ts`) |
| `docs/` | Architecture documentation |
| `apps/server/bin/` | CLI entry point (`vibe-squire.js`) |

## Build and run (development)

```bash
pnpm install
pnpm --filter vibe-squire exec prisma generate
cp .env.example .env
pnpm run start:dev
pnpm run build
pnpm --filter vibe-squire run start:prod
```

For UI-only iteration with API on port 4000: `pnpm --filter @vibe-squire/web dev` (Vite proxies `/api`).

## Test

```bash
pnpm test
pnpm run test:integration
pnpm run test:cov
pnpm run lint:check
pnpm run typecheck
```

## Test conventions

- **Unit tests:** `apps/server/src/**/__tests__/**/*.spec.ts` — pure logic, Zod schemas, helpers. No Nest runtime, no real DB.
- **Integration tests:** `apps/server/test/*.integration-spec.ts` — real Prisma + SQLite (`:memory:`), Nest module wiring, Supertest HTTP. External boundaries (GitHub `gh`, Vibe Kanban HTTP) are stubbed with fakes.
- New unit specs must sit under `__tests__/` directories or Jest won't discover them.
- Do not colocate `*.spec.ts` next to source files under `apps/server/src/`.

## Coding conventions

- **Files:** kebab-case with NestJS suffixes (`.service.ts`, `.controller.ts`, `.module.ts`)
- **Port interfaces:** in `apps/server/src/ports/`, named `*Port`
- **DI tokens:** UPPER_SNAKE Symbols in `apps/server/src/ports/injection-tokens.ts`
- **Settings keys:** snake_case, matching `Setting.key` in Prisma
- **Bootstrap:** Always use `AppModule.forRoot(env)`, never bare `AppModule`
- **Config precedence:** env var > SQLite > code default (via `SettingsService`)
- **No CLS for settings** — CLS is for per-request context only; process-wide config uses `SettingsService`
- **Commits:** Conventional Commits format enforced by `commitlint` (husky `commit-msg` hook). Pushes to `main` trigger `semantic-release` → npm publish.

## Configuration

Boot-time env validated by Zod (`apps/server/src/config/env-schema.ts`): `VIBE_SQUIRE_DATABASE_URL`, `VIBE_SQUIRE_HOST`, `VIBE_SQUIRE_PORT`, `VIBE_SQUIRE_SOURCE_TYPE`, `VIBE_SQUIRE_DESTINATION_TYPE`, `VIBE_SQUIRE_LOG_LEVEL`, etc.

Runtime settings stored in SQLite `Setting` table, managed via `SettingsService` and exposed through the GraphQL `effectiveSettings` query plus the `updateSettings`, `updateSourceSettings`, and `updateDestinationSettings` mutations.

Precedence for each key: **env (non-empty) > SQLite row > code default**.

## Adding an integration

1. Create module in `apps/server/src/integrations/<name>/`
2. Implement port interface (`SyncPrScoutPort` or `DestinationBoardPort`)
3. Add type string to `apps/server/src/config/integration-types.ts`
4. Register in `IntegrationsModule.register()`
5. Implement status port (`SourceStatusPort` or `DestinationStatusPort`)
