/** Re-exports friendly names for operator query shapes (see `pnpm codegen`). */
import type {
  ActivityFeedQueryQuery,
  EffectiveSettingsQueryQuery,
  MappingsQueryQuery,
} from '../__generated__/graphql';

export type {
  ActivityFeedQueryQuery as ActivityFeedQueryData,
  EffectiveSettingsQueryQuery as EffectiveSettingsQueryData,
  IntegrationNavQueryQuery as IntegrationNavQueryData,
  MappingsQueryQuery as MappingsQueryData,
  UpdateSettingsMutationMutation as UpdateSettingsMutationData,
  UpdateSettingsMutationMutationVariables as UpdateSettingsMutationVariables,
} from '../__generated__/graphql';

export type CoreSettingFieldRow =
  EffectiveSettingsQueryQuery['effectiveSettings']['coreFields'][number];

export type MappingGqlRow = MappingsQueryQuery['mappings'][number];

export type ActivityItemRow = NonNullable<
  ActivityFeedQueryQuery['activityFeed']['edges'][number]['node']['items']
>[number];

export type ActivityRunRow = NonNullable<
  ActivityFeedQueryQuery['activityFeed']['edges'][number]['node']
>;
