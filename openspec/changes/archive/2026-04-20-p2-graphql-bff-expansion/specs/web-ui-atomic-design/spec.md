## MODIFIED Requirements

### Requirement: `apps/web` uses an atomic-design UI layout under `apps/web/src/ui/`

The web operator UI SHALL host reusable visual components in a four-level atomic-design hierarchy rooted at `apps/web/src/ui/`, with subfolders `atoms/`, `molecules/`, `organisms/`, and `templates/`. Each level SHALL contain components scoped to its role as defined below. The hierarchy SHALL be documented in `apps/web/src/ui/README.md` so contributors have an authoritative reference.

During story P2.4, the Settings, Mappings, and Activity routes SHALL be refactored into this tree as they migrate to GraphQL: each migrated page SHALL move presentational JSX into templates and organisms instead of retaining a single large page file. Pages that are not in scope for this migration (e.g. GitHub, VibeKanban unless touched) MAY keep their prior structure until their own stories own a refactor.

#### Scenario: The four atomic-design folders exist with a README

- **WHEN** a developer inspects `apps/web/src/ui/`
- **THEN** the folder SHALL contain `atoms/`, `molecules/`, `organisms/`, `templates/`, and `README.md`
- **AND** `README.md` SHALL describe the role and allowed imports for each layer

#### Scenario: Migrated console pages compose from the atomic tree

- **WHEN** a developer inspects `SettingsPage.tsx`, `MappingsPage.tsx`, and `ActivityPage.tsx` after story P2.4
- **THEN** each file SHALL primarily compose one template and imported organisms (plus loading/error gates), and MUST NOT contain monolithic screen markup equivalent to the pre-migration single-file implementation

### Requirement: Atomic components obey the layered-import rule

Components at each layer SHALL respect the following import constraints:

- **Atoms** — SHALL only import from React and shared styling (`operator.css` or design tokens). Atoms MUST NOT import from `molecules/`, `organisms/`, `templates/`, Apollo Client hooks, TanStack Query hooks, or domain schemas in `@vibe-squire/shared`.
- **Molecules** — MAY import from `atoms/`. Molecules MUST NOT import from `organisms/` or `templates/`, and MUST NOT call data-fetching hooks.
- **Organisms** — MAY import from `atoms/`, `molecules/`, and domain types from `@vibe-squire/shared`. Organisms SHALL accept domain data as props; they MUST NOT call Apollo Client hooks (`useQuery`, `useSubscription`, `useMutation`) or TanStack Query hooks directly.
- **Templates** — MAY import from `atoms/`, `molecules/`, and `organisms/`. Templates SHALL be layout-only: they accept children or named-slot props and MUST NOT hold business state or call hooks beyond trivial layout (e.g. `useId`).

Pages in `apps/web/src/pages/` SHALL be the single place where data-fetching hooks are invoked for any migrated screen (dashboard from P2.3, Settings, Mappings, Activity from P2.4); the resulting data SHALL flow down through templates/organisms as props.

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

This requirement applies to `DashboardPage.tsx` from P2.3 and to `SettingsPage.tsx`, `MappingsPage.tsx`, and `ActivityPage.tsx` once P2.4 lands.

#### Scenario: `DashboardPage` composes a template and organisms

- **WHEN** `apps/web/src/pages/DashboardPage.tsx` is inspected after story P2.3 lands
- **THEN** its return value SHALL be a single `<DashboardTemplate>` composition populated with organism children imported from `apps/web/src/ui/organisms/`
- **AND** the page SHALL NOT contain more than a handful of lines of JSX outside the template composition (loading placeholder, error boundary text)

#### Scenario: Migrated P2.4 pages compose templates and organisms

- **WHEN** `SettingsPage.tsx`, `MappingsPage.tsx`, or `ActivityPage.tsx` is inspected after story P2.4
- **THEN** the page SHALL follow the same composition pattern as `DashboardPage.tsx`, using templates under `apps/web/src/ui/templates/` and organisms under `apps/web/src/ui/organisms/`

### Requirement: The atomic-design tree ships only components consumed by the dashboard in P2.3

`apps/web/src/ui/atoms/`, `molecules/`, `organisms/`, and `templates/` SHALL contain components reachable from migrated pages (`DashboardPage`, and the Settings/Mappings/Activity pages in P2.4 as they migrate). No speculative or unused components SHALL be added; shared pieces SHOULD be factored only when at least one migrated screen imports them. This extends the original P2.3 rule (dashboard-only) to the P2.4 migrated screens.

#### Scenario: No orphan components

- **WHEN** the diff for story P2.3 is reviewed
- **THEN** every file added under `apps/web/src/ui/` SHALL be reachable from `apps/web/src/pages/DashboardPage.tsx` via import edges, either directly or through a template/organism

#### Scenario: No orphan components for P2.4 migration

- **WHEN** the diff for story P2.4 is reviewed
- **THEN** every new or materially changed file under `apps/web/src/ui/` introduced for Settings, Mappings, or Activity SHALL be reachable from the corresponding page via import edges, either directly or through a template/organism

## ADDED Requirements

### Requirement: Restored UX from the pre-split UI ships as atomic components

The pre-split UX dropped in commit `2b71f909` — Settings "Sync adapters" info card with resolved source/destination labels and env-var references, Mappings data-table with inline edit/save/cancel per row and a visible VK-repos error banner, Activity per-run tables with item rows and triage-action controls — SHALL be re-implemented as components under `apps/web/src/ui/` following the layering rules, not as inline markup in pages. At minimum:

- **Settings:** an organism for the "Sync adapters" info card (consumes resolved labels + env-var references as props), and a settings-form organism that consumes `effectiveSettings` field metadata (`key`, `label`, `envVar`, `description`) to render muted setting-key hints next to each input.
- **Mappings:** an editable-row molecule that owns its local edit state (edit / save / cancel) and invokes the `updateMapping` mutation via a callback prop, plus a mappings-table organism that composes those rows. Pages remain the hook boundary; the row molecule does not call mutations directly — it receives handlers as props.
- **Activity:** a run-item molecule with triage-action buttons (Review / Decline / Reconsider), a run-with-items organism that renders an expandable run section, and an activity-feed organism that composes runs and accepts a "load more" handler as a prop.

#### Scenario: Settings adapters info card is a dedicated organism

- **WHEN** a developer inspects the restored Settings page
- **THEN** the "Sync adapters" info card SHALL live as its own organism under `apps/web/src/ui/organisms/` and be imported by `SettingsPage.tsx` (directly or via a template slot), not inlined in the page file

#### Scenario: Mappings editable row is a dedicated molecule

- **WHEN** a developer inspects the restored Mappings page
- **THEN** the per-row edit/save/cancel affordance SHALL live in a molecule under `apps/web/src/ui/molecules/` that receives row data and mutation handlers as props, and MUST NOT call `useMutation` or `useApolloClient` directly
- **AND** the table itself SHALL be an organism that composes those molecules, with the page owning the `mappings` query and mutation wiring

#### Scenario: Activity triage controls are a dedicated molecule

- **WHEN** a developer inspects the restored Activity page
- **THEN** the Review / Decline / Reconsider buttons SHALL live in a triage-action molecule under `apps/web/src/ui/molecules/` with handlers passed as props
- **AND** the run-with-items composition SHALL live as one or more organisms under `apps/web/src/ui/organisms/`, with the page subscribing to `activityEvents` and querying `activityFeed`

### Requirement: Pages are the sole subscription boundary for migrated screens

Subscription hooks (`useSubscription` from `@apollo/client`) for operator data on migrated screens SHALL be called only from files under `apps/web/src/pages/`. Organisms, molecules, atoms, and templates MUST NOT call `useSubscription` (restated from the layered-import rule, now explicit for subscriptions that drive live refresh in P2.4).

#### Scenario: ActivityPage owns the subscription

- **WHEN** a developer inspects the restored Activity page
- **THEN** `ActivityPage.tsx` SHALL be the only file that calls `useSubscription(ACTIVITY_EVENTS_SUBSCRIPTION)` for activity data, passing the derived data down as props through the template/organism tree
