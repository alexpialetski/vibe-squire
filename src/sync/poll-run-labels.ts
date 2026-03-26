/**
 * English labels for poll run phases and per-PR decisions (activity UI, etc.).
 * Codes are defined in `poll-run-decisions.ts`.
 */
export function pollDecisionLabel(decision: unknown): string {
  if (typeof decision !== 'string') {
    return '';
  }
  switch (decision) {
    case 'created':
      return 'Created Kanban issue';
    case 'already_tracked':
      return 'Already tracked';
    case 'linked_existing':
      return 'Linked existing issue';
    case 'skipped_unmapped':
      return 'Skipped (unmapped)';
    case 'skipped_bot':
      return 'Skipped (bot author)';
    case 'skipped_board_limit':
      return 'Skipped (board limit)';
    default:
      return decision;
  }
}

export function pollPhaseLabel(phase: unknown): string {
  if (typeof phase !== 'string') {
    return '';
  }
  switch (phase) {
    case 'completed':
      return 'Completed';
    case 'aborted':
      return 'Aborted';
    case 'failed':
      return 'Failed';
    case 'running':
      return 'Running';
    default:
      return phase;
  }
}
