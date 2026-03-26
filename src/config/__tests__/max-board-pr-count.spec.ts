import {
  isValidMaxBoardPrCountInput,
  resolveMaxBoardPrCount,
} from '../max-board-pr-count';

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

describe('isValidMaxBoardPrCountInput', () => {
  it('rejects out of range', () => {
    expect(isValidMaxBoardPrCountInput('0')).toBe(false);
    expect(isValidMaxBoardPrCountInput('201')).toBe(false);
  });
});
