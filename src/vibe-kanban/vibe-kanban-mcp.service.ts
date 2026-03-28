import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { SettingsService } from '../settings/settings.service';
import type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from './vk-entities';
import { isVibeKanbanDestination } from './transport/mcp-transport-config';
import { VK_MCP_STDIO_SESSION_PORT } from '../ports/injection-tokens';
import type { VkMcpStdioSessionPort } from '../ports/vk-mcp-stdio-session.port';
import {
  isGetIssueNotFoundMcpResult,
  summarizeMcpToolErrorText,
} from './mcp-result/mcp-tool-result-text';
import { VIBE_SQUIRE_TITLE_MARKER } from './vk-contract';
import { vkListRowCountsTowardBoardCap } from './vk-board-cap';
import {
  safeParseVkMcpGetIssueResponse,
  safeParseVkMcpListIssuesResponse,
} from './mcp-result/vk-mcp-list-get-issue-response.schema';
import {
  extractArrayFromMcpPayload,
  normalizeIssue,
  normalizeOrg,
  normalizeProject,
  normalizeRepo,
  parseToolJson,
  pickCreatedIssueId,
  pickWorkspaceId,
} from './mcp-result/vk-mcp-tool-result';

export type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from './vk-entities';

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
    this.logger.debug(
      `Vibe Kanban MCP tool "${toolName}" returned isError: ${summary}`,
    );
    throw new Error(`${toolName}: ${summary}`);
  }

  private async callToolOk(
    client: Client,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const result = await client.callTool({ name, arguments: args });
    this.assertToolCallOk(name, result);
    return result;
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
      const result = await this.callToolOk(client, 'list_organizations', {});
      const parsed = parseToolJson(result);
      return extractArrayFromMcpPayload(parsed)
        .map(normalizeOrg)
        .filter((x): x is VkOrgRef => x != null);
    });
  }

  async listProjects(organizationId: string): Promise<VkProjectRef[]> {
    return this.withClient(async (client) => {
      const result = await this.callToolOk(client, 'list_projects', {
        organization_id: organizationId,
      });
      const parsed = parseToolJson(result);
      return extractArrayFromMcpPayload(parsed)
        .map(normalizeProject)
        .filter((x): x is VkProjectRef => x != null);
    });
  }

  async listRepos(): Promise<VkRepoRef[]> {
    return this.withClient(async (client) => {
      const result = await this.callToolOk(client, 'list_repos', {});
      const parsed = parseToolJson(result);
      return extractArrayFromMcpPayload(parsed)
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
      const result = await this.callToolOk(client, 'list_issues', args);
      const parsed = parseToolJson(result);
      const structured = safeParseVkMcpListIssuesResponse(parsed);
      if (structured) {
        return structured.issues
          .map((row) => normalizeIssue(row))
          .filter((x): x is VkIssueRef => x != null);
      }
      return extractArrayFromMcpPayload(parsed)
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
      const wrapped = safeParseVkMcpGetIssueResponse(parsed);
      if (wrapped) {
        return normalizeIssue(wrapped.issue);
      }
      return normalizeIssue(parsed);
    });
  }

  async createIssue(params: {
    projectId: string;
    title: string;
    description: string;
  }): Promise<string> {
    return this.withClient(async (client) => {
      const result = await this.callToolOk(client, 'create_issue', {
        title: params.title,
        project_id: params.projectId,
        description: params.description,
      });
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
      await this.callToolOk(client, 'update_issue', args);
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
      const result = await this.callToolOk(client, 'start_workspace', args);
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
