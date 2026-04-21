import { buildPollScoutContext } from '../poll-scout-context';
import type { SyncPrScoutPort } from '../../../ports/sync-pr-scout.port';
import type { DestinationBoardPort } from '../../../ports/destination-board.port';
import type { SettingsService } from '../../../settings/settings.service';
import type { CoreSettings } from '../../../settings/core-settings.service';

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
    const scoutSpy = jest.fn().mockReturnValue([pr]);
    const prScout: SyncPrScoutPort = {
      listReviewRequestedForMe: scoutSpy,
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
        if (key === 'github_host') {
          return 'github.ol.epicgames.net';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<DestinationBoardPort, 'countActiveIssues'> = {
      countActiveIssues: jest.fn().mockResolvedValue(3),
    };
    const warn = jest.fn();
    const coreSettings: Pick<CoreSettings, 'maxBoardPrCount'> = {
      maxBoardPrCount: 10,
    };

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      coreSettings,
      destinationBoard,
      warn,
    });

    expect(ctx.candidates).toEqual([pr]);
    expect(ctx.urlsNow).toEqual(new Set([pr.url]));
    expect(ctx.boardLimit).toBe(10);
    expect(ctx.activeVkIssueCount).toBe(3);
    expect(ctx.quotaForCreates.remaining).toBe(7);
    expect(ctx.ignoredAuthorLogins.has('bot[bot]')).toBe(true);
    expect(scoutSpy).toHaveBeenCalledWith('github.ol.epicgames.net');
    expect(warn).not.toHaveBeenCalled();
  });

  it('treats active count as 0 when countActiveIssues throws', async () => {
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
        if (key === 'github_host') {
          return 'github.com';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<DestinationBoardPort, 'countActiveIssues'> = {
      countActiveIssues: jest.fn().mockRejectedValue(new Error('network down')),
    };
    const warn = jest.fn();
    const coreSettings: Pick<CoreSettings, 'maxBoardPrCount'> = {
      maxBoardPrCount: 5,
    };

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      coreSettings,
      destinationBoard,
      warn,
    });

    expect(ctx.activeVkIssueCount).toBe(0);
    expect(ctx.quotaForCreates.remaining).toBe(5);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('countActiveIssues failed'),
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
        if (key === 'github_host') {
          return 'github.com';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<DestinationBoardPort, 'countActiveIssues'> = {
      countActiveIssues: jest.fn().mockResolvedValue(0),
    };
    const warn = jest.fn();
    const coreSettings: Pick<CoreSettings, 'maxBoardPrCount'> = {
      maxBoardPrCount: 5,
    };

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      coreSettings,
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
        if (key === 'github_host') {
          return 'github.com';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const destinationBoard: Pick<DestinationBoardPort, 'countActiveIssues'> = {
      countActiveIssues: countSpy,
    };

    const coreSettings: Pick<CoreSettings, 'maxBoardPrCount'> = {
      maxBoardPrCount: 4,
    };

    const ctx = await buildPollScoutContext({
      prScout,
      settings,
      coreSettings,
      destinationBoard,
      warn: jest.fn(),
    });

    expect(countSpy).not.toHaveBeenCalled();
    expect(ctx.activeVkIssueCount).toBe(0);
    expect(ctx.quotaForCreates.remaining).toBe(4);
  });

  it('warns and falls back to github.com when github_host is invalid', async () => {
    const scoutSpy = jest.fn().mockReturnValue([]);
    const prScout: SyncPrScoutPort = {
      listReviewRequestedForMe: scoutSpy,
    };
    const settings = {
      getEffective: (key: string) => {
        if (key === 'max_board_pr_count') {
          return '4';
        }
        if (key === 'default_project_id') {
          return '';
        }
        if (key === 'pr_ignore_author_logins') {
          return '';
        }
        if (key === 'github_host') {
          return 'https://github.com';
        }
        return '';
      },
    } as Pick<SettingsService, 'getEffective'>;
    const warn = jest.fn();

    await buildPollScoutContext({
      prScout,
      settings,
      coreSettings: { maxBoardPrCount: 4 },
      destinationBoard: { countActiveIssues: jest.fn() },
      warn,
    });

    expect(scoutSpy).toHaveBeenCalledWith('github.com');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid github_host'),
    );
  });
});
