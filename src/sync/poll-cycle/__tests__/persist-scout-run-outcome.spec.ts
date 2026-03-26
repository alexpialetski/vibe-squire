import {
  persistScoutErrorAfterPoll,
  persistScoutSkippedAfterPoll,
} from '../persist-scout-run-outcome';
import { GITHUB_PR_SCOUT_ID } from '../../sync-constants';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { SettingsService } from '../../../settings/settings.service';

describe('persistScoutSkippedAfterPoll', () => {
  it('upserts skip state and marks poll completed', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = { scoutState: { upsert } } as unknown as PrismaService;
    const markPollCompleted = jest.fn();
    const now = new Date('2026-01-15T10:00:00.000Z');
    const next = new Date('2026-01-15T10:15:00.000Z');

    await persistScoutSkippedAfterPoll({
      prisma,
      now,
      computeNextPollAt: () => next,
      reason: 'setup_incomplete',
      markPollCompleted,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scoutId: GITHUB_PR_SCOUT_ID },
        create: expect.objectContaining({
          lastError: 'skipped: setup_incomplete',
          failureStreak: 0,
        }) as unknown,
      }) as unknown,
    );
    expect(markPollCompleted).toHaveBeenCalledTimes(1);
  });
});

describe('persistScoutErrorAfterPoll', () => {
  it('increments streak and upserts error', async () => {
    const findUnique = jest.fn().mockResolvedValue({ failureStreak: 2 });
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      scoutState: { findUnique, upsert },
    } as unknown as PrismaService;
    const settings = {
      getPollIntervalMinutes: () => 5,
      getEffectiveInt: (_k: string, fb: number) => fb,
    } as unknown as SettingsService;
    const markPollCompleted = jest.fn();
    const now = new Date('2026-01-15T10:00:00.000Z');

    await persistScoutErrorAfterPoll({
      prisma,
      now,
      settings,
      message: 'boom',
      markPollCompleted,
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          lastError: 'boom',
          failureStreak: 3,
        }) as unknown,
      }) as unknown,
    );
    expect(markPollCompleted).toHaveBeenCalledTimes(1);
  });
});
