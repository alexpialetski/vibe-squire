import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  DatabaseState,
  DestinationState,
  GhState,
  ScoutUiState,
} from './status-enums';

@ObjectType()
export class StatusGh {
  @Field(() => GhState)
  state!: string;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class StatusDatabase {
  @Field(() => DatabaseState)
  state!: string;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class StatusSetup {
  @Field()
  complete!: boolean;

  @Field(() => Int)
  mappingCount!: number;

  @Field({ nullable: true })
  reason?: string;
}

@ObjectType()
export class StatusConfiguration {
  @Field()
  source_type!: string;

  @Field()
  destination_type!: string;

  @Field()
  vibe_kanban_board_active!: boolean;
}

@ObjectType()
export class StatusDestination {
  @Field()
  id!: string;

  @Field(() => DestinationState)
  state!: string;

  @Field(() => String, { nullable: true })
  lastOkAt?: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
export class StatusScoutLastPoll {
  @Field(() => Int, { nullable: true })
  candidates_count?: number | null;

  @Field(() => Int, { nullable: true })
  skipped_unmapped?: number | null;

  @Field(() => Int, { nullable: true })
  issues_created?: number | null;
}

@ObjectType()
export class StatusScout {
  @Field()
  id!: string;

  @Field(() => ScoutUiState)
  state!: string;

  @Field(() => String, { nullable: true })
  lastPollAt?: string | null;

  @Field(() => String, { nullable: true })
  nextPollAt?: string | null;

  @Field(() => String, { nullable: true })
  lastError?: string;

  @Field(() => String, { nullable: true })
  skipReason?: string;

  @Field(() => StatusScoutLastPoll, { nullable: true })
  last_poll?: StatusScoutLastPoll;
}

@ObjectType()
export class StatusManualSync {
  @Field()
  canRun!: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  cooldownUntil?: string;
}

@ObjectType()
export class StatusScheduledSync {
  @Field()
  enabled!: boolean;
}

@ObjectType()
export class StatusSnapshot {
  @Field()
  timestamp!: string;

  @Field(() => Int, { nullable: true })
  pending_triage_count?: number;

  @Field(() => StatusGh)
  gh!: StatusGh;

  @Field(() => StatusDatabase)
  database!: StatusDatabase;

  @Field(() => StatusSetup)
  setup!: StatusSetup;

  @Field(() => StatusConfiguration)
  configuration!: StatusConfiguration;

  @Field(() => [StatusDestination])
  destinations!: StatusDestination[];

  @Field(() => [StatusScout])
  scouts!: StatusScout[];

  @Field(() => StatusManualSync)
  manual_sync!: StatusManualSync;

  @Field(() => StatusScheduledSync)
  scheduled_sync!: StatusScheduledSync;
}
