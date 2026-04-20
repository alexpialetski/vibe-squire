# web-ui-atomic-design Specification

## Purpose
TBD - created by archiving change p2-3-apollo-client-status. Update Purpose after archive.
## Requirements
### Requirement: `apps/web` uses an atomic-design UI layout under `apps/web/src/ui/`

The web operator UI SHALL host reusable visual components in a four-level atomic-design hierarchy rooted at `apps/web/src/ui/`, with subfolders `atoms/`, `molecules/`, `organisms/`, and `templates/`. Each level SHALL contain components scoped to its role as defined below. The hierarchy SHALL be documented in `apps/web/src/ui/README.md` so contributors have an authoritative reference.

The layout SHALL be additive in this story: existing pages (`Activity`, `Mappings`, `Settings`, `GitHub`, `VibeKanban`) MUST NOT be refactored into the new tree unless their own migration story owns the refactor. Only pieces needed by the dashboard status screen (story P2.3) SHALL ship in this change.

#### Scenario: The four atomic-design folders exist with a README

- **WHEN** a developer inspects `apps/web/src/ui/`
- **THEN** the folder SHALL contain `atoms/`, `molecules/`, `organisms/`, `templates/`, and `README.md`
- **AND** `README.md` SHALL describe the role and allowed imports for each layer

#### Scenario: Non-dashboard pages are untouched

- **WHEN** the diff for story P2.3 is reviewed
- **THEN** files under `apps/web/src/pages/ActivityPage.tsx`, `MappingsPage.tsx`, `SettingsPage.tsx`, `GithubPage.tsx`, and `VibeKanbanPage.tsx` SHALL have no changes beyond optional import-path adjustments required by compile, and MUST NOT be decomposed into the new atomic tree in this change

### Requirement: Atomic components obey the layered-import rule

Components at each layer SHALL respect the following import constraints:

- **Atoms** — SHALL only import from React and shared styling (`operator.css` or design tokens). Atoms MUST NOT import from `molecules/`, `organisms/`, `templates/`, Apollo Client hooks, TanStack Query hooks, or domain schemas in `@vibe-squire/shared`.
- **Molecules** — MAY import from `atoms/`. Molecules MUST NOT import from `organisms/` or `templates/`, and MUST NOT call data-fetching hooks.
- **Organisms** — MAY import from `atoms/`, `molecules/`, and domain types from `@vibe-squire/shared`. Organisms SHALL accept domain data as props; they MUST NOT call Apollo Client hooks (`useQuery`, `useSubscription`, `useMutation`) or TanStack Query hooks directly.
- **Templates** — MAY import from `atoms/`, `molecules/`, and `organisms/`. Templates SHALL be layout-only: they accept children or named-slot props and MUST NOT hold business state or call hooks beyond trivial layout (e.g. `useId`).

Pages in `apps/web/src/pages/` SHALL be the single place where data-fetching hooks are invoked for the status screen introduced in this change; the resulting data SHALL flow down through templates/organisms as props.

#### Scenario: Atoms do not import hooks or higher layers

- **WHEN** a file under `apps/web/src/ui/atoms/` is inspected
- **THEN** it SHALL NOT contain imports from `@apollo/client`, `@tanstack/react-query`, `@vibe-squire/shared`, `../molecules/`, `../organisms/`, or `../templates/`

#### Scenario: Organisms do not fetch data

- **WHEN** a file under `apps/web/src/ui/organisms/` is inspected
- **THEN** it MUST NOT import `useQuery`, `useSubscription`, `useMutation`, or `useApolloClient` from `@apollo/client`, and MUST NOT import hooks from `@tanstack/react-query`

#### Scenario: Templates are layout-only

- **WHEN** a file under `apps/web/src/ui/templates/` is inspected
- **THEN** it SHALL expose a layout composition (JSX regions, grids, slots) that accepts organisms/children as props, and MUST NOT contain conditional logic driven by domain state

### Requirement: Pages compose templates and organisms

Every page under `apps/web/src/pages/` that is migrated to the atomic-design layout SHALL import at most a template plus a set of organisms (and page-local hooks) and SHALL contain no bespoke inline markup beyond trivial routing or loading states. The page is the only file in the tree for a migrated screen where data-fetching hooks execute.

In story P2.3 this requirement applies to `DashboardPage.tsx` only; it applies to other pages as they migrate in later stories.

#### Scenario: `DashboardPage` composes a template and organisms

- **WHEN** `apps/web/src/pages/DashboardPage.tsx` is inspected after story P2.3 lands
- **THEN** its return value SHALL be a single `<DashboardTemplate>` composition populated with organism children imported from `apps/web/src/ui/organisms/`
- **AND** the page SHALL NOT contain more than a handful of lines of JSX outside the template composition (loading placeholder, error boundary text)

### Requirement: The atomic-design tree ships only components consumed by the dashboard in P2.3

In this change, `apps/web/src/ui/atoms/`, `molecules/`, `organisms/`, and `templates/` SHALL contain only the components actually imported by `DashboardPage.tsx`. No speculative or unused components SHALL be added. Subsequent stories introduce components as they are needed by the screens they migrate.

#### Scenario: No orphan components

- **WHEN** the diff for story P2.3 is reviewed
- **THEN** every file added under `apps/web/src/ui/` SHALL be reachable from `apps/web/src/pages/DashboardPage.tsx` via import edges, either directly or through a template/organism

