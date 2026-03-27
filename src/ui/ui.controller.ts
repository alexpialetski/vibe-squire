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
import { StatusEventsService } from '../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../events/integration-settings-emitter.service';
import { isValidMaxBoardPrCountInput } from '../config/max-board-pr-count';
import { isValidScheduledSyncEnabledInput } from '../config/scheduled-sync-enabled';
import { type SettingKey } from '../config/setting-keys';
import { schedulerTextFieldsForUi } from './setting-labels';
import { generalSettingsPostKeys } from './integration-ui-registry';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { PollRunHistoryService } from '../sync/poll-run-history.service';
import {
  buildSetupChecklist,
  destinationTypeLabel,
  escapeForPre,
  presentActivityRunsForView,
  sourceTypeLabel,
  uiNavLocals,
} from './ui-presenter';
import { UiNavService } from './ui-nav.service';

@Controller('ui')
export class UiController {
  constructor(
    private readonly status: StatusService,
    private readonly settings: SettingsService,
    private readonly mappings: MappingsService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly pollRunHistory: PollRunHistoryService,
    private readonly uiNav: UiNavService,
  ) {}

  @Get()
  @Redirect('/ui/dashboard', 302)
  redirectUiRoot(): void {
    void 0;
  }

  @Get('activity')
  @Render('activity')
  async activityPage(): Promise<Record<string, unknown>> {
    const ev = await this.setupEvaluation.evaluate();
    const rows = await this.pollRunHistory.listRecentForUi(40);
    return {
      ...uiNavLocals(ev, this.uiNav.getEntries()),
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
      ...uiNavLocals(ev, this.uiNav.getEntries()),
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
    @Query('err') err?: string,
  ): Promise<Record<string, unknown>> {
    const values = this.settings.listEffectiveNonSecret();
    const ev = await this.setupEvaluation.evaluate();
    const scheduledSyncEnabled = this.settings.getEffectiveBoolean(
      'scheduled_sync_enabled',
    );
    return {
      ...uiNavLocals(ev, this.uiNav.getEntries()),
      fields: schedulerTextFieldsForUi(values),
      scheduledSyncEnabled,
      saved: saved === '1',
      error: err ? decodeURIComponent(err) : null,
      resolvedSourceLabel: sourceTypeLabel(ev.sourceType),
      resolvedDestinationLabel: destinationTypeLabel(ev.destinationType),
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

  @Get('mappings')
  @Render('mappings')
  async mappingsPage(
    @Query('err') err?: string,
  ): Promise<Record<string, unknown>> {
    const ev = await this.setupEvaluation.evaluate();
    const rows = await this.mappings.findAll();
    return {
      ...uiNavLocals(ev, this.uiNav.getEntries()),
      rows,
      error: err ? decodeURIComponent(err) : null,
      kanbanMcpPicker: ev.destinationMcpConfigured,
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
}
