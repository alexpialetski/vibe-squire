import {
  ConflictException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Render,
  Redirect,
} from '@nestjs/common';
import type { Response } from 'express';
import { StatusService } from '../status/status.service';
import { SettingsService } from '../settings/settings.service';
import { MappingsService } from '../mappings/mappings.service';
import { VibeKanbanMcpService } from '../vibe-kanban/vibe-kanban-mcp.service';
import { StatusEventsService } from '../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../events/integration-settings-emitter.service';
import { isValidMaxBoardPrCountInput } from '../config/max-board-pr-count';
import { isValidScheduledSyncEnabledInput } from '../config/scheduled-sync-enabled';
import { parsePrIgnoreAuthorLogins } from '../sync/pr-ignore-author-logins';
import { type SettingKey } from '../config/setting-keys';
import { normalizeVkWorkspaceExecutor } from '../config/vk-workspace-executors';
import {
  schedulerTextFieldsForUi,
  integrationFieldsForUi,
} from './setting-labels';
import {
  generalSettingsPostKeys,
  GITHUB_SOURCE_UI_KEYS,
  VIBE_KANBAN_UI_KEYS,
} from './integration-ui-registry';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { isVibeKanbanMcpConfigured } from '../vibe-kanban/mcp-transport-config';
import { PollRunHistoryService } from '../sync/poll-run-history.service';
import {
  buildSetupChecklist,
  destinationTypeLabel,
  escapeForPre,
  githubNotSourceRedirectUrl,
  parseSetupDestinationType,
  parseSetupSourceType,
  presentActivityRunsForView,
  sourceTypeLabel,
  uiNavLocals,
  vibeKanbanNotDestinationRedirectUrl,
} from './ui-presenter';
import { buildVibeKanbanPageLocals } from './ui-vibe-kanban-presenter';

@Controller('ui')
export class UiController {
  constructor(
    private readonly status: StatusService,
    private readonly settings: SettingsService,
    private readonly mappings: MappingsService,
    private readonly vk: VibeKanbanMcpService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly pollRunHistory: PollRunHistoryService,
  ) {}

  @Get()
  @Redirect('/ui/dashboard', 302)
  redirectUiRoot(): void {
    void 0;
  }

  @Post('setup/integration')
  async postSetupIntegration(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    const parsedSource = parseSetupSourceType(body.source_type);
    if (parsedSource === null) {
      res.redirect(
        302,
        `/ui/settings?err=${encodeURIComponent('Invalid PR source selection')}`,
      );
      return;
    }
    const parsedDestination = parseSetupDestinationType(body.destination_type);
    if (parsedDestination === null) {
      res.redirect(
        302,
        `/ui/settings?err=${encodeURIComponent('Invalid destination selection')}`,
      );
      return;
    }
    const sourceType = parsedSource;
    const destinationType = parsedDestination;
    try {
      await this.settings.setValue('source_type', sourceType);
      await this.settings.setValue('destination_type', destinationType);
      await this.settings.refreshCache();
      await this.integrationEmitter.emitIntegrationSettingsChanged([
        'source_type',
        'destination_type',
      ]);
      const evAfter = await this.setupEvaluation.evaluate();
      this.statusEvents.emitChanged();
      this.statusEvents.emitScheduleRefresh();
      if (evAfter.integrationsConfigured) {
        res.redirect(302, '/ui/dashboard');
      } else {
        res.redirect(302, '/ui/settings?integration_saved=1');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/settings?err=${encodeURIComponent(msg)}`);
    }
  }

  @Get('activity')
  @Render('activity')
  async activityPage(): Promise<Record<string, unknown>> {
    const ev = await this.setupEvaluation.evaluate();
    const rows = await this.pollRunHistory.listRecentForUi(40);
    return {
      ...uiNavLocals(ev),
      runs: presentActivityRunsForView(rows),
    };
  }

  @Get('dashboard')
  @Render('dashboard')
  async dashboard(): Promise<Record<string, unknown>> {
    const snapshot = await this.status.getSnapshot();
    const snapshotPretty = escapeForPre(JSON.stringify(snapshot, null, 2));
    const bootSnapshotJson = JSON.stringify(snapshot).replace(/</g, '\\u003c');
    const ev = await this.setupEvaluation.evaluate();
    const setupChecklist = buildSetupChecklist(ev);
    const scheduledSyncEnabled = this.settings.getEffectiveBoolean(
      'scheduled_sync_enabled',
    );
    return {
      ...uiNavLocals(ev),
      snapshotPretty,
      bootSnapshotJson,
      manualSync: snapshot.manual_sync as Record<string, unknown>,
      showSetupChecklist: setupChecklist.length > 0,
      setupChecklist,
      showScheduledSyncOff: ev.complete && !scheduledSyncEnabled,
    };
  }

  @Get('settings')
  @Render('settings')
  async settingsPage(
    @Query('saved') saved?: string,
    @Query('integration_saved') integrationSaved?: string,
    @Query('err') err?: string,
  ): Promise<Record<string, unknown>> {
    const values = this.settings.listEffectiveNonSecret();
    const ev = await this.setupEvaluation.evaluate();
    const scheduledSyncEnabled = this.settings.getEffectiveBoolean(
      'scheduled_sync_enabled',
    );
    return {
      ...uiNavLocals(ev),
      fields: schedulerTextFieldsForUi(values),
      scheduledSyncEnabled,
      saved: saved === '1',
      integrationSaved: integrationSaved === '1',
      error: err ? decodeURIComponent(err) : null,
      sourceTypeLabel: sourceTypeLabel(ev.sourceType),
      destinationTypeLabel: destinationTypeLabel(ev.destinationType),
      sourceTypeChoice: ev.sourceType.trim() === 'github' ? 'github' : 'none',
      destinationTypeChoice:
        ev.destinationType.trim() === 'vibe_kanban' ? 'vibe_kanban' : 'none',
    };
  }

  @Post('settings')
  async postSettings(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const touched: SettingKey[] = [];
      for (const key of generalSettingsPostKeys()) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          const value = String(body[key] ?? '');
          if (
            key === 'max_board_pr_count' &&
            !isValidMaxBoardPrCountInput(value)
          ) {
            throw new Error(
              'Max PRs on board must be an integer from 1 to 200',
            );
          }
          if (
            key === 'scheduled_sync_enabled' &&
            !isValidScheduledSyncEnabledInput(value)
          ) {
            throw new Error(
              'Automatic polling must be true/false, 1/0, or yes/no',
            );
          }
          await this.settings.setValue(key, value);
          touched.push(key);
        }
      }
      await this.settings.refreshCache();
      await this.integrationEmitter.emitIntegrationSettingsChanged(touched);
      this.statusEvents.emitChanged();
      this.statusEvents.emitScheduleRefresh();
      res.redirect(302, '/ui/settings?saved=1');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/settings?err=${encodeURIComponent(msg)}`);
    }
  }

  @Get('github')
  async githubPage(
    @Res() res: Response,
    @Query('saved') saved?: string,
    @Query('err') err?: string,
  ): Promise<void> {
    const src = this.settings.getEffective('source_type').trim();
    if (src !== 'github') {
      res.redirect(302, githubNotSourceRedirectUrl());
      return;
    }
    const values = this.settings.listEffectiveNonSecret();
    const ev = await this.setupEvaluation.evaluate();
    res.render('github', {
      ...uiNavLocals(ev),
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
    const src = this.settings.getEffective('source_type').trim();
    if (src !== 'github') {
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

  @Get('mappings')
  @Render('mappings')
  async mappingsPage(
    @Query('err') err?: string,
  ): Promise<Record<string, unknown>> {
    const ev = await this.setupEvaluation.evaluate();
    const rows = await this.mappings.findAll();
    return {
      ...uiNavLocals(ev),
      rows,
      error: err ? decodeURIComponent(err) : null,
      kanbanMcpPicker: isVibeKanbanMcpConfigured(this.settings),
    };
  }

  @Post('mappings')
  async postMapping(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.mappings.create({
        githubRepo: body.githubRepo ?? '',
        vibeKanbanRepoId: body.vibeKanbanRepoId ?? '',
        ...(body.label?.trim() ? { label: body.label.trim() } : {}),
      });
      this.statusEvents.emitChanged();
      res.redirect(302, '/ui/mappings');
    } catch (e) {
      const msg =
        e instanceof ConflictException
          ? String(e.message)
          : e instanceof Error
            ? e.message
            : String(e);
      res.redirect(302, `/ui/mappings?err=${encodeURIComponent(msg)}`);
    }
  }

  @Post('mappings/:id/delete')
  async deleteMapping(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.mappings.remove(id);
      this.statusEvents.emitChanged();
      res.redirect(302, '/ui/mappings');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(302, `/ui/mappings?err=${encodeURIComponent(msg)}`);
    }
  }

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
    const dest = this.settings.getEffective('destination_type').trim();
    if (dest !== 'vibe_kanban') {
      res.redirect(302, vibeKanbanNotDestinationRedirectUrl());
      return;
    }
    const locals = await buildVibeKanbanPageLocals({
      settings: this.settings,
      setupEvaluation: this.setupEvaluation,
      vk: this.vk,
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
    const dest = this.settings.getEffective('destination_type').trim();
    if (dest !== 'vibe_kanban') {
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
    const dest = this.settings.getEffective('destination_type').trim();
    if (dest !== 'vibe_kanban') {
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
