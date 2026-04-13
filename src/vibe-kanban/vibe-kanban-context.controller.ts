import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VibeKanbanDestinationConfiguredGuard } from './vibe-kanban-destination-configured.guard';
import { VibeKanbanBoardService } from './vibe-kanban-board.service';
import { listProjectsQuerySchema } from './vibe-kanban-query.schema';

@ApiTags('vibe-kanban')
@Controller('api/vibe-kanban')
@UseGuards(VibeKanbanDestinationConfiguredGuard)
export class VibeKanbanContextController {
  constructor(private readonly vk: VibeKanbanBoardService) {}

  /** Vibe Kanban `GET /api/organizations` for setup UI. */
  @Get('organizations')
  @ApiOperation({ summary: 'List organizations (Vibe Kanban local API)' })
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
  @ApiBadRequestResponse({ description: 'Vibe Kanban destination not active' })
  async organizations() {
    const organizations = await this.vk.listOrganizations();
    return { organizations };
  }

  /** `GET /api/remote/projects` (requires `organization_id`). */
  @Get('projects')
  @ApiOperation({
    summary: 'List projects for an organization (Vibe Kanban local API)',
  })
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
    description:
      'Missing organization_id or Vibe Kanban destination not active',
  })
  async projects(@Query() query: Record<string, unknown>) {
    const q = listProjectsQuerySchema.safeParse(query);
    if (!q.success) {
      throw new BadRequestException(
        q.error.issues.map((i) => i.message).join('; '),
      );
    }
    const projects = await this.vk.listProjects(q.data.organization_id);
    return { projects };
  }

  /** `GET /api/repos` for mappings UI. */
  @Get('repos')
  @ApiOperation({ summary: 'List Vibe Kanban repositories (local API)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        repos: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Vibe Kanban destination not active' })
  async repos() {
    const repos = await this.vk.listRepos();
    return { repos };
  }
}
