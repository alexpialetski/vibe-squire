import type { SettingsGroupBase } from './settings-group.base';
import { formatZodIssuesForBadRequest } from './dto/patch-settings-body.schema';

export class SettingsPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsPatchError';
  }
}

/**
 * Validate PATCH body for a partition. Strips undefined keys from partial parse.
 */
export function parseSettingsPatchBody(
  group: SettingsGroupBase,
  body: unknown,
): Record<string, string> {
  const parsed = group.patchSchema.safeParse(body);
  if (!parsed.success) {
    throw new SettingsPatchError(formatZodIssuesForBadRequest(parsed.error));
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (typeof v !== 'string') {
      throw new SettingsPatchError(
        `Setting "${k}" must be a string; send string values in PATCH JSON (e.g. numbers as "5", not 5)`,
      );
    }
    out[k] = v;
  }
  return out;
}

export function isSettingsPatchError(e: unknown): e is SettingsPatchError {
  return e instanceof SettingsPatchError;
}
