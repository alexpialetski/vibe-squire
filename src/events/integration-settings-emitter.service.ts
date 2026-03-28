import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INTEGRATION_SETTINGS_CHANGED } from './integration-settings.events';

@Injectable()
export class IntegrationSettingsEmitterService {
  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Notify listeners (e.g. MCP stdio lifecycle) to reconcile probe / teardown.
   * Call after `refreshCache()` when persisted integration settings (e.g. MCP stdio JSON) may have changed.
   * Awaits async listeners so health/state is updated before HTTP redirects return.
   */
  async emitIntegrationSettingsChanged(): Promise<void> {
    await this.emitter.emitAsync(INTEGRATION_SETTINGS_CHANGED);
  }
}
