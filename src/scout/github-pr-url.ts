/** Derive base `owner/repo` (lowercase) and PR number from a GitHub (or GHES) PR URL. */
export function parseGitHubPrUrl(
  prUrl: string,
): { ownerRepo: string; number: number } | null {
  try {
    const u = new URL(prUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const pullIdx = parts.indexOf('pull');
    if (pullIdx < 2) {
      return null;
    }
    const num = parseInt(parts[pullIdx + 1] ?? '', 10);
    if (!Number.isFinite(num)) {
      return null;
    }
    const owner = parts[pullIdx - 2];
    const repo = parts[pullIdx - 1];
    return { ownerRepo: `${owner}/${repo}`.toLowerCase(), number: num };
  } catch {
    return null;
  }
}
