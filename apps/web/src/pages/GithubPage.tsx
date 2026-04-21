import { useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type {
  GithubFieldsQuery,
  UpdateSourceSettingsMutation,
  UpdateSourceSettingsMutationVariables,
} from '../__generated__/graphql';
import {
  GITHUB_FIELDS_QUERY,
  UPDATE_SOURCE_SETTINGS_MUTATION,
} from '../graphql/operations';
import { GithubFieldsForm } from '../ui/organisms/GithubFieldsForm';
import { getErrorMessage } from '../toast';

export function GithubPage() {
  const query = useQuery<GithubFieldsQuery>(GITHUB_FIELDS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const [saveMutation, saveState] = useMutation<
    UpdateSourceSettingsMutation,
    UpdateSourceSettingsMutationVariables
  >(UPDATE_SOURCE_SETTINGS_MUTATION, {
    onCompleted: () => {
      void query.refetch().then(() => {
        toast.success('GitHub settings saved.');
      });
    },
    onError: (error: unknown) => {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const fieldsData = query.data?.githubFields ?? null;

  useEffect(() => {
    if (!fieldsData || fieldsData.disabled) return;
    const v: Record<string, string> = {};
    for (const f of fieldsData.fields) {
      v[f.key] = f.value;
    }
    setValues(v);
  }, [fieldsData]);

  const handleSave = async (body: Record<string, string>) => {
    await saveMutation({ variables: { input: body } });
  };

  if (query.loading && !fieldsData && !query.error) {
    return (
      <div className="stack">
        <h1>GitHub</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="stack">
        <h1>GitHub</h1>
        <p className="text-danger">{getErrorMessage(query.error)}</p>
      </div>
    );
  }

  if (fieldsData?.disabled) {
    return (
      <div className="stack">
        <h1>GitHub</h1>
        <p className="muted">GitHub source is not active for this process.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>GitHub</h1>
      <GithubFieldsForm
        fields={fieldsData?.fields ?? []}
        values={values}
        saving={saveState.loading}
        onValueChange={(key, value) =>
          setValues((state) => ({ ...state, [key]: value }))
        }
        onSubmit={() => {
          void handleSave(values);
        }}
      />
    </div>
  );
}
