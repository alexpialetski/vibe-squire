import { Injectable } from '@nestjs/common';
import type { IntegrationSettingsProvider } from '../ports/integration-settings.port';
import { CORE_SETTING_DEFINITIONS } from './core-setting-keys';

@Injectable()
export class CoreIntegrationSettingsProvider implements IntegrationSettingsProvider {
  getSettingDefinitions(): Record<
    string,
    { defaultValue: string; envVar?: string }
  > {
    return { ...CORE_SETTING_DEFINITIONS };
  }

  getUiEditableKeys(): string[] {
    return [
      'scheduled_sync_enabled',
      'poll_interval_minutes',
      'jitter_max_seconds',
      'run_now_cooldown_seconds',
      'max_board_pr_count',
    ];
  }
}
