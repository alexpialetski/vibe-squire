import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { SettingsService } from '../settings/settings.service';
import type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from './vk-entities';
import { isVibeKanbanDestination } from './vibe-kanban-destination';
import { VIBE_SQUIRE_TITLE_MARKER } from './vk-contract';
import { vkListRowCountsTowardBoardCap } from './vk-board-cap';
import {
  normalizeIssue,
  normalizeOrg,
  normalizeProject,
  normalizeRepo,
  pickWorkspaceId,
} from './vk-board-payload-normalize';
import { VibeKanbanApiClient } from './rest/vibe-kanban-api.client';

export type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from './vk-entities';

/**
 * Vibe Kanban destination: local Vibe Kanban HTTP API (organizations, remote issues, workspaces).
 * Base URL follows Vibe Kanban desktop conventions: env overrides, then the published port file.
 */
@Injectable()
export class VibeKanbanBoardService {
  constructor(
    private readonly settings: SettingsService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly api: VibeKanbanApiClient,
  ) {}

  private ensureVibeKanbanDestination(): void {
    if (!isVibeKanbanDestination(this.appEnv.destinationType)) {
      throw new Error(
        'Vibe Kanban: VIBE_SQUIRE_DESTINATION_TYPE must be vibe_kanban for this adapter',
      );
    }
  }

  /** Reachability: health, repos, then organizations (auth-sensitive). */
  async probe(): Promise<void> {
    this.ensureVibeKanbanDestination();
    await this.api.probe();
  }

  async listOrganizations(): Promise<VkOrgRef[]> {
    this.ensureVibeKanbanDestination();
    const rows = await this.api.listOrganizations();
    return rows
      .map((o) => normalizeOrg(o))
      .filter((x): x is VkOrgRef => x != null);
  }

  async listProjects(organizationId: string): Promise<VkProjectRef[]> {
    this.ensureVibeKanbanDestination();
    const rows = await this.api.listProjects(organizationId);
    return rows
      .map((p) => normalizeProject(p))
      .filter((x): x is VkProjectRef => x != null);
  }

  async listRepos(): Promise<VkRepoRef[]> {
    this.ensureVibeKanbanDestination();
    const rows = await this.api.listRepos();
    return rows
      .map((r) => normalizeRepo(r))
      .filter((x): x is VkRepoRef => x != null);
  }

  async listIssues(
    projectId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ): Promise<VkIssueRef[]> {
    this.ensureVibeKanbanDestination();
    const rows = await this.api.listIssuesForProject(projectId, opts);
    return rows
      .map((row) => normalizeIssue(row))
      .filter((x): x is VkIssueRef => x != null);
  }

  private static readonly VK_BOARD_PAGE_SIZE = 100;
  private static readonly VK_BOARD_MAX_PAGES = 20;

  async countActiveVibeSquireIssues(projectId: string): Promise<number> {
    const kanbanDone =
      this.settings.getEffective('kanban_done_status').trim() || 'Done';
    let total = 0;
    for (
      let page = 0;
      page < VibeKanbanBoardService.VK_BOARD_MAX_PAGES;
      page++
    ) {
      const offset = page * VibeKanbanBoardService.VK_BOARD_PAGE_SIZE;
      const rows = await this.listIssues(projectId, {
        search: VIBE_SQUIRE_TITLE_MARKER,
        limit: VibeKanbanBoardService.VK_BOARD_PAGE_SIZE,
        offset,
      });
      for (const row of rows) {
        if (vkListRowCountsTowardBoardCap(row, kanbanDone)) {
          total += 1;
        }
      }
      if (rows.length < VibeKanbanBoardService.VK_BOARD_PAGE_SIZE) {
        break;
      }
    }
    return total;
  }

  async getIssue(issueId: string): Promise<VkIssueRef | null> {
    this.ensureVibeKanbanDestination();
    const row = await this.api.getIssueAsBoardRow(issueId);
    if (row == null) {
      return null;
    }
    return normalizeIssue(row);
  }

  async createIssue(params: {
    projectId: string;
    title: string;
    description: string;
  }): Promise<string> {
    this.ensureVibeKanbanDestination();
    return this.api.createIssue(params);
  }

  async updateIssue(
    issueId: string,
    fields: { status?: string },
  ): Promise<void> {
    this.ensureVibeKanbanDestination();
    if (fields.status == null) {
      return;
    }
    await this.api.updateIssueStatus(issueId, fields.status);
  }

  async startWorkspace(params: {
    name: string;
    executor: string;
    repositories: Array<{ repoId: string; branch: string }>;
    issueId?: string;
    prompt?: string;
    variant?: string;
  }): Promise<string> {
    this.ensureVibeKanbanDestination();
    const id = await this.api.startWorkspace(params);
    const sanity = pickWorkspaceId({ workspace_id: id });
    if (!sanity) {
      throw new Error(
        'start_workspace: could not parse workspace id from response',
      );
    }
    return sanity;
  }

  async deleteWorkspace(
    workspaceId: string,
    opts?: { deleteBranches?: boolean },
  ): Promise<void> {
    this.ensureVibeKanbanDestination();
    await this.api.deleteWorkspace(workspaceId, opts);
  }
}
