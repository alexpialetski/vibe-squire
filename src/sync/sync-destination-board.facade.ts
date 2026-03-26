import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { VIBE_KANBAN_BOARD_PORT } from '../ports/injection-tokens';
import type { VibeKanbanBoardPort } from '../ports/vibe-kanban-board.port';
import type { SyncDestinationBoardPort } from '../ports/sync-destination-board.port';

/**
 * Delegates sync board operations to the adapter for the process `AppEnv.destinationType` (`DESTINATION_TYPE` at boot).
 * v1: only `vibe_kanban` is wired; other values throw at call time (unknown types cannot boot today).
 */
@Injectable()
export class SyncDestinationBoardFacade implements SyncDestinationBoardPort {
  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    @Inject(VIBE_KANBAN_BOARD_PORT)
    private readonly vibeKanbanBoard: VibeKanbanBoardPort,
  ) {}

  private adapter(): SyncDestinationBoardPort {
    const d = this.appEnv.destinationType;
    if (d === 'vibe_kanban') {
      return this.vibeKanbanBoard;
    }
    const label = JSON.stringify(d as string);
    throw new Error(`Sync destination not supported: ${label}`);
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
