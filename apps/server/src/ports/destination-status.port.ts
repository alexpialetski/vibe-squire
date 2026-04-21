import type { IntegrationError } from './source-status.port';

export type DestinationReadinessResult = {
  state: 'ok' | 'error' | 'degraded' | 'unknown';
  message?: string;
  errors?: IntegrationError[];
  /** Merged into `GET /api/status` `configuration` (e.g. `vibe_kanban_board_active`). */
  configuration?: Record<string, unknown>;
  /** For {@link SetupEvaluationService} / UI (destination-specific). */
  setupMeta?: {
    vibeKanbanBoardActive: boolean;
    hasRouting: boolean;
    mappingCount: number;
  };
};

export type DestinationSetupReason = 'no_default_kanban_board' | 'no_mappings';

/**
 * Destination-side readiness. Wired per {@link AppEnv.destinationType}.
 * See docs/ARCHITECTURE.md.
 */
export interface DestinationStatusProvider {
  readonly destinationType: string;
  checkReadiness(): Promise<DestinationReadinessResult>;
}
