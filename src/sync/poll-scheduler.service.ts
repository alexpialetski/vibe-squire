import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Subscription } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { RunPollCycleService } from './run-poll-cycle.service';
import { GITHUB_PR_SCOUT_ID } from './sync-constants';
import { StatusEventsService } from '../events/status-events.service';
import { CoreSettings } from '../settings/core-settings.service';

const MIN_DELAY_MS = 1_000;
const STARTUP_DELAY_MS = 3_000;

@Injectable()
export class PollSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PollSchedulerService.name);
  private handle: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<void> = Promise.resolve();
  private eventsSub: Subscription | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly runPoll: RunPollCycleService,
    private readonly statusEvents: StatusEventsService,
    private readonly coreSettings: CoreSettings,
  ) {}

  onModuleInit(): void {
    this.eventsSub = this.statusEvents.scheduleRefreshes().subscribe(() => {
      this.reschedule('schedule_refresh');
    });
    this.armTimer('startup');
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.eventsSub?.unsubscribe();
    this.eventsSub = null;
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }

  /** Re-read `nextPollAt` from SQLite and schedule the next tick (e.g. after settings change). */
  reschedule(reason: string): void {
    if (this.stopped) {
      return;
    }
    this.logger.debug(`Reschedule (${reason})`);
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.armTimer(reason);
  }

  private armTimer(reason: string): void {
    if (this.stopped) {
      return;
    }
    if (!this.coreSettings.scheduledSyncEnabled) {
      this.logger.debug(
        `Scheduled sync disabled (scheduled_sync_enabled); timer not armed (${reason})`,
      );
      return;
    }
    void this.prisma.scoutState
      .findUnique({ where: { scoutId: GITHUB_PR_SCOUT_ID } })
      .then((row) => {
        if (this.stopped) {
          return;
        }
        const targetMs = row?.nextPollAt
          ? row.nextPollAt.getTime()
          : Date.now() + STARTUP_DELAY_MS;
        const delay = Math.max(MIN_DELAY_MS, targetMs - Date.now());
        this.logger.debug(`Next poll in ${delay}ms (${reason})`);
        this.handle = setTimeout(() => this.fire(), delay);
      })
      .catch((e) => {
        if (this.stopped) {
          return;
        }
        this.logger.error(
          `armTimer failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        this.handle = setTimeout(() => this.fire(), STARTUP_DELAY_MS);
      });
  }

  private fire(): void {
    if (this.stopped) {
      return;
    }
    this.handle = null;
    if (!this.coreSettings.scheduledSyncEnabled) {
      this.logger.debug(
        'Scheduled poll skipped: scheduled_sync_enabled is off',
      );
      return;
    }
    this.chain = this.chain
      .then(async () => {
        await this.runPoll.execute('scheduled');
      })
      .catch((e) => {
        this.logger.error(
          `Scheduled poll error: ${e instanceof Error ? e.message : String(e)}`,
        );
      })
      .finally(() => {
        if (!this.stopped) {
          this.armTimer('after_poll');
        }
      });
  }
}
