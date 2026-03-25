import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(__dirname, '..');
const dbFile = join(__dirname, 'e2e.sqlite');
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const r = spawnSync(cmd, ['prisma', 'migrate', 'deploy'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
if (r.status !== 0) {
  throw new Error(`e2e: prisma migrate deploy failed (exit ${r.status})`);
}
