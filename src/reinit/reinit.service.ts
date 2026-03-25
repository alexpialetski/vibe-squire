import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhCliService } from '../gh/gh-cli.service';
import { VibeKanbanMcpService } from '../vibe-kanban/vibe-kanban-mcp.service';
import { isVibeKanbanMcpConfigured } from '../vibe-kanban/mcp-transport-config';
import { SettingsService } from '../settings/settings.service';
import { StatusEventsService } from '../events/status-events.service';
import { PollSchedulerService } from '../sync/poll-scheduler.service';
import { SyncRunStateService } from '../sync/sync-run-state.service';
import { GITHUB_PR_SCOUT_ID } from '../sync/sync-constants';

@Injectable()
export class ReinitService {
  private readonly logger = new Logger(ReinitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gh: GhCliService,
    private readonly vk: VibeKanbanMcpService,
    private readonly settings: SettingsService,
    private readonly statusEvents: StatusEventsService,
    private readonly pollScheduler: PollSchedulerService,
    private readonly runState: SyncRunStateService,
  ) {}

  /**
   * §10 — Soft reinit: DB ping, `gh` check, optional MCP probe, clear scout error/backoff flags, reschedule.
   */
  async reinitialize(): Promise<{
    ok: true;
    database: { state: 'ok' | 'error'; message?: string };
    gh: ReturnType<GhCliService['checkAuth']>;
    vibe_kanban: {
      state: 'ok' | 'degraded' | 'error' | 'skipped';
      message?: string;
    };
  }> {
    await this.settings.refreshCache();

    let database: { state: 'ok' | 'error'; message?: string } = { state: 'ok' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      database = {
        state: 'error',
        message: e instanceof Error ? e.message : String(e),
      };
    }

    const gh = this.gh.checkAuth();

    let vibe_kanban: {
      state: 'ok' | 'degraded' | 'error' | 'skipped';
      message?: string;
    } = {
      state: 'skipped',
      message: 'Vibe Kanban MCP not configured (valid vk_mcp_stdio_json)',
    };

    if (isVibeKanbanMcpConfigured(this.settings)) {
      try {
        await this.vk.probe();
        this.runState.setVibeKanbanHealth({
          state: 'ok',
          lastOkAt: new Date().toISOString(),
        });
        vibe_kanban = { state: 'ok' };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const prev = this.runState.getVibeKanbanHealth();
        if (prev.lastOkAt) {
          this.runState.setVibeKanbanHealth({
            state: 'degraded',
            message: msg,
            lastOkAt: prev.lastOkAt,
          });
          vibe_kanban = { state: 'degraded', message: msg };
        } else {
          this.runState.setVibeKanbanHealth({ state: 'error', message: msg });
          vibe_kanban = { state: 'error', message: msg };
        }
      }
    }

    const now = new Date();
    await this.prisma.scoutState.upsert({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
      create: {
        scoutId: GITHUB_PR_SCOUT_ID,
        lastPollAt: null,
        nextPollAt: now,
        lastError: null,
        failureStreak: 0,
      },
      update: {
        lastError: null,
        failureStreak: 0,
        nextPollAt: now,
      },
    });

    this.pollScheduler.reschedule('reinit');
    this.statusEvents.emitChanged();
    this.statusEvents.emitScheduleRefresh();

    this.logger.log('Soft reinit completed');
    return { ok: true, database, gh, vibe_kanban };
  }
}
