import type { SettingKey } from '../config/setting-keys';
import { VIBE_KANBAN_UI_KEYS } from '../config/setting-keys';

/** Poll / scheduler fields on `/ui/settings` (general). */
export const SCHEDULER_UI_KEYS: readonly SettingKey[] = [
  'poll_interval_minutes',
  'jitter_max_seconds',
  'run_now_cooldown_seconds',
];

/** GitHub PR source fields on `/ui/github` (when `source_type === github`). */
export const GITHUB_SOURCE_UI_KEYS: readonly SettingKey[] = [
  'pr_ignore_author_logins',
  'pr_review_body_template',
];

export { VIBE_KANBAN_UI_KEYS };

/** Keys accepted by `POST /ui/settings` (must match what the form can send). */
export function generalSettingsPostKeys(): readonly SettingKey[] {
  return SCHEDULER_UI_KEYS;
}
