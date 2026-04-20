import { DynamicModule, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { EnvModule } from './config/env.module';
import type { AppEnv } from './config/app-env.token';
import { createLoggerModuleParams } from './logging/create-logger-params';
import { IntegrationsModule } from './integrations/integrations.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { MappingsModule } from './mappings/mappings.module';
import { StatusModule } from './status/status.module';
import { StatusEventsModule } from './events/status-events.module';
import { SyncModule } from './sync/sync.module';
import { SyncRunStateModule } from './sync/sync-run-state.module';
import { ReinitModule } from './reinit/reinit.module';
import { UiModule } from './ui/ui.module';
import { SetupModule } from './setup/setup.module';
import { GraphqlModule } from './graphql/graphql.module';

/**
 * Root Nest module. The class decorator is intentionally empty: **all** wiring lives in
 * {@link AppModule.forRoot}. Never pass this class to `NestFactory.create(AppModule)` or
 * `imports: [AppModule]` without `.forRoot()` — you would get an empty module graph.
 */
@Module({})
export class AppModule {
  /**
   * @param env Parsed application environment from {@link parseAppEnv} (e.g. in `main.ts`).
   * Tests should pass an explicit env snapshot when they mutate `process.env` or need a frozen
   * config — see `test/testing-app-module.ts`.
   */
  static forRoot(env: AppEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(env),
        LoggerModule.forRoot(createLoggerModuleParams(env)),
        EventEmitterModule.forRoot(),
        StatusEventsModule,
        PrismaModule,
        SyncRunStateModule,
        SettingsModule,
        IntegrationsModule.register(env),
        SyncModule,
        ReinitModule,
        MappingsModule,
        StatusModule,
        SetupModule,
        UiModule,
        GraphqlModule,
      ],
      controllers: [],
    };
  }
}
