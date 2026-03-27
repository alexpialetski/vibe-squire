import type { SettingKey } from '../settings/setting-keys';

/** Emitted after integration-affecting settings are persisted and cache is refreshed. */
export const INTEGRATION_SETTINGS_CHANGED =
  'integration-settings.changed' as const;

export type IntegrationSettingsChangedPayload = {
  /** Keys touched in the last write batch (may be empty = “re-read everything”). */
  keys: SettingKey[];
};
