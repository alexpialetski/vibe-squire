import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OperatorSettingsUseCase } from './operator-settings.usecase';
import {
  EffectiveSettings,
  GithubFieldsPayload,
  UpdateDestinationSettingsInput,
  UpdateSettingsInput,
  UpdateSourceSettingsInput,
} from './operator-bff.types';

@Resolver()
export class OperatorSettingsResolver {
  constructor(private readonly settingsUseCase: OperatorSettingsUseCase) {}

  @Query(() => EffectiveSettings, { name: 'effectiveSettings' })
  async effectiveSettings(): Promise<EffectiveSettings> {
    return this.settingsUseCase.effectiveSettings();
  }

  @Query(() => GithubFieldsPayload, { name: 'githubFields' })
  githubFields(): GithubFieldsPayload {
    return this.settingsUseCase.githubFields();
  }

  @Mutation(() => EffectiveSettings, { name: 'updateSettings' })
  async updateSettings(
    @Args('input', { type: () => UpdateSettingsInput })
    input: UpdateSettingsInput,
  ): Promise<EffectiveSettings> {
    return this.settingsUseCase.updateSettings(input);
  }

  @Mutation(() => EffectiveSettings, { name: 'updateSourceSettings' })
  async updateSourceSettings(
    @Args('input', { type: () => UpdateSourceSettingsInput })
    input: UpdateSourceSettingsInput,
  ): Promise<EffectiveSettings> {
    return this.settingsUseCase.updateSourceSettings(input);
  }

  @Mutation(() => EffectiveSettings, { name: 'updateDestinationSettings' })
  async updateDestinationSettings(
    @Args('input', { type: () => UpdateDestinationSettingsInput })
    input: UpdateDestinationSettingsInput,
  ): Promise<EffectiveSettings> {
    return this.settingsUseCase.updateDestinationSettings(input);
  }
}
