import type { z } from 'zod';
import type { SettingDefinition } from './setting-definition';
import type { SettingsGroupId } from './settings-group.tokens';

/**
 * One settings partition: Zod storage schema + env key map (defaults from `storageSchema.parse({})`).
 */
export abstract class SettingsGroupBase {
  abstract readonly groupId: SettingsGroupId;
  abstract readonly storageSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  /** Env var names for keys that support operator overrides */
  abstract readonly envKeys: Readonly<Partial<Record<string, string>>>;

  private patchSchemaCache: z.ZodTypeAny | null = null;
  private defaultsCache: Record<string, string> | null = null;

  get patchSchema(): z.ZodTypeAny {
    if (!this.patchSchemaCache) {
      this.patchSchemaCache = this.storageSchema.partial().strict();
    }
    return this.patchSchemaCache;
  }

  /** Code defaults for every key (from Zod `.default()` on each field). */
  get storageDefaults(): Record<string, string> {
    if (!this.defaultsCache) {
      this.defaultsCache = this.storageSchema.parse({}) as Record<
        string,
        string
      >;
    }
    return this.defaultsCache;
  }

  allKeys(): string[] {
    return Object.keys(this.storageSchema.shape);
  }

  isOwned(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(
      this.storageSchema.shape,
      key,
    ) as boolean;
  }

  getDef(key: string): SettingDefinition | undefined {
    if (!this.isOwned(key)) return undefined;
    return {
      envVar: this.envKeys[key],
      defaultValue: this.storageDefaults[key] ?? '',
    };
  }
}
