import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsService } from '../settings/settings.service';
import { isVibeKanbanMcpConfigured } from './mcp-transport-config';
import { VibeKanbanMcpService } from './vibe-kanban-mcp.service';
import { listProjectsQuerySchema } from './vibe-kanban-query.schema';

@ApiTags('vibe-kanban')
@Controller('api/vibe-kanban')
export class VibeKanbanContextController {
  constructor(
    private readonly settings: SettingsService,
    private readonly vk: VibeKanbanMcpService,
  ) {}

  private assertMcpConfigured(): void {
    if (!isVibeKanbanMcpConfigured(this.settings)) {
      throw new BadRequestException(
        'Vibe Kanban MCP is not configured (valid vk_mcp_stdio_json for stdio spawn)',
      );
    }
  }

  /** §4.3 — MCP `list_organizations` for setup UI. */
  @Get('organizations')
  @ApiOperation({ summary: 'List organizations via MCP (setup helper)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        organizations: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Vibe Kanban MCP not configured' })
  async organizations() {
    this.assertMcpConfigured();
    const organizations = await this.vk.listOrganizations();
    return { organizations };
  }

  /** §4.3 — MCP `list_projects` (requires `organization_id`). */
  @Get('projects')
  @ApiOperation({ summary: 'List projects for an organization via MCP' })
  @ApiQuery({ name: 'organization_id', required: true })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        projects: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Missing organization_id or Vibe Kanban MCP not configured',
  })
  async projects(@Query() query: Record<string, unknown>) {
    this.assertMcpConfigured();
    const q = listProjectsQuerySchema.safeParse(query);
    if (!q.success) {
      throw new BadRequestException(
        q.error.issues.map((i) => i.message).join('; '),
      );
    }
    const projects = await this.vk.listProjects(q.data.organization_id);
    return { projects };
  }

  /** MCP `list_repos` for mappings UI. */
  @Get('repos')
  @ApiOperation({ summary: 'List Vibe Kanban repositories via MCP' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        repos: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Vibe Kanban MCP not configured' })
  async repos() {
    this.assertMcpConfigured();
    const repos = await this.vk.listRepos();
    return { repos };
  }
}
