export function isIgnoredAuthorLogin(
  login: string | undefined | null,
  ignoredLowercase: Set<string>,
): boolean {
  if (login == null || typeof login !== 'string') {
    return false;
  }
  const t = login.trim().toLowerCase();
  return t.length > 0 && ignoredLowercase.has(t);
}
