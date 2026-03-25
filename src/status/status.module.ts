import { Module } from '@nestjs/common';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GhModule } from '../gh/gh.module';
import { SettingsModule } from '../settings/settings.module';
import { SyncModule } from '../sync/sync.module';
import { SetupModule } from '../setup/setup.module';

@Module({
  imports: [PrismaModule, SettingsModule, GhModule, SyncModule, SetupModule],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
