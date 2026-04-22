import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import { CoreSettings } from '../../settings/core-settings.service';
import { SettingsService } from '../../settings/settings.service';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { coreSettingsFieldsMetadata } from '../../ui/core-settings-metadata';
import { GITHUB_SOURCE_UI_KEYS } from '../../ui/integration-ui-registry';
import { integrationFieldsForUi } from '../../ui/setting-labels';
import { destinationTypeLabel, sourceTypeLabel } from '../../ui/ui-presenter';
import {
  EffectiveSettings,
  GithubFieldsPayload,
  UpdateDestinationSettingsInput,
  UpdateSettingsInput,
  UpdateSourceSettingsInput,
} from './operator-bff.types';
import { applySettingsPatchOrBadRequest } from './settings-patch-errors';

@Injectable()
export class OperatorSettingsUseCase {
  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly settings: SettingsService,
    private readonly coreSettings: CoreSettings,
    private readonly setupEvaluation: SetupEvaluationService,
  ) {}

  async effectiveSettings(): Promise<EffectiveSettings> {
    const values = this.settings.listEffectiveNonSecret();
    const evaluation = await this.setupEvaluation.evaluate();
    const coreFields = coreSettingsFieldsMetadata(values).map((field) => ({
      key: field.key,
      label: field.label,
      value: field.value,
      envVar: field.envVar,
      description: field.description,
    }));
    return {
      id: 'singleton',
      coreFields,
      resolvedSourceLabel: sourceTypeLabel(evaluation.sourceType),
      resolvedDestinationLabel: destinationTypeLabel(
        evaluation.destinationType,
      ),
      scheduledSyncEnabled: this.coreSettings.scheduledSyncEnabled,
      autoCreateIssues: this.coreSettings.autoCreateIssues,
    };
  }

  githubFields(): GithubFieldsPayload {
    if (this.appEnv.sourceType !== 'github') {
      return { disabled: true, fields: [] };
    }
    const values = this.settings.listEffectiveNonSecret();
    return {
      disabled: false,
      fields: integrationFieldsForUi(GITHUB_SOURCE_UI_KEYS, values),
    };
  }

  async updateSettings(input: UpdateSettingsInput): Promise<EffectiveSettings> {
    const body: Record<string, string> = {};
    if (input.poll_interval_minutes !== undefined) {
      body.poll_interval_minutes = input.poll_interval_minutes;
    }
    if (input.jitter_max_seconds !== undefined) {
      body.jitter_max_seconds = input.jitter_max_seconds;
    }
    if (input.run_now_cooldown_seconds !== undefined) {
      body.run_now_cooldown_seconds = input.run_now_cooldown_seconds;
    }
    if (input.max_board_pr_count !== undefined) {
      body.max_board_pr_count = input.max_board_pr_count;
    }
    if (input.scheduled_sync_enabled !== undefined) {
      body.scheduled_sync_enabled = input.scheduled_sync_enabled
        ? 'true'
        : 'false';
    }
    if (input.auto_create_issues !== undefined) {
      body.auto_create_issues = input.auto_create_issues ? 'true' : 'false';
    }
    await applySettingsPatchOrBadRequest(this.settings, 'core', body);
    return this.effectiveSettings();
  }

  async updateSourceSettings(
    input: UpdateSourceSettingsInput,
  ): Promise<EffectiveSettings> {
    await applySettingsPatchOrBadRequest(
      this.settings,
      'source',
      pickStringFields(input),
    );
    return this.effectiveSettings();
  }

  async updateDestinationSettings(
    input: UpdateDestinationSettingsInput,
  ): Promise<EffectiveSettings> {
    await applySettingsPatchOrBadRequest(
      this.settings,
      'destination',
      pickStringFields(input),
    );
    return this.effectiveSettings();
  }
}

function pickStringFields<T extends object>(input: T): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
