import { resolveMaxBoardPrCount } from '../max-board-pr-count';
import { validateMaxBoardPrCount } from '../core-setting-keys';

describe('resolveMaxBoardPrCount', () => {
  it('returns default for invalid input', () => {
    expect(resolveMaxBoardPrCount('')).toBe(5);
    expect(resolveMaxBoardPrCount('0')).toBe(5);
    expect(resolveMaxBoardPrCount('nope')).toBe(5);
  });

  it('clamps to cap', () => {
    expect(resolveMaxBoardPrCount('999')).toBe(200);
  });

  it('accepts in-range values', () => {
    expect(resolveMaxBoardPrCount('1')).toBe(1);
    expect(resolveMaxBoardPrCount('12')).toBe(12);
  });
});

describe('validateMaxBoardPrCount', () => {
  it('rejects out of range', () => {
    expect(validateMaxBoardPrCount('0')).not.toBeNull();
    expect(validateMaxBoardPrCount('201')).not.toBeNull();
  });

  it('accepts in-range values', () => {
    expect(validateMaxBoardPrCount('1')).toBeNull();
    expect(validateMaxBoardPrCount('5')).toBeNull();
    expect(validateMaxBoardPrCount('200')).toBeNull();
  });
});
