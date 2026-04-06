import { POLL_RUN_ITEM_DECISION, POLL_RUN_PHASE } from './poll-run-decisions';

const DECISION_LABELS: Record<string, string> = {
  [POLL_RUN_ITEM_DECISION.created]: 'Created Kanban issue',
  [POLL_RUN_ITEM_DECISION.alreadyTracked]: 'Already tracked',
  [POLL_RUN_ITEM_DECISION.linkedExisting]: 'Linked existing issue',
  [POLL_RUN_ITEM_DECISION.skippedUnmapped]: 'Skipped (unmapped)',
  [POLL_RUN_ITEM_DECISION.skippedBot]: 'Skipped (bot author)',
  [POLL_RUN_ITEM_DECISION.skippedBoardLimit]: 'Skipped (board limit)',
  [POLL_RUN_ITEM_DECISION.skippedTriage]: 'Pending triage',
  [POLL_RUN_ITEM_DECISION.skippedDeclined]: 'Declined',
};

const PHASE_LABELS: Record<string, string> = {
  [POLL_RUN_PHASE.completed]: 'Completed',
  [POLL_RUN_PHASE.aborted]: 'Aborted',
  [POLL_RUN_PHASE.failed]: 'Failed',
  [POLL_RUN_PHASE.running]: 'Running',
};

export function pollDecisionLabel(decision: unknown): string {
  if (typeof decision !== 'string') {
    return '';
  }
  return DECISION_LABELS[decision] ?? decision;
}

export function pollPhaseLabel(phase: unknown): string {
  if (typeof phase !== 'string') {
    return '';
  }
  return PHASE_LABELS[phase] ?? phase;
}
