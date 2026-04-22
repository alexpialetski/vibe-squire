import { Mutation, Resolver } from '@nestjs/graphql';
import { OperatorSyncUseCase } from './operator-sync.usecase';
import { ReinitIntegrationPayload } from './operator-bff.types';

@Resolver()
export class OperatorSyncResolver {
  constructor(private readonly syncUseCase: OperatorSyncUseCase) {}

  @Mutation(() => ReinitIntegrationPayload, { name: 'reinitIntegration' })
  async reinitIntegration(): Promise<ReinitIntegrationPayload> {
    return this.syncUseCase.reinitIntegration();
  }
}
