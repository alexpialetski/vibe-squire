import {
  CORE_SETTING_DEFINITIONS,
  CORE_SETTING_KEYS,
} from '../config/core-setting-keys';
import {
  GITHUB_INTEGRATION_SETTING_DEFINITIONS,
  GITHUB_INTEGRATION_SETTING_KEYS,
} from '../integrations/github/github-setting-definitions';
import {
  VK_SETTING_DEFINITIONS,
  VK_SETTING_KEYS,
} from '../integrations/vibe-kanban/vk-setting-definitions';

export { MIN_POLL_INTERVAL_MINUTES } from '../config/core-setting-keys';
export {
  VIBE_KANBAN_UI_KEYS,
  type VibeKanbanUiSettingKey,
} from '../integrations/vibe-kanban/vk-setting-definitions';

/** All keys stored in `Setting` and resolved via {@link SettingsService.getEffective}. */
export const SETTING_KEYS = [
  ...VK_SETTING_KEYS,
  ...CORE_SETTING_KEYS,
  ...GITHUB_INTEGRATION_SETTING_KEYS,
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** Omit `envVar` when the key has no process-env override (DB + code default only). */
type Def = { envVar?: string; defaultValue: string };

export const SETTING_DEFINITIONS = {
  ...VK_SETTING_DEFINITIONS,
  ...CORE_SETTING_DEFINITIONS,
  ...GITHUB_INTEGRATION_SETTING_DEFINITIONS,
} satisfies Record<SettingKey, Def>;

/** Process env names that can override a setting (see {@link SETTING_DEFINITIONS}). */
export type SettingEnvVarName = {
  [K in SettingKey]: (typeof SETTING_DEFINITIONS)[K] extends {
    envVar: infer V;
  }
    ? V extends string
      ? V
      : never
    : never;
}[SettingKey];

export function isSettingKey(key: string): key is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(key);
}
