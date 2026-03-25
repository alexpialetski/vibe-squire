import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GhModule } from '../gh/gh.module';
import { VibeKanbanModule } from '../vibe-kanban/vibe-kanban.module';
import { SettingsModule } from '../settings/settings.module';
import { SyncModule } from '../sync/sync.module';
import { ReinitService } from './reinit.service';
import { ReinitController } from './reinit.controller';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    GhModule,
    VibeKanbanModule,
    SyncModule,
  ],
  controllers: [ReinitController],
  providers: [ReinitService],
})
export class ReinitModule {}
