import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncModule } from '../sync/sync.module';
import { ReinitService } from './reinit.service';
import { ReinitController } from './reinit.controller';

@Module({
  imports: [PrismaModule, SyncModule],
  controllers: [ReinitController],
  providers: [ReinitService],
  exports: [ReinitService],
})
export class ReinitModule {}
