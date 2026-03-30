import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * If `VIBE_SQUIRE_DATABASE_URL` is unset, derive a `file:` URL from `VIBE_SQUIRE_DATABASE_PATH`,
 * then `VIBE_SQUIRE_DATA_DIR`, then OS defaults.
 * Creates parent directories. Sets `process.env.DATABASE_URL` and mirrors the same URL to
 * `VIBE_SQUIRE_DATABASE_URL` when derived so {@link parseAppEnv} can read `process.env` directly.
 */
export function ensureDatabaseUrlFromEnv(): void {
  const resolved = process.env.VIBE_SQUIRE_DATABASE_URL?.trim();
  if (resolved) {
    process.env.DATABASE_URL = resolved;
    return;
  }

  const explicitFile = process.env.VIBE_SQUIRE_DATABASE_PATH?.trim();
  if (explicitFile) {
    mkdirSync(dirname(explicitFile), { recursive: true });
    const url = pathToFileURL(explicitFile).href;
    process.env.DATABASE_URL = url;
    process.env.VIBE_SQUIRE_DATABASE_URL = url;
    return;
  }

  const dataDir =
    process.env.VIBE_SQUIRE_DATA_DIR?.trim() || defaultDataDirectory();
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, 'vibe-squire.db');
  const url = pathToFileURL(dbPath).href;
  process.env.DATABASE_URL = url;
  process.env.VIBE_SQUIRE_DATABASE_URL = url;
}

/**
 * Extracts the absolute file path from a DATABASE_URL.
 * Handles both proper `file:///…` URLs and Prisma's `file:./relative` shorthand.
 */
export function databaseUrlToFilePath(url: string): string {
  if (url.startsWith('file://')) {
    return fileURLToPath(url);
  }
  // Prisma shorthand: `file:./dev.db` or `file:/absolute/path.db`
  const raw = url.replace(/^file:/, '');
  return resolve(raw);
}

function defaultDataDirectory(): string {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(base, 'vibe-squire');
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'vibe-squire');
  }
  const xdg = process.env.XDG_STATE_HOME?.trim();
  if (xdg) {
    return join(xdg, 'vibe-squire');
  }
  return join(homedir(), '.local', 'state', 'vibe-squire');
}
