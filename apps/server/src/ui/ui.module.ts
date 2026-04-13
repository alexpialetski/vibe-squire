import { Global, Module } from '@nestjs/common';
import { StatusModule } from '../status/status.module';
import { MappingsModule } from '../mappings/mappings.module';
import { SetupModule } from '../setup/setup.module';
import { SyncModule } from '../sync/sync.module';
import { ActivityApiController } from './activity-api.controller';
import { OperatorBffController } from './operator-bff.controller';
import { UiNavService } from './ui-nav.service';

@Global()
@Module({
  imports: [StatusModule, MappingsModule, SetupModule, SyncModule],
  controllers: [ActivityApiController, OperatorBffController],
  providers: [UiNavService],
  exports: [UiNavService],
})
export class UiModule {}
