## ADDED Requirements

### Requirement: `apps/web` exposes a single `ApolloClient` configured with HTTP + WebSocket transports

The web operator UI SHALL expose a single `ApolloClient` instance configured to route queries and mutations over an HTTP `Link` to `/graphql`, and subscriptions over a `graphql-ws`-backed `GraphQLWsLink` also terminating at `/graphql`. A `split` link SHALL select the transport by inspecting the operation kind: subscription operations go to the WebSocket link, all others go to the HTTP link. The client MUST be initialised with `new InMemoryCache()` using default settings (no custom `typePolicies`, no `keyFields` overrides).

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

### Requirement: `ApolloProvider` and `QueryClientProvider` coexist in the React tree

The React root SHALL mount `<ApolloProvider client={apolloClient}>` outside `<QueryClientProvider client={queryClient}>`, which in turn wraps `<BrowserRouter>` and `<App />`. Both providers MUST remain active for the duration of story P2.3 so screens that have not yet migrated to GraphQL continue to function via TanStack Query + REST.

Neither provider's client SHALL be replaced, destroyed, or shared; each maintains its own cache state.

#### Scenario: The root React tree carries both providers

- **WHEN** the app bootstraps in `apps/web/src/main.tsx`
- **THEN** the rendered tree SHALL contain `<ApolloProvider>` as an ancestor of `<QueryClientProvider>`, and `<QueryClientProvider>` as an ancestor of `<BrowserRouter>`

#### Scenario: Non-migrated screens continue to render via TanStack Query

- **WHEN** a user navigates to a screen that still consumes `/api/*` via `useQuery` from `@tanstack/react-query` (e.g. Settings, Mappings, Activity, GitHub, VibeKanban)
- **THEN** that screen SHALL render and refetch exactly as it did before this change, and MUST NOT depend on the Apollo client being reachable

### Requirement: Vite dev server proxies HTTP and WebSocket GraphQL traffic to the backend

The `apps/web/vite.config.ts` dev server configuration SHALL forward both `/graphql` HTTP requests and `/graphql` WebSocket upgrades to the backend on `http://127.0.0.1:4000`. The existing `/api` proxy entry MUST remain unchanged. Production builds (single-origin static served by the Nest server) MUST not require any proxy; the client code MUST work against either environment without conditional configuration.

#### Scenario: HTTP GraphQL requests forward in dev

- **WHEN** the dev server is running (`vite` on port 5173) and a browser issues `POST /graphql`
- **THEN** the Vite proxy SHALL forward the request to `http://127.0.0.1:4000/graphql` and return the backend's response unchanged

#### Scenario: WebSocket GraphQL upgrades forward in dev

- **WHEN** the dev server is running and a `graphql-ws` client sends an upgrade request to `ws://localhost:5173/graphql`
- **THEN** the Vite proxy SHALL forward the upgrade to the backend on port 4000 with `ws: true`, and the resulting subscription MUST deliver payloads end-to-end

### Requirement: GraphQL operations are named and colocated under `apps/web/src/graphql/operations/`

Every GraphQL operation consumed by `apps/web` SHALL be declared as a `gql`-tagged `DocumentNode` with an explicit operation name (e.g. `query StatusQuery`, `subscription StatusUpdatedSubscription`). Operations MUST live under `apps/web/src/graphql/operations/` and MUST NOT be declared inline inside React components.

TypeScript result types for operations MAY be hand-declared in this story; automated codegen via `@graphql-codegen/client-preset` is explicitly deferred to story P2.4.

#### Scenario: An operation exists as a named document in the operations folder

- **WHEN** a developer inspects the source for the status screen's initial data fetch
- **THEN** they SHALL find the operation exported from a file under `apps/web/src/graphql/operations/` with an explicit operation name in the document

#### Scenario: Operations are absent from React component files

- **WHEN** a developer searches `apps/web/src/pages/` and `apps/web/src/ui/` for `gql\`` tags
- **THEN** no matches SHALL exist — operations live only in the `graphql/operations/` folder

### Requirement: `apps/web` declares the runtime dependencies needed for Apollo Client

`apps/web/package.json` SHALL declare `@apollo/client`, `graphql`, and `graphql-ws` as runtime dependencies, pinned to the versions chosen during implementation. No codegen tooling (`@graphql-codegen/cli`, `@graphql-codegen/client-preset`) SHALL be added in this story.

#### Scenario: Dependencies are installable

- **WHEN** a developer runs `pnpm install` from the repo root
- **THEN** `@apollo/client`, `graphql`, and `graphql-ws` SHALL resolve without errors and be available to `apps/web`

#### Scenario: The build produces a working bundle

- **WHEN** a developer runs `pnpm --filter @vibe-squire/web build`
- **THEN** the build SHALL complete successfully and emit a bundle that imports from `@apollo/client` and `graphql-ws`

#### Scenario: TypeScript sees the new dependencies

- **WHEN** a developer runs `pnpm --filter @vibe-squire/web typecheck`
- **THEN** the command SHALL exit 0 with no unresolved-module errors for `@apollo/client`, `graphql`, or `graphql-ws`
