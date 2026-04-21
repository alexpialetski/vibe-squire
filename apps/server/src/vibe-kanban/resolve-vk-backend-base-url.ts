import { readVkMainPortFromPortFile } from './read-vk-main-port';

const HOST_ENV_SQUIRE = 'VIBE_SQUIRE_VK_HOST';
const PORT_ENV_SQUIRE = 'VIBE_SQUIRE_VK_PORT';
const URL_ENV_SQUIRE = 'VIBE_SQUIRE_VK_BACKEND_URL';

/** Same URL resolution semantics as the Vibe Kanban desktop app / CLI. */
const URL_ENV_VK = 'VIBE_BACKEND_URL';
/** Legacy alias still read by some VK tooling. */
const HOST_ENV_LEGACY = 'MCP_HOST';
const HOST_ENV_GENERIC = 'HOST';
/** Legacy alias still read by some VK tooling. */
const PORT_ENV_LEGACY = 'MCP_PORT';
const PORT_ENV_BACKEND = 'BACKEND_PORT';
const PORT_ENV_GENERIC = 'PORT';

function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function parsePort(portStr: string): number {
  const n = Number.parseInt(portStr.trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid Vibe Kanban backend port: ${portStr}`);
  }
  return n;
}

/**
 * Resolves the local Vibe Kanban HTTP base URL (`http://host:port`, no trailing slash).
 *
 * Precedence:
 * 1. `VIBE_SQUIRE_VK_BACKEND_URL` then `VIBE_BACKEND_URL` (full URL)
 * 2. Host: `VIBE_SQUIRE_VK_HOST` → `MCP_HOST` (legacy) → `HOST` → `127.0.0.1`
 * 3. Port: `VIBE_SQUIRE_VK_PORT` → `MCP_PORT` (legacy) → `BACKEND_PORT` → `PORT` → port file
 */
export async function resolveVkBackendBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const fromSquire = env[URL_ENV_SQUIRE]?.trim();
  if (fromSquire) {
    return trimUrl(fromSquire);
  }
  const fromVk = env[URL_ENV_VK]?.trim();
  if (fromVk) {
    return trimUrl(fromVk);
  }

  const host =
    env[HOST_ENV_SQUIRE]?.trim() ||
    env[HOST_ENV_LEGACY]?.trim() ||
    env[HOST_ENV_GENERIC]?.trim() ||
    '127.0.0.1';

  const portStr =
    env[PORT_ENV_SQUIRE]?.trim() ||
    env[PORT_ENV_LEGACY]?.trim() ||
    env[PORT_ENV_BACKEND]?.trim() ||
    env[PORT_ENV_GENERIC]?.trim();

  const port = portStr
    ? parsePort(portStr)
    : await readVkMainPortFromPortFile();

  return `http://${host}:${port}`;
}
