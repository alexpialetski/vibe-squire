# UI Atomic Layers

The operator UI follows an atomic-design structure under `src/ui/`:

- `atoms/`: single-purpose visual primitives. Atoms only import React and styling.
- `molecules/`: small compositions of atoms for one concept.
- `organisms/`: feature blocks that accept domain data as props.
- `templates/`: layout shells that arrange organisms into page regions.

## Import Rules

- Atoms may import React + styling only.
- Molecules may import atoms only.
- Organisms may import atoms, molecules, and domain types.
- Templates may import atoms, molecules, and organisms.
- **Pages are the sole hook boundary:** only `src/pages/*` may call `@apollo/client` hooks (`useQuery`, `useMutation`, `useSubscription`) or wire imperative data loading. UI under `src/ui/` stays presentational and receives data or callbacks as props.

## Operator organisms (GraphQL / General settings)

- `organisms/GeneralSettingsForm.tsx` — toggles and numeric fields with per-field `key` / `envVar` / `description` hints from `effectiveSettings.coreFields`.
- `molecules/OperatorSyncActions.tsx` — conditional reinit action in page headers; uses `STATUS_QUERY` to decide when reinit should be offered (still presentational: no GraphQL document definitions in `ui/`).

## Mappings (P2.4 layout)

- `molecules/VkReposLoadErrorBanner.tsx` — Vibe Kanban repos query failure + reload control.
- `molecules/MappingEditableRow.tsx` — one table row (view vs edit) with edit/save/cancel/delete driven by props.
- `organisms/MappingsTable.tsx` — “Existing” card, loading/error/empty states, and the data table of `MappingEditableRow`.
- `organisms/NewMappingCard.tsx` — “New mapping” form card.
- `templates/MappingsPageTemplate.tsx` — stacks title row, intro, optional VK error, new mapping, and existing table regions.

## Activity (P2.4 layout)

- `molecules/ActivityTriageActions.tsx` — Review / Decline / Reconsider buttons; callbacks receive `prUrl`.
- `organisms/ActivityRunWithItems.tsx` — one run card with header + items table (uses shared `ActivityRunsResponse` run shape).
- `organisms/ActivityFeedSection.tsx` — loading/error lines, list of runs, and “Load more” control (connection UX lives in the page via `fetchMore`; this organism receives parsed runs + handlers).
- `templates/ActivityPageTemplate.tsx` — stacks title row, intro, and feed region.

## Examples

Passing example:

- `DashboardPage` runs `useQuery` and `useSubscription`, then passes values into `DashboardTemplate`.
- `SettingsPage` runs Apollo mutations/queries, then passes props into `GeneralSettingsTemplate` and `GeneralSettingsForm`.
- `MappingsPage` owns Apollo queries/mutations and cache-update mutations; composes `MappingsPageTemplate`, `NewMappingCard`, `MappingsTable`, and `VkReposLoadErrorBanner`.
- `ActivityPage` owns `activityFeed` query, `activityEvents` subscription, and triage mutations; composes `ActivityPageTemplate` and `ActivityFeedSection`.

Rejected example:

- A component in `src/ui/organisms/` calling `useQuery` directly to fetch status data.
