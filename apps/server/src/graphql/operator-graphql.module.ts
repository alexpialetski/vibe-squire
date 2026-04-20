import { Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MappingsModule } from '../mappings/mappings.module';
import { ReinitModule } from '../reinit/reinit.module';
import { SetupModule } from '../setup/setup.module';
import { SyncModule } from '../sync/sync.module';
import { UiModule } from '../ui/ui.module';
import { ActivityEventsSubscriptionBridge } from './operator/activity-events-subscription.bridge';
import { ACTIVITY_PUBSUB } from './operator/activity-tokens';
import { OperatorBffResolver } from './operator/operator-bff.resolver';

@Module({
  imports: [UiModule, MappingsModule, SyncModule, ReinitModule, SetupModule],
  providers: [
    OperatorBffResolver,
    {
      provide: ACTIVITY_PUBSUB,
      useFactory: (): PubSub => new PubSub(),
    },
    ActivityEventsSubscriptionBridge,
  ],
})
export class OperatorGraphqlModule {}
