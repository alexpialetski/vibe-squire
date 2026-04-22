import { Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MappingsModule } from '../mappings/mappings.module';
import { ReinitModule } from '../reinit/reinit.module';
import { SetupModule } from '../setup/setup.module';
import { SyncModule } from '../sync/sync.module';
import { UiModule } from '../ui/ui.module';
import { ActivityEventsSubscriptionBridge } from './operator/activity-events-subscription.bridge';
import { ACTIVITY_PUBSUB } from './operator/activity-tokens';
import { OperatorActivityResolver } from './operator/operator-activity.resolver';
import { OperatorActivityUseCase } from './operator/operator-activity.usecase';
import { OperatorMappingsResolver } from './operator/operator-mappings.resolver';
import { OperatorSettingsResolver } from './operator/operator-settings.resolver';
import { OperatorSettingsUseCase } from './operator/operator-settings.usecase';
import { OperatorSetupResolver } from './operator/operator-setup.resolver';
import { OperatorSetupUseCase } from './operator/operator-setup.usecase';
import { OperatorSyncResolver } from './operator/operator-sync.resolver';
import { OperatorSyncUseCase } from './operator/operator-sync.usecase';
import { OperatorVibeKanbanResolver } from './operator/operator-vibe-kanban.resolver';
import { OperatorVibeKanbanUseCase } from './operator/operator-vibe-kanban.usecase';

@Module({
  imports: [UiModule, MappingsModule, SyncModule, ReinitModule, SetupModule],
  providers: [
    OperatorSettingsResolver,
    OperatorVibeKanbanResolver,
    OperatorMappingsResolver,
    OperatorActivityResolver,
    OperatorSetupResolver,
    OperatorSyncResolver,
    OperatorSettingsUseCase,
    OperatorActivityUseCase,
    OperatorSetupUseCase,
    OperatorSyncUseCase,
    OperatorVibeKanbanUseCase,
    {
      provide: ACTIVITY_PUBSUB,
      useFactory: (): PubSub => new PubSub(),
    },
    ActivityEventsSubscriptionBridge,
  ],
})
export class OperatorGraphqlModule {}
