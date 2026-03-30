const exampleCore: Record<string, string> = {
  scheduled_sync_enabled: 'true',
  poll_interval_minutes: '5',
};

/** OpenAPI schema for `PATCH /api/settings/{core|source|destination}` body. */
export const PATCH_SETTINGS_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'string' },
  example: exampleCore,
  description:
    'Key-value map of setting keys to string values for the partition path (`/core`, `/source`, or `/destination`). Source/destination kinds use VIBE_SQUIRE_SOURCE_TYPE / VIBE_SQUIRE_DESTINATION_TYPE at boot.',
} as const;
