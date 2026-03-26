import type { GithubPrCandidate } from '../scout/github-pr-scout.service';

/**
 * PR / review-queue scout used by sync orchestration (`RunPollCycleService`, `poll-cycle/*`).
 * Resolved at call time from `AppEnv.sourceType` (see `SyncPrScoutFacade`).
 * v1 surface matches GitHub; narrow or rename candidates when a second SCM differs.
 */
export interface SyncPrScoutPort {
  listReviewRequestedForMe(): GithubPrCandidate[];
}
