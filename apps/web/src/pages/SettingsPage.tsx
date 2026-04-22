import { useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
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

  type SettingsFormValues = {
    poll_interval_minutes: string;
    jitter_max_seconds: string;
    run_now_cooldown_seconds: string;
    max_board_pr_count: string;
    scheduled_sync_enabled: boolean;
    auto_create_issues: boolean;
  };

  const { handleSubmit, reset, setValue, watch } = useForm<SettingsFormValues>({
    defaultValues: {
      poll_interval_minutes: '',
      jitter_max_seconds: '',
      run_now_cooldown_seconds: '',
      max_board_pr_count: '',
      scheduled_sync_enabled: false,
      auto_create_issues: false,
    },
  });

  useEffect(() => {
    const eff = metaQ.data?.effectiveSettings;
    if (!eff) return;
    const valuesByKey = new Map(
      eff.coreFields.map((field) => [field.key, field.value]),
    );
    reset({
      poll_interval_minutes: valuesByKey.get('poll_interval_minutes') ?? '',
      jitter_max_seconds: valuesByKey.get('jitter_max_seconds') ?? '',
      run_now_cooldown_seconds:
        valuesByKey.get('run_now_cooldown_seconds') ?? '',
      max_board_pr_count: valuesByKey.get('max_board_pr_count') ?? '',
      scheduled_sync_enabled: eff.scheduledSyncEnabled,
      auto_create_issues: eff.autoCreateIssues,
    });
  }, [metaQ.data, reset]);

  type CoreField = CoreSettingFieldRow;

  const [patch, { loading: saving }] = useMutation<
    UpdateSettingsMutationData,
    UpdateSettingsMutationVariables
  >(UPDATE_SETTINGS_MUTATION, {
    optimisticResponse: (variables, { IGNORE }) => {
      const existing:
        | EffectiveSettingsQueryData['effectiveSettings']
        | undefined = metaQ.data?.effectiveSettings;
      if (!existing) return IGNORE;
      const existingId = String(existing.id);
      const input = variables.input;
      const inputByKey = input as Record<string, string | undefined>;
      return {
        __typename: 'Mutation',
        updateSettings: {
          __typename: 'EffectiveSettings',
          id: existingId,
          coreFields: existing.coreFields.map((row) => ({
            __typename: 'CoreSettingField',
            ...row,
            value: inputByKey[row.key] ?? row.value,
          })),
          resolvedSourceLabel: existing.resolvedSourceLabel,
          resolvedDestinationLabel: existing.resolvedDestinationLabel,
          scheduledSyncEnabled:
            input.scheduled_sync_enabled != null
              ? input.scheduled_sync_enabled
              : existing.scheduledSyncEnabled,
          autoCreateIssues:
            input.auto_create_issues != null
              ? input.auto_create_issues
              : existing.autoCreateIssues,
        },
      };
    },
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
  const values = watch();
  const texts = {
    poll_interval_minutes: values.poll_interval_minutes ?? '',
    jitter_max_seconds: values.jitter_max_seconds ?? '',
    run_now_cooldown_seconds: values.run_now_cooldown_seconds ?? '',
    max_board_pr_count: values.max_board_pr_count ?? '',
  };

  return (
    <GeneralSettingsTemplate
      titleRow={
        <div className="page-title-row">
          <h1>General</h1>
          <OperatorSyncActions />
        </div>
      }
      settingsCard={
        <GeneralSettingsForm
          loading={Boolean(metaQ.loading && !metaQ.data)}
          errorMessage={metaQ.error?.message ?? null}
          scheduledOn={values.scheduled_sync_enabled ?? false}
          autoCreate={values.auto_create_issues ?? false}
          onScheduledChange={(next) => {
            setValue('scheduled_sync_enabled', next, { shouldDirty: true });
          }}
          onAutoCreateChange={(next) => {
            setValue('auto_create_issues', next, { shouldDirty: true });
          }}
          textFields={textFields}
          texts={texts}
          onTextChange={(key, value) =>
            setValue(key as keyof SettingsFormValues, value, {
              shouldDirty: true,
            })
          }
          saving={saving}
          onSubmit={() => {
            void handleSubmit((formValues) => {
              void patch({
                variables: {
                  input: {
                    poll_interval_minutes: formValues.poll_interval_minutes,
                    jitter_max_seconds: formValues.jitter_max_seconds,
                    run_now_cooldown_seconds:
                      formValues.run_now_cooldown_seconds,
                    max_board_pr_count: formValues.max_board_pr_count,
                    scheduled_sync_enabled: formValues.scheduled_sync_enabled,
                    auto_create_issues: formValues.auto_create_issues,
                  },
                },
              });
            })();
          }}
        />
      }
    />
  );
}
