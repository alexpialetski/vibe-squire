import { Module, forwardRef } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import {
  VIBE_KANBAN_BOARD_PORT,
  VK_MCP_STDIO_SESSION_PORT,
} from '../ports/injection-tokens';
import { VibeKanbanMcpService } from './vibe-kanban-mcp.service';
import { VibeKanbanContextController } from './vibe-kanban-context.controller';
import { VkMcpStdioSessionService } from './vk-mcp-stdio-session.service';

@Module({
  imports: [forwardRef(() => SettingsModule)],
  controllers: [VibeKanbanContextController],
  providers: [
    VkMcpStdioSessionService,
    VibeKanbanMcpService,
    {
      provide: VIBE_KANBAN_BOARD_PORT,
      useExisting: VibeKanbanMcpService,
    },
    {
      provide: VK_MCP_STDIO_SESSION_PORT,
      useExisting: VkMcpStdioSessionService,
    },
  ],
  exports: [
    VibeKanbanMcpService,
    VkMcpStdioSessionService,
    VIBE_KANBAN_BOARD_PORT,
    VK_MCP_STDIO_SESSION_PORT,
  ],
})
export class VibeKanbanModule {}
