import { Injectable } from '@nestjs/common';
import { VibeKanbanBoardService } from '../../vibe-kanban/vibe-kanban-board.service';
import type {
  BoardIssueRef,
  DestinationBoardPort,
  WorkspaceStartParams,
} from '../../ports/destination-board.port';

function toBoardIssue(row: {
  id: string;
  title?: string | null;
  status?: string | null;
  description?: string | null;
}): BoardIssueRef {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    description: row.description,
  };
}

@Injectable()
export class VkBoardAdapterService implements DestinationBoardPort {
  constructor(private readonly vk: VibeKanbanBoardService) {}

  probe(): Promise<void> {
    return this.vk.probe();
  }

  countActiveIssues(boardId: string): Promise<number> {
    return this.vk.countActiveVibeSquireIssues(boardId);
  }

  listIssues(
    boardId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ): Promise<BoardIssueRef[]> {
    return this.vk
      .listIssues(boardId, opts)
      .then((rows) => rows.map((r) => toBoardIssue(r)));
  }

  getIssue(issueId: string): Promise<BoardIssueRef | null> {
    return this.vk.getIssue(issueId).then((r) => {
      if (r == null || typeof r !== 'object') {
        return null;
      }
      const id = (r as { id?: unknown }).id;
      if (typeof id !== 'string' || id.length === 0) {
        return null;
      }
      return toBoardIssue(r as Parameters<typeof toBoardIssue>[0]);
    });
  }

  createIssue(params: {
    boardId: string;
    title: string;
    description: string;
  }): Promise<string> {
    return this.vk.createIssue({
      projectId: params.boardId,
      title: params.title,
      description: params.description,
    });
  }

  updateIssueStatus(issueId: string, status: string): Promise<void> {
    return this.vk.updateIssue(issueId, { status });
  }

  startWorkspace(params: WorkspaceStartParams): Promise<string> {
    return this.vk.startWorkspace(params);
  }

  deleteWorkspace(
    workspaceId: string,
    opts?: { deleteBranches?: boolean },
  ): Promise<void> {
    return this.vk.deleteWorkspace(workspaceId, opts);
  }
}
