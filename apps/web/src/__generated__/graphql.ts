/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any };
};

export type AcceptTriagePayload = {
  __typename?: 'AcceptTriagePayload';
  kanbanIssueId: Scalars['String']['output'];
};

export type ActivityEventsPayload = {
  __typename?: 'ActivityEventsPayload';
  invalidate: Scalars['Boolean']['output'];
};

export type ActivityFeedConnection = {
  __typename?: 'ActivityFeedConnection';
  edges: Array<ActivityFeedEdge>;
  pageInfo: ActivityFeedPageInfo;
};

export type ActivityFeedEdge = {
  __typename?: 'ActivityFeedEdge';
  cursor: Scalars['String']['output'];
  node: ActivityRunGql;
};

export type ActivityFeedPageInfo = {
  __typename?: 'ActivityFeedPageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type ActivityItemGql = {
  __typename?: 'ActivityItemGql';
  authorLogin?: Maybe<Scalars['String']['output']>;
  decision: Scalars['String']['output'];
  decisionLabel: Scalars['String']['output'];
  detail?: Maybe<Scalars['String']['output']>;
  effectiveDecision: Scalars['String']['output'];
  githubRepo: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kanbanIssueId?: Maybe<Scalars['String']['output']>;
  prNumber: Scalars['Int']['output'];
  prTitle: Scalars['String']['output'];
  prUrl: Scalars['String']['output'];
};

export type ActivityRunGql = {
  __typename?: 'ActivityRunGql';
  abortReason?: Maybe<Scalars['String']['output']>;
  candidatesCount?: Maybe<Scalars['Int']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  issuesCreated?: Maybe<Scalars['Int']['output']>;
  itemCount: Scalars['Int']['output'];
  items: Array<ActivityItemGql>;
  phase: Scalars['String']['output'];
  phaseLabel: Scalars['String']['output'];
  skippedAlreadyTracked?: Maybe<Scalars['Int']['output']>;
  skippedBoardLimit?: Maybe<Scalars['Int']['output']>;
  skippedBot?: Maybe<Scalars['Int']['output']>;
  skippedDeclined?: Maybe<Scalars['Int']['output']>;
  skippedLinkedExisting?: Maybe<Scalars['Int']['output']>;
  skippedTriage?: Maybe<Scalars['Int']['output']>;
  skippedUnmapped?: Maybe<Scalars['Int']['output']>;
  startedAt: Scalars['String']['output'];
  startedAtLabel: Scalars['String']['output'];
  trigger: Scalars['String']['output'];
};

export type CoreSettingField = {
  __typename?: 'CoreSettingField';
  description?: Maybe<Scalars['String']['output']>;
  envVar?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type DashboardSetupGql = {
  __typename?: 'DashboardSetupGql';
  checklist: Array<SetupChecklistRowGql>;
  evaluation: SetupEvaluationGql;
  reasonMessages: Array<SetupReasonMessageGql>;
};

export enum DatabaseState {
  Error = 'error',
  Ok = 'ok',
}

export type DeclineTriagePayload = {
  __typename?: 'DeclineTriagePayload';
  ok: Scalars['Boolean']['output'];
};

export type DeleteMappingPayload = {
  __typename?: 'DeleteMappingPayload';
  ok: Scalars['Boolean']['output'];
};

export enum DestinationState {
  Degraded = 'degraded',
  Error = 'error',
  Ok = 'ok',
  Unknown = 'unknown',
}

export type EffectiveSettings = {
  __typename?: 'EffectiveSettings';
  autoCreateIssues: Scalars['Boolean']['output'];
  coreFields: Array<CoreSettingField>;
  resolvedDestinationLabel: Scalars['String']['output'];
  resolvedSourceLabel: Scalars['String']['output'];
  scheduledSyncEnabled: Scalars['Boolean']['output'];
};

export enum GhState {
  Error = 'error',
  Ok = 'ok',
  Unknown = 'unknown',
}

export type GithubField = {
  __typename?: 'GithubField';
  description?: Maybe<Scalars['String']['output']>;
  envVar?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type GithubFieldsPayload = {
  __typename?: 'GithubFieldsPayload';
  disabled: Scalars['Boolean']['output'];
  fields: Array<GithubField>;
};

export type HealthStatus = {
  __typename?: 'HealthStatus';
  ok: Scalars['Boolean']['output'];
  timestamp: Scalars['DateTime']['output'];
  version: Scalars['String']['output'];
};

export type IntegrationNavGql = {
  __typename?: 'IntegrationNavGql';
  entries: Array<UiNavEntryGql>;
};

export type MappingGql = {
  __typename?: 'MappingGql';
  createdAt: Scalars['DateTime']['output'];
  githubRepo: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  vibeKanbanRepoId: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptTriage: AcceptTriagePayload;
  declineTriage: DeclineTriagePayload;
  deleteMapping: DeleteMappingPayload;
  reconsiderTriage: ReconsiderTriagePayload;
  reinitIntegration: ReinitIntegrationPayload;
  triggerSync: TriggerSyncPayload;
  updateDestinationSettings: EffectiveSettings;
  updateMapping: MappingGql;
  updateSettings: UpdateSettingsPayload;
  updateSourceSettings: EffectiveSettings;
  upsertMapping: MappingGql;
};

export type MutationAcceptTriageArgs = {
  prUrl: Scalars['String']['input'];
};

export type MutationDeclineTriageArgs = {
  prUrl: Scalars['String']['input'];
};

export type MutationDeleteMappingArgs = {
  id: Scalars['ID']['input'];
};

export type MutationReconsiderTriageArgs = {
  prUrl: Scalars['String']['input'];
};

export type MutationUpdateDestinationSettingsArgs = {
  input: UpdateDestinationSettingsInput;
};

export type MutationUpdateMappingArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMappingInput;
};

export type MutationUpdateSettingsArgs = {
  input: UpdateSettingsInput;
};

export type MutationUpdateSourceSettingsArgs = {
  input: UpdateSourceSettingsInput;
};

export type MutationUpsertMappingArgs = {
  input: UpsertMappingInput;
};

export type Query = {
  __typename?: 'Query';
  activityFeed: ActivityFeedConnection;
  dashboardSetup: DashboardSetupGql;
  effectiveSettings: EffectiveSettings;
  githubFields: GithubFieldsPayload;
  health: HealthStatus;
  integrationNav: IntegrationNavGql;
  mappings: Array<MappingGql>;
  status: StatusSnapshot;
  vibeKanbanOrganizations: Array<VibeKanbanOrganization>;
  vibeKanbanProjects: Array<VibeKanbanProject>;
  vibeKanbanRepos: Array<VibeKanbanRepo>;
  vibeKanbanUiState: VibeKanbanUiState;
};

export type QueryActivityFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryVibeKanbanProjectsArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ReconsiderTriagePayload = {
  __typename?: 'ReconsiderTriagePayload';
  ok: Scalars['Boolean']['output'];
};

export type ReinitIntegrationPayload = {
  __typename?: 'ReinitIntegrationPayload';
  database: ReinitSubsystemGql;
  destination: ReinitSubsystemGql;
  ok: Scalars['Boolean']['output'];
  source: ReinitSubsystemGql;
};

export type ReinitSubsystemGql = {
  __typename?: 'ReinitSubsystemGql';
  message?: Maybe<Scalars['String']['output']>;
  state: Scalars['String']['output'];
};

export enum ScoutUiState {
  Error = 'error',
  Idle = 'idle',
  Running = 'running',
  Skipped = 'skipped',
}

export type SetupChecklistRowGql = {
  __typename?: 'SetupChecklistRowGql';
  linkHref?: Maybe<Scalars['String']['output']>;
  linkLabel?: Maybe<Scalars['String']['output']>;
  text: Scalars['String']['output'];
};

export type SetupEvaluationGql = {
  __typename?: 'SetupEvaluationGql';
  complete: Scalars['Boolean']['output'];
  destinationType: Scalars['String']['output'];
  hasRouting: Scalars['Boolean']['output'];
  mappingCount: Scalars['Int']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  sourceType: Scalars['String']['output'];
  vibeKanbanBoardActive: Scalars['Boolean']['output'];
};

export type SetupReasonMessageGql = {
  __typename?: 'SetupReasonMessageGql';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type StatusConfiguration = {
  __typename?: 'StatusConfiguration';
  destination_type: Scalars['String']['output'];
  source_type: Scalars['String']['output'];
  vibe_kanban_board_active: Scalars['Boolean']['output'];
};

export type StatusDatabase = {
  __typename?: 'StatusDatabase';
  message?: Maybe<Scalars['String']['output']>;
  state: DatabaseState;
};

export type StatusDestination = {
  __typename?: 'StatusDestination';
  id: Scalars['String']['output'];
  lastOkAt?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  state: DestinationState;
};

export type StatusGh = {
  __typename?: 'StatusGh';
  message?: Maybe<Scalars['String']['output']>;
  state: GhState;
};

export type StatusManualSync = {
  __typename?: 'StatusManualSync';
  canRun: Scalars['Boolean']['output'];
  cooldownUntil?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
};

export type StatusScheduledSync = {
  __typename?: 'StatusScheduledSync';
  enabled: Scalars['Boolean']['output'];
};

export type StatusScout = {
  __typename?: 'StatusScout';
  id: Scalars['String']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  lastPollAt?: Maybe<Scalars['String']['output']>;
  last_poll?: Maybe<StatusScoutLastPoll>;
  nextPollAt?: Maybe<Scalars['String']['output']>;
  skipReason?: Maybe<Scalars['String']['output']>;
  state: ScoutUiState;
};

export type StatusScoutLastPoll = {
  __typename?: 'StatusScoutLastPoll';
  candidates_count?: Maybe<Scalars['Int']['output']>;
  issues_created?: Maybe<Scalars['Int']['output']>;
  skipped_unmapped?: Maybe<Scalars['Int']['output']>;
};

export type StatusSetup = {
  __typename?: 'StatusSetup';
  complete: Scalars['Boolean']['output'];
  mappingCount: Scalars['Int']['output'];
  reason?: Maybe<Scalars['String']['output']>;
};

export type StatusSnapshot = {
  __typename?: 'StatusSnapshot';
  configuration: StatusConfiguration;
  database: StatusDatabase;
  destinations: Array<StatusDestination>;
  gh: StatusGh;
  manual_sync: StatusManualSync;
  pending_triage_count?: Maybe<Scalars['Int']['output']>;
  scheduled_sync: StatusScheduledSync;
  scouts: Array<StatusScout>;
  setup: StatusSetup;
  timestamp: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  activityEvents: ActivityEventsPayload;
  statusUpdated: StatusSnapshot;
};

export type TriggerSyncPayload = {
  __typename?: 'TriggerSyncPayload';
  ok: Scalars['Boolean']['output'];
};

export type UiNavEntryGql = {
  __typename?: 'UiNavEntryGql';
  href: Scalars['String']['output'];
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
};

export type UpdateDestinationSettingsInput = {
  default_organization_id?: InputMaybe<Scalars['String']['input']>;
  default_project_id?: InputMaybe<Scalars['String']['input']>;
  kanban_done_status?: InputMaybe<Scalars['String']['input']>;
  vk_workspace_executor?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMappingInput = {
  githubRepo?: InputMaybe<Scalars['String']['input']>;
  vibeKanbanRepoId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSettingsInput = {
  auto_create_issues?: InputMaybe<Scalars['String']['input']>;
  jitter_max_seconds?: InputMaybe<Scalars['String']['input']>;
  max_board_pr_count?: InputMaybe<Scalars['String']['input']>;
  poll_interval_minutes?: InputMaybe<Scalars['String']['input']>;
  run_now_cooldown_seconds?: InputMaybe<Scalars['String']['input']>;
  scheduled_sync_enabled?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSettingsPayload = {
  __typename?: 'UpdateSettingsPayload';
  ok: Scalars['Boolean']['output'];
};

export type UpdateSourceSettingsInput = {
  pr_ignore_author_logins?: InputMaybe<Scalars['String']['input']>;
  pr_review_body_template?: InputMaybe<Scalars['String']['input']>;
};

export type UpsertMappingInput = {
  githubRepo: Scalars['String']['input'];
  vibeKanbanRepoId: Scalars['String']['input'];
};

export type VibeKanbanExecutorOption = {
  __typename?: 'VibeKanbanExecutorOption';
  label: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type VibeKanbanLabels = {
  __typename?: 'VibeKanbanLabels';
  default_organization_id: Scalars['String']['output'];
  kanban_done_status: Scalars['String']['output'];
  vk_workspace_executor: Scalars['String']['output'];
};

export type VibeKanbanOrganization = {
  __typename?: 'VibeKanbanOrganization';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type VibeKanbanProject = {
  __typename?: 'VibeKanbanProject';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type VibeKanbanRepo = {
  __typename?: 'VibeKanbanRepo';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type VibeKanbanUiState = {
  __typename?: 'VibeKanbanUiState';
  boardOrg: Scalars['String']['output'];
  boardProj: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  executorOptions: Array<VibeKanbanExecutorOption>;
  kanbanDoneStatus: Scalars['String']['output'];
  orgError?: Maybe<Scalars['String']['output']>;
  saved: Scalars['Boolean']['output'];
  vkBoardPicker: Scalars['Boolean']['output'];
  vkExecutor: Scalars['String']['output'];
  vkLabels: VibeKanbanLabels;
};

export type AcceptTriageMutationMutationVariables = Exact<{
  prUrl: Scalars['String']['input'];
}>;

export type AcceptTriageMutationMutation = {
  __typename?: 'Mutation';
  acceptTriage: { __typename?: 'AcceptTriagePayload'; kanbanIssueId: string };
};

export type ActivityEventsSubscriptionSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type ActivityEventsSubscriptionSubscription = {
  __typename?: 'Subscription';
  activityEvents: { __typename?: 'ActivityEventsPayload'; invalidate: boolean };
};

export type ActivityFeedQueryQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;

export type ActivityFeedQueryQuery = {
  __typename?: 'Query';
  activityFeed: {
    __typename?: 'ActivityFeedConnection';
    edges: Array<{
      __typename?: 'ActivityFeedEdge';
      cursor: string;
      node: {
        __typename?: 'ActivityRunGql';
        id: string;
        startedAt: string;
        startedAtLabel: string;
        finishedAt?: string | null;
        trigger: string;
        phase: string;
        phaseLabel: string;
        abortReason?: string | null;
        errorMessage?: string | null;
        candidatesCount?: number | null;
        issuesCreated?: number | null;
        skippedUnmapped?: number | null;
        skippedBot?: number | null;
        skippedBoardLimit?: number | null;
        skippedAlreadyTracked?: number | null;
        skippedLinkedExisting?: number | null;
        skippedTriage?: number | null;
        skippedDeclined?: number | null;
        itemCount: number;
        items: Array<{
          __typename?: 'ActivityItemGql';
          id: string;
          prUrl: string;
          githubRepo: string;
          prNumber: number;
          prTitle: string;
          authorLogin?: string | null;
          decision: string;
          effectiveDecision: string;
          decisionLabel: string;
          detail?: string | null;
          kanbanIssueId?: string | null;
        }>;
      };
    }>;
    pageInfo: {
      __typename?: 'ActivityFeedPageInfo';
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
};

export type DashboardSetupQueryQueryVariables = Exact<{ [key: string]: never }>;

export type DashboardSetupQueryQuery = {
  __typename?: 'Query';
  dashboardSetup: {
    __typename?: 'DashboardSetupGql';
    evaluation: {
      __typename?: 'SetupEvaluationGql';
      complete: boolean;
      reason?: string | null;
      mappingCount: number;
      sourceType: string;
      destinationType: string;
      vibeKanbanBoardActive: boolean;
      hasRouting: boolean;
    };
    checklist: Array<{
      __typename?: 'SetupChecklistRowGql';
      text: string;
      linkHref?: string | null;
      linkLabel?: string | null;
    }>;
    reasonMessages: Array<{
      __typename?: 'SetupReasonMessageGql';
      code: string;
      message: string;
    }>;
  };
};

export type DeclineTriageMutationMutationVariables = Exact<{
  prUrl: Scalars['String']['input'];
}>;

export type DeclineTriageMutationMutation = {
  __typename?: 'Mutation';
  declineTriage: { __typename?: 'DeclineTriagePayload'; ok: boolean };
};

export type DeleteMappingMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteMappingMutationMutation = {
  __typename?: 'Mutation';
  deleteMapping: { __typename?: 'DeleteMappingPayload'; ok: boolean };
};

export type EffectiveSettingsQueryQueryVariables = Exact<{
  [key: string]: never;
}>;

export type EffectiveSettingsQueryQuery = {
  __typename?: 'Query';
  effectiveSettings: {
    __typename?: 'EffectiveSettings';
    resolvedSourceLabel: string;
    resolvedDestinationLabel: string;
    scheduledSyncEnabled: boolean;
    autoCreateIssues: boolean;
    coreFields: Array<{
      __typename?: 'CoreSettingField';
      key: string;
      label: string;
      value: string;
      envVar?: string | null;
      description?: string | null;
    }>;
  };
};

export type GithubFieldsQueryVariables = Exact<{ [key: string]: never }>;

export type GithubFieldsQuery = {
  __typename?: 'Query';
  githubFields: {
    __typename?: 'GithubFieldsPayload';
    disabled: boolean;
    fields: Array<{
      __typename?: 'GithubField';
      key: string;
      label: string;
      value: string;
    }>;
  };
};

export type IntegrationNavQueryQueryVariables = Exact<{ [key: string]: never }>;

export type IntegrationNavQueryQuery = {
  __typename?: 'Query';
  integrationNav: {
    __typename?: 'IntegrationNavGql';
    entries: Array<{
      __typename?: 'UiNavEntryGql';
      id: string;
      label: string;
      href: string;
    }>;
  };
};

export type MappingsQueryQueryVariables = Exact<{ [key: string]: never }>;

export type MappingsQueryQuery = {
  __typename?: 'Query';
  mappings: Array<{
    __typename?: 'MappingGql';
    id: string;
    githubRepo: string;
    vibeKanbanRepoId: string;
    createdAt: any;
    updatedAt: any;
  }>;
};

export type ReconsiderTriageMutationMutationVariables = Exact<{
  prUrl: Scalars['String']['input'];
}>;

export type ReconsiderTriageMutationMutation = {
  __typename?: 'Mutation';
  reconsiderTriage: { __typename?: 'ReconsiderTriagePayload'; ok: boolean };
};

export type ReinitIntegrationMutationMutationVariables = Exact<{
  [key: string]: never;
}>;

export type ReinitIntegrationMutationMutation = {
  __typename?: 'Mutation';
  reinitIntegration: {
    __typename?: 'ReinitIntegrationPayload';
    ok: boolean;
    database: {
      __typename?: 'ReinitSubsystemGql';
      state: string;
      message?: string | null;
    };
    source: {
      __typename?: 'ReinitSubsystemGql';
      state: string;
      message?: string | null;
    };
    destination: {
      __typename?: 'ReinitSubsystemGql';
      state: string;
      message?: string | null;
    };
  };
};

export type TriggerSyncMutationMutationVariables = Exact<{
  [key: string]: never;
}>;

export type TriggerSyncMutationMutation = {
  __typename?: 'Mutation';
  triggerSync: { __typename?: 'TriggerSyncPayload'; ok: boolean };
};

export type UpdateDestinationSettingsMutationVariables = Exact<{
  input: UpdateDestinationSettingsInput;
}>;

export type UpdateDestinationSettingsMutation = {
  __typename?: 'Mutation';
  updateDestinationSettings: {
    __typename?: 'EffectiveSettings';
    resolvedSourceLabel: string;
    resolvedDestinationLabel: string;
    scheduledSyncEnabled: boolean;
    autoCreateIssues: boolean;
    coreFields: Array<{
      __typename?: 'CoreSettingField';
      key: string;
      value: string;
    }>;
  };
};

export type UpdateMappingMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateMappingInput;
}>;

export type UpdateMappingMutationMutation = {
  __typename?: 'Mutation';
  updateMapping: {
    __typename?: 'MappingGql';
    id: string;
    githubRepo: string;
    vibeKanbanRepoId: string;
  };
};

export type UpdateSettingsMutationMutationVariables = Exact<{
  input: UpdateSettingsInput;
}>;

export type UpdateSettingsMutationMutation = {
  __typename?: 'Mutation';
  updateSettings: { __typename?: 'UpdateSettingsPayload'; ok: boolean };
};

export type UpdateSourceSettingsMutationVariables = Exact<{
  input: UpdateSourceSettingsInput;
}>;

export type UpdateSourceSettingsMutation = {
  __typename?: 'Mutation';
  updateSourceSettings: {
    __typename?: 'EffectiveSettings';
    resolvedSourceLabel: string;
    resolvedDestinationLabel: string;
    scheduledSyncEnabled: boolean;
    autoCreateIssues: boolean;
    coreFields: Array<{
      __typename?: 'CoreSettingField';
      key: string;
      value: string;
    }>;
  };
};

export type UpsertMappingMutationMutationVariables = Exact<{
  input: UpsertMappingInput;
}>;

export type UpsertMappingMutationMutation = {
  __typename?: 'Mutation';
  upsertMapping: {
    __typename?: 'MappingGql';
    id: string;
    githubRepo: string;
    vibeKanbanRepoId: string;
  };
};

export type VibeKanbanOrganizationsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type VibeKanbanOrganizationsQuery = {
  __typename?: 'Query';
  vibeKanbanOrganizations: Array<{
    __typename?: 'VibeKanbanOrganization';
    id: string;
    name?: string | null;
  }>;
};

export type VibeKanbanProjectsQueryVariables = Exact<{
  organizationId: Scalars['ID']['input'];
}>;

export type VibeKanbanProjectsQuery = {
  __typename?: 'Query';
  vibeKanbanProjects: Array<{
    __typename?: 'VibeKanbanProject';
    id: string;
    name?: string | null;
  }>;
};

export type VibeKanbanReposQueryVariables = Exact<{ [key: string]: never }>;

export type VibeKanbanReposQuery = {
  __typename?: 'Query';
  vibeKanbanRepos: Array<{
    __typename?: 'VibeKanbanRepo';
    id: string;
    name?: string | null;
  }>;
};

export type VibeKanbanUiStateQueryVariables = Exact<{ [key: string]: never }>;

export type VibeKanbanUiStateQuery = {
  __typename?: 'Query';
  vibeKanbanUiState: {
    __typename?: 'VibeKanbanUiState';
    saved: boolean;
    error?: string | null;
    vkBoardPicker: boolean;
    boardOrg: string;
    boardProj: string;
    kanbanDoneStatus: string;
    vkExecutor: string;
    orgError?: string | null;
    executorOptions: Array<{
      __typename?: 'VibeKanbanExecutorOption';
      value: string;
      label: string;
    }>;
    vkLabels: {
      __typename?: 'VibeKanbanLabels';
      default_organization_id: string;
      vk_workspace_executor: string;
      kanban_done_status: string;
    };
  };
};

export type FullStatusSnapshotFragment = {
  __typename?: 'StatusSnapshot';
  timestamp: string;
  pending_triage_count?: number | null;
  gh: { __typename?: 'StatusGh'; state: GhState; message?: string | null };
  database: {
    __typename?: 'StatusDatabase';
    state: DatabaseState;
    message?: string | null;
  };
  setup: {
    __typename?: 'StatusSetup';
    complete: boolean;
    mappingCount: number;
    reason?: string | null;
  };
  configuration: {
    __typename?: 'StatusConfiguration';
    source_type: string;
    destination_type: string;
    vibe_kanban_board_active: boolean;
  };
  destinations: Array<{
    __typename?: 'StatusDestination';
    id: string;
    state: DestinationState;
    lastOkAt?: string | null;
    message?: string | null;
  }>;
  scouts: Array<{
    __typename?: 'StatusScout';
    id: string;
    state: ScoutUiState;
    lastPollAt?: string | null;
    nextPollAt?: string | null;
    lastError?: string | null;
    skipReason?: string | null;
    last_poll?: {
      __typename?: 'StatusScoutLastPoll';
      candidates_count?: number | null;
      skipped_unmapped?: number | null;
      issues_created?: number | null;
    } | null;
  }>;
  manual_sync: {
    __typename?: 'StatusManualSync';
    canRun: boolean;
    reason?: string | null;
    cooldownUntil?: string | null;
  };
  scheduled_sync: { __typename?: 'StatusScheduledSync'; enabled: boolean };
};

export type StatusQueryQueryVariables = Exact<{ [key: string]: never }>;

export type StatusQueryQuery = {
  __typename?: 'Query';
  status: {
    __typename?: 'StatusSnapshot';
    timestamp: string;
    pending_triage_count?: number | null;
    gh: { __typename?: 'StatusGh'; state: GhState; message?: string | null };
    database: {
      __typename?: 'StatusDatabase';
      state: DatabaseState;
      message?: string | null;
    };
    setup: {
      __typename?: 'StatusSetup';
      complete: boolean;
      mappingCount: number;
      reason?: string | null;
    };
    configuration: {
      __typename?: 'StatusConfiguration';
      source_type: string;
      destination_type: string;
      vibe_kanban_board_active: boolean;
    };
    destinations: Array<{
      __typename?: 'StatusDestination';
      id: string;
      state: DestinationState;
      lastOkAt?: string | null;
      message?: string | null;
    }>;
    scouts: Array<{
      __typename?: 'StatusScout';
      id: string;
      state: ScoutUiState;
      lastPollAt?: string | null;
      nextPollAt?: string | null;
      lastError?: string | null;
      skipReason?: string | null;
      last_poll?: {
        __typename?: 'StatusScoutLastPoll';
        candidates_count?: number | null;
        skipped_unmapped?: number | null;
        issues_created?: number | null;
      } | null;
    }>;
    manual_sync: {
      __typename?: 'StatusManualSync';
      canRun: boolean;
      reason?: string | null;
      cooldownUntil?: string | null;
    };
    scheduled_sync: { __typename?: 'StatusScheduledSync'; enabled: boolean };
  };
};

export type StatusUpdatedSubscriptionSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type StatusUpdatedSubscriptionSubscription = {
  __typename?: 'Subscription';
  statusUpdated: {
    __typename?: 'StatusSnapshot';
    timestamp: string;
    pending_triage_count?: number | null;
    gh: { __typename?: 'StatusGh'; state: GhState; message?: string | null };
    database: {
      __typename?: 'StatusDatabase';
      state: DatabaseState;
      message?: string | null;
    };
    setup: {
      __typename?: 'StatusSetup';
      complete: boolean;
      mappingCount: number;
      reason?: string | null;
    };
    configuration: {
      __typename?: 'StatusConfiguration';
      source_type: string;
      destination_type: string;
      vibe_kanban_board_active: boolean;
    };
    destinations: Array<{
      __typename?: 'StatusDestination';
      id: string;
      state: DestinationState;
      lastOkAt?: string | null;
      message?: string | null;
    }>;
    scouts: Array<{
      __typename?: 'StatusScout';
      id: string;
      state: ScoutUiState;
      lastPollAt?: string | null;
      nextPollAt?: string | null;
      lastError?: string | null;
      skipReason?: string | null;
      last_poll?: {
        __typename?: 'StatusScoutLastPoll';
        candidates_count?: number | null;
        skipped_unmapped?: number | null;
        issues_created?: number | null;
      } | null;
    }>;
    manual_sync: {
      __typename?: 'StatusManualSync';
      canRun: boolean;
      reason?: string | null;
      cooldownUntil?: string | null;
    };
    scheduled_sync: { __typename?: 'StatusScheduledSync'; enabled: boolean };
  };
};

export const FullStatusSnapshotFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FullStatusSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatusSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pending_triage_count' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'gh' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'database' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setup' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'complete' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'mappingCount' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configuration' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'source_type' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'destination_type' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vibe_kanban_board_active' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'destinations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastOkAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastPollAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nextPollAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastError' } },
                { kind: 'Field', name: { kind: 'Name', value: 'skipReason' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'last_poll' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'candidates_count' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skipped_unmapped' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'issues_created' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'manual_sync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'canRun' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'cooldownUntil' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduled_sync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<FullStatusSnapshotFragment, unknown>;
export const AcceptTriageMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AcceptTriageMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'prUrl' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'acceptTriage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'prUrl' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'prUrl' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'kanbanIssueId' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AcceptTriageMutationMutation,
  AcceptTriageMutationMutationVariables
>;
export const ActivityEventsSubscriptionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'ActivityEventsSubscription' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'activityEvents' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'invalidate' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ActivityEventsSubscriptionSubscription,
  ActivityEventsSubscriptionSubscriptionVariables
>;
export const ActivityFeedQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ActivityFeedQuery' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'activityFeed' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'edges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursor' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'node' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'startedAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'startedAtLabel' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'finishedAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'trigger' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'phase' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'phaseLabel' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'abortReason' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'errorMessage' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'candidatesCount' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'issuesCreated' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'skippedUnmapped' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'skippedBot' },
                            },
                            {
                              kind: 'Field',
                              name: {
                                kind: 'Name',
                                value: 'skippedBoardLimit',
                              },
                            },
                            {
                              kind: 'Field',
                              name: {
                                kind: 'Name',
                                value: 'skippedAlreadyTracked',
                              },
                            },
                            {
                              kind: 'Field',
                              name: {
                                kind: 'Name',
                                value: 'skippedLinkedExisting',
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'skippedTriage' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'skippedDeclined' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'itemCount' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'items' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'id' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'prUrl' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'githubRepo' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'prNumber' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'prTitle' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'authorLogin',
                                    },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'decision' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'effectiveDecision',
                                    },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'decisionLabel',
                                    },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'detail' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'kanbanIssueId',
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pageInfo' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasNextPage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endCursor' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ActivityFeedQueryQuery,
  ActivityFeedQueryQueryVariables
>;
export const DashboardSetupQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'DashboardSetupQuery' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dashboardSetup' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'evaluation' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'complete' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mappingCount' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'sourceType' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'destinationType' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'vibeKanbanBoardActive' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasRouting' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'checklist' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'text' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkHref' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkLabel' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'reasonMessages' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'code' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DashboardSetupQueryQuery,
  DashboardSetupQueryQueryVariables
>;
export const DeclineTriageMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeclineTriageMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'prUrl' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'declineTriage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'prUrl' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'prUrl' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'ok' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeclineTriageMutationMutation,
  DeclineTriageMutationMutationVariables
>;
export const DeleteMappingMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteMappingMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteMapping' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'ok' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteMappingMutationMutation,
  DeleteMappingMutationMutationVariables
>;
export const EffectiveSettingsQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EffectiveSettingsQuery' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'effectiveSettings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'coreFields' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'envVar' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'description' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resolvedSourceLabel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resolvedDestinationLabel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledSyncEnabled' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'autoCreateIssues' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EffectiveSettingsQueryQuery,
  EffectiveSettingsQueryQueryVariables
>;
export const GithubFieldsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GithubFields' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'githubFields' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'disabled' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'fields' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GithubFieldsQuery, GithubFieldsQueryVariables>;
export const IntegrationNavQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'IntegrationNavQuery' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'integrationNav' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'entries' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'href' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  IntegrationNavQueryQuery,
  IntegrationNavQueryQueryVariables
>;
export const MappingsQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MappingsQuery' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mappings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'githubRepo' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vibeKanbanRepoId' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MappingsQueryQuery, MappingsQueryQueryVariables>;
export const ReconsiderTriageMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ReconsiderTriageMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'prUrl' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'reconsiderTriage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'prUrl' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'prUrl' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'ok' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ReconsiderTriageMutationMutation,
  ReconsiderTriageMutationMutationVariables
>;
export const ReinitIntegrationMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ReinitIntegrationMutation' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'reinitIntegration' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'ok' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'database' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'source' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'destination' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ReinitIntegrationMutationMutation,
  ReinitIntegrationMutationMutationVariables
>;
export const TriggerSyncMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TriggerSyncMutation' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'triggerSync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'ok' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TriggerSyncMutationMutation,
  TriggerSyncMutationMutationVariables
>;
export const UpdateDestinationSettingsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateDestinationSettings' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateDestinationSettingsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateDestinationSettings' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'coreFields' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resolvedSourceLabel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resolvedDestinationLabel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledSyncEnabled' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'autoCreateIssues' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateDestinationSettingsMutation,
  UpdateDestinationSettingsMutationVariables
>;
export const UpdateMappingMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateMappingMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateMappingInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateMapping' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'githubRepo' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vibeKanbanRepoId' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateMappingMutationMutation,
  UpdateMappingMutationMutationVariables
>;
export const UpdateSettingsMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateSettingsMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateSettingsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateSettings' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'ok' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateSettingsMutationMutation,
  UpdateSettingsMutationMutationVariables
>;
export const UpdateSourceSettingsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateSourceSettings' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateSourceSettingsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateSourceSettings' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'coreFields' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resolvedSourceLabel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resolvedDestinationLabel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledSyncEnabled' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'autoCreateIssues' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateSourceSettingsMutation,
  UpdateSourceSettingsMutationVariables
>;
export const UpsertMappingMutationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpsertMappingMutation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpsertMappingInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'upsertMapping' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'githubRepo' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vibeKanbanRepoId' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpsertMappingMutationMutation,
  UpsertMappingMutationMutationVariables
>;
export const VibeKanbanOrganizationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'VibeKanbanOrganizations' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'vibeKanbanOrganizations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  VibeKanbanOrganizationsQuery,
  VibeKanbanOrganizationsQueryVariables
>;
export const VibeKanbanProjectsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'VibeKanbanProjects' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'organizationId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'vibeKanbanProjects' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'organizationId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'organizationId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  VibeKanbanProjectsQuery,
  VibeKanbanProjectsQueryVariables
>;
export const VibeKanbanReposDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'VibeKanbanRepos' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'vibeKanbanRepos' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  VibeKanbanReposQuery,
  VibeKanbanReposQueryVariables
>;
export const VibeKanbanUiStateDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'VibeKanbanUiState' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'vibeKanbanUiState' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'saved' } },
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vkBoardPicker' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'boardOrg' } },
                { kind: 'Field', name: { kind: 'Name', value: 'boardProj' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'kanbanDoneStatus' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'vkExecutor' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'executorOptions' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vkLabels' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: {
                          kind: 'Name',
                          value: 'default_organization_id',
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'vk_workspace_executor' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kanban_done_status' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'orgError' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  VibeKanbanUiStateQuery,
  VibeKanbanUiStateQueryVariables
>;
export const StatusQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StatusQuery' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'status' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'FullStatusSnapshot' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FullStatusSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatusSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pending_triage_count' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'gh' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'database' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setup' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'complete' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'mappingCount' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configuration' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'source_type' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'destination_type' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vibe_kanban_board_active' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'destinations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastOkAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastPollAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nextPollAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastError' } },
                { kind: 'Field', name: { kind: 'Name', value: 'skipReason' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'last_poll' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'candidates_count' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skipped_unmapped' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'issues_created' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'manual_sync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'canRun' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'cooldownUntil' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduled_sync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StatusQueryQuery, StatusQueryQueryVariables>;
export const StatusUpdatedSubscriptionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'StatusUpdatedSubscription' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'statusUpdated' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'FullStatusSnapshot' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FullStatusSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatusSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pending_triage_count' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'gh' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'database' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setup' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'complete' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'mappingCount' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configuration' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'source_type' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'destination_type' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'vibe_kanban_board_active' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'destinations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastOkAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastPollAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nextPollAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastError' } },
                { kind: 'Field', name: { kind: 'Name', value: 'skipReason' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'last_poll' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'candidates_count' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skipped_unmapped' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'issues_created' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'manual_sync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'canRun' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'cooldownUntil' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduled_sync' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  StatusUpdatedSubscriptionSubscription,
  StatusUpdatedSubscriptionSubscriptionVariables
>;
