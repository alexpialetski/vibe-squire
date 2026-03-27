import { z } from 'zod';
import { isSettingKey, validateSettingValue } from '../setting-keys';

/**
 * PATCH /api/settings body: string values only, known keys.
 * Per-key validation is driven by `validate` on each {@link SettingDefinition}.
 */
export const patchSettingsBodySchema = z
  .record(z.string(), z.string())
  .superRefine((obj, ctx) => {
    for (const [key, value] of Object.entries(obj)) {
      if (!isSettingKey(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown setting key: ${key}`,
          path: [key],
        });
        continue;
      }
      const error = validateSettingValue(key, value);
      if (error) {
        ctx.addIssue({ code: 'custom', message: error, path: [key] });
      }
    }
  });

export function formatZodIssuesForBadRequest(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join('; ');
}
