import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { PrismaService } from '../prisma/prisma.service';
import {
  isSettingKey,
  MIN_POLL_INTERVAL_MINUTES,
  type SettingKey,
} from './setting-keys';
import { resolveEffectiveSetting } from './resolve-effective-setting';
import type { IntegrationSettingsProvider } from '../ports/integration-settings.port';
import { INTEGRATION_SETTINGS_PROVIDERS } from '../ports/injection-tokens';

type SettingDef = { envVar?: string; defaultValue: string };

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly mergedDefinitions = new Map<string, SettingDef>();
  private cache = new Map<SettingKey, string>();

  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit(): Promise<void> {
    let providers: IntegrationSettingsProvider[] = [];
    try {
      const resolved: unknown = this.moduleRef.get(
        INTEGRATION_SETTINGS_PROVIDERS,
        { strict: false, each: true },
      );
      providers = Array.isArray(resolved)
        ? (resolved as IntegrationSettingsProvider[])
        : [];
    } catch {
      providers = [];
    }
    for (const p of providers) {
      this.registerDefinitions(p.getSettingDefinitions());
    }
    await this.refreshCache();
  }

  /**
   * Merge plugin definitions (same shape as static {@link SETTING_DEFINITIONS} entries).
   */
  registerDefinitions(defs: Record<string, SettingDef>): void {
    for (const [k, v] of Object.entries(defs)) {
      this.mergedDefinitions.set(k, v);
    }
  }

  private definitionFor(key: SettingKey): SettingDef {
    const d = this.mergedDefinitions.get(key);
    if (!d) {
      throw new Error(`Unknown setting key (no definition): ${key}`);
    }
    return d;
  }

  /** All keys known after integration merge (for cache refresh). */
  private allSettingKeys(): SettingKey[] {
    return [...this.mergedDefinitions.keys()] as SettingKey[];
  }

  /** Reload all known keys from DB into memory (call after writes). */
  async refreshCache(): Promise<void> {
    const keys = this.allSettingKeys();
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
    const def = this.definitionFor(key);
    const envKey = 'envVar' in def ? def.envVar : undefined;
    const fromEnv: string | undefined =
      envKey !== undefined
        ? (this.appEnv.settingsEnv as Record<string, string | undefined>)[
            envKey
          ]
        : undefined;
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
      this.definitionFor('poll_interval_minutes').defaultValue,
      10,
    );
    const n = this.getEffectiveInt(
      'poll_interval_minutes',
      Number.isFinite(fallback) ? fallback : MIN_POLL_INTERVAL_MINUTES,
    );
    return Math.max(MIN_POLL_INTERVAL_MINUTES, n);
  }

  async setValue(key: SettingKey, value: string): Promise<void> {
    this.definitionFor(key);
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    this.cache.set(key, value);
  }

  listEffectiveNonSecret(): Record<string, string> {
    const out: Record<string, string> = {
      source_type: this.appEnv.sourceType,
      destination_type: this.appEnv.destinationType,
    };
    for (const key of this.allSettingKeys()) {
      out[key] = this.getEffective(key);
    }
    return out;
  }
}
