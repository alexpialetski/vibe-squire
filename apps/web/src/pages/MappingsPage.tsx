import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiJson } from '../api';

type MappingRow = {
  id: string;
  githubRepo: string;
  vibeKanbanRepoId: string;
  label: string | null;
};

export function MappingsPage() {
  const qc = useQueryClient();
  const listQ = useQuery({
    queryKey: ['mappings'],
    queryFn: () => apiJson<MappingRow[]>('/api/mappings'),
  });

  const reposQ = useQuery({
    queryKey: ['vk', 'repos'],
    queryFn: () =>
      apiJson<{ repos: { id: string; name?: string }[] }>(
        '/api/vibe-kanban/repos',
      ),
    retry: false,
  });

  const [githubRepo, setGithubRepo] = useState('');
  const [vkRepoId, setVkRepoId] = useState('');
  const [label, setLabel] = useState('');

  const create = useMutation({
    mutationFn: () =>
      apiJson<MappingRow>('/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          githubRepo,
          vibeKanbanRepoId: vkRepoId,
          ...(label.trim() ? { label: label.trim() } : {}),
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mappings'] });
      setGithubRepo('');
      setVkRepoId('');
      setLabel('');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiJson<{ ok: boolean }>(`/api/mappings/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mappings'] }),
  });

  return (
    <div className="stack">
      <h1>Mappings</h1>
      <p className="muted">
        GitHub repo (<code>owner/repo</code>) → Vibe Kanban repository. Default
        Kanban <strong>project</strong> for new issues is set on the{' '}
        <a href="/vibe-kanban">Vibe Kanban</a> page.
      </p>
      <section className="card">
        <h2>New mapping</h2>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label className="field">
            <span className="field-label">GitHub repo</span>
            <input
              className="input"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo"
            />
          </label>
          <label className="field">
            <span className="field-label">Kanban repository</span>
            <select
              className="input"
              value={vkRepoId}
              onChange={(e) => setVkRepoId(e.target.value)}
            >
              <option value="">Select…</option>
              {(reposQ.data?.repos ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name ?? r.id}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Label (optional)</span>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn primary"
            disabled={create.isPending}
          >
            Add mapping
          </button>
          {create.isError && (
            <p className="text-danger">{create.error.message}</p>
          )}
        </form>
      </section>
      <section className="card">
        <h2>Existing</h2>
        {listQ.data?.map((row) => (
          <div key={row.id} className="row spread">
            <span>
              <code>{row.githubRepo}</code> → {row.vibeKanbanRepoId}
            </span>
            <button
              type="button"
              className="btn danger ghost"
              onClick={() => {
                if (confirm('Delete this mapping?')) remove.mutate(row.id);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
