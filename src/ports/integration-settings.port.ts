/**
 * Each integration contributes setting definitions merged at boot by {@link SettingsService.registerDefinitions}.
 */
export interface IntegrationSettingsProvider {
  getSettingDefinitions(): Record<
    string,
    { defaultValue: string; envVar?: string }
  >;
  getUiEditableKeys(): string[];
}
