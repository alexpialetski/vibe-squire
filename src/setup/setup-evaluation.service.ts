import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { parseVkStdioCommand } from '../vibe-kanban/mcp-transport-config';

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

export type SetupEvaluation = {
  /** Ready for sync and full operation (MCP + routing when Vibe Kanban). */
  complete: boolean;
  reason?: SetupReason;
  mappingCount: number;
  sourceType: string;
  destinationType: string;
  vkMcpReady: boolean;
  hasRouting: boolean;
};

@Injectable()
export class SetupEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  /**
   * Cheap check used by guards and UI (no gh probe, no full status).
   */
  async evaluate(): Promise<SetupEvaluation> {
    const mappingCount = await this.prisma.repoProjectMapping.count();
    const defaultProjectId = this.settings.getEffective('default_project_id');
    const defaultOrganizationId = this.settings.getEffective(
      'default_organization_id',
    );
    const vkMcpReady =
      parseVkStdioCommand(this.settings.getEffective('vk_mcp_stdio_json')) !=
      null;

    const sourceType = this.appEnv.sourceType;
    const destinationType = this.appEnv.destinationType;

    const defaultBoardReady =
      defaultOrganizationId.trim().length > 0 &&
      defaultProjectId.trim().length > 0;

    const hasRouting = defaultBoardReady && mappingCount > 0;

    let reason: SetupReason | undefined;
    let complete = false;

    if (destinationType === 'vibe_kanban') {
      complete = hasRouting && vkMcpReady;
      if (!complete) {
        if (!vkMcpReady) {
          reason = 'vk_mcp_stdio_invalid';
        } else if (!defaultBoardReady) {
          reason = 'no_default_kanban_board';
        } else {
          reason = 'no_mappings';
        }
      }
    } else {
      complete = true;
    }

    return {
      complete,
      ...(reason ? { reason } : {}),
      mappingCount,
      sourceType,
      destinationType,
      vkMcpReady,
      hasRouting,
    };
  }
}
