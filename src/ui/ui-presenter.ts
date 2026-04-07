import type { SetupEvaluation } from '../setup/setup-evaluation.service';
import type { PollRunHistoryService } from '../sync/poll-run-history.service';
import type { UiNavEntry } from '../ports/ui-nav.types';
import { pollDecisionLabel, pollPhaseLabel } from '../sync/poll-run-labels';
import { POLL_RUN_ITEM_DECISION } from '../sync/poll-run-decisions';
import type { TriageLiveState } from '../sync/triage-live-state.queries';

export type { TriageLiveState } from '../sync/triage-live-state.queries';

export type PollRunRowForActivity = Awaited<
  ReturnType<PollRunHistoryService['listRecentForUi']>
>[number];

function formatActivityRunTime(d: Date): string {
  const t = d.getTime();
  if (Number.isNaN(t)) {
    return d.toISOString();
  }
  return d.toLocaleString();
}

const TRIAGE_DECISIONS = new Set<string>([
  POLL_RUN_ITEM_DECISION.skippedTriage,
  POLL_RUN_ITEM_DECISION.skippedBoardLimit,
]);

const EMPTY_LIVE_STATE: TriageLiveState = {
  acceptedPrUrls: new Set(),
  declinedPrUrls: new Set(),
};

/**
 * Resolve the effective decision for an item, cross-referencing live
 * SyncedPullRequest / DeclinedPullRequest state so the Activity UI
 * reflects triage actions that occurred after the poll run.
 */
function resolveEffectiveDecision(
  decision: string,
  prUrl: string,
  live: TriageLiveState,
): string {
  if (!TRIAGE_DECISIONS.has(decision)) return decision;
  if (live.acceptedPrUrls.has(prUrl))
    return POLL_RUN_ITEM_DECISION.linkedExisting;
  if (live.declinedPrUrls.has(prUrl))
    return POLL_RUN_ITEM_DECISION.skippedDeclined;
  return decision;
}

export type ActivityItem = {
  prUrl: string;
  githubRepo: string;
  prNumber: number;
  prTitle: string;
  authorLogin: string | null;
  decision: string;
  effectiveDecision: string;
  decisionLabel: string;
  detail: string | null;
  kanbanIssueId: string | null;
};

export function presentActivityRunsForView(
  rows: PollRunRowForActivity[],
  live: TriageLiveState = EMPTY_LIVE_STATE,
): Array<{
  id: string;
  startedAt: string;
  startedAtLabel: string;
  finishedAt: string | null;
  trigger: string;
  phase: string;
  phaseLabel: string;
  abortReason: string | null;
  errorMessage: string | null;
  candidatesCount: number | null;
  issuesCreated: number | null;
  skippedUnmapped: number | null;
  skippedBot: number | null;
  skippedBoardLimit: number | null;
  skippedAlreadyTracked: number | null;
  skippedLinkedExisting: number | null;
  skippedTriage: number | null;
  skippedDeclined: number | null;
  itemCount: number;
  items: ActivityItem[];
}> {
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.startedAt.toISOString(),
    startedAtLabel: formatActivityRunTime(r.startedAt),
    finishedAt: r.finishedAt?.toISOString() ?? null,
    trigger: r.trigger,
    phase: r.phase,
    phaseLabel: pollPhaseLabel(r.phase),
    abortReason: r.abortReason,
    errorMessage: r.errorMessage,
    candidatesCount: r.candidatesCount,
    issuesCreated: r.issuesCreated,
    skippedUnmapped: r.skippedUnmapped,
    skippedBot: r.skippedBot,
    skippedBoardLimit: r.skippedBoardLimit,
    skippedAlreadyTracked: r.skippedAlreadyTracked,
    skippedLinkedExisting: r.skippedLinkedExisting,
    skippedTriage: r.skippedTriage,
    skippedDeclined: r.skippedDeclined,
    itemCount: r.items.length,
    items: r.items.map((i) => {
      const eff = resolveEffectiveDecision(i.decision, i.prUrl, live);
      return {
        prUrl: i.prUrl,
        githubRepo: i.githubRepo,
        prNumber: i.prNumber,
        prTitle: i.prTitle,
        authorLogin: i.authorLogin,
        decision: i.decision,
        effectiveDecision: eff,
        decisionLabel: pollDecisionLabel(eff),
        detail: i.detail,
        kanbanIssueId: i.kanbanIssueId,
      };
    }),
  }));
}

export function escapeForPre(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function destinationTypeLabel(t: string): string {
  if (t === 'vibe_kanban') {
    return 'Vibe Kanban';
  }
  return t.length > 0 ? t : '(not set)';
}

export function sourceTypeLabel(t: string): string {
  if (t === 'github') {
    return 'GitHub';
  }
  return t.length > 0 ? t : '(not set)';
}

export type SetupChecklistRow = {
  text: string;
  linkHref?: string;
  linkLabel?: string;
};

export function buildSetupChecklist(ev: SetupEvaluation): SetupChecklistRow[] {
  if (ev.complete) {
    return [];
  }
  const rows: SetupChecklistRow[] = [];
  if (ev.destinationType.trim() === 'vibe_kanban') {
    if (ev.reason === 'no_default_kanban_board') {
      rows.push({
        text: 'Set target Kanban organization and project on Vibe Kanban (required for sync).',
        linkHref: '/ui/vibe-kanban',
        linkLabel: 'Vibe Kanban',
      });
    }
    if (ev.reason === 'no_mappings') {
      rows.push({
        text: 'Add at least one GitHub repo → Vibe Kanban repository mapping on Mappings.',
        linkHref: '/ui/mappings',
        linkLabel: 'Mappings',
      });
    }
  }
  return rows;
}

/** Reason code → human-readable setup guidance (single source for server + client). */
export const SETUP_REASON_MESSAGES: Record<string, string> = {
  no_default_kanban_board:
    'Open Vibe Kanban and set target organization + project (required for sync).',
  no_mappings:
    'Add at least one GitHub repo → Vibe Kanban repository mapping on Mappings.',
};

export function setupReasonHuman(reason: string | undefined): string {
  if (!reason) return 'Incomplete setup.';
  return SETUP_REASON_MESSAGES[reason] ?? String(reason);
}

/**
 * Sidebar integration links come from {@link UiNavService} (aggregated per integration module).
 */
export function uiNavLocals(integrationNavEntries: UiNavEntry[]): {
  navMinimal: boolean;
  integrationNavEntries: UiNavEntry[];
} {
  return {
    navMinimal: false,
    integrationNavEntries,
  };
}

export function githubNotSourceRedirectUrl(): string {
  return `/ui/settings?err=${encodeURIComponent(
    'The GitHub page applies when the source type is github (default). Change VIBE_SQUIRE_SOURCE_TYPE in the process environment and restart.',
  )}`;
}

export function vibeKanbanNotDestinationRedirectUrl(): string {
  return `/ui/settings?err=${encodeURIComponent(
    'The Vibe Kanban page applies when the destination type is vibe_kanban (default). Change VIBE_SQUIRE_DESTINATION_TYPE in the process environment and restart.',
  )}`;
}
