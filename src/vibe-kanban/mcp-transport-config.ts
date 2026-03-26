import type { SettingsService } from '../settings/settings.service';
import { parseVkStdioCommand } from './vk-stdio-command.schema';

export { parseVkStdioCommand };

export function isVibeKanbanDestination(settings: SettingsService): boolean {
  return settings.getEffective('destination_type').trim() === 'vibe_kanban';
}

/**
 * True when MCP can be used for Vibe Kanban (stdio command JSON valid).
 */
export function isVibeKanbanMcpConfigured(settings: SettingsService): boolean {
  if (!isVibeKanbanDestination(settings)) {
    return false;
  }
  return (
    parseVkStdioCommand(settings.getEffective('vk_mcp_stdio_json')) != null
  );
}
