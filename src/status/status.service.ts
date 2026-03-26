import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { PrismaService } from '../prisma/prisma.service';
import { GhCliService } from '../gh/gh-cli.service';
import { SettingsService } from '../settings/settings.service';
import { SyncRunStateService } from '../sync/sync-run-state.service';
import { SyncService } from '../sync/sync.service';
import { GITHUB_PR_SCOUT_ID } from '../sync/sync-constants';
import { redactHttpUrls } from '../logging/redact-urls';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { isVibeKanbanMcpConfigured } from '../vibe-kanban/mcp-transport-config';

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gh: GhCliService,
    private readonly settings: SettingsService,
    private readonly syncRunState: SyncRunStateService,
    private readonly sync: SyncService,
    private readonly setupEvaluation: SetupEvaluationService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  async getSnapshot() {
    const ghResult = this.gh.checkAuth();

    let databaseState: 'ok' | 'error' = 'ok';
    let databaseMessage: string | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      databaseState = 'error';
      databaseMessage = e instanceof Error ? e.message : String(e);
    }

    const setupEval = await this.setupEvaluation.evaluate();

    const scoutRow = await this.prisma.scoutState.findUnique({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
    });

    const scoutState = this.resolveScoutUiState(scoutRow?.lastError);

    const vkHealth = this.syncRunState.getVibeKanbanHealth();
    const destinations = [
      {
        id: 'vibe_kanban',
        state: vkHealth.state,
        ...(vkHealth.lastOkAt ? { lastOkAt: vkHealth.lastOkAt } : {}),
        ...(vkHealth.message
          ? { message: redactHttpUrls(vkHealth.message) }
          : {}),
      },
    ];

    const manualSync = this.sync.getManualSyncSnapshot();
    const scheduledSyncEnabled = this.settings.getEffectiveBoolean(
      'scheduled_sync_enabled',
    );

    return {
      timestamp: new Date().toISOString(),
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
        vk_mcp_configured: isVibeKanbanMcpConfigured(
          this.settings,
          this.appEnv.destinationType,
        ),
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
