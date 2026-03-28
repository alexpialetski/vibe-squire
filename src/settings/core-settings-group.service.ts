import { Injectable } from '@nestjs/common';
import { coreStorageSchema, CORE_SETTING_ENV } from './core-settings.schema';
import { SettingsGroupBase } from './settings-group.base';
import type { SettingsGroupId } from './settings-group.tokens';

@Injectable()
export class CoreSettingsGroup extends SettingsGroupBase {
  readonly groupId: SettingsGroupId = 'core';
  readonly storageSchema = coreStorageSchema;
  readonly envKeys = CORE_SETTING_ENV;
}
