import { useQuery } from '@tanstack/react-query';
import {
  setupApiResponseSchema,
  statusSnapshotSchema,
} from '@vibe-squire/shared';
import { apiJson } from '../api';

export function DashboardPage() {
  const statusQ = useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/status');
      return statusSnapshotSchema.parse(data);
    },
  });

  const setupQ = useQuery({
    queryKey: ['ui', 'setup'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/ui/setup');
      return setupApiResponseSchema.parse(data);
    },
  });

  const snapshotPretty = statusQ.data
    ? JSON.stringify(statusQ.data, null, 2)
    : '';

  return (
    <div className="stack">
      <h1>Dashboard</h1>
      {setupQ.data && setupQ.data.checklist.length > 0 && (
        <section className="card">
          <h2>Setup</h2>
          <ul>
            {setupQ.data.checklist.map((row, i) => (
              <li key={i}>
                {row.text}
                {row.linkHref && row.linkLabel && (
                  <>
                    {' '}
                    <a href={row.linkHref}>{row.linkLabel}</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>Technical details (raw JSON)</h2>
        <pre className="pre-block">{snapshotPretty}</pre>
      </section>
    </div>
  );
}
