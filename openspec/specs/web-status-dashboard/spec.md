# web-status-dashboard Specification

## Purpose
TBD - created by archiving change p2-3-apollo-client-status. Update Purpose after archive.
## Requirements
### Requirement: The dashboard renders the GraphQL `status` snapshot

The dashboard screen (`apps/web/src/pages/DashboardPage.tsx`) SHALL fetch its status data exclusively via the GraphQL `status` query using `useQuery` from `@apollo/client`. It MUST NOT issue a REST `GET /api/status` request or read the SSE `GET /api/status/stream` endpoint for the status snapshot. The operation MUST be the named document `StatusQuery` defined under `apps/web/src/graphql/operations/` and MUST request the full snapshot shape (top-level fields `timestamp`, `pending_triage_count`, `gh`, `database`, `setup`, `configuration`, `destinations`, `scouts`, `manual_sync`, `scheduled_sync`, plus the nested sub-objects).

#### Scenario: Dashboard issues a GraphQL query on mount

- **WHEN** a user navigates to `/dashboard`
- **THEN** the browser SHALL issue exactly one `POST /graphql` request carrying the `StatusQuery` operation, and MUST NOT issue `GET /api/status`

#### Scenario: Dashboard renders the snapshot payload through atomic components

- **WHEN** the `StatusQuery` resolves successfully
- **THEN** the dashboard SHALL render the snapshot fields by composing organisms from `apps/web/src/ui/organisms/` (GitHub status, database status, setup checklist, configuration, destinations, scouts, manual sync, scheduled sync) inside a `<DashboardTemplate>`, and MUST NOT dump the raw JSON payload into a `<pre>` element in its normal render path

### Requirement: The dashboard subscribes to `statusUpdated` for live updates

The dashboard SHALL open a GraphQL subscription using `useSubscription` (or equivalent) on the named operation `StatusUpdatedSubscription` under `apps/web/src/graphql/operations/`, requesting the same full snapshot shape as `StatusQuery`. When the subscription delivers a payload, the dashboard SHALL write the new snapshot into the Apollo cache under the `StatusQuery` document so every consumer of the query observes the update without re-fetching. The subscription MUST be unsubscribed when the dashboard unmounts.

#### Scenario: Subscription opens over WebSocket

- **WHEN** the dashboard mounts
- **THEN** the browser SHALL open exactly one WebSocket connection to the `/graphql` endpoint and SHALL send a `subscription` `StatusUpdatedSubscription` frame

#### Scenario: Subscription updates the UI without a page reload

- **WHEN** the backend fires `StatusEventsService.emitChanged()` (for example via a manual sync run or a core-settings mutation)
- **THEN** the dashboard SHALL re-render the affected organisms with the new snapshot values within a short interval, without the user refreshing the page or navigating away

#### Scenario: Subscription closes on unmount

- **WHEN** the user navigates away from `/dashboard`
- **THEN** the WebSocket subscription for `StatusUpdatedSubscription` SHALL be closed and MUST NOT continue delivering payloads in the background

### Requirement: The dashboard no longer issues a REST `GET /api/status` request

The dashboard code path SHALL NOT reference `/api/status` as a data source. Any prior `apiJson('/api/status')` call and any related TanStack Query hook for the status snapshot in `DashboardPage.tsx` SHALL be removed in this change. Other pages retain their REST fetches until they migrate in later stories.

#### Scenario: Source tree no longer references `/api/status` from the dashboard

- **WHEN** a developer greps `apps/web/src/pages/DashboardPage.tsx` (and any organism it transitively imports) for the literal `'/api/status'`
- **THEN** no matches SHALL be found

### Requirement: Dashboard preserves the setup checklist via its existing REST path

Until the setup-checklist capability is migrated onto GraphQL in a later story, the dashboard MAY continue to fetch `/api/ui/setup` via `@tanstack/react-query`, rendering the result through a dedicated organism (e.g. `SetupChecklistCard`) inside `<DashboardTemplate>`. The coexistence of one Apollo-backed section (status) and one TanStack-Query-backed section (setup checklist) on the same page SHALL NOT produce TypeScript, lint, or runtime errors.

#### Scenario: Setup checklist still renders

- **WHEN** a user navigates to `/dashboard` and the `/api/ui/setup` response contains at least one checklist row
- **THEN** the dashboard SHALL render those rows through the `SetupChecklistCard` organism, identical in semantics to the pre-change behavior

#### Scenario: Both data stacks render without conflict

- **WHEN** both the Apollo `StatusQuery` and the TanStack-Query `setup` fetch resolve
- **THEN** the dashboard SHALL render both sections correctly, and the browser console MUST NOT log provider-related warnings

### Requirement: Dashboard renders a reasonable state while data loads

During the initial load — before `StatusQuery` has resolved — the dashboard SHALL render a stable skeleton using `<DashboardTemplate>` with organism slots showing an unobtrusive loading indicator. It SHALL NOT render a blank page or a generic error.

If `StatusQuery` fails, the dashboard SHALL render a visible error message inside the template (text is sufficient; no retry UX is required in this story).

#### Scenario: Loading state uses the template

- **WHEN** the dashboard mounts and `StatusQuery` is still pending
- **THEN** the screen SHALL display `<DashboardTemplate>` with at least one loading indicator rendered through a component in `apps/web/src/ui/atoms/` or `apps/web/src/ui/molecules/`

#### Scenario: Errors are reported on the page

- **WHEN** `StatusQuery` returns a GraphQL error or a network error
- **THEN** the dashboard SHALL render an error message inside `<DashboardTemplate>` identifying that the status snapshot failed to load

