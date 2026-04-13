import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { resolveVkBackendBaseUrl } from '../resolve-vk-backend-base-url';
import { vkApiEnvelopeSchema } from './vk-api-envelope.schema';
import {
  vkListIssuesSearchDataSchema,
  vkListOrganizationsDataSchema,
  vkListProjectStatusesDataSchema,
  vkListProjectsDataSchema,
  vkMutationIssueDataSchema,
  vkRemoteIssueRowSchema,
  vkRepoRowSchema,
  vkStartWorkspaceDataSchema,
  type VkProjectStatusRow,
  type VkRemoteIssueRow,
} from './vk-remote-api.schema';

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function assertEnvelopeSuccess(
  envelope: z.infer<typeof vkApiEnvelopeSchema>,
  context: string,
): void {
  if (envelope.success) {
    return;
  }
  const msg = envelope.message?.trim() || 'VK API returned success=false';
  throw new Error(`${context}: ${msg}`);
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`VK API: non-JSON response (HTTP ${response.status})`);
  }
}

function parseEnvelopeData<T>(
  body: unknown,
  dataSchema: z.ZodType<T>,
  context: string,
): T {
  const env = vkApiEnvelopeSchema.safeParse(body);
  if (!env.success) {
    throw new Error(`${context}: invalid API envelope (${env.error.message})`);
  }
  assertEnvelopeSuccess(env.data, context);
  const dataParse = dataSchema.safeParse(env.data.data);
  if (!dataParse.success) {
    throw new Error(
      `${context}: invalid response data (${dataParse.error.message})`,
    );
  }
  return dataParse.data;
}

function statusNameById(statuses: VkProjectStatusRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of statuses) {
    m.set(s.id, s.name);
  }
  return m;
}

function pickDefaultStatusId(statuses: VkProjectStatusRow[]): string {
  const visible = statuses.filter((s) => !s.hidden);
  if (visible.length === 0) {
    throw new Error('VK API: no visible project statuses for create_issue');
  }
  visible.sort((a, b) => a.sort_order - b.sort_order);
  return visible[0].id;
}

function resolveStatusIdByName(
  statuses: VkProjectStatusRow[],
  statusName: string,
): string {
  const found = statuses.find(
    (s) => s.name.trim().toLowerCase() === statusName.trim().toLowerCase(),
  );
  if (!found) {
    const names = statuses.map((s) => s.name);
    throw new Error(
      `Unknown Kanban status "${statusName}". Available: ${names.join(', ')}`,
    );
  }
  return found.id;
}

function issueToBoardRow(
  issue: VkRemoteIssueRow,
  statusNames: Map<string, string>,
): {
  id: string;
  title?: string;
  status?: string;
  description?: string;
} {
  const status = statusNames.get(issue.status_id);
  return {
    id: issue.id,
    title: issue.title,
    ...(status != null ? { status } : {}),
    ...(issue.description != null && issue.description !== ''
      ? { description: issue.description }
      : {}),
  };
}

export function normalizeExecutorForVkApi(executor: string): string {
  return executor.trim().replaceAll('-', '_').toUpperCase();
}

@Injectable()
export class VibeKanbanApiClient {
  private async request(
    method: string,
    path: string,
    init?: { body?: unknown; query?: Record<string, string | boolean> },
  ): Promise<Response> {
    const base = await resolveVkBackendBaseUrl();
    const url = new URL(joinUrl(base, path));
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const body =
      init?.body !== undefined ? JSON.stringify(init.body) : undefined;
    if (body != null) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { method, headers, body });
  }

  async listOrganizations(): Promise<
    Array<{ id: string; name: string; slug: string; is_personal?: boolean }>
  > {
    const res = await this.request('GET', '/api/organizations');
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `list_organizations: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const data = parseEnvelopeData(
      body,
      vkListOrganizationsDataSchema,
      'list_organizations',
    );
    return data.organizations;
  }

  async listProjects(organizationId: string): Promise<
    Array<{
      id: string;
      name: string;
      organization_id: string;
      created_at?: string;
      updated_at?: string;
    }>
  > {
    const res = await this.request('GET', '/api/remote/projects', {
      query: { organization_id: organizationId },
    });
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `list_projects: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const data = parseEnvelopeData(
      body,
      vkListProjectsDataSchema,
      'list_projects',
    );
    return data.projects;
  }

  async listRepos(): Promise<Array<{ id: string; name: string }>> {
    const res = await this.request('GET', '/api/repos');
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `list_repos: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const env = vkApiEnvelopeSchema.safeParse(body);
    if (!env.success) {
      throw new Error(`list_repos: invalid envelope (${env.error.message})`);
    }
    assertEnvelopeSuccess(env.data, 'list_repos');
    const arr = z.array(vkRepoRowSchema).safeParse(env.data.data);
    if (!arr.success) {
      throw new Error(`list_repos: invalid repo list (${arr.error.message})`);
    }
    return arr.data;
  }

  private async fetchProjectStatuses(
    projectId: string,
  ): Promise<VkProjectStatusRow[]> {
    const res = await this.request('GET', '/api/remote/project-statuses', {
      query: { project_id: projectId },
    });
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `project_statuses: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const data = parseEnvelopeData(
      body,
      vkListProjectStatusesDataSchema,
      'project_statuses',
    );
    return data.project_statuses;
  }

  async listIssuesForProject(
    projectId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ): Promise<
    Array<{ id: string; title?: string; status?: string; description?: string }>
  > {
    const statuses = await this.fetchProjectStatuses(projectId);
    const statusNames = statusNameById(statuses);
    const searchBody = {
      project_id: projectId,
      search: opts?.search,
      limit: opts?.limit ?? 50,
      offset: opts?.offset ?? 0,
      sort_field: 'sort_order',
      sort_direction: 'asc',
    };
    const res = await this.request('POST', '/api/remote/issues/search', {
      body: searchBody,
    });
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `list_issues: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const data = parseEnvelopeData(
      body,
      vkListIssuesSearchDataSchema,
      'list_issues',
    );
    return data.issues.map((issue) => issueToBoardRow(issue, statusNames));
  }

  async getIssue(issueId: string): Promise<VkRemoteIssueRow | null> {
    const res = await this.request('GET', `/api/remote/issues/${issueId}`);
    if (res.status === 404) {
      return null;
    }
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `get_issue: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const env = vkApiEnvelopeSchema.safeParse(body);
    if (!env.success) {
      throw new Error(`get_issue: invalid envelope (${env.error.message})`);
    }
    assertEnvelopeSuccess(env.data, 'get_issue');
    const issue = vkRemoteIssueRowSchema.safeParse(env.data.data);
    if (!issue.success) {
      throw new Error(`get_issue: invalid issue (${issue.error.message})`);
    }
    return issue.data;
  }

  async getIssueAsBoardRow(issueId: string): Promise<{
    id: string;
    title?: string;
    status?: string;
    description?: string;
  } | null> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      return null;
    }
    const statuses = await this.fetchProjectStatuses(issue.project_id);
    return issueToBoardRow(issue, statusNameById(statuses));
  }

  async createIssue(params: {
    projectId: string;
    title: string;
    description: string;
  }): Promise<string> {
    const statuses = await this.fetchProjectStatuses(params.projectId);
    const statusId = pickDefaultStatusId(statuses);
    const payload = {
      project_id: params.projectId,
      status_id: statusId,
      title: params.title,
      description: params.description,
      sort_order: 0,
      extension_metadata: {},
    };
    const res = await this.request('POST', '/api/remote/issues', {
      body: payload,
    });
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `create_issue: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const data = parseEnvelopeData(
      body,
      vkMutationIssueDataSchema,
      'create_issue',
    );
    return data.data.id;
  }

  async updateIssueStatus(issueId: string, statusName: string): Promise<void> {
    const existing = await this.getIssue(issueId);
    if (!existing) {
      throw new Error(`update_issue: issue not found (${issueId})`);
    }
    const statuses = await this.fetchProjectStatuses(existing.project_id);
    const statusId = resolveStatusIdByName(statuses, statusName);
    const payload = { status_id: statusId };
    const res = await this.request('PATCH', `/api/remote/issues/${issueId}`, {
      body: payload,
    });
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `update_issue: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const env = vkApiEnvelopeSchema.safeParse(body);
    if (!env.success) {
      throw new Error(`update_issue: invalid envelope (${env.error.message})`);
    }
    assertEnvelopeSuccess(env.data, 'update_issue');
  }

  async startWorkspace(params: {
    name: string;
    executor: string;
    repositories: Array<{ repoId: string; branch: string }>;
    issueId?: string;
    prompt?: string;
    variant?: string;
  }): Promise<string> {
    const repos = params.repositories.map((r) => ({
      repo_id: r.repoId,
      target_branch: r.branch,
    }));
    const executor = normalizeExecutorForVkApi(params.executor);
    let linkedIssue:
      | { remote_project_id: string; issue_id: string }
      | undefined;
    let issuePrompt: string | undefined;
    if (params.issueId) {
      const issue = await this.getIssue(params.issueId);
      if (!issue) {
        throw new Error(`start_workspace: issue not found (${params.issueId})`);
      }
      linkedIssue = {
        remote_project_id: issue.project_id,
        issue_id: params.issueId,
      };
      const title = issue.title.trim();
      const desc = issue.description?.trim() ?? '';
      if (title && desc) {
        issuePrompt = `${title}\n\n${desc}`;
      } else if (title) {
        issuePrompt = title;
      } else if (desc) {
        issuePrompt = desc;
      }
    }
    const prompt = (params.prompt?.trim() || issuePrompt?.trim()) ?? '';
    if (!prompt) {
      throw new Error(
        'start_workspace: provide prompt or issue_id with title/description',
      );
    }
    const executorConfig: Record<string, unknown> = { executor };
    if (params.variant?.trim()) {
      executorConfig.variant = params.variant.trim();
    }
    const body = {
      name: params.name,
      repos,
      linked_issue: linkedIssue,
      executor_config: executorConfig,
      prompt,
    };
    const res = await this.request('POST', '/api/workspaces/start', { body });
    const resBody = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `start_workspace: HTTP ${res.status} ${String(resBody).slice(0, 200)}`,
      );
    }
    const data = parseEnvelopeData(
      resBody,
      vkStartWorkspaceDataSchema,
      'start_workspace',
    );
    const workspaceId = data.workspace.id;
    if (params.issueId) {
      await this.linkWorkspaceToIssue(workspaceId, params.issueId);
    }
    return workspaceId;
  }

  private async linkWorkspaceToIssue(
    workspaceId: string,
    issueId: string,
  ): Promise<void> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`link_workspace: issue not found (${issueId})`);
    }
    const res = await this.request(
      'POST',
      `/api/workspaces/${workspaceId}/links`,
      {
        body: {
          project_id: issue.project_id,
          issue_id: issueId,
        },
      },
    );
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `link_workspace: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const env = vkApiEnvelopeSchema.safeParse(body);
    if (!env.success) {
      throw new Error(
        `link_workspace: invalid envelope (${env.error.message})`,
      );
    }
    assertEnvelopeSuccess(env.data, 'link_workspace');
  }

  async deleteWorkspace(
    workspaceId: string,
    opts?: { deleteBranches?: boolean },
  ): Promise<void> {
    const res = await this.request('DELETE', `/api/workspaces/${workspaceId}`, {
      query: {
        delete_remote: false,
        delete_branches: opts?.deleteBranches === true,
      },
    });
    const body = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        `delete_workspace: HTTP ${res.status} ${String(body).slice(0, 200)}`,
      );
    }
    const env = vkApiEnvelopeSchema.safeParse(body);
    if (!env.success) {
      throw new Error(
        `delete_workspace: invalid envelope (${env.error.message})`,
      );
    }
    assertEnvelopeSuccess(env.data, 'delete_workspace');
  }

  /**
   * Ordered checks against the local Vibe Kanban backend: `/api/health`, `/api/repos`, then
   * `/api/organizations` (OAuth — returns 401 until the user signs in inside Vibe Kanban).
   */
  async probe(): Promise<void> {
    const healthRes = await this.request('GET', '/api/health');
    if (!healthRes.ok) {
      const snippet = (await healthRes.text()).slice(0, 200);
      throw new Error(
        `probe_health: HTTP ${healthRes.status} ${snippet || '(empty body)'}`,
      );
    }

    const reposRes = await this.request('GET', '/api/repos');
    if (!reposRes.ok) {
      const body = await parseJsonResponse(reposRes).catch(() => null);
      throw new Error(
        `probe_repos: HTTP ${reposRes.status} ${String(body).slice(0, 200)}`,
      );
    }

    const orgRes = await this.request('GET', '/api/organizations');
    const orgBody = await parseJsonResponse(orgRes);
    if (orgRes.status === 401) {
      throw new Error(
        'probe_organizations: unauthorized (401). Open Vibe Kanban on this machine and sign in so remote API calls are allowed.',
      );
    }
    if (!orgRes.ok) {
      throw new Error(
        `probe_organizations: HTTP ${orgRes.status} ${String(orgBody).slice(0, 200)}`,
      );
    }
    parseEnvelopeData(
      orgBody,
      vkListOrganizationsDataSchema,
      'probe_organizations',
    );
  }
}
