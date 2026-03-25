import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
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

@Module({
  imports: [
    LoggerModule.forRoot({
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
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UiSetupRedirectMiddleware).forRoutes(UiController);
  }
}
