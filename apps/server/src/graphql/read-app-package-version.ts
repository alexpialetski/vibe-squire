import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Resolves `apps/server/package.json` from `src/graphql/*` or `dist/graphql/*`. */
export function readAppPackageVersion(): string {
  const pkgPath = join(__dirname, '..', '..', 'package.json');
  const raw = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as { version?: string };
  return pkg.version ?? '0.0.0';
}
