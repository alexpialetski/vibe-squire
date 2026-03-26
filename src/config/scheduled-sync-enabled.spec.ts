import { isValidScheduledSyncEnabledInput } from './scheduled-sync-enabled';

describe('isValidScheduledSyncEnabledInput', () => {
  it('accepts common boolean spellings', () => {
    for (const v of ['true', 'false', '1', '0', 'yes', 'no', 'TRUE', ' No ']) {
      expect(isValidScheduledSyncEnabledInput(v)).toBe(true);
    }
  });

  it('rejects garbage', () => {
    expect(isValidScheduledSyncEnabledInput('maybe')).toBe(false);
    expect(isValidScheduledSyncEnabledInput('')).toBe(false);
  });
});
