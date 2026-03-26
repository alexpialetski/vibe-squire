import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureExpressApp } from './configure-express-app';
import { parseAppEnv } from './config/env-schema';
import { ensureDatabaseUrlFromEnv } from './database/resolve-database-url';
import { runPrismaMigrateDeploy } from './database/prisma-migrate';

async function bootstrap() {
  ensureDatabaseUrlFromEnv();
  runPrismaMigrateDeploy();
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
        'Local orchestrator HTTP API (see REQUIREMENTS.md for behaviour).',
      )
      .setVersion('0.0.1')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.port, env.host);
}

void bootstrap();
