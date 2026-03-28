import type { SupportedDestinationType } from '../../config/integration-types';

export {
  parseVkStdioCommand,
  VK_MCP_STDIO_SPAWN,
} from './vk-stdio-command.schema';

/** Shared with {@link VibeKanbanMcpConfiguredGuard} and API consumers. */
export const VK_MCP_NOT_CONFIGURED_MESSAGE =
  'Vibe Kanban MCP routes require DESTINATION_TYPE=vibe_kanban';

export function isVibeKanbanDestination(
  destinationType: SupportedDestinationType,
): boolean {
  return destinationType === 'vibe_kanban';
}

/**
 * True when the process is wired for Vibe Kanban MCP (stdio command is hardcoded).
 */
export function isVibeKanbanMcpConfigured(
  destinationType: SupportedDestinationType,
): boolean {
  return isVibeKanbanDestination(destinationType);
}
