import './load-dotenv';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureFastifyApp } from './configure-fastify-app';
import { parseAppEnv } from './config/env-schema';
import {
  databaseUrlToFilePath,
  ensureDatabaseUrlFromEnv,
} from './database/resolve-database-url';
import { runSqliteMigrations } from './database/sqlite-migrate';

async function bootstrap() {
  ensureDatabaseUrlFromEnv();
  runSqliteMigrations(databaseUrlToFilePath(process.env.DATABASE_URL!));
  const env = parseAppEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(env),
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );
  await configureFastifyApp(app);
  app.enableCors({ origin: true });
  app.useLogger(app.get(Logger));

  await app.listen(env.port, env.host);
  const logger = app.get(Logger);
  logger.log(`HTTP server listening on ${await app.getUrl()}`);
}

void bootstrap();
