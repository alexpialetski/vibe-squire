# web-graphql-client Specification

## Purpose
TBD - created by archiving change p2-3-apollo-client-status. Update Purpose after archive.
## Requirements
### Requirement: `apps/web` exposes a single `ApolloClient` configured with HTTP + WebSocket transports

The web operator UI SHALL expose a single `ApolloClient` instance configured to route queries and mutations over an HTTP `Link` to `/graphql`, and subscriptions over a `graphql-ws`-backed `GraphQLWsLink` also terminating at `/graphql`. A `split` link SHALL select the transport by inspecting the operation kind: subscription operations go to the WebSocket link, all others go to the HTTP link. The client MUST be initialised with `new InMemoryCache({ typePolicies: … })` where `typePolicies` include deliberate policies for operator BFF data: at minimum, list roots that mutations update (e.g. `Query.mappings`) SHALL define `merge` (or equivalent) behaviour so mutation results reconcile without mandatory `refetchQueries`, and singleton-like settings payloads SHALL define stable `keyFields` or root-field merge rules as needed to avoid duplicate cached entities.

The `graphql-ws` client URL MUST be derived from the current page origin at runtime (`ws://` for `http:` pages, `wss://` for `https:` pages) so dev and production both work without build-time environment variables.

The client factory MUST live in a dedicated module under `apps/web/src/graphql/` and MUST NOT be constructed inline inside a React component.

#### Scenario: Query operations are sent over HTTP

- **WHEN** a consumer calls `useQuery(STATUS_QUERY)` and the component mounts
- **THEN** the operation SHALL be delivered via the HTTP link to `/graphql` (observable in the browser Network panel as a `POST /graphql` request)

#### Scenario: Subscription operations are sent over WebSocket

- **WHEN** a consumer calls `useSubscription(STATUS_UPDATED_SUBSCRIPTION)` and the component mounts
- **THEN** the operation SHALL be delivered over the `graphql-ws` WebSocket to `/graphql` (observable as a WS frame), and MUST NOT be sent as an HTTP request

#### Scenario: WebSocket URL tracks the page origin at runtime

- **WHEN** the page loads at `http://localhost:5173/dashboard`
- **THEN** the `graphql-ws` client SHALL connect to `ws://localhost:5173/graphql`
- **AND WHEN** the page loads at `https://example.com/dashboard`
- **THEN** the `graphql-ws` client SHALL connect to `wss://example.com/graphql`

#### Scenario: Mapping mutations update the cached list without a manual refetch

- **WHEN** a consumer has executed `mappings` and subsequently runs `upsertMapping` or `deleteMapping` with a successful server response
- **THEN** the Apollo cache representation of `Query.mappings` SHALL reflect the mutation outcome without requiring `refetchQueries` for that happy path

### Requirement: `ApolloProvider` and `QueryClientProvider` coexist in the React tree

The React root SHALL mount `<ApolloProvider client={apolloClient}>` as an outer provider. `<QueryClientProvider client={queryClient}>` from `@tanstack/react-query` SHALL remain in the tree only while at least one `apps/web` module still imports TanStack Query hooks for data fetching. When the migration removes the last TanStack consumer, `QueryClientProvider` and its `QueryClient` import SHALL be removed in the same change, leaving `ApolloProvider` wrapping `<BrowserRouter>` and `<App />` without TanStack providers.

While both providers exist, neither client SHALL be replaced, destroyed, or shared; each maintains its own cache state.

#### Scenario: The root React tree carries Apollo outside TanStack when both exist

- **WHEN** TanStack Query remains in use during the migration
- **THEN** `apps/web/src/main.tsx` SHALL render `<ApolloProvider>` as an ancestor of `<QueryClientProvider>`, which in turn remains an ancestor of `<BrowserRouter>`

#### Scenario: TanStack-only screens keep working until migrated

- **WHEN** a user navigates to a screen that still consumes `/api/*` via TanStack Query during the migration window
- **THEN** that screen SHALL continue to function without requiring GraphQL operations for that route

#### Scenario: Post-migration tree drops TanStack when unused

- **WHEN** no file under `apps/web/src/` imports `@tanstack/react-query` hooks anymore
- **THEN** `main.tsx` SHALL NOT render `<QueryClientProvider>` and `apps/web/package.json` SHALL NOT list `@tanstack/react-query` as a dependency unless a documented intentional REST holdout requires it

### Requirement: Vite dev server proxies HTTP and WebSocket GraphQL traffic to the backend

The `apps/web/vite.config.ts` dev server configuration SHALL forward both `/graphql` HTTP requests and `/graphql` WebSocket upgrades to the backend on `http://127.0.0.1:4000`. The existing `/api` proxy entry MUST remain unchanged. Production builds (single-origin static served by the Nest server) MUST not require any proxy; the client code MUST work against either environment without conditional configuration.

#### Scenario: HTTP GraphQL requests forward in dev

- **WHEN** the dev server is running (`vite` on port 5173) and a browser issues `POST /graphql`
- **THEN** the Vite proxy SHALL forward the request to `http://127.0.0.1:4000/graphql` and return the backend's response unchanged

#### Scenario: WebSocket GraphQL upgrades forward in dev

- **WHEN** the dev server is running and a `graphql-ws` client sends an upgrade request to `ws://localhost:5173/graphql`
- **THEN** the Vite proxy SHALL forward the upgrade to the backend on port 4000 with `ws: true`, and the resulting subscription MUST deliver payloads end-to-end

### Requirement: GraphQL operations are named and colocated under `apps/web/src/graphql/operations/`

Every GraphQL operation consumed by `apps/web` SHALL be declared with an explicit operation name. Operations SHALL live under `apps/web/src/graphql/operations/` as `gql`-tagged documents OR SHALL be generated into `apps/web/src/__generated__/` (or another checked-in path documented in the PR) by `@graphql-codegen/client-preset`, then imported from a thin barrel under `apps/web/src/graphql/`. Operations MUST NOT be declared inline inside React components under `apps/web/src/pages/` or `apps/web/src/ui/`.

TypeScript types for operation results SHOULD come from codegen when codegen is enabled; hand-written result types remain acceptable for tiny operations if codegen is not yet wired for that document.

#### Scenario: Named operations exist outside page and UI components

- **WHEN** a developer inspects GraphQL operations for migrated screens (status, settings, mappings, activity, sync triggers)
- **THEN** each operation SHALL be discoverable from `apps/web/src/graphql/operations/` or the generated folder, with explicit operation names, and SHALL NOT be embedded as inline `gql` templates inside `pages/` or `ui/`

#### Scenario: No stray gql tags in pages or ui

- **WHEN** a developer searches `apps/web/src/pages/` and `apps/web/src/ui/` for `` gql` `` tags
- **THEN** no matches SHALL exist

### Requirement: `apps/web` declares the runtime dependencies needed for Apollo Client

`apps/web/package.json` SHALL declare `@apollo/client`, `graphql`, and `graphql-ws` as runtime dependencies, pinned to the versions chosen during implementation. The package SHALL declare `@graphql-codegen/cli` and `@graphql-codegen/client-preset` as devDependencies (or the repo’s agreed codegen stack) and a script entry that regenerates GraphQL documents/types against the server schema. `@tanstack/react-query` SHALL be removed from `apps/web/package.json` when no source file in `apps/web` consumes it; if a documented REST holdout remains, the dependency MAY stay until that holdout is cleared.

#### Scenario: Dependencies are installable

- **WHEN** a developer runs `pnpm install` from the repo root
- **THEN** `@apollo/client`, `graphql`, and `graphql-ws` SHALL resolve without errors and be available to `apps/web`

#### Scenario: The build produces a working bundle

- **WHEN** a developer runs `pnpm --filter @vibe-squire/web build`
- **THEN** the build SHALL complete successfully and emit a bundle that imports from `@apollo/client` and `graphql-ws`

#### Scenario: TypeScript sees the new dependencies

- **WHEN** a developer runs `pnpm --filter @vibe-squire/web typecheck`
- **THEN** the command SHALL exit 0 with no unresolved-module errors for `@apollo/client`, `graphql`, or `graphql-ws`

#### Scenario: Codegen script exists when codegen is enabled

- **WHEN** codegen is part of the implementation
- **THEN** `apps/web/package.json` SHALL expose a script that regenerates GraphQL types/documents and the generated output SHALL be checked into version control

### Requirement: Operator settings, mapping, and triage mutations use optimistic Apollo responses

The web client SHALL configure `updateSettings`, `upsertMapping`, `updateMapping`, `deleteMapping`, `acceptTriage`, `declineTriage`, and `reconsiderTriage` mutations with optimistic responses (or equivalent cache writes) so the UI updates immediately on user action and rolls back automatically when the server returns a GraphQL error. Apollo optimistic responses SHALL be the mechanism for triage UX; the pre-split `localStorage` key `vs_triage_optimistic` SHALL NOT be reintroduced.

#### Scenario: Optimistic mapping delete disappears from the list

- **WHEN** a user deletes a mapping and the network is slow
- **THEN** the mapping row SHALL disappear from the UI before the server responds
- **AND WHEN** the server responds with an error
- **THEN** the row SHALL be restored to match server state

#### Scenario: Optimistic triage accept updates the item row

- **WHEN** a user clicks "Review" on a triageable activity item
- **THEN** the row SHALL update immediately to reflect the accepted state (no longer triageable)
- **AND WHEN** the server rolls back with an error
- **THEN** the row SHALL return to its triageable state and a toast SHALL surface the error

### Requirement: Live updates use GraphQL subscriptions; no client-side polling

Live refresh on migrated screens SHALL be driven by GraphQL subscriptions only. The Dashboard SHALL keep using `statusUpdated` (from P2.3) and the Activity page SHALL subscribe to `activityEvents` for in-flight run and triage updates. No code in `apps/web` SHALL introduce `setInterval`, `setTimeout`-driven refetch loops, or `refetchInterval`-equivalent configuration for operator data after this change.

On `graphql-ws` reconnect, the Activity page MAY issue a one-shot refetch of the first `activityFeed` page to reconcile state — this is a transport-driven event, not a polling loop.

#### Scenario: Activity page updates during a running sync without polling

- **WHEN** a user is on the Activity page and a sync run starts, progresses, and completes
- **THEN** the UI SHALL update in response to `activityEvents` subscription payloads
- **AND** no `POST /graphql` query or REST request for activity data SHALL be issued at fixed intervals while the user is idle on the page

#### Scenario: No polling intervals survive in the web source

- **WHEN** a developer searches `apps/web/src/` for `setInterval(`, `setTimeout(` used to schedule refetches, and `refetchInterval`
- **THEN** no such usages SHALL exist for operator data refresh; the only allowed uses of those APIs are unrelated UI concerns (animations, debouncers) and MUST NOT drive query refetches

### Requirement: Activity feed queries use Apollo pagination with connection merge policy

The `activityFeed` connection from the server SHALL be consumed through Apollo queries (or a light wrapper hook) that pass cursors from `pageInfo` and append pages without duplicating nodes in the rendered list. The client cache SHALL define a `typePolicies` entry for `Query.activityFeed` (e.g. `relayStylePagination`) so subsequent `fetchMore` calls and `activityEvents` subscription updates merge into a single rendered list without dropping or duplicating runs/items.

#### Scenario: Load-more fetches the next connection page

- **WHEN** a user requests more activity items and a next cursor exists
- **THEN** the client SHALL issue a follow-up query with that cursor and merge results according to the documented field policy

#### Scenario: Subscription updates merge into the paginated list

- **WHEN** an `activityEvents` payload arrives while the user is viewing the Activity page with multiple pages already loaded
- **THEN** the rendered list SHALL reflect the updated run/item in place, without duplicating entries across pages

### Requirement: Mappings screen surfaces VK repo-fetch errors

The Mappings page SHALL render a visible error banner (or equivalent visible affordance) when the VK repos source used to populate the "Kanban repository" picker fails, showing the server-provided message where available. Silent retries without a user-facing signal SHALL NOT be used for this fetch.

#### Scenario: VK repos fetch failure surfaces a banner

- **WHEN** the VK repos source returns an error (HTTP 5xx or GraphQL error)
- **THEN** the Mappings page SHALL display an error banner including the returned message
- **AND** the picker SHALL render a safe empty state rather than silently retrying

