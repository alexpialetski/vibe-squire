# UI Atomic Layers

The dashboard UI follows an atomic-design structure under `src/ui/`:

- `atoms/`: single-purpose visual primitives. Atoms only import React and styling.
- `molecules/`: small compositions of atoms for one concept.
- `organisms/`: feature blocks that accept domain data as props.
- `templates/`: layout shells that arrange organisms into page regions.

## Import Rules

- Atoms may import React + styling only.
- Molecules may import atoms only.
- Organisms may import atoms, molecules, and domain types.
- Templates may import atoms, molecules, and organisms.
- Pages are the only place where data hooks (`@apollo/client`, `@tanstack/react-query`) run.

## Examples

Passing example:

- `DashboardPage` runs `useQuery` and `useSubscription`, then passes values into `DashboardTemplate`.

Rejected example:

- A component in `src/ui/organisms/` calling `useQuery` directly to fetch status data.
