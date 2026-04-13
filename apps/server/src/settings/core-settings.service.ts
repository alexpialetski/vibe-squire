import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  CORE_STORAGE_DEFAULTS,
  CORE_STORAGE_KEYS,
  coreRuntimeSchema,
  coreStorageSchema,
  MIN_POLL_INTERVAL_MINUTES,
  type CoreSettingsValues,
} from './core-settings.schema';

/**
 * Typed accessor for core / scheduler settings.
 * Reads effective strings from {@link SettingsService}, validates with storage Zod, parses runtime types.
 */
@Injectable()
export class CoreSettings {
  constructor(private readonly settings: SettingsService) {}

  getAll(): CoreSettingsValues {
    const raw = this.rawEffectiveRecord();
    const storage = coreStorageSchema.safeParse(raw);
    const base = storage.success ? storage.data : CORE_STORAGE_DEFAULTS;
    return coreRuntimeSchema.parse(base);
  }

  get scheduledSyncEnabled(): boolean {
    return this.getAll().scheduled_sync_enabled;
  }

  get autoCreateIssues(): boolean {
    return this.getAll().auto_create_issues;
  }

  get pollIntervalMinutes(): number {
    return Math.max(
      MIN_POLL_INTERVAL_MINUTES,
      this.getAll().poll_interval_minutes,
    );
  }

  get jitterMaxSeconds(): number {
    return this.getAll().jitter_max_seconds;
  }

  get runNowCooldownSeconds(): number {
    return this.getAll().run_now_cooldown_seconds;
  }

  get maxBoardPrCount(): number {
    return this.getAll().max_board_pr_count;
  }

  private rawEffectiveRecord(): Record<string, string> {
    const raw: Record<string, string> = {};
    for (const key of CORE_STORAGE_KEYS) {
      raw[key] = this.settings.getEffective(key);
    }
    return raw;
  }
}
