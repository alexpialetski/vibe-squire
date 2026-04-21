import { vibeKanbanUiStateSchema } from '@vibe-squire/shared';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiJson } from '../api';
import { getErrorMessage } from '../toast';

type UiState = ReturnType<typeof vibeKanbanUiStateSchema.parse>;

export function VibeKanbanPage() {
  const [uiState, setUiState] = useState<UiState | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiLoading, setUiLoading] = useState(true);

  const [orgs, setOrgs] = useState<{ id: string; name?: string }[] | null>(
    null,
  );
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const [projects, setProjects] = useState<{ id: string; name?: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [boardOrg, setBoardOrg] = useState('');
  const [boardProj, setBoardProj] = useState('');
  const [kanbanDone, setKanbanDone] = useState('');
  const [executor, setExecutor] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUiState = useCallback(async () => {
    setUiLoading(true);
    setUiError(null);
    try {
      const raw = await apiJson<unknown>('/api/vibe-kanban/ui-state');
      setUiState(vibeKanbanUiStateSchema.parse(raw));
    } catch (e: unknown) {
      setUiError(getErrorMessage(e));
      setUiState(null);
    } finally {
      setUiLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUiState();
  }, [loadUiState]);

  useEffect(() => {
    if (!uiState) return;
    setBoardOrg(uiState.boardOrg);
    setBoardProj(uiState.boardProj);
    setKanbanDone(uiState.kanbanDoneStatus);
    setExecutor(uiState.vkExecutor);
  }, [uiState]);

  useEffect(() => {
    if (!uiState?.vkBoardPicker || uiState.orgError) {
      setOrgs(null);
      return;
    }
    let cancelled = false;
    setOrgsLoading(true);
    setOrgsError(null);
    void apiJson<{ organizations: { id: string; name?: string }[] }>(
      '/api/vibe-kanban/organizations',
    )
      .then((data) => {
        if (!cancelled) setOrgs(data.organizations);
      })
      .catch((e: unknown) => {
        if (!cancelled) setOrgsError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setOrgsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uiState]);

  useEffect(() => {
    if (!boardOrg.trim()) {
      setProjects([]);
      setProjectsError(null);
      return;
    }
    let cancelled = false;
    setProjectsLoading(true);
    setProjectsError(null);
    void apiJson<{ projects: { id: string; name?: string }[] }>(
      `/api/vibe-kanban/projects?organization_id=${encodeURIComponent(boardOrg)}`,
    )
      .then((data) => {
        if (!cancelled) setProjects(data.projects);
      })
      .catch((e: unknown) => {
        if (!cancelled) setProjectsError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardOrg]);

  const handleSave = async (body: Record<string, string>) => {
    setSaving(true);
    try {
      await apiJson('/api/settings/destination', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      await loadUiState();
      setOrgs(null);
      toast.success('Vibe Kanban settings saved.');
    } catch (error: unknown) {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (uiLoading && !uiState && !uiError) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (uiError) {
    return (
      <div className="stack">
        <h1>Vibe Kanban</h1>
        <p className="muted">{uiError}</p>
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
      {orgsError ? <p className="text-danger">{orgsError}</p> : null}
      <section className="card">
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave({
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
                (orgsLoading && !orgs)
              }
            >
              <option value="">
                {!d.vkBoardPicker || d.orgError
                  ? '—'
                  : orgsLoading && !orgs
                    ? 'Loading…'
                    : 'Select…'}
              </option>
              {(orgs ?? []).map((o) => (
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
                  disabled={projectsLoading}
                >
                  <option value="">
                    {projectsLoading && projects.length === 0
                      ? 'Loading…'
                      : 'Select…'}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? p.id}
                    </option>
                  ))}
                </select>
                {projectsError ? (
                  <p className="text-danger">{projectsError}</p>
                ) : null}
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

          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>
    </div>
  );
}
