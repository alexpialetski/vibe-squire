import { Query, Resolver } from '@nestjs/graphql';
import { OperatorSetupUseCase } from './operator-setup.usecase';
import { DashboardSetupGql, IntegrationNavGql } from './operator-bff.types';

@Resolver()
export class OperatorSetupResolver {
  constructor(private readonly setupUseCase: OperatorSetupUseCase) {}

  @Query(() => IntegrationNavGql, { name: 'integrationNav' })
  integrationNav(): IntegrationNavGql {
    return this.setupUseCase.integrationNav();
  }

  @Query(() => DashboardSetupGql, { name: 'dashboardSetup' })
  async dashboardSetup(): Promise<DashboardSetupGql> {
    return this.setupUseCase.dashboardSetup();
  }
}
