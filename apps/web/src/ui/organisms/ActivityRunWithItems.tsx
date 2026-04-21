import type { ActivityRunsResponse } from '@vibe-squire/shared';
import { ActivityTriageActions } from '../molecules/ActivityTriageActions';

type ActivityRun = ActivityRunsResponse['runs'][number];

type ActivityRunWithItemsProps = {
  run: ActivityRun;
  onAccept: (prUrl: string) => void;
  onDecline: (prUrl: string) => void;
  onReconsider: (prUrl: string) => void;
};

function isTriageable(effectiveDecision: string): boolean {
  return (
    effectiveDecision === 'skipped_triage' ||
    effectiveDecision === 'skipped_board_limit' ||
    effectiveDecision === 'skipped_declined'
  );
}

export function ActivityRunWithItems({
  run,
  onAccept,
  onDecline,
  onReconsider,
}: ActivityRunWithItemsProps) {
  return (
    <section className="card">
      <header className="activity-run-header">
        <h2>
          {run.startedAtLabel} — {run.phaseLabel}
        </h2>
        <span className="muted">{run.itemCount} item(s)</span>
      </header>
      {run.items.length > 0 ? (
        <table className="data-table activity-items-table">
          <thead>
            <tr>
              <th>PR</th>
              <th>Title</th>
              <th>Author</th>
              <th>Repo</th>
              <th>Decision</th>
              <th>Detail</th>
              <th>Kanban issue</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {run.items.map((item) => (
              <tr key={item.prUrl}>
                <td>
                  <a href={item.prUrl} target="_blank" rel="noreferrer">
                    #{item.prNumber}
                  </a>
                </td>
                <td>{item.prTitle}</td>
                <td>{item.authorLogin ?? '—'}</td>
                <td>
                  <code>{item.githubRepo}</code>
                </td>
                <td>{item.decisionLabel}</td>
                <td className="muted narrow">{item.detail ?? '—'}</td>
                <td>{item.kanbanIssueId ?? '—'}</td>
                <td className="actions">
                  {isTriageable(item.effectiveDecision) ? (
                    <ActivityTriageActions
                      prUrl={item.prUrl}
                      onAccept={onAccept}
                      onDecline={onDecline}
                      onReconsider={onReconsider}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No items in this run.</p>
      )}
    </section>
  );
}
