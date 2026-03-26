import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POLL_RUN_PHASE } from './poll-run-decisions';

const DEFAULT_RETAIN_RUNS = 100;

@Injectable()
export class PollRunHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async beginRun(trigger: 'scheduled' | 'manual'): Promise<string> {
    const row = await this.prisma.pollRun.create({
      data: {
        trigger,
        phase: POLL_RUN_PHASE.running,
      },
    });
    return row.id;
  }

  async appendItem(
    runId: string,
    data: {
      prUrl: string;
      githubRepo: string;
      prNumber: number;
      prTitle: string;
      authorLogin?: string | null;
      decision: string;
      detail?: string | null;
      kanbanIssueId?: string | null;
    },
  ): Promise<void> {
    await this.prisma.pollRunItem.create({
      data: {
        runId,
        prUrl: data.prUrl,
        githubRepo: data.githubRepo,
        prNumber: data.prNumber,
        prTitle: truncateTitle(data.prTitle),
        authorLogin: data.authorLogin?.trim() || null,
        decision: data.decision,
        detail: data.detail?.trim() || null,
        kanbanIssueId: data.kanbanIssueId?.trim() || null,
      },
    });
  }

  async completeSuccess(
    runId: string,
    summary: {
      candidatesCount: number;
      issuesCreated: number;
      skippedUnmapped: number;
      skippedBot: number;
      skippedBoardLimit: number;
      skippedAlreadyTracked: number;
      skippedLinkedExisting: number;
    },
  ): Promise<void> {
    const finishedAt = new Date();
    await this.prisma.pollRun.update({
      where: { id: runId },
      data: {
        finishedAt,
        phase: POLL_RUN_PHASE.completed,
        candidatesCount: summary.candidatesCount,
        issuesCreated: summary.issuesCreated,
        skippedUnmapped: summary.skippedUnmapped,
        skippedBot: summary.skippedBot,
        skippedBoardLimit: summary.skippedBoardLimit,
        skippedAlreadyTracked: summary.skippedAlreadyTracked,
        skippedLinkedExisting: summary.skippedLinkedExisting,
      },
    });
    await this.pruneOldRuns(DEFAULT_RETAIN_RUNS);
  }

  async completeAborted(runId: string, abortReason: string): Promise<void> {
    const finishedAt = new Date();
    await this.prisma.pollRun.update({
      where: { id: runId },
      data: {
        finishedAt,
        phase: POLL_RUN_PHASE.aborted,
        abortReason,
      },
    });
    await this.pruneOldRuns(DEFAULT_RETAIN_RUNS);
  }

  async completeFailed(runId: string, errorMessage: string): Promise<void> {
    const finishedAt = new Date();
    await this.prisma.pollRun.update({
      where: { id: runId },
      data: {
        finishedAt,
        phase: POLL_RUN_PHASE.failed,
        errorMessage,
      },
    });
    await this.pruneOldRuns(DEFAULT_RETAIN_RUNS);
  }

  /**
   * Keep the newest `keepCount` runs; delete older rows (items cascade).
   */
  async pruneOldRuns(keepCount: number): Promise<void> {
    const keep = await this.prisma.pollRun.findMany({
      select: { id: true },
      orderBy: { startedAt: 'desc' },
      take: keepCount,
    });
    const keepIds = new Set(keep.map((r) => r.id));
    if (keepIds.size === 0) {
      return;
    }
    await this.prisma.pollRun.deleteMany({
      where: { id: { notIn: [...keepIds] } },
    });
  }

  listRecentForUi(limit: number) {
    return this.prisma.pollRun.findMany({
      where: { phase: { not: POLL_RUN_PHASE.running } },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        items: {
          orderBy: [{ githubRepo: 'asc' }, { prNumber: 'asc' }],
        },
      },
    });
  }
}

function truncateTitle(s: string, max = 480): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}
