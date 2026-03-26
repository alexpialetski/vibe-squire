import { z } from 'zod';

const MAX_RAW_CHARS = 8000;
const MAX_SEGMENTS = 200;
/** GitHub allows 39; allow a little slack for app-style logins. */
const MAX_LOGIN_LEN = 99;

const loginSegmentSchema = z
  .string()
  .min(1, 'Each login must be non-empty')
  .max(MAX_LOGIN_LEN, 'Login too long');

const segmentsArraySchema = z
  .array(loginSegmentSchema)
  .max(MAX_SEGMENTS, 'Too many logins');

export type PrIgnoreAuthorLoginsParseResult =
  | { ok: true; set: Set<string> }
  | { ok: false; message: string };

/**
 * Semicolon-separated GitHub logins (exact match, case-insensitive).
 * Empty string → no ignored authors.
 */
export function parsePrIgnoreAuthorLogins(
  raw: string,
): PrIgnoreAuthorLoginsParseResult {
  if (raw.length > MAX_RAW_CHARS) {
    return {
      ok: false,
      message: `List too long (max ${MAX_RAW_CHARS} characters)`,
    };
  }
  const segments = raw
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const checked = segmentsArraySchema.safeParse(segments);
  if (!checked.success) {
    const message = checked.error.issues.map((i) => i.message).join('; ');
    return { ok: false, message };
  }
  return {
    ok: true,
    set: new Set(checked.data.map((l) => l.toLowerCase())),
  };
}

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
