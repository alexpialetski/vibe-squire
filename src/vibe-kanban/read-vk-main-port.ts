import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vkPortFileJsonSchema } from './vk-port-file.schema';

const APP_NAME = 'vibe-kanban' as const;

/**
 * Reads `{tmpdir}/vibe-kanban/vibe-kanban.port` — same path as Vibe Kanban's Rust `read_port_file`.
 * Supports JSON `{"main_port":n}` or legacy plain text port.
 */
export async function readVkMainPortFromPortFile(): Promise<number> {
  const path = join(tmpdir(), APP_NAME, `${APP_NAME}.port`);
  const raw = await readFile(path, 'utf8');
  const trimmed = raw.trim();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(trimmed) as unknown;
  } catch {
    parsedJson = null;
  }
  if (parsedJson != null && typeof parsedJson === 'object') {
    const jsonTry = vkPortFileJsonSchema.safeParse(parsedJson);
    if (jsonTry.success) {
      return jsonTry.data.main_port;
    }
  }
  const legacy = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(legacy) || legacy < 1 || legacy > 65535) {
    throw new Error(
      `Invalid Vibe Kanban port file at ${path}: expected JSON with main_port or a port number`,
    );
  }
  return legacy;
}
