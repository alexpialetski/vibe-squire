import { SCHEDULER_TEXT_FIELD_KEYS } from './integration-ui-registry';

export const SETTING_LABELS: Record<string, string> = {
  scheduled_sync_enabled:
    'Automatic polling — timer runs on the interval below. Manual Sync now always works. Override: VIBE_SQUIRE_SCHEDULED_SYNC_ENABLED',
  auto_create_issues:
    'Create Kanban issues automatically for matching PRs. When off, PRs appear in triage only until you promote them. Override: VIBE_SQUIRE_AUTO_CREATE_ISSUES',
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
  kanban_done_status: 'Kanban "done" status name',
  pr_ignore_author_logins:
    'Ignore authors (login, exact match): semicolon-separated; case-insensitive',
  github_host:
    'GitHub host for gh CLI (e.g. github.com or github.ol.epicgames.net). Override: VIBE_SQUIRE_GITHUB_HOST',
  pr_review_body_template: 'PR review body template',
};

/**
 * General `/ui/settings` poll form: text fields only (booleans use radio groups in the template).
 */
export function schedulerTextFieldsForUi(
  values: Record<string, string>,
): { key: string; label: string; value: string }[] {
  return SCHEDULER_TEXT_FIELD_KEYS.map((key) => ({
    key,
    label: SETTING_LABELS[key] ?? key,
    value: values[key] ?? '',
  }));
}

export function integrationFieldsForUi(
  keys: readonly string[],
  values: Record<string, string>,
): { key: string; label: string; value: string }[] {
  return keys.map((key) => ({
    key,
    label: SETTING_LABELS[key] ?? key,
    value: values[key] ?? '',
  }));
}
