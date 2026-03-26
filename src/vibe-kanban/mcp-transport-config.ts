import type { SettingsService } from '../settings/settings.service';
import { parseVkStdioCommand } from './vk-stdio-command.schema';

export { parseVkStdioCommand };

/** Any object that can resolve effective settings (MCP / destination checks). */
export type EffectiveSettings = Pick<SettingsService, 'getEffective'>;

export function isVibeKanbanDestination(settings: EffectiveSettings): boolean {
  return settings.getEffective('destination_type').trim() === 'vibe_kanban';
}

/**
 * True when MCP can be used for Vibe Kanban (stdio command JSON valid).
 */
export function isVibeKanbanMcpConfigured(
  settings: EffectiveSettings,
): boolean {
  if (!isVibeKanbanDestination(settings)) {
    return false;
  }
  return (
    parseVkStdioCommand(settings.getEffective('vk_mcp_stdio_json')) != null
  );
}
