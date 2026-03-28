import type { GithubPrCandidate } from '../../ports/github-pr-candidate';
import { isIgnoredAuthorLogin } from '../pr-ignore-author-logins';
import { POLL_RUN_ITEM_DECISION } from '../poll-run-decisions';
import type { VkCreateQuota } from './poll-scout-context';
import type { EnsureIssueOutcome } from './ensure-issue-outcome';

export type PollRunAppendItemFn = (
  runId: string,
  pr: GithubPrCandidate,
  decision: string,
  opts?: { detail?: string; kanbanIssueId?: string },
) => Promise<void>;

export type PollCandidatesLoopSummary = {
  created: number;
  skippedUnmapped: number;
  skippedBot: number;
  skippedBoardLimit: number;
  skippedAlreadyTracked: number;
  skippedLinkedExisting: number;
};

/**
 * For each scout candidate: skip bots, then `ensureIssueForPr` and append poll-run items.
 * Mutates `quotaForCreates` when a new issue is created.
 */
export async function processPollCandidatesLoop(deps: {
  runId: string;
  candidates: GithubPrCandidate[];
  ignoredAuthorLogins: Set<string>;
  quotaForCreates: VkCreateQuota;
  boardLimit: number;
  activeVkIssueCount: number;
  appendItem: PollRunAppendItemFn;
  ensureIssueForPr: (
    pr: GithubPrCandidate,
    quota: VkCreateQuota,
  ) => Promise<EnsureIssueOutcome>;
}): Promise<PollCandidatesLoopSummary> {
  let created = 0;
  let skippedUnmapped = 0;
  let skippedBot = 0;
  let skippedBoardLimit = 0;
  let skippedAlreadyTracked = 0;
  let skippedLinkedExisting = 0;

  const { runId, boardLimit, activeVkIssueCount } = deps;

  for (const pr of deps.candidates) {
    if (isIgnoredAuthorLogin(pr.authorLogin, deps.ignoredAuthorLogins)) {
      skippedBot += 1;
      await deps.appendItem(runId, pr, POLL_RUN_ITEM_DECISION.skippedBot, {
        detail: `Author ${pr.authorLogin}`,
      });
      continue;
    }

    const outcome = await deps.ensureIssueForPr(pr, deps.quotaForCreates);
    if (outcome.kind === 'skipped_board_limit') {
      skippedBoardLimit += 1;
      await deps.appendItem(
        runId,
        pr,
        POLL_RUN_ITEM_DECISION.skippedBoardLimit,
        {
          detail: `Board limit ${boardLimit} (${activeVkIssueCount} active [vibe-squire] issue(s) on Kanban; oldest PRs first)`,
        },
      );
      continue;
    }
    if (outcome.kind === 'created') {
      created += 1;
      await deps.appendItem(runId, pr, POLL_RUN_ITEM_DECISION.created, {
        kanbanIssueId: outcome.kanbanIssueId,
      });
    } else if (outcome.kind === 'skipped_unmapped') {
      skippedUnmapped += 1;
      await deps.appendItem(runId, pr, POLL_RUN_ITEM_DECISION.skippedUnmapped, {
        detail:
          'No repo mapping or Kanban org/project not set for this GitHub repo',
      });
    } else if (outcome.kind === 'already_tracked') {
      skippedAlreadyTracked += 1;
      await deps.appendItem(runId, pr, POLL_RUN_ITEM_DECISION.alreadyTracked, {
        kanbanIssueId: outcome.kanbanIssueId,
        detail: 'Already synced; Kanban issue unchanged',
      });
    } else {
      skippedLinkedExisting += 1;
      await deps.appendItem(runId, pr, POLL_RUN_ITEM_DECISION.linkedExisting, {
        kanbanIssueId: outcome.kanbanIssueId,
        detail: 'Matched existing Kanban issue; linked for tracking',
      });
    }
  }

  return {
    created,
    skippedUnmapped,
    skippedBot,
    skippedBoardLimit,
    skippedAlreadyTracked,
    skippedLinkedExisting,
  };
}
