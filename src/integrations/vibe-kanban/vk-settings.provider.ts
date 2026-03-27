import { Injectable } from '@nestjs/common';
import type { IntegrationSettingsProvider } from '../../ports/integration-settings.port';
import {
  VK_SETTING_DEFINITIONS,
  VK_SETTING_KEYS,
} from './vk-setting-definitions';

@Injectable()
export class VkIntegrationSettingsProvider implements IntegrationSettingsProvider {
  getSettingDefinitions(): Record<
    string,
    { defaultValue: string; envVar?: string }
  > {
    return { ...VK_SETTING_DEFINITIONS };
  }

  getUiEditableKeys(): string[] {
    return [...VK_SETTING_KEYS];
  }
}
