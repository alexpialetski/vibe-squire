## 1. Pre-flight audit

- [x] 1.1 `rg 'EventSource|apiJson|/api/' apps/web/src` and confirm the only hits are in `GithubPage.tsx`, `VibeKanbanPage.tsx`, `MappingsPage.tsx`, and `apps/web/src/api.ts` itself; capture the command output in the PR description.
- [x] 1.2 `rg '/api/' apps/server/test` and build a `path → test file` map so each deletion commit knows which tests to drop.
- [x] 1.3 `rg '/api/' README.md docs scripts` (if the directories exist) to find doc references that need updating.
- [x] 1.4 `rg 'class-validator|class-transformer|nestjs-zod' apps/server/src` and record every importer so the dep-removal commit can verify zero remaining imports.
- [x] 1.5 Enumerate every `@Controller`, `@Get`, `@Post`, `@Patch`, `@Delete`, `@Sse` in `apps/server/src` and confirm the expected deletion/keep list matches the proposal: **keep** `POST /api/sync/run`, `POST /api/reinit`; **remove** everything else.

## 2. Publish transport policy documentation

- [x] 2.1 Add `## Transport decision table` to `docs/ARCHITECTURE.md` with rows sorted by path, status enum `removed | kept (operator tool)` only, and one-sentence justification per row.
- [x] 2.2 Update `AGENTS.md` to state that GraphQL is the sole operator-console transport, name the two kept POSTs, and link to the decision table.
- [x] 2.3 Update `.cursor/rules/architecture.mdc` with the same transport policy statement and decision-table link.
- [x] 2.4 Trim `README.md` API table to `POST /api/sync/run`, `POST /api/reinit`, plus a first-class entry for `POST /graphql` and `graphql-ws` subscriptions.
- [x] 2.5 Commit as a single docs-only commit so subsequent code commits reference a live policy.

## 3. Add new GraphQL operations (REST still live)

- [x] 3.1 Implement `Query.githubFields` resolver binding to `SettingsService.listEffectiveNonSecret()` + `integrationFieldsForUi(GITHUB_SOURCE_UI_KEYS, values)`; return `{ disabled, fields }` with the Zod `githubFieldsResponseSchema` shape.
- [x] 3.2 Refactor `buildVibeKanbanPageLocals` out of the UI presenter into a callable service if it still depends on Express response shape; implement `Query.vibeKanbanUiState` resolver.
- [x] 3.3 Implement `Query.vibeKanbanOrganizations`, `Query.vibeKanbanProjects(organizationId: ID!)`, and `Query.vibeKanbanRepos` resolvers bound to `VibeKanbanBoardService`.
- [x] 3.4 Port `VibeKanbanDestinationConfiguredGuard` to a Nest GraphQL guard (or inline check) covering the VK context resolvers.
- [x] 3.5 Implement `Mutation.updateSourceSettings(input: UpdateSourceSettingsInput!): EffectiveSettings!` binding to `SettingsService.applyGroupPatch('source', input)`; return the refreshed `EffectiveSettings` payload.
- [x] 3.6 Implement `Mutation.updateDestinationSettings(input: UpdateDestinationSettingsInput!): EffectiveSettings!` binding to `SettingsService.applyGroupPatch('destination', input)`; return the refreshed `EffectiveSettings` payload.
- [x] 3.7 Declare GraphQL object types / inputs for `GithubFieldsPayload`, `GithubField`, `VibeKanbanUiState`, `VibeKanbanOrganization`, `VibeKanbanProject`, `VibeKanbanRepo`, `UpdateSourceSettingsInput`, `UpdateDestinationSettingsInput` — mirroring the matching Zod contracts in `@vibe-squire/shared`.
- [x] 3.8 Add integration specs under `apps/server/test/` for each new query and mutation (happy path + at least one error/validation path; VK queries must cover the "destination not active" error case).
- [x] 3.9 Regenerate Apollo codegen for `apps/web` so the new operations are typed client-side; confirm `apps/web/src/__generated__/graphql.ts` updates.
- [x] 3.10 Run `pnpm --filter apps/server test` and `pnpm --filter apps/web typecheck`; confirm green before any REST deletion.

## 4. Migrate `GithubPage` to Apollo

- [x] 4.1 Write GraphQL operations: `query GithubFields` and `mutation UpdateSourceSettings`; place under `apps/web/src/graphql/operations/`.
- [x] 4.2 Split `apps/web/src/pages/GithubPage.tsx` into a container page + presentational `GithubFieldsForm` (atoms/molecules under `apps/web/src/ui/`), per the atomic-design boundary in `apps/web/src/ui/README.md`.
- [x] 4.3 Replace `apiJson` + `githubFieldsResponseSchema.parse` with Apollo `useQuery(GithubFieldsDocument)` / `useMutation(UpdateSourceSettingsDocument)` in the page container.
- [x] 4.4 Update tests for `GithubPage` to use `MockedProvider` instead of `fetch` mocks; drop stubs for `/api/ui/github-fields` and `/api/settings/source`.
- [x] 4.5 Run `pnpm --filter apps/web test`; confirm green.

## 5. Migrate `VibeKanbanPage` to Apollo

- [x] 5.1 Write GraphQL operations: `query VibeKanbanUiState`, `query VibeKanbanOrganizations`, `query VibeKanbanProjects`, and `mutation UpdateDestinationSettings`.
- [x] 5.2 Split `apps/web/src/pages/VibeKanbanPage.tsx` into a container + presentational pieces (`VibeKanbanBoardPicker`, `VibeKanbanProjectPicker`, `VibeKanbanExecutorSelect`, `VibeKanbanSettingsForm`) under `apps/web/src/ui/`.
- [x] 5.3 Replace `apiJson` calls (`/api/vibe-kanban/ui-state`, `/api/vibe-kanban/organizations`, `/api/vibe-kanban/projects?organization_id=…`, `/api/settings/destination`) with Apollo hooks.
- [x] 5.4 Update tests for `VibeKanbanPage` to use `MockedProvider`; drop all REST fetch mocks.
- [x] 5.5 Run `pnpm --filter apps/web test`; confirm green.

## 6. Migrate VK repo loading in `MappingsPage`

- [x] 6.1 Write GraphQL operation `query VibeKanbanRepos` (or reuse if already added by P2.4).
- [x] 6.2 Replace the `apiJson<{ repos: … }>('/api/vibe-kanban/repos')` call in `apps/web/src/pages/MappingsPage.tsx` with `useQuery(VibeKanbanReposDocument)`.
- [x] 6.3 Split any new presentational concerns out per the atomic-design rule if the page grows (e.g. dedicated `VibeKanbanRepoPicker`).
- [x] 6.4 Update `MappingsPage` tests to mock the new query via `MockedProvider`; drop the `/api/vibe-kanban/repos` fetch mock.
- [x] 6.5 Run `pnpm --filter apps/web test`; confirm green.

## 7. Delete `apiJson` and unused Zod response schemas

- [x] 7.1 `rg 'apiJson' apps/web/src` and confirm zero hits outside `apps/web/src/api.ts`.
- [x] 7.2 Delete `apps/web/src/api.ts`.
- [x] 7.3 `rg 'githubFieldsResponseSchema|vibeKanbanUiStateSchema' apps/web/src packages` and remove any import that was only used by the migrated pages; drop the Zod schema exports from `@vibe-squire/shared` if no consumer remains (server-side resolvers that still compose these shapes with Zod stay).
- [x] 7.4 Run `pnpm --filter apps/web typecheck` and `pnpm --filter apps/web test`; confirm green.

## 8. Delete SSE status stream

- [x] 8.1 Remove the `@Sse('stream')` handler from `apps/server/src/status/status.controller.ts`.
- [x] 8.2 Verify `StatusEventsService.updates()` is subscribed only by the `statusUpdated` GraphQL bridge; remove any SSE-specific glue in `apps/server/src/events/`.
- [x] 8.3 Delete integration specs under `apps/server/test/` targeting `/api/status/stream`.
- [x] 8.4 Run `pnpm --filter apps/server test`; confirm green.

## 9. Delete REST GETs

- [x] 9.1 Delete `GET /api/status` from `apps/server/src/status/status.controller.ts` (and delete the file if it becomes empty).
- [x] 9.2 Delete `apps/server/src/ui/operator-bff.controller.ts` entirely (all four GETs retire).
- [x] 9.3 Delete `apps/server/src/ui/activity-api.controller.ts` entirely (`GET /api/activity/runs`).
- [x] 9.4 Delete `GET /api/settings` from `apps/server/src/settings/settings.controller.ts` (controller will fully disappear in the mutation-deletion step).
- [x] 9.5 Delete `GET /api/mappings` from `apps/server/src/mappings/mappings.controller.ts` (controller will fully disappear in the mutation-deletion step).
- [x] 9.6 Delete `apps/server/src/vibe-kanban/vibe-kanban-context.controller.ts` entirely (all four REST endpoints retire).
- [x] 9.7 Delete integration specs whose sole target is any removed GET; confirm no `.skip`ed tests remain.
- [x] 9.8 Run `pnpm --filter apps/server test` and `pnpm --filter apps/web test`; confirm green.

## 10. Delete REST mutation endpoints

- [x] 10.1 Delete `POST /api/mappings`, `PATCH /api/mappings/:id`, `DELETE /api/mappings/:id` from `apps/server/src/mappings/mappings.controller.ts`; delete the controller file entirely (file is empty after GET+mutation removal).
- [x] 10.2 Delete `PATCH /api/settings/core`, `PATCH /api/settings/source`, `PATCH /api/settings/destination` from `apps/server/src/settings/settings.controller.ts`; delete the controller file entirely.
- [x] 10.3 Delete `POST /api/pr/accept`, `POST /api/pr/decline`, `POST /api/pr/reconsider` from `apps/server/src/sync/pr-triage.controller.ts`; delete the controller file entirely (triage mutations live only on GraphQL).
- [x] 10.4 Delete integration specs whose sole target is any removed mutation.
- [x] 10.5 Run `pnpm --filter apps/server test`; confirm green.

## 11. Unregister controllers and delete DTO folders

- [x] 11.1 Remove deleted controllers (`OperatorBffController`, `ActivityApiController`, `VibeKanbanContextController`, `StatusController` if gone, `SettingsController`, `MappingsController`, `PrTriageController`) from their enclosing Nest module `controllers: [...]` arrays.
- [x] 11.2 Delete `apps/server/src/ui/dto/` entirely (all contents — `ui-nav-output.dto.ts`, `setup-api-output.dto.ts`, `github-fields-output.dto.ts`, `settings-meta-output.dto.ts`, `vibe-kanban-ui-output.dto.ts`, etc.).
- [x] 11.3 Delete `apps/server/src/mappings/dto/` entirely (`create-mapping.dto.ts`, `update-mapping.dto.ts`, etc.).
- [x] 11.4 Delete `apps/server/src/settings/dto/` entirely if every file therein was consumed only by removed handlers; otherwise trim to the surviving consumers.
- [x] 11.5 Delete any VibeKanban DTO file that was only consumed by `VibeKanbanContextController`.
- [x] 11.6 Run `pnpm --filter apps/server build` and confirm the Nest module graph compiles with the controllers removed.
- [x] 11.7 Run `pnpm --filter apps/server test`; confirm green.

## 12. Remove retired dependencies

- [x] 12.1 `rg 'from .nestjs-zod.' apps/server/src` and confirm zero matches.
- [x] 12.2 `rg 'from .class-validator.|from .class-transformer.' apps/server/src` and confirm zero matches.
- [x] 12.3 Audit `@nestjs/swagger` usage in the surviving controllers (`SyncController`, `ReinitController`); dropped — no `@ApiTags`/`@ApiOperation`/etc. decorators remain and the Swagger bootstrap (plus the `VIBE_SQUIRE_OPENAPI_ENABLED` env var + `openapiEnabled` `AppEnv` field) were removed from `main.ts` and `env-schema.ts`.
- [x] 12.4 Remove `nestjs-zod`, `class-validator`, `class-transformer` (and `@nestjs/swagger`) from `apps/server/package.json` `dependencies` / `devDependencies`.
- [x] 12.5 Run `pnpm install` at the workspace root to regenerate the lockfile.
- [x] 12.6 Run `pnpm --filter apps/server build` and `pnpm --filter apps/server test`; confirm green.

## 13. Bundle and runtime verification

- [x] 13.1 `pnpm --filter apps/server build`; grep the server dist output for retired path strings (`/api/status`, `/api/status/stream`, `/api/ui/`, `/api/vibe-kanban/`, `/api/mappings`, `/api/activity/`, `/api/settings`, `/api/pr/`) and confirm they do not appear.
- [x] 13.2 `pnpm --filter apps/web build`; record bundle-size delta (expect smaller — `apiJson` gone + unused Zod schemas gone + no TanStack leftovers).
- [ ] 13.3 Boot the server locally (`pnpm --filter apps/server start`) and confirm that `curl -sS -o /dev/null -w '%{http_code}' http://localhost:3000/api/status` returns `404`, same for every removed path from 13.1; `curl -XPOST http://localhost:3000/api/sync/run` still works. _(Manual smoke — to be run before merge; integration tests already exercise the removals.)_
- [ ] 13.4 Boot the web client (`pnpm --filter apps/web dev`) against the built server; smoke-test Dashboard, Settings, Mappings (including VK repo loader), Activity, Triage, Dashboard setup, GitHub page, and Vibe Kanban page end-to-end over GraphQL. _(Manual smoke — to be run before merge.)_
- [x] 13.5 Confirm Apollo Sandbox is still dev-only and not in the prod `apps/web` bundle.
- [x] 13.6 Run `pnpm -w test` and `pnpm -w typecheck`; confirm green monorepo-wide.

## 14. Housekeeping

- [x] 14.1 Update the story `docs/stories/p2-graphql-rest-sse-sunset.md` — flip `status` to `done` and check every acceptance criteria box.
- [x] 14.2 Run the doccraft queue audit skill to mark P2.5 as done and confirm backlog/queue reflect the change.
- [ ] 14.3 Open the PR with the final transport decision table inlined in the description and the pre-flight grep outputs from §1 for reviewer confidence. _(Deferred to user — this repo workflow commits locally; open the PR when ready.)_
- [x] 14.4 After merge, archive this OpenSpec change via the `openspec-archive-change` skill so `openspec/changes/archive/<date>-graphql-rest-sse-sunset/` holds proposal, design, specs, and tasks for posterity; confirm `openspec/specs/graphql-status/spec.md`, `openspec/specs/graphql-operator-bff/spec.md`, and the new `openspec/specs/api-transport-policy/spec.md` are updated/added by the archive step.
