import type { ActivityRunsResponse } from '@vibe-squire/shared';
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
};

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
}: ActivityFeedSectionProps) {
  return (
    <>
      {initialLoading ? <p>Loading…</p> : null}
      {errorMessage ? <p className="text-danger">{errorMessage}</p> : null}
      {runs.map((run) => (
        <ActivityRunWithItems
          key={run.id}
          run={run}
          onAccept={onAccept}
          onDecline={onDecline}
          onReconsider={onReconsider}
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
