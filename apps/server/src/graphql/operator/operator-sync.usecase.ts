import { Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { ReinitService } from '../../reinit/reinit.service';
import { ACTIVITY_EVENTS, ACTIVITY_PUBSUB } from './activity-tokens';
import { ReinitIntegrationPayload } from './operator-bff.types';
import { toReinitIntegrationPayload } from './operator-gql.mapper';

@Injectable()
export class OperatorSyncUseCase {
  constructor(
    private readonly reinit: ReinitService,
    @Inject(ACTIVITY_PUBSUB) private readonly activityPubSub: PubSub,
  ) {}

  async reinitIntegration(): Promise<ReinitIntegrationPayload> {
    const result = await this.reinit.reinitialize();
    await this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
    return toReinitIntegrationPayload(result);
  }
}
