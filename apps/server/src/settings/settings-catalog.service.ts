import { Inject, Injectable } from '@nestjs/common';
import type { SettingDefinition } from './setting-definition';
import { SettingsGroupBase } from './settings-group.base';
import { CoreSettingsGroup } from './core-settings-group.service';
import {
  DESTINATION_SETTINGS_GROUP,
  SOURCE_SETTINGS_GROUP,
  type SettingsGroupId,
} from './settings-group.tokens';

/**
 * Aggregates the three partition groups for cache refresh, effective reads, and PATCH routing.
 */
@Injectable()
export class SettingsCatalogService {
  constructor(
    private readonly core: CoreSettingsGroup,
    @Inject(SOURCE_SETTINGS_GROUP)
    private readonly source: SettingsGroupBase,
    @Inject(DESTINATION_SETTINGS_GROUP)
    private readonly destination: SettingsGroupBase,
  ) {}

  getGroup(id: SettingsGroupId): SettingsGroupBase {
    switch (id) {
      case 'core':
        return this.core;
      case 'source':
        return this.source;
      case 'destination':
        return this.destination;
      default:
        throw new Error(`Unknown settings group: ${String(id)}`);
    }
  }

  private allGroups(): SettingsGroupBase[] {
    return [this.core, this.source, this.destination];
  }

  allKeys(): string[] {
    return this.allGroups().flatMap((g) => g.allKeys());
  }

  getDef(key: string): SettingDefinition | undefined {
    for (const g of this.allGroups()) {
      const d = g.getDef(key);
      if (d) return d;
    }
    return undefined;
  }

  isRegistered(key: string): boolean {
    return this.getDef(key) !== undefined;
  }
}
