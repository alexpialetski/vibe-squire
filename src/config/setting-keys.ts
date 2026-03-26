/** Scheduled sync never runs more often than this (minutes). Manual "Sync now" is unaffected. */
export const MIN_POLL_INTERVAL_MINUTES = 5;

/** Logical keys stored in `Setting` and resolved via `SettingsService.getEffective`. */
export const SETTING_KEYS = [
  'source_type',
  'destination_type',
  'vk_mcp_stdio_json',
  'poll_interval_minutes',
  'jitter_max_seconds',
  'run_now_cooldown_seconds',
  'default_organization_id',
  'default_project_id',
  'vk_workspace_executor',
  'kanban_done_status',
  'pr_ignore_author_logins',
  'pr_review_body_template',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** Keys edited together on `/ui/vibe-kanban` (not the general Settings form). */
export const VIBE_KANBAN_UI_KEYS = [
  'default_organization_id',
  'default_project_id',
  'vk_workspace_executor',
  'kanban_done_status',
] as const satisfies readonly SettingKey[];

export type VibeKanbanUiSettingKey = (typeof VIBE_KANBAN_UI_KEYS)[number];

/** Omit `envVar` when the key has no process-env override (DB + code default only). */
type Def = { envVar?: string; defaultValue: string };

export const SETTING_DEFINITIONS: Record<SettingKey, Def> = {
  source_type: {
    envVar: 'SOURCE_TYPE',
    defaultValue: 'github',
  },
  destination_type: {
    envVar: 'DESTINATION_TYPE',
    defaultValue: 'vibe_kanban',
  },
  vk_mcp_stdio_json: {
    envVar: 'VK_MCP_STDIO_JSON',
    defaultValue: '["npx","-y","vibe-kanban@latest","--mcp"]',
  },
  poll_interval_minutes: {
    envVar: 'POLL_INTERVAL_MINUTES',
    defaultValue: '5',
  },
  jitter_max_seconds: { envVar: 'JITTER_MAX_SECONDS', defaultValue: '30' },
  run_now_cooldown_seconds: {
    envVar: 'RUN_NOW_COOLDOWN_SECONDS',
    defaultValue: '90',
  },
  default_organization_id: {
    defaultValue: '',
  },
  default_project_id: { defaultValue: '' },
  vk_workspace_executor: {
    defaultValue: 'cursor_agent',
  },
  kanban_done_status: {
    defaultValue: 'Done',
  },
  pr_ignore_author_logins: {
    defaultValue:
      'renovate[bot];renovatebot[bot];dependabot[bot];dependabot-preview[bot]',
  },
  pr_review_body_template: {
    defaultValue:
      'Examine the diff for PR {prUrl}. Highlight architectural risks and logic bugs. Provide a summary report in the workspace.',
  },
};

export function isSettingKey(key: string): key is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(key);
}
