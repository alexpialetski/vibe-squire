import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UI_NAV_ENTRIES } from '../ports/injection-tokens';
import type { UiNavEntry } from '../ports/ui-nav.types';

/**
 * Gathers all {@link UI_NAV_ENTRIES} multi-provider bindings at boot via {@link ModuleRef}.
 * Direct `@Inject(UI_NAV_ENTRIES)` doesn't aggregate across module boundaries in NestJS;
 * this service works around that limitation (same pattern as {@link SettingsService} for
 * `INTEGRATION_SETTINGS_PROVIDERS`).
 */
@Injectable()
export class UiNavService implements OnModuleInit {
  private entries: UiNavEntry[] = [];

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    try {
      const resolved: unknown = this.moduleRef.get(UI_NAV_ENTRIES, {
        strict: false,
        each: true,
      });
      const raw = Array.isArray(resolved) ? (resolved as UiNavEntry[]) : [];
      const byId = new Map<string, UiNavEntry>();
      for (const e of raw) {
        byId.set(e.id, e);
      }
      this.entries = [...byId.values()].sort((a, b) =>
        a.id.localeCompare(b.id),
      );
    } catch {
      this.entries = [];
    }
  }

  getEntries(): UiNavEntry[] {
    return this.entries;
  }
}
