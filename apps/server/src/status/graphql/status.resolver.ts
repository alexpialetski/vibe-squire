import { Inject } from '@nestjs/common';
import { Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { StatusService } from '../status.service';
import { StatusSnapshot } from './status-snapshot.object';
import { STATUS_PUBSUB, STATUS_UPDATED } from './status-tokens';

@Resolver(() => StatusSnapshot)
export class StatusResolver {
  constructor(
    private readonly statusService: StatusService,
    @Inject(STATUS_PUBSUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => StatusSnapshot, { name: 'status' })
  status(): ReturnType<StatusService['getSnapshot']> {
    return this.statusService.getSnapshot();
  }

  @Subscription(() => StatusSnapshot, {
    name: 'statusUpdated',
    resolve(this: StatusResolver) {
      return this.statusService.getSnapshot();
    },
  })
  statusUpdated() {
    return this.pubSub.asyncIterableIterator(STATUS_UPDATED);
  }
}
