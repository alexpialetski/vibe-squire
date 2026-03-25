import type { GithubPrCandidate } from '../scout/github-pr-scout.service';

/** Outbound scout port (§2.1) — GitHub PR review queue v1. */
export interface GithubPrScoutPort {
  listReviewRequestedForMe(): GithubPrCandidate[];
}
