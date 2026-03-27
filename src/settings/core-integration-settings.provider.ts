import { Injectable } from '@nestjs/common';
import type { IntegrationSettingsProvider } from '../ports/integration-settings.port';
import {
  CORE_SETTING_DEFINITIONS,
  CORE_SETTING_KEYS,
} from './core-setting-keys';

@Injectable()
export class CoreIntegrationSettingsProvider implements IntegrationSettingsProvider {
  getSettingDefinitions(): Record<
    string,
    { defaultValue: string; envVar?: string }
  > {
    return { ...CORE_SETTING_DEFINITIONS };
  }

  getUiEditableKeys(): string[] {
    return [...CORE_SETTING_KEYS];
  }
}
