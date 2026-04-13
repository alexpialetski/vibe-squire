import {
  BadRequestException,
  Controller,
  Get,
  Inject,
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
import { ZodResponse } from 'nestjs-zod';
import type { VibeKanbanUiState } from '@vibe-squire/shared';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { SettingsService } from '../settings/settings.service';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { buildVibeKanbanPageLocals } from '../ui/ui-vibe-kanban-presenter';
import { UiNavService } from '../ui/ui-nav.service';
import { VibeKanbanUiStateOutputDto } from '../ui/dto/vibe-kanban-ui-output.dto';
import { VibeKanbanDestinationConfiguredGuard } from './vibe-kanban-destination-configured.guard';
import { VibeKanbanBoardService } from './vibe-kanban-board.service';
import { listProjectsQuerySchema } from './vibe-kanban-query.schema';

@ApiTags('vibe-kanban')
@Controller('api/vibe-kanban')
@UseGuards(VibeKanbanDestinationConfiguredGuard)
export class VibeKanbanContextController {
  constructor(
    private readonly vk: VibeKanbanBoardService,
    private readonly settings: SettingsService,
    private readonly setupEvaluation: SetupEvaluationService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly uiNav: UiNavService,
  ) {}

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

  @Get('ui-state')
  @ApiOperation({
    summary: 'Vibe Kanban settings page aggregate (board picker, executor)',
  })
  @ZodResponse({
    status: 200,
    type: VibeKanbanUiStateOutputDto,
    description: 'Board picker + executor state',
  })
  async uiState(): Promise<VibeKanbanUiState> {
    const locals = await buildVibeKanbanPageLocals({
      settings: this.settings,
      destinationType: this.appEnv.destinationType,
      setupEvaluation: this.setupEvaluation,
      uiNavEntries: this.uiNav.getEntries(),
    });
    const { integrationNavEntries, navMinimal, ...state } = locals as Record<
      string,
      unknown
    > & {
      integrationNavEntries?: unknown;
      navMinimal?: unknown;
    };
    void integrationNavEntries;
    void navMinimal;
    return state as VibeKanbanUiState;
  }
}
