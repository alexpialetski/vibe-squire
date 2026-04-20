---
id: P2.3
title: Apollo Client in apps/web with status screen migrated
status: todo
impact: M
urgency: later
tags:
  - area:web
  - slice:dashboard
  - theme:dx
openspec: recommended
updated: 2026-04-20
roadmap_ref: P2.3
depends_on:
  - P2.2
adr_refs:
  - 001-graphql-pilot.md
---

## Problem / outcome

Wire Apollo Client into `apps/web` and prove the client pattern on one real screen (the status panel). Leaves TanStack Query in place for everything not yet migrated so the app stays functional throughout.

## Acceptance criteria

- [ ] Add dependencies to `apps/web/package.json`: `@apollo/client`, `graphql`, `graphql-ws`. Optionally `@graphql-codegen/cli` + `@graphql-codegen/client-preset` as devDependencies (see Notes).
- [ ] `ApolloClient` configured with a split `HttpLink` (queries/mutations) + `GraphQLWsLink` (subscriptions) using `@apollo/client/link/subscriptions` and the `graphql-ws` transport.
- [ ] `ApolloProvider` mounted above `QueryClientProvider` in `apps/web/src/main.tsx` so both stacks coexist.
- [ ] Vite dev proxy in `apps/web/vite.config.ts` forwards both `/graphql` HTTP and `/graphql` WS upgrade to the backend on port 4000.
- [ ] Status screen refactored to consume GraphQL: `useQuery` for the initial snapshot, `useSubscription` for live updates. The existing `EventSource` subscription to `/api/status/stream` is removed from that screen (not from the server).
- [ ] `pnpm --filter @vibe-squire/web build` and `pnpm --filter @vibe-squire/web typecheck` pass.
- [ ] No regression in other screens (settings, mappings, activity) — they continue to use TanStack Query / REST until `P2.4`.
- [ ] Minimal Apollo DevTools-friendly setup: named operations, normalised cache left at defaults for now (`InMemoryCache()` no field policies yet).

## Notes

- **Codegen.** Add `@graphql-codegen/client-preset` in this story if the status screen yields more than a trivial amount of hand-typed query code; otherwise defer to `P2.4` and commit generated output under `apps/web/src/__generated__/` at that point. Record the decision in the PR.
- **Cache normalisation.** The default `InMemoryCache()` uses `__typename + id`. Ensure every GraphQL object that represents a domain entity exposes an `id`. Singleton-like objects (e.g. `StatusSnapshot`) are acceptable as root-query fields; only add `keyFields: ['__typename']` policies if a concrete duplication issue appears in `P2.4`.
- **SSE on the status screen** briefly coexists with the subscription during local testing — remove the client-side `EventSource` in the same commit that adds `useSubscription` to avoid duplicate listeners.
- Keep TanStack Query's `QueryClient` unchanged. The two clients coexist in the React tree without conflict until `P2.4` removes the remaining REST consumers.
