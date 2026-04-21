import type { GithubPrCandidate } from './github-pr-candidate';

/**
 * PR / review-queue scout used by sync orchestration (`RunPollCycleService`, `poll-cycle/*`).
 * Resolved at boot via `IntegrationsModule.register(env)` for `AppEnv.sourceType`.
 * v1 surface matches GitHub; narrow or rename candidates when a second SCM differs.
 */
export interface SyncPrScoutPort {
  listReviewRequestedForMe(githubHost: string): GithubPrCandidate[];
}
