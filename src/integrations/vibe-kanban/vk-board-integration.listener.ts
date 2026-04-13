import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import { VibeKanbanBoardService } from '../../vibe-kanban/vibe-kanban-board.service';
import { isVibeKanbanDestination } from '../../vibe-kanban/vibe-kanban-destination';
import { SyncRunStateService } from '../../sync/sync-run-state.service';
import { StatusEventsService } from '../../events/status-events.service';
import { INTEGRATION_SETTINGS_CHANGED } from '../../events/integration-settings.events';

const VK_DESTINATION_ID = 'vibe_kanban' as const;

/**
 * Reacts to integration settings changes and bootstrap: probe the Vibe Kanban HTTP API when the
 * destination is Vibe Kanban.
 */
@Injectable()
export class VkBoardIntegrationListener implements OnApplicationBootstrap {
  private readonly logger = new Logger(VkBoardIntegrationListener.name);

  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly vk: VibeKanbanBoardService,
    private readonly runState: SyncRunStateService,
    private readonly statusEvents: StatusEventsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.reconcile('bootstrap');
  }

  @OnEvent(INTEGRATION_SETTINGS_CHANGED)
  async handleIntegrationSettingsChanged(): Promise<void> {
    await this.reconcile('event');
  }

  private async reconcile(source: 'bootstrap' | 'event'): Promise<void> {
    const vkDest = isVibeKanbanDestination(this.appEnv.destinationType);

    if (!vkDest) {
      this.runState.setDestinationHealth(VK_DESTINATION_ID, {
        state: 'unknown',
      });
      this.statusEvents.emitChanged();
      if (source === 'event') {
        this.logger.debug(
          'Vibe Kanban destination inactive; health reset to unknown',
        );
      }
      return;
    }

    try {
      await this.vk.probe();
      this.runState.setDestinationHealth(VK_DESTINATION_ID, {
        state: 'ok',
        lastOkAt: new Date().toISOString(),
      });
      this.logger.log(`Vibe Kanban API probed OK (${source})`);
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
      this.logger.warn(`Vibe Kanban API probe failed (${source}): ${msg}`);
    }
    this.statusEvents.emitChanged();
  }
}
