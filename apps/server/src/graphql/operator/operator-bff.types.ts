import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';

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
  @Field(() => ID)
  id!: string;

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
export class GithubField {
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
export class GithubFieldsPayload {
  @Field(() => Boolean)
  disabled!: boolean;

  @Field(() => [GithubField])
  fields!: GithubField[];
}

@ObjectType()
export class VibeKanbanExecutorOption {
  @Field(() => String)
  value!: string;

  @Field(() => String)
  label!: string;
}

@ObjectType()
export class VibeKanbanLabels {
  @Field(() => String)
  default_organization_id!: string;

  @Field(() => String)
  vk_workspace_executor!: string;

  @Field(() => String)
  kanban_done_status!: string;
}

@ObjectType()
export class VibeKanbanUiState {
  @Field(() => Boolean)
  saved!: boolean;

  @Field(() => String, { nullable: true })
  error!: string | null;

  @Field(() => Boolean)
  vkBoardPicker!: boolean;

  @Field(() => String)
  boardOrg!: string;

  @Field(() => String)
  boardProj!: string;

  @Field(() => String)
  kanbanDoneStatus!: string;

  @Field(() => String)
  vkExecutor!: string;

  @Field(() => [VibeKanbanExecutorOption])
  executorOptions!: VibeKanbanExecutorOption[];

  @Field(() => VibeKanbanLabels)
  vkLabels!: VibeKanbanLabels;

  @Field(() => String, { nullable: true })
  orgError!: string | null;
}

@ObjectType()
export class VibeKanbanOrganization {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;
}

@ObjectType()
export class VibeKanbanProject {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;
}

@ObjectType()
export class VibeKanbanRepo {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;
}

@ObjectType()
export class MappingGql {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  githubRepo!: string;

  @Field(() => String)
  vibeKanbanRepoId!: string;

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

@InputType()
export class UpdateSettingsInput {
  @Field(() => String, { nullable: true })
  poll_interval_minutes?: string;

  @Field(() => String, { nullable: true })
  jitter_max_seconds?: string;

  @Field(() => String, { nullable: true })
  run_now_cooldown_seconds?: string;

  @Field(() => String, { nullable: true })
  max_board_pr_count?: string;

  @Field(() => String, { nullable: true })
  scheduled_sync_enabled?: string;

  @Field(() => String, { nullable: true })
  auto_create_issues?: string;
}

@InputType()
export class UpdateSourceSettingsInput {
  @Field(() => String, { nullable: true })
  github_host?: string;

  @Field(() => String, { nullable: true })
  pr_ignore_author_logins?: string;

  @Field(() => String, { nullable: true })
  pr_review_body_template?: string;
}

@InputType()
export class UpdateDestinationSettingsInput {
  @Field(() => String, { nullable: true })
  default_organization_id?: string;

  @Field(() => String, { nullable: true })
  default_project_id?: string;

  @Field(() => String, { nullable: true })
  vk_workspace_executor?: string;

  @Field(() => String, { nullable: true })
  kanban_done_status?: string;
}

@InputType()
export class UpsertMappingInput {
  @Field(() => String)
  githubRepo!: string;

  @Field(() => String)
  vibeKanbanRepoId!: string;
}

@ObjectType()
export class DeleteMappingPayload {
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
