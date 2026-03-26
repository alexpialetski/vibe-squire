import { z } from 'zod';
import { isSettingKey } from '../../config/setting-keys';
import { parsePrIgnoreAuthorLogins } from '../../sync/pr-ignore-author-logins';

/**
 * PATCH /api/settings body: string values only, known keys, plus pr_ignore_author_logins rules.
 */
export const patchSettingsBodySchema = z
  .record(z.string(), z.string())
  .superRefine((obj, ctx) => {
    for (const key of Object.keys(obj)) {
      if (!isSettingKey(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown setting key: ${key}`,
          path: [key],
        });
      }
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'pr_ignore_author_logins' || !isSettingKey(key)) {
        continue;
      }
      const parsed = parsePrIgnoreAuthorLogins(value);
      if (!parsed.ok) {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid pr_ignore_author_logins: ${parsed.message}`,
          path: [key],
        });
      }
    }
  });

export function formatZodIssuesForBadRequest(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join('; ');
}
