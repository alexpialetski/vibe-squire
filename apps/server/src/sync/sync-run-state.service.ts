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
  private readonly destinationHealthById = new Map<string, DestinationHealth>();

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

  setDestinationHealth(destinationId: string, h: DestinationHealth): void {
    this.destinationHealthById.set(destinationId, h);
  }

  getDestinationHealth(destinationId: string): DestinationHealth {
    return (
      this.destinationHealthById.get(destinationId) ?? { state: 'unknown' }
    );
  }
}
