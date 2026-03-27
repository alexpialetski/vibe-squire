import { DynamicModule, Module, type Provider } from '@nestjs/common';
import type { AppEnv } from '../config/app-env.token';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CoreIntegrationSettingsProvider } from '../config/core-integration-settings.provider';
import { INTEGRATION_SETTINGS_PROVIDERS } from '../ports/injection-tokens';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

/**
 * Call {@link SettingsModule.forRoot} from the root module's static `forRoot` only (`app.module.ts`).
 * Imports {@link IntegrationsModule.register} so {@link SettingsService} receives every
 * `INTEGRATION_SETTINGS_PROVIDERS` binding before `onModuleInit`.
 */
@Module({})
export class SettingsModule {
  static forRoot(env: AppEnv): DynamicModule {
    return {
      module: SettingsModule,
      global: true,
      imports: [PrismaModule, IntegrationsModule.register(env)],
      controllers: [SettingsController],
      providers: [
        CoreIntegrationSettingsProvider,
        {
          provide: INTEGRATION_SETTINGS_PROVIDERS,
          useExisting: CoreIntegrationSettingsProvider,
          multi: true,
        } as Provider,
        SettingsService,
      ],
      exports: [SettingsService],
    };
  }
}
