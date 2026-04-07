import type { PrismaService } from '../prisma/prisma.service';

export type TriageLiveState = {
  acceptedPrUrls: ReadonlySet<string>;
  declinedPrUrls: ReadonlySet<string>;
};

const EMPTY: TriageLiveState = {
  acceptedPrUrls: new Set(),
  declinedPrUrls: new Set(),
};

/**
 * For a given set of PR URLs, fetch which ones have been accepted (SyncedPullRequest)
 * or declined (DeclinedPullRequest). Used by both the Activity API and the status snapshot.
 */
export async function fetchTriageLiveState(
  prisma: PrismaService,
  prUrls: ReadonlySet<string>,
): Promise<TriageLiveState> {
  if (prUrls.size === 0) return EMPTY;
  const urls = [...prUrls];
  const [synced, declined] = await Promise.all([
    prisma.syncedPullRequest.findMany({
      where: { prUrl: { in: urls } },
      select: { prUrl: true },
    }),
    prisma.declinedPullRequest.findMany({
      where: { prUrl: { in: urls } },
      select: { prUrl: true },
    }),
  ]);
  return {
    acceptedPrUrls: new Set(synced.map((r) => r.prUrl)),
    declinedPrUrls: new Set(declined.map((r) => r.prUrl)),
  };
}
