import { SETTING_KEYS } from '../setting-keys';

const example: Record<string, string> = {
  scheduled_sync_enabled: 'true',
  poll_interval_minutes: '5',
};

/** OpenAPI schema for `PATCH /api/settings` body. */
export const PATCH_SETTINGS_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'string' },
  example,
  description: `Persisted keys: ${SETTING_KEYS.join(', ')}. Source/destination use SOURCE_TYPE / DESTINATION_TYPE env at boot.`,
} as const;
