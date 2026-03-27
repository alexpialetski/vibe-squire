/** Scheduled sync never runs more often than this (minutes). Manual "Sync now" is unaffected. */
export const MIN_POLL_INTERVAL_MINUTES = 5;

/** Scheduler / orchestration keys shared by all integrations. */
export const CORE_SETTING_KEYS = [
  'scheduled_sync_enabled',
  'poll_interval_minutes',
  'jitter_max_seconds',
  'run_now_cooldown_seconds',
  'max_board_pr_count',
] as const;

export type CoreSettingKey = (typeof CORE_SETTING_KEYS)[number];

type Def = { envVar?: string; defaultValue: string };

export const CORE_SETTING_DEFINITIONS = {
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
} satisfies Record<CoreSettingKey, Def>;
