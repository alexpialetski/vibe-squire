import {
  formatPollSuccessLog,
  upsertScoutStateAfterSuccessfulPoll,
} from '../finalize-successful-poll-cycle';
import { GITHUB_PR_SCOUT_ID } from '../../sync-constants';
import type { PrismaService } from '../../../prisma/prisma.service';

describe('formatPollSuccessLog', () => {
  it('includes skip breakdown when any skip category is non-zero', () => {
    expect(
      formatPollSuccessLog('manual', {
        candidatesLength: 3,
        created: 1,
        skippedUnmapped: 0,
        skippedBot: 2,
        skippedBoardLimit: 0,
        skippedTriage: 0,
        skippedDeclined: 0,
      }),
    ).toContain('2 bot');
  });

  it('uses short line when no skips', () => {
    expect(
      formatPollSuccessLog('scheduled', {
        candidatesLength: 2,
        created: 2,
        skippedUnmapped: 0,
        skippedBot: 0,
        skippedBoardLimit: 0,
        skippedTriage: 0,
        skippedDeclined: 0,
      }),
    ).toBe('Sync (scheduled): 2 PR(s), 2 created');
  });

  it('includes triage and declined counts', () => {
    const msg = formatPollSuccessLog('manual', {
      candidatesLength: 5,
      created: 0,
      skippedUnmapped: 0,
      skippedBot: 0,
      skippedBoardLimit: 0,
      skippedTriage: 3,
      skippedDeclined: 2,
    });
    expect(msg).toContain('3 pending triage');
    expect(msg).toContain('2 declined');
  });
});

describe('upsertScoutStateAfterSuccessfulPoll', () => {
  it('upserts scout row with success stats', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      scoutState: { upsert },
    } as unknown as PrismaService;
    const now = new Date('2026-06-01T12:00:00.000Z');
    const next = new Date('2026-06-01T12:30:00.000Z');

    await upsertScoutStateAfterSuccessfulPoll({
      prisma,
      now,
      computeNextPollAt: () => next,
      candidatesCount: 5,
      skippedUnmapped: 2,
      issuesCreated: 1,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
      create: expect.objectContaining({
        scoutId: GITHUB_PR_SCOUT_ID,
        lastPollAt: now,
        nextPollAt: next,
        lastError: null,
        failureStreak: 0,
        lastPollCandidatesCount: 5,
        lastPollSkippedUnmapped: 2,
        lastPollIssuesCreated: 1,
      }) as unknown,
      update: expect.objectContaining({
        lastPollCandidatesCount: 5,
        lastPollSkippedUnmapped: 2,
        lastPollIssuesCreated: 1,
      }) as unknown,
    });
  });
});
