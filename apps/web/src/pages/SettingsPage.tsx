import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsMetaResponseSchema } from '@vibe-squire/shared';
import { useEffect, useState } from 'react';
import { apiJson } from '../api';

export function SettingsPage() {
  const qc = useQueryClient();
  const metaQ = useQuery({
    queryKey: ['ui', 'settings-meta'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/ui/settings-meta');
      return settingsMetaResponseSchema.parse(data);
    },
  });

  const [texts, setTexts] = useState<Record<string, string>>({});
  const [scheduledOn, setScheduledOn] = useState(false);
  const [autoCreate, setAutoCreate] = useState(false);

  useEffect(() => {
    if (!metaQ.data) return;
    const t: Record<string, string> = {};
    for (const f of metaQ.data.coreFields) {
      t[f.key] = f.value;
    }
    setTexts(t);
    setScheduledOn(metaQ.data.scheduledSyncEnabled);
    setAutoCreate(metaQ.data.autoCreateIssues);
  }, [metaQ.data]);

  const patch = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      await apiJson<{ ok: boolean }>('/api/settings/core', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ui', 'settings-meta'] });
    },
  });

  return (
    <div className="stack">
      <h1>General</h1>
      <p className="muted">Sync adapters</p>
      {metaQ.data && (
        <p className="muted">
          Resolved for this process: source{' '}
          <strong>{metaQ.data.resolvedSourceLabel}</strong>, destination{' '}
          <strong>{metaQ.data.resolvedDestinationLabel}</strong>
        </p>
      )}
      <section className="card">
        <h2>Kanban issue creation</h2>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            patch.mutate({
              poll_interval_minutes: texts.poll_interval_minutes ?? '',
              jitter_max_seconds: texts.jitter_max_seconds ?? '',
              run_now_cooldown_seconds: texts.run_now_cooldown_seconds ?? '',
              max_board_pr_count: texts.max_board_pr_count ?? '',
              scheduled_sync_enabled: scheduledOn ? 'true' : 'false',
              auto_create_issues: autoCreate ? 'true' : 'false',
            });
          }}
        >
          <label className="field row">
            <input
              type="checkbox"
              checked={scheduledOn}
              onChange={() => setScheduledOn((v) => !v)}
            />
            <span>scheduled_sync_enabled</span>
          </label>
          <label className="field row">
            <input
              type="checkbox"
              checked={autoCreate}
              onChange={() => setAutoCreate((v) => !v)}
            />
            <span>auto_create_issues</span>
          </label>
          {(metaQ.data?.coreFields ?? []).map((f) => (
            <label key={f.key} className="field">
              <span className="field-label">{f.label}</span>
              <input
                className="input"
                name={f.key}
                value={texts[f.key] ?? ''}
                onChange={(ev) =>
                  setTexts((s) => ({ ...s, [f.key]: ev.target.value }))
                }
              />
            </label>
          ))}
          <button
            type="submit"
            className="btn primary"
            disabled={patch.isPending}
          >
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
