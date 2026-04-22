import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POLL_RUN_ITEM_DECISION } from '../sync/poll-run-decisions';
import { PollRunHistoryService } from '../sync/poll-run-history.service';
import { pollDecisionLabel } from '../sync/poll-run-labels';
import { fetchTriageLiveState } from '../sync/triage-live-state.queries';
import { presentActivityRunsForView } from './ui-presenter';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export type ActivityCursor = { startedAt: string; id: string };

type PresentedActivityItem = {
  id: string;
  prUrl: string;
  githubRepo: string;
  prNumber: number;
  prTitle: string;
  authorLogin: string | null;
  decision: string;
  effectiveDecision: string;
  decisionLabel: string;
  detail: string | null;
  kanbanIssueId: string | null;
};

const TRIAGE_DECISIONS = new Set<string>([
  POLL_RUN_ITEM_DECISION.skippedTriage,
  POLL_RUN_ITEM_DECISION.skippedBoardLimit,
]);

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

  async findPresentedItemByPrUrl(
    prUrl: string,
  ): Promise<PresentedActivityItem | null> {
    const item = await this.prisma.pollRunItem.findFirst({
      where: { prUrl },
      orderBy: [{ run: { startedAt: 'desc' } }, { id: 'desc' }],
    });
    if (!item) {
      return null;
    }

    const live = await fetchTriageLiveState(this.prisma, new Set([prUrl]));
    const synced = await this.prisma.syncedPullRequest.findUnique({
      where: { prUrl },
      select: { kanbanIssueId: true },
    });
    const effectiveDecision = resolveEffectiveDecision(item.decision, prUrl, {
      acceptedPrUrls: live.acceptedPrUrls,
      declinedPrUrls: live.declinedPrUrls,
    });
    const kanbanIssueId =
      effectiveDecision === POLL_RUN_ITEM_DECISION.linkedExisting
        ? (synced?.kanbanIssueId ?? item.kanbanIssueId)
        : item.kanbanIssueId;

    return {
      id: prUrl,
      prUrl: item.prUrl,
      githubRepo: item.githubRepo,
      prNumber: item.prNumber,
      prTitle: item.prTitle,
      authorLogin: item.authorLogin,
      decision: item.decision,
      effectiveDecision,
      decisionLabel: pollDecisionLabel(effectiveDecision),
      detail: item.detail,
      kanbanIssueId: kanbanIssueId ?? null,
    };
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

function resolveEffectiveDecision(
  decision: string,
  prUrl: string,
  live: {
    acceptedPrUrls: ReadonlySet<string>;
    declinedPrUrls: ReadonlySet<string>;
  },
): string {
  if (!TRIAGE_DECISIONS.has(decision)) return decision;
  if (live.acceptedPrUrls.has(prUrl))
    return POLL_RUN_ITEM_DECISION.linkedExisting;
  if (live.declinedPrUrls.has(prUrl))
    return POLL_RUN_ITEM_DECISION.skippedDeclined;
  return decision;
}
