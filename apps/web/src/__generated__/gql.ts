/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'mutation AcceptTriageMutation($prUrl: String!) {\n  acceptTriage(prUrl: $prUrl) {\n    kanbanIssueId\n  }\n}': typeof types.AcceptTriageMutationDocument;
  'subscription ActivityEventsSubscription {\n  activityEvents {\n    invalidate\n  }\n}': typeof types.ActivityEventsSubscriptionDocument;
  'query ActivityFeedQuery($first: Int, $after: String) {\n  activityFeed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        startedAt\n        startedAtLabel\n        finishedAt\n        trigger\n        phase\n        phaseLabel\n        abortReason\n        errorMessage\n        candidatesCount\n        issuesCreated\n        skippedUnmapped\n        skippedBot\n        skippedBoardLimit\n        skippedAlreadyTracked\n        skippedLinkedExisting\n        skippedTriage\n        skippedDeclined\n        itemCount\n        items {\n          id\n          prUrl\n          githubRepo\n          prNumber\n          prTitle\n          authorLogin\n          decision\n          effectiveDecision\n          decisionLabel\n          detail\n          kanbanIssueId\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}': typeof types.ActivityFeedQueryDocument;
  'query DashboardSetupQuery {\n  dashboardSetup {\n    evaluation {\n      complete\n      reason\n      mappingCount\n      sourceType\n      destinationType\n      vibeKanbanBoardActive\n      hasRouting\n    }\n    checklist {\n      text\n      linkHref\n      linkLabel\n    }\n    reasonMessages {\n      code\n      message\n    }\n  }\n}': typeof types.DashboardSetupQueryDocument;
  'mutation DeclineTriageMutation($prUrl: String!) {\n  declineTriage(prUrl: $prUrl) {\n    ok\n  }\n}': typeof types.DeclineTriageMutationDocument;
  'mutation DeleteMappingMutation($id: ID!) {\n  deleteMapping(id: $id) {\n    ok\n  }\n}': typeof types.DeleteMappingMutationDocument;
  'query EffectiveSettingsQuery {\n  effectiveSettings {\n    coreFields {\n      key\n      label\n      value\n      envVar\n      description\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}': typeof types.EffectiveSettingsQueryDocument;
  'query GithubFields {\n  githubFields {\n    disabled\n    fields {\n      key\n      label\n      value\n    }\n  }\n}': typeof types.GithubFieldsDocument;
  'query IntegrationNavQuery {\n  integrationNav {\n    entries {\n      id\n      label\n      href\n    }\n  }\n}': typeof types.IntegrationNavQueryDocument;
  'query MappingsQuery {\n  mappings {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n    createdAt\n    updatedAt\n  }\n}': typeof types.MappingsQueryDocument;
  'mutation ReconsiderTriageMutation($prUrl: String!) {\n  reconsiderTriage(prUrl: $prUrl) {\n    ok\n  }\n}': typeof types.ReconsiderTriageMutationDocument;
  'mutation ReinitIntegrationMutation {\n  reinitIntegration {\n    ok\n    database {\n      state\n      message\n    }\n    source {\n      state\n      message\n    }\n    destination {\n      state\n      message\n    }\n  }\n}': typeof types.ReinitIntegrationMutationDocument;
  'mutation TriggerSyncMutation {\n  triggerSync {\n    ok\n  }\n}': typeof types.TriggerSyncMutationDocument;
  'mutation UpdateDestinationSettings($input: UpdateDestinationSettingsInput!) {\n  updateDestinationSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}': typeof types.UpdateDestinationSettingsDocument;
  'mutation UpdateMappingMutation($id: ID!, $input: UpdateMappingInput!) {\n  updateMapping(id: $id, input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}': typeof types.UpdateMappingMutationDocument;
  'mutation UpdateSettingsMutation($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    ok\n  }\n}': typeof types.UpdateSettingsMutationDocument;
  'mutation UpdateSourceSettings($input: UpdateSourceSettingsInput!) {\n  updateSourceSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}': typeof types.UpdateSourceSettingsDocument;
  'mutation UpsertMappingMutation($input: UpsertMappingInput!) {\n  upsertMapping(input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}': typeof types.UpsertMappingMutationDocument;
  'query VibeKanbanOrganizations {\n  vibeKanbanOrganizations {\n    id\n    name\n  }\n}': typeof types.VibeKanbanOrganizationsDocument;
  'query VibeKanbanProjects($organizationId: ID!) {\n  vibeKanbanProjects(organizationId: $organizationId) {\n    id\n    name\n  }\n}': typeof types.VibeKanbanProjectsDocument;
  'query VibeKanbanRepos {\n  vibeKanbanRepos {\n    id\n    name\n  }\n}': typeof types.VibeKanbanReposDocument;
  'query VibeKanbanUiState {\n  vibeKanbanUiState {\n    saved\n    error\n    vkBoardPicker\n    boardOrg\n    boardProj\n    kanbanDoneStatus\n    vkExecutor\n    executorOptions {\n      value\n      label\n    }\n    vkLabels {\n      default_organization_id\n      vk_workspace_executor\n      kanban_done_status\n    }\n    orgError\n  }\n}': typeof types.VibeKanbanUiStateDocument;
  'fragment FullStatusSnapshot on StatusSnapshot {\n  timestamp\n  pending_triage_count\n  gh {\n    state\n    message\n  }\n  database {\n    state\n    message\n  }\n  setup {\n    complete\n    mappingCount\n    reason\n  }\n  configuration {\n    source_type\n    destination_type\n    vibe_kanban_board_active\n  }\n  destinations {\n    id\n    state\n    lastOkAt\n    message\n  }\n  scouts {\n    id\n    state\n    lastPollAt\n    nextPollAt\n    lastError\n    skipReason\n    last_poll {\n      candidates_count\n      skipped_unmapped\n      issues_created\n    }\n  }\n  manual_sync {\n    canRun\n    reason\n    cooldownUntil\n  }\n  scheduled_sync {\n    enabled\n  }\n}\n\nquery StatusQuery {\n  status {\n    ...FullStatusSnapshot\n  }\n}\n\nsubscription StatusUpdatedSubscription {\n  statusUpdated {\n    ...FullStatusSnapshot\n  }\n}': typeof types.FullStatusSnapshotFragmentDoc;
};
const documents: Documents = {
  'mutation AcceptTriageMutation($prUrl: String!) {\n  acceptTriage(prUrl: $prUrl) {\n    kanbanIssueId\n  }\n}':
    types.AcceptTriageMutationDocument,
  'subscription ActivityEventsSubscription {\n  activityEvents {\n    invalidate\n  }\n}':
    types.ActivityEventsSubscriptionDocument,
  'query ActivityFeedQuery($first: Int, $after: String) {\n  activityFeed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        startedAt\n        startedAtLabel\n        finishedAt\n        trigger\n        phase\n        phaseLabel\n        abortReason\n        errorMessage\n        candidatesCount\n        issuesCreated\n        skippedUnmapped\n        skippedBot\n        skippedBoardLimit\n        skippedAlreadyTracked\n        skippedLinkedExisting\n        skippedTriage\n        skippedDeclined\n        itemCount\n        items {\n          id\n          prUrl\n          githubRepo\n          prNumber\n          prTitle\n          authorLogin\n          decision\n          effectiveDecision\n          decisionLabel\n          detail\n          kanbanIssueId\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}':
    types.ActivityFeedQueryDocument,
  'query DashboardSetupQuery {\n  dashboardSetup {\n    evaluation {\n      complete\n      reason\n      mappingCount\n      sourceType\n      destinationType\n      vibeKanbanBoardActive\n      hasRouting\n    }\n    checklist {\n      text\n      linkHref\n      linkLabel\n    }\n    reasonMessages {\n      code\n      message\n    }\n  }\n}':
    types.DashboardSetupQueryDocument,
  'mutation DeclineTriageMutation($prUrl: String!) {\n  declineTriage(prUrl: $prUrl) {\n    ok\n  }\n}':
    types.DeclineTriageMutationDocument,
  'mutation DeleteMappingMutation($id: ID!) {\n  deleteMapping(id: $id) {\n    ok\n  }\n}':
    types.DeleteMappingMutationDocument,
  'query EffectiveSettingsQuery {\n  effectiveSettings {\n    coreFields {\n      key\n      label\n      value\n      envVar\n      description\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}':
    types.EffectiveSettingsQueryDocument,
  'query GithubFields {\n  githubFields {\n    disabled\n    fields {\n      key\n      label\n      value\n    }\n  }\n}':
    types.GithubFieldsDocument,
  'query IntegrationNavQuery {\n  integrationNav {\n    entries {\n      id\n      label\n      href\n    }\n  }\n}':
    types.IntegrationNavQueryDocument,
  'query MappingsQuery {\n  mappings {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n    createdAt\n    updatedAt\n  }\n}':
    types.MappingsQueryDocument,
  'mutation ReconsiderTriageMutation($prUrl: String!) {\n  reconsiderTriage(prUrl: $prUrl) {\n    ok\n  }\n}':
    types.ReconsiderTriageMutationDocument,
  'mutation ReinitIntegrationMutation {\n  reinitIntegration {\n    ok\n    database {\n      state\n      message\n    }\n    source {\n      state\n      message\n    }\n    destination {\n      state\n      message\n    }\n  }\n}':
    types.ReinitIntegrationMutationDocument,
  'mutation TriggerSyncMutation {\n  triggerSync {\n    ok\n  }\n}':
    types.TriggerSyncMutationDocument,
  'mutation UpdateDestinationSettings($input: UpdateDestinationSettingsInput!) {\n  updateDestinationSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}':
    types.UpdateDestinationSettingsDocument,
  'mutation UpdateMappingMutation($id: ID!, $input: UpdateMappingInput!) {\n  updateMapping(id: $id, input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}':
    types.UpdateMappingMutationDocument,
  'mutation UpdateSettingsMutation($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    ok\n  }\n}':
    types.UpdateSettingsMutationDocument,
  'mutation UpdateSourceSettings($input: UpdateSourceSettingsInput!) {\n  updateSourceSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}':
    types.UpdateSourceSettingsDocument,
  'mutation UpsertMappingMutation($input: UpsertMappingInput!) {\n  upsertMapping(input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}':
    types.UpsertMappingMutationDocument,
  'query VibeKanbanOrganizations {\n  vibeKanbanOrganizations {\n    id\n    name\n  }\n}':
    types.VibeKanbanOrganizationsDocument,
  'query VibeKanbanProjects($organizationId: ID!) {\n  vibeKanbanProjects(organizationId: $organizationId) {\n    id\n    name\n  }\n}':
    types.VibeKanbanProjectsDocument,
  'query VibeKanbanRepos {\n  vibeKanbanRepos {\n    id\n    name\n  }\n}':
    types.VibeKanbanReposDocument,
  'query VibeKanbanUiState {\n  vibeKanbanUiState {\n    saved\n    error\n    vkBoardPicker\n    boardOrg\n    boardProj\n    kanbanDoneStatus\n    vkExecutor\n    executorOptions {\n      value\n      label\n    }\n    vkLabels {\n      default_organization_id\n      vk_workspace_executor\n      kanban_done_status\n    }\n    orgError\n  }\n}':
    types.VibeKanbanUiStateDocument,
  'fragment FullStatusSnapshot on StatusSnapshot {\n  timestamp\n  pending_triage_count\n  gh {\n    state\n    message\n  }\n  database {\n    state\n    message\n  }\n  setup {\n    complete\n    mappingCount\n    reason\n  }\n  configuration {\n    source_type\n    destination_type\n    vibe_kanban_board_active\n  }\n  destinations {\n    id\n    state\n    lastOkAt\n    message\n  }\n  scouts {\n    id\n    state\n    lastPollAt\n    nextPollAt\n    lastError\n    skipReason\n    last_poll {\n      candidates_count\n      skipped_unmapped\n      issues_created\n    }\n  }\n  manual_sync {\n    canRun\n    reason\n    cooldownUntil\n  }\n  scheduled_sync {\n    enabled\n  }\n}\n\nquery StatusQuery {\n  status {\n    ...FullStatusSnapshot\n  }\n}\n\nsubscription StatusUpdatedSubscription {\n  statusUpdated {\n    ...FullStatusSnapshot\n  }\n}':
    types.FullStatusSnapshotFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation AcceptTriageMutation($prUrl: String!) {\n  acceptTriage(prUrl: $prUrl) {\n    kanbanIssueId\n  }\n}',
): (typeof documents)['mutation AcceptTriageMutation($prUrl: String!) {\n  acceptTriage(prUrl: $prUrl) {\n    kanbanIssueId\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'subscription ActivityEventsSubscription {\n  activityEvents {\n    invalidate\n  }\n}',
): (typeof documents)['subscription ActivityEventsSubscription {\n  activityEvents {\n    invalidate\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query ActivityFeedQuery($first: Int, $after: String) {\n  activityFeed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        startedAt\n        startedAtLabel\n        finishedAt\n        trigger\n        phase\n        phaseLabel\n        abortReason\n        errorMessage\n        candidatesCount\n        issuesCreated\n        skippedUnmapped\n        skippedBot\n        skippedBoardLimit\n        skippedAlreadyTracked\n        skippedLinkedExisting\n        skippedTriage\n        skippedDeclined\n        itemCount\n        items {\n          id\n          prUrl\n          githubRepo\n          prNumber\n          prTitle\n          authorLogin\n          decision\n          effectiveDecision\n          decisionLabel\n          detail\n          kanbanIssueId\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}',
): (typeof documents)['query ActivityFeedQuery($first: Int, $after: String) {\n  activityFeed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        startedAt\n        startedAtLabel\n        finishedAt\n        trigger\n        phase\n        phaseLabel\n        abortReason\n        errorMessage\n        candidatesCount\n        issuesCreated\n        skippedUnmapped\n        skippedBot\n        skippedBoardLimit\n        skippedAlreadyTracked\n        skippedLinkedExisting\n        skippedTriage\n        skippedDeclined\n        itemCount\n        items {\n          id\n          prUrl\n          githubRepo\n          prNumber\n          prTitle\n          authorLogin\n          decision\n          effectiveDecision\n          decisionLabel\n          detail\n          kanbanIssueId\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query DashboardSetupQuery {\n  dashboardSetup {\n    evaluation {\n      complete\n      reason\n      mappingCount\n      sourceType\n      destinationType\n      vibeKanbanBoardActive\n      hasRouting\n    }\n    checklist {\n      text\n      linkHref\n      linkLabel\n    }\n    reasonMessages {\n      code\n      message\n    }\n  }\n}',
): (typeof documents)['query DashboardSetupQuery {\n  dashboardSetup {\n    evaluation {\n      complete\n      reason\n      mappingCount\n      sourceType\n      destinationType\n      vibeKanbanBoardActive\n      hasRouting\n    }\n    checklist {\n      text\n      linkHref\n      linkLabel\n    }\n    reasonMessages {\n      code\n      message\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation DeclineTriageMutation($prUrl: String!) {\n  declineTriage(prUrl: $prUrl) {\n    ok\n  }\n}',
): (typeof documents)['mutation DeclineTriageMutation($prUrl: String!) {\n  declineTriage(prUrl: $prUrl) {\n    ok\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation DeleteMappingMutation($id: ID!) {\n  deleteMapping(id: $id) {\n    ok\n  }\n}',
): (typeof documents)['mutation DeleteMappingMutation($id: ID!) {\n  deleteMapping(id: $id) {\n    ok\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query EffectiveSettingsQuery {\n  effectiveSettings {\n    coreFields {\n      key\n      label\n      value\n      envVar\n      description\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}',
): (typeof documents)['query EffectiveSettingsQuery {\n  effectiveSettings {\n    coreFields {\n      key\n      label\n      value\n      envVar\n      description\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query GithubFields {\n  githubFields {\n    disabled\n    fields {\n      key\n      label\n      value\n    }\n  }\n}',
): (typeof documents)['query GithubFields {\n  githubFields {\n    disabled\n    fields {\n      key\n      label\n      value\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query IntegrationNavQuery {\n  integrationNav {\n    entries {\n      id\n      label\n      href\n    }\n  }\n}',
): (typeof documents)['query IntegrationNavQuery {\n  integrationNav {\n    entries {\n      id\n      label\n      href\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query MappingsQuery {\n  mappings {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n    createdAt\n    updatedAt\n  }\n}',
): (typeof documents)['query MappingsQuery {\n  mappings {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n    createdAt\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation ReconsiderTriageMutation($prUrl: String!) {\n  reconsiderTriage(prUrl: $prUrl) {\n    ok\n  }\n}',
): (typeof documents)['mutation ReconsiderTriageMutation($prUrl: String!) {\n  reconsiderTriage(prUrl: $prUrl) {\n    ok\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation ReinitIntegrationMutation {\n  reinitIntegration {\n    ok\n    database {\n      state\n      message\n    }\n    source {\n      state\n      message\n    }\n    destination {\n      state\n      message\n    }\n  }\n}',
): (typeof documents)['mutation ReinitIntegrationMutation {\n  reinitIntegration {\n    ok\n    database {\n      state\n      message\n    }\n    source {\n      state\n      message\n    }\n    destination {\n      state\n      message\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation TriggerSyncMutation {\n  triggerSync {\n    ok\n  }\n}',
): (typeof documents)['mutation TriggerSyncMutation {\n  triggerSync {\n    ok\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation UpdateDestinationSettings($input: UpdateDestinationSettingsInput!) {\n  updateDestinationSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}',
): (typeof documents)['mutation UpdateDestinationSettings($input: UpdateDestinationSettingsInput!) {\n  updateDestinationSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation UpdateMappingMutation($id: ID!, $input: UpdateMappingInput!) {\n  updateMapping(id: $id, input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}',
): (typeof documents)['mutation UpdateMappingMutation($id: ID!, $input: UpdateMappingInput!) {\n  updateMapping(id: $id, input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation UpdateSettingsMutation($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    ok\n  }\n}',
): (typeof documents)['mutation UpdateSettingsMutation($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    ok\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation UpdateSourceSettings($input: UpdateSourceSettingsInput!) {\n  updateSourceSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}',
): (typeof documents)['mutation UpdateSourceSettings($input: UpdateSourceSettingsInput!) {\n  updateSourceSettings(input: $input) {\n    coreFields {\n      key\n      value\n    }\n    resolvedSourceLabel\n    resolvedDestinationLabel\n    scheduledSyncEnabled\n    autoCreateIssues\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation UpsertMappingMutation($input: UpsertMappingInput!) {\n  upsertMapping(input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}',
): (typeof documents)['mutation UpsertMappingMutation($input: UpsertMappingInput!) {\n  upsertMapping(input: $input) {\n    id\n    githubRepo\n    vibeKanbanRepoId\n    label\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query VibeKanbanOrganizations {\n  vibeKanbanOrganizations {\n    id\n    name\n  }\n}',
): (typeof documents)['query VibeKanbanOrganizations {\n  vibeKanbanOrganizations {\n    id\n    name\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query VibeKanbanProjects($organizationId: ID!) {\n  vibeKanbanProjects(organizationId: $organizationId) {\n    id\n    name\n  }\n}',
): (typeof documents)['query VibeKanbanProjects($organizationId: ID!) {\n  vibeKanbanProjects(organizationId: $organizationId) {\n    id\n    name\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query VibeKanbanRepos {\n  vibeKanbanRepos {\n    id\n    name\n  }\n}',
): (typeof documents)['query VibeKanbanRepos {\n  vibeKanbanRepos {\n    id\n    name\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query VibeKanbanUiState {\n  vibeKanbanUiState {\n    saved\n    error\n    vkBoardPicker\n    boardOrg\n    boardProj\n    kanbanDoneStatus\n    vkExecutor\n    executorOptions {\n      value\n      label\n    }\n    vkLabels {\n      default_organization_id\n      vk_workspace_executor\n      kanban_done_status\n    }\n    orgError\n  }\n}',
): (typeof documents)['query VibeKanbanUiState {\n  vibeKanbanUiState {\n    saved\n    error\n    vkBoardPicker\n    boardOrg\n    boardProj\n    kanbanDoneStatus\n    vkExecutor\n    executorOptions {\n      value\n      label\n    }\n    vkLabels {\n      default_organization_id\n      vk_workspace_executor\n      kanban_done_status\n    }\n    orgError\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment FullStatusSnapshot on StatusSnapshot {\n  timestamp\n  pending_triage_count\n  gh {\n    state\n    message\n  }\n  database {\n    state\n    message\n  }\n  setup {\n    complete\n    mappingCount\n    reason\n  }\n  configuration {\n    source_type\n    destination_type\n    vibe_kanban_board_active\n  }\n  destinations {\n    id\n    state\n    lastOkAt\n    message\n  }\n  scouts {\n    id\n    state\n    lastPollAt\n    nextPollAt\n    lastError\n    skipReason\n    last_poll {\n      candidates_count\n      skipped_unmapped\n      issues_created\n    }\n  }\n  manual_sync {\n    canRun\n    reason\n    cooldownUntil\n  }\n  scheduled_sync {\n    enabled\n  }\n}\n\nquery StatusQuery {\n  status {\n    ...FullStatusSnapshot\n  }\n}\n\nsubscription StatusUpdatedSubscription {\n  statusUpdated {\n    ...FullStatusSnapshot\n  }\n}',
): (typeof documents)['fragment FullStatusSnapshot on StatusSnapshot {\n  timestamp\n  pending_triage_count\n  gh {\n    state\n    message\n  }\n  database {\n    state\n    message\n  }\n  setup {\n    complete\n    mappingCount\n    reason\n  }\n  configuration {\n    source_type\n    destination_type\n    vibe_kanban_board_active\n  }\n  destinations {\n    id\n    state\n    lastOkAt\n    message\n  }\n  scouts {\n    id\n    state\n    lastPollAt\n    nextPollAt\n    lastError\n    skipReason\n    last_poll {\n      candidates_count\n      skipped_unmapped\n      issues_created\n    }\n  }\n  manual_sync {\n    canRun\n    reason\n    cooldownUntil\n  }\n  scheduled_sync {\n    enabled\n  }\n}\n\nquery StatusQuery {\n  status {\n    ...FullStatusSnapshot\n  }\n}\n\nsubscription StatusUpdatedSubscription {\n  statusUpdated {\n    ...FullStatusSnapshot\n  }\n}'];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
