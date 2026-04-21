import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vibeKanbanUiStateSchema } from '@vibe-squire/shared';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiJson } from '../api';
import { getErrorMessage } from '../toast';

export function VibeKanbanPage() {
  const qc = useQueryClient();
  const uiQ = useQuery({
    queryKey: ['vk', 'ui-state'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/vibe-kanban/ui-state');
      return vibeKanbanUiStateSchema.parse(data);
    },
    retry: false,
  });

  const [boardOrg, setBoardOrg] = useState('');
  const [boardProj, setBoardProj] = useState('');
  const [kanbanDone, setKanbanDone] = useState('');
  const [executor, setExecutor] = useState('');

  useEffect(() => {
    if (!uiQ.data) return;
    setBoardOrg(uiQ.data.boardOrg);
    setBoardProj(uiQ.data.boardProj);
    setKanbanDone(uiQ.data.kanbanDoneStatus);
    setExecutor(uiQ.data.vkExecutor);
  }, [uiQ.data]);

  const patch = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      await apiJson('/api/settings/destination', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vk', 'ui-state'] });
      void qc.invalidateQueries({ queryKey: ['vk', 'organizations'] });
      void qc.invalidateQueries({ queryKey: ['vk', 'projects'] });
      toast.success('Vibe Kanban settings saved.');
    },
    onError: (error) => {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    },
  });

  const orgsQ = useQuery({
    queryKey: ['vk', 'organizations'],
    queryFn: async () => {
      const data = await apiJson<{
        organizations: { id: string; name?: string }[];
      }>('/api/vibe-kanban/organizations');
      return data.organizations;
    },
    enabled: Boolean(uiQ.data?.vkBoardPicker) && !uiQ.data?.orgError,
    retry: false,
  });

  const projectsQ = useQuery({
    queryKey: ['vk', 'projects', boardOrg],
    queryFn: async () => {
      const data = await apiJson<{ projects: { id: string; name?: string }[] }>(
        `/api/vibe-kanban/projects?organization_id=${encodeURIComponent(boardOrg)}`,
      );
      return data.projects;
    },
    enabled: boardOrg.trim().length > 0,
    retry: false,
  });

  if (uiQ.isError) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">{uiQ.error.message}</p>
      </div>
    );
  }

  if (!uiQ.data) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const d = uiQ.data;

  return (
    <div className="stack">
      <h1>Vibe Kanban</h1>
      {d.orgError && <p className="text-danger">{d.orgError}</p>}
      {orgsQ.isError && <p className="text-danger">{orgsQ.error.message}</p>}
      <section className="card">
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            patch.mutate({
              default_organization_id: boardOrg,
              default_project_id: boardProj,
              kanban_done_status: kanbanDone,
              vk_workspace_executor: executor,
            });
          }}
        >
          <label className="field">
            <span className="field-label">
              {d.vkLabels.default_organization_id}
            </span>
            <select
              className="input"
              value={boardOrg}
              onChange={(e) => {
                setBoardOrg(e.target.value);
                setBoardProj('');
              }}
              disabled={
                !d.vkBoardPicker ||
                Boolean(d.orgError) ||
                (orgsQ.isFetching && !orgsQ.data)
              }
            >
              <option value="">
                {!d.vkBoardPicker || d.orgError
                  ? '—'
                  : orgsQ.isFetching && !orgsQ.data
                    ? 'Loading…'
                    : 'Select…'}
              </option>
              {(orgsQ.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name ?? o.id}
                </option>
              ))}
            </select>
          </label>

          {boardOrg.trim() ? (
            <>
              <label className="field">
                <span className="field-label">Project</span>
                <select
                  className="input"
                  value={boardProj}
                  onChange={(e) => setBoardProj(e.target.value)}
                  disabled={projectsQ.isFetching}
                >
                  <option value="">
                    {projectsQ.isFetching && !projectsQ.data
                      ? 'Loading…'
                      : 'Select…'}
                  </option>
                  {(projectsQ.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? p.id}
                    </option>
                  ))}
                </select>
                {projectsQ.isError && (
                  <p className="text-danger">{projectsQ.error.message}</p>
                )}
              </label>
              <label className="field">
                <span className="field-label">
                  {d.vkLabels.kanban_done_status}
                </span>
                <input
                  className="input"
                  value={kanbanDone}
                  onChange={(e) => setKanbanDone(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">
                  {d.vkLabels.vk_workspace_executor}
                </span>
                <select
                  className="input"
                  value={executor}
                  onChange={(e) => setExecutor(e.target.value)}
                >
                  {d.executorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <button
            type="submit"
            className="btn primary"
            disabled={patch.isPending}
          >
            {patch.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>
    </div>
  );
}
