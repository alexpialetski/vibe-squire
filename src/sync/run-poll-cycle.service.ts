import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CoreSettings } from '../settings/core-settings.service';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { StatusEventsService } from '../events/status-events.service';
import {
  SOURCE_STATUS_PORT,
  SYNC_DESTINATION_BOARD_PORT,
  SYNC_PR_SCOUT_PORT,
} from '../ports/injection-tokens';
import type { SourceStatusProvider } from '../ports/source-status.port';
import type { SyncPrScoutPort } from '../ports/sync-pr-scout.port';
import type { DestinationBoardPort } from '../ports/destination-board.port';
import { DEFAULT_KANBAN_DONE_STATUS } from './sync-constants';
import { redactHttpUrls } from '../logging/redact-urls';
import { SyncRunStateService } from './sync-run-state.service';
import type { GithubPrCandidate } from '../ports/github-pr-candidate';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { PollRunHistoryService } from './poll-run-history.service';
import { runPollPrerequisites } from './poll-cycle/run-poll-prerequisites';
import { buildPollScoutContext } from './poll-cycle/poll-scout-context';
import { processPollCandidatesLoop } from './poll-cycle/process-poll-candidates';
import { reconcileRemovedSyncRows } from './poll-cycle/reconcile-removed-sync-rows';
import {
  formatPollSuccessLog,
  upsertScoutStateAfterSuccessfulPoll,
} from './poll-cycle/finalize-successful-poll-cycle';
import {
  persistScoutErrorAfterPoll,
  persistScoutSkippedAfterPoll,
} from './poll-cycle/persist-scout-run-outcome';
import { ensureIssueForPr } from './poll-cycle/ensure-issue-for-pr';
import { looksLikeMcpOrNetworkError } from './poll-cycle/mcp-network-error-heuristic';
import type { PollRunItemDecision } from './poll-run-decisions';

export type { VkCreateQuota } from './poll-cycle/poll-scout-context';

/**
 * Application service: one full poll cycle (scheduled or manual).
 * Keeps MCP / gh details behind ports; orchestrates persistence and run state.
 */
@Injectable()
export class RunPollCycleService {
  private readonly logger = new Logger(RunPollCycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly coreSettings: CoreSettings,
    @Inject(SOURCE_STATUS_PORT)
    private readonly sourceStatus: SourceStatusProvider,
    @Inject(SYNC_PR_SCOUT_PORT)
    private readonly prScout: SyncPrScoutPort,
    @Inject(SYNC_DESTINATION_BOARD_PORT)
    private readonly destinationBoard: DestinationBoardPort,
    private readonly runState: SyncRunStateService,
    private readonly statusEvents: StatusEventsService,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly pollRunHistory: PollRunHistoryService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  computeNextPollAt(from = new Date()): Date {
    const minutes = this.coreSettings.pollIntervalMinutes;
    const jitterMax = this.coreSettings.jitterMaxSeconds;
    const jitterSec = Math.floor(Math.random() * (jitterMax + 1));
    return new Date(from.getTime() + minutes * 60_000 + jitterSec * 1000);
  }

  async execute(trigger: 'scheduled' | 'manual'): Promise<void> {
    if (this.runState.isRunning()) {
      this.logger.debug('Poll skipped: already running');
      return;
    }

    this.runState.setRunning(true);
    this.statusEvents.emitChanged();

    let runId: string | null = null;
    try {
      runId = await this.pollRunHistory.beginRun(trigger);

      const pre = await runPollPrerequisites(
        this.setupEvaluation,
        this.sourceStatus,
        this.destinationBoard,
        () =>
          this.runState.setDestinationHealth(this.appEnv.destinationType, {
            state: 'ok',
            lastOkAt: new Date().toISOString(),
          }),
        (msg) => this.applyDestinationFailure(msg),
      );

      if (pre.kind === 'aborted') {
        this.logger.debug(
          `Poll (${trigger}) skipped: prerequisites aborted (${pre.reason})`,
        );
        await persistScoutSkippedAfterPoll({
          prisma: this.prisma,
          now: new Date(),
          computeNextPollAt: (d) => this.computeNextPollAt(d),
          reason: pre.reason,
          markPollCompleted: () => this.runState.markPollCompleted(),
        });
        await this.pollRunHistory.completeAborted(runId, pre.reason);
        return;
      }
      if (pre.kind === 'probe_failed') {
        this.logger.warn(
          `Poll (${trigger}) destination probe failed: ${redactHttpUrls(pre.message)}`,
        );
        await persistScoutErrorAfterPoll({
          prisma: this.prisma,
          now: new Date(),
          coreSettings: this.coreSettings,
          message: `mcp_probe: ${pre.message}`,
          markPollCompleted: () => this.runState.markPollCompleted(),
        });
        await this.pollRunHistory.completeFailed(
          runId,
          `mcp_probe: ${pre.message}`,
        );
        return;
      }

      const ctx = await buildPollScoutContext({
        prScout: this.prScout,
        settings: this.settings,
        coreSettings: this.coreSettings,
        destinationBoard: this.destinationBoard,
        warn: (msg) => this.logger.warn(msg),
      });
      const {
        candidates,
        urlsNow,
        boardLimit,
        activeVkIssueCount,
        quotaForCreates,
        ignoredAuthorLogins,
      } = ctx;

      const ensureDeps = {
        prisma: this.prisma,
        settings: this.settings,
        destinationBoard: this.destinationBoard,
        logger: this.logger,
        runState: this.runState,
        destinationHealthId: this.appEnv.destinationType,
        autoCreateIssues: this.coreSettings.autoCreateIssues,
      };

      const {
        created,
        skippedUnmapped,
        skippedBot,
        skippedBoardLimit,
        skippedAlreadyTracked,
        skippedLinkedExisting,
        skippedTriage,
        skippedDeclined,
      } = await processPollCandidatesLoop({
        runId,
        candidates,
        ignoredAuthorLogins,
        quotaForCreates,
        boardLimit,
        activeVkIssueCount,
        appendItem: (rid, pr, decision, opts) =>
          this.appendPollRunItem(rid, pr, decision, opts),
        ensureIssueForPr: (pr, quota) =>
          ensureIssueForPr(ensureDeps, pr, quota),
      });

      await reconcileRemovedSyncRows({
        prisma: this.prisma,
        destinationBoard: this.destinationBoard,
        urlsNow,
        kanbanDoneStatus: () => this.kanbanDoneStatus(),
        warn: (msg) => this.logger.warn(msg),
      });

      const now = new Date();
      await upsertScoutStateAfterSuccessfulPoll({
        prisma: this.prisma,
        now,
        computeNextPollAt: (d) => this.computeNextPollAt(d),
        candidatesCount: candidates.length,
        skippedUnmapped,
        issuesCreated: created,
      });

      this.runState.markPollCompleted();

      await this.pollRunHistory.completeSuccess(runId, {
        candidatesCount: candidates.length,
        issuesCreated: created,
        skippedUnmapped,
        skippedBot,
        skippedBoardLimit,
        skippedAlreadyTracked,
        skippedLinkedExisting,
        skippedTriage,
        skippedDeclined,
      });

      this.logger.log(
        formatPollSuccessLog(trigger, {
          candidatesLength: candidates.length,
          created,
          skippedUnmapped,
          skippedBot,
          skippedBoardLimit,
          skippedTriage,
          skippedDeclined,
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Sync (${trigger}) failed: ${redactHttpUrls(msg)}`);
      if (looksLikeMcpOrNetworkError(msg)) {
        this.applyDestinationFailure(msg);
      }
      await persistScoutErrorAfterPoll({
        prisma: this.prisma,
        now: new Date(),
        coreSettings: this.coreSettings,
        message: msg,
        markPollCompleted: () => this.runState.markPollCompleted(),
      });
      if (runId) {
        await this.pollRunHistory.completeFailed(runId, redactHttpUrls(msg));
      }
    } finally {
      this.runState.setRunning(false);
      this.statusEvents.emitChanged();
    }
  }

  private async appendPollRunItem(
    runId: string,
    pr: GithubPrCandidate,
    decision: PollRunItemDecision,
    opts?: { detail?: string; kanbanIssueId?: string },
  ): Promise<void> {
    await this.pollRunHistory.appendItem(runId, {
      prUrl: pr.url,
      githubRepo: pr.githubRepo,
      prNumber: pr.number,
      prTitle: pr.title,
      authorLogin: pr.authorLogin,
      decision,
      detail: opts?.detail,
      kanbanIssueId: opts?.kanbanIssueId,
    });
  }

  private kanbanDoneStatus(): string {
    const s = this.settings.getEffective('kanban_done_status').trim();
    return s.length > 0 ? s : DEFAULT_KANBAN_DONE_STATUS;
  }

  private applyDestinationFailure(message: string): void {
    const id = this.appEnv.destinationType;
    const prev = this.runState.getDestinationHealth(id);
    if (prev.lastOkAt) {
      this.runState.setDestinationHealth(id, {
        state: 'degraded',
        message,
        lastOkAt: prev.lastOkAt,
      });
    } else {
      this.runState.setDestinationHealth(id, { state: 'error', message });
    }
  }
}
