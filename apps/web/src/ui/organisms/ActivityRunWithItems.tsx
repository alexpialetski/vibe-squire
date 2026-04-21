import type { ActivityRunsResponse } from '@vibe-squire/shared';
import { useEffect, useMemo, useState } from 'react';
import { ActivityTriageActions } from '../molecules/ActivityTriageActions';

type ActivityRun = ActivityRunsResponse['runs'][number];

type ActivityRunWithItemsProps = {
  run: ActivityRun;
  highlight?: boolean;
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

function triageSortKey(effectiveDecision: string): number {
  if (isTriageable(effectiveDecision)) return 0;
  if (effectiveDecision === 'skipped_declined') return 1;
  return 2;
}

function fmtCount(v: number | null | undefined): string {
  return v == null ? '—' : String(v);
}

export function ActivityRunWithItems({
  run,
  highlight = false,
  onAccept,
  onDecline,
  onReconsider,
}: ActivityRunWithItemsProps) {
  const sortedItems = useMemo(
    () =>
      [...run.items].sort((a, b) => {
        const ka = triageSortKey(a.effectiveDecision);
        const kb = triageSortKey(b.effectiveDecision);
        if (ka !== kb) return ka - kb;
        return a.prNumber - b.prNumber;
      }),
    [run.items],
  );

  const hasActionable = sortedItems.some((i) =>
    isTriageable(i.effectiveDecision),
  );
  const detailsDefaultOpen = highlight && hasActionable;
  const [detailsOpen, setDetailsOpen] = useState(detailsDefaultOpen);
  useEffect(() => {
    if (detailsDefaultOpen) {
      setDetailsOpen(true);
    }
  }, [detailsDefaultOpen, run.id]);
  const triggerLabel = run.trigger === 'manual' ? 'manual' : 'scheduled';

  let summaryBody: string | null = null;
  if (run.phase === 'running') {
    summaryBody = `Sync in progress... ${run.itemCount} PR row(s) recorded so far.`;
  } else if (run.phase === 'completed') {
    summaryBody =
      `${fmtCount(run.candidatesCount)} PR(s) seen · ` +
      `${fmtCount(run.issuesCreated)} created · ` +
      `${fmtCount(run.skippedUnmapped)} unmapped · ` +
      `${fmtCount(run.skippedBot)} bot · ` +
      `${fmtCount(run.skippedBoardLimit)} board limit · ` +
      `${fmtCount(run.skippedAlreadyTracked)} already tracked · ` +
      `${fmtCount(run.skippedLinkedExisting)} linked existing` +
      `${run.skippedTriage ? ` · ${fmtCount(run.skippedTriage)} pending triage` : ''}` +
      `${run.skippedDeclined ? ` · ${fmtCount(run.skippedDeclined)} declined` : ''}`;
  } else if (run.phase === 'aborted') {
    summaryBody = run.abortReason ?? 'Aborted';
  }

  return (
    <section className="card activity-run">
      <div className="activity-run-summary">
        <div className="activity-run-meta">
          <span className="activity-run-time mono">{run.startedAtLabel}</span>
          <span className="activity-pill">{triggerLabel}</span>
          <span className={`activity-pill activity-pill-phase-${run.phase}`}>
            {run.phaseLabel}
          </span>
        </div>
        {summaryBody ? (
          <p className="muted activity-run-counts">{summaryBody}</p>
        ) : null}
        {run.phase === 'failed' && run.errorMessage ? (
          <p className="banner banner-error activity-run-msg">
            {run.errorMessage}
          </p>
        ) : null}
      </div>

      {sortedItems.length > 0 ? (
        <details
          className="activity-details"
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
        >
          <summary className="activity-details-summary">
            PR details ({sortedItems.length})
            {detailsDefaultOpen ? (
              <>
                {' '}
                · <span className="triage-attention-hint">needs attention</span>
              </>
            ) : null}
          </summary>
          <div className="table-wrap activity-items-wrap">
            <table className="data-table activity-items-table">
              <thead>
                <tr>
                  <th>PR</th>
                  <th>Repo</th>
                  <th>Outcome</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const rowClass = isTriageable(item.effectiveDecision)
                    ? 'triage-pending-row'
                    : item.effectiveDecision === 'skipped_declined'
                      ? 'triage-declined-row'
                      : '';
                  return (
                    <tr key={item.prUrl} className={rowClass}>
                      <td>
                        <a href={item.prUrl} target="_blank" rel="noreferrer">
                          #{item.prNumber}
                        </a>
                        <div className="activity-pr-title muted">
                          {item.prTitle}
                        </div>
                        {item.authorLogin ? (
                          <div className="muted">@{item.authorLogin}</div>
                        ) : null}
                      </td>
                      <td className="wrap">
                        <code>{item.githubRepo}</code>
                      </td>
                      <td>
                        {item.decisionLabel}
                        {(isTriageable(item.effectiveDecision) ||
                          item.effectiveDecision === 'skipped_declined') && (
                          <ActivityTriageActions
                            prUrl={item.prUrl}
                            mode={
                              isTriageable(item.effectiveDecision)
                                ? 'pending'
                                : 'declined'
                            }
                            onAccept={onAccept}
                            onDecline={onDecline}
                            onReconsider={onReconsider}
                          />
                        )}
                      </td>
                      <td className="wrap muted">
                        {item.kanbanIssueId ? (
                          <>
                            <code>issue {item.kanbanIssueId}</code>
                            {item.detail ? ' · ' : ''}
                          </>
                        ) : null}
                        {item.detail ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      ) : (
        <p className="muted">No items in this run.</p>
      )}
    </section>
  );
}
