import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { PrismaService } from '../prisma/prisma.service';
import {
  isSettingKey,
  MIN_POLL_INTERVAL_MINUTES,
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  type SettingKey,
} from './setting-keys';
import { resolveEffectiveSetting } from './resolve-effective-setting';
import { StatusEventsService } from '../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../events/integration-settings-emitter.service';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<SettingKey, string>();

  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly prisma: PrismaService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  /** Reload all known keys from DB into memory (call after writes). */
  async refreshCache(): Promise<void> {
    const keys = [...SETTING_KEYS] as string[];
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    this.cache.clear();
    for (const row of rows) {
      if (isSettingKey(row.key)) {
        this.cache.set(row.key, row.value);
      }
    }
    this.logger.debug(`Settings cache loaded (${this.cache.size} rows)`);
  }

  getEffective(key: SettingKey): string {
    const def = SETTING_DEFINITIONS[key];
    const raw = 'envVar' in def ? process.env[def.envVar] : undefined;
    const fromEnv = raw?.trim() || undefined;
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
   * Persist multiple settings, refresh cache, and emit change events.
   * Returns the list of keys that were written.
   */
  async applyPatch(entries: Record<string, string>): Promise<SettingKey[]> {
    const touched: SettingKey[] = [];
    for (const [key, value] of Object.entries(entries)) {
      if (!isSettingKey(key)) continue;
      await this.setValue(key, value);
      touched.push(key);
    }
    await this.refreshCache();
    await this.integrationEmitter.emitIntegrationSettingsChanged(touched);
    this.statusEvents.emitChanged();
    this.statusEvents.emitScheduleRefresh();
    return touched;
  }

  listEffectiveNonSecret(): Record<string, string> {
    const out: Record<string, string> = {
      source_type: this.appEnv.sourceType,
      destination_type: this.appEnv.destinationType,
    };
    for (const key of SETTING_KEYS) {
      out[key] = this.getEffective(key);
    }
    return out;
  }
}
