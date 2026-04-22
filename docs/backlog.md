# Backlog

Full prioritised backlog lives here. The working queue ("what next") lives in
[`queue.md`](queue.md); detailed story specs live under [`stories/`](stories/).

When a story ships or is dropped, update the **Status** column in the matching
P-row below. See the `doccraft-queue-audit` skill for the reconciliation
rules and the Story-files coverage invariant.

## Priority tiers

### P0 — this cycle (blocker / must-have)

| ID | Item | Status |
|----|------|--------|
|    |      |        |

### P1 — next cycle (high value, scheduled soon)

| ID | Item | Status |
|----|------|--------|
|    |      |        |

### P2 — backlog (known valuable, not scheduled)

| ID | Item | Status |
|----|------|--------|
| P2.1 | GraphQL server foundation (code-first Nest + Apollo driver) | done |
| P2.2 | Port `/api/status` to a GraphQL query plus live subscription | done |
| P2.3 | Apollo Client in `apps/web` with status screen migrated | done |
| P2.4 | Migrate operator BFF (settings, mappings, activity) to GraphQL | done |
| P2.5 | Sunset duplicate REST/SSE surfaces superseded by GraphQL | done |

### P3 — speculative (ideas, may be cut)

| ID | Item | Status |
|----|------|--------|
|    |      |        |

### P4 — later / platform

| ID | Item | Status |
|----|------|--------|
| P4.1 | Migrate server runtime from Express/Apollo to Fastify/Mercurius | done |

## Story files (incremental migration)

Detailed acceptance criteria for a subset of items above live as story files
under [`stories/`](stories/). This is the incremental-migration index — not
every backlog row needs a story file, only those picked up in the near-term
queue. Queue rows must link to files listed here.

| ID | Story |
|----|-------|
| P2.1 | [GraphQL server foundation](stories/p2-graphql-server-foundation.md) |
| P2.2 | [GraphQL status query + subscription](stories/p2-graphql-status-migration.md) |
| P2.3 | [Apollo Client + status screen migration](stories/p2-graphql-client-apollo.md) |
| P2.4 | [GraphQL operator BFF expansion](stories/p2-graphql-bff-expansion.md) |
| P2.5 | [REST/SSE sunset](stories/p2-graphql-rest-sse-sunset.md) |
| P4.1 | [Fastify + Mercurius platform migration](stories/p4-fastify-mercurius-migration.md) |

## NFRs and cross-cutting

Non-functional requirements, hardware constraints, process notes, research
threads not yet attached to a specific tier.

| Kind | Item | Status |
|------|------|--------|
|      |      |        |
