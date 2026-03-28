import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';

/**
 * Walks up from `__dirname` to find `prisma/migrations/`.
 * Handles both dev (`src/database/`) and compiled (`dist/src/database/`)
 * layouts, and works when the package is installed via npx.
 */
function resolveMigrationsDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'prisma', 'migrations');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error(
    `Cannot find prisma/migrations/ (searched up from ${__dirname})`,
  );
}

/**
 * Prisma's `_prisma_migrations` table schema (SQLite variant).
 * We create it identically so `prisma migrate deploy` still works
 * in local dev without conflict.
 */
const ENSURE_META_TABLE = `
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
  );
`;

interface AppliedRow {
  migration_name: string;
}

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Apply pending Prisma-compatible migrations using better-sqlite3 directly.
 * Reads `prisma/migrations/<name>/migration.sql` in alphabetical order,
 * skips already-applied ones, and records them in `_prisma_migrations`.
 *
 * @param dbPath - File path to the SQLite database (not a `file:` URL).
 */
export function runSqliteMigrations(dbPath: string): void {
  const migrationsDir = resolveMigrationsDir();
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.exec(ENSURE_META_TABLE);

    const applied = new Set(
      db
        .prepare(
          'SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL',
        )
        .all()
        .map((r) => (r as AppliedRow).migration_name),
    );

    for (const name of entries) {
      if (applied.has(name)) continue;

      const sqlFile = join(migrationsDir, name, 'migration.sql');
      let sql: string;
      try {
        sql = readFileSync(sqlFile, 'utf8');
      } catch {
        continue; // directory without migration.sql (e.g. migration_lock.toml only)
      }

      const checksum = sha256(sql);
      const id = generateId();

      db.exec(sql);

      db.prepare(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
         VALUES (?, ?, datetime('now'), ?, 1)`,
      ).run(id, checksum, name);
    }
  } finally {
    db.close();
  }
}
