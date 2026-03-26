import type { PrismaService } from '../../prisma/prisma.service';
import type { SettingsService } from '../../settings/settings.service';
import { GITHUB_PR_SCOUT_ID } from '../sync-constants';
import { computeErrorNextPollAt } from '../poll-backoff';

const nullPollStats = {
  lastPollCandidatesCount: null,
  lastPollSkippedUnmapped: null,
  lastPollIssuesCreated: null,
};

/**
 * Poll aborted early (setup, gh, etc.): record skip reason on scout state and mark poll clock.
 */
export async function persistScoutSkippedAfterPoll(deps: {
  prisma: PrismaService;
  now: Date;
  computeNextPollAt: (from: Date) => Date;
  reason: string;
  markPollCompleted: () => void;
}): Promise<void> {
  const nextPollAt = deps.computeNextPollAt(deps.now);
  const lastError = `skipped: ${deps.reason}`;
  await deps.prisma.scoutState.upsert({
    where: { scoutId: GITHUB_PR_SCOUT_ID },
    create: {
      scoutId: GITHUB_PR_SCOUT_ID,
      lastPollAt: deps.now,
      nextPollAt,
      lastError,
      failureStreak: 0,
      ...nullPollStats,
    },
    update: {
      lastPollAt: deps.now,
      nextPollAt,
      lastError,
      failureStreak: 0,
      ...nullPollStats,
    },
  });
  deps.markPollCompleted();
}

/**
 * Poll failed: increment failure streak, backoff `nextPollAt`, persist error text.
 */
export async function persistScoutErrorAfterPoll(deps: {
  prisma: PrismaService;
  now: Date;
  settings: SettingsService;
  message: string;
  markPollCompleted: () => void;
}): Promise<void> {
  const row = await deps.prisma.scoutState.findUnique({
    where: { scoutId: GITHUB_PR_SCOUT_ID },
  });
  const streak = (row?.failureStreak ?? 0) + 1;
  const nextPollAt = computeErrorNextPollAt(deps.now, streak, deps.settings);
  await deps.prisma.scoutState.upsert({
    where: { scoutId: GITHUB_PR_SCOUT_ID },
    create: {
      scoutId: GITHUB_PR_SCOUT_ID,
      lastPollAt: deps.now,
      nextPollAt,
      lastError: deps.message,
      failureStreak: streak,
      ...nullPollStats,
    },
    update: {
      lastPollAt: deps.now,
      nextPollAt,
      lastError: deps.message,
      failureStreak: streak,
      ...nullPollStats,
    },
  });
  deps.markPollCompleted();
}
