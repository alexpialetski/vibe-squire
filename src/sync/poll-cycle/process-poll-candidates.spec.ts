import { processPollCandidatesLoop } from './process-poll-candidates';
import { POLL_RUN_ITEM_DECISION } from '../poll-run-decisions';
import type { GithubPrCandidate } from '../../scout/github-pr-scout.service';
import type { VkCreateQuota } from './poll-scout-context';

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

describe('processPollCandidatesLoop', () => {
  it('skips bot authors and records skipped_bot', async () => {
    const appendItem = jest.fn().mockResolvedValue(undefined);
    const quota: VkCreateQuota = { remaining: 5 };
    const summary = await processPollCandidatesLoop({
      runId: 'run-1',
      candidates: [pr(1, 'dependabot[bot]')],
      ignoredAuthorLogins: new Set(['dependabot[bot]']),
      quotaForCreates: quota,
      boardLimit: 5,
      activeVkIssueCount: 0,
      appendItem,
      ensureIssueForPr: jest.fn(),
    });

    expect(summary.skippedBot).toBe(1);
    expect(appendItem).toHaveBeenCalledWith(
      'run-1',
      expect.anything(),
      POLL_RUN_ITEM_DECISION.skippedBot,
      expect.objectContaining({
        detail: expect.stringContaining('dependabot'),
      }),
    );
    expect(quota.remaining).toBe(5);
  });

  it('records board_limit when ensure returns skipped_board_limit', async () => {
    const appendItem = jest.fn().mockResolvedValue(undefined);
    const summary = await processPollCandidatesLoop({
      runId: 'r',
      candidates: [pr(2)],
      ignoredAuthorLogins: new Set(),
      quotaForCreates: { remaining: 0 },
      boardLimit: 3,
      activeVkIssueCount: 3,
      appendItem,
      ensureIssueForPr: jest
        .fn()
        .mockResolvedValue({ kind: 'skipped_board_limit' as const }),
    });

    expect(summary.skippedBoardLimit).toBe(1);
    expect(appendItem).toHaveBeenCalledWith(
      'r',
      expect.anything(),
      POLL_RUN_ITEM_DECISION.skippedBoardLimit,
      expect.objectContaining({
        detail: expect.stringContaining('Board limit 3'),
      }),
    );
  });

  it('aggregates created, unmapped, already_tracked, linked_existing', async () => {
    const appendItem = jest.fn().mockResolvedValue(undefined);
    const ensureIssueForPr = jest
      .fn()
      .mockResolvedValueOnce({ kind: 'created', kanbanIssueId: 'i1' })
      .mockResolvedValueOnce({ kind: 'skipped_unmapped' as const })
      .mockResolvedValueOnce({
        kind: 'already_tracked',
        kanbanIssueId: 'i2',
      })
      .mockResolvedValueOnce({
        kind: 'linked_existing',
        kanbanIssueId: 'i3',
      });

    const quota: VkCreateQuota = { remaining: 9 };
    const summary = await processPollCandidatesLoop({
      runId: 'r',
      candidates: [pr(10), pr(11), pr(12), pr(13)],
      ignoredAuthorLogins: new Set(),
      quotaForCreates: quota,
      boardLimit: 5,
      activeVkIssueCount: 0,
      appendItem,
      ensureIssueForPr,
    });

    expect(summary).toEqual({
      created: 1,
      skippedUnmapped: 1,
      skippedBot: 0,
      skippedBoardLimit: 0,
      skippedAlreadyTracked: 1,
      skippedLinkedExisting: 1,
    });
    expect(appendItem).toHaveBeenCalledTimes(4);
  });
});
