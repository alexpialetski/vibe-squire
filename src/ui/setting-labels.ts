import { SETTING_KEYS, type SettingKey } from '../config/setting-keys';
import { SCHEDULER_TEXT_FIELD_KEYS } from './integration-ui-registry';

export const SETTING_LABELS: Record<SettingKey, string> = {
  vk_mcp_stdio_json:
    'Vibe Kanban MCP stdio: JSON array [command, ...args] to spawn the MCP server',
  scheduled_sync_enabled:
    'Automatic polling — timer runs on the interval below. Manual Sync now always works. Override: SCHEDULED_SYNC_ENABLED',
  poll_interval_minutes:
    'Poll interval (minutes, min 5; manual Sync now ignores)',
  jitter_max_seconds: 'Jitter max (seconds)',
  run_now_cooldown_seconds: 'Run-now cooldown (seconds)',
  max_board_pr_count:
    'Max PRs on board at once (synced review queue); oldest by GitHub createdAt first; extra PRs skipped',
  default_organization_id:
    'Target Kanban organization UUID (required for sync; pick below or paste)',
  default_project_id:
    'Target Kanban project UUID (required for sync; pick below or paste)',
  vk_workspace_executor:
    'Executor for start_workspace (e.g. cursor_agent, claude-code)',
  kanban_done_status: 'Kanban “done” status name',
  pr_ignore_author_logins:
    'Ignore authors (login, exact match): semicolon-separated; case-insensitive',
  pr_review_body_template: 'PR review body template',
};

/**
 * General `/ui/settings` poll form: text fields only (`scheduled_sync_enabled` is a radio group in the template).
 */
export function schedulerTextFieldsForUi(
  values: Record<string, string>,
): { key: SettingKey; label: string; value: string }[] {
  return SCHEDULER_TEXT_FIELD_KEYS.map((key) => ({
    key,
    label: SETTING_LABELS[key],
    value: values[key] ?? '',
  }));
}

export function integrationFieldsForUi(
  keys: readonly SettingKey[],
  values: Record<string, string>,
): { key: SettingKey; label: string; value: string }[] {
  return keys.map((key) => ({
    key,
    label: SETTING_LABELS[key],
    value: values[key] ?? '',
  }));
}

/** Full list for tools that need every key (tests, debugging). */
export function settingsForView(
  values: Record<string, string>,
): { key: SettingKey; label: string; value: string }[] {
  return SETTING_KEYS.map((key) => ({
    key,
    label: SETTING_LABELS[key],
    value: values[key] ?? '',
  }));
}
