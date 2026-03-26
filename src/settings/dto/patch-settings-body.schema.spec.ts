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
});
