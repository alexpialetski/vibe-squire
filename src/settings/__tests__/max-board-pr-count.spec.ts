import {
  corePatchSchema,
  MAX_BOARD_PR_COUNT_CAP,
} from '../core-settings.schema';

describe('max_board_pr_count (core patch schema)', () => {
  it('rejects empty, zero, non-numeric, and over cap', () => {
    expect(corePatchSchema.safeParse({ max_board_pr_count: '0' }).success).toBe(
      false,
    );
    expect(
      corePatchSchema.safeParse({ max_board_pr_count: '201' }).success,
    ).toBe(false);
    expect(
      corePatchSchema.safeParse({ max_board_pr_count: 'nope' }).success,
    ).toBe(false);
  });

  it('accepts values in range and caps at MAX_BOARD_PR_COUNT_CAP string', () => {
    const r = corePatchSchema.safeParse({ max_board_pr_count: '12' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.max_board_pr_count).toBe('12');
    }
    const cap = corePatchSchema.safeParse({
      max_board_pr_count: String(MAX_BOARD_PR_COUNT_CAP),
    });
    expect(cap.success).toBe(true);
  });
});
