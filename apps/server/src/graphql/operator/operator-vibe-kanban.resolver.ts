import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  VibeKanbanOrganization,
  VibeKanbanProject,
  VibeKanbanRepo,
  VibeKanbanUiState,
} from './operator-bff.types';
import { OperatorVibeKanbanUseCase } from './operator-vibe-kanban.usecase';

@Resolver()
export class OperatorVibeKanbanResolver {
  constructor(private readonly vibeKanbanUseCase: OperatorVibeKanbanUseCase) {}

  @Query(() => VibeKanbanUiState, { name: 'vibeKanbanUiState' })
  async vibeKanbanUiState(): Promise<VibeKanbanUiState> {
    return this.vibeKanbanUseCase.vibeKanbanUiState();
  }

  @Query(() => [VibeKanbanOrganization], { name: 'vibeKanbanOrganizations' })
  async vibeKanbanOrganizations(): Promise<VibeKanbanOrganization[]> {
    return this.vibeKanbanUseCase.vibeKanbanOrganizations();
  }

  @Query(() => [VibeKanbanProject], { name: 'vibeKanbanProjects' })
  async vibeKanbanProjects(
    @Args('organizationId', { type: () => ID }) organizationId: string,
  ): Promise<VibeKanbanProject[]> {
    return this.vibeKanbanUseCase.vibeKanbanProjects(organizationId);
  }

  @Query(() => [VibeKanbanRepo], { name: 'vibeKanbanRepos' })
  async vibeKanbanRepos(): Promise<VibeKanbanRepo[]> {
    return this.vibeKanbanUseCase.vibeKanbanRepos();
  }
}
