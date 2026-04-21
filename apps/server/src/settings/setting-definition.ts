/**
 * Slim metadata for {@link SettingsService.getEffective} (Option A: env merge only).
 * Constraints and defaults live on Zod storage schemas.
 */
export type SettingDefinition = {
  envVar?: string;
  defaultValue: string;
};
