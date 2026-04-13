import path from 'node:path';
import type { Params } from 'nestjs-pino';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import type { AppEnv } from '../config/app-env.token';

const REDACT = {
  paths: ['req.headers.authorization', 'req.headers.cookie'],
  remove: true,
};

/**
 * File logging is enabled when `VIBE_SQUIRE_LOG_FILE_PATH` is set to a non-empty value (after trim).
 */
function resolveLogFilePath(env: Pick<AppEnv, 'logFilePath'>): string | null {
  const raw = env.logFilePath?.trim();
  if (!raw) {
    return null;
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

/**
 * nestjs-pino / pino-http options. Kept out of AppModule to avoid clutter.
 * When `VIBE_SQUIRE_LOG_FILE_PATH` is set, also writes JSON lines to that file alongside the console.
 */
export function createLoggerModuleParams(
  env: Pick<AppEnv, 'logLevel' | 'logFilePath' | 'nodeEnv'>,
): Params {
  const level = env.logLevel;
  const isProd = env.nodeEnv === 'production';
  const logFilePath = resolveLogFilePath(env);

  const baseOptions = {
    level,
    redact: REDACT,
  };

  if (!logFilePath) {
    return {
      pinoHttp: {
        ...baseOptions,
        ...(isProd
          ? {}
          : {
              transport: {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              },
            }),
      },
    };
  }

  const consoleStream = isProd
    ? process.stdout
    : pinoPretty({ singleLine: true, colorize: true });

  const fileDest = pino.destination({ dest: logFilePath, mkdir: true });
  const stream = pino.multistream([
    { level, stream: consoleStream },
    { level, stream: fileDest },
  ]);

  return {
    pinoHttp: [baseOptions, stream],
  };
}
