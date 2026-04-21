/**
 * Bootstrap env: Zod validates a normalized slice of `process.env`, then {@link parseAppEnv}
 * maps the result to {@link AppEnv}.
 *
 * After {@link ensureDatabaseUrlFromEnv}, `VIBE_SQUIRE_DATABASE_URL` is set whenever the DB URL
 * was derived from path or data dir (and `DATABASE_URL` is kept for migrations).
 *
 * Setting-level env overrides are **not** part of {@link AppEnv}; {@link SettingsService} reads
 * `process.env` using the catalog’s `VIBE_SQUIRE_*` variable names.
 */
import type { LevelWithSilent } from 'pino';
import { z } from 'zod';
import type { AppEnv } from './app-env.token';
import {
  SUPPORTED_DESTINATION_TYPES,
  SUPPORTED_SOURCE_TYPES,
} from './integration-types';

/** Allowed log level values (Pino {@link LevelWithSilent}). */
const PINO_LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const satisfies readonly LevelWithSilent[];

const appEnvInputSchema = z.looseObject({
  NODE_ENV: z.string().optional(),
  VIBE_SQUIRE_DATABASE_URL: z
    .string()
    .trim()
    .min(1, 'VIBE_SQUIRE_DATABASE_URL is required'),
  VIBE_SQUIRE_HOST: z
    .union([z.hostname(), z.ipv4()])
    .optional()
    .default('127.0.0.1'),
  VIBE_SQUIRE_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  VIBE_SQUIRE_LOG_LEVEL: z.enum(PINO_LOG_LEVELS).optional().default('info'),
  /** When set to a non-empty string, JSON logs are also written to this path (relative paths are under cwd). */
  VIBE_SQUIRE_LOG_FILE_PATH: z.string().optional(),
  VIBE_SQUIRE_SOURCE_TYPE: z
    .enum(SUPPORTED_SOURCE_TYPES)
    .optional()
    .default('github'),
  VIBE_SQUIRE_DESTINATION_TYPE: z
    .enum(SUPPORTED_DESTINATION_TYPES)
    .optional()
    .default('vibe_kanban'),
});

export type AppEnvInput = z.input<typeof appEnvInputSchema>;

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = appEnvInputSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.VIBE_SQUIRE_DATABASE_URL,
    host: parsed.VIBE_SQUIRE_HOST,
    port: parsed.VIBE_SQUIRE_PORT,
    logLevel: parsed.VIBE_SQUIRE_LOG_LEVEL,
    logFilePath: parsed.VIBE_SQUIRE_LOG_FILE_PATH?.trim() || undefined,
    sourceType: parsed.VIBE_SQUIRE_SOURCE_TYPE,
    destinationType: parsed.VIBE_SQUIRE_DESTINATION_TYPE,
  };
}
