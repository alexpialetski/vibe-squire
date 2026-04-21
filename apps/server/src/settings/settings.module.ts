import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsService } from './settings.service';
import { CoreSettings } from './core-settings.service';
import { CoreSettingsGroup } from './core-settings-group.service';
import { SettingsCatalogService } from './settings-catalog.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    CoreSettingsGroup,
    SettingsCatalogService,
    SettingsService,
    CoreSettings,
  ],
  exports: [
    CoreSettingsGroup,
    SettingsCatalogService,
    SettingsService,
    CoreSettings,
  ],
})
export class SettingsModule {}
