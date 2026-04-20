import { Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { StatusSubscriptionBridge } from './graphql/status-subscription.bridge';
import { StatusResolver } from './graphql/status.resolver';
import { STATUS_PUBSUB } from './graphql/status-tokens';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncModule } from '../sync/sync.module';
import { SetupModule } from '../setup/setup.module';
import { SyncRunStateModule } from '../sync/sync-run-state.module';

@Module({
  imports: [PrismaModule, SyncRunStateModule, SyncModule, SetupModule],
  controllers: [StatusController],
  providers: [
    StatusService,
    {
      provide: STATUS_PUBSUB,
      useFactory: (): PubSub => new PubSub(),
    },
    StatusSubscriptionBridge,
    StatusResolver,
  ],
  exports: [StatusService],
})
export class StatusModule {}
