import { resolveEffectiveSetting } from './resolve-effective-setting';

describe('resolveEffectiveSetting (§5.3)', () => {
  it('prefers non-empty env over DB and default', () => {
    expect(
      resolveEffectiveSetting('from-env', true, 'from-db', 'default'),
    ).toBe('from-env');
  });

  it('uses DB when env empty string', () => {
    expect(resolveEffectiveSetting('', true, 'from-db', 'default')).toBe(
      'from-db',
    );
  });

  it('uses DB when env undefined', () => {
    expect(resolveEffectiveSetting(undefined, true, 'from-db', 'default')).toBe(
      'from-db',
    );
  });

  it('uses default when no env and no DB row', () => {
    expect(
      resolveEffectiveSetting(undefined, false, undefined, 'default'),
    ).toBe('default');
  });

  it('uses default when no env and DB row missing in cache semantics', () => {
    expect(resolveEffectiveSetting(undefined, false, 'x', 'default')).toBe(
      'default',
    );
  });

  it('allows empty string from DB when row exists', () => {
    expect(resolveEffectiveSetting(undefined, true, '', 'default')).toBe('');
  });
});
