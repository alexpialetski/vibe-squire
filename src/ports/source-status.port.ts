/**
 * Source-side readiness (SCM / review queue). Wired per {@link AppEnv.sourceType}.
 * See PLUGIN-ARCHITECTURE-PLAN.md §1.
 */
export type SourceReadinessResult = {
  state: 'ok' | 'error' | 'unknown';
  message?: string;
  errors?: IntegrationError[];
};

export type IntegrationError = {
  code: string;
  message: string;
  settingsPageHint?: string;
};

export interface SourceStatusProvider {
  readonly sourceType: string;
  checkReadiness(): SourceReadinessResult;
}
