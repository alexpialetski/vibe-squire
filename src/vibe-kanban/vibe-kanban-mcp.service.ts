import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { SettingsService } from '../settings/settings.service';
import type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from './vk-entities';
import { isVibeKanbanDestination } from './mcp-transport-config';
import { VK_MCP_STDIO_SESSION_PORT } from '../ports/injection-tokens';
import type { VkMcpStdioSessionPort } from '../ports/vk-mcp-stdio-session.port';
import {
  isGetIssueNotFoundMcpResult,
  summarizeMcpToolErrorText,
} from './mcp-tool-result-text';
import { VIBE_SQUIRE_TITLE_MARKER } from './vk-mcp-list-get-issue-response.schema';
import { vkListRowCountsTowardBoardCap } from './vk-board-cap';

export type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from './vk-entities';

function parseToolJson(result: unknown): unknown {
  const r = result as {
    structuredContent?: unknown;
    content?: Array<{ type: string; text?: string }>;
    toolResult?: unknown;
  };
  const sc = r.structuredContent ?? r.toolResult;
  if (sc != null && typeof sc === 'object') {
    return sc;
  }
  const texts =
    r.content?.filter(
      (c): c is { type: 'text'; text: string } =>
        c.type === 'text' && typeof c.text === 'string',
    ) ?? [];
  for (const t of texts) {
    try {
      return JSON.parse(t.text) as unknown;
    } catch {
      // try next text block
    }
  }
  return null;
}

function pickIssuesPayload(parsed: unknown): unknown[] {
  if (parsed == null) {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (typeof parsed !== 'object') {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  for (const key of [
    'issues',
    'organizations',
    'projects',
    'repos',
    'repositories',
    'data',
    'items',
    'results',
  ] as const) {
    const v = o[key];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function unwrapListOrGetIssueRow(parsed: unknown): unknown {
  if (parsed != null && typeof parsed === 'object') {
    const inner = (parsed as { issue?: unknown }).issue;
    if (inner != null && typeof inner === 'object') {
      return inner;
    }
  }
  return parsed;
}

function normalizeIssue(raw: unknown): VkIssueRef | null {
  const row = unwrapListOrGetIssueRow(raw);
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.issue_id === 'string' && o.issue_id) ||
    (typeof o.issueId === 'string' && o.issueId);
  if (!id) {
    return null;
  }
  const status =
    typeof o.status === 'string'
      ? o.status
      : typeof o.state === 'string'
        ? o.state
        : undefined;
  const title = typeof o.title === 'string' ? o.title : undefined;
  const description =
    typeof o.description === 'string' ? o.description : undefined;
  return { id, status, title, ...(description != null ? { description } : {}) };
}

function normalizeOrg(raw: unknown): VkOrgRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.organization_id === 'string' && o.organization_id);
  if (!id) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : undefined;
  const slug = typeof o.slug === 'string' ? o.slug : undefined;
  return { id, name, slug };
}

function normalizeProject(raw: unknown): VkProjectRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.project_id === 'string' && o.project_id);
  if (!id) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : undefined;
  const organizationId =
    typeof o.organization_id === 'string'
      ? o.organization_id
      : typeof o.organizationId === 'string'
        ? o.organizationId
        : undefined;
  return { id, name, organizationId };
}

function normalizeRepo(raw: unknown): VkRepoRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.repo_id === 'string' && o.repo_id);
  if (!id) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : undefined;
  return { id, name };
}

function pickWorkspaceId(parsed: unknown): string | null {
  if (parsed == null) {
    return null;
  }
  if (typeof parsed === 'string' && parsed.trim()) {
    return parsed.trim();
  }
  if (typeof parsed !== 'object') {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  for (const key of ['workspace_id', 'workspaceId', 'id'] as const) {
    const v = o[key];
    if (typeof v === 'string' && v) {
      return v;
    }
  }
  return null;
}

function pickCreatedIssueId(parsed: unknown): string | null {
  if (parsed == null) {
    return null;
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  if (typeof parsed !== 'object') {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  for (const key of ['issue_id', 'issueId', 'id'] as const) {
    const v = o[key];
    if (typeof v === 'string' && v) {
      return v;
    }
  }
  return null;
}

@Injectable()
export class VibeKanbanMcpService {
  private readonly logger = new Logger(VibeKanbanMcpService.name);

  constructor(
    private readonly settings: SettingsService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    @Inject(VK_MCP_STDIO_SESSION_PORT)
    private readonly stdioSession: VkMcpStdioSessionPort,
  ) {}

  /**
   * MCP servers report tool-level failures with `isError: true` on the result (not stderr).
   */
  private assertToolCallOk(toolName: string, result: unknown): void {
    const r = result as { isError?: boolean };
    if (r.isError !== true) {
      return;
    }
    const summary = summarizeMcpToolErrorText(result);
    this.logger.error(
      `Vibe Kanban MCP tool "${toolName}" returned isError: ${summary}`,
    );
    throw new Error(`${toolName}: ${summary}`);
  }

  /** Stdio: lazy long-lived child + serialized access. */
  async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    if (!isVibeKanbanDestination(this.appEnv.destinationType)) {
      throw new Error(
        'Vibe Kanban MCP: DESTINATION_TYPE must be vibe_kanban for this adapter',
      );
    }
    return this.stdioSession.runWithClient(fn);
  }

  /** Lightweight reachability: list tools (implicitly initializes session). */
  async probe(): Promise<void> {
    await this.withClient(async (client) => {
      await client.listTools();
    });
  }

  async listOrganizations(): Promise<VkOrgRef[]> {
    return this.withClient(async (client) => {
      const result = await client.callTool({
        name: 'list_organizations',
        arguments: {},
      });
      this.assertToolCallOk('list_organizations', result);
      const parsed = parseToolJson(result);
      return pickIssuesPayload(parsed)
        .map(normalizeOrg)
        .filter((x): x is VkOrgRef => x != null);
    });
  }

  async listProjects(organizationId: string): Promise<VkProjectRef[]> {
    return this.withClient(async (client) => {
      const result = await client.callTool({
        name: 'list_projects',
        arguments: { organization_id: organizationId },
      });
      this.assertToolCallOk('list_projects', result);
      const parsed = parseToolJson(result);
      return pickIssuesPayload(parsed)
        .map(normalizeProject)
        .filter((x): x is VkProjectRef => x != null);
    });
  }

  async listRepos(): Promise<VkRepoRef[]> {
    return this.withClient(async (client) => {
      const result = await client.callTool({
        name: 'list_repos',
        arguments: {},
      });
      this.assertToolCallOk('list_repos', result);
      const parsed = parseToolJson(result);
      return pickIssuesPayload(parsed)
        .map(normalizeRepo)
        .filter((x): x is VkRepoRef => x != null);
    });
  }

  async listIssues(
    projectId: string,
    opts?: { search?: string; limit?: number; offset?: number },
  ): Promise<VkIssueRef[]> {
    return this.withClient(async (client) => {
      const args: Record<string, unknown> = { project_id: projectId };
      if (opts?.search) {
        args.search = opts.search;
      }
      if (opts?.limit != null) {
        args.limit = opts.limit;
      }
      if (opts?.offset != null) {
        args.offset = opts.offset;
      }
      const result = await client.callTool({
        name: 'list_issues',
        arguments: args,
      });
      this.assertToolCallOk('list_issues', result);
      const parsed = parseToolJson(result);
      return pickIssuesPayload(parsed)
        .map(normalizeIssue)
        .filter((x): x is VkIssueRef => x != null);
    });
  }

  private static readonly VK_BOARD_PAGE_SIZE = 100;
  private static readonly VK_BOARD_MAX_PAGES = 20;

  /**
   * Counts non-done issues whose title contains {@link VIBE_SQUIRE_TITLE_MARKER} on this project
   * (`list_issues` search + offset paging, capped pages).
   */
  async countActiveVibeSquireIssues(projectId: string): Promise<number> {
    const kanbanDone =
      this.settings.getEffective('kanban_done_status').trim() || 'Done';
    let total = 0;
    for (let page = 0; page < VibeKanbanMcpService.VK_BOARD_MAX_PAGES; page++) {
      const offset = page * VibeKanbanMcpService.VK_BOARD_PAGE_SIZE;
      const rows = await this.listIssues(projectId, {
        search: VIBE_SQUIRE_TITLE_MARKER,
        limit: VibeKanbanMcpService.VK_BOARD_PAGE_SIZE,
        offset,
      });
      for (const row of rows) {
        if (vkListRowCountsTowardBoardCap(row, kanbanDone)) {
          total += 1;
        }
      }
      if (rows.length < VibeKanbanMcpService.VK_BOARD_PAGE_SIZE) {
        break;
      }
    }
    return total;
  }

  async getIssue(issueId: string): Promise<VkIssueRef | null> {
    return this.withClient(async (client) => {
      const result = await client.callTool({
        name: 'get_issue',
        arguments: { issue_id: issueId },
      });
      if (isGetIssueNotFoundMcpResult(result)) {
        return null;
      }
      this.assertToolCallOk('get_issue', result);
      const parsed = parseToolJson(result);
      return normalizeIssue(parsed);
    });
  }

  async createIssue(params: {
    projectId: string;
    title: string;
    description: string;
  }): Promise<string> {
    return this.withClient(async (client) => {
      const result = await client.callTool({
        name: 'create_issue',
        arguments: {
          title: params.title,
          project_id: params.projectId,
          description: params.description,
        },
      });
      this.assertToolCallOk('create_issue', result);
      const parsed = parseToolJson(result);
      const id = pickCreatedIssueId(parsed);
      if (!id) {
        throw new Error('create_issue: could not parse issue id from response');
      }
      return id;
    });
  }

  async updateIssue(
    issueId: string,
    fields: { status?: string },
  ): Promise<void> {
    await this.withClient(async (client) => {
      const args: Record<string, unknown> = { issue_id: issueId };
      if (fields.status != null) {
        args.status = fields.status;
      }
      const result = await client.callTool({
        name: 'update_issue',
        arguments: args,
      });
      this.assertToolCallOk('update_issue', result);
    });
  }

  async startWorkspace(params: {
    name: string;
    executor: string;
    repositories: Array<{ repoId: string; branch: string }>;
    issueId?: string;
    prompt?: string;
    variant?: string;
  }): Promise<string> {
    return this.withClient(async (client) => {
      const args: Record<string, unknown> = {
        name: params.name,
        executor: params.executor,
        repositories: params.repositories.map((r) => ({
          repo_id: r.repoId,
          branch: r.branch,
        })),
      };
      if (params.issueId) {
        args.issue_id = params.issueId;
      }
      if (params.prompt) {
        args.prompt = params.prompt;
      }
      if (params.variant) {
        args.variant = params.variant;
      }
      const result = await client.callTool({
        name: 'start_workspace',
        arguments: args,
      });
      this.assertToolCallOk('start_workspace', result);
      const parsed = parseToolJson(result);
      const id = pickWorkspaceId(parsed);
      if (!id) {
        throw new Error(
          'start_workspace: could not parse workspace id from response',
        );
      }
      return id;
    });
  }
}
