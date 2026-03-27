import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SetupModule } from '../setup/setup.module';
import { SyncRunStateModule } from './sync-run-state.module';
import { SyncService } from './sync.service';
import { RunPollCycleService } from './run-poll-cycle.service';
import { PollSchedulerService } from './poll-scheduler.service';
import { SyncController } from './sync.controller';
import { SyncDependenciesGuard } from './sync-dependencies.guard';
import { PollRunHistoryService } from './poll-run-history.service';
@Module({
  imports: [PrismaModule, SetupModule, SyncRunStateModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    RunPollCycleService,
    PollSchedulerService,
    SyncDependenciesGuard,
    PollRunHistoryService,
  ],
  exports: [
    SyncService,
    RunPollCycleService,
    SyncRunStateModule,
    PollSchedulerService,
    PollRunHistoryService,
  ],
})
export class SyncModule {}
