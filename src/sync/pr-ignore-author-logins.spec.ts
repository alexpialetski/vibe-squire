import {
  isIgnoredAuthorLogin,
  parsePrIgnoreAuthorLogins,
} from './pr-ignore-author-logins';

describe('parsePrIgnoreAuthorLogins', () => {
  it('returns empty set for empty string', () => {
    const r = parsePrIgnoreAuthorLogins('');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.set.size).toBe(0);
    }
  });

  it('splits on semicolon and lowercases', () => {
    const r = parsePrIgnoreAuthorLogins(' Foo ; bar ');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect([...r.set].sort()).toEqual(['bar', 'foo']);
    }
  });

  it('treats consecutive semicolons as extra delimiters (empty tokens dropped)', () => {
    const r = parsePrIgnoreAuthorLogins('a;;b');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect([...r.set].sort()).toEqual(['a', 'b']);
    }
  });

  it('rejects a login longer than max length', () => {
    const r = parsePrIgnoreAuthorLogins('a'.repeat(100));
    expect(r.ok).toBe(false);
  });

  it('rejects when raw too long', () => {
    const r = parsePrIgnoreAuthorLogins('x'.repeat(8001));
    expect(r.ok).toBe(false);
  });
});

describe('isIgnoredAuthorLogin', () => {
  it('matches case-insensitive', () => {
    const set = new Set(['dependabot[bot]']);
    expect(isIgnoredAuthorLogin('Dependabot[bot]', set)).toBe(true);
    expect(isIgnoredAuthorLogin('other', set)).toBe(false);
  });
});
