import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * If `DATABASE_URL` is unset, derive SQLite `file:` URL from
 * `DATABASE_PATH`, then `VIBE_SQUIRE_DATA_DIR`, then OS defaults.
 * Creates parent directories. Mutates `process.env.DATABASE_URL`.
 */
export function ensureDatabaseUrlFromEnv(): void {
  const existing = process.env.DATABASE_URL?.trim();
  if (existing) {
    return;
  }

  const explicitFile = process.env.DATABASE_PATH?.trim();
  if (explicitFile) {
    mkdirSync(dirname(explicitFile), { recursive: true });
    process.env.DATABASE_URL = pathToFileURL(explicitFile).href;
    return;
  }

  const dataDir =
    process.env.VIBE_SQUIRE_DATA_DIR?.trim() || defaultDataDirectory();
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, 'vibe-squire.db');
  process.env.DATABASE_URL = pathToFileURL(dbPath).href;
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
