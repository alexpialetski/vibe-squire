import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import type { Subscription } from 'rxjs';
import { StatusEventsService } from '../../events/status-events.service';
import { STATUS_PUBSUB, STATUS_UPDATED } from './status-tokens';

@Injectable()
export class StatusSubscriptionBridge implements OnModuleInit, OnModuleDestroy {
  private rxSub?: Subscription;

  constructor(
    private readonly statusEvents: StatusEventsService,
    @Inject(STATUS_PUBSUB) private readonly pubSub: PubSub,
  ) {}

  onModuleInit(): void {
    this.rxSub = this.statusEvents.updates().subscribe(() => {
      void this.pubSub.publish(STATUS_UPDATED, {});
    });
  }

  onModuleDestroy(): void {
    this.rxSub?.unsubscribe();
    this.rxSub = undefined;
  }
}
