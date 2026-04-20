import { githubFieldsResponseSchema } from '@vibe-squire/shared';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiJson } from '../api';
import { getErrorMessage } from '../toast';

export function GithubPage() {
  const [fieldsData, setFieldsData] = useState<ReturnType<
    typeof githubFieldsResponseSchema.parse
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await apiJson<unknown>('/api/ui/github-fields');
      setFieldsData(githubFieldsResponseSchema.parse(raw));
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
      setFieldsData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!fieldsData || fieldsData.disabled) return;
    const v: Record<string, string> = {};
    for (const f of fieldsData.fields) {
      v[f.key] = f.value;
    }
    setValues(v);
  }, [fieldsData]);

  const handleSave = async (body: Record<string, string>) => {
    setSaving(true);
    try {
      await apiJson('/api/settings/source', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      await reload();
      toast.success('GitHub settings saved.');
    } catch (error: unknown) {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !fieldsData && !loadError) {
    return (
      <div className="stack">
        <h1>GitHub</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="stack">
        <h1>GitHub</h1>
        <p className="text-danger">{loadError}</p>
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
      <section className="card">
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave(values);
          }}
        >
          {(fieldsData?.fields ?? []).map((f) => (
            <label key={f.key} className="field">
              <span className="field-label">{f.label}</span>
              <textarea
                className="input"
                rows={3}
                value={values[f.key] ?? ''}
                onChange={(ev) =>
                  setValues((s) => ({ ...s, [f.key]: ev.target.value }))
                }
              />
            </label>
          ))}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>
    </div>
  );
}
