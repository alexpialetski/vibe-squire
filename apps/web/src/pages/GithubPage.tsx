import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { githubFieldsResponseSchema } from '@vibe-squire/shared';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiJson } from '../api';
import { getErrorMessage } from '../toast';

export function GithubPage() {
  const qc = useQueryClient();
  const fieldsQ = useQuery({
    queryKey: ['ui', 'github-fields'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/ui/github-fields');
      return githubFieldsResponseSchema.parse(data);
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!fieldsQ.data || fieldsQ.data.disabled) return;
    const v: Record<string, string> = {};
    for (const f of fieldsQ.data.fields) {
      v[f.key] = f.value;
    }
    setValues(v);
  }, [fieldsQ.data]);

  const patch = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      await apiJson('/api/settings/source', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ui', 'github-fields'] });
      toast.success('GitHub settings saved.');
    },
    onError: (error) => {
      toast.error(`Save failed: ${getErrorMessage(error)}`);
    },
  });

  if (fieldsQ.data?.disabled) {
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
            patch.mutate(values);
          }}
        >
          {(fieldsQ.data?.fields ?? []).map((f) => (
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
