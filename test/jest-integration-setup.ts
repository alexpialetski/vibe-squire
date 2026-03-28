import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runSqliteMigrations } from '../src/database/sqlite-migrate';

const intDir = mkdtempSync(join(tmpdir(), 'vs-int-'));
const dbFile = join(intDir, 'integration.sqlite');
process.env.DATABASE_URL = pathToFileURL(dbFile).href;
process.env.RUN_NOW_COOLDOWN_SECONDS = '0';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

runSqliteMigrations(dbFile);
