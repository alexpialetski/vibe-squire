import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  isSettingKey,
  MIN_POLL_INTERVAL_MINUTES,
  SETTING_DEFINITIONS,
  type SettingKey,
} from '../config/setting-keys';
import { resolveEffectiveSetting } from '../config/resolve-effective-setting';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<SettingKey, string>();

  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  /** Reload all known keys from DB into memory (call after writes). */
  async refreshCache(): Promise<void> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [...Object.keys(SETTING_DEFINITIONS)] } },
    });
    this.cache.clear();
    for (const row of rows) {
      if (isSettingKey(row.key)) {
        this.cache.set(row.key, row.value);
      }
    }
    this.logger.debug(`Settings cache loaded (${this.cache.size} rows)`);
  }

  /**
   * Effective value: env (if key has `envVar` and value non-empty) → SQLite → code default.
   */
  getEffective(key: SettingKey): string {
    const def = SETTING_DEFINITIONS[key];
    const fromEnv =
      'envVar' in def ? this.appEnv.settingsEnv[def.envVar] : undefined;
    const hasDb = this.cache.has(key);
    const fromDb = hasDb ? this.cache.get(key) : undefined;
    return resolveEffectiveSetting(fromEnv, hasDb, fromDb, def.defaultValue);
  }

  getEffectiveBoolean(key: SettingKey): boolean {
    const v = this.getEffective(key).toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }

  getEffectiveInt(key: SettingKey, fallback: number): number {
    const raw = this.getEffective(key);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Effective poll interval for the scheduler (minutes), clamped to at least
   * {@link MIN_POLL_INTERVAL_MINUTES}. Manual sync ignores this.
   */
  getPollIntervalMinutes(): number {
    const fallback = parseInt(
      SETTING_DEFINITIONS.poll_interval_minutes.defaultValue,
      10,
    );
    const n = this.getEffectiveInt(
      'poll_interval_minutes',
      Number.isFinite(fallback) ? fallback : MIN_POLL_INTERVAL_MINUTES,
    );
    return Math.max(MIN_POLL_INTERVAL_MINUTES, n);
  }

  async setValue(key: SettingKey, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    this.cache.set(key, value);
  }

  /**
   * Effective values for all defined settings (§5.3). Safe for API: no secrets beyond URL
   * hosts operators already set.
   */
  listEffectiveNonSecret(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of Object.keys(SETTING_DEFINITIONS) as SettingKey[]) {
      out[key] = this.getEffective(key);
    }
    return out;
  }
}
