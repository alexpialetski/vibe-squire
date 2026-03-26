/** Nest DI tokens for hexagonal ports (§2). */
export const GITHUB_PR_SCOUT_PORT = Symbol('GITHUB_PR_SCOUT_PORT');
/** Sync orchestration: resolves to the adapter for effective `source_type`. */
export const SYNC_PR_SCOUT_PORT = Symbol('SYNC_PR_SCOUT_PORT');
export const VIBE_KANBAN_BOARD_PORT = Symbol('VIBE_KANBAN_BOARD_PORT');
/** Lazy stdio MCP session: shutdown + serialized `runWithClient`. */
export const VK_MCP_STDIO_SESSION_PORT = Symbol('VK_MCP_STDIO_SESSION_PORT');
/** Sync orchestration: resolves to the adapter for effective `destination_type`. */
export const SYNC_DESTINATION_BOARD_PORT = Symbol(
  'SYNC_DESTINATION_BOARD_PORT',
);
