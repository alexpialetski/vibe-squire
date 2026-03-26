/** Persisted on `PollRunItem.decision` and used in activity UI. */
export const POLL_RUN_ITEM_DECISION = {
  created: 'created',
  alreadyTracked: 'already_tracked',
  linkedExisting: 'linked_existing',
  skippedUnmapped: 'skipped_unmapped',
  skippedBot: 'skipped_bot',
  skippedBoardLimit: 'skipped_board_limit',
} as const;

export type PollRunItemDecision =
  (typeof POLL_RUN_ITEM_DECISION)[keyof typeof POLL_RUN_ITEM_DECISION];

export const POLL_RUN_PHASE = {
  running: 'running',
  completed: 'completed',
  aborted: 'aborted',
  failed: 'failed',
} as const;
