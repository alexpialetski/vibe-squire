import path from 'node:path';
import type { Params } from 'nestjs-pino';
import pino from 'pino';
import type { LevelWithSilent } from 'pino';
import pinoPretty from 'pino-pretty';

const REDACT = {
  paths: ['req.headers.authorization', 'req.headers.cookie'],
  remove: true,
};

function defaultLogFilePath(): string {
  return path.join(process.cwd(), 'logs', 'app.log');
}

/**
 * When unset or empty, logs to `logs/app.log` under cwd. Set `LOG_TO_FILE=false`
 * to disable file logging (console only).
 */
function resolveLogFilePath(): string | null {
  if (process.env.LOG_TO_FILE === 'false' || process.env.LOG_TO_FILE === '0') {
    return null;
  }
  const raw = process.env.LOG_FILE_PATH?.trim();
  if (!raw) {
    return defaultLogFilePath();
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

/**
 * nestjs-pino / pino-http options. Kept out of AppModule to avoid clutter.
 * Writes JSON lines to a file (default `logs/app.log`) in addition to the console.
 */
export function createLoggerModuleParams(): Params {
  const level = (process.env.LOG_LEVEL ?? 'info') as LevelWithSilent;
  const isProd = process.env.NODE_ENV === 'production';
  const logFilePath = resolveLogFilePath();

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
