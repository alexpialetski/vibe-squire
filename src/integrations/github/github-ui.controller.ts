import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Inject,
} from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../config/env-schema';
import type { Response } from 'express';
import { SettingsService } from '../../settings/settings.service';
import { StatusEventsService } from '../../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../../events/integration-settings-emitter.service';
import { parsePrIgnoreAuthorLogins } from '../../sync/pr-ignore-author-logins';
import { type SettingKey } from '../../config/setting-keys';
import { integrationFieldsForUi } from '../../ui/setting-labels';
import { GITHUB_SOURCE_UI_KEYS } from '../../ui/integration-ui-registry';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { githubNotSourceRedirectUrl, uiNavLocals } from '../../ui/ui-presenter';
import { UiNavService } from '../../ui/ui-nav.service';

@Controller('ui')
export class GithubUiController {
  constructor(
    private readonly settings: SettingsService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
    private readonly setupEvaluation: SetupEvaluationService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly uiNav: UiNavService,
  ) {}

  @Get('github')
  async githubPage(
    @Res() res: Response,
    @Query('saved') saved?: string,
    @Query('err') err?: string,
  ): Promise<void> {
    if (this.appEnv.sourceType !== 'github') {
      res.redirect(302, githubNotSourceRedirectUrl());
      return;
    }
    const values = this.settings.listEffectiveNonSecret();
    const ev = await this.setupEvaluation.evaluate();
    res.render('github', {
      ...uiNavLocals(ev, this.uiNav.getEntries()),
      saved: saved === '1',
      error: err ? decodeURIComponent(err) : null,
      fields: integrationFieldsForUi(GITHUB_SOURCE_UI_KEYS, values),
    });
  }

  @Post('github')
  async postGithub(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    if (this.appEnv.sourceType !== 'github') {
      res.redirect(302, githubNotSourceRedirectUrl());
      return;
    }
    try {
      const touched: SettingKey[] = [];
      for (const key of GITHUB_SOURCE_UI_KEYS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          const value = String(body[key] ?? '');
          if (key === 'pr_ignore_author_logins') {
            const parsed = parsePrIgnoreAuthorLogins(value);
            if (!parsed.ok) {
              throw new Error(parsed.message);
            }
          }
          await this.settings.setValue(key, value);
          touched.push(key);
        }
      }
      await this.settings.refreshCache();
      await this.integrationEmitter.emitIntegrationSettingsChanged(touched);
      this.statusEvents.emitChanged();
      this.statusEvents.emitScheduleRefresh();
      res.redirect(302, '/ui/github?saved=1');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/github?err=${encodeURIComponent(msg)}`);
    }
  }
}
