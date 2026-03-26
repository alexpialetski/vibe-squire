/**
 * Bootstrap env: Zod validates `process.env` (base keys + setting-related vars from
 * {@link SETTING_DEFINITIONS}), then {@link parseAppEnv} maps the result to {@link AppEnv}.
 */
import type { LevelWithSilent } from 'pino';
import { z } from 'zod';
import { SETTING_DEFINITIONS, type SettingEnvVarName } from './setting-keys';

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

type PinoLogLevel = (typeof PINO_LOG_LEVELS)[number];

function buildSettingEnvZodAndNames(): {
  zodShape: Partial<Record<SettingEnvVarName, z.ZodType<string | undefined>>>;
  envVarNames: readonly SettingEnvVarName[];
} {
  const zodShape: Partial<
    Record<SettingEnvVarName, z.ZodType<string | undefined>>
  > = {};
  const envVarNames: SettingEnvVarName[] = [];
  for (const def of Object.values(SETTING_DEFINITIONS)) {
    if (!('envVar' in def)) {
      continue;
    }
    const name = def.envVar;
    envVarNames.push(name);
    zodShape[name] = z.string().optional();
  }
  return { zodShape, envVarNames };
}

const { zodShape: settingsEnvZodShape, envVarNames: SETTING_ENV_VAR_NAMES } =
  buildSettingEnvZodAndNames();

function trimEnvString(v: string | undefined): string | undefined {
  if (v === undefined) {
    return undefined;
  }
  const t = v.trim();
  return t === '' ? undefined : t;
}

/** On when unset or empty; off only for `false` or `0` (case-insensitive). */
function envOptOutFlag(raw: string | undefined): boolean {
  const s = trimEnvString(raw)?.toLowerCase();
  if (s === undefined) {
    return true;
  }
  return s !== 'false' && s !== '0';
}

type ParsePortResult =
  | { ok: true; port: number }
  | { ok: false; displayInput: string | undefined };

/** Shared PORT parsing: default `3000`, range 1–65535. */
function parsePortFromEnv(raw: string | undefined): ParsePortResult {
  const portStr = trimEnvString(raw) ?? '3000';
  const port = parseInt(portStr, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, displayInput: raw };
  }
  return { ok: true, port };
}

function resolvedLogLevel(parsed: PinoLogLevel | undefined): LevelWithSilent {
  return (parsed ?? 'info') as LevelWithSilent;
}

const appEnvInputSchema = z
  .looseObject({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z.string().min(1, 'DATABASE_URL is required'),
    ),
    HOST: z.string().optional(),
    PORT: z.string().optional(),
    OPENAPI_ENABLED: z.string().optional(),
    LOG_LEVEL: z
      .union([z.string(), z.undefined()])
      .transform((s) => {
        if (s === undefined) {
          return undefined;
        }
        const t = s.trim().toLowerCase();
        return t === '' ? undefined : t;
      })
      .pipe(z.enum(PINO_LOG_LEVELS).optional()),
    LOG_TO_FILE: z.string().optional(),
    LOG_FILE_PATH: z.string().optional(),
    ...settingsEnvZodShape,
  })
  .superRefine((val, ctx) => {
    const pr = parsePortFromEnv(val.PORT);
    if (!pr.ok) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid PORT: ${pr.displayInput ?? '(unset)'}`,
        path: ['PORT'],
        input: val.PORT,
      });
    }
  });

export type AppEnv = {
  nodeEnv: string | undefined;
  databaseUrl: string;
  host: string;
  port: number;
  openapiEnabled: boolean;
  logLevel: LevelWithSilent;
  logToFile: boolean;
  logFilePath: string | undefined;
  /** Non-empty trimmed values for setting keys that map to `envVar` in {@link SETTING_DEFINITIONS}. */
  settingsEnv: Partial<Record<SettingEnvVarName, string>>;
};

/** Nest injection token for parsed application environment ({@link AppEnv}). */
export const APP_ENV = Symbol('APP_ENV');

export type AppEnvInput = z.input<typeof appEnvInputSchema>;

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = appEnvInputSchema.parse(env);
  const record = parsed as Record<string, unknown>;

  const portResult = parsePortFromEnv(parsed.PORT);
  if (!portResult.ok) {
    throw new Error(
      `PORT invalid after Zod validation: ${portResult.displayInput ?? '(unset)'}`,
    );
  }
  const port = portResult.port;

  const settingsEnv: Partial<Record<SettingEnvVarName, string>> = {};
  for (const envVar of SETTING_ENV_VAR_NAMES) {
    const raw = record[envVar];
    if (typeof raw === 'string') {
      const t = trimEnvString(raw);
      if (t !== undefined) {
        settingsEnv[envVar] = t;
      }
    }
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    host: trimEnvString(parsed.HOST) ?? '127.0.0.1',
    port,
    openapiEnabled: envOptOutFlag(parsed.OPENAPI_ENABLED),
    logLevel: resolvedLogLevel(parsed.LOG_LEVEL),
    logToFile: envOptOutFlag(parsed.LOG_TO_FILE),
    logFilePath: trimEnvString(parsed.LOG_FILE_PATH),
    settingsEnv,
  };
}
