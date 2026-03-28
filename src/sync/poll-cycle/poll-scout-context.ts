import type { SyncPrScoutPort } from '../../ports/sync-pr-scout.port';
import type { DestinationBoardPort } from '../../ports/destination-board.port';
import type { SettingsService } from '../../settings/settings.service';
/** Subset of {@link SettingsService} used by poll-scout-context. */
type EffectiveReader = Pick<SettingsService, 'getEffective'>;
import type { CoreSettings } from '../../settings/core-settings.service';
import type { GithubPrCandidate } from '../../scout/github-pr-scout.service';
import { prIgnoreAuthorLoginsSchema } from '../../integrations/github/github-settings.schema';
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
 * Lists scout candidates, resolves max-board cap vs active board issues, parses `pr_ignore_author_logins`.
 */
export async function buildPollScoutContext(deps: {
  prScout: SyncPrScoutPort;
  settings: EffectiveReader;
  coreSettings: Pick<CoreSettings, 'maxBoardPrCount'>;
  destinationBoard: Pick<DestinationBoardPort, 'countActiveIssues'>;
  warn: (msg: string) => void;
}): Promise<PollScoutContext> {
  const candidates = deps.prScout.listReviewRequestedForMe();
  const urlsNow = new Set(candidates.map((c) => c.url));
  const boardLimit = deps.coreSettings.maxBoardPrCount;

  const projectIdForCap = deps.settings
    .getEffective('default_project_id')
    .trim();
  let activeVkIssueCount = 0;
  if (projectIdForCap.length > 0) {
    try {
      activeVkIssueCount =
        await deps.destinationBoard.countActiveIssues(projectIdForCap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      deps.warn(
        `countActiveIssues failed: ${redactHttpUrls(msg)}; treating as 0`,
      );
    }
  }

  const quotaForCreates: VkCreateQuota = {
    remaining: Math.max(0, boardLimit - activeVkIssueCount),
  };

  const ignoreResult = prIgnoreAuthorLoginsSchema.safeParse(
    deps.settings.getEffective('pr_ignore_author_logins'),
  );
  let ignoredAuthorLogins: Set<string>;
  if (ignoreResult.success) {
    ignoredAuthorLogins = ignoreResult.data;
  } else {
    const message = ignoreResult.error.issues.map((i) => i.message).join('; ');
    deps.warn(
      `Invalid pr_ignore_author_logins (${message}); treating as empty`,
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
