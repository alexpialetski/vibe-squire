import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PollRunHistoryService } from '../sync/poll-run-history.service';
import { fetchTriageLiveState } from '../sync/triage-live-state.queries';
import { presentActivityRunsForView } from './ui-presenter';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export type ActivityCursor = { startedAt: string; id: string };

function encodeCursor(c: ActivityCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): ActivityCursor {
  const json = Buffer.from(raw, 'base64url').toString('utf8');
  const parsed = JSON.parse(json) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as ActivityCursor).startedAt !== 'string' ||
    typeof (parsed as ActivityCursor).id !== 'string'
  ) {
    throw new Error('invalid_cursor');
  }
  return parsed as ActivityCursor;
}

@Injectable()
export class ActivityUiService {
  constructor(
    private readonly pollRunHistory: PollRunHistoryService,
    private readonly prisma: PrismaService,
  ) {}

  async listPresentedRuns(limitRaw?: number) {
    let limit = DEFAULT_LIMIT;
    if (limitRaw !== undefined && Number.isFinite(limitRaw)) {
      limit = Math.min(Math.max(1, limitRaw), MAX_LIMIT);
    }
    const rows = await this.pollRunHistory.listRecentForUi(limit);
    const allPrUrls = new Set(rows.flatMap((r) => r.items.map((i) => i.prUrl)));
    const live = await fetchTriageLiveState(this.prisma, allPrUrls);
    return presentActivityRunsForView(rows, live);
  }

  /**
   * Relay-style forward pagination over runs ordered newest-first.
   */
  async listPresentedRunsConnection(firstRaw: number, after: string | null) {
    let first = DEFAULT_LIMIT;
    if (Number.isFinite(firstRaw) && firstRaw > 0) {
      first = Math.min(firstRaw, MAX_LIMIT);
    }

    let cursor: ActivityCursor | null = null;
    if (after) {
      try {
        cursor = decodeCursor(after);
      } catch {
        cursor = null;
      }
    }

    const take = first + 1;
    const rows = await this.prisma.pollRun.findMany({
      where: cursor
        ? {
            OR: [
              { startedAt: { lt: new Date(cursor.startedAt) } },
              {
                AND: [
                  { startedAt: new Date(cursor.startedAt) },
                  { id: { lt: cursor.id } },
                ],
              },
            ],
          }
        : undefined,
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take,
      include: {
        items: {
          orderBy: [{ githubRepo: 'asc' }, { prNumber: 'asc' }],
        },
      },
    });

    const allPrUrls = new Set(rows.flatMap((r) => r.items.map((i) => i.prUrl)));
    const live = await fetchTriageLiveState(this.prisma, allPrUrls);
    const presented = presentActivityRunsForView(rows, live);

    const hasNextPage = presented.length > first;
    const nodes = hasNextPage ? presented.slice(0, first) : presented;
    const last = nodes[nodes.length - 1];
    const endCursor = last
      ? encodeCursor({ startedAt: last.startedAt, id: last.id })
      : null;

    return {
      nodes,
      hasNextPage,
      endCursor,
    };
  }
}
