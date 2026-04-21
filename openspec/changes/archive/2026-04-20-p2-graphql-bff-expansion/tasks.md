## 1. Server GraphQL surface

- [x] 1.1 Inventory REST payloads for settings, mappings, activity (including per-item shape), `integrationNav`, sync commands, and `/api/triage/*`; list GraphQL fields needed per screen and align enums with Zod.
- [x] 1.2 Implement `effectiveSettings` query resolver returning field metadata (`key`, `label`, `value`, `envVar`, `description`), `scheduledSyncEnabled`, `autoCreateIssues`, and `resolvedSourceLabel` / `resolvedDestinationLabel`; delegate to `apps/server/src/settings/` services.
- [x] 1.3 Implement `mappings` query (list with stable `id`) delegating to `apps/server/src/mappings/`.
- [x] 1.4 Implement `activityFeed` Relay-style connection returning `ActivityRun` nodes with nested `items` (PR #, title, author, repo, decision, decisionLabel, effectiveDecision, detail, kanbanIssueId); delegate to activity service logic currently behind `activity-api.controller.ts`.
- [x] 1.5 Implement `integrationNav` query delegating to `ui-nav.service.ts` (or extracted provider).
- [x] 1.6 Implement CRUD mutations `updateSettings`, `upsertMapping`, `updateMapping`, and `deleteMapping` with Zod-validated inputs and REST-parity responses.
- [x] 1.7 Implement triage mutations `acceptTriage`, `declineTriage`, `reconsiderTriage` bound to the same application logic as `/api/pr/*` (REST triage surface); return enough data for Apollo cache updates.
- [x] 1.8 Implement sync-control mutations `triggerSync` and `reinitIntegration`.
- [x] 1.9 Implement `activityEvents` subscription bridged from the same domain signals as `statusUpdated` (plus any new emit site added inside sync/triage); payload format documented in the PR (changed-node vs. invalidation signal).
- [x] 1.10 Implement `dashboardSetup` query returning the same logical payload as `GET /api/ui/setup` (evaluation, checklist rows, reason messages); reuse `SetupEvaluationService`, `buildSetupChecklist`, and `SETUP_REASON_MESSAGES` from the REST path.

## 2. Server integration tests

- [x] 2.1 Add integration tests for `effectiveSettings` (metadata parity with `/api/ui/settings-meta`, resolved labels) and `updateSettings` (happy + validation error).
- [x] 2.2 Add integration tests for `mappings`, `upsertMapping`, `updateMapping`, and `deleteMapping`.
- [x] 2.3 Add integration tests for `activityFeed` pagination (first page, cursor page without duplicates, item shape) and for nested `items` fields.
- [x] 2.4 Add integration tests for `integrationNav` parity with REST aggregation.
- [x] 2.5 Add integration tests for `triggerSync` and `reinitIntegration` mirroring REST acceptance rules.
- [x] 2.6 Add integration tests for triage mutations (`acceptTriage` / `declineTriage` / `reconsiderTriage`) mirroring the REST triage tests.
- [x] 2.7 Add `activityEvents` subscription integration test: subscribe via `graphql-ws`, trigger a run completion or triage mutation, assert a payload is received.
- [x] 2.8 Add integration test asserting `dashboardSetup` matches `GET /api/ui/setup` (evaluation fields, checklist, reason messages).

## 3. Web GraphQL client and codegen

- [x] 3.1 Add `@graphql-codegen/cli` and `@graphql-codegen/client-preset` (or agreed equivalent) to `apps/web` with a `pnpm` script; emit generated documents/types to `apps/web/src/__generated__/` and check them in.
- [x] 3.2 Extend the Apollo `InMemoryCache` `typePolicies`: `Query.mappings` merge, `Query.activityFeed` Relay-style pagination, settings singleton handling, and `ActivityRun` / `ActivityItem` normalization by stable `id`.
- [x] 3.3 Add named operations (hand-written or generated) under the `graphql/` barrel for settings, mappings (including `updateMapping`), activity (query + subscription), integration nav, sync, and triage mutations; remove inline `gql` from `pages/` and `ui/`.
- [x] 3.4 Configure optimistic responses for `updateSettings`, `upsertMapping`, `updateMapping`, `deleteMapping`, and the three triage mutations.
- [x] 3.5 Remove any legacy `vs_triage_optimistic` `localStorage` handling (if residues exist from the pre-split UI).

## 4. Web screens — data migration

- [x] 4.1 Migrate Settings page data hooks to Apollo (`effectiveSettings` / `updateSettings`); render save-success banner/toast when scheduler refresh applies.
- [x] 4.2 Migrate Mappings page data hooks to Apollo (`mappings` / `upsertMapping` / `updateMapping` / `deleteMapping`); wire inline row edit.
- [x] 4.3 Migrate Activity page to Apollo `activityFeed` (query + `fetchMore`) and subscribe to `activityEvents` for live updates; wire triage mutations to the restored action buttons.
- [x] 4.4 Wire manual sync / reinit controls on relevant migrated screens to `triggerSync` and `reinitIntegration` mutations.
- [x] 4.5 If nav consumes REST today, switch it to `integrationNav` GraphQL and verify routes still resolve.
- [x] 4.6 Migrate the dashboard setup checklist from `GET /api/ui/setup` to Apollo `dashboardSetup` (named operation + codegen); refetch alongside `status` after sync and reinit.

## 5. Web screens — restored UX and atomic layout

- [x] 5.1 Settings: build the "Sync adapters" info-card organism (consumes resolved labels + env-var references); add a settings-form organism that renders muted setting-key hints from `effectiveSettings.coreFields[*].key` / `.envVar` / `.description`.
- [x] 5.2 Settings: decompose `SettingsPage.tsx` into a template plus the organisms above; page retains all Apollo hooks.
- [x] 5.3 Mappings: build editable-row molecule (edit / save / cancel local state, receives handlers as props) and a mappings-table organism composing rows; restore the VK-repos error banner as a small organism/molecule.
- [x] 5.4 Mappings: decompose `MappingsPage.tsx` into a template plus organisms above.
- [x] 5.5 Activity: build triage-action molecule (Review / Decline / Reconsider), run-with-items organism, and activity-feed organism (consumes `activityFeed` connection + "load more" handler).
- [x] 5.6 Activity: decompose `ActivityPage.tsx` into a template plus organisms above; page owns `useQuery(activityFeed)`, `useSubscription(activityEvents)`, and triage mutation wiring.
- [x] 5.7 Update `apps/web/src/ui/README.md` to document the new organisms/molecules and reiterate the "pages are the sole hook boundary" rule (including subscriptions).

## 6. No-polling and dependency cleanup

- [x] 6.1 Verify no operator data refetch loops remain: grep `apps/web/src/` for `setInterval(`, `setTimeout(` used to drive refetches, and any `refetchInterval` configuration; remove or replace with subscription-driven refresh.
- [x] 6.2 Remove TanStack Query usage from `apps/web` when no screens import it; drop `QueryClientProvider` from `main.tsx` in the same change.
- [x] 6.3 Remove `@tanstack/react-query` from `apps/web/package.json` unless a documented intentional REST holdout remains.
- [x] 6.4 Run `pnpm --filter @vibe-squire/web build`, `pnpm --filter @vibe-squire/web typecheck`, and server tests; fix regressions.

## 7. Close-out

- [x] 7.1 Walk each migrated screen against acceptance criteria in `docs/stories/p2-graphql-bff-expansion.md` and tick story checkboxes in the PR description.
- [x] 7.2 Regenerate or update `apps/server/src/generated/schema.graphql` if the repo tracks emitted SDL, ensuring a reviewable diff for the expanded schema.
- [x] 7.3 In the PR description, document: the `activityEvents` payload shape chosen, the Apollo cache policies, and a side-by-side note of the restored pre-split UX pieces so reviewers can confirm parity.
