# REST → GraphQL inventory (task 1.1)

| Domain | REST | GraphQL | Notes |
|--------|------|---------|-------|
| Settings meta | `GET /api/ui/settings-meta` | `query effectiveSettings` | GraphQL `coreFields` adds optional `envVar` / `description`; booleans also on root. |
| Settings patch | `PATCH /api/settings/core` | `mutation updateSettings` | Single `core` partition; string map in `UpdateSettingsInput`. |
| Mappings list | `GET /api/mappings` | `query mappings` | Same Prisma rows (`id`, `githubRepo`, `vibeKanbanRepoId`, `label`, timestamps). |
| Mappings CRUD | `POST/PATCH/DELETE /api/mappings` | `upsertMapping` / `updateMapping` / `deleteMapping` | Same services + `StatusEventsService.emitChanged`. |
| Activity | `GET /api/activity/runs?limit=` | `query activityFeed(first,after)` | Relay connection; items include stable `id` = `{runId}:{prUrl}`. |
| Nav | `GET /api/ui/nav` | `query integrationNav` | `entries: { id, label, href }`. |
| Manual sync | `POST /api/sync/run` | `mutation triggerSync` | Same guards (`SetupCompleteGuard`, `SyncDependenciesGuard`). |
| Reinit | `POST /api/reinit` | `mutation reinitIntegration` | Same `ReinitService.reinitialize()` payload shape. |
| Triage | `POST /api/pr/{accept,decline,reconsider}` | `acceptTriage` / `declineTriage` / `reconsiderTriage` | Same `PrTriageService`; REST path is `/api/pr/*` (not `/api/triage/*`). |
| Live activity | n/a (was polling client) | `subscription activityEvents` | `{ invalidate: Boolean! }` on `StatusEventsService` updates + after triage/sync/reinit/mapping writes. |

Enums / Zod: settings patch validation remains in `SettingsService.applyGroupPatch` + Zod parsers; mapping inputs mirror `CreateRepoMappingDto` / `UpdateRepoMappingDto` (class-validator on REST; GraphQL inputs validated by service rules).
