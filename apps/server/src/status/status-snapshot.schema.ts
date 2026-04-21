import { z } from 'zod';

/** Shared literals for status contracts and GraphQL enums. */
export const ghStateValues = ['ok', 'error', 'unknown'] as const;
export const dbStateValues = ['ok', 'error'] as const;
export const destStateValues = ['ok', 'degraded', 'error', 'unknown'] as const;
export const scoutUiStateValues = [
  'idle',
  'running',
  'skipped',
  'error',
] as const;

const ghState = z.enum(ghStateValues);
const dbState = z.enum(dbStateValues);
const destState = z.enum(destStateValues);
const scoutUiState = z.enum(scoutUiStateValues);

const lastPollSchema = z.looseObject({
  candidates_count: z.number().nullable().optional(),
  skipped_unmapped: z.number().nullable().optional(),
  issues_created: z.number().nullable().optional(),
});

export const statusSnapshotSchema = z.object({
  timestamp: z.string(),
  pending_triage_count: z.number().int().nonnegative().nullish(),
  gh: z.looseObject({
    state: ghState,
    message: z.string().nullish(),
  }),
  database: z.looseObject({
    state: dbState,
    message: z.string().nullish(),
  }),
  setup: z.looseObject({
    complete: z.boolean(),
    mappingCount: z.number(),
    reason: z.string().nullish(),
  }),
  configuration: z.looseObject({
    source_type: z.string(),
    destination_type: z.string(),
    vibe_kanban_board_active: z.boolean(),
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
    reason: z.string().nullish(),
    cooldownUntil: z.string().nullish(),
  }),
  scheduled_sync: z.looseObject({
    enabled: z.boolean(),
  }),
});

export type StatusSnapshot = z.output<typeof statusSnapshotSchema>;

export function validateStatusSnapshot(body: unknown): string | null {
  const parsed = statusSnapshotSchema.safeParse(body);
  if (parsed.success) {
    return null;
  }
  return parsed.error.issues.map((issue) => issue.message).join('; ');
}
