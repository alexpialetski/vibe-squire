import { Module } from '@nestjs/common';
import { SyncRunStateService } from './sync-run-state.service';

@Module({
  providers: [SyncRunStateService],
  exports: [SyncRunStateService],
})
export class SyncRunStateModule {}
