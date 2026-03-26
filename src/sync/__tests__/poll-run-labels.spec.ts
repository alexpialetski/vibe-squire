import { pollDecisionLabel, pollPhaseLabel } from '../poll-run-labels';

describe('poll-run-labels', () => {
  describe('pollDecisionLabel', () => {
    it('returns empty for non-string', () => {
      expect(pollDecisionLabel(null)).toBe('');
      expect(pollDecisionLabel(undefined)).toBe('');
    });
    it('maps known decisions', () => {
      expect(pollDecisionLabel('created')).toBe('Created Kanban issue');
      expect(pollDecisionLabel('already_tracked')).toBe('Already tracked');
      expect(pollDecisionLabel('skipped_bot')).toBe('Skipped (bot author)');
    });
    it('passes through unknown codes', () => {
      expect(pollDecisionLabel('future_code')).toBe('future_code');
    });
  });

  describe('pollPhaseLabel', () => {
    it('returns empty for non-string', () => {
      expect(pollPhaseLabel(1)).toBe('');
    });
    it('maps known phases', () => {
      expect(pollPhaseLabel('completed')).toBe('Completed');
      expect(pollPhaseLabel('failed')).toBe('Failed');
    });
  });
});
