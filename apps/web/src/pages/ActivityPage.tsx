import { useQuery } from '@tanstack/react-query';
import { activityRunsResponseSchema } from '@vibe-squire/shared';
import { apiJson } from '../api';

export function ActivityPage() {
  const q = useQuery({
    queryKey: ['activity', 'runs'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/activity/runs');
      return activityRunsResponseSchema.parse(data);
    },
  });

  return (
    <div className="stack">
      <h1>Activity</h1>
      <p className="muted">Per-sync poll runs and item decisions.</p>
      {q.isLoading && <p>Loading…</p>}
      {q.data && (
        <section className="card">
          <p>{q.data.runs.length} run(s)</p>
        </section>
      )}
    </div>
  );
}
