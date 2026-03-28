import { z } from 'zod';

const parsedJsonSchema = z.array(z.unknown()).min(1);

/**
 * Canonical JSON for the hardcoded Vibe Kanban MCP stdio spawn (not user-configurable).
 * Kept in sync with {@link VK_MCP_STDIO_SPAWN}.
 */
export const VK_MCP_STDIO_COMMAND_JSON =
  '["npx","-y","vibe-kanban@latest","--mcp"]' as const;

/**
 * Parse a JSON array string into `{ command, args }` (tests and validation helpers).
 */
export function parseVkStdioCommand(
  json: string,
): { command: string; args: string[] } | null {
  const t = json.trim();
  if (!t) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(t) as unknown;
  } catch {
    return null;
  }
  const arr = parsedJsonSchema.safeParse(parsed);
  if (!arr.success) {
    return null;
  }
  const parts = arr.data
    .map((x) => String(x).trim())
    .filter((s) => s.length > 0);
  if (parts.length < 1) {
    return null;
  }
  return { command: parts[0], args: parts.slice(1) };
}

const _vkSpawn = parseVkStdioCommand(VK_MCP_STDIO_COMMAND_JSON);
if (!_vkSpawn) {
  throw new Error('VK_MCP_STDIO_COMMAND_JSON must parse to [command, ...args]');
}

/** Hardcoded argv for {@link StdioClientTransport} (single source for runtime spawn). */
export const VK_MCP_STDIO_SPAWN = _vkSpawn;
