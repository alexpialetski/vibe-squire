import type { ActivityRunsResponse } from '@vibe-squire/shared';
import { useMemo } from 'react';
import { ActivityRunWithItems } from './ActivityRunWithItems';

type ActivityRun = ActivityRunsResponse['runs'][number];

type ActivityFeedSectionProps = {
  initialLoading: boolean;
  errorMessage: string | null;
  runs: ActivityRun[];
  hasNextPage: boolean;
  loadMoreBusy: boolean;
  onLoadMore: () => void;
  onAccept: (prUrl: string) => void;
  onDecline: (prUrl: string) => void;
  onReconsider: (prUrl: string) => void;
  triageActionPendingPr: string | null;
};

function isTriageableDecision(effectiveDecision: string): boolean {
  return (
    effectiveDecision === 'skipped_triage' ||
    effectiveDecision === 'skipped_board_limit'
  );
}

export function ActivityFeedSection({
  initialLoading,
  errorMessage,
  runs,
  hasNextPage,
  loadMoreBusy,
  onLoadMore,
  onAccept,
  onDecline,
  onReconsider,
  triageActionPendingPr,
}: ActivityFeedSectionProps) {
  /** Newest run first; index 0 is the latest activity. */
  const latestRun = useMemo(() => runs[0] ?? null, [runs]);
  const latestRunId = latestRun?.id ?? null;
  const triageableCount = useMemo(() => {
    if (!latestRun) return 0;
    const unique = new Set<string>();
    for (const item of latestRun.items) {
      if (isTriageableDecision(item.effectiveDecision)) {
        unique.add(item.prUrl);
      }
    }
    return unique.size;
  }, [latestRun]);

  return (
    <>
      {initialLoading ? <p>Loading…</p> : null}
      {errorMessage ? <p className="text-danger">{errorMessage}</p> : null}
      {triageableCount > 0 ? (
        <div className="banner-triage-attention">
          <strong>{triageableCount} PR(s)</strong> awaiting your review or
          decline decision.
        </div>
      ) : null}
      {runs.map((run) => (
        <ActivityRunWithItems
          key={run.id}
          run={run}
          highlight={run.id === latestRunId}
          onAccept={onAccept}
          onDecline={onDecline}
          onReconsider={onReconsider}
          triageActionPendingPr={triageActionPendingPr}
        />
      ))}
      {hasNextPage ? (
        <button
          type="button"
          className="btn ghost"
          onClick={onLoadMore}
          disabled={loadMoreBusy}
        >
          {loadMoreBusy ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </>
  );
}
