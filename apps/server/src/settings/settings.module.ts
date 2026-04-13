import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { CoreSettings } from './core-settings.service';
import { CoreSettingsGroup } from './core-settings-group.service';
import { SettingsCatalogService } from './settings-catalog.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
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
