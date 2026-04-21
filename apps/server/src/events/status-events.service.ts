import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class StatusEventsService {
  private readonly tick = new Subject<void>();
  private readonly scheduleRefresh = new Subject<void>();

  /** Notify GraphQL status subscribers that status may have changed. */
  emitChanged(): void {
    this.tick.next();
  }

  /** Recompute poll timer after settings that affect interval/jitter (not every sync tick). */
  emitScheduleRefresh(): void {
    this.scheduleRefresh.next();
  }

  /** Stream of refresh requests consumed by GraphQL subscription bridges. */
  updates() {
    return this.tick.asObservable();
  }

  scheduleRefreshes() {
    return this.scheduleRefresh.asObservable();
  }
}
