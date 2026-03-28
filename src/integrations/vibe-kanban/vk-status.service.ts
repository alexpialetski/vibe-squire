import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';
import {
  isVibeKanbanDestination,
  isVibeKanbanMcpConfigured,
  parseVkStdioCommand,
} from '../../vibe-kanban/transport/mcp-transport-config';
import type {
  DestinationReadinessResult,
  DestinationStatusProvider,
} from '../../ports/destination-status.port';
import type { IntegrationError } from '../../ports/source-status.port';
import { SyncRunStateService } from '../../sync/sync-run-state.service';

@Injectable()
export class VkStatusService implements DestinationStatusProvider {
  readonly destinationType = 'vibe_kanban' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly runState: SyncRunStateService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  async checkReadiness(): Promise<DestinationReadinessResult> {
    const configuration: Record<string, unknown> = {
      vk_mcp_configured: isVibeKanbanMcpConfigured(
        this.settings,
        this.appEnv.destinationType,
      ),
    };

    if (!isVibeKanbanDestination(this.appEnv.destinationType)) {
      return { state: 'ok', configuration };
    }

    const mappingCount = await this.prisma.repoProjectMapping.count();
    const defaultProjectId = this.settings.getEffective('default_project_id');
    const defaultOrganizationId = this.settings.getEffective(
      'default_organization_id',
    );
    const destinationMcpConfigured =
      parseVkStdioCommand(this.settings.getEffective('vk_mcp_stdio_json')) !=
      null;

    const defaultBoardReady =
      defaultOrganizationId.trim().length > 0 &&
      defaultProjectId.trim().length > 0;

    const hasRouting = defaultBoardReady && mappingCount > 0;
    const setupComplete = hasRouting && destinationMcpConfigured;

    const errors: IntegrationError[] = [];
    if (!destinationMcpConfigured) {
      errors.push({
        code: 'vk_mcp_stdio_invalid',
        message:
          'Configure Vibe Kanban MCP stdio (VK_MCP_STDIO_JSON or vk_mcp_stdio_json).',
        settingsPageHint: '/ui/vibe-kanban',
      });
    } else if (!defaultBoardReady) {
      errors.push({
        code: 'no_default_kanban_board',
        message: 'Set default Kanban organization and project.',
        settingsPageHint: '/ui/vibe-kanban',
      });
    } else if (mappingCount === 0) {
      errors.push({
        code: 'no_mappings',
        message: 'Add at least one GitHub repo → Kanban repository mapping.',
        settingsPageHint: '/ui/mappings',
      });
    }

    const health = this.runState.getDestinationHealth(this.destinationType);
    const state: DestinationReadinessResult['state'] = !setupComplete
      ? 'error'
      : health.state;

    return {
      state,
      ...(health.message && setupComplete ? { message: health.message } : {}),
      ...(errors.length > 0 ? { errors } : {}),
      configuration,
      setupMeta: {
        destinationMcpConfigured,
        hasRouting,
        mappingCount,
      },
    };
  }
}
