import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { CoreSettings } from '../settings/core-settings.service';
import { SyncRunStateService } from './sync-run-state.service';
import { RunPollCycleService } from './run-poll-cycle.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly coreSettings: CoreSettings,
    private readonly runState: SyncRunStateService,
    private readonly runPoll: RunPollCycleService,
  ) {}

  assertManualRunAllowed(): void {
    if (this.runState.isRunning()) {
      throw new ConflictException({ reason: 'already_running' });
    }
    const snap = this.getManualSyncSnapshot();
    if (!snap.canRun && snap.reason === 'cooldown' && snap.cooldownUntil) {
      throw new HttpException(
        {
          reason: 'cooldown',
          cooldownUntil: snap.cooldownUntil,
        },
        429,
      );
    }
  }

  getManualSyncSnapshot(): {
    canRun: boolean;
    reason?: string;
    cooldownUntil?: string;
  } {
    if (this.runState.isRunning()) {
      return { canRun: false, reason: 'already_running' };
    }
    const cooldownSec = this.coreSettings.runNowCooldownSeconds;
    const last = this.runState.lastPollCompletedAtMsValue();
    if (last <= 0) {
      return { canRun: true };
    }
    const until = last + cooldownSec * 1000;
    if (Date.now() < until) {
      return {
        canRun: false,
        reason: 'cooldown',
        cooldownUntil: new Date(until).toISOString(),
      };
    }
    return { canRun: true };
  }

  async requestManualSync(): Promise<{ ok: true }> {
    this.assertManualRunAllowed();
    await this.runPoll.execute('manual');
    return { ok: true };
  }
}
