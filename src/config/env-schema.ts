/**
 * Bootstrap env: Zod validates `process.env`, then {@link parseAppEnv} maps the
 * result to {@link AppEnv}.
 *
 * Setting-level env overrides (e.g. `POLL_INTERVAL_MINUTES`) are **not** part of
 * {@link AppEnv}; {@link SettingsService} reads `process.env` directly for those.
 */
import type { LevelWithSilent } from 'pino';
import { z } from 'zod';
import type { AppEnv } from './app-env.token';
import {
  SUPPORTED_DESTINATION_TYPES,
  SUPPORTED_SOURCE_TYPES,
} from './integration-types';

/** Allowed `LOG_LEVEL` values (Pino {@link LevelWithSilent}). */
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
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),
  HOST: z.union([z.hostname(), z.ipv4()]).optional().default('127.0.0.1'),
  PORT: z.number().int().min(1).max(65535).default(3000),
  OPENAPI_ENABLED: z.stringbool().optional().default(true),
  LOG_LEVEL: z.enum(PINO_LOG_LEVELS).optional().default('info'),
  /** When set to a non-empty string, JSON logs are also written to this path (relative paths are under cwd). */
  LOG_FILE_PATH: z.string().optional(),
  SOURCE_TYPE: z.enum(SUPPORTED_SOURCE_TYPES).optional().default('github'),
  DESTINATION_TYPE: z
    .enum(SUPPORTED_DESTINATION_TYPES)
    .optional()
    .default('vibe_kanban'),
});

export type AppEnvInput = z.input<typeof appEnvInputSchema>;

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = appEnvInputSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    host: parsed.HOST,
    port: parsed.PORT,
    openapiEnabled: parsed.OPENAPI_ENABLED,
    logLevel: parsed.LOG_LEVEL,
    logFilePath: parsed.LOG_FILE_PATH?.trim() || undefined,
    sourceType: parsed.SOURCE_TYPE,
    destinationType: parsed.DESTINATION_TYPE,
  };
}
