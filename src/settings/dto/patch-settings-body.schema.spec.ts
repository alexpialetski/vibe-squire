import { patchSettingsBodySchema } from './patch-settings-body.schema';

describe('patchSettingsBodySchema', () => {
  it('accepts empty object', () => {
    expect(patchSettingsBodySchema.safeParse({}).success).toBe(true);
  });

  it('rejects unknown key', () => {
    const r = patchSettingsBodySchema.safeParse({ not_a_key: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects non-string value', () => {
    const r = patchSettingsBodySchema.safeParse({
      poll_interval_minutes: 5,
    } as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it('rejects invalid pr_ignore_author_logins', () => {
    const r = patchSettingsBodySchema.safeParse({
      pr_ignore_author_logins: 'x'.repeat(9000),
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid max_board_pr_count', () => {
    expect(
      patchSettingsBodySchema.safeParse({ max_board_pr_count: '0' }).success,
    ).toBe(false);
    expect(
      patchSettingsBodySchema.safeParse({ max_board_pr_count: '201' }).success,
    ).toBe(false);
  });

  it('accepts valid max_board_pr_count', () => {
    expect(
      patchSettingsBodySchema.safeParse({ max_board_pr_count: '5' }).success,
    ).toBe(true);
  });

  it('rejects invalid scheduled_sync_enabled', () => {
    expect(
      patchSettingsBodySchema.safeParse({ scheduled_sync_enabled: 'maybe' })
        .success,
    ).toBe(false);
  });

  it('accepts scheduled_sync_enabled booleans', () => {
    for (const v of ['true', 'false', '1', '0', 'yes', 'no', 'TRUE']) {
      expect(
        patchSettingsBodySchema.safeParse({ scheduled_sync_enabled: v })
          .success,
      ).toBe(true);
    }
  });
});
