# ADR 001: Introduce GraphQL alongside REST for the operator console

**Status:** Accepted — server-stack sub-decision amended by [ADR 003](003-fastify-mercurius-runtime.md) (Fastify + Mercurius replace Express + Apollo; the GraphQL-alongside-REST decision itself stands).

## Context

Today the operator admin console (`apps/web`) talks to the NestJS backend over a mix of REST endpoints (`apps/server/src/ui/*`, `apps/server/src/status/status.controller.ts`, etc.) and a single SSE stream at `GET /api/status/stream`. Shared contracts live in `packages/shared` as Zod schemas, consumed by both sides.

Factors motivating a transport revisit:

- **Live data surface is growing.** The status snapshot already warrants a live channel; near-term work (poll progress, per-PR activity, mapping changes) will want their own. SSE scales to one channel cleanly; multiple parallel SSE streams or ad-hoc WebSockets fragment the client.
- **Read surfaces vary per screen.** The operator UI composes heterogeneous data per view (status + recent activity + mapping health on one screen; settings + integration health on another). Each new screen either triggers a new BFF endpoint or over-fetches an existing one. A typed schema where clients ask for exactly what they render is a better fit for this shape than continuing to grow `/api/ui/*`.
- **Shared schema.** Zod schemas in `@vibe-squire/shared` are already the server contract; introducing a typed client query layer (GraphQL operations + generated types) closes the remaining loop where the web client hand-writes fetch payloads.
- **No external contract to maintain.** vibe-squire is distributed via `npx vibe-squire` and consumed by the same operator that runs it. There is no third-party REST client to preserve, so introducing a parallel GraphQL transport carries no compatibility cost.

## Decision

We will introduce GraphQL **alongside** the existing REST + SSE stack, migrate the operator UI incrementally, and sunset REST/SSE endpoints on a per-endpoint basis once they have no consumers.

Concretely:

- **Server:** `@nestjs/graphql` + `@nestjs/apollo` + `@apollo/server`, **code-first** schema. Resolvers are driving adapters (peers of HTTP controllers); they call application services and must not import Prisma, `gh`, or integration adapters directly — the hexagonal rule from `.cursor/rules/architecture.mdc` still applies. Subscriptions use `graphql-ws` over WebSocket, bridged from the existing `StatusEventsService` Observable. Zod contracts in `@vibe-squire/shared` remain the source of truth for validation; GraphQL object types are declared via TypeScript decorators (manual duplication is acceptable initially — revisit if churn becomes painful).
- **Client:** Apollo Client in `apps/web`, configured with a split link (HTTP for queries/mutations, `graphql-ws` for subscriptions). TanStack Query stays in place for screens not yet migrated. Codegen (`@graphql-codegen/cli` with `client-preset`) is introduced as soon as hand-typed operations become noisy.
- **Scope:** `/graphql` is always-on — no feature flag. The existing REST and SSE endpoints stay live during migration and are removed per-endpoint once their last consumer is gone.

## Consequences

- \+ Unified transport for queries, mutations, and live updates; future live channels are subscriptions instead of new SSE endpoints.
- \+ Per-screen data shaping moves to the client, removing the need to grow the operator BFF for each new composite view.
- \+ Exercises the hexagonal boundary with a second class of driving adapter, validating that application services are transport-agnostic.
- \- Two transports live in parallel during migration, with some REST endpoints (e.g. `POST /api/sync/run`, `POST /api/reinit`) intentionally kept long-term for shell/operator ergonomics.
- \- Added dependency weight in the published npm package (`@nestjs/graphql`, `@apollo/server`, `graphql`, `graphql-ws`). Measurable impact on `apps/server/dist` size; acceptable given the existing Nest runtime baseline.
- \- Type duplication between Zod schemas and GraphQL object types until a bridge is adopted.
- \- N+1 risk in resolvers; mitigated by keeping resolvers thin wrappers over application services that already batch at the service layer.

## Alternatives considered

- **Stay on REST + SSE.** The domain is small enough to work with; the upside of the status quo is zero migration cost and a smaller dependency surface. Rejected because every new composite screen grows the BFF, every new live surface is another bespoke SSE endpoint, and the client still owns response-shape guesswork. The tradeoff is weighted against keeping a one-off transport per concern.
- **Relay on the client.** Best-in-class fragment colocation, store normalisation, and compiler-enforced types, but its conventions (Node interface with global IDs, Connections for all lists, compiler step) are priced for apps with thousands of components sharing a large graph. Not justified for the current UI scope.
- **urql.** Lightweight middle ground with smaller bundle and simpler cache. Rejected because Apollo has deeper NestJS symmetry, a larger ecosystem around `graphql-ws` subscriptions, and the cache features (field policies, optimistic responses) match the operator CRUD surfaces.
- **TanStack Query + `graphql-request`.** Minimal migration, but loses the normalised cache, fragment colocation, and subscription hooks — essentially using GraphQL as "REST with a schema" and forfeiting the reasons to pick it.
- **Mercurius driver (Fastify).** Rejected because `apps/server` is Express-based (`@nestjs/platform-express`) and switching runtimes is out of scope.
- **Schema-first Nest GraphQL.** Rejected because code-first aligns with the existing decorator-heavy Nest style and avoids maintaining a parallel SDL file as the source of truth.
