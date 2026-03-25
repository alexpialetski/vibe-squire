import { spawnSync } from 'node:child_process';

/**
 * Applies pending SQL migrations (`prisma migrate deploy`) before the HTTP server starts.
 * Requires `DATABASE_URL` and Prisma CLI on PATH / in node_modules.
 */
export function runPrismaMigrateDeploy(): void {
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(cmd, ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `prisma migrate deploy exited with code ${result.status ?? 'unknown'}`,
    );
  }
}
