/**
 * Effective string: env (when caller passes a non-empty value) → SQLite row (when present) → code default.
 * Keys without env mapping pass `undefined` for `envValue`.
 */
export function resolveEffectiveSetting(
  envValue: string | undefined,
  hasDbRow: boolean,
  dbValue: string | undefined,
  codeDefault: string,
): string {
  if (envValue !== undefined && envValue !== '') {
    return envValue;
  }
  if (hasDbRow && dbValue !== undefined) {
    return dbValue;
  }
  return codeDefault;
}
