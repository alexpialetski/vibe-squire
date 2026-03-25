import type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from '../vibe-kanban/vk-entities';

/** Work-board destination port for Vibe Kanban–style MCP tools (§2.1, §6). */
export interface WorkBoardPort {
  probe(): Promise<void>;
  listOrganizations(): Promise<VkOrgRef[]>;
  listProjects(organizationId: string): Promise<VkProjectRef[]>;
  listRepos(): Promise<VkRepoRef[]>;
  listIssues(
    projectId: string,
    opts?: { search?: string; limit?: number },
  ): Promise<VkIssueRef[]>;
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
