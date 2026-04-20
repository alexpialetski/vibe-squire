import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { Allow, IsOptional } from 'class-validator';

@ObjectType()
export class CoreSettingField {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  value!: string;

  @Field(() => String, { nullable: true })
  envVar?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@ObjectType()
export class EffectiveSettings {
  @Field(() => [CoreSettingField])
  coreFields!: CoreSettingField[];

  @Field(() => String)
  resolvedSourceLabel!: string;

  @Field(() => String)
  resolvedDestinationLabel!: string;

  @Field(() => Boolean)
  scheduledSyncEnabled!: boolean;

  @Field(() => Boolean)
  autoCreateIssues!: boolean;
}

@ObjectType()
export class MappingGql {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  githubRepo!: string;

  @Field(() => String)
  vibeKanbanRepoId!: string;

  @Field(() => String, { nullable: true })
  label?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType()
export class ActivityItemGql {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  prUrl!: string;

  @Field(() => String)
  githubRepo!: string;

  @Field(() => Int)
  prNumber!: number;

  @Field(() => String)
  prTitle!: string;

  @Field(() => String, { nullable: true })
  authorLogin?: string | null;

  @Field(() => String)
  decision!: string;

  @Field(() => String)
  effectiveDecision!: string;

  @Field(() => String)
  decisionLabel!: string;

  @Field(() => String, { nullable: true })
  detail?: string | null;

  @Field(() => String, { nullable: true })
  kanbanIssueId?: string | null;
}

@ObjectType()
export class ActivityRunGql {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  startedAt!: string;

  @Field(() => String)
  startedAtLabel!: string;

  @Field(() => String, { nullable: true })
  finishedAt?: string | null;

  @Field(() => String)
  trigger!: string;

  @Field(() => String)
  phase!: string;

  @Field(() => String)
  phaseLabel!: string;

  @Field(() => String, { nullable: true })
  abortReason?: string | null;

  @Field(() => String, { nullable: true })
  errorMessage?: string | null;

  @Field(() => Int, { nullable: true })
  candidatesCount?: number | null;

  @Field(() => Int, { nullable: true })
  issuesCreated?: number | null;

  @Field(() => Int, { nullable: true })
  skippedUnmapped?: number | null;

  @Field(() => Int, { nullable: true })
  skippedBot?: number | null;

  @Field(() => Int, { nullable: true })
  skippedBoardLimit?: number | null;

  @Field(() => Int, { nullable: true })
  skippedAlreadyTracked?: number | null;

  @Field(() => Int, { nullable: true })
  skippedLinkedExisting?: number | null;

  @Field(() => Int, { nullable: true })
  skippedTriage?: number | null;

  @Field(() => Int, { nullable: true })
  skippedDeclined?: number | null;

  @Field(() => Int)
  itemCount!: number;

  @Field(() => [ActivityItemGql])
  items!: ActivityItemGql[];
}

@ObjectType()
export class ActivityFeedPageInfo {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  endCursor?: string | null;
}

@ObjectType()
export class ActivityFeedEdge {
  @Field(() => String)
  cursor!: string;

  @Field(() => ActivityRunGql)
  node!: ActivityRunGql;
}

@ObjectType()
export class ActivityFeedConnection {
  @Field(() => [ActivityFeedEdge])
  edges!: ActivityFeedEdge[];

  @Field(() => ActivityFeedPageInfo)
  pageInfo!: ActivityFeedPageInfo;
}

@ObjectType()
export class UiNavEntryGql {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  href!: string;
}

@ObjectType()
export class IntegrationNavGql {
  @Field(() => [UiNavEntryGql])
  entries!: UiNavEntryGql[];
}

@ObjectType()
export class SetupEvaluationGql {
  @Field(() => Boolean)
  complete!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => Int)
  mappingCount!: number;

  @Field(() => String)
  sourceType!: string;

  @Field(() => String)
  destinationType!: string;

  @Field(() => Boolean)
  vibeKanbanBoardActive!: boolean;

  @Field(() => Boolean)
  hasRouting!: boolean;
}

@ObjectType()
export class SetupChecklistRowGql {
  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  linkHref?: string | null;

  @Field(() => String, { nullable: true })
  linkLabel?: string | null;
}

@ObjectType()
export class SetupReasonMessageGql {
  @Field(() => String)
  code!: string;

  @Field(() => String)
  message!: string;
}

@ObjectType()
export class DashboardSetupGql {
  @Field(() => SetupEvaluationGql)
  evaluation!: SetupEvaluationGql;

  @Field(() => [SetupChecklistRowGql])
  checklist!: SetupChecklistRowGql[];

  @Field(() => [SetupReasonMessageGql])
  reasonMessages!: SetupReasonMessageGql[];
}

@ObjectType()
export class UpdateSettingsPayload {
  @Field(() => Boolean)
  ok!: boolean;
}

@InputType()
export class UpdateSettingsInput {
  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  poll_interval_minutes?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  jitter_max_seconds?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  run_now_cooldown_seconds?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  max_board_pr_count?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  scheduled_sync_enabled?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  auto_create_issues?: string;
}

@InputType()
export class UpsertMappingInput {
  @Field(() => String)
  @Allow()
  githubRepo!: string;

  @Field(() => String)
  @Allow()
  vibeKanbanRepoId!: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  label?: string;
}

@InputType()
export class UpdateMappingInput {
  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  githubRepo?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  vibeKanbanRepoId?: string;

  @Field(() => String, { nullable: true })
  @Allow()
  @IsOptional()
  label?: string;
}

@ObjectType()
export class DeleteMappingPayload {
  @Field(() => Boolean)
  ok!: boolean;
}

@ObjectType()
export class AcceptTriagePayload {
  @Field(() => String)
  kanbanIssueId!: string;
}

@ObjectType()
export class DeclineTriagePayload {
  @Field(() => Boolean)
  ok!: boolean;
}

@ObjectType()
export class ReconsiderTriagePayload {
  @Field(() => Boolean)
  ok!: boolean;
}

@ObjectType()
export class TriggerSyncPayload {
  @Field(() => Boolean)
  ok!: boolean;
}

@ObjectType()
export class ReinitSubsystemGql {
  @Field(() => String)
  state!: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
export class ReinitIntegrationPayload {
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => ReinitSubsystemGql)
  database!: ReinitSubsystemGql;

  @Field(() => ReinitSubsystemGql)
  source!: ReinitSubsystemGql;

  @Field(() => ReinitSubsystemGql)
  destination!: ReinitSubsystemGql;
}

@ObjectType()
export class ActivityEventsPayload {
  /**
   * When true, clients should refetch the first page of `activityFeed` (no polling).
   */
  @Field(() => Boolean)
  invalidate!: boolean;
}
