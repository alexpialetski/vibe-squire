import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Inject,
} from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import type { Response } from 'express';
import { SettingsService } from '../../settings/settings.service';
import { VibeKanbanBoardService } from '../../vibe-kanban/vibe-kanban-board.service';
import { VIBE_KANBAN_UI_KEYS } from './vk-settings.schema';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { vibeKanbanNotDestinationRedirectUrl } from '../../ui/ui-presenter';
import { buildVibeKanbanPageLocals } from '../../ui/ui-vibe-kanban-presenter';
import { UiNavService } from '../../ui/ui-nav.service';

@Controller('ui')
export class VkUiController {
  constructor(
    private readonly settings: SettingsService,
    private readonly vk: VibeKanbanBoardService,
    private readonly setupEvaluation: SetupEvaluationService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly uiNav: UiNavService,
  ) {}

  @Get('vibe-kanban')
  async vibeKanbanPage(
    @Res() res: Response,
    @Query('saved') saved?: string,
    @Query('err') err?: string,
  ): Promise<void> {
    if (this.appEnv.destinationType !== 'vibe_kanban') {
      res.redirect(302, vibeKanbanNotDestinationRedirectUrl());
      return;
    }
    const locals = await buildVibeKanbanPageLocals({
      settings: this.settings,
      destinationType: this.appEnv.destinationType,
      setupEvaluation: this.setupEvaluation,
      vk: this.vk,
      uiNavEntries: this.uiNav.getEntries(),
      saved,
      err,
    });
    res.render('vibe-kanban', locals);
  }

  @Post('vibe-kanban')
  async postVibeKanban(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    if (this.appEnv.destinationType !== 'vibe_kanban') {
      res.redirect(302, vibeKanbanNotDestinationRedirectUrl());
      return;
    }
    try {
      const entries: Record<string, string> = {};
      for (const key of VIBE_KANBAN_UI_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
        entries[key] = String(body[key] ?? '');
      }
      await this.settings.applyGroupPatch('destination', entries);
      res.redirect(302, '/ui/vibe-kanban?saved=1');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/vibe-kanban?err=${encodeURIComponent(msg)}`);
    }
  }
}
