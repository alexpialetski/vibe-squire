import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { PrismaService } from '../prisma/prisma.service';
import { CoreSettings } from '../settings/core-settings.service';
import { SyncRunStateService } from '../sync/sync-run-state.service';
import { SyncService } from '../sync/sync.service';
import { GITHUB_PR_SCOUT_ID } from '../sync/sync-constants';
import { POLL_RUN_ITEM_DECISION } from '../sync/poll-run-decisions';
import { fetchTriageLiveState } from '../sync/triage-live-state.queries';
import { redactHttpUrls } from '../logging/redact-urls';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import {
  DESTINATION_STATUS_PORT,
  SOURCE_STATUS_PORT,
} from '../ports/injection-tokens';
import type { DestinationStatusProvider } from '../ports/destination-status.port';
import type { SourceStatusProvider } from '../ports/source-status.port';

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SOURCE_STATUS_PORT)
    private readonly sourceStatus: SourceStatusProvider,
    private readonly coreSettings: CoreSettings,
    private readonly syncRunState: SyncRunStateService,
    private readonly sync: SyncService,
    private readonly setupEvaluation: SetupEvaluationService,
    @Inject(DESTINATION_STATUS_PORT)
    private readonly destinationStatus: DestinationStatusProvider,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  async getSnapshot() {
    const ghResult = this.sourceStatus.checkReadiness();

    let databaseState: 'ok' | 'error' = 'ok';
    let databaseMessage: string | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      databaseState = 'error';
      databaseMessage = e instanceof Error ? e.message : String(e);
    }

    const setupEval = await this.setupEvaluation.evaluate();
    const destReady = await this.destinationStatus.checkReadiness();

    const [scoutRow, pendingTriageCount] = await Promise.all([
      this.prisma.scoutState.findUnique({
        where: { scoutId: GITHUB_PR_SCOUT_ID },
      }),
      this.countPendingTriageItems(),
    ]);

    const scoutState = this.resolveScoutUiState(scoutRow?.lastError);

    const destId = this.appEnv.destinationType;
    const destHealth = this.syncRunState.getDestinationHealth(destId);
    const destinations = [
      {
        id: destId,
        state: destHealth.state,
        ...(destHealth.lastOkAt ? { lastOkAt: destHealth.lastOkAt } : {}),
        ...(destHealth.message
          ? { message: redactHttpUrls(destHealth.message) }
          : {}),
      },
    ];

    const manualSyncSnapshot = this.sync.getManualSyncSnapshot();
    const manualSync = setupEval.complete
      ? manualSyncSnapshot
      : {
          canRun: false,
          reason: setupEval.reason ?? 'setup_incomplete',
        };
    const scheduledSyncEnabled = this.coreSettings.scheduledSyncEnabled;

    const destConfigExtras = destReady.configuration ?? {};

    return {
      timestamp: new Date().toISOString(),
      pending_triage_count: pendingTriageCount,
      gh: {
        state: ghResult.state,
        ...(ghResult.message ? { message: ghResult.message } : {}),
      },
      database: {
        state: databaseState,
        ...(databaseMessage ? { message: databaseMessage } : {}),
      },
      setup: {
        complete: setupEval.complete,
        ...(setupEval.reason ? { reason: setupEval.reason } : {}),
        mappingCount: setupEval.mappingCount,
      },
      configuration: {
        source_type: setupEval.sourceType,
        destination_type: setupEval.destinationType,
        ...destConfigExtras,
      },
      destinations,
      scouts: [
        {
          id: GITHUB_PR_SCOUT_ID,
          state: this.syncRunState.isRunning() ? 'running' : scoutState.ui,
          lastPollAt: scoutRow?.lastPollAt?.toISOString() ?? null,
          nextPollAt: scoutRow?.nextPollAt?.toISOString() ?? null,
          ...(scoutRow?.lastError
            ? { lastError: redactHttpUrls(scoutRow.lastError) }
            : {}),
          ...(scoutState.skipReason
            ? { skipReason: scoutState.skipReason }
            : {}),
          last_poll: {
            candidates_count: scoutRow?.lastPollCandidatesCount ?? null,
            skipped_unmapped: scoutRow?.lastPollSkippedUnmapped ?? null,
            issues_created: scoutRow?.lastPollIssuesCreated ?? null,
          },
        },
      ],
      manual_sync: manualSync,
      scheduled_sync: {
        enabled: scheduledSyncEnabled,
      },
    };
  }

  /**
   * Count distinct PR URLs with a triageable decision in the latest completed poll run,
   * excluding PRs that have since been accepted or declined.
   */
  private async countPendingTriageItems(): Promise<number> {
    const latestRun = await this.prisma.pollRun.findFirst({
      where: { phase: 'completed' },
      orderBy: { startedAt: 'desc' },
      select: { id: true },
    });
    if (!latestRun) return 0;

    const triageDecisions = [
      POLL_RUN_ITEM_DECISION.skippedTriage,
      POLL_RUN_ITEM_DECISION.skippedBoardLimit,
    ];
    const triageItems = await this.prisma.pollRunItem.findMany({
      where: { runId: latestRun.id, decision: { in: triageDecisions } },
      select: { prUrl: true },
    });
    if (triageItems.length === 0) return 0;

    const prUrls = new Set(triageItems.map((i) => i.prUrl));
    const live = await fetchTriageLiveState(this.prisma, prUrls);
    const resolved = new Set([...live.acceptedPrUrls, ...live.declinedPrUrls]);
    return [...prUrls].filter((u) => !resolved.has(u)).length;
  }

  private resolveScoutUiState(lastError: string | null | undefined): {
    ui: 'idle' | 'skipped' | 'error';
    skipReason?: string;
  } {
    if (!lastError) {
      return { ui: 'idle' };
    }
    if (lastError.startsWith('skipped:')) {
      return {
        ui: 'skipped',
        skipReason: lastError.slice('skipped:'.length).trim(),
      };
    }
    return { ui: 'error' };
  }
}
