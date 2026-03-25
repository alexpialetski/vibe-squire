import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureExpressApp } from './configure-express-app';
import { ensureDatabaseUrlFromEnv } from './database/resolve-database-url';
import { runPrismaMigrateDeploy } from './database/prisma-migrate';

async function bootstrap() {
  ensureDatabaseUrlFromEnv();
  runPrismaMigrateDeploy();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  configureExpressApp(app);
  app.enableCors({ origin: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (process.env.OPENAPI_ENABLED !== 'false') {
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

  const host = process.env.HOST ?? '127.0.0.1';
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, host);
}

void bootstrap();
