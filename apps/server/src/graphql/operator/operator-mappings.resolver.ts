import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MappingsService } from '../../mappings/mappings.service';
import { StatusEventsService } from '../../events/status-events.service';
import {
  DeleteMappingPayload,
  MappingGql,
  UpsertMappingInput,
} from './operator-bff.types';

@Resolver()
export class OperatorMappingsResolver {
  constructor(
    private readonly mappingsService: MappingsService,
    private readonly statusEvents: StatusEventsService,
  ) {}

  @Query(() => [MappingGql], { name: 'mappings' })
  async mappings(): Promise<MappingGql[]> {
    return this.mappingsService.findAll();
  }

  @Mutation(() => MappingGql, { name: 'upsertMapping' })
  async upsertMapping(
    @Args('input', { type: () => UpsertMappingInput })
    input: UpsertMappingInput,
  ): Promise<MappingGql> {
    const row = await this.mappingsService.create({
      githubRepo: input.githubRepo,
      vibeKanbanRepoId: input.vibeKanbanRepoId,
    });
    this.statusEvents.emitChanged();
    return row;
  }

  @Mutation(() => DeleteMappingPayload, { name: 'deleteMapping' })
  async deleteMapping(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<DeleteMappingPayload> {
    await this.mappingsService.remove(id);
    this.statusEvents.emitChanged();
    return { ok: true };
  }
}
