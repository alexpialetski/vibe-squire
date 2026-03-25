import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { GhModule } from '../gh/gh.module';
import { ScoutModule } from '../scout/scout.module';
import { VibeKanbanModule } from '../vibe-kanban/vibe-kanban.module';
import { SetupModule } from '../setup/setup.module';
import { SyncService } from './sync.service';
import { RunPollCycleService } from './run-poll-cycle.service';
import { SyncRunStateService } from './sync-run-state.service';
import { PollSchedulerService } from './poll-scheduler.service';
import { SyncController } from './sync.controller';
import { SyncDependenciesGuard } from './sync-dependencies.guard';
import { VkMcpIntegrationListener } from './vk-mcp-integration.listener';
import { PollRunHistoryService } from './poll-run-history.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    GhModule,
    ScoutModule,
    VibeKanbanModule,
    SetupModule,
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    RunPollCycleService,
    SyncRunStateService,
    PollSchedulerService,
    SyncDependenciesGuard,
    VkMcpIntegrationListener,
    PollRunHistoryService,
  ],
  exports: [
    SyncService,
    RunPollCycleService,
    SyncRunStateService,
    PollSchedulerService,
    PollRunHistoryService,
  ],
})
export class SyncModule {}
