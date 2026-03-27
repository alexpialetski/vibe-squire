import { Injectable } from '@nestjs/common';
import type { IntegrationSettingsProvider } from '../../ports/integration-settings.port';
import {
  GITHUB_INTEGRATION_SETTING_DEFINITIONS,
  GITHUB_INTEGRATION_SETTING_KEYS,
} from './github-setting-definitions';

@Injectable()
export class GithubIntegrationSettingsProvider implements IntegrationSettingsProvider {
  getSettingDefinitions(): Record<
    string,
    { defaultValue: string; envVar?: string }
  > {
    return { ...GITHUB_INTEGRATION_SETTING_DEFINITIONS };
  }

  getUiEditableKeys(): string[] {
    return [...GITHUB_INTEGRATION_SETTING_KEYS];
  }
}
