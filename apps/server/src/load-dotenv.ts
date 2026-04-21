import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

/**
 * Load `.env` before `parseAppEnv()` and Nest bootstrap.
 * Tries cwd first, then parents (monorepo: `apps/server` → repo root).
 * Later files only set vars not already present (dotenv default).
 */
const candidates = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '..', '.env'),
  path.join(process.cwd(), '..', '..', '.env'),
];

for (const dotenvPath of candidates) {
  if (fs.existsSync(dotenvPath)) {
    config({ path: dotenvPath });
  }
}
