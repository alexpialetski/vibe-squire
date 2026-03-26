import type { PrismaService } from '../../prisma/prisma.service';
import { GITHUB_PR_SCOUT_ID } from '../sync-constants';

/**
 * Successful poll: clear scout error, reset streak, store last stats for status UI.
 */
export async function upsertScoutStateAfterSuccessfulPoll(deps: {
  prisma: PrismaService;
  now: Date;
  computeNextPollAt: (from: Date) => Date;
  candidatesCount: number;
  skippedUnmapped: number;
  issuesCreated: number;
}): Promise<void> {
  const nextPollAt = deps.computeNextPollAt(deps.now);
  await deps.prisma.scoutState.upsert({
    where: { scoutId: GITHUB_PR_SCOUT_ID },
    create: {
      scoutId: GITHUB_PR_SCOUT_ID,
      lastPollAt: deps.now,
      nextPollAt,
      lastError: null,
      failureStreak: 0,
      lastPollCandidatesCount: deps.candidatesCount,
      lastPollSkippedUnmapped: deps.skippedUnmapped,
      lastPollIssuesCreated: deps.issuesCreated,
    },
    update: {
      lastPollAt: deps.now,
      nextPollAt,
      lastError: null,
      failureStreak: 0,
      lastPollCandidatesCount: deps.candidatesCount,
      lastPollSkippedUnmapped: deps.skippedUnmapped,
      lastPollIssuesCreated: deps.issuesCreated,
    },
  });
}

export function formatPollSuccessLog(
  trigger: 'scheduled' | 'manual',
  p: {
    candidatesLength: number;
    created: number;
    skippedUnmapped: number;
    skippedBot: number;
    skippedBoardLimit: number;
  },
): string {
  if (p.skippedUnmapped > 0 || p.skippedBot > 0 || p.skippedBoardLimit > 0) {
    return `Sync (${trigger}): ${p.candidatesLength} PR(s), ${p.created} created, ${p.skippedUnmapped} skipped (unmapped), ${p.skippedBot} skipped (bot), ${p.skippedBoardLimit} skipped (board limit)`;
  }
  return `Sync (${trigger}): ${p.candidatesLength} PR(s), ${p.created} created`;
}
