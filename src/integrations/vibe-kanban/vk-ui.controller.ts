import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Redirect,
  Inject,
} from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../config/app-env.token';
import type { Response } from 'express';
import { SettingsService } from '../../settings/settings.service';
import { VibeKanbanMcpService } from '../../vibe-kanban/vibe-kanban-mcp.service';
import { StatusEventsService } from '../../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../../events/integration-settings-emitter.service';
import {
  type SettingKey,
  VIBE_KANBAN_UI_KEYS,
} from '../../settings/setting-keys';
import { normalizeVkWorkspaceExecutor } from './vk-workspace-executors';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { vibeKanbanNotDestinationRedirectUrl } from '../../ui/ui-presenter';
import { buildVibeKanbanPageLocals } from '../../ui/ui-vibe-kanban-presenter';
import { UiNavService } from '../../ui/ui-nav.service';

@Controller('ui')
export class VkUiController {
  constructor(
    private readonly settings: SettingsService,
    private readonly vk: VibeKanbanMcpService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
    private readonly setupEvaluation: SetupEvaluationService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    private readonly uiNav: UiNavService,
  ) {}

  @Get('kanban')
  @Redirect('/ui/vibe-kanban', 302)
  kanbanLegacyRedirect(): void {
    void 0;
  }

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
      const touched: SettingKey[] = [];
      for (const key of VIBE_KANBAN_UI_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(body, key)) {
          continue;
        }
        let v = String(body[key] ?? '');
        if (key === 'vk_workspace_executor') {
          const n = normalizeVkWorkspaceExecutor(v);
          if (!n) {
            res.redirect(
              302,
              `/ui/vibe-kanban?err=${encodeURIComponent('Invalid workspace executor')}`,
            );
            return;
          }
          v = n;
        }
        await this.settings.setValue(key, v);
        touched.push(key);
      }
      await this.settings.refreshCache();
      await this.integrationEmitter.emitIntegrationSettingsChanged(touched);
      this.statusEvents.emitChanged();
      this.statusEvents.emitScheduleRefresh();
      res.redirect(302, '/ui/vibe-kanban?saved=1');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/vibe-kanban?err=${encodeURIComponent(msg)}`);
    }
  }

  @Post('kanban/default-board')
  async postKanbanDefaultBoard(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    if (this.appEnv.destinationType !== 'vibe_kanban') {
      res.redirect(302, vibeKanbanNotDestinationRedirectUrl());
      return;
    }
    try {
      const organizationId = (body.organization_id ?? '').trim();
      const projectId = (body.project_id ?? '').trim();
      if (!organizationId || !projectId) {
        res.redirect(
          302,
          `/ui/vibe-kanban?err=${encodeURIComponent('Organization and project UUIDs are required')}`,
        );
        return;
      }
      await this.settings.setValue('default_organization_id', organizationId);
      await this.settings.setValue('default_project_id', projectId);
      await this.settings.refreshCache();
      await this.integrationEmitter.emitIntegrationSettingsChanged([
        'default_organization_id',
        'default_project_id',
      ]);
      this.statusEvents.emitChanged();
      this.statusEvents.emitScheduleRefresh();
      res.redirect(302, '/ui/vibe-kanban?saved=1');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/vibe-kanban?err=${encodeURIComponent(msg)}`);
    }
  }
}
