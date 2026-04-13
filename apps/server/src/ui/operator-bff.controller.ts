import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { CoreSettings } from '../settings/core-settings.service';
import { SettingsService } from '../settings/settings.service';
import {
  type SetupEvaluation,
  SetupEvaluationService,
} from '../setup/setup-evaluation.service';
import { GITHUB_SOURCE_UI_KEYS } from './integration-ui-registry';
import {
  integrationFieldsForUi,
  schedulerTextFieldsForUi,
} from './setting-labels';
import {
  buildSetupChecklist,
  destinationTypeLabel,
  SETUP_REASON_MESSAGES,
  sourceTypeLabel,
} from './ui-presenter';
import { UiNavOutputDto } from './dto/ui-nav-output.dto';
import { SetupApiOutputDto } from './dto/setup-api-output.dto';
import { GithubFieldsOutputDto } from './dto/github-fields-output.dto';
import { SettingsMetaOutputDto } from './dto/settings-meta-output.dto';
import { UiNavService } from './ui-nav.service';

@ApiTags('operator-ui')
@Controller('api/ui')
export class OperatorBffController {
  constructor(
    private readonly uiNav: UiNavService,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly settings: SettingsService,
    private readonly coreSettings: CoreSettings,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  @Get('nav')
  @ApiOperation({ summary: 'Sidebar navigation entries' })
  @ZodResponse({
    status: 200,
    type: UiNavOutputDto,
    description: 'Integration nav entries',
  })
  nav(): { entries: ReturnType<UiNavService['getEntries']> } {
    return { entries: this.uiNav.getEntries() };
  }

  @Get('setup')
  @ApiOperation({ summary: 'Setup evaluation + checklist for dashboard' })
  @ZodResponse({
    status: 200,
    type: SetupApiOutputDto,
    description: 'Setup gate state',
  })
  async setup(): Promise<{
    evaluation: SetupEvaluation;
    checklist: ReturnType<typeof buildSetupChecklist>;
    reasonMessages: typeof SETUP_REASON_MESSAGES;
  }> {
    const evaluation = await this.setupEvaluation.evaluate();
    return {
      evaluation,
      checklist: buildSetupChecklist(evaluation),
      reasonMessages: { ...SETUP_REASON_MESSAGES },
    };
  }

  @Get('github-fields')
  @ApiOperation({
    summary: 'GitHub integration settings field rows (when source is github)',
  })
  @ZodResponse({
    status: 200,
    type: GithubFieldsOutputDto,
    description: 'Field rows for GitHub source settings',
  })
  githubFields(): {
    disabled: boolean;
    fields: ReturnType<typeof integrationFieldsForUi>;
  } {
    if (this.appEnv.sourceType !== 'github') {
      return { disabled: true, fields: [] };
    }
    const values = this.settings.listEffectiveNonSecret();
    return {
      disabled: false,
      fields: integrationFieldsForUi(GITHUB_SOURCE_UI_KEYS, values),
    };
  }

  @Get('settings-meta')
  @ApiOperation({ summary: 'General settings form metadata' })
  @ZodResponse({
    status: 200,
    type: SettingsMetaOutputDto,
    description: 'Core scheduler fields + resolved adapter labels',
  })
  async settingsMeta(): Promise<{
    coreFields: ReturnType<typeof schedulerTextFieldsForUi>;
    resolvedSourceLabel: string;
    resolvedDestinationLabel: string;
    scheduledSyncEnabled: boolean;
    autoCreateIssues: boolean;
  }> {
    const values = this.settings.listEffectiveNonSecret();
    const ev = await this.setupEvaluation.evaluate();
    return {
      coreFields: schedulerTextFieldsForUi(values),
      resolvedSourceLabel: sourceTypeLabel(ev.sourceType),
      resolvedDestinationLabel: destinationTypeLabel(ev.destinationType),
      scheduledSyncEnabled: this.coreSettings.scheduledSyncEnabled,
      autoCreateIssues: this.coreSettings.autoCreateIssues,
    };
  }
}
