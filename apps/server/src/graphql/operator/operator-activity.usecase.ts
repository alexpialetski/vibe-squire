import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PollSchedulerService } from '../../sync/poll-scheduler.service';
import { PrTriageService } from '../../sync/pr-triage.service';
import { SyncService } from '../../sync/sync.service';
import { ActivityUiService } from '../../ui/activity-ui.service';
import { ACTIVITY_EVENTS, ACTIVITY_PUBSUB } from './activity-tokens';
import { buildActivityFeedEdges } from './activity-feed-cursor';
import {
  ActivityFeedConnection,
  ActivityItemGql,
  TriggerSyncPayload,
} from './operator-bff.types';
import { toActivityRunGql } from './operator-gql.mapper';

@Injectable()
export class OperatorActivityUseCase {
  constructor(
    private readonly activityUi: ActivityUiService,
    private readonly triage: PrTriageService,
    private readonly sync: SyncService,
    private readonly pollScheduler: PollSchedulerService,
    @Inject(ACTIVITY_PUBSUB) private readonly activityPubSub: PubSub,
  ) {}

  async activityFeed(
    first?: number,
    after?: string | null,
  ): Promise<ActivityFeedConnection> {
    const { nodes, hasNextPage, endCursor } =
      await this.activityUi.listPresentedRunsConnection(
        first ?? 40,
        after ?? null,
      );
    return {
      edges: buildActivityFeedEdges(nodes.map((run) => toActivityRunGql(run))),
      pageInfo: { hasNextPage, endCursor: endCursor ?? null },
    };
  }

  async acceptTriage(prUrl: string): Promise<ActivityItemGql> {
    await this.triage.accept(prUrl);
    await this.publishInvalidate();
    return this.requirePresentedActivityItem(prUrl);
  }

  async declineTriage(prUrl: string): Promise<ActivityItemGql> {
    await this.triage.decline(prUrl);
    await this.publishInvalidate();
    return this.requirePresentedActivityItem(prUrl);
  }

  async reconsiderTriage(prUrl: string): Promise<ActivityItemGql> {
    await this.triage.reconsider(prUrl);
    await this.publishInvalidate();
    return this.requirePresentedActivityItem(prUrl);
  }

  async triggerSync(): Promise<TriggerSyncPayload> {
    const result = await this.sync.requestManualSync();
    this.pollScheduler.reschedule('manual_run_complete');
    await this.publishInvalidate();
    return result;
  }

  private async requirePresentedActivityItem(
    prUrl: string,
  ): Promise<ActivityItemGql> {
    const item = await this.activityUi.findPresentedItemByPrUrl(prUrl);
    if (!item) {
      throw new BadRequestException('No activity item found for PR URL');
    }
    return item;
  }

  private async publishInvalidate(): Promise<void> {
    await this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
  }
}
