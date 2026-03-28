import type { PrismaService } from '../../prisma/prisma.service';
import type { DestinationBoardPort } from '../../ports/destination-board.port';
import { redactHttpUrls } from '../../logging/redact-urls';
import { isTerminalKanbanStatus } from './kanban-terminal-status';

/**
 * PRs no longer in the scout list: mark Kanban issue done (if needed),
 * tear down the workspace + branches, and drop the sync row.
 */
export async function reconcileRemovedSyncRows(deps: {
  prisma: PrismaService;
  destinationBoard: Pick<
    DestinationBoardPort,
    'getIssue' | 'updateIssueStatus' | 'deleteWorkspace'
  >;
  urlsNow: Set<string>;
  kanbanDoneStatus: () => string;
  warn: (msg: string) => void;
}): Promise<void> {
  const tracked = await deps.prisma.syncedPullRequest.findMany();
  for (const row of tracked) {
    if (deps.urlsNow.has(row.prUrl)) {
      continue;
    }
    try {
      const issue = await deps.destinationBoard.getIssue(row.kanbanIssueId);
      if (!isTerminalKanbanStatus(issue?.status)) {
        await deps.destinationBoard.updateIssueStatus(
          row.kanbanIssueId,
          deps.kanbanDoneStatus(),
        );
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      deps.warn(`Reconcile (pr ${row.prNumber}): ${redactHttpUrls(raw)}`);
    }
    if (row.vibeKanbanWorkspaceId && deps.destinationBoard.deleteWorkspace) {
      try {
        await deps.destinationBoard.deleteWorkspace(row.vibeKanbanWorkspaceId, {
          deleteBranches: true,
        });
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        deps.warn(
          `Reconcile delete_workspace (pr ${row.prNumber}): ${redactHttpUrls(raw)}`,
        );
      }
    }
    try {
      await deps.prisma.syncedPullRequest.delete({ where: { id: row.id } });
    } catch {
      /* row may already be gone */
    }
  }
}
