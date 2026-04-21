import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { activityRunsResponseSchema } from '@vibe-squire/shared';
import { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import type { ActivityFeedQueryData } from '../graphql/operator-query-types';
import { patchActivityFeedItemByPrUrl } from '../graphql/patch-activity-feed-cache';
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

  const [accept] = useMutation(ACCEPT_TRIAGE_MUTATION, {
    optimisticResponse: () => ({
      __typename: 'Mutation' as const,
      acceptTriage: {
        __typename: 'AcceptTriagePayload' as const,
        kanbanIssueId: '…',
      },
    }),
    update(cache, _res, { variables }) {
      const prUrl = variables?.prUrl;
      if (!prUrl) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mutation cache matches operator feed cache shape
      patchActivityFeedItemByPrUrl(cache, prUrl, {
        effectiveDecision: 'linked_existing',
        decisionLabel: 'Linked existing issue',
        kanbanIssueId: '…',
      });
    },
    refetchQueries: [{ query: ACTIVITY_FEED_QUERY, variables: { first: 40 } }],
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const [decline] = useMutation(DECLINE_TRIAGE_MUTATION, {
    optimisticResponse: () => ({
      __typename: 'Mutation' as const,
      declineTriage: { __typename: 'DeclineTriagePayload' as const, ok: true },
    }),
    update(cache, _res, { variables }) {
      const prUrl = variables?.prUrl;
      if (!prUrl) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mutation cache matches operator feed cache shape
      patchActivityFeedItemByPrUrl(cache, prUrl, {
        effectiveDecision: 'skipped_declined',
        decisionLabel: 'Declined',
        kanbanIssueId: null,
      });
    },
    refetchQueries: [{ query: ACTIVITY_FEED_QUERY, variables: { first: 40 } }],
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const [reconsider] = useMutation(RECONSIDER_TRIAGE_MUTATION, {
    optimisticResponse: () => ({
      __typename: 'Mutation' as const,
      reconsiderTriage: {
        __typename: 'ReconsiderTriagePayload' as const,
        ok: true,
      },
    }),
    update(cache, _res, { variables }) {
      const prUrl = variables?.prUrl;
      if (!prUrl) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mutation cache matches operator feed cache shape
      patchActivityFeedItemByPrUrl(cache, prUrl, {
        effectiveDecision: 'skipped_triage',
        decisionLabel: 'Pending triage',
        kanbanIssueId: null,
      });
    },
    refetchQueries: [{ query: ACTIVITY_FEED_QUERY, variables: { first: 40 } }],
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const loadMore = useCallback(() => {
    const cursor = feed.data?.activityFeed?.pageInfo?.endCursor;
    if (!cursor || !feed.data?.activityFeed?.pageInfo?.hasNextPage) return;
    void feed.fetchMore({
      variables: { first: 40, after: cursor },
    });
  }, [feed]);

  const onAccept = useCallback(
    (prUrl: string) => {
      void accept({ variables: { prUrl } });
    },
    [accept],
  );
  const onDecline = useCallback(
    (prUrl: string) => {
      void decline({ variables: { prUrl } });
    },
    [decline],
  );
  const onReconsider = useCallback(
    (prUrl: string) => {
      void reconsider({ variables: { prUrl } });
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
        />
      }
    />
  );
}
