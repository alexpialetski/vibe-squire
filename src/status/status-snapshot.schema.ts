import { z } from 'zod';

const ghState = z.enum(['ok', 'not_installed', 'not_authenticated', 'error']);

const dbState = z.enum(['ok', 'error']);

const destState = z.enum(['ok', 'degraded', 'error', 'unknown']);

const scoutUiState = z.enum(['idle', 'running', 'skipped', 'error']);

const lastPollSchema = z.looseObject({
  candidates_count: z.number().nullable().optional(),
  skipped_unmapped: z.number().nullable().optional(),
  issues_created: z.number().nullable().optional(),
});

export const statusSnapshotSchema = z.object({
  timestamp: z.string(),
  gh: z.looseObject({
    state: ghState,
    message: z.string().optional(),
  }),
  database: z.looseObject({
    state: dbState,
    message: z.string().optional(),
  }),
  setup: z.looseObject({
    complete: z.boolean(),
    mappingCount: z.number(),
    reason: z.string().optional(),
  }),
  configuration: z.looseObject({
    source_type: z.string(),
    destination_type: z.string(),
    vk_mcp_configured: z.boolean(),
  }),
  destinations: z.array(
    z.looseObject({
      id: z.string(),
      state: destState,
    }),
  ),
  scouts: z.array(
    z.looseObject({
      id: z.string(),
      state: scoutUiState,
      last_poll: lastPollSchema,
    }),
  ),
  manual_sync: z.looseObject({
    canRun: z.boolean(),
    reason: z.string().optional(),
    cooldownUntil: z.string().optional(),
  }),
  scheduled_sync: z.looseObject({
    enabled: z.boolean(),
  }),
});

/**
 * §16.4 — Runtime validation for `GET /api/status` JSON (contract tests + optional guards).
 * Returns `null` if valid; otherwise a short error message.
 */
export function validateStatusSnapshot(body: unknown): string | null {
  const r = statusSnapshotSchema.safeParse(body);
  if (r.success) {
    return null;
  }
  return r.error.issues.map((i) => i.message).join('; ');
}
