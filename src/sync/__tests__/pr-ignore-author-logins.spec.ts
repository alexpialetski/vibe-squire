import { isIgnoredAuthorLogin } from '../pr-ignore-author-logins';
import {
  prIgnoreAuthorLoginsSchema,
  prIgnoreAuthorLoginsStorageField,
} from '../../integrations/github/github-settings.schema';

describe('prIgnoreAuthorLoginsStorageField', () => {
  it('returns empty parse for empty string', () => {
    const result = prIgnoreAuthorLoginsStorageField.safeParse('');
    expect(result.success).toBe(true);
  });

  it('splits on semicolon and accepts valid logins', () => {
    const result = prIgnoreAuthorLoginsStorageField.safeParse(' Foo ; bar ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(' Foo ; bar ');
    }
  });

  it('rejects a login longer than max length', () => {
    const result = prIgnoreAuthorLoginsStorageField.safeParse('a'.repeat(100));
    expect(result.success).toBe(false);
  });

  it('rejects when raw too long', () => {
    const result = prIgnoreAuthorLoginsStorageField.safeParse('x'.repeat(8001));
    expect(result.success).toBe(false);
  });
});

describe('prIgnoreAuthorLoginsSchema (Set output)', () => {
  it('lower cases for set', () => {
    const r = prIgnoreAuthorLoginsSchema.safeParse('Foo;BAR');
    expect(r.success).toBe(true);
    if (r.success) {
      expect([...r.data].sort()).toEqual(['bar', 'foo']);
    }
  });
});

describe('isIgnoredAuthorLogin', () => {
  it('matches case-insensitive', () => {
    const set = new Set(['dependabot[bot]']);
    expect(isIgnoredAuthorLogin('Dependabot[bot]', set)).toBe(true);
    expect(isIgnoredAuthorLogin('other', set)).toBe(false);
  });
});
