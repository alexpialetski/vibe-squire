/** Nest DI tokens for hexagonal ports (§2). */
export const GITHUB_PR_SCOUT_PORT = Symbol('GITHUB_PR_SCOUT_PORT');
/** Sync orchestration: resolves to the adapter for `AppEnv.sourceType`. */
export const SYNC_PR_SCOUT_PORT = Symbol('SYNC_PR_SCOUT_PORT');
export const VIBE_KANBAN_BOARD_PORT = Symbol('VIBE_KANBAN_BOARD_PORT');
/** Lazy stdio MCP session: shutdown + serialized `runWithClient`. */
export const VK_MCP_STDIO_SESSION_PORT = Symbol('VK_MCP_STDIO_SESSION_PORT');
/** Generic board port for sync (`AppEnv.destinationType`). */
export const DESTINATION_BOARD_PORT = Symbol('DESTINATION_BOARD_PORT');
/** Alias for {@link DESTINATION_BOARD_PORT} (sync orchestration token name). */
export const SYNC_DESTINATION_BOARD_PORT = DESTINATION_BOARD_PORT;
/** Source health for status API and sync prerequisites (`AppEnv.sourceType`). */
export const SOURCE_STATUS_PORT = Symbol('SOURCE_STATUS_PORT');
/** Destination setup + health (`AppEnv.destinationType`). */
export const DESTINATION_STATUS_PORT = Symbol('DESTINATION_STATUS_PORT');
/** Multi: sidebar links under Settings (plugin-owned pages). */
export const UI_NAV_ENTRIES = Symbol('UI_NAV_ENTRIES');
