import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { SetupCompleteGuard } from '../../setup/setup-complete.guard';
import { SyncDependenciesGuard } from '../../sync/sync-dependencies.guard';
import { ACTIVITY_EVENTS, ACTIVITY_PUBSUB } from './activity-tokens';
import { OperatorActivityUseCase } from './operator-activity.usecase';
import {
  ActivityEventsPayload,
  ActivityFeedConnection,
  ActivityItemGql,
  TriggerSyncPayload,
} from './operator-bff.types';

@Resolver()
export class OperatorActivityResolver {
  constructor(
    private readonly activityUseCase: OperatorActivityUseCase,
    @Inject(ACTIVITY_PUBSUB) private readonly activityPubSub: PubSub,
  ) {}

  @Query(() => ActivityFeedConnection, { name: 'activityFeed' })
  async activityFeed(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ): Promise<ActivityFeedConnection> {
    return this.activityUseCase.activityFeed(first, after);
  }

  @Mutation(() => ActivityItemGql, { name: 'acceptTriage' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async acceptTriage(@Args('prUrl') prUrl: string): Promise<ActivityItemGql> {
    return this.activityUseCase.acceptTriage(prUrl);
  }

  @Mutation(() => ActivityItemGql, { name: 'declineTriage' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async declineTriage(@Args('prUrl') prUrl: string): Promise<ActivityItemGql> {
    return this.activityUseCase.declineTriage(prUrl);
  }

  @Mutation(() => ActivityItemGql, { name: 'reconsiderTriage' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async reconsiderTriage(
    @Args('prUrl') prUrl: string,
  ): Promise<ActivityItemGql> {
    return this.activityUseCase.reconsiderTriage(prUrl);
  }

  @Mutation(() => TriggerSyncPayload, { name: 'triggerSync' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async triggerSync(): Promise<TriggerSyncPayload> {
    return this.activityUseCase.triggerSync();
  }

  @Subscription(() => ActivityEventsPayload, { name: 'activityEvents' })
  activityEvents() {
    return this.activityPubSub.asyncIterableIterator(ACTIVITY_EVENTS);
  }
}
