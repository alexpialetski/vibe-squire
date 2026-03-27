import { Module } from '@nestjs/common';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncModule } from '../sync/sync.module';
import { SetupModule } from '../setup/setup.module';
import { SyncRunStateModule } from '../sync/sync-run-state.module';

@Module({
  imports: [PrismaModule, SyncRunStateModule, SyncModule, SetupModule],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
