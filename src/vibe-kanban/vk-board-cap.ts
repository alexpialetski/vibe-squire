import { VIBE_SQUIRE_TITLE_MARKER } from './vk-mcp-list-get-issue-response.schema';

function isTerminalKanbanStatusString(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes('done') ||
    s.includes('closed') ||
    s.includes('complete') ||
    s === 'cancelled' ||
    s === 'canceled'
  );
}

/**
 * Whether a VK issue is "done" for board-cap counting (excluded from active occupancy).
 * Matches effective `kanban_done_status` first, then substring terminal heuristics.
 */
export function isKanbanIssueDoneForBoardCount(
  status: string | undefined,
  kanbanDoneStatus: string,
): boolean {
  if (!status) {
    return false;
  }
  const s = status.trim().toLowerCase();
  const done = kanbanDoneStatus.trim().toLowerCase();
  if (done.length > 0 && s === done) {
    return true;
  }
  return isTerminalKanbanStatusString(status);
}

/** Row from `list_issues` counts toward the vibe-squire board cap if titled and not done. */
export function vkListRowCountsTowardBoardCap(
  row: { title?: string; status?: string },
  kanbanDoneStatus: string,
): boolean {
  if (!row.title?.includes(VIBE_SQUIRE_TITLE_MARKER)) {
    return false;
  }
  return !isKanbanIssueDoneForBoardCount(row.status, kanbanDoneStatus);
}
