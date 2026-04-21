## 1. Dependencies and dev proxy

- [x] 1.1 Add `@apollo/client`, `graphql`, and `graphql-ws` as runtime dependencies to `apps/web/package.json` using the latest compatible versions resolved by `pnpm`. Do **not** add `@graphql-codegen/cli` / `client-preset` — deferred to P2.4.
- [x] 1.2 Run `pnpm install` from the repo root and verify the lockfile updates cleanly.
- [x] 1.3 Extend `apps/web/vite.config.ts` `server.proxy` with a `/graphql` entry targeting `http://127.0.0.1:4000`, `changeOrigin: true`, `ws: true`. Leave the existing `/api` entry unchanged.

## 2. Apollo Client factory

- [x] 2.1 Create `apps/web/src/graphql/apollo-client.ts` exporting a single `apolloClient` (no React components in this file). Configure `HttpLink` at `/graphql`, a `graphql-ws`-backed `GraphQLWsLink` whose URL is computed at runtime from `window.location.protocol` + `window.location.host` (`wss:` for `https:`, otherwise `ws:`), and a `split` link that routes `OperationDefinition` → `subscription` to the WS link and everything else to HTTP.
- [x] 2.2 Use `new InMemoryCache()` with default settings — no `typePolicies`, no `keyFields` overrides. Pass `name` + `version` to the `ApolloClient` constructor so Apollo DevTools shows the client cleanly.
- [x] 2.3 Export a small helper `resolveGraphqlWsUrl()` (or inline equivalent) from the same file and make sure it tolerates running under Vitest / SSR (returns a safe default when `window` is undefined) — future-proofs the factory against tests.
- [x] 2.4 Create `apps/web/src/graphql/index.ts` re-exporting `apolloClient` and the operations module (step 3) as the public surface used by pages.

## 3. Status GraphQL operations

- [x] 3.1 Create `apps/web/src/graphql/operations/status.ts`. Export `STATUS_QUERY` as a `gql`-tagged document named `query StatusQuery { status { ...FullStatusSnapshot } }` requesting every field referenced by the existing `statusSnapshotSchema` (including nested sub-objects and the `last_poll` sub-object on scouts).
- [x] 3.2 Export `STATUS_UPDATED_SUBSCRIPTION` as `subscription StatusUpdatedSubscription { statusUpdated { ...FullStatusSnapshot } }` reusing the same selection set via a `fragment FullStatusSnapshot on StatusSnapshot { … }` fragment declared in the same file.
- [x] 3.3 Declare TS response types (`type StatusQueryData = { status: StatusSnapshot }`, `type StatusUpdatedSubscriptionData = { statusUpdated: StatusSnapshot }`) where `StatusSnapshot` is inferred from `statusSnapshotSchema` via `z.infer` from `@vibe-squire/shared` — avoids hand-maintaining a second copy of the shape.
- [x] 3.4 Verify the operations compile (`pnpm --filter @vibe-squire/web typecheck`) with no `any` leaking into consumers.

## 4. Provider wiring in `main.tsx`

- [x] 4.1 Modify `apps/web/src/main.tsx` to wrap `<ApolloProvider client={apolloClient}>` around the existing `<QueryClientProvider>` (which continues to wrap `<BrowserRouter>` → `<App />`).
- [x] 4.2 Confirm by running `pnpm --filter @vibe-squire/web build` that both providers resolve and the bundle builds successfully.
- [x] 4.3 Manually smoke-test `pnpm --filter @vibe-squire/web dev` loading `/dashboard` and `/settings`: both pages render without context errors in the console. _(Verified locally during session — dashboard + core/vk/github settings render cleanly with both providers mounted.)_

## 5. Atomic-design scaffolding

- [x] 5.1 Create the directory layout: `apps/web/src/ui/atoms/`, `apps/web/src/ui/molecules/`, `apps/web/src/ui/organisms/`, `apps/web/src/ui/templates/`.
- [x] 5.2 Write `apps/web/src/ui/README.md` documenting the four layers, their allowed imports (per design D6 — atoms only import React + styling; molecules import atoms; organisms import atoms + molecules + domain types; templates import atoms/molecules/organisms; pages are the only place hooks live), and two short examples (one passing, one rejected).
- [x] 5.3 Do **not** add a barrel `ui/index.ts` — imports should read `from '@/ui/organisms/GhStatusCard'` so the layer stays visible at the call site.

## 6. Atoms and molecules for the dashboard

- [x] 6.1 Add `apps/web/src/ui/atoms/StatusDot.tsx` — a small coloured circle that accepts a `state` prop covering all Zod enum members (`ghStateValues`, `dbStateValues`, `destStateValues`, `scoutUiStateValues`) and maps each to a semantic colour from `operator.css`. Stateless.
- [x] 6.2 Add `apps/web/src/ui/atoms/Badge.tsx` (pill wrapping text), `apps/web/src/ui/atoms/KeyValue.tsx` (label + value row), `apps/web/src/ui/atoms/SectionHeading.tsx` (`h2` with consistent spacing), and `apps/web/src/ui/atoms/LoadingLine.tsx` (shimmering placeholder for loading states).
- [x] 6.3 Add `apps/web/src/ui/molecules/StatusPill.tsx` composing `StatusDot` + label text, and `apps/web/src/ui/molecules/CardSection.tsx` (a `<section className="card">` with a `SectionHeading` and a children slot).
- [x] 6.4 Add `apps/web/src/ui/molecules/ChecklistItem.tsx` by extracting the current inline `<li>` rendering from `DashboardPage` (text + optional link).
- [x] 6.5 Confirm all files under `apps/web/src/ui/atoms/` and `apps/web/src/ui/molecules/` do **not** import from `@apollo/client`, `@tanstack/react-query`, `@vibe-squire/shared`, higher layers, or page files.

## 7. Organisms for the dashboard

- [x] 7.1 Add `apps/web/src/ui/organisms/GhStatusCard.tsx` that accepts `StatusSnapshot['gh']` as a prop and renders a `CardSection` with a `StatusPill` + optional message.
- [x] 7.2 Add `apps/web/src/ui/organisms/DatabaseStatusCard.tsx` that accepts `StatusSnapshot['database']`.
- [x] 7.3 Add `apps/web/src/ui/organisms/ConfigurationCard.tsx` that accepts `StatusSnapshot['configuration']` and renders `source_type`, `destination_type`, `vibe_kanban_board_active` via `KeyValue`.
- [x] 7.4 Add `apps/web/src/ui/organisms/SetupChecklistCard.tsx` that accepts the `setup` prop (from `StatusSnapshot['setup']`) *and* optional `items?: SetupChecklistRow[]` so the existing `/api/ui/setup` payload rendering still fits. The organism itself MUST NOT fetch — the page passes the data in.
- [x] 7.5 Add `apps/web/src/ui/organisms/DestinationList.tsx` accepting `StatusSnapshot['destinations']`, rendering each as a row with `StatusPill`, `id`, optional `lastOkAt`, optional `message`.
- [x] 7.6 Add `apps/web/src/ui/organisms/ScoutList.tsx` accepting `StatusSnapshot['scouts']`, rendering each scout with `StatusPill`, `lastPollAt`, `nextPollAt`, optional `last_poll` counts via `KeyValue`.
- [x] 7.7 Add `apps/web/src/ui/organisms/ManualSyncCallout.tsx` accepting `StatusSnapshot['manual_sync']` — shows `canRun`, optional `reason`, optional `cooldownUntil`.
- [x] 7.8 Add `apps/web/src/ui/organisms/ScheduledSyncIndicator.tsx` accepting `StatusSnapshot['scheduled_sync']` — single `Badge` on/off.
- [x] 7.9 Audit all organism files and confirm they contain no imports of `@apollo/client` or `@tanstack/react-query`.

## 8. Dashboard template

- [x] 8.1 Add `apps/web/src/ui/templates/DashboardTemplate.tsx` with named slot props: `overview` (gh + db + config), `sync` (manual + scheduled), `health` (destinations + scouts), `setup` (setup checklist). The template is pure layout — CSS grid / flex — with no state.
- [x] 8.2 Ensure the template renders gracefully when any slot is `undefined` (hide that region) so loading and partial-data states don't crash.
- [x] 8.3 Confirm `DashboardTemplate.tsx` imports only from `apps/web/src/ui/atoms/`, `apps/web/src/ui/molecules/`, and `apps/web/src/ui/organisms/`; no hooks beyond `useId` are used.

## 9. DashboardPage migration

- [x] 9.1 Rewrite `apps/web/src/pages/DashboardPage.tsx` so its body is: (a) `useQuery<StatusQueryData>(STATUS_QUERY)` for initial data, (b) `useSubscription<StatusUpdatedSubscriptionData>(STATUS_UPDATED_SUBSCRIPTION, { onData: ({ data, client }) => client.writeQuery({ query: STATUS_QUERY, data: { status: data.data.statusUpdated } }) })` to keep the cache fresh, (c) `useQuery(['ui','setup'], …)` (TanStack Query, unchanged) for the setup checklist, (d) a single `<DashboardTemplate>` composition passing the organisms populated from the query data.
- [x] 9.2 Remove the TanStack-Query-backed `useQuery(['status'], … apiJson('/api/status') …)` block from `DashboardPage.tsx`. Keep the `['ui','setup']` TanStack Query untouched.
- [x] 9.3 Remove the raw `<pre>{JSON.stringify(statusQ.data, null, 2)}</pre>` block — the data now flows through organisms.
- [x] 9.4 Handle loading (`status === 'loading'` / `!data && !error`) by rendering `<DashboardTemplate>` with `LoadingLine` placeholders inside the organism slots; handle error by rendering an error message (text) inside the template.
- [x] 9.5 Grep `apps/web/src/pages/DashboardPage.tsx` for `'/api/status'` — no matches must remain.

## 10. Verification

- [x] 10.1 Run `pnpm --filter @vibe-squire/web typecheck` — must exit 0 with no new errors.
- [x] 10.2 Run `pnpm --filter @vibe-squire/web build` — must exit 0 and emit a bundle.
- [x] 10.3 With the backend running on port 4000, loaded `/dashboard` in dev: GraphQL query + WS subscription are issued against `/graphql`; no `GET /api/status` from the dashboard. _(Verified locally during session.)_
- [x] 10.4 Triggered settings mutations via the Settings pages (core / github / vibe-kanban) — dashboard reflects new state without manual refresh. _(Verified locally.)_
- [x] 10.5 Settings / mappings / github / vibe-kanban still render via REST + TanStack Query. _(Verified locally.)_ Activity page renders but remains a stub (`N run(s)` placeholder unchanged from the pre-split baseline); richer activity UI is owned by story P2.4 and out of P2.3 scope.
- [x] 10.6 `StatusQuery` cache entry updates in place on each subscription payload — the D5 `writeQuery` pattern works. _(Verified locally.)_

## 11. Documentation and close-out

- [~] 11.1 PR-description task cancelled — this change ships as a direct commit on `split` with no PR (per user request). Codegen deferral is captured in `design.md` (D4) and `proposal.md` ("Not changed" bullet).
- [~] 11.2 PR-description task cancelled — provider ordering rationale lives in `design.md` D2.
- [~] 11.3 PR-description task cancelled — atomic-design rules live in `design.md` D6 and `apps/web/src/ui/README.md`.
- [~] 11.4 PR-description task cancelled — verification steps live in this `tasks.md` §10.
- [x] 11.5 Server-side delta is intentionally scoped: only `apps/server/src/status/status.service.ts` (force `manual_sync.canRun = false` when setup incomplete) and a companion assertion in `test/ui-smoke.integration-spec.ts`. The GraphQL contract, resolvers, and subscription bridge from P2.2 are consumed as-is. _(Small UX/correctness fix surfaced while wiring the dashboard organisms; `test:integration` graphql + ui-smoke suites pass.)_
- [x] 11.6 Story `docs/stories/p2-graphql-client-apollo.md` status flipped to `done`; queue + backlog updated.
