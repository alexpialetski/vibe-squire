import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { SetupCompleteGuard } from '../setup/setup-complete.guard';
import { SyncService } from './sync.service';
import { PollSchedulerService } from './poll-scheduler.service';
import { SyncDependenciesGuard } from './sync-dependencies.guard';

@ApiTags('sync')
@UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
@Controller('api/sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly pollScheduler: PollSchedulerService,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Run one poll cycle now (manual)' })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiConflictResponse({ description: 'Sync already running' })
  @ApiTooManyRequestsResponse({ description: 'Cooldown active' })
  @ApiResponse({
    status: 409,
    description:
      'Minimum setup not complete (PR source, destination, MCP URL, routing as required)',
  })
  @ApiResponse({
    status: 503,
    description: 'GitHub CLI or Vibe Kanban destination reported error',
  })
  runNow() {
    return this.sync.requestManualSync().then((r) => {
      this.pollScheduler.reschedule('manual_run_complete');
      return r;
    });
  }
}
