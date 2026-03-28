import { z } from 'zod';

const MAX_RAW_CHARS = 8000;
const MAX_SEGMENTS = 200;
const MAX_LOGIN_LEN = 99;

const loginSegmentSchema = z
  .string()
  .min(1, 'Each login must be non-empty')
  .max(MAX_LOGIN_LEN, 'Login too long');

const segmentsArraySchema = z
  .array(loginSegmentSchema)
  .max(MAX_SEGMENTS, 'Too many logins');

/**
 * Semicolon-separated GitHub logins (exact match, case-insensitive after parse).
 * String in → `Set<string>` (lowercased).
 */
export const prIgnoreAuthorLoginsSchema = z
  .string()
  .max(MAX_RAW_CHARS, `List too long (max ${MAX_RAW_CHARS} characters)`)
  .transform((raw) =>
    raw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  )
  .pipe(segmentsArraySchema)
  .transform((logins) => new Set(logins.map((l) => l.toLowerCase())));

/** Storage validation only (same rules, output remains the raw string). */
export const prIgnoreAuthorLoginsStorageField = z
  .string()
  .max(MAX_RAW_CHARS, `List too long (max ${MAX_RAW_CHARS} characters)`)
  .superRefine((raw, ctx) => {
    const segments = raw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const checked = segmentsArraySchema.safeParse(segments);
    if (!checked.success) {
      for (const iss of checked.error.issues) {
        ctx.addIssue({
          code: 'custom',
          message: iss.message,
        });
      }
    }
  });

const PR_IGNORE_DEFAULT =
  'renovate[bot];renovatebot[bot];dependabot[bot];dependabot-preview[bot]';

const PR_REVIEW_BODY_DEFAULT =
  'Examine the diff for PR {prUrl}. Highlight architectural risks and logic bugs. Provide a summary report in the workspace.';

export const githubStorageSchema = z
  .object({
    pr_ignore_author_logins:
      prIgnoreAuthorLoginsStorageField.default(PR_IGNORE_DEFAULT),
    pr_review_body_template: z.string().default(PR_REVIEW_BODY_DEFAULT),
  })
  .strict();

export type GithubStorageValues = z.output<typeof githubStorageSchema>;

export const GITHUB_STORAGE_DEFAULTS: GithubStorageValues =
  githubStorageSchema.parse({});

export const GITHUB_SETTING_ENV = {} as const satisfies Partial<
  Record<keyof GithubStorageValues, string>
>;

/** Typed read layer (ignore list → Set). */
export const githubTypedSchema = z.strictObject({
  pr_ignore_author_logins: prIgnoreAuthorLoginsSchema,
  pr_review_body_template: z.string(),
});

export type GithubSettingsValues = z.output<typeof githubTypedSchema>;

export const GITHUB_STORAGE_KEYS = Object.keys(
  githubStorageSchema.shape,
) as (keyof GithubStorageValues)[];
