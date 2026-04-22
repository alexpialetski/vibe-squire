import { useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import type {
  UpdateDestinationSettingsMutation,
  UpdateDestinationSettingsMutationVariables,
  VibeKanbanOrganizationsQuery,
  VibeKanbanProjectsQuery,
  VibeKanbanUiStateQuery,
} from '../__generated__/graphql';
import {
  UPDATE_DESTINATION_SETTINGS_MUTATION,
  VIBE_KANBAN_ORGANIZATIONS_QUERY,
  VIBE_KANBAN_PROJECTS_QUERY,
  VIBE_KANBAN_UI_STATE_QUERY,
} from '../graphql/operations';
import { VibeKanbanSettingsForm } from '../ui/organisms/VibeKanbanSettingsForm';
import { getErrorMessage } from '../toast';

export function VibeKanbanPage() {
  const uiStateQuery = useQuery<VibeKanbanUiStateQuery>(
    VIBE_KANBAN_UI_STATE_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );
  const uiState = uiStateQuery.data?.vibeKanbanUiState ?? null;

  type VibeKanbanFormValues = {
    default_organization_id: string;
    default_project_id: string;
    kanban_done_status: string;
    vk_workspace_executor: string;
  };
  const { handleSubmit, reset, setValue, watch } =
    useForm<VibeKanbanFormValues>({
      defaultValues: {
        default_organization_id: '',
        default_project_id: '',
        kanban_done_status: '',
        vk_workspace_executor: '',
      },
    });

  useEffect(() => {
    if (!uiState) return;
    reset({
      default_organization_id: uiState.boardOrg,
      default_project_id: uiState.boardProj,
      kanban_done_status: uiState.kanbanDoneStatus,
      vk_workspace_executor: uiState.vkExecutor,
    });
  }, [uiState, reset]);
  const values = watch();
  const boardOrg = values.default_organization_id ?? '';
  const boardProj = values.default_project_id ?? '';
  const kanbanDone = values.kanban_done_status ?? '';
  const executor = values.vk_workspace_executor ?? '';

  const orgsQuery = useQuery<VibeKanbanOrganizationsQuery>(
    VIBE_KANBAN_ORGANIZATIONS_QUERY,
    {
      skip: !uiState?.vkBoardPicker || Boolean(uiState?.orgError),
      fetchPolicy: 'cache-and-network',
    },
  );
  const orgs = useMemo(
    () => orgsQuery.data?.vibeKanbanOrganizations ?? [],
    [orgsQuery.data?.vibeKanbanOrganizations],
  );
  const projectsQuery = useQuery<VibeKanbanProjectsQuery>(
    VIBE_KANBAN_PROJECTS_QUERY,
    {
      variables: { organizationId: boardOrg },
      skip: !boardOrg.trim(),
      fetchPolicy: 'cache-and-network',
    },
  );
  const projects = useMemo(
    () => projectsQuery.data?.vibeKanbanProjects ?? [],
    [projectsQuery.data?.vibeKanbanProjects],
  );
  const projectsErrorMessage = projectsQuery.error
    ? getErrorMessage(projectsQuery.error)
    : null;
  const [saveMutation, saveState] = useMutation<
    UpdateDestinationSettingsMutation,
    UpdateDestinationSettingsMutationVariables
  >(UPDATE_DESTINATION_SETTINGS_MUTATION, {
    onCompleted: () => {
      toast.success('Vibe Kanban settings saved.');
    },
    onError: (error: unknown) => {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    },
  });

  const handleSave = async (body: Record<string, string>) => {
    await saveMutation({ variables: { input: body } });
  };

  if (uiStateQuery.loading && !uiState && !uiStateQuery.error) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (uiStateQuery.error) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">{getErrorMessage(uiStateQuery.error)}</p>
      </div>
    );
  }

  if (!uiState) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const d = uiState;

  return (
    <div className="stack">
      <h1>Vibe Kanban</h1>
      {d.orgError ? <p className="text-danger">{d.orgError}</p> : null}
      {orgsQuery.error ? (
        <p className="text-danger">{getErrorMessage(orgsQuery.error)}</p>
      ) : null}
      <VibeKanbanSettingsForm
        orgLabel={d.vkLabels.default_organization_id}
        doneStatusLabel={d.vkLabels.kanban_done_status}
        executorLabel={d.vkLabels.vk_workspace_executor}
        boardPickerEnabled={d.vkBoardPicker}
        orgErrorMessage={d.orgError ?? null}
        orgOptions={orgs}
        orgLoading={Boolean(orgsQuery.loading)}
        selectedOrgId={boardOrg}
        onOrgChange={(value) => {
          setValue('default_organization_id', value, { shouldDirty: true });
          setValue('default_project_id', '', { shouldDirty: true });
        }}
        selectedProjectId={boardProj}
        projectOptions={projects}
        projectLoading={Boolean(projectsQuery.loading)}
        projectErrorMessage={projectsErrorMessage}
        onProjectChange={(value) => {
          setValue('default_project_id', value, { shouldDirty: true });
        }}
        doneStatusValue={kanbanDone}
        onDoneStatusChange={(value) => {
          setValue('kanban_done_status', value, { shouldDirty: true });
        }}
        executorValue={executor}
        executorOptions={d.executorOptions}
        onExecutorChange={(value) => {
          setValue('vk_workspace_executor', value, { shouldDirty: true });
        }}
        saving={saveState.loading}
        onSubmit={() => {
          void handleSubmit((formValues) => {
            void handleSave({
              default_organization_id: formValues.default_organization_id,
              default_project_id: formValues.default_project_id,
              kanban_done_status: formValues.kanban_done_status,
              vk_workspace_executor: formValues.vk_workspace_executor,
            });
          })();
        }}
      />
    </div>
  );
}
