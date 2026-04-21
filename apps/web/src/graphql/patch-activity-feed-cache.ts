import type { ApolloCache } from '@apollo/client';
import type { ActivityFeedQueryQuery } from '../__generated__/graphql';
import { ACTIVITY_FEED_QUERY } from './operations';

const FEED_FIRST_PAGE_VARS = { first: 40 } as const;

type FeedItem = NonNullable<
  ActivityFeedQueryQuery['activityFeed']['edges'][number]['node']['items']
>[number];

type ItemPatch = Pick<
  FeedItem,
  'effectiveDecision' | 'decisionLabel' | 'kanbanIssueId'
>;

/** Patches the first activity feed page in cache (matches `ActivityPage` default variables). */
export function patchActivityFeedItemByPrUrl(
  cache: ApolloCache<object>,
  prUrl: string,
  patch: ItemPatch,
): void {
  cache.updateQuery<ActivityFeedQueryQuery>(
    { query: ACTIVITY_FEED_QUERY, variables: { ...FEED_FIRST_PAGE_VARS } },
    (data): ActivityFeedQueryQuery | null => {
      if (!data?.activityFeed) {
        return data;
      }
      return {
        ...data,
        activityFeed: {
          ...data.activityFeed,
          edges: data.activityFeed.edges.map((edge) => ({
            ...edge,
            node: {
              ...edge.node,
              items: edge.node.items.map((item) =>
                item.prUrl === prUrl ? { ...item, ...patch } : item,
              ),
            },
          })),
        },
      };
    },
  );
}
