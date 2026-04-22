import { useMutation, useQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import type {
  MappingsQueryQuery,
  UpsertMappingMutationMutation,
  UpsertMappingMutationMutationVariables,
  VibeKanbanReposQuery,
} from '../__generated__/graphql';
import {
  mergeMappingListAfterWrite,
  randomOptimisticMappingId,
} from '../graphql/mappings-cache-merge';
import type { MappingGqlRow } from '../graphql/operator-query-types';
import {
  DELETE_MAPPING_MUTATION,
  MAPPINGS_QUERY,
  UPSERT_MAPPING_MUTATION,
  VIBE_KANBAN_REPOS_QUERY,
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
  const reposQ = useQuery<VibeKanbanReposQuery>(VIBE_KANBAN_REPOS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const vkRepos = (reposQ.data?.vibeKanbanRepos ?? []).map((repo) => ({
    id: repo.id,
    name: repo.name ?? undefined,
  }));
  const vkReposError = reposQ.error ? getErrorMessage(reposQ.error) : null;
  const vkReposLoading = Boolean(reposQ.loading && !reposQ.data);

  type NewMappingFormValues = {
    githubRepo: string;
    vibeKanbanRepoId: string;
  };
  const { handleSubmit, reset, setValue, watch } =
    useForm<NewMappingFormValues>({
      defaultValues: {
        githubRepo: '',
        vibeKanbanRepoId: '',
      },
    });
  const values = watch();

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
    onCompleted: () => {
      reset();
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
    onCompleted: () => toast.success('Mapping deleted.'),
    onError: (e) => toast.error(`Delete failed: ${getErrorMessage(e)}`),
  });

  const rows: MappingRow[] = listQ.data?.mappings ?? [];

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
          githubRepo={values.githubRepo ?? ''}
          vkRepoId={values.vibeKanbanRepoId ?? ''}
          vkRepos={vkRepos}
          vkReposLoading={vkReposLoading}
          upserting={upserting}
          onGithubRepoChange={(value) => {
            setValue('githubRepo', value, { shouldDirty: true });
          }}
          onVkRepoIdChange={(value) => {
            setValue('vibeKanbanRepoId', value, { shouldDirty: true });
          }}
          onSubmit={() => {
            void handleSubmit((formValues) => {
              void upsert({
                variables: {
                  input: {
                    githubRepo: formValues.githubRepo,
                    vibeKanbanRepoId: formValues.vibeKanbanRepoId,
                  },
                },
              });
            })();
          }}
        />
      }
      existingMappings={
        <MappingsTable
          rows={rows}
          listInitialLoading={Boolean(listQ.loading && !listQ.data)}
          listErrorMessage={listQ.error?.message ?? null}
          showEmptyHint={rows.length === 0 && !listQ.loading}
          deleteBusy={deleting}
          onRequestDelete={(id) => {
            void remove({ variables: { id } });
          }}
        />
      }
    />
  );
}
