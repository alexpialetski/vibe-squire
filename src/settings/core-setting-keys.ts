import type { SettingDefinition } from './setting-definition';

/** Scheduled sync never runs more often than this (minutes). Manual "Sync now" is unaffected. */
export const MIN_POLL_INTERVAL_MINUTES = 5;

/** Upper bound for `max_board_pr_count` (operator sanity). */
export const MAX_BOARD_PR_COUNT_CAP = 200;

/** Scheduler / orchestration keys shared by all integrations. */
export const CORE_SETTING_KEYS = [
  'scheduled_sync_enabled',
  'poll_interval_minutes',
  'jitter_max_seconds',
  'run_now_cooldown_seconds',
  'max_board_pr_count',
] as const;

export type CoreSettingKey = (typeof CORE_SETTING_KEYS)[number];

const BOOLEAN_SPELLINGS = new Set(['true', 'false', '1', '0', 'yes', 'no']);

export function validateScheduledSyncEnabled(value: string): string | null {
  return BOOLEAN_SPELLINGS.has(value.trim().toLowerCase())
    ? null
    : 'Use true, false, 1, 0, yes, or no';
}

export function validateMaxBoardPrCount(value: string): string | null {
  const t = value.trim();
  if (!/^\d+$/.test(t)) {
    return `Integer 1–${MAX_BOARD_PR_COUNT_CAP}`;
  }
  const n = parseInt(t, 10);
  return n >= 1 && n <= MAX_BOARD_PR_COUNT_CAP
    ? null
    : `Integer 1–${MAX_BOARD_PR_COUNT_CAP}`;
}

export const CORE_SETTING_DEFINITIONS = {
  scheduled_sync_enabled: {
    envVar: 'SCHEDULED_SYNC_ENABLED' as const,
    defaultValue: 'true',
    validate: validateScheduledSyncEnabled,
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
    validate: validateMaxBoardPrCount,
  },
} satisfies Record<CoreSettingKey, SettingDefinition>;
