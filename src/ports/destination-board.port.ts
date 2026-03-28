/**
 * Generic work-board surface for sync (`RunPollCycleService`, `poll-cycle/*`).
 * VK-specific listing APIs for the operator UI stay on {@link VibeKanbanMcpService}.
 *
 * Sync also needs issue search / fetch; those are included here (orchestration), not in the
 * minimal sketch in PLUGIN-ARCHITECTURE-PLAN.md §1.
 */
export type WorkspaceStartParams = {
  name: string;
  executor: string;
  repositories: Array<{ repoId: string; branch: string }>;
  issueId?: string;
  prompt?: string;
  variant?: string;
};

/** Minimal issue shape for sync (no VK-specific field names in core). */
export type BoardIssueRef = {
  id: string;
  title?: string | null;
  status?: string | null;
  description?: string | null;
};

export interface DestinationBoardPort {
  probe(): Promise<void>;
  countActiveIssues(boardId: string): Promise<number>;
  listIssues(
    boardId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ): Promise<BoardIssueRef[]>;
  getIssue(issueId: string): Promise<BoardIssueRef | null>;
  createIssue(params: {
    boardId: string;
    title: string;
    description: string;
  }): Promise<string>;
  updateIssueStatus(issueId: string, status: string): Promise<void>;
  startWorkspace?(params: WorkspaceStartParams): Promise<string>;
  deleteWorkspace?(
    workspaceId: string,
    opts?: { deleteBranches?: boolean },
  ): Promise<void>;
}
