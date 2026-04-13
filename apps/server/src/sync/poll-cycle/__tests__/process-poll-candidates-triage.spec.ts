import { processPollCandidatesLoop } from '../process-poll-candidates';
import { POLL_RUN_ITEM_DECISION } from '../../poll-run-decisions';
import type { GithubPrCandidate } from '../../../ports/github-pr-candidate';
import type { VkCreateQuota } from '../poll-scout-context';

function pr(n: number, author = 'human'): GithubPrCandidate {
  return {
    number: n,
    title: `PR ${n}`,
    url: `https://github.com/o/r/pull/${n}`,
    githubRepo: 'o/r',
    createdAt: '2026-01-01T00:00:00Z',
    headRefName: 'main',
    authorLogin: author,
  };
}

describe('processPollCandidatesLoop (triage)', () => {
  it('counts skipped_triage outcomes', async () => {
    const appendItem = jest.fn().mockResolvedValue(undefined);
    const quota: VkCreateQuota = { remaining: 5 };
    const summary = await processPollCandidatesLoop({
      runId: 'r',
      candidates: [pr(1), pr(2)],
      ignoredAuthorLogins: new Set(),
      quotaForCreates: quota,
      boardLimit: 5,
      activeVkIssueCount: 0,
      appendItem,
      ensureIssueForPr: jest
        .fn()
        .mockResolvedValue({ kind: 'skipped_triage' as const }),
    });

    expect(summary.skippedTriage).toBe(2);
    expect(summary.skippedDeclined).toBe(0);
    expect(appendItem).toHaveBeenCalledTimes(2);
    expect(appendItem).toHaveBeenCalledWith(
      'r',
      expect.anything(),
      POLL_RUN_ITEM_DECISION.skippedTriage,
      expect.objectContaining({
        detail: expect.stringContaining('Triage mode') as unknown,
      }) as unknown,
    );
  });

  it('counts skipped_declined outcomes', async () => {
    const appendItem = jest.fn().mockResolvedValue(undefined);
    const summary = await processPollCandidatesLoop({
      runId: 'r',
      candidates: [pr(3)],
      ignoredAuthorLogins: new Set(),
      quotaForCreates: { remaining: 5 },
      boardLimit: 5,
      activeVkIssueCount: 0,
      appendItem,
      ensureIssueForPr: jest
        .fn()
        .mockResolvedValue({ kind: 'skipped_declined' as const }),
    });

    expect(summary.skippedDeclined).toBe(1);
    expect(appendItem).toHaveBeenCalledWith(
      'r',
      expect.anything(),
      POLL_RUN_ITEM_DECISION.skippedDeclined,
      expect.objectContaining({
        detail: expect.stringContaining('Declined') as unknown,
      }) as unknown,
    );
  });
});
