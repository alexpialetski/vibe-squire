/** PR row from GitHub scout (`gh search prs`), used across sync and ports. */
export type GithubPrCandidate = {
  number: number;
  title: string;
  url: string;
  githubRepo: string;
  /** ISO 8601 from GitHub (`gh search prs --json createdAt`). */
  createdAt: string;
  /** Fixed branch for `start_workspace` (not the PR head). */
  headRefName: string;
  /** From `gh search prs --json author`; used for author skip rules. */
  authorLogin: string;
};
