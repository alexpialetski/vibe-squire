import type { Params } from 'nestjs-pino';

/**
 * nestjs-pino / pino-http options. Kept out of AppModule to avoid clutter.
 */
export function createLoggerModuleParams(): Params {
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        remove: true,
      },
      ...(process.env.NODE_ENV !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { singleLine: true, colorize: true },
            },
          }
        : {}),
    },
  };
}
