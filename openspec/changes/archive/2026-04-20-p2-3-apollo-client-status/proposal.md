## Why

Story [P2.3](../../../docs/stories/p2-graphql-client-apollo.md) asks us to prove the Apollo Client pattern end-to-end in `apps/web` on one real screen — the operator status panel — now that the server exposes `status`/`statusUpdated` over GraphQL (P2.2). Landing this story establishes the client conventions (provider ordering, dev proxy for HTTP + WS, `useQuery` + `useSubscription` pair, `InMemoryCache` defaults) that the remaining web screens will inherit in P2.4, while leaving TanStack Query in place everywhere else so the app stays shippable during the migration.

The current `DashboardPage` is a single file that fires two REST calls and dumps a raw JSON snapshot into a `<pre>`. That is adequate for a placeholder but will not scale to the richer operator UI the migration is headed toward. Alongside the client wiring, we take the opportunity to introduce an **atomic-design layout** (atoms / molecules / organisms / templates) for the dashboard so future work on status visualisation — per-destination and per-scout health tiles, manual-sync callouts, setup checklist, etc. — has a natural place to land instead of accreting in one page file. Apollo's normalised `InMemoryCache` makes this split effectively free at runtime: identical subscription events populate the cache once and every leaf component reads from it.

## What Changes

- Add runtime dependencies to `apps/web/package.json`: `@apollo/client`, `graphql`, `graphql-ws`. Defer GraphQL codegen (`@graphql-codegen/cli` + `client-preset`) to P2.4 per the story's Notes — the status screen does not yet yield enough hand-typed query code to justify the devDep churn, but we **do** record the decision in the PR description so the pattern carries forward.
- Configure a single `ApolloClient` for the web app: `HttpLink` for queries/mutations, `GraphQLWsLink` (via `@apollo/client/link/subscriptions` + `graphql-ws`) for subscriptions, and a `split` link that routes by operation type. Default `InMemoryCache()` with no field policies yet.
- Mount `ApolloProvider` **above** `QueryClientProvider` in `apps/web/src/main.tsx` so both stacks coexist in the React tree until P2.4 finishes migrating the remaining screens off REST.
- Extend the Vite dev proxy in `apps/web/vite.config.ts` so `/graphql` HTTP requests and `/graphql` WebSocket upgrades both forward to `http://127.0.0.1:4000`. The existing `/api` proxy stays for the not-yet-migrated screens.
- Migrate the dashboard / status screen onto GraphQL: `useQuery(STATUS_QUERY)` for initial data, `useSubscription(STATUS_UPDATED_SUBSCRIPTION)` for live deltas via `graphql-ws`. Remove the TanStack Query-backed `/api/status` fetch from that screen only. `/api/ui/setup` stays on TanStack Query + REST — the setup checklist is not part of the GraphQL status contract in P2.2 and will be folded in during P2.4.
- Reorganise the dashboard into an **atomic-design layout** under `apps/web/src/ui/` so the status surface is composed from reusable pieces rather than living in one page file. Introduce per-area folders (`atoms/`, `molecules/`, `organisms/`, `templates/`). Start small — only create the pieces the status screen actually needs — and document the pattern in `apps/web/src/ui/README.md` so subsequent screens follow suit without re-arguing the layering.
- **Not changed:** no other screens are migrated; TanStack Query + REST continue to serve settings, mappings, activity, github, vibe-kanban. The server-side REST endpoint `GET /api/status` and the SSE stream `GET /api/status/stream` stay live — their removal is explicitly deferred to P2.5.

## Capabilities

### New Capabilities

- `web-graphql-client`: Apollo Client runtime for the `apps/web` operator UI — the `ApolloClient` configuration (HTTP + WS split link, `InMemoryCache`), provider composition with TanStack Query, Vite dev proxy contract, and the conventions for operations/hooks (`useQuery` / `useSubscription`, cache defaults) that subsequent screens inherit in P2.4.
- `web-ui-atomic-design`: Atomic-design layout for `apps/web/src/ui/` — the folder structure (`atoms/`, `molecules/`, `organisms/`, `templates/`), the rules for what belongs at each level, and the guardrail that page components only compose organisms/templates and do not contain their own bespoke markup beyond trivial routing.
- `web-status-dashboard`: The operator status dashboard screen — a GraphQL-backed composition of atomic components that renders the live `StatusSnapshot` payload (initial + subscription), replacing the single-file `DashboardPage`.

### Modified Capabilities

<!-- None. The server-side `graphql-status` capability established in the archived P2.2 change is consumed as-is with no requirement deltas. -->

## Impact

- **Client code.** `apps/web/src/main.tsx` gains an `ApolloClient` + `ApolloProvider` mounted above the existing `QueryClientProvider`. `apps/web/src/App.tsx` is untouched. `apps/web/src/pages/DashboardPage.tsx` becomes a thin shell that delegates to an organism/template from the new `apps/web/src/ui/` tree. A new `apps/web/src/graphql/` folder hosts the client factory, link configuration, and the two named operations (`StatusQuery`, `StatusUpdatedSubscription`) as typed `gql` documents.
- **UI layout.** A new `apps/web/src/ui/` tree is introduced (`atoms/`, `molecules/`, `organisms/`, `templates/`) plus a short README explaining the layering rules. The status screen is the first consumer. Existing pages are **not** refactored in this story — they keep their current inline structure until they're migrated in P2.4 or later.
- **Dev environment.** `apps/web/vite.config.ts` gains a `ws: true` proxy entry for `/graphql` so subscription WebSocket upgrades reach `http://127.0.0.1:4000` during `vite dev`. Production deployments (single-origin static + Nest) are unaffected because the server already serves `/graphql` on the same origin.
- **Dependencies.** `apps/web/package.json` adds `@apollo/client`, `graphql`, `graphql-ws`. No server-side dependency changes. No codegen tooling yet (deferred to P2.4).
- **Tests.** We keep `pnpm --filter @vibe-squire/web build` and `pnpm --filter @vibe-squire/web typecheck` green. No new integration tests for this story — the server-side GraphQL contract is already covered by the integration specs shipped in P2.2, and the client has no test harness today. Component-level tests for the new atomic pieces are deliberately scoped out to keep the story focused; they land with P2.4 when the client surface grows enough to justify a test rig.
- **Coexistence & rollback.** Because `ApolloClient` and `QueryClient` providers coexist, rollback is a pure client-side revert: restore `DashboardPage.tsx`, remove the `ApolloProvider` wrapper, remove the new deps. The server is unaffected. REST `GET /api/status` and SSE `GET /api/status/stream` remain live throughout, so a rollback does not cut the operator off from status updates.
- **Hexagonal / architecture.** No server-side changes; hexagonal boundaries are untouched. On the client, the atomic-design split enforces a weaker but analogous rule: pages compose; atoms/molecules never fetch data directly — data enters through organisms (or page-level hooks) and flows down as props, so components stay testable and the Apollo cache stays the single source of truth.
