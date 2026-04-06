import {
  corePatchSchema,
  CORE_STORAGE_DEFAULTS,
  coreRuntimeSchema,
} from '../core-settings.schema';

describe('auto_create_issues (core setting)', () => {
  it('defaults to true', () => {
    expect(CORE_STORAGE_DEFAULTS.auto_create_issues).toBe('true');
    const runtime = coreRuntimeSchema.parse(CORE_STORAGE_DEFAULTS);
    expect(runtime.auto_create_issues).toBe(true);
  });

  it('accepts boolean strings and normalizes to true/false', () => {
    for (const v of ['true', 'false', '1', '0', 'yes', 'no']) {
      const r = corePatchSchema.safeParse({ auto_create_issues: v });
      expect(r.success).toBe(true);
      if (r.success && r.data.auto_create_issues !== undefined) {
        expect(['true', 'false']).toContain(r.data.auto_create_issues);
      }
    }
  });

  it('rejects non-boolean strings', () => {
    expect(
      corePatchSchema.safeParse({ auto_create_issues: 'maybe' }).success,
    ).toBe(false);
  });
});
