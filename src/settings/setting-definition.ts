/**
 * Shape shared by every setting entry across core and integration modules.
 * A single source of truth — do not redeclare this inline.
 *
 * @param validate  Return `null` when valid; an error message string otherwise.
 */
export type SettingDefinition = {
  envVar?: string;
  defaultValue: string;
  validate?: (value: string) => string | null;
};
