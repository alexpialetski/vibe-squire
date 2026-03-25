import { Module } from '@nestjs/common';
import { StatusModule } from '../status/status.module';
import { SettingsModule } from '../settings/settings.module';
import { MappingsModule } from '../mappings/mappings.module';
import { VibeKanbanModule } from '../vibe-kanban/vibe-kanban.module';
import { SetupModule } from '../setup/setup.module';
import { SyncModule } from '../sync/sync.module';
import { UiController } from './ui.controller';

@Module({
  imports: [
    StatusModule,
    SettingsModule,
    MappingsModule,
    VibeKanbanModule,
    SetupModule,
    SyncModule,
  ],
  controllers: [UiController],
})
export class UiModule {}
