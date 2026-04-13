import { Module, type Provider } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SetupModule } from '../../setup/setup.module';
import { SyncRunStateModule } from '../../sync/sync-run-state.module';
import {
  DESTINATION_BOARD_PORT,
  DESTINATION_STATUS_PORT,
  SYNC_DESTINATION_BOARD_PORT,
  UI_NAV_ENTRIES,
} from '../../ports/injection-tokens';
import type { UiNavEntry } from '../../ports/ui-nav.types';
import { DESTINATION_SETTINGS_GROUP } from '../../settings/settings-group.tokens';
import { VibeKanbanBoardService } from '../../vibe-kanban/vibe-kanban-board.service';
import { VibeKanbanApiClient } from '../../vibe-kanban/rest/vibe-kanban-api.client';
import { VibeKanbanContextController } from '../../vibe-kanban/vibe-kanban-context.controller';
import { VibeKanbanDestinationConfiguredGuard } from '../../vibe-kanban/vibe-kanban-destination-configured.guard';
import { VkBoardAdapterService } from './vk-board-adapter.service';
import { VkStatusService } from './vk-status.service';
import { VkBoardIntegrationListener } from './vk-board-integration.listener';
import { VkSettings } from './vk-settings.service';
import { VkSettingsGroup } from './vk-settings-group.service';
const VK_NAV_MAPPINGS: UiNavEntry = {
  id: 'mappings',
  label: 'Mappings',
  href: '/mappings',
};
const VK_NAV_BOARD: UiNavEntry = {
  id: 'vibe_kanban',
  label: 'Vibe Kanban',
  href: '/vibe-kanban',
};

@Module({
  imports: [SetupModule, PrismaModule, SyncRunStateModule],
  controllers: [VibeKanbanContextController],
  providers: [
    VibeKanbanDestinationConfiguredGuard,
    VkSettingsGroup,
    {
      provide: DESTINATION_SETTINGS_GROUP,
      useExisting: VkSettingsGroup,
    },
    VibeKanbanApiClient,
    VibeKanbanBoardService,
    VkBoardAdapterService,
    VkStatusService,
    VkBoardIntegrationListener,
    VkSettings,
    {
      provide: UI_NAV_ENTRIES,
      useValue: VK_NAV_MAPPINGS,
      multi: true,
    } as Provider,
    {
      provide: UI_NAV_ENTRIES,
      useValue: VK_NAV_BOARD,
      multi: true,
    } as Provider,
    {
      provide: DESTINATION_BOARD_PORT,
      useExisting: VkBoardAdapterService,
    },
    {
      provide: SYNC_DESTINATION_BOARD_PORT,
      useExisting: VkBoardAdapterService,
    },
    {
      provide: DESTINATION_STATUS_PORT,
      useExisting: VkStatusService,
    },
  ],
  exports: [
    VkSettingsGroup,
    DESTINATION_SETTINGS_GROUP,
    VibeKanbanBoardService,
    VibeKanbanApiClient,
    VkBoardAdapterService,
    VkSettings,
    DESTINATION_BOARD_PORT,
    SYNC_DESTINATION_BOARD_PORT,
    DESTINATION_STATUS_PORT,
    UI_NAV_ENTRIES,
  ],
})
export class VibeKanbanDestinationModule {}
