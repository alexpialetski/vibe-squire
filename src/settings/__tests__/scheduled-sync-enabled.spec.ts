import { validateScheduledSyncEnabled } from '../core-setting-keys';

describe('validateScheduledSyncEnabled', () => {
  it('accepts common boolean spellings', () => {
    for (const v of ['true', 'false', '1', '0', 'yes', 'no', 'TRUE', ' No ']) {
      expect(validateScheduledSyncEnabled(v)).toBeNull();
    }
  });

  it('rejects garbage', () => {
    expect(validateScheduledSyncEnabled('maybe')).not.toBeNull();
    expect(validateScheduledSyncEnabled('')).not.toBeNull();
  });
});
