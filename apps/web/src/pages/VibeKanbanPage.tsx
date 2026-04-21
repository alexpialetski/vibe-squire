import { useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
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

  const [boardOrg, setBoardOrg] = useState('');
  const [boardProj, setBoardProj] = useState('');
  const [kanbanDone, setKanbanDone] = useState('');
  const [executor, setExecutor] = useState('');

  useEffect(() => {
    if (!uiState) return;
    setBoardOrg(uiState.boardOrg);
    setBoardProj(uiState.boardProj);
    setKanbanDone(uiState.kanbanDoneStatus);
    setExecutor(uiState.vkExecutor);
  }, [uiState]);

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
      void uiStateQuery.refetch().then(() => {
        toast.success('Vibe Kanban settings saved.');
      });
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
          setBoardOrg(value);
          setBoardProj('');
        }}
        selectedProjectId={boardProj}
        projectOptions={projects}
        projectLoading={Boolean(projectsQuery.loading)}
        projectErrorMessage={projectsErrorMessage}
        onProjectChange={setBoardProj}
        doneStatusValue={kanbanDone}
        onDoneStatusChange={setKanbanDone}
        executorValue={executor}
        executorOptions={d.executorOptions}
        onExecutorChange={setExecutor}
        saving={saveState.loading}
        onSubmit={() => {
          void handleSave({
            default_organization_id: boardOrg,
            default_project_id: boardProj,
            kanban_done_status: kanbanDone,
            vk_workspace_executor: executor,
          });
        }}
      />
    </div>
  );
}
