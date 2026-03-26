/** Scheduled sync never runs more often than this (minutes). Manual "Sync now" is unaffected. */
export const MIN_POLL_INTERVAL_MINUTES = 5;

/** Logical keys stored in `Setting` and resolved via `SettingsService.getEffective`. */
export const SETTING_KEYS = [
  'source_type',
  'destination_type',
  'vk_mcp_stdio_json',
  'scheduled_sync_enabled',
  'poll_interval_minutes',
  'jitter_max_seconds',
  'run_now_cooldown_seconds',
  'max_board_pr_count',
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

export const SETTING_DEFINITIONS = {
  source_type: {
    envVar: 'SOURCE_TYPE' as const,
    defaultValue: 'github',
  },
  destination_type: {
    envVar: 'DESTINATION_TYPE' as const,
    defaultValue: 'vibe_kanban',
  },
  vk_mcp_stdio_json: {
    envVar: 'VK_MCP_STDIO_JSON' as const,
    defaultValue: '["npx","-y","vibe-kanban@latest","--mcp"]',
  },
  scheduled_sync_enabled: {
    envVar: 'SCHEDULED_SYNC_ENABLED' as const,
    defaultValue: 'true',
  },
  poll_interval_minutes: {
    envVar: 'POLL_INTERVAL_MINUTES' as const,
    defaultValue: '5',
  },
  jitter_max_seconds: {
    envVar: 'JITTER_MAX_SECONDS' as const,
    defaultValue: '30',
  },
  run_now_cooldown_seconds: {
    envVar: 'RUN_NOW_COOLDOWN_SECONDS' as const,
    defaultValue: '90',
  },
  max_board_pr_count: {
    defaultValue: '5',
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
