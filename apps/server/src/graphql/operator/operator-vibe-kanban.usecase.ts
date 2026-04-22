import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import { SettingsService } from '../../settings/settings.service';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { UiNavService } from '../../ui/ui-nav.service';
import { buildVibeKanbanPageLocals } from '../../ui/ui-vibe-kanban-presenter';
import { VibeKanbanBoardService } from '../../vibe-kanban/vibe-kanban-board.service';
import {
  isVibeKanbanBoardDestination,
  VK_DESTINATION_NOT_ACTIVE_MESSAGE,
} from '../../vibe-kanban/vibe-kanban-destination';
import {
  VibeKanbanOrganization,
  VibeKanbanProject,
  VibeKanbanRepo,
  VibeKanbanUiState,
} from './operator-bff.types';
import { toVibeKanbanUiState } from './operator-gql.mapper';

@Injectable()
export class OperatorVibeKanbanUseCase {
  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly settings: SettingsService,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly uiNav: UiNavService,
    private readonly vkBoard: VibeKanbanBoardService,
  ) {}

  async vibeKanbanUiState(): Promise<VibeKanbanUiState> {
    this.ensureVibeKanbanDestinationActive();
    const locals = await buildVibeKanbanPageLocals({
      settings: this.settings,
      destinationType: this.appEnv.destinationType,
      setupEvaluation: this.setupEvaluation,
      uiNavEntries: this.uiNav.getEntries(),
    });
    return toVibeKanbanUiState(locals);
  }

  async vibeKanbanOrganizations(): Promise<VibeKanbanOrganization[]> {
    this.ensureVibeKanbanDestinationActive();
    return this.vkBoard.listOrganizations();
  }

  async vibeKanbanProjects(
    organizationId: string,
  ): Promise<VibeKanbanProject[]> {
    this.ensureVibeKanbanDestinationActive();
    return this.vkBoard.listProjects(organizationId);
  }

  async vibeKanbanRepos(): Promise<VibeKanbanRepo[]> {
    this.ensureVibeKanbanDestinationActive();
    return this.vkBoard.listRepos();
  }

  private ensureVibeKanbanDestinationActive(): void {
    if (!isVibeKanbanBoardDestination(this.appEnv.destinationType)) {
      throw new BadRequestException(VK_DESTINATION_NOT_ACTIVE_MESSAGE);
    }
  }
}
