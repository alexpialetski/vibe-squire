import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { activityRunsResponseSchema } from '@vibe-squire/shared';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { ActivityFeedQueryData } from '../graphql/operator-query-types';
import {
  ACCEPT_TRIAGE_MUTATION,
  ACTIVITY_EVENTS_SUBSCRIPTION,
  ACTIVITY_FEED_QUERY,
  DECLINE_TRIAGE_MUTATION,
  RECONSIDER_TRIAGE_MUTATION,
} from '../graphql/operations';
import { OperatorSyncActions } from '../ui/molecules/OperatorSyncActions';
import { ActivityFeedSection } from '../ui/organisms/ActivityFeedSection';
import { ActivityPageTemplate } from '../ui/templates/ActivityPageTemplate';
import { getErrorMessage } from '../toast';

export function ActivityPage() {
  const feed = useQuery<ActivityFeedQueryData>(ACTIVITY_FEED_QUERY, {
    variables: { first: 40 },
    fetchPolicy: 'cache-and-network',
  });

  useSubscription(ACTIVITY_EVENTS_SUBSCRIPTION, {
    onData: ({ client }) => {
      void client.refetchQueries({ include: [ACTIVITY_FEED_QUERY] });
    },
  });

  const runs = useMemo(() => {
    const edges = feed.data?.activityFeed.edges ?? [];
    return edges.map((e) => e.node);
  }, [feed.data?.activityFeed.edges]);

  const parsedRuns = useMemo(() => {
    try {
      return activityRunsResponseSchema.parse({ runs }).runs;
    } catch {
      return [];
    }
  }, [runs]);

  const activityItemsByPrUrl = useMemo(() => {
    const next = new Map<
      string,
      (typeof parsedRuns)[number]['items'][number]
    >();
    for (const run of parsedRuns) {
      for (const item of run.items) {
        if (!next.has(item.prUrl)) {
          next.set(item.prUrl, item);
        }
      }
    }
    return next;
  }, [parsedRuns]);

  const optimisticActivityItem = useCallback(
    (
      prUrl: string,
      patch: Pick<
        (typeof parsedRuns)[number]['items'][number],
        'effectiveDecision' | 'decisionLabel' | 'kanbanIssueId'
      >,
    ) => {
      const existing = activityItemsByPrUrl.get(prUrl);
      return {
        __typename: 'ActivityItemGql' as const,
        id: prUrl,
        prUrl,
        githubRepo: existing?.githubRepo ?? '(updating)',
        prNumber: existing?.prNumber ?? 0,
        prTitle: existing?.prTitle ?? '(updating)',
        authorLogin: existing?.authorLogin ?? null,
        decision: existing?.decision ?? 'skipped_triage',
        effectiveDecision: patch.effectiveDecision,
        decisionLabel: patch.decisionLabel,
        detail: existing?.detail ?? null,
        kanbanIssueId: patch.kanbanIssueId,
      };
    },
    [activityItemsByPrUrl],
  );

  const [accept] = useMutation(ACCEPT_TRIAGE_MUTATION, {
    optimisticResponse: (variables) => ({
      __typename: 'Mutation' as const,
      acceptTriage: optimisticActivityItem(variables.prUrl, {
        effectiveDecision: 'linked_existing',
        decisionLabel: 'Linked existing issue',
        kanbanIssueId: '…',
      }),
    }),
    refetchQueries: [ACTIVITY_FEED_QUERY],
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const [decline] = useMutation(DECLINE_TRIAGE_MUTATION, {
    optimisticResponse: (variables) => ({
      __typename: 'Mutation' as const,
      declineTriage: optimisticActivityItem(variables.prUrl, {
        effectiveDecision: 'skipped_declined',
        decisionLabel: 'Declined',
        kanbanIssueId: null,
      }),
    }),
    refetchQueries: [ACTIVITY_FEED_QUERY],
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const [reconsider] = useMutation(RECONSIDER_TRIAGE_MUTATION, {
    optimisticResponse: (variables) => ({
      __typename: 'Mutation' as const,
      reconsiderTriage: optimisticActivityItem(variables.prUrl, {
        effectiveDecision: 'skipped_triage',
        decisionLabel: 'Pending triage',
        kanbanIssueId: null,
      }),
    }),
    refetchQueries: [ACTIVITY_FEED_QUERY],
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const [triageActionPendingPr, setTriageActionPendingPr] = useState<
    string | null
  >(null);

  const loadMore = useCallback(() => {
    const cursor = feed.data?.activityFeed?.pageInfo?.endCursor;
    if (!cursor || !feed.data?.activityFeed?.pageInfo?.hasNextPage) return;
    void feed.fetchMore({
      variables: { first: 40, after: cursor },
    });
  }, [feed]);

  const onAccept = useCallback(
    (prUrl: string) => {
      setTriageActionPendingPr(prUrl);
      void accept({ variables: { prUrl } }).finally(() => {
        setTriageActionPendingPr((c) => (c === prUrl ? null : c));
      });
    },
    [accept],
  );
  const onDecline = useCallback(
    (prUrl: string) => {
      setTriageActionPendingPr(prUrl);
      void decline({ variables: { prUrl } }).finally(() => {
        setTriageActionPendingPr((c) => (c === prUrl ? null : c));
      });
    },
    [decline],
  );
  const onReconsider = useCallback(
    (prUrl: string) => {
      setTriageActionPendingPr(prUrl);
      void reconsider({ variables: { prUrl } }).finally(() => {
        setTriageActionPendingPr((c) => (c === prUrl ? null : c));
      });
    },
    [reconsider],
  );

  return (
    <ActivityPageTemplate
      titleRow={
        <div className="page-title-row">
          <h1>Activity</h1>
          <OperatorSyncActions />
        </div>
      }
      intro={<p className="muted">Per-sync poll runs and item decisions.</p>}
      feed={
        <ActivityFeedSection
          initialLoading={Boolean(feed.loading && !feed.data)}
          errorMessage={feed.error?.message ?? null}
          runs={parsedRuns}
          hasNextPage={Boolean(feed.data?.activityFeed?.pageInfo?.hasNextPage)}
          loadMoreBusy={feed.loading}
          onLoadMore={loadMore}
          onAccept={onAccept}
          onDecline={onDecline}
          onReconsider={onReconsider}
          triageActionPendingPr={triageActionPendingPr}
        />
      }
    />
  );
}
