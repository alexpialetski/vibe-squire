import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import { SettingsService } from '../../settings/settings.service';
import { VibeKanbanMcpService } from '../../vibe-kanban/vibe-kanban-mcp.service';
import { VK_MCP_STDIO_SESSION_PORT } from '../../ports/injection-tokens';
import type { VkMcpStdioSessionPort } from '../../ports/vk-mcp-stdio-session.port';
import {
  isVibeKanbanDestination,
  isVibeKanbanMcpConfigured,
} from '../../vibe-kanban/mcp-transport-config';
import { SyncRunStateService } from '../../sync/sync-run-state.service';
import { StatusEventsService } from '../../events/status-events.service';
import {
  INTEGRATION_SETTINGS_CHANGED,
  type IntegrationSettingsChangedPayload,
} from '../../events/integration-settings.events';

const VK_DESTINATION_ID = 'vibe_kanban' as const;

/**
 * Reacts to integration settings changes: tear down stdio MCP when VK/MCP is off,
 * probe and update destination health when VK + stdio are configured.
 */
@Injectable()
export class VkMcpIntegrationListener implements OnApplicationBootstrap {
  private readonly logger = new Logger(VkMcpIntegrationListener.name);

  constructor(
    private readonly settings: SettingsService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    @Inject(VK_MCP_STDIO_SESSION_PORT)
    private readonly stdioSession: VkMcpStdioSessionPort,
    private readonly vk: VibeKanbanMcpService,
    private readonly runState: SyncRunStateService,
    private readonly statusEvents: StatusEventsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.reconcile('bootstrap');
  }

  @OnEvent(INTEGRATION_SETTINGS_CHANGED)
  async handleIntegrationSettingsChanged(
    payload: IntegrationSettingsChangedPayload,
  ): Promise<void> {
    if (payload.keys.length > 0) {
      this.logger.debug(
        `Integration settings event (keys: ${payload.keys.join(', ')})`,
      );
    }
    await this.reconcile('event');
  }

  private async reconcile(source: 'bootstrap' | 'event'): Promise<void> {
    const vkDest = isVibeKanbanDestination(this.appEnv.destinationType);
    const mcpOk = isVibeKanbanMcpConfigured(
      this.settings,
      this.appEnv.destinationType,
    );

    if (!vkDest || !mcpOk) {
      await this.stdioSession.shutdown();
      this.runState.setDestinationHealth(VK_DESTINATION_ID, {
        state: 'unknown',
      });
      this.statusEvents.emitChanged();
      if (source === 'event') {
        this.logger.debug('MCP stdio torn down (VK or stdio config inactive)');
      }
      return;
    }

    try {
      await this.vk.probe();
      this.runState.setDestinationHealth(VK_DESTINATION_ID, {
        state: 'ok',
        lastOkAt: new Date().toISOString(),
      });
      this.logger.log(`Vibe Kanban MCP probed OK (${source})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const prev = this.runState.getDestinationHealth(VK_DESTINATION_ID);
      if (prev.lastOkAt) {
        this.runState.setDestinationHealth(VK_DESTINATION_ID, {
          state: 'degraded',
          message: msg,
          lastOkAt: prev.lastOkAt,
        });
      } else {
        this.runState.setDestinationHealth(VK_DESTINATION_ID, {
          state: 'error',
          message: msg,
        });
      }
      this.logger.warn(`MCP probe failed (${source}): ${msg}`);
    }
    this.statusEvents.emitChanged();
  }
}
