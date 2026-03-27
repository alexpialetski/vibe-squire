import type { IntegrationError } from './source-status.port';

export type DestinationReadinessResult = {
  state: 'ok' | 'error' | 'degraded' | 'unknown';
  message?: string;
  errors?: IntegrationError[];
  /** Merged into `GET /api/status` `configuration` (e.g. `vk_mcp_configured`). */
  configuration?: Record<string, unknown>;
  /** For {@link SetupEvaluationService} / UI (destination-specific). */
  setupMeta?: {
    destinationMcpConfigured: boolean;
    hasRouting: boolean;
    mappingCount: number;
  };
};

export type DestinationSetupReason =
  | 'vk_mcp_stdio_invalid'
  | 'no_default_kanban_board'
  | 'no_mappings';

/**
 * Destination-side readiness. Wired per {@link AppEnv.destinationType}.
 * See PLUGIN-ARCHITECTURE-PLAN.md §1.
 */
export interface DestinationStatusProvider {
  readonly destinationType: string;
  checkReadiness(): Promise<DestinationReadinessResult>;
}
