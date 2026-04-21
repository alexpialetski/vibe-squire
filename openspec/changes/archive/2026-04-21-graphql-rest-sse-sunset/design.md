## Context

vibe-squire has exactly one user: the author running the server on a laptop, against a single SQLite file, behind a Vite dev client. There is no external REST consumer, no published SDK, no second process, and no backward-compatibility obligation. After P2.2–P2.4, three concrete facts are true about the HTTP surface:

- Every operator-console read, live event, and mutation has a GraphQL equivalent. GraphQL is the transport `apps/web` already uses for status, settings, mappings, activity, triage, dashboard setup, integration nav, and manual sync.
- The REST/SSE surface has three remaining *production* consumers in `apps/web/src`: `GithubPage` (`/api/ui/github-fields`, `/api/settings/source`), `VibeKanbanPage` (`/api/vibe-kanban/{organizations,projects,ui-state}`, `/api/settings/destination`), and VK repo loading in `MappingsPage` (`/api/vibe-kanban/repos`). Every other REST/SSE endpoint either has zero callers (`GET /api/status`, `GET /api/status/stream`, `GET /api/ui/{setup,nav,settings-meta}`) or is a pure mutation already duplicated by a GraphQL mutation (`POST /api/mappings`, `PATCH /api/settings/core`, `POST /api/pr/*`, etc.).
- `POST /api/sync/run` and `POST /api/reinit` are the only endpoints genuinely useful from `curl` / `gh` / shell scripts — the operator can poke them without opening Apollo Sandbox and without an auth token exchange. Everything else is only useful because it's how `apps/web` talks to the server today.

Other constraints carried forward from earlier stories:

- One process, one SQLite file (`.cursor/rules/architecture.mdc`). No distributed feature flag, blue/green cut-over, or grace-period middleware is warranted.
- Hexagonal boundary: controllers and resolvers are driving adapters over application services. Retiring a controller deletes a driving adapter only; application services, ports, and Prisma stay intact.
- Zod (`@vibe-squire/shared`) remains the single validation source of truth. GraphQL object types are hand-mirrored, enums are re-declared from the same literal source.
- `graphql-status` currently contains a requirement explicitly forbidding REST/SSE sunset ("REST and SSE status endpoints remain unchanged during the GraphQL migration — sunsetting is deferred to story P2.5"). This change is the moment that requirement gets replaced.

Given "one user, no compat", the design drops every "preserve the REST surface just in case" cushion from the earlier draft.

## Goals / Non-Goals

**Goals:**

- Retire every REST/SSE endpoint that is not explicitly an operator tool. The survivors are **exactly two**: `POST /api/sync/run` and `POST /api/reinit`.
- Migrate the three web REST holdouts (`GithubPage`, `VibeKanbanPage`, VK repo loading in `MappingsPage`) to GraphQL in the same change, then delete `apps/web/src/api.ts` (`apiJson`) entirely.
- Publish the **Transport decision table** in `docs/ARCHITECTURE.md` with a two-value status enum (`removed | kept (operator tool)`) — no `kept (REST)` category, because no REST endpoint survives for a non-operator reason.
- Update `AGENTS.md` and `.cursor/rules/architecture.mdc` so future contributors land on the new policy without having to read commit history.
- Remove `nestjs-zod`, `class-validator`, `class-transformer` from `apps/server/package.json`. Remove `@nestjs/swagger` too if the two operator-tool POSTs don't benefit from it.
- Delete DTO files and Swagger-input wrappers that become dead once the REST handlers and their decorators are gone.

**Non-Goals:**

- Introducing HTTP-layer versioning, deprecation headers, or grace-period middleware. Single user, direct replacement.
- Changing Prisma schema, domain services, ports, or adapter packages. Every edit is at the controller/resolver/DTO boundary, with the small exception of adding Nest resolver classes for the new GraphQL operations.
- Renaming existing GraphQL operations or changing their shapes beyond what's needed to host the new GitHub-fields / VK-context / source-destination mutations. `effectiveSettings`, `mappings`, `activityFeed`, `integrationNav`, `dashboardSetup`, `status`, `statusUpdated`, `triggerSync`, `reinitIntegration` stay as-is.
- Relocating the package, switching to `graphql-scalars` for Zod, or generating GraphQL types from Zod automatically. Manual mirroring stays.
- Migrating `POST /api/sync/run` or `POST /api/reinit` to GraphQL. The GraphQL mutations `triggerSync` and `reinitIntegration` already exist; the REST POSTs stay as operator tools, not as replacements.

## Decisions

### Decision: Migrate the three web REST holdouts in this change

The earlier draft of this story considered marking `GithubPage` / `VibeKanbanPage` / VK repo loading as `kept (REST)` to keep the scope tight. Because vibe-squire has a single user and no compat obligation, the cost of "leave `apiJson` around with documentation" exceeds the cost of "migrate three pages to Apollo now" — the former leaves a second transport alive indefinitely and forces every future reader to learn two data-loading patterns in the web client.

Concretely, this change adds these GraphQL operations:

- `Query.githubFields: GithubFieldsPayload!` — returns `{ disabled: Boolean!, fields: [GithubField!]! }`, where `GithubField` mirrors the Zod `githubFieldsResponseSchema` field shape (`key`, `label`, `value`, plus whatever the Zod schema currently enumerates). Resolver delegates to `SettingsService.listEffectiveNonSecret()` + `integrationFieldsForUi(GITHUB_SOURCE_UI_KEYS, values)` and checks `AppEnv.sourceType === 'github'` for the disabled flag — identical logic to the existing REST handler.
- `Query.vibeKanbanUiState: VibeKanbanUiState!` — returns the same shape as the existing `VibeKanbanUiState` Zod schema, resolved via `buildVibeKanbanPageLocals` (moved out of the UI presenter into a callable service if still coupled to Express response shaping).
- `Query.vibeKanbanOrganizations: [VibeKanbanOrganization!]!` and `Query.vibeKanbanProjects(organizationId: ID!): [VibeKanbanProject!]!` and `Query.vibeKanbanRepos: [VibeKanbanRepo!]!` — thin resolvers over `VibeKanbanBoardService`. The `VibeKanbanDestinationConfiguredGuard` used by the REST controller becomes a resolver-level guard (Nest supports GraphQL guards) so the "destination not active" error semantics match.
- `Mutation.updateSourceSettings(input: UpdateSourceSettingsInput!): EffectiveSettings!` and `Mutation.updateDestinationSettings(input: UpdateDestinationSettingsInput!): EffectiveSettings!` — bind to `SettingsService.applyGroupPatch('source' | 'destination', body)`. Return `EffectiveSettings` (the same type `effectiveSettings` query already returns) so Apollo can update cached entries automatically with a `merge` cache policy.

Web migration splits each page following the atomic-design rule (`apps/web/src/ui/README.md`): hooks live in `src/pages/*`, presentational pieces live in `src/ui/*`. The rewrite naturally splits `GithubPage` into a `GithubFieldsForm` molecule + `GithubPage` container; `VibeKanbanPage` into `VibeKanbanBoardPicker`, `VibeKanbanExecutorSelect`, `VibeKanbanSettingsForm`, and a `VibeKanbanPage` container.

**Alternative considered:** extend `effectiveSettings` with a single grab-bag `applyPatch(groupId: SettingsGroupId, input: JSON!)` mutation instead of typed `updateSourceSettings` / `updateDestinationSettings`. Rejected — it would re-introduce a `JSON` escape hatch and defeat the Zod-mirroring discipline that the rest of the schema follows.

### Decision: Delete `apiJson` and its Zod response schemas after migration

Once the three pages are on Apollo, `apps/web/src/api.ts` has zero importers. Delete the file (not just its exports). Remove any Zod response schema from `@vibe-squire/shared` whose only consumers were the web pages being migrated — Apollo codegen types now cover the same ground. Keep Zod schemas that are still used server-side (e.g. `GithubFieldsPayload` schema backing the `githubFields` resolver still runs through Zod when the resolver composes its return value).

**Alternative considered:** keep `apiJson` as a `dev-only` helper for hitting the two operator-tool POSTs from the browser. Rejected — the operator runs those from `curl`/`gh`, not the web client. Keeping the helper would be dead code.

### Decision: Decision table status enum is `removed | kept (operator tool)` (two values only)

There are no REST keepers justified by a non-operator reason after this change. Eliminate the `kept (REST)` category entirely. Every row in the decision table is either `removed` (every read, every GraphQL-duplicated mutation, both VK context routes, the SSE stream) or `kept (operator tool)` (the two POSTs). Removing the third category means future agents can't fuzzy-match a new REST endpoint into `kept (REST)` without thinking — they have to justify `kept (operator tool)` with a concrete curl/gh use case.

Format:

```
| HTTP | Path | Status | Justification |
|------|------|--------|---------------|
| GET  | /api/status | removed | Superseded by GraphQL `status` query. |
| GET  | /api/status/stream (SSE) | removed | Superseded by GraphQL `statusUpdated` subscription. |
| POST | /api/sync/run | kept (operator tool) | Convenient from `curl`/`gh` for manual sync trigger. |
| POST | /api/reinit | kept (operator tool) | Convenient from `curl` for source/destination re-bootstrap. |
…
```

Rows are sorted by path so diffs are readable. Adding a new REST endpoint in a future change requires a new row with a `kept (operator tool)` status and an explicit curl/gh use case — otherwise the endpoint shouldn't be REST.

**Alternative considered:** machine-readable JSON/YAML registry. Rejected as premature — ~15 rows, Markdown is fine.

### Decision: Dependency removal is mandatory, not opportunistic

The earlier draft framed `nestjs-zod` / `class-validator` / `class-transformer` removal as "opportunistic if the audit shows zero importers". Single-user, no-compat context makes it a *required* step. After the REST deletions:

- `class-validator` and `class-transformer` are only imported by DTO files whose handlers are removed. Delete those DTO files; `pnpm install` drops the deps from the lockfile.
- `nestjs-zod` (`@ZodResponse`) is only used by the four controllers being removed (`operator-bff`, `settings`, `vibe-kanban-context`, and anywhere else in `apps/server/src` that `@ZodResponse` surfaces). If `rg 'from .nestjs-zod.' apps/server/src` is empty post-deletion, remove it.
- `@nestjs/swagger` (`@ApiTags`, `@ApiOperation`, etc.): audit the two operator-tool controllers that remain. If they carry Swagger decorators, decide whether Swagger docs are worth keeping for two endpoints. Default: remove Swagger entirely — two endpoints don't justify an auto-generated docs page, and the GraphQL Sandbox is the only real exploration surface left.

**Alternative considered:** keep dependencies "just in case". Rejected — single user, no compat; dead deps slow `pnpm install`, inflate the lockfile, and invite their re-use.

### Decision: Delete whole controller and DTO files, not just handlers

Instead of trimming `operator-bff.controller.ts` handler-by-handler and leaving an empty class, delete the whole file once every handler is gone. Same for `activity-api.controller.ts`, `vibe-kanban-context.controller.ts`, and the DTO folders that were purely REST-shaped (`apps/server/src/ui/dto/`, `apps/server/src/mappings/dto/`, `apps/server/src/settings/dto/` — audit each). Remove the controller registrations from their enclosing Nest modules (`UiModule`, `MappingsModule`, `VibeKanbanModule`, etc.) in the same commit.

`status.controller.ts`, `settings.controller.ts`, and `mappings.controller.ts` are also expected to disappear entirely because all their handlers are REST-superseded. Only `sync.controller.ts` and `reinit.controller.ts` survive.

**Alternative considered:** keep empty controllers "in case we need to add a REST handler back". Rejected — single user, no compat; the policy is that new REST handlers require a decision-table row, and creating a new file is trivial.

### Decision: One-shot PR, staged commits internally

No feature flag, no staged rollout. Single-user, no external consumer. Inside the PR, keep commits small so `git bisect` and `git revert` stay useful:

1. Docs + policy (`docs/ARCHITECTURE.md` decision table, `AGENTS.md`, `.cursor/rules/architecture.mdc`, `README.md` API table).
2. Add new GraphQL operations (`githubFields`, `vibeKanbanUiState`, `vibeKanbanOrganizations`, `vibeKanbanProjects`, `vibeKanbanRepos`, `updateSourceSettings`, `updateDestinationSettings`) with integration tests — REST endpoints still live at this point.
3. Migrate `GithubPage` to GraphQL (single commit: new pages + atomic-design split + test rewrite).
4. Migrate `VibeKanbanPage` to GraphQL (same shape).
5. Migrate VK repo loading in `MappingsPage` to GraphQL.
6. Delete `apps/web/src/api.ts` and every unused Zod response schema.
7. Delete SSE handler (`@Sse('stream')` in `status.controller.ts`).
8. Delete REST GETs (`/api/status`, `/api/ui/*`, `/api/settings`, `/api/mappings`, `/api/activity/runs`, `/api/vibe-kanban/*`).
9. Delete REST mutations (`/api/mappings` POST/PATCH/DELETE, `/api/settings/*` PATCHes, `/api/pr/*` POSTs).
10. Delete whole controllers and their Nest module registrations; delete DTO folders.
11. Remove `nestjs-zod`, `class-validator`, `class-transformer`, and optionally `@nestjs/swagger` from `apps/server/package.json`; regenerate the lockfile.
12. Final verification: `pnpm -w test`, `pnpm -w typecheck`, local server + web smoke test.

**Alternative considered:** one giant commit. Rejected — even single-user development benefits from bisectability if a mistake slips in.

### Decision: Modify `graphql-status` (not REMOVE + ADD); ADD new requirements to `graphql-operator-bff`

`graphql-status` has a requirement ("REST and SSE status endpoints remain unchanged during the GraphQL migration — sunsetting deferred to P2.5") that describes the *same surface* (whether REST/SSE status endpoints exist) and just flips state. MODIFIED is the clean delta operation — the capability still governs the same policy.

`graphql-operator-bff` needs ADDED requirements for the seven new GraphQL operations (three VK context queries, `githubFields`, `vibeKanbanUiState`, `updateSourceSettings`, `updateDestinationSettings`). The existing parity-with-REST scenarios for `effectiveSettings`, `mappings`, `activityFeed`, `integrationNav`, and `dashboardSetup` are MODIFIED to assert parity against the archived P2.4 contract and the backing store rather than a live REST endpoint.

**Alternative considered:** a whole new capability `graphql-integrations-bff` for GitHub/VK-context reads. Rejected — `graphql-operator-bff` is already where settings/mappings/activity/dashboard-setup live; splitting it along REST-vs-GraphQL lines would invent a boundary that doesn't exist in the code.

## Risks / Trade-offs

- **[Risk] A hidden consumer (script, smoke test, manual curl doc) calls a removed endpoint and silently breaks for the single user (i.e. the author).** → Mitigation: pre-flight grep of `apps/web/src`, `apps/server/test`, `README.md`, `docs/**`, `scripts/**`, and repo root for every candidate path before its deletion commit. Single user: if the author's own muscle memory hits `curl /api/status` the morning after merge, `git log`+`git revert` is 10 seconds.
- **[Risk] The `VibeKanbanDestinationConfiguredGuard` used by the REST controller doesn't translate cleanly to a Nest GraphQL guard.** → Mitigation: Nest's `CanActivate` guards work at the GraphQL resolver level via `@UseGuards` on resolver methods; if the existing guard depends on `ExecutionContext.switchToHttp()`, rewrite it to use `GqlExecutionContext.create(ctx).getContext()`. Worst case: move the guard's check inline into each resolver method — it's a simple "is destination active?" flag read.
- **[Risk] Apollo `merge` cache policies for `updateSourceSettings` / `updateDestinationSettings` don't automatically refresh `effectiveSettings`.** → Mitigation: the mutations return `EffectiveSettings` directly, which Apollo normalizes by default if it has a stable key — if normalization isn't enough, fall back to explicit `refetchQueries: [EffectiveSettingsDocument]` on the mutation call sites.
- **[Risk] Deleting `nestjs-zod` breaks a transitive import we didn't notice.** → Mitigation: `rg 'from .nestjs-zod.' apps/server/src` before and after the deletions; `pnpm --filter apps/server build` must pass before the dep-removal commit.
- **[Risk] Bundle size doesn't shrink as expected because imports aren't tree-shaken.** → Mitigation: `pnpm --filter apps/server build` and grep the dist output for removed path strings (`/api/status/stream`, `/api/vibe-kanban/organizations`). Same for `apps/web` — confirm `apiJson` and unused Zod schemas aren't in the bundle.
- **[Risk] Modifying `graphql-operator-bff` and `graphql-status` live specs introduces drift with archived change specs in `openspec/changes/archive/*`.** → Mitigation: the MODIFIED delta only touches the live spec; archived change specs stay as historical artifacts. Archive review during the P2.5 archive step catches this.
- **[Trade-off] The PR is large** — three web-page rewrites + seven new GraphQL operations + ~dozen endpoint deletions + docs + dep removal — because we refused to stage it across two stories. Single-user context justifies the size; we eat one large PR instead of paying coordination cost across two.
- **[Trade-off] `buildVibeKanbanPageLocals` probably needs to move out of `apps/server/src/ui/ui-vibe-kanban-presenter.ts` into a callable service if it's currently shaped around Express response objects.** We accept the refactor as cost of decoupling UI-shape from HTTP transport.

## Migration Plan

1. **Pre-flight audit (read-only)**: Grep each candidate path for remaining callers. Assemble the full decision-table rows with justifications. Confirm only `apps/web/src/pages/{GithubPage,VibeKanbanPage,MappingsPage}.tsx` use `apiJson`.
2. **Policy commit**: Add `## Transport decision table` to `docs/ARCHITECTURE.md`; update `AGENTS.md`, `.cursor/rules/architecture.mdc`, `README.md` API table. Policy lands before any code change so subsequent commits reference a live doc.
3. **Add GraphQL operations**: `githubFields`, `vibeKanbanUiState`, `vibeKanbanOrganizations`, `vibeKanbanProjects`, `vibeKanbanRepos`, `updateSourceSettings`, `updateDestinationSettings`. Write resolvers, add integration tests, regenerate Apollo codegen. REST stays live.
4. **Web migration**: three commits, one per page (`GithubPage`, `VibeKanbanPage`, `MappingsPage` VK-loading block), each splitting into atomic-design components and switching to Apollo. Tests rewritten to use `MockedProvider`.
5. **Delete `apiJson`**: remove `apps/web/src/api.ts`, drop unused Zod response schemas, confirm `rg 'apiJson|EventSource' apps/web/src` is empty.
6. **Delete SSE**: remove `@Sse('stream')` handler, trim `StatusEventsService` glue.
7. **Delete REST GETs**: one commit per endpoint (or grouped by file when they share a controller).
8. **Delete REST mutations**: one commit per file.
9. **Delete whole controller files and Nest module registrations**.
10. **Dep + DTO cleanup**: delete dead DTO folders; `rg` to confirm zero importers; remove `nestjs-zod`, `class-validator`, `class-transformer`, optionally `@nestjs/swagger` from `apps/server/package.json`; `pnpm install`.
11. **Final verification**: `pnpm -w test`, `pnpm -w typecheck`, `pnpm --filter apps/server build`, `pnpm --filter apps/web build`, local boot + smoke test of every operator-console flow.

**Rollback**: `git revert` the commit at fault. Every commit is small and self-contained.

## Open Questions

- Do `POST /api/sync/run` and `POST /api/reinit` warrant Swagger (`@nestjs/swagger`) docs? Default: no — two endpoints, `curl -XPOST http://localhost:3000/api/sync/run` is self-documenting. Remove `@nestjs/swagger` entirely unless the audit shows meaningful value.
- Does `GET /api/vibe-kanban/repos` need to stay? The web client loads it from `MappingsPage` VK loader; the new `Query.vibeKanbanRepos` replaces it and no operator-tool use case justifies a REST keeper. Default: `removed`. Revisit only if the author discovers a shell-script use case.
- Do we keep any dev-only `/graphql` playground/sandbox exposure? Yes — the existing Apollo Sandbox gating stays. Confirmed via bundle check that it doesn't leak into prod.
- Should we add a CI lint that fails on new `@Controller('api/...')` additions without a decision-table row? Overkill for single user. Document the expectation in `AGENTS.md` and move on.
