import { Module, type Provider } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SetupModule } from '../../setup/setup.module';
import { SyncRunStateModule } from '../../sync/sync-run-state.module';
import {
  DESTINATION_BOARD_PORT,
  DESTINATION_STATUS_PORT,
  SYNC_DESTINATION_BOARD_PORT,
  UI_NAV_ENTRIES,
  VK_MCP_STDIO_SESSION_PORT,
} from '../../ports/injection-tokens';
import type { UiNavEntry } from '../../ports/ui-nav.types';
import { DESTINATION_SETTINGS_GROUP } from '../../settings/settings-group.tokens';
import { VibeKanbanMcpService } from '../../vibe-kanban/vibe-kanban-mcp.service';
import { VibeKanbanContextController } from '../../vibe-kanban/vibe-kanban-context.controller';
import { VibeKanbanMcpConfiguredGuard } from '../../vibe-kanban/vibe-kanban-mcp-configured.guard';
import { VkMcpStdioSessionService } from '../../vibe-kanban/transport/vk-mcp-stdio-session.service';
import { VkBoardAdapterService } from './vk-board-adapter.service';
import { VkStatusService } from './vk-status.service';
import { VkMcpIntegrationListener } from './vk-mcp-integration.listener';
import { VkSettings } from './vk-settings.service';
import { VkSettingsGroup } from './vk-settings-group.service';
import { VkUiController } from './vk-ui.controller';

const VK_NAV_MAPPINGS: UiNavEntry = {
  id: 'mappings',
  label: 'Mappings',
  href: '/ui/mappings',
};
const VK_NAV_BOARD: UiNavEntry = {
  id: 'vibe_kanban',
  label: 'Vibe Kanban',
  href: '/ui/vibe-kanban',
};

@Module({
  imports: [SetupModule, PrismaModule, SyncRunStateModule],
  controllers: [VibeKanbanContextController, VkUiController],
  providers: [
    VibeKanbanMcpConfiguredGuard,
    VkSettingsGroup,
    {
      provide: DESTINATION_SETTINGS_GROUP,
      useExisting: VkSettingsGroup,
    },
    VkMcpStdioSessionService,
    VibeKanbanMcpService,
    VkBoardAdapterService,
    VkStatusService,
    VkMcpIntegrationListener,
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
      provide: VK_MCP_STDIO_SESSION_PORT,
      useExisting: VkMcpStdioSessionService,
    },
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
    VibeKanbanMcpService,
    VkMcpStdioSessionService,
    VkBoardAdapterService,
    VkSettings,
    VK_MCP_STDIO_SESSION_PORT,
    DESTINATION_BOARD_PORT,
    SYNC_DESTINATION_BOARD_PORT,
    DESTINATION_STATUS_PORT,
    UI_NAV_ENTRIES,
  ],
})
export class VibeKanbanDestinationModule {}
