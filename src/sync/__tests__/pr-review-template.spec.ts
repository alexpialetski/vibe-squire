import { applyPrReviewBodyTemplate } from '../pr-review-template';

describe('applyPrReviewBodyTemplate', () => {
  const pr = {
    number: 7,
    title: 'Fix bug',
    url: 'https://github.com/o/r/pull/7',
    githubRepo: 'o/r',
    createdAt: '2025-01-01T00:00:00Z',
    headRefName: 'fix-bug',
    authorLogin: 'alice',
  };

  it('replaces all placeholders', () => {
    expect(
      applyPrReviewBodyTemplate(
        '{githubRepo}#{number} — {title} see {prUrl}',
        pr,
      ),
    ).toBe('o/r#7 — Fix bug see https://github.com/o/r/pull/7');
  });
});
