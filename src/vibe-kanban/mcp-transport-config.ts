import type { SettingsService } from '../settings/settings.service';

/**
 * Parse `vk_mcp_stdio_json`: a JSON array, first element = command, rest = args.
 */
export function parseVkStdioCommand(
  json: string,
): { command: string; args: string[] } | null {
  const t = json.trim();
  if (!t) {
    return null;
  }
  try {
    const arr = JSON.parse(t) as unknown;
    if (!Array.isArray(arr) || arr.length < 1) {
      return null;
    }
    const parts = arr.map((x) => String(x).trim()).filter((s) => s.length > 0);
    if (parts.length < 1) {
      return null;
    }
    return { command: parts[0], args: parts.slice(1) };
  } catch {
    return null;
  }
}

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
