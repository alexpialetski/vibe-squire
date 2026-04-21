import { Controller, Post, UseGuards } from '@nestjs/common';
import { SetupCompleteGuard } from '../setup/setup-complete.guard';
import { SyncService } from './sync.service';
import { PollSchedulerService } from './poll-scheduler.service';
import { SyncDependenciesGuard } from './sync-dependencies.guard';

@UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
@Controller('api/sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly pollScheduler: PollSchedulerService,
  ) {}

  @Post('run')
  async runNow() {
    const r = await this.sync.requestManualSync();
    this.pollScheduler.reschedule('manual_run_complete');
    return r;
  }
}
