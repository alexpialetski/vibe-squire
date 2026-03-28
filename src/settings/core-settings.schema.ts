import { z } from 'zod';

/** Scheduled sync never runs more often than this (minutes). Manual "Sync now" is unaffected. */
export const MIN_POLL_INTERVAL_MINUTES = 5;

/** Upper bound for `max_board_pr_count` (operator sanity). */
export const MAX_BOARD_PR_COUNT_CAP = 200;

function digitStringField(
  min: number,
  max: number,
  fieldLabel: string,
  defaultStr: string,
) {
  return z
    .string()
    .default(defaultStr)
    .superRefine((val, ctx) => {
      const t = val.trim();
      if (!/^\d+$/.test(t)) {
        ctx.addIssue({
          code: 'custom',
          message: `${fieldLabel}: integer ${min}–${max}`,
        });
        return;
      }
      const n = parseInt(t, 10);
      if (n < min || n > max) {
        ctx.addIssue({
          code: 'custom',
          message: `${fieldLabel}: integer ${min}–${max}`,
        });
      }
    })
    .transform((s) => String(parseInt(s.trim(), 10)));
}

/** Canonical `'true' | 'false'` strings for DB / effective layer. */
const scheduledSyncStorageField = z
  .string()
  .default('true')
  .superRefine((val, ctx) => {
    const r = z.stringbool().safeParse(val.trim());
    if (!r.success) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use true, false, 1, 0, yes, or no',
      });
    }
  })
  .transform((val) => (z.stringbool().parse(val.trim()) ? 'true' : 'false'));

/**
 * Core settings as stored (string values only). Single source for validation + defaults.
 */
export const coreStorageSchema = z
  .object({
    scheduled_sync_enabled: scheduledSyncStorageField,
    poll_interval_minutes: digitStringField(
      MIN_POLL_INTERVAL_MINUTES,
      99_999,
      'poll_interval_minutes',
      '5',
    ),
    jitter_max_seconds: digitStringField(
      0,
      99_999_999,
      'jitter_max_seconds',
      '30',
    ),
    run_now_cooldown_seconds: digitStringField(
      0,
      99_999_999,
      'run_now_cooldown_seconds',
      '90',
    ),
    max_board_pr_count: digitStringField(
      1,
      MAX_BOARD_PR_COUNT_CAP,
      'max_board_pr_count',
      '5',
    ),
  })
  .strict();

export type CoreStorageValues = z.output<typeof coreStorageSchema>;

export const corePatchSchema = coreStorageSchema.partial().strict();

/** Defaults for `getEffective` (env → DB → default), derived from storage schema. */
export const CORE_STORAGE_DEFAULTS: CoreStorageValues = coreStorageSchema.parse(
  {},
);

/** Option A: env var names per key (merged only in SettingsService.getEffective). */
export const CORE_SETTING_ENV = {
  scheduled_sync_enabled: 'SCHEDULED_SYNC_ENABLED',
  poll_interval_minutes: 'POLL_INTERVAL_MINUTES',
  jitter_max_seconds: 'JITTER_MAX_SECONDS',
  run_now_cooldown_seconds: 'RUN_NOW_COOLDOWN_SECONDS',
} as const satisfies Partial<Record<keyof CoreStorageValues, string>>;

export const CORE_STORAGE_KEYS = Object.keys(
  coreStorageSchema.shape,
) as (keyof CoreStorageValues)[];

export type CoreStorageKey = keyof CoreStorageValues;

/** Typed core values for app code (numbers + boolean). */
export const coreRuntimeSchema = z.object({
  scheduled_sync_enabled: z.stringbool(),
  poll_interval_minutes: z.coerce.number().int().min(MIN_POLL_INTERVAL_MINUTES),
  jitter_max_seconds: z.coerce.number().int().min(0),
  run_now_cooldown_seconds: z.coerce.number().int().min(0),
  max_board_pr_count: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_BOARD_PR_COUNT_CAP),
});

export type CoreSettingsValues = z.output<typeof coreRuntimeSchema>;
