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
import { CoreSettings } from '../settings/core-settings.service';

@Controller('ui')
export class UiController {
  constructor(
    private readonly status: StatusService,
    private readonly settings: SettingsService,
    private readonly coreSettings: CoreSettings,
    private readonly mappings: MappingsService,
    private readonly statusEvents: StatusEventsService,
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
    const scheduledSyncEnabled = this.coreSettings.scheduledSyncEnabled;
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
    const scheduledSyncEnabled = this.coreSettings.scheduledSyncEnabled;
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
      const entries: Record<string, string> = {};
      for (const key of generalSettingsPostKeys()) {
        if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
        entries[key] = String(body[key] ?? '');
      }
      await this.settings.applyGroupPatch('core', entries);
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
