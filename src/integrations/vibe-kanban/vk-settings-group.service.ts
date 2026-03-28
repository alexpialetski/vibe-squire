import { Injectable } from '@nestjs/common';
import { SettingsGroupBase } from '../../settings/settings-group.base';
import type { SettingsGroupId } from '../../settings/settings-group.tokens';
import { vkStorageSchema, VK_SETTING_ENV } from './vk-settings.schema';

@Injectable()
export class VkSettingsGroup extends SettingsGroupBase {
  readonly groupId: SettingsGroupId = 'destination';
  readonly storageSchema = vkStorageSchema;
  readonly envKeys = VK_SETTING_ENV;
}
