import { Global, Module } from '@nestjs/common';
import { StatusEventsService } from './status-events.service';
import { IntegrationSettingsEmitterService } from './integration-settings-emitter.service';

/**
 * Global providers for two concerns:
 * - **Status** — `StatusEventsService`: broadcast status snapshot / scheduler refresh (SSE, UI).
 * - **Integration settings** — `IntegrationSettingsEmitterService`: settings keys changed → integration / sync listeners.
 *
 * Event ordering uses `@nestjs/event-emitter`; do not rely on cross-listener order without tests.
 */
@Global()
@Module({
  providers: [StatusEventsService, IntegrationSettingsEmitterService],
  exports: [StatusEventsService, IntegrationSettingsEmitterService],
})
export class StatusEventsModule {}
