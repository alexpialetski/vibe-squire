import { buildPollScoutContext } from './poll-scout-context';
import type { SyncPrScoutPort } from '../../ports/sync-pr-scout.port';
import type { SyncDestinationBoardPort } from '../../ports/sync-destination-board.port';
import type { SettingsService } from '../../settings/settings.service';

const pr = {
  number: 1,
  title: 'T',
  url: 'https://github.com/o/r/pull/1',
  githubRepo: 'o/r',
  createdAt: '2026-01-01T00:00:00Z',
  headRefName: 'main',
  authorLogin: 'u',
};

describe('buildPollScoutContext', () => {
  it('builds urlsNow, quota from board limit minus active count, and parsed ignore set', async () => {
    const prScout: SyncPrScoutPort = {
      listReviewRequestedForMe: () => [pr],
    };
    const settings = {
      getEffective: (key: string) => {
        if (key === 'max_board_pr_count') {
          return '10';
        }
        if (key === 'default_project_id') {
          return 'proj-1';
        }
        if (key === 'pr_ignore_author_logins') {
          return 'bot[bot]';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<
      SyncDestinationBoardPort,
      'countActiveVibeSquireIssues'
    > = {
      countActiveVibeSquireIssues: jest.fn().mockResolvedValue(3),
    };
    const warn = jest.fn();

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      destinationBoard,
      warn,
    });

    expect(ctx.candidates).toEqual([pr]);
    expect(ctx.urlsNow).toEqual(new Set([pr.url]));
    expect(ctx.boardLimit).toBe(10);
    expect(ctx.activeVkIssueCount).toBe(3);
    expect(ctx.quotaForCreates.remaining).toBe(7);
    expect(ctx.ignoredAuthorLogins.has('bot[bot]')).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('treats active count as 0 when countActiveVibeSquireIssues throws', async () => {
    const prScout: SyncPrScoutPort = {
      listReviewRequestedForMe: () => [],
    };
    const settings = {
      getEffective: (key: string) => {
        if (key === 'max_board_pr_count') {
          return '5';
        }
        if (key === 'default_project_id') {
          return 'p';
        }
        if (key === 'pr_ignore_author_logins') {
          return '';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<
      SyncDestinationBoardPort,
      'countActiveVibeSquireIssues'
    > = {
      countActiveVibeSquireIssues: jest
        .fn()
        .mockRejectedValue(new Error('network down')),
    };
    const warn = jest.fn();

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      destinationBoard,
      warn,
    });

    expect(ctx.activeVkIssueCount).toBe(0);
    expect(ctx.quotaForCreates.remaining).toBe(5);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('countActiveVibeSquireIssues failed'),
    );
  });

  it('warns and uses empty ignore set when pr_ignore_author_logins is invalid', async () => {
    const prScout: SyncPrScoutPort = {
      listReviewRequestedForMe: () => [],
    };
    const settings = {
      getEffective: (key: string) => {
        if (key === 'max_board_pr_count') {
          return '5';
        }
        if (key === 'default_project_id') {
          return '';
        }
        if (key === 'pr_ignore_author_logins') {
          return 'a'.repeat(100);
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<
      SyncDestinationBoardPort,
      'countActiveVibeSquireIssues'
    > = {
      countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
    };
    const warn = jest.fn();

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      destinationBoard,
      warn,
    });

    expect(ctx.ignoredAuthorLogins.size).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid pr_ignore_author_logins'),
    );
  });

  it('skips count when default_project_id is empty', async () => {
    const countSpy = jest.fn();
    const prScout: SyncPrScoutPort = {
      listReviewRequestedForMe: () => [],
    };
    const settings = {
      getEffective: (key: string) => {
        if (key === 'max_board_pr_count') {
          return '4';
        }
        if (key === 'default_project_id') {
          return '  ';
        }
        if (key === 'pr_ignore_author_logins') {
          return '';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<
      SyncDestinationBoardPort,
      'countActiveVibeSquireIssues'
    > = {
      countActiveVibeSquireIssues: countSpy,
    };

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      destinationBoard,
      warn: jest.fn(),
    });

    expect(countSpy).not.toHaveBeenCalled();
    expect(ctx.activeVkIssueCount).toBe(0);
    expect(ctx.quotaForCreates.remaining).toBe(4);
  });
});
