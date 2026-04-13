import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureExpressApp } from './configure-express-app';
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

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env),
    {
      bufferLogs: true,
    },
  );
  configureExpressApp(app);
  app.enableCors({ origin: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (env.openapiEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('vibe-squire')
      .setDescription(
        'Local orchestrator: GitHub PR review queue → Vibe Kanban via local HTTP API.',
      )
      .setVersion('0.0.1')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.port, env.host);
  const logger = app.get(Logger);
  logger.log(`HTTP server listening on ${await app.getUrl()}`);
}

void bootstrap();
