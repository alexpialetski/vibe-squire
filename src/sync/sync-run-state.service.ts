import { Injectable } from '@nestjs/common';

export type DestinationHealth = {
  state: 'ok' | 'degraded' | 'error' | 'unknown';
  message?: string;
  lastOkAt?: string;
};

@Injectable()
export class SyncRunStateService {
  private running = false;
  /** Updated after every scheduled/manual poll attempt finishes (success, skip, or error). */
  private lastPollCompletedAtMs = 0;
  private vk: DestinationHealth = { state: 'unknown' };

  setRunning(v: boolean): void {
    this.running = v;
  }

  isRunning(): boolean {
    return this.running;
  }

  markPollCompleted(): void {
    this.lastPollCompletedAtMs = Date.now();
  }

  lastPollCompletedAtMsValue(): number {
    return this.lastPollCompletedAtMs;
  }

  setVibeKanbanHealth(h: DestinationHealth): void {
    this.vk = h;
  }

  getVibeKanbanHealth(): DestinationHealth {
    return this.vk;
  }
}
