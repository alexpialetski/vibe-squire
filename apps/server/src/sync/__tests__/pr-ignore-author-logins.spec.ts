import { isIgnoredAuthorLogin } from '../pr-ignore-author-logins';
import {
  githubHostStorageField,
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

describe('githubHostStorageField', () => {
  it('accepts valid hosts', () => {
    expect(githubHostStorageField.safeParse('github.com').success).toBe(true);
    expect(
      githubHostStorageField.safeParse('github.ol.epicgames.net').success,
    ).toBe(true);
  });

  it('rejects protocol/path values', () => {
    expect(githubHostStorageField.safeParse('https://github.com').success).toBe(
      false,
    );
    expect(githubHostStorageField.safeParse('github.com/path').success).toBe(
      false,
    );
  });
});

describe('isIgnoredAuthorLogin', () => {
  it('matches case-insensitive', () => {
    const set = new Set(['dependabot[bot]']);
    expect(isIgnoredAuthorLogin('Dependabot[bot]', set)).toBe(true);
    expect(isIgnoredAuthorLogin('other', set)).toBe(false);
  });
});
