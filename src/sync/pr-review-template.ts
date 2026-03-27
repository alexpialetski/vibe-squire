import type { GithubPrCandidate } from '../ports/github-pr-candidate';

/**
 * §3.2 — Body text for PR review issues. Placeholders: `{prUrl}`, `{title}`, `{number}`, `{githubRepo}`.
 */
export function applyPrReviewBodyTemplate(
  template: string,
  pr: GithubPrCandidate,
): string {
  return template
    .replaceAll('{prUrl}', pr.url)
    .replaceAll('{title}', pr.title)
    .replaceAll('{number}', String(pr.number))
    .replaceAll('{githubRepo}', pr.githubRepo);
}
