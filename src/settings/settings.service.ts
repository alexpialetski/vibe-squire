import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsCatalogService } from './settings-catalog.service';
import { parseSettingsPatchBody } from './parse-settings-patch';
import { resolveEffectiveSetting } from './resolve-effective-setting';
import { StatusEventsService } from '../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../events/integration-settings-emitter.service';
import type { SettingsGroupId } from './settings-group.tokens';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<string, string>();

  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly prisma: PrismaService,
    private readonly catalog: SettingsCatalogService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  /** Reload all known keys from DB into memory (call after writes). */
  async refreshCache(): Promise<void> {
    const keys = this.catalog.allKeys();
    if (keys.length === 0) {
      this.logger.debug('Settings cache: no keys registered yet');
      return;
    }
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    this.cache.clear();
    for (const row of rows) {
      if (this.catalog.isRegistered(row.key)) {
        this.cache.set(row.key, row.value);
      }
    }
    this.logger.debug(`Settings cache loaded (${this.cache.size} rows)`);
  }

  getEffective(key: string): string {
    const def = this.catalog.getDef(key);
    if (!def) return '';
    const raw = def.envVar ? process.env[def.envVar] : undefined;
    const fromEnv = raw?.trim() || undefined;
    const hasDb = this.cache.has(key);
    const fromDb = hasDb ? this.cache.get(key) : undefined;
    return resolveEffectiveSetting(fromEnv, hasDb, fromDb, def.defaultValue);
  }

  async setValue(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    this.cache.set(key, value);
  }

  /**
   * Validate PATCH body with the partition Zod patch schema, persist, refresh cache, emit events.
   * @throws {@link SettingsPatchError} when validation fails
   */
  async applyGroupPatch(
    groupId: SettingsGroupId,
    body: unknown,
  ): Promise<void> {
    const group = this.catalog.getGroup(groupId);
    const entries = parseSettingsPatchBody(group, body);
    for (const [key, value] of Object.entries(entries)) {
      await this.setValue(key, value);
    }
    await this.notifySettingsUpdatedAfterWrite();
  }

  /**
   * Full reload keeps the cache aligned with SQLite for every catalog key (not only the rows we
   * just upserted), e.g. tests or other code paths may have changed the DB.
   */
  private async notifySettingsUpdatedAfterWrite(): Promise<void> {
    await this.refreshCache();
    await this.integrationEmitter.emitIntegrationSettingsChanged();
    this.statusEvents.emitChanged();
    this.statusEvents.emitScheduleRefresh();
  }

  listEffectiveNonSecret(): Record<string, string> {
    const out: Record<string, string> = {
      source_type: this.appEnv.sourceType,
      destination_type: this.appEnv.destinationType,
    };
    for (const key of this.catalog.allKeys()) {
      out[key] = this.getEffective(key);
    }
    return out;
  }
}
