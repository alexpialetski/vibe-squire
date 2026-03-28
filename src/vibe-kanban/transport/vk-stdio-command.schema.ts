import { z } from 'zod';

const parsedJsonSchema = z.array(z.unknown()).min(1);

/**
 * Parsed `vk_mcp_stdio_json`: non-empty JSON array; command = first non-empty stringified element, rest = args.
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
