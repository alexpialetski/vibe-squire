import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import type { Subscription } from 'rxjs';
import { StatusEventsService } from '../../events/status-events.service';
import { ACTIVITY_EVENTS, ACTIVITY_PUBSUB } from './activity-tokens';

@Injectable()
export class ActivityEventsSubscriptionBridge
  implements OnModuleInit, OnModuleDestroy
{
  private rxSub?: Subscription;

  constructor(
    private readonly statusEvents: StatusEventsService,
    @Inject(ACTIVITY_PUBSUB) private readonly pubSub: PubSub,
  ) {}

  onModuleInit(): void {
    this.rxSub = this.statusEvents.updates().subscribe(() => {
      void this.pubSub.publish(ACTIVITY_EVENTS, {
        activityEvents: { invalidate: true },
      });
    });
  }

  onModuleDestroy(): void {
    this.rxSub?.unsubscribe();
    this.rxSub = undefined;
  }
}
