import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { DESTINATION_STATUS_PORT } from '../ports/injection-tokens';
import type { DestinationStatusProvider } from '../ports/destination-status.port';

export {
  SUPPORTED_DESTINATION_TYPES,
  SUPPORTED_SOURCE_TYPES,
  type SupportedDestinationType,
  type SupportedSourceType,
} from '../config/integration-types';

export type SetupReason =
  | 'vk_mcp_stdio_invalid'
  | 'no_default_kanban_board'
  | 'no_mappings';

const ERROR_CODE_TO_REASON: Record<string, SetupReason> = {
  vk_mcp_stdio_invalid: 'vk_mcp_stdio_invalid',
  no_default_kanban_board: 'no_default_kanban_board',
  no_mappings: 'no_mappings',
};

export type SetupEvaluation = {
  /** Ready for sync and full operation (MCP + routing when Vibe Kanban). */
  complete: boolean;
  reason?: SetupReason;
  mappingCount: number;
  sourceType: string;
  destinationType: string;
  destinationMcpConfigured: boolean;
  hasRouting: boolean;
};

@Injectable()
export class SetupEvaluationService {
  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    @Inject(DESTINATION_STATUS_PORT)
    private readonly destinationStatus: DestinationStatusProvider,
  ) {}

  /**
   * Cheap check used by guards and UI (no source probe beyond destination.checkReadiness).
   */
  async evaluate(): Promise<SetupEvaluation> {
    const r = await this.destinationStatus.checkReadiness();
    const meta = r.setupMeta ?? {
      destinationMcpConfigured: true,
      hasRouting: true,
      mappingCount: 0,
    };
    const blocking = r.errors?.length ?? 0;
    const complete = blocking === 0;
    const firstCode = r.errors?.[0]?.code;
    const reason =
      firstCode && ERROR_CODE_TO_REASON[firstCode]
        ? ERROR_CODE_TO_REASON[firstCode]
        : undefined;

    return {
      complete,
      ...(reason ? { reason } : {}),
      mappingCount: meta.mappingCount,
      sourceType: this.appEnv.sourceType,
      destinationType: this.appEnv.destinationType,
      destinationMcpConfigured: meta.destinationMcpConfigured,
      hasRouting: meta.hasRouting,
    };
  }
}
