import type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from '../vibe-kanban/vk-entities';

/**
 * Board / issue-tracker port used by sync orchestration (`RunPollCycleService`, `poll-cycle/*`).
 * Resolved at call time from `AppEnv.destinationType` (see `SyncDestinationBoardFacade`).
 * v1 surface matches Vibe Kanban; narrow or split when a second destination differs.
 */
export interface SyncDestinationBoardPort {
  probe(): Promise<void>;
  listOrganizations(): Promise<VkOrgRef[]>;
  listProjects(organizationId: string): Promise<VkProjectRef[]>;
  listRepos(): Promise<VkRepoRef[]>;
  listIssues(
    projectId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ): Promise<VkIssueRef[]>;
  /** Active `[vibe-squire]` issues on the project (not done), via `list_issues` search + paging. */
  countActiveVibeSquireIssues(projectId: string): Promise<number>;
  getIssue(issueId: string): Promise<VkIssueRef | null>;
  createIssue(params: {
    projectId: string;
    title: string;
    description: string;
  }): Promise<string>;
  updateIssue(issueId: string, fields: { status?: string }): Promise<void>;
  startWorkspace(params: {
    name: string;
    executor: string;
    repositories: Array<{ repoId: string; branch: string }>;
    issueId?: string;
    prompt?: string;
    variant?: string;
  }): Promise<string>;
}
