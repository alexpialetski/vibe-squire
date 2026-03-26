import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { EnvModule } from './config/env.module';
import { parseAppEnv, type AppEnv } from './config/env-schema';
import { createLoggerModuleParams } from './logging/create-logger-params';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { GhModule } from './gh/gh.module';
import { MappingsModule } from './mappings/mappings.module';
import { StatusModule } from './status/status.module';
import { StatusEventsModule } from './events/status-events.module';
import { SyncModule } from './sync/sync.module';
import { ReinitModule } from './reinit/reinit.module';
import { UiModule } from './ui/ui.module';
import { SetupModule } from './setup/setup.module';
import { UiSetupRedirectMiddleware } from './setup/ui-setup-redirect.middleware';
import { UiController } from './ui/ui.controller';

/**
 * Root Nest module. The class decorator is intentionally empty: **all** wiring lives in
 * {@link AppModule.forRoot}. Never pass this class to `NestFactory.create(AppModule)` or
 * `imports: [AppModule]` without `.forRoot()` — you would get an empty module graph.
 */
@Module({})
export class AppModule implements NestModule {
  /**
   * @param env Parsed application environment. Omit to call {@link parseAppEnv} (reads current
   * `process.env`). Tests should pass an explicit env snapshot when they mutate `process.env` or
   * need a frozen config — see `test/testing-app-module.ts`.
   */
  static forRoot(env?: AppEnv): DynamicModule {
    const resolved = env ?? parseAppEnv();

    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(resolved),
        LoggerModule.forRoot(createLoggerModuleParams(resolved)),
        EventEmitterModule.forRoot(),
        StatusEventsModule,
        PrismaModule,
        SettingsModule,
        GhModule,
        SyncModule,
        ReinitModule,
        MappingsModule,
        StatusModule,
        SetupModule,
        UiModule,
      ],
      controllers: [AppController],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UiSetupRedirectMiddleware).forRoutes(UiController);
  }
}
