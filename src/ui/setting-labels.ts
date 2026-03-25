import { SETTING_KEYS, type SettingKey } from '../config/setting-keys';
import { SCHEDULER_UI_KEYS } from './integration-ui-registry';

export const SETTING_LABELS: Record<SettingKey, string> = {
  source_type: 'PR / SCM source (github only for now)',
  destination_type:
    'Work board / destination (vibe_kanban only for now; more later)',
  vk_mcp_stdio_json:
    'Vibe Kanban MCP stdio: JSON array [command, ...args] to spawn the MCP server',
  gh_host: 'GitHub host override (GH_HOST)',
  poll_interval_minutes:
    'Poll interval (minutes, min 5; manual Sync now ignores)',
  jitter_max_seconds: 'Jitter max (seconds)',
  run_now_cooldown_seconds: 'Run-now cooldown (seconds)',
  default_organization_id:
    'Target Kanban organization UUID (required for sync; pick below or paste)',
  default_project_id:
    'Target Kanban project UUID (required for sync; pick below or paste)',
  vk_workspace_executor:
    'Executor for start_workspace (e.g. cursor_agent, claude-code)',
  kanban_done_status: 'Kanban “done” status name',
  pr_review_body_template: 'PR review body template',
};

/**
 * General `/ui/settings`: poll schedule only. GitHub → `/ui/github`, Vibe Kanban → `/ui/vibe-kanban`.
 */
export function settingsFieldsForUi(
  values: Record<string, string>,
): { key: SettingKey; label: string; value: string }[] {
  return SCHEDULER_UI_KEYS.map((key) => ({
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
