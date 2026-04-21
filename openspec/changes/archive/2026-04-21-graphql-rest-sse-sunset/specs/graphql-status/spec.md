## MODIFIED Requirements

### Requirement: REST and SSE status endpoints remain unchanged during the GraphQL migration

The `GET /api/status` REST controller and the `GET /api/status/stream` SSE controller SHALL be deleted. The status snapshot and live-update transports are served exclusively by the GraphQL `status` query and `statusUpdated` subscription delivered over `graphql-ws`. `StatusEventsService.updates()` SHALL feed only the GraphQL PubSub — no `@Sse` consumer, interceptor, or bridge SHALL subscribe to it outside the GraphQL subscription pipeline. The transport decision table in `docs/ARCHITECTURE.md` SHALL record both endpoints as `removed` with a one-sentence justification naming the GraphQL operation that supersedes them.

#### Scenario: REST status endpoint responds 404

- **WHEN** a client sends `GET /api/status` after this change is deployed
- **THEN** the server SHALL respond `404 Not Found`, because the route handler has been deleted

#### Scenario: SSE status stream responds 404

- **WHEN** a client sends `GET /api/status/stream` after this change is deployed
- **THEN** the server SHALL respond `404 Not Found`, because the `@Sse('stream')` handler has been deleted

#### Scenario: `StatusEventsService.updates()` has exactly one downstream subscriber

- **WHEN** the status module is initialised after this change lands
- **THEN** the only code path subscribing to `StatusEventsService.updates()` SHALL be the `statusUpdated` subscription resolver (directly or via the GraphQL PubSub bridge)
- **AND** no `@Sse` handler, SSE gateway, or non-GraphQL HTTP interceptor SHALL subscribe to it

#### Scenario: Transport decision table records the removal

- **WHEN** `docs/ARCHITECTURE.md` is inspected after this change lands
- **THEN** the transport decision table SHALL contain rows for `GET /api/status` and `GET /api/status/stream`, each with status `removed`
- **AND** each justification SHALL name the GraphQL operation (`status` query and `statusUpdated` subscription respectively) that supersedes the removed endpoint
