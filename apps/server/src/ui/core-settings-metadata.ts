import { SCHEDULER_UI_KEYS } from './integration-ui-registry';
import { SETTING_LABELS } from './setting-labels';

export type CoreSettingsFieldMeta = {
  key: string;
  label: string;
  value: string;
  envVar?: string;
  description?: string;
};

function parseLabel(key: string): { label: string; envVar?: string } {
  const full = SETTING_LABELS[key] ?? key;
  const idx = full.indexOf(' Override: ');
  if (idx >= 0) {
    return {
      label: full.slice(0, idx).trim(),
      envVar: full.slice(idx + ' Override: '.length).trim(),
    };
  }
  return { label: full };
}

/**
 * Ordered core settings rows for GraphQL `effectiveSettings` (includes boolean keys).
 */
export function coreSettingsFieldsMetadata(
  values: Record<string, string>,
): CoreSettingsFieldMeta[] {
  return SCHEDULER_UI_KEYS.map((key) => {
    const { label, envVar } = parseLabel(key);
    return {
      key,
      label,
      value: values[key] ?? '',
      ...(envVar ? { envVar } : {}),
    };
  });
}
