import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { StatusEventsService } from '../events/status-events.service';
import { PollSchedulerService } from '../sync/poll-scheduler.service';
import { SyncRunStateService } from '../sync/sync-run-state.service';
import { GITHUB_PR_SCOUT_ID } from '../sync/sync-constants';
import {
  DESTINATION_BOARD_PORT,
  DESTINATION_STATUS_PORT,
  SOURCE_STATUS_PORT,
} from '../ports/injection-tokens';
import type { SourceStatusProvider } from '../ports/source-status.port';
import type { DestinationStatusProvider } from '../ports/destination-status.port';
import type { DestinationBoardPort } from '../ports/destination-board.port';
import { redactHttpUrls } from '../logging/redact-urls';

type SubsystemResult = { state: string; message?: string };

@Injectable()
export class ReinitService {
  private readonly logger = new Logger(ReinitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly statusEvents: StatusEventsService,
    private readonly pollScheduler: PollSchedulerService,
    private readonly runState: SyncRunStateService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    @Inject(SOURCE_STATUS_PORT)
    private readonly sourceStatus: SourceStatusProvider,
    @Inject(DESTINATION_STATUS_PORT)
    private readonly destinationStatus: DestinationStatusProvider,
    @Inject(DESTINATION_BOARD_PORT)
    private readonly destinationBoard: DestinationBoardPort,
  ) {}

  /**
   * Soft reinit: DB ping, source check, destination probe, clear scout error/backoff, reschedule.
   */
  async reinitialize(): Promise<{
    ok: true;
    database: SubsystemResult;
    source: SubsystemResult;
    destination: SubsystemResult;
  }> {
    await this.settings.refreshCache();

    let database: SubsystemResult = { state: 'ok' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      database = {
        state: 'error',
        message: e instanceof Error ? e.message : String(e),
      };
    }

    const srcResult = this.sourceStatus.checkReadiness();
    const source: SubsystemResult = {
      state: srcResult.state,
      ...(srcResult.message ? { message: srcResult.message } : {}),
    };

    const destId = this.appEnv.destinationType;
    const destReady = await this.destinationStatus.checkReadiness();
    let destination: SubsystemResult;

    const setupErrors = destReady.errors?.length ?? 0;
    if (setupErrors > 0) {
      destination = {
        state: 'skipped',
        message: destReady.errors![0].message,
      };
    } else {
      try {
        await this.destinationBoard.probe();
        this.runState.setDestinationHealth(destId, {
          state: 'ok',
          lastOkAt: new Date().toISOString(),
        });
        destination = { state: 'ok' };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const prev = this.runState.getDestinationHealth(destId);
        if (prev.lastOkAt) {
          this.runState.setDestinationHealth(destId, {
            state: 'degraded',
            message: msg,
            lastOkAt: prev.lastOkAt,
          });
          destination = { state: 'degraded', message: msg };
        } else {
          this.runState.setDestinationHealth(destId, {
            state: 'error',
            message: msg,
          });
          destination = { state: 'error', message: msg };
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

    if (database.state !== 'ok') {
      this.logger.warn(
        `Reinit: database ${database.state}${database.message ? ` — ${redactHttpUrls(database.message)}` : ''}`,
      );
    }
    if (source.state !== 'ok') {
      this.logger.warn(
        `Reinit: source ${source.state}${source.message ? ` — ${redactHttpUrls(source.message)}` : ''}`,
      );
    }
    if (destination.state !== 'ok') {
      this.logger.warn(
        `Reinit: destination ${destination.state}${destination.message ? ` — ${redactHttpUrls(destination.message)}` : ''}`,
      );
    }

    this.logger.log('Soft reinit completed');
    return { ok: true, database, source, destination };
  }
}
