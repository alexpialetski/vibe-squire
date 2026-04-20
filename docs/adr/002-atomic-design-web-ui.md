# ADR 002: Atomic-design layout for the operator web UI

**Status:** Accepted

## Context

During P2.3 (see `openspec/changes/archive/2026-04-20-p2-3-apollo-client-status/`) the operator dashboard at `apps/web/src/pages/DashboardPage.tsx` had grown into a single ~400-line file that mixed data-fetching, domain logic, layout, and visual primitives. The Apollo Client migration was a convenient moment to impose a structural convention because it was already rewriting the dashboard's data plane; the remaining screens (`Settings`, `Mappings`, `Activity`, `GitHub`, `VibeKanban`) will go through the same rewrite in P2.4 and P2.5 and benefit from a layout rule set before their migrations start.

The forces at play:

- **Reusable visual primitives keep appearing.** Cards, key-value rows, status pills, and section headings were duplicated inline on every page. Without a home for them they will keep being re-implemented.
- **Data-fetching drifts down the tree.** In the pre-P2.3 dashboard, `useQuery`/SSE plumbing lived inside components that otherwise look like pure view code. That makes the transport swap (REST → GraphQL, SSE → `graphql-ws`) touch every file instead of one.
- **Future-story cost.** P2.4 migrates Settings/Mappings/Activity to GraphQL. If every page invents its own structure again, each migration is a bespoke rewrite. A shared skeleton lets those stories focus on queries, mutations, and subscriptions rather than on layout.
- **Small surface.** The operator UI is a handful of screens consumed by the same operator who runs the binary. We don't need a design-system package, a Storybook, or a component library — just a rule that says "put this here, don't reach across layers."

This decision is orthogonal to [ADR 001](001-graphql-pilot.md) (transport choice). ADR 001 says *how data flows*; ADR 002 says *how the view tree is organised around that data*.

## Decision

`apps/web/src/ui/` is organised as a four-level atomic-design hierarchy. Pages in `apps/web/src/pages/` compose it; they are the only layer that runs data-fetching hooks.

- **`atoms/`** — single-purpose visual primitives. May import only React and shared styling (`operator.css`, design tokens). MUST NOT import from other atomic layers, Apollo Client, TanStack Query, or `@vibe-squire/shared`.
- **`molecules/`** — small compositions of atoms for one concept. May import from `atoms/` only. MUST NOT call data-fetching hooks.
- **`organisms/`** — feature blocks that accept domain data as props. May import from `atoms/`, `molecules/`, and domain types from `@vibe-squire/shared`. MUST NOT call Apollo Client (`useQuery`/`useSubscription`/`useMutation`/`useApolloClient`) or TanStack Query hooks directly.
- **`templates/`** — layout shells that arrange organisms into page regions. May import from `atoms/`, `molecules/`, `organisms/`. MUST be layout-only (JSX regions, grids, slots); MUST NOT hold business state or call hooks beyond trivial layout primitives like `useId`.
- **Pages** (`apps/web/src/pages/`) — the single place where data-fetching hooks run for migrated screens. A migrated page renders at most a template plus a set of organisms, with data flowing down as props. No bespoke inline markup beyond trivial loading/error text.

Adoption is **incremental, one story at a time**. A page migrates into this tree when its own story touches it; we do not bulk-refactor. In P2.3 this applies only to `DashboardPage.tsx`. `Settings`, `Mappings`, `Activity`, `GitHub`, and `VibeKanban` remain on their pre-split inline layouts until their migration stories (P2.4, P2.5) run.

The tree ships **only components consumed by a migrated page**. No speculative atoms/molecules. Each migration story adds the pieces its page needs and no more.

The authoritative, agent-readable form of these rules lives next to the code at `apps/web/src/ui/README.md`, with normative scenarios in `openspec/specs/web-ui-atomic-design/spec.md`. This ADR explains *why*; those files are the enforceable *what*.

## Consequences

- \+ Every future screen migration inherits a layered skeleton. P2.4 and P2.5 spend their budget on queries and subscriptions, not on layout bikeshedding.
- \+ The data-plane boundary is mechanical and reviewable: grepping `apps/web/src/ui/{atoms,molecules,organisms,templates}` for `useQuery`/`useSubscription`/`useMutation` catches violations instantly.
- \+ Reusable primitives (`StatusPill`, `KeyValue`, `CardSection`, etc.) have an obvious home; duplication across pages stops accruing.
- \+ The layering survives the incremental-migration window: pages not yet ported don't block the convention because they simply don't live in `ui/` yet.
- \- Two structures coexist during the migration: the new `ui/` tree and the pre-P2.3 inline layouts under `pages/`. Developers must remember which page is already migrated. The boundary is a grep away (`apps/web/src/ui/` vs inline JSX inside `pages/*.tsx`) but it is still cognitive load.
- \- The layering is enforced by convention and code review, not by a lint rule. A motivated contributor can break it. If drift shows up more than once in review, add an ESLint `no-restricted-imports` rule (deferred, not needed today).
- \- A brand new reusable component needs a classification decision ("is this an atom or a molecule?"). The decision is cheap but non-zero; in practice the layered-import rule makes the answer obvious.

## Alternatives considered

- **Flat `apps/web/src/components/` directory.** Simplest possible structure, zero taxonomy overhead. Rejected because it gives no guidance on where data-fetching is allowed to live, and the reason we're doing this at all is to pin fetching to the page layer.
- **Feature-per-folder (`dashboard/`, `settings/`, `activity/`).** Groups files by screen. Rejected because the operator UI has genuine reuse across screens (pills, KV rows, card sections) and grouping by feature forces either duplication or cross-feature imports with no layering rule to constrain them.
- **Adopt an external component library (shadcn/ui, Radix primitives + Tailwind, Mantine).** Attractive primitives, but installs a new design vocabulary and build-weight into a monorepo whose web app is a small operator console consumed by one operator. Rejected for this scope; can be revisited if the UI grows a public surface.
- **Ship a design-system package under `packages/`.** Over-engineered for a single-consumer web app. Would add a build target and a publish story with no callers outside `apps/web`. Revisit only if a second web surface appears.
- **Bulk-refactor all pages into the new tree in P2.3.** Considered and explicitly rejected. P2.3 is a transport-pilot story and should not double as a UI rewrite for screens that still talk REST. Per-story migration keeps diffs reviewable and avoids touching code that will be rewritten again in P2.4.
- **Enforce layering with ESLint `no-restricted-imports` on day one.** Deferred. The rule set is small and reviewable by eye today; adding lint is a mechanical follow-up once we see the first cross-layer mistake in review.
