import path from 'node:path';
import type { Params } from 'nestjs-pino';
import pino from 'pino';
import type { LevelWithSilent } from 'pino';
import pinoPretty from 'pino-pretty';
import type { AppEnv } from '../config/env-schema';

const REDACT = {
  paths: ['req.headers.authorization', 'req.headers.cookie'],
  remove: true,
};

function defaultLogFilePath(): string {
  return path.join(process.cwd(), 'logs', 'app.log');
}

/**
 * When file logging is on and path unset, uses `logs/app.log` under cwd.
 */
function resolveLogFilePath(
  env: Pick<AppEnv, 'logToFile' | 'logFilePath'>,
): string | null {
  if (!env.logToFile) {
    return null;
  }
  const raw = env.logFilePath;
  if (!raw) {
    return defaultLogFilePath();
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

/**
 * nestjs-pino / pino-http options. Kept out of AppModule to avoid clutter.
 * Writes JSON lines to a file (default `logs/app.log`) in addition to the console.
 */
export function createLoggerModuleParams(
  env: Pick<AppEnv, 'logLevel' | 'logToFile' | 'logFilePath' | 'nodeEnv'>,
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
