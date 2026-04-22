import type { ActivityFeedEdge, ActivityRunGql } from './operator-bff.types';

export type ActivityCursor = { startedAt: string; id: string };

export function encodeActivityCursor(cursor: ActivityCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeActivityCursor(raw: string): ActivityCursor {
  const json = Buffer.from(raw, 'base64url').toString('utf8');
  const parsed = JSON.parse(json) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as ActivityCursor).startedAt !== 'string' ||
    typeof (parsed as ActivityCursor).id !== 'string'
  ) {
    throw new Error('invalid_cursor');
  }
  return parsed as ActivityCursor;
}

export function buildActivityFeedEdges(
  nodes: ActivityRunGql[],
): ActivityFeedEdge[] {
  return nodes.map((node) => ({
    cursor: encodeActivityCursor({ startedAt: node.startedAt, id: node.id }),
    node,
  }));
}
