import type { SyncPrScoutPort } from '../../ports/sync-pr-scout.port';
import type { SyncDestinationBoardPort } from '../../ports/sync-destination-board.port';
import type { SettingsService } from '../../settings/settings.service';
import type { GithubPrCandidate } from '../../scout/github-pr-scout.service';
import { parsePrIgnoreAuthorLogins } from '../pr-ignore-author-logins';
import { resolveMaxBoardPrCount } from '../../config/max-board-pr-count';
import { redactHttpUrls } from '../../logging/redact-urls';

/** Mutable create quota for one poll; only `createIssue` decrements. */
export type VkCreateQuota = { remaining: number };

/**
 * Inputs for the main poll loop after prerequisites pass: PR list, board cap, author ignore set.
 */
export type PollScoutContext = {
  candidates: GithubPrCandidate[];
  urlsNow: Set<string>;
  boardLimit: number;
  activeVkIssueCount: number;
  quotaForCreates: VkCreateQuota;
  ignoredAuthorLogins: Set<string>;
};

/**
 * Lists scout candidates, resolves max-board cap vs active VK issues, parses `pr_ignore_author_logins`.
 */
export async function buildPollScoutContext(deps: {
  prScout: SyncPrScoutPort;
  settings: Pick<SettingsService, 'getEffective'>;
  destinationBoard: Pick<
    SyncDestinationBoardPort,
    'countActiveVibeSquireIssues'
  >;
  warn: (msg: string) => void;
}): Promise<PollScoutContext> {
  const candidates = deps.prScout.listReviewRequestedForMe();
  const urlsNow = new Set(candidates.map((c) => c.url));
  const boardLimit = resolveMaxBoardPrCount(
    deps.settings.getEffective('max_board_pr_count'),
  );

  const projectIdForCap = deps.settings
    .getEffective('default_project_id')
    .trim();
  let activeVkIssueCount = 0;
  if (projectIdForCap.length > 0) {
    try {
      activeVkIssueCount =
        await deps.destinationBoard.countActiveVibeSquireIssues(
          projectIdForCap,
        );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      deps.warn(
        `countActiveVibeSquireIssues failed: ${redactHttpUrls(msg)}; treating as 0`,
      );
    }
  }

  const quotaForCreates: VkCreateQuota = {
    remaining: Math.max(0, boardLimit - activeVkIssueCount),
  };

  const ignoreParsed = parsePrIgnoreAuthorLogins(
    deps.settings.getEffective('pr_ignore_author_logins'),
  );
  let ignoredAuthorLogins: Set<string>;
  if (ignoreParsed.ok) {
    ignoredAuthorLogins = ignoreParsed.set;
  } else {
    deps.warn(
      `Invalid pr_ignore_author_logins (${ignoreParsed.message}); treating as empty`,
    );
    ignoredAuthorLogins = new Set();
  }

  return {
    candidates,
    urlsNow,
    boardLimit,
    activeVkIssueCount,
    quotaForCreates,
    ignoredAuthorLogins,
  };
}
