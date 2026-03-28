import { corePatchSchema } from '../core-settings.schema';

describe('scheduled_sync_enabled (core patch schema)', () => {
  it('rejects invalid spellings', () => {
    expect(
      corePatchSchema.safeParse({ scheduled_sync_enabled: 'maybe' }).success,
    ).toBe(false);
  });

  it('accepts common boolean strings and normalizes to true/false', () => {
    for (const v of ['true', 'false', '1', '0', 'yes', 'no', 'TRUE']) {
      const r = corePatchSchema.safeParse({ scheduled_sync_enabled: v });
      expect(r.success).toBe(true);
      if (r.success && r.data.scheduled_sync_enabled !== undefined) {
        expect(['true', 'false']).toContain(r.data.scheduled_sync_enabled);
      }
    }
  });
});
