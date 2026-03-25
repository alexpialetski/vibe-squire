/** GitHub PR `author.login` values skipped before mapping / issue sync. */
const DEFAULT_IGNORED_LOGINS = [
  'renovate[bot]',
  'dependabot[bot]',
  'dependabot-preview[bot]',
] as const;

const IGNORED_SET = new Set(DEFAULT_IGNORED_LOGINS.map((s) => s.toLowerCase()));

export function isIgnoredBotAuthor(login: string | undefined | null): boolean {
  if (login == null || typeof login !== 'string') {
    return false;
  }
  const t = login.trim().toLowerCase();
  return t.length > 0 && IGNORED_SET.has(t);
}
