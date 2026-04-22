import { Injectable } from '@nestjs/common';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { UiNavService } from '../../ui/ui-nav.service';
import {
  buildSetupChecklist,
  SETUP_REASON_MESSAGES,
} from '../../ui/ui-presenter';
import { DashboardSetupGql, IntegrationNavGql } from './operator-bff.types';
import {
  toIntegrationNavGql,
  toSetupChecklistRowsGql,
  toSetupEvaluationGql,
  toSetupReasonMessagesGql,
} from './operator-gql.mapper';

@Injectable()
export class OperatorSetupUseCase {
  constructor(
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly uiNav: UiNavService,
  ) {}

  integrationNav(): IntegrationNavGql {
    return toIntegrationNavGql(this.uiNav.getEntries());
  }

  async dashboardSetup(): Promise<DashboardSetupGql> {
    const evaluation = await this.setupEvaluation.evaluate();
    return {
      evaluation: toSetupEvaluationGql(evaluation),
      checklist: toSetupChecklistRowsGql(buildSetupChecklist(evaluation)),
      reasonMessages: toSetupReasonMessagesGql(SETUP_REASON_MESSAGES),
    };
  }
}
