import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsMetaResponseSchema } from '@vibe-squire/shared';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiJson } from '../api';
import { getErrorMessage } from '../toast';
import { Switcher } from '../ui/atoms/Switcher';

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
      toast.success('General settings saved.');
    },
    onError: (error) => {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    },
  });

  return (
    <div className="stack">
      <h1>General</h1>
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
          <Switcher
            checked={scheduledOn}
            onChange={setScheduledOn}
            label="Enable scheduled sync"
            settingKey="scheduled_sync_enabled"
          />
          <Switcher
            checked={autoCreate}
            onChange={setAutoCreate}
            label="Auto-create issues from sync"
            settingKey="auto_create_issues"
          />
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
            {patch.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>
    </div>
  );
}
