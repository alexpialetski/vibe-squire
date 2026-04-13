import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runSqliteMigrations } from '../src/database/sqlite-migrate';

const intDir = mkdtempSync(join(tmpdir(), 'vs-int-'));
const dbFile = join(intDir, 'integration.sqlite');
process.env.VIBE_SQUIRE_DATABASE_URL = pathToFileURL(dbFile).href;
process.env.VIBE_SQUIRE_RUN_NOW_COOLDOWN_SECONDS = '0';
process.env.VIBE_SQUIRE_LOG_LEVEL =
  process.env.VIBE_SQUIRE_LOG_LEVEL ?? 'silent';

runSqliteMigrations(dbFile);
