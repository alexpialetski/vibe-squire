import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(__dirname, '..');
const intDir = mkdtempSync(join(tmpdir(), 'vs-int-'));
const dbFile = join(intDir, 'integration.sqlite');
process.env.DATABASE_URL = pathToFileURL(dbFile).href;
process.env.RUN_NOW_COOLDOWN_SECONDS = '0';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const r = spawnSync(cmd, ['prisma', 'migrate', 'deploy'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
if (r.status !== 0) {
  throw new Error(
    `integration: prisma migrate deploy failed (exit ${r.status})`,
  );
}
