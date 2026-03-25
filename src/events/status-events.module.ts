import { Global, Module } from '@nestjs/common';
import { StatusEventsService } from './status-events.service';
import { IntegrationSettingsEmitterService } from './integration-settings-emitter.service';

@Global()
@Module({
  providers: [StatusEventsService, IntegrationSettingsEmitterService],
  exports: [StatusEventsService, IntegrationSettingsEmitterService],
})
export class StatusEventsModule {}
