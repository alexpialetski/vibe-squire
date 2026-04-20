import { useMutation, useQuery } from '@apollo/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type {
  MappingsQueryQuery,
  UpdateMappingMutationMutation,
  UpdateMappingMutationMutationVariables,
  UpsertMappingMutationMutation,
  UpsertMappingMutationMutationVariables,
} from '../__generated__/graphql';
import { apiJson } from '../api';
import {
  mergeMappingListAfterWrite,
  randomOptimisticMappingId,
} from '../graphql/mappings-cache-merge';
import type { MappingGqlRow } from '../graphql/operator-query-types';
import {
  DELETE_MAPPING_MUTATION,
  MAPPINGS_QUERY,
  UPDATE_MAPPING_MUTATION,
  UPSERT_MAPPING_MUTATION,
} from '../graphql/operations';
import { OperatorSyncActions } from '../ui/molecules/OperatorSyncActions';
import { VkReposLoadErrorBanner } from '../ui/molecules/VkReposLoadErrorBanner';
import { MappingsTable } from '../ui/organisms/MappingsTable';
import { NewMappingCard } from '../ui/organisms/NewMappingCard';
import { MappingsPageTemplate } from '../ui/templates/MappingsPageTemplate';
import { getErrorMessage } from '../toast';

type MappingRow = MappingGqlRow;

export function MappingsPage() {
  const listQ = useQuery<MappingsQueryQuery>(MAPPINGS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [vkRepos, setVkRepos] = useState<{ id: string; name?: string }[]>([]);
  const [vkReposError, setVkReposError] = useState<string | null>(null);
  const [vkReposLoading, setVkReposLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setVkReposLoading(true);
    setVkReposError(null);
    void apiJson<{ repos: { id: string; name?: string }[] }>(
      '/api/vibe-kanban/repos',
    )
      .then((data) => {
        if (!cancelled) {
          setVkRepos(data.repos ?? []);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setVkReposError(getErrorMessage(e));
        }
      })
      .finally(() => {
        if (!cancelled) setVkReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [githubRepo, setGithubRepo] = useState('');
  const [vkRepoId, setVkRepoId] = useState('');
  const [label, setLabel] = useState('');

  const [upsert, { loading: upserting }] = useMutation<
    UpsertMappingMutationMutation,
    UpsertMappingMutationMutationVariables
  >(UPSERT_MAPPING_MUTATION, {
    optimisticResponse: (vars) => ({
      __typename: 'Mutation' as const,
      upsertMapping: {
        __typename: 'MappingGql' as const,
        id: randomOptimisticMappingId(),
        githubRepo: vars.input.githubRepo,
        vibeKanbanRepoId: vars.input.vibeKanbanRepoId,
        label: vars.input.label ?? null,
      },
    }),
    update(cache, { data }) {
      const m = data?.upsertMapping;
      if (!m) return;
      const existing = cache.readQuery<MappingsQueryQuery>({
        query: MAPPINGS_QUERY,
      });
      if (!existing) return;
      cache.writeQuery({
        query: MAPPINGS_QUERY,
        data: {
          mappings: mergeMappingListAfterWrite(existing.mappings, m),
        },
      });
    },
    refetchQueries: [{ query: MAPPINGS_QUERY }],
    onCompleted: () => {
      setGithubRepo('');
      setVkRepoId('');
      setLabel('');
      toast.success('Mapping added.');
    },
    onError: (e) => toast.error(`Add failed: ${getErrorMessage(e)}`),
  });

  const [remove, { loading: deleting }] = useMutation(DELETE_MAPPING_MUTATION, {
    optimisticResponse: () => ({
      __typename: 'Mutation' as const,
      deleteMapping: {
        __typename: 'DeleteMappingPayload' as const,
        ok: true,
      },
    }),
    update(cache, _result, { variables }) {
      const id = variables?.id;
      if (id === undefined) return;
      const existing = cache.readQuery<MappingsQueryQuery>({
        query: MAPPINGS_QUERY,
      });
      if (!existing) return;
      cache.writeQuery({
        query: MAPPINGS_QUERY,
        data: {
          mappings: existing.mappings.filter((m) => m.id !== id),
        },
      });
    },
    refetchQueries: [{ query: MAPPINGS_QUERY }],
    onCompleted: () => toast.success('Mapping deleted.'),
    onError: (e) => toast.error(`Delete failed: ${getErrorMessage(e)}`),
  });

  const [updateRow] = useMutation<
    UpdateMappingMutationMutation,
    UpdateMappingMutationMutationVariables
  >(UPDATE_MAPPING_MUTATION, {
    optimisticResponse: (vars) => ({
      __typename: 'Mutation' as const,
      updateMapping: {
        __typename: 'MappingGql' as const,
        id: vars.id,
        githubRepo: vars.input.githubRepo ?? '',
        vibeKanbanRepoId: vars.input.vibeKanbanRepoId ?? '',
        label: vars.input.label ?? null,
      },
    }),
    update(cache, { data }) {
      const m = data?.updateMapping;
      if (!m) return;
      const existing = cache.readQuery<MappingsQueryQuery>({
        query: MAPPINGS_QUERY,
      });
      if (!existing) return;
      cache.writeQuery({
        query: MAPPINGS_QUERY,
        data: {
          mappings: mergeMappingListAfterWrite(existing.mappings, m),
        },
      });
    },
    refetchQueries: [{ query: MAPPINGS_QUERY }],
    onError: (e) => toast.error(`Update failed: ${getErrorMessage(e)}`),
  });

  const rows: MappingRow[] = listQ.data?.mappings ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MappingRow>>({});

  const startEdit = useCallback((row: MappingRow) => {
    setEditingId(row.id);
    setDraft({
      githubRepo: row.githubRepo,
      vibeKanbanRepoId: row.vibeKanbanRepoId,
      label: row.label,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft({});
  }, []);

  const saveEdit = useCallback(
    (id: string) => {
      void updateRow({
        variables: {
          id,
          input: {
            githubRepo: draft.githubRepo,
            vibeKanbanRepoId: draft.vibeKanbanRepoId,
            label: draft.label ?? undefined,
          },
        },
      }).then(() => {
        toast.success('Mapping updated.');
        cancelEdit();
      });
    },
    [
      cancelEdit,
      draft.githubRepo,
      draft.label,
      draft.vibeKanbanRepoId,
      updateRow,
    ],
  );

  return (
    <MappingsPageTemplate
      titleRow={
        <div className="page-title-row">
          <h1>Mappings</h1>
          <OperatorSyncActions />
        </div>
      }
      intro={
        <p className="muted">
          GitHub repo (<code>owner/repo</code>) → Vibe Kanban repository.
          Default Kanban <strong>project</strong> for new issues is set on the{' '}
          <a href="/vibe-kanban">Vibe Kanban</a> page.
        </p>
      }
      vkReposError={
        vkReposError ? (
          <VkReposLoadErrorBanner
            message={vkReposError}
            onReloadPage={() => window.location.reload()}
          />
        ) : null
      }
      newMapping={
        <NewMappingCard
          githubRepo={githubRepo}
          vkRepoId={vkRepoId}
          label={label}
          vkRepos={vkRepos}
          vkReposLoading={vkReposLoading}
          upserting={upserting}
          onGithubRepoChange={setGithubRepo}
          onVkRepoIdChange={setVkRepoId}
          onLabelChange={setLabel}
          onSubmit={() => {
            void upsert({
              variables: {
                input: {
                  githubRepo,
                  vibeKanbanRepoId: vkRepoId,
                  ...(label.trim() ? { label: label.trim() } : {}),
                },
              },
            });
          }}
        />
      }
      existingMappings={
        <MappingsTable
          rows={rows}
          vkRepos={vkRepos}
          listInitialLoading={Boolean(listQ.loading && !listQ.data)}
          listErrorMessage={listQ.error?.message ?? null}
          showEmptyHint={rows.length === 0 && !listQ.loading}
          editingId={editingId}
          draft={draft}
          deleteBusy={deleting}
          onDraftChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onRequestDelete={(id) => {
            void remove({ variables: { id } });
          }}
        />
      }
    />
  );
}
