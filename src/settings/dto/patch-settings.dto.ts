import { SETTING_KEYS } from '../../config/setting-keys';

const example: Record<string, string> = {
  source_type: 'github',
  destination_type: 'vibe_kanban',
  poll_interval_minutes: '5',
};

/** OpenAPI schema for `PATCH /api/settings` body. */
export const PATCH_SETTINGS_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'string' },
  example,
  description: `Known keys: ${SETTING_KEYS.join(', ')}`,
} as const;
