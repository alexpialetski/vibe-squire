import { Inject, Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { VIBE_KANBAN_BOARD_PORT } from '../ports/injection-tokens';
import type { VibeKanbanBoardPort } from '../ports/vibe-kanban-board.port';
import type { SyncDestinationBoardPort } from '../ports/sync-destination-board.port';

/**
 * Delegates sync board operations to the adapter for the current `destination_type`.
 * v1: only `vibe_kanban` is wired; other values throw at call time.
 */
@Injectable()
export class SyncDestinationBoardFacade implements SyncDestinationBoardPort {
  constructor(
    private readonly settings: SettingsService,
    @Inject(VIBE_KANBAN_BOARD_PORT)
    private readonly vibeKanbanBoard: VibeKanbanBoardPort,
  ) {}

  private adapter(): SyncDestinationBoardPort {
    const d = this.settings.getEffective('destination_type').trim();
    if (d === 'vibe_kanban') {
      return this.vibeKanbanBoard;
    }
    throw new Error(
      `Sync destination not supported: ${d.length > 0 ? JSON.stringify(d) : '(empty)'}`,
    );
  }

  probe(): Promise<void> {
    return this.adapter().probe();
  }

  listOrganizations() {
    return this.adapter().listOrganizations();
  }

  listProjects(organizationId: string) {
    return this.adapter().listProjects(organizationId);
  }

  listRepos() {
    return this.adapter().listRepos();
  }

  listIssues(
    projectId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ) {
    return this.adapter().listIssues(projectId, opts);
  }

  countActiveVibeSquireIssues(projectId: string) {
    return this.adapter().countActiveVibeSquireIssues(projectId);
  }

  getIssue(issueId: string) {
    return this.adapter().getIssue(issueId);
  }

  createIssue(params: {
    projectId: string;
    title: string;
    description: string;
  }) {
    return this.adapter().createIssue(params);
  }

  updateIssue(issueId: string, fields: { status?: string }) {
    return this.adapter().updateIssue(issueId, fields);
  }

  startWorkspace(params: {
    name: string;
    executor: string;
    repositories: Array<{ repoId: string; branch: string }>;
    issueId?: string;
    prompt?: string;
    variant?: string;
  }) {
    return this.adapter().startWorkspace(params);
  }
}
