import type { SetupEvaluation } from '../setup/setup-evaluation.service';
import type { PollRunHistoryService } from '../sync/poll-run-history.service';
import { pollDecisionLabel, pollPhaseLabel } from '../sync/poll-run-labels';

export type PollRunRowForActivity = Awaited<
  ReturnType<PollRunHistoryService['listRecentForUi']>
>[number];

export function presentActivityRunsForView(
  rows: PollRunRowForActivity[],
): Array<{
  id: string;
  startedAt: string;
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
  itemCount: number;
  items: Array<{
    prUrl: string;
    githubRepo: string;
    prNumber: number;
    prTitle: string;
    authorLogin: string | null;
    decision: string;
    decisionLabel: string;
    detail: string | null;
    kanbanIssueId: string | null;
  }>;
}> {
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.startedAt.toISOString(),
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
    itemCount: r.items.length,
    items: r.items.map((i) => ({
      prUrl: i.prUrl,
      githubRepo: i.githubRepo,
      prNumber: i.prNumber,
      prTitle: i.prTitle,
      authorLogin: i.authorLogin,
      decision: i.decision,
      decisionLabel: pollDecisionLabel(i.decision),
      detail: i.detail,
      kanbanIssueId: i.kanbanIssueId,
    })),
  }));
}

export function escapeForPre(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Setup form `source_type` radio: `none` or missing → cleared. */
export function parseSetupSourceType(raw: unknown): '' | 'github' | null {
  if (raw === undefined || raw === null) {
    return '';
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim();
  if (t === '' || t === 'none') {
    return '';
  }
  if (t === 'github') {
    return 'github';
  }
  return null;
}

/** Setup form `destination_type` radio: `none` or missing → cleared. */
export function parseSetupDestinationType(
  raw: unknown,
): '' | 'vibe_kanban' | null {
  if (raw === undefined || raw === null) {
    return '';
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim();
  if (t === '' || t === 'none') {
    return '';
  }
  if (t === 'vibe_kanban') {
    return 'vibe_kanban';
  }
  return null;
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

export function showNavVkToolsFrom(ev: SetupEvaluation): boolean {
  return (
    ev.integrationsConfigured && ev.destinationType.trim() === 'vibe_kanban'
  );
}

export type SetupChecklistRow = {
  text: string;
  linkHref?: string;
  linkLabel?: string;
};

export function buildSetupChecklist(ev: SetupEvaluation): SetupChecklistRow[] {
  if (ev.complete || !ev.integrationsConfigured) {
    return [];
  }
  const rows: SetupChecklistRow[] = [];
  if (ev.destinationType.trim() === 'vibe_kanban') {
    if (!ev.vkMcpReady) {
      rows.push({
        text: 'Configure Vibe Kanban MCP stdio (VK_MCP_STDIO_JSON env or PATCH vk_mcp_stdio_json via /api/settings).',
      });
    }
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

export function uiNavLocals(ev: SetupEvaluation): {
  navMinimal: boolean;
  showNavVkTools: boolean;
  showNavGithubSettings: boolean;
} {
  return {
    navMinimal: !ev.integrationsConfigured,
    showNavVkTools: showNavVkToolsFrom(ev),
    showNavGithubSettings:
      ev.integrationsConfigured && ev.sourceType.trim() === 'github',
  };
}

export function githubNotSourceRedirectUrl(): string {
  return `/ui/settings?err=${encodeURIComponent(
    'The GitHub page applies only when GitHub is selected as the PR source (Settings → General).',
  )}#integration`;
}

export function vibeKanbanNotDestinationRedirectUrl(): string {
  return `/ui/settings?err=${encodeURIComponent(
    'The Vibe Kanban page applies only when Vibe Kanban is selected as the work board (Settings → General).',
  )}#integration`;
}
