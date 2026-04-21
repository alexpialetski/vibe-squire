## Context

P2.1 shipped the GraphQL backend foundation, and P2.2 (archived as `2026-04-20-port-status-to-graphql`) shipped the first real feature over it: `query { status }` and `subscription { statusUpdated }`, with enums for `gh.state`, `database.state`, `destinations[].state`, `scouts[].state`, and `graphql-ws` as the subscription transport. The resolver is a thin wrapper over `StatusService.getSnapshot()`; wire field names are snake_case for REST parity (see archived P2.2 design D4). REST `GET /api/status` and SSE `GET /api/status/stream` remain live.

The client today is `apps/web` — React 19 + Vite 6 + React Router 7, data-fetching via TanStack Query:

- `apps/web/src/main.tsx` mounts `<QueryClientProvider>` above `<BrowserRouter>` → `<App />`.
- `apps/web/src/pages/DashboardPage.tsx` fires `useQuery(['status'], GET /api/status)` and `useQuery(['ui','setup'], GET /api/ui/setup)`, then renders a heading, the setup checklist, and a raw `<pre>` of the status JSON.
- `apps/web/vite.config.ts` proxies `/api` → `http://127.0.0.1:4000` in dev. There is no `/graphql` proxy.
- `apps/web/src/api.ts` is a tiny `apiJson<T>` fetch wrapper used by every page.
- Other pages — `Activity`, `Mappings`, `Github`, `Settings`, `VibeKanban` — use the same `apiJson` + TanStack Query pattern.

Constraints the design must respect:

- **Coexistence.** The remaining screens keep working on REST + TanStack Query until P2.4. `ApolloClient` and `QueryClient` must live in the same React tree with no cross-contamination.
- **Dev ergonomics.** Vite dev proxies both `/graphql` HTTP and the `/graphql` WS upgrade to port 4000 so devs run the same `pnpm --filter @vibe-squire/web dev` they run today.
- **No codegen yet.** Per the story's Notes, we defer `@graphql-codegen/client-preset` to P2.4. Operations are hand-typed `DocumentNode`s with manual TS types, deliberately kept small.
- **Cache correctness.** `StatusSnapshot` is a singleton-shaped root-query result with no `id` on the top object (the nested `destinations[]` and `scouts[]` items do expose `id`). Apollo's default `InMemoryCache` uses `__typename + id`; types without `id` are merged into the owning query's field. That is fine for this story — do not introduce field policies now.
- **Schema shape.** `statusSnapshotSchema` uses snake_case keys (`pending_triage_count`, `manual_sync`, `scheduled_sync`). The server's P2.2 `@ObjectType()` classes align property names with those wire names so Nest's default field resolver works. Client operations therefore spell those fields in snake_case — an unusual but deliberate choice for the migration; codegen in P2.4 will surface them as typed properties either way.
- **Hexagonal client analog.** Pages compose; atomic components don't do their own data fetching. Data enters at the page (or an organism directly bound to a query/subscription) and flows down through props so the atomic pieces stay testable and reusable. This mirrors the server-side rule that resolvers are driving adapters and application services don't reach into transports.

## Goals / Non-Goals

**Goals:**

- Stand up `ApolloClient` in `apps/web` with one correct configuration — a `split` link routing queries/mutations to `HttpLink` and subscriptions to a `graphql-ws` `GraphQLWsLink` — and coexist with the existing `QueryClient`.
- Prove the pattern by migrating the dashboard/status screen to `useQuery(STATUS_QUERY)` + `useSubscription(STATUS_UPDATED_SUBSCRIPTION)`, removing the REST fetch for the snapshot only. Setup checklist stays on REST until P2.4.
- Introduce a project-wide atomic-design layout (`apps/web/src/ui/{atoms,molecules,organisms,templates}/`) with a short README codifying what belongs at each level and the "no fetching below organism" rule.
- Decompose the dashboard into that layout — only creating the pieces this screen actually uses — so P2.4 has a concrete example to copy.
- Leave `pnpm --filter @vibe-squire/web build` and `pnpm --filter @vibe-squire/web typecheck` green, with no visible regression on the other pages.

**Non-Goals:**

- Migrating other screens (Settings, Mappings, Activity, Github, VibeKanban) — that's P2.4.
- Adding GraphQL codegen tooling or committing generated artifacts under `apps/web/src/__generated__/`. Deferred to P2.4.
- Introducing Apollo field policies, offline persistence, or custom cache IDs. `InMemoryCache()` defaults suffice for a singleton `status` query plus id-bearing nested lists.
- Client-side tests — there is no client test harness today, and P2.4 is a more natural place to introduce one.
- Removing the server-side REST or SSE endpoints. Sunset is explicitly P2.5.
- Migrating `/api/ui/setup` (setup checklist) — it is not part of the P2.2 GraphQL contract yet.
- Retro-refactoring the other pages into atomic-design folders. Each page migrates when its data-layer migration lands.

## Decisions

### D1: Apollo Client shape — split link + plain `InMemoryCache`

**Decision.** Build one `ApolloClient` in a dedicated factory at `apps/web/src/graphql/apollo-client.ts`:

```ts
// sketch
const httpLink = new HttpLink({ uri: '/graphql' });
const wsLink = new GraphQLWsLink(
  createClient({ url: resolveGraphqlWsUrl() }),
);
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition'
      && def.operation === 'subscription';
  },
  wsLink,
  httpLink,
);
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

`resolveGraphqlWsUrl()` returns a same-origin `ws://…/graphql` or `wss://…/graphql` at runtime (chosen from `window.location`) so the dev proxy and prod both work without environment variables. `name` and `version` are passed to the client constructor for Apollo DevTools.

**Alternatives considered.**

- **Batched HTTP link.** Rejected — premature optimisation. The status screen fires one query + one subscription; batching has zero effect and adds a moving part.
- **Single WS link for everything (no HTTP).** Rejected — mutations over WS work but are non-idiomatic and make CDN / auth inspection harder once we add either. HTTP + WS split is the default Apollo recipe for a reason.
- **Set `Cache-Control` / custom typePolicies now.** Rejected — no evidence they are needed. We add them reactively in P2.4 if a concrete duplication/stale issue appears.

### D2: Provider ordering — `ApolloProvider` outside `QueryClientProvider`

**Decision.** In `apps/web/src/main.tsx`, wrap `<ApolloProvider client={apolloClient}>` around `<QueryClientProvider client={queryClient}>`, which continues to wrap `<BrowserRouter>` → `<App />`. TanStack Query keeps its `QueryClient`; Apollo gets its own cache. Nothing bridges them.

**Alternatives considered.**

- **Swap order so Apollo is inside.** Rejected — functionally equivalent (both are context providers with no ordering constraint), but putting the newer provider outermost makes it trivial to remove when P2.5 sunsets REST + TanStack Query without reshuffling the tree.
- **Replace TanStack Query with Apollo in this story.** Rejected — story explicitly forbids it; regressing screens we don't yet own the migration story for is out of scope.

### D3: Vite dev proxy for HTTP + WS

**Decision.** Extend `apps/web/vite.config.ts` with a `/graphql` proxy entry that sets `ws: true` alongside `changeOrigin: true`, pointing at `http://127.0.0.1:4000`. The existing `/api` proxy stays. Production builds are served from the same origin by Nest's static handler, so no proxy is needed there.

```ts
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    '/graphql': { target: 'http://127.0.0.1:4000', changeOrigin: true, ws: true },
  },
}
```

**Alternatives considered.**

- **Point the `graphql-ws` client at `ws://127.0.0.1:4000/graphql` directly in dev and skip the proxy.** Rejected — introduces an origin split that means CORS + cookie-auth headaches later, and requires env-conditional client configuration. The proxy is two lines; pay it once.
- **Mount the proxy under a prefix (e.g. `/bff/graphql`).** Rejected — the server already serves GraphQL at `/graphql`; renaming client-side creates drift without benefit.

### D4: Operations live hand-typed next to the feature that uses them

**Decision.** The status query and subscription live at `apps/web/src/graphql/operations/status.ts` as `gql` templates with manually-declared TS response types that mirror the fields we request. Operations are given explicit names (`StatusQuery`, `StatusUpdatedSubscription`) so Apollo DevTools shows them clearly.

```ts
export const STATUS_QUERY = gql`
  query StatusQuery {
    status {
      timestamp
      pending_triage_count
      gh { state message }
      database { state message }
      setup { complete mappingCount reason }
      configuration { source_type destination_type vibe_kanban_board_active }
      destinations { id state lastOkAt message }
      scouts {
        id state lastPollAt nextPollAt lastError skipReason
        last_poll { candidates_count skipped_unmapped issues_created }
      }
      manual_sync { canRun reason cooldownUntil }
      scheduled_sync { enabled }
    }
  }
`;
```

The TS response types are thin aliases that piggy-back on `statusSnapshotSchema` from `@vibe-squire/shared` (e.g. `type StatusQueryData = { status: z.infer<typeof statusSnapshotSchema> }`). This reuses the Zod-inferred shape without introducing codegen — if the GraphQL response diverges from the Zod contract, the shared-package test suite already shipped in P2.2 catches it server-side.

**Alternatives considered.**

- **`@graphql-codegen/client-preset` in this story.** Rejected per story Notes — the status screen has two operations; the ROI is lower than the noise of committing the generator and generated output. Record the decision in the PR description and adopt codegen in P2.4 when we expect 5–10+ operations.
- **Colocate operations in the page component.** Rejected — that's exactly the single-file layout the user asked us to avoid. A dedicated `graphql/operations/` folder makes operations reusable (the subscription needs the same selection set as the query, so a shared fragment drops in cleanly).

### D5: `useQuery` + `useSubscription` composition at the page level

**Decision.** The page/organism calls `useQuery(STATUS_QUERY)` to seed the data and `useSubscription(STATUS_UPDATED_SUBSCRIPTION)` to keep it fresh. The subscription handler writes the new snapshot back into the Apollo cache using `client.writeQuery({ query: STATUS_QUERY, data: { status: payload } })`. Downstream atomic components read from `useQuery` (which re-renders from the cache) and never touch the subscription directly.

Rationale: `useSubscription`'s default `onData` callback fires before the cache is updated; writing through `client.writeQuery` inside the handler keeps a single source of truth for all consumers and means any future organism that consumes `STATUS_QUERY` gets live data for free. This is the Apollo-recommended shape for "subscription keeps a query fresh" flows and is the pattern we will reuse in P2.4 for boards / mappings.

**Alternatives considered.**

- **Return the subscription payload directly from a custom hook and pass it as a prop tree.** Rejected — every future consumer must thread the prop; not cache-friendly; duplicates the subscription on every render of a consumer.
- **Use `subscribeToMore` on the query.** Acceptable alternative; functionally equivalent. We pick `useSubscription` + `writeQuery` because it reads top-down (clearer ownership in a fresh codebase) and it's the shape codegen will generate in P2.4.

### D6: Atomic-design layout for `apps/web/src/ui/`

**Decision.** Introduce `apps/web/src/ui/` with four subfolders and a short README. Every new piece lands at the **lowest level at which it's reusable**. The rules:

| Layer | Scope | May import | May NOT |
|-------|-------|------------|---------|
| `atoms/` | Single-element primitives (`Badge`, `StatusDot`, `Heading`, `KeyValue`). Stateless. | React, design tokens, `operator.css`. | Other UI layers. Apollo/TanStack hooks. Domain types. |
| `molecules/` | Small compositions of atoms around one idea (`StatusPill` = `StatusDot` + label, `CardSection` = heading + slot). Stateless or very-local state only. | `atoms/`. | Apollo/TanStack hooks. Data-shape imports from `@vibe-squire/shared`. |
| `organisms/` | Feature-bearing blocks that receive domain data as props and render (`GhStatusCard`, `DestinationList`, `ScoutTile`, `ManualSyncCallout`). May import domain types. | `atoms/`, `molecules/`, `@vibe-squire/shared` types. | Apollo/TanStack hooks. |
| `templates/` | Layout skeletons — Grid/stack arrangements with named slots (`DashboardTemplate` exposes `<slot name="overview">` etc.). | `atoms/`, `molecules/`, `organisms/`. | Hooks. |

Pages (`apps/web/src/pages/*.tsx`) remain the orchestration layer: they call hooks (`useQuery`, `useSubscription`, `useApolloClient`), unpack cache data, and pass it into a template + organisms. The only data-fetching allowed **below** the page is in an organism that is *dedicated* to a specific operation — and even then only when the organism is not reused across pages. For the status screen, all data fetching lives in the page; organisms are pure render.

We ship only the pieces the dashboard screen consumes:

- **atoms:** `StatusDot` (coloured circle for `ok` / `degraded` / etc.), `Badge` (pill), `KeyValue` (label + value row), `SectionHeading`.
- **molecules:** `StatusPill` (dot + label), `CardSection` (heading + body), `ChecklistItem` (already in `DashboardPage` inline — extracted).
- **organisms:** `GhStatusCard`, `DatabaseStatusCard`, `SetupChecklistCard`, `ConfigurationCard`, `DestinationList`, `ScoutList`, `ManualSyncCallout`, `ScheduledSyncIndicator`.
- **templates:** `DashboardTemplate` — a two-column responsive grid with named regions (overview, sync controls, health lists, setup).

`DashboardPage` becomes ~40 lines: two hooks, a cache write, and a single `<DashboardTemplate>` composition.

A short README at `apps/web/src/ui/README.md` codifies the table above plus two examples (a passing case and a rejected case from code review) so future contributors don't have to infer intent.

**Alternatives considered.**

- **Flat `components/` folder.** Rejected — exactly the anti-pattern the user asked us to avoid; by the time we have 30+ components it's unnavigable.
- **Feature-per-folder layout** (`features/status/*.tsx`). Not wrong, but it conflates layout concerns with feature concerns and makes cross-feature reuse awkward — the atomic-design split is explicitly about reusability, which is what the user asked for.
- **Adopt an external component library (MUI, Mantine, shadcn).** Rejected — out of scope for this story and the app has its own `operator.css`. We can revisit once the first three screens are migrated.
- **Refactor every existing page into the new layout in this PR.** Rejected — scope explosion with no data-migration payoff. Each page gets refactored when its data layer moves (P2.4 etc.).

### D7: Cache primer strategy during the dashboard render

**Decision.** The page renders a skeleton (`<DashboardTemplate>` with empty organism slots showing atom-level `Loading…` placeholders) while the initial `useQuery` is in flight. On success the data flows into organisms. The subscription establishes in parallel and, once connected, overwrites the cached snapshot via `client.writeQuery`. If the subscription drops (WS disconnect), Apollo auto-reconnects thanks to `graphql-ws`; the query's last cached value continues to render in the meantime. We do **not** show a "subscription disconnected" banner in this story — the pre-existing SSE screen didn't either and adding one is UX polish that belongs in a dedicated story.

**Alternatives considered.**

- **Use `useQuery`'s `pollInterval` as a fallback.** Rejected — doubles the server load when both transports are up, defeats the point of the subscription, and masks real WS bugs.

### D8: Removing the SSE `EventSource` from the status screen

**Decision.** There is no client-side `EventSource` to `/api/status/stream` today. The story's "The existing `EventSource` subscription to `/api/status/stream` is removed from that screen" acceptance criterion is therefore satisfied vacuously — we explicitly confirm this in the PR description and touch the server-side SSE endpoint zero times. (A `grep` for `EventSource` and `/api/status/stream` in `apps/web/` returns no hits on the current main branch.)

**Alternatives considered.** None — this is a factual observation, not a design choice.

## Risks / Trade-offs

- **[Risk] Double-providers in the tree confuse someone debugging a hook.** Two contexts (`ApolloProvider`, `QueryClientProvider`) in the same tree means `useQuery` imported from `@apollo/client` and `useQuery` imported from `@tanstack/react-query` share a name. **Mitigation.** Lint-level enforcement is overkill for this story; we add a short note in the `apps/web/src/ui/README.md` and in the PR description, and migrations will eliminate TanStack Query entirely in P2.5.
- **[Risk] Vite WS proxy can be flaky on Windows / WSL.** `ws: true` with default `changeOrigin` usually just works; `graphql-ws` will auto-reconnect on disconnect, but a subtle proxy misconfiguration can manifest as "subscription never delivers". **Mitigation.** Add a quick manual smoke test step to the tasks (connect → trigger `emitChanged()` from a server-side route or `StatusEventsService` helper → observe UI updates) and document the verification procedure in the PR description so reviewers on different OSes can sanity-check.
- **[Risk] Atomic-design layout accretes cruft if everyone imports through the tree instead of using it.** **Mitigation.** The README prohibits data fetching below organisms; pages import from `ui/` and must not reach into `ui/organisms/_internal` etc. We do not add a barrel `index.ts` that hides the structure. If a second page lands in P2.4 without following the layering, reviewers flag it before merge.
- **[Risk] Hand-typed operation types drift from the server schema.** **Mitigation.** The server-side integration tests in P2.2 still assert the GraphQL response matches `statusSnapshotSchema`. The client's TS types piggy-back on the same Zod schema; a server-side shape change without a client update fails the server test (caught in CI), not silently breaks the UI.
- **[Trade-off] Wire names stay snake_case.** TS consumers will type `data.status.pending_triage_count` and `data.status.manual_sync.canRun`. Cosmetic. Accepted for REST parity through the migration; codegen in P2.4 keeps the same names.
- **[Trade-off] No client test harness in this story.** A regression in atomic components is only caught by the developer rebuilding the app and clicking around. Accepted — the story is small enough that a manual smoke test is appropriate; the cost of standing up a test rig (vitest + jsdom + Apollo `MockedProvider`) should be borne when we have 3+ migrated screens to test and P2.4 is the right home for it.

## Migration Plan

- **Deploy.** Normal PR. No backend changes. No database or user-visible config changes. Staging deploy is a static rebuild of `apps/web`.
- **Verification checklist in the PR description.** (a) Open dashboard, confirm status card populates. (b) In a terminal run `curl -X POST /api/settings/core -d '{…}'` (or use the Settings page that still works on REST) and verify the dashboard re-renders without a refresh — proves the WS subscription works. (c) Inspect Apollo DevTools: one query, one active subscription. (d) Navigate to Settings/Mappings/Activity and confirm they still render via TanStack Query / REST.
- **Rollback.** Client-only revert. REST `GET /api/status` and SSE remain live; reverting restores `DashboardPage.tsx` to its REST-only form. No server coordination required.
- **Follow-on (P2.4).** Migrate Settings, Mappings, Activity, Github, VibeKanban onto Apollo Client, decomposing each page into the same atomic-design tree. At that point introduce `@graphql-codegen/client-preset` and replace hand-typed operation types. `InMemoryCache` field policies get added *only if* an observable duplication issue emerges.
- **Follow-on (P2.5).** Remove `/api/status` + `/api/status/stream` server-side; remove the `/api` TanStack Query fetchers and `apiJson` helper; drop `@tanstack/react-query` from `apps/web/package.json`. The atomic layout is independent of which client wins and requires no further changes.

## Open Questions

- **Should `DashboardTemplate` be a named export or a default export, and does it own CSS or does it accept a className?** Convention TBD during implementation. Default: named export, accepts a `className` prop but ships with sensible defaults from `operator.css`. Non-blocking.
- **Do we want a per-operation "active subscriptions" debug overlay while P2 is in flight?** Nice-to-have, but risks scope creep. Deferred — Apollo DevTools covers it for developers.
