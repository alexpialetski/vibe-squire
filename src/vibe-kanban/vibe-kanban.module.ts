import { Module, forwardRef } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { WORK_BOARD_PORT } from '../ports/injection-tokens';
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
      provide: WORK_BOARD_PORT,
      useExisting: VibeKanbanMcpService,
    },
  ],
  exports: [VibeKanbanMcpService, VkMcpStdioSessionService, WORK_BOARD_PORT],
})
export class VibeKanbanModule {}
