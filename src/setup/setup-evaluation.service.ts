import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  SUPPORTED_DESTINATION_TYPES,
  SUPPORTED_SOURCE_TYPES,
  type SupportedDestinationType,
  type SupportedSourceType,
} from '../config/integration-types';
import { parseVkStdioCommand } from '../vibe-kanban/mcp-transport-config';

export {
  SUPPORTED_DESTINATION_TYPES,
  SUPPORTED_SOURCE_TYPES,
  type SupportedDestinationType,
  type SupportedSourceType,
} from '../config/integration-types';

export type SetupReason =
  | 'source_type_invalid'
  | 'destination_type_invalid'
  | 'vk_mcp_stdio_invalid'
  | 'no_default_kanban_board'
  | 'no_mappings';

export type SetupEvaluation = {
  /** Valid persisted source + destination (sidebar + dashboard unlocked). */
  integrationsConfigured: boolean;
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
  ) {}

  /**
   * Cheap check used by guards and UI redirect (no gh probe, no full status).
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

    const sourceType = this.settings.getEffective('source_type').trim();
    const destinationType = this.settings
      .getEffective('destination_type')
      .trim();

    const sourceOk = SUPPORTED_SOURCE_TYPES.includes(
      sourceType as SupportedSourceType,
    );
    const destinationOk = SUPPORTED_DESTINATION_TYPES.includes(
      destinationType as SupportedDestinationType,
    );

    const integrationsConfigured = sourceOk && destinationOk;

    const defaultBoardReady =
      defaultOrganizationId.trim().length > 0 &&
      defaultProjectId.trim().length > 0;

    const hasRouting = defaultBoardReady && mappingCount > 0;

    let reason: SetupReason | undefined;
    let complete = false;

    if (!sourceOk) {
      reason = 'source_type_invalid';
    } else if (!destinationOk) {
      reason = 'destination_type_invalid';
    } else if (destinationType === 'vibe_kanban') {
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
      integrationsConfigured,
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
