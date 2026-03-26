import type { SupportedDestinationType } from '../config/integration-types';
import type { SettingsService } from '../settings/settings.service';
import { parseVkStdioCommand } from './vk-stdio-command.schema';

export { parseVkStdioCommand };

/** Any object that can resolve effective settings (MCP / destination checks). */
export type EffectiveSettings = Pick<SettingsService, 'getEffective'>;

export function isVibeKanbanDestination(
  destinationType: SupportedDestinationType,
): boolean {
  return destinationType === 'vibe_kanban';
}

/**
 * True when MCP can be used for Vibe Kanban (stdio command JSON valid).
 */
export function isVibeKanbanMcpConfigured(
  settings: EffectiveSettings,
  destinationType: SupportedDestinationType,
): boolean {
  if (!isVibeKanbanDestination(destinationType)) {
    return false;
  }
  return (
    parseVkStdioCommand(settings.getEffective('vk_mcp_stdio_json')) != null
  );
}
