import { z } from 'zod';
import { isSettingKey } from '../../config/setting-keys';
import { isValidMaxBoardPrCountInput } from '../../config/max-board-pr-count';
import { isValidScheduledSyncEnabledInput } from '../../config/scheduled-sync-enabled';
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
      if (!isSettingKey(key)) {
        continue;
      }
      if (key === 'pr_ignore_author_logins') {
        const parsed = parsePrIgnoreAuthorLogins(value);
        if (!parsed.ok) {
          ctx.addIssue({
            code: 'custom',
            message: `Invalid pr_ignore_author_logins: ${parsed.message}`,
            path: [key],
          });
        }
      }
      if (key === 'max_board_pr_count' && !isValidMaxBoardPrCountInput(value)) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Invalid max_board_pr_count: integer 1–200 (max concurrent PRs on the board)',
          path: [key],
        });
      }
      if (
        key === 'scheduled_sync_enabled' &&
        !isValidScheduledSyncEnabledInput(value)
      ) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Invalid scheduled_sync_enabled: use true, false, 1, 0, yes, or no',
          path: [key],
        });
      }
    }
  });

export function formatZodIssuesForBadRequest(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join('; ');
}
