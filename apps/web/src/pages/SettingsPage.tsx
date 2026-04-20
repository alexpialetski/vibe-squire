import { useMutation, useQuery } from '@apollo/client';
import { settingsMetaResponseSchema } from '@vibe-squire/shared';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { EffectiveSettingsQueryQuery } from '../__generated__/graphql';
import type {
  CoreSettingFieldRow,
  EffectiveSettingsQueryData,
  UpdateSettingsMutationData,
  UpdateSettingsMutationVariables,
} from '../graphql/operator-query-types';
import {
  EFFECTIVE_SETTINGS_QUERY,
  UPDATE_SETTINGS_MUTATION,
} from '../graphql/operations';
import { OperatorSyncActions } from '../ui/molecules/OperatorSyncActions';
import { SyncAdaptersInfoCard } from '../ui/organisms/SyncAdaptersInfoCard';
import { GeneralSettingsForm } from '../ui/organisms/GeneralSettingsForm';
import { GeneralSettingsTemplate } from '../ui/templates/GeneralSettingsTemplate';
import { getErrorMessage } from '../toast';

const TEXT_FIELD_KEYS = new Set([
  'poll_interval_minutes',
  'jitter_max_seconds',
  'run_now_cooldown_seconds',
  'max_board_pr_count',
]);

export function SettingsPage() {
  const metaQ = useQuery<EffectiveSettingsQueryData>(EFFECTIVE_SETTINGS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [texts, setTexts] = useState<Record<string, string>>({});
  const [scheduledOn, setScheduledOn] = useState(false);
  const [autoCreate, setAutoCreate] = useState(false);

  useEffect(() => {
    if (!metaQ.data) return;
    const parsed = settingsMetaResponseSchema.safeParse(
      metaQ.data.effectiveSettings,
    );
    if (!parsed.success) return;
    const t: Record<string, string> = {};
    for (const f of parsed.data.coreFields) {
      t[f.key] = f.value;
    }
    setTexts(t);
    setScheduledOn(parsed.data.scheduledSyncEnabled);
    setAutoCreate(parsed.data.autoCreateIssues);
  }, [metaQ.data]);

  type CoreField = CoreSettingFieldRow;

  const [patch, { loading: saving }] = useMutation<
    UpdateSettingsMutationData,
    UpdateSettingsMutationVariables
  >(UPDATE_SETTINGS_MUTATION, {
    optimisticResponse: () => ({
      __typename: 'Mutation',
      updateSettings: {
        __typename: 'UpdateSettingsPayload',
        ok: true,
      },
    }),
    update(cache, { data }, { variables }) {
      if (!data?.updateSettings?.ok || !variables?.input) return;
      const existing = cache.readQuery<EffectiveSettingsQueryQuery>({
        query: EFFECTIVE_SETTINGS_QUERY,
      });
      if (!existing?.effectiveSettings) return;
      const input = variables.input;
      const inputByKey = input as Record<string, string | undefined>;
      const nextFields = existing.effectiveSettings.coreFields.map(
        (row: CoreField) => {
          const v = inputByKey[row.key];
          if (v === undefined) return row;
          return { ...row, value: v };
        },
      );
      cache.writeQuery({
        query: EFFECTIVE_SETTINGS_QUERY,
        data: {
          effectiveSettings: {
            ...existing.effectiveSettings,
            coreFields: nextFields,
            scheduledSyncEnabled:
              input.scheduled_sync_enabled !== undefined
                ? input.scheduled_sync_enabled === 'true'
                : existing.effectiveSettings.scheduledSyncEnabled,
            autoCreateIssues:
              input.auto_create_issues !== undefined
                ? input.auto_create_issues === 'true'
                : existing.effectiveSettings.autoCreateIssues,
          },
        },
      });
    },
    refetchQueries: [{ query: EFFECTIVE_SETTINGS_QUERY }],
    onCompleted(_d, ctx) {
      const input = ctx?.variables?.input as
        | UpdateSettingsMutationVariables['input']
        | undefined;
      const schedulerHint =
        input?.poll_interval_minutes !== undefined ||
        input?.jitter_max_seconds !== undefined;
      toast.success(
        schedulerHint
          ? 'General settings saved. Scheduler will pick up interval changes.'
          : 'General settings saved.',
      );
    },
    onError: (error) => {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    },
  });

  const textFields = useMemo(
    () =>
      (metaQ.data?.effectiveSettings.coreFields ?? []).filter((f: CoreField) =>
        TEXT_FIELD_KEYS.has(f.key),
      ),
    [metaQ.data?.effectiveSettings.coreFields],
  );

  const es = metaQ.data?.effectiveSettings;

  return (
    <GeneralSettingsTemplate
      titleRow={
        <div className="page-title-row">
          <h1>General</h1>
          <OperatorSyncActions />
        </div>
      }
      adaptersCard={
        es ? (
          <SyncAdaptersInfoCard
            resolvedSourceLabel={es.resolvedSourceLabel}
            resolvedDestinationLabel={es.resolvedDestinationLabel}
          />
        ) : null
      }
      settingsCard={
        <GeneralSettingsForm
          loading={Boolean(metaQ.loading && !metaQ.data)}
          errorMessage={metaQ.error?.message ?? null}
          scheduledOn={scheduledOn}
          autoCreate={autoCreate}
          onScheduledChange={setScheduledOn}
          onAutoCreateChange={setAutoCreate}
          textFields={textFields}
          texts={texts}
          onTextChange={(key, value) =>
            setTexts((s) => ({ ...s, [key]: value }))
          }
          saving={saving}
          onSubmit={() => {
            void patch({
              variables: {
                input: {
                  poll_interval_minutes: texts.poll_interval_minutes ?? '',
                  jitter_max_seconds: texts.jitter_max_seconds ?? '',
                  run_now_cooldown_seconds:
                    texts.run_now_cooldown_seconds ?? '',
                  max_board_pr_count: texts.max_board_pr_count ?? '',
                  scheduled_sync_enabled: scheduledOn ? 'true' : 'false',
                  auto_create_issues: autoCreate ? 'true' : 'false',
                },
              },
            });
          }}
        />
      }
    />
  );
}
