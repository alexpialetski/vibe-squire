import { Global, Module } from '@nestjs/common';
import { StatusModule } from '../status/status.module';
import { MappingsModule } from '../mappings/mappings.module';
import { SetupModule } from '../setup/setup.module';
import { SyncModule } from '../sync/sync.module';
import { UiController } from './ui.controller';
import { ActivityApiController } from './activity-api.controller';
import { UiNavService } from './ui-nav.service';

@Global()
@Module({
  imports: [StatusModule, MappingsModule, SetupModule, SyncModule],
  controllers: [UiController, ActivityApiController],
  providers: [UiNavService],
  exports: [UiNavService],
})
export class UiModule {}
