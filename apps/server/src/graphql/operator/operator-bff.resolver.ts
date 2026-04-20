import {
  Args,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { BadRequestException, Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { SettingsService } from '../../settings/settings.service';
import { CoreSettings } from '../../settings/core-settings.service';
import { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import { SetupCompleteGuard } from '../../setup/setup-complete.guard';
import { SyncDependenciesGuard } from '../../sync/sync-dependencies.guard';
import { MappingsService } from '../../mappings/mappings.service';
import { StatusEventsService } from '../../events/status-events.service';
import { ActivityUiService } from '../../ui/activity-ui.service';
import { UiNavService } from '../../ui/ui-nav.service';
import { coreSettingsFieldsMetadata } from '../../ui/core-settings-metadata';
import {
  buildSetupChecklist,
  destinationTypeLabel,
  SETUP_REASON_MESSAGES,
  sourceTypeLabel,
} from '../../ui/ui-presenter';
import { SyncService } from '../../sync/sync.service';
import { PollSchedulerService } from '../../sync/poll-scheduler.service';
import { PrTriageService } from '../../sync/pr-triage.service';
import { ReinitService } from '../../reinit/reinit.service';
import { isSettingsPatchError } from '../../settings/parse-settings-patch';
import {
  AcceptTriagePayload,
  ActivityEventsPayload,
  ActivityFeedConnection,
  ActivityFeedEdge,
  ActivityRunGql,
  DeclineTriagePayload,
  DashboardSetupGql,
  DeleteMappingPayload,
  EffectiveSettings,
  IntegrationNavGql,
  MappingGql,
  ReconsiderTriagePayload,
  ReinitIntegrationPayload,
  ReinitSubsystemGql,
  TriggerSyncPayload,
  UiNavEntryGql,
  UpdateMappingInput,
  SetupChecklistRowGql,
  SetupEvaluationGql,
  SetupReasonMessageGql,
  UpdateSettingsInput,
  UpdateSettingsPayload,
  UpsertMappingInput,
} from './operator-bff.types';
import { ACTIVITY_EVENTS, ACTIVITY_PUBSUB } from './activity-tokens';

function toActivityRunGql(
  run: Awaited<ReturnType<ActivityUiService['listPresentedRuns']>>[number],
): ActivityRunGql {
  return {
    ...run,
    items: run.items.map((i) => ({
      ...i,
      id: `${run.id}:${i.prUrl}`,
    })),
  };
}

function patchObjectFromInput(
  input: UpdateSettingsInput,
): Record<string, string> {
  const out: Record<string, string> = {};
  const entries: [keyof UpdateSettingsInput, string | undefined][] = [
    ['poll_interval_minutes', input.poll_interval_minutes],
    ['jitter_max_seconds', input.jitter_max_seconds],
    ['run_now_cooldown_seconds', input.run_now_cooldown_seconds],
    ['max_board_pr_count', input.max_board_pr_count],
    ['scheduled_sync_enabled', input.scheduled_sync_enabled],
    ['auto_create_issues', input.auto_create_issues],
  ];
  for (const [k, v] of entries) {
    if (v !== undefined && v !== null) {
      out[k as string] = v;
    }
  }
  return out;
}

@Resolver()
export class OperatorBffResolver {
  constructor(
    private readonly settings: SettingsService,
    private readonly coreSettings: CoreSettings,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly mappingsService: MappingsService,
    private readonly activityUi: ActivityUiService,
    private readonly uiNav: UiNavService,
    private readonly sync: SyncService,
    private readonly pollScheduler: PollSchedulerService,
    private readonly triage: PrTriageService,
    private readonly reinit: ReinitService,
    private readonly statusEvents: StatusEventsService,
    @Inject(ACTIVITY_PUBSUB) private readonly activityPubSub: PubSub,
  ) {}

  @Query(() => EffectiveSettings, { name: 'effectiveSettings' })
  async effectiveSettings(): Promise<EffectiveSettings> {
    const values = this.settings.listEffectiveNonSecret();
    const ev = await this.setupEvaluation.evaluate();
    const meta = coreSettingsFieldsMetadata(values);
    return {
      coreFields: meta.map((m) => ({
        key: m.key,
        label: m.label,
        value: m.value,
        envVar: m.envVar,
        description: m.description,
      })),
      resolvedSourceLabel: sourceTypeLabel(ev.sourceType),
      resolvedDestinationLabel: destinationTypeLabel(ev.destinationType),
      scheduledSyncEnabled: this.coreSettings.scheduledSyncEnabled,
      autoCreateIssues: this.coreSettings.autoCreateIssues,
    };
  }

  @Query(() => [MappingGql], { name: 'mappings' })
  async mappings(): Promise<MappingGql[]> {
    return this.mappingsService.findAll();
  }

  @Query(() => ActivityFeedConnection, { name: 'activityFeed' })
  async activityFeed(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ): Promise<ActivityFeedConnection> {
    const { nodes, hasNextPage, endCursor } =
      await this.activityUi.listPresentedRunsConnection(
        first ?? 40,
        after ?? null,
      );
    const edges: ActivityFeedEdge[] = nodes.map((run) => {
      const gqlRun = toActivityRunGql(run);
      const cursor = Buffer.from(
        JSON.stringify({ startedAt: run.startedAt, id: run.id }),
        'utf8',
      ).toString('base64url');
      return { cursor, node: gqlRun };
    });
    return {
      edges,
      pageInfo: { hasNextPage, endCursor: endCursor ?? null },
    };
  }

  @Query(() => IntegrationNavGql, { name: 'integrationNav' })
  integrationNav(): IntegrationNavGql {
    return {
      entries: this.uiNav.getEntries().map(
        (e): UiNavEntryGql => ({
          id: e.id,
          label: e.label,
          href: e.href,
        }),
      ),
    };
  }

  @Query(() => DashboardSetupGql, { name: 'dashboardSetup' })
  async dashboardSetup(): Promise<DashboardSetupGql> {
    const evaluation = await this.setupEvaluation.evaluate();
    const evGql: SetupEvaluationGql = {
      complete: evaluation.complete,
      reason: evaluation.reason ?? null,
      mappingCount: evaluation.mappingCount,
      sourceType: evaluation.sourceType,
      destinationType: evaluation.destinationType,
      vibeKanbanBoardActive: evaluation.vibeKanbanBoardActive,
      hasRouting: evaluation.hasRouting,
    };
    const checklist: SetupChecklistRowGql[] = buildSetupChecklist(
      evaluation,
    ).map((row) => ({
      text: row.text,
      linkHref: row.linkHref ?? null,
      linkLabel: row.linkLabel ?? null,
    }));
    const reasonMessages: SetupReasonMessageGql[] = Object.entries(
      SETUP_REASON_MESSAGES,
    ).map(([code, message]) => ({ code, message }));
    return {
      evaluation: evGql,
      checklist,
      reasonMessages,
    };
  }

  @Mutation(() => UpdateSettingsPayload, { name: 'updateSettings' })
  async updateSettings(
    @Args('input', { type: () => UpdateSettingsInput })
    input: UpdateSettingsInput,
  ): Promise<UpdateSettingsPayload> {
    const body = patchObjectFromInput(input);
    if (Object.keys(body).length === 0) {
      return { ok: true };
    }
    try {
      await this.settings.applyGroupPatch('core', body);
    } catch (e) {
      if (isSettingsPatchError(e)) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
    return { ok: true };
  }

  @Mutation(() => MappingGql, { name: 'upsertMapping' })
  async upsertMapping(
    @Args('input', { type: () => UpsertMappingInput })
    input: UpsertMappingInput,
  ): Promise<MappingGql> {
    const row = await this.mappingsService.create({
      githubRepo: input.githubRepo,
      vibeKanbanRepoId: input.vibeKanbanRepoId,
      ...(input.label !== undefined && input.label !== null
        ? { label: input.label }
        : {}),
    });
    this.statusEvents.emitChanged();
    return row;
  }

  @Mutation(() => MappingGql, { name: 'updateMapping' })
  async updateMapping(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateMappingInput })
    input: UpdateMappingInput,
  ): Promise<MappingGql> {
    const row = await this.mappingsService.update(id, {
      ...(input.githubRepo !== undefined
        ? { githubRepo: input.githubRepo }
        : {}),
      ...(input.vibeKanbanRepoId !== undefined
        ? { vibeKanbanRepoId: input.vibeKanbanRepoId }
        : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
    });
    this.statusEvents.emitChanged();
    return row;
  }

  @Mutation(() => DeleteMappingPayload, { name: 'deleteMapping' })
  async deleteMapping(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<DeleteMappingPayload> {
    await this.mappingsService.remove(id);
    this.statusEvents.emitChanged();
    return { ok: true };
  }

  @Mutation(() => AcceptTriagePayload, { name: 'acceptTriage' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async acceptTriage(
    @Args('prUrl') prUrl: string,
  ): Promise<AcceptTriagePayload> {
    const r = await this.triage.accept(prUrl);
    void this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
    return r;
  }

  @Mutation(() => DeclineTriagePayload, { name: 'declineTriage' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async declineTriage(
    @Args('prUrl') prUrl: string,
  ): Promise<DeclineTriagePayload> {
    await this.triage.decline(prUrl);
    void this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
    return { ok: true };
  }

  @Mutation(() => ReconsiderTriagePayload, { name: 'reconsiderTriage' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async reconsiderTriage(
    @Args('prUrl') prUrl: string,
  ): Promise<ReconsiderTriagePayload> {
    await this.triage.reconsider(prUrl);
    void this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
    return { ok: true };
  }

  @Mutation(() => TriggerSyncPayload, { name: 'triggerSync' })
  @UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
  async triggerSync(): Promise<TriggerSyncPayload> {
    const r = await this.sync.requestManualSync();
    this.pollScheduler.reschedule('manual_run_complete');
    void this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
    return r;
  }

  @Mutation(() => ReinitIntegrationPayload, { name: 'reinitIntegration' })
  async reinitIntegration(): Promise<ReinitIntegrationPayload> {
    const r = await this.reinit.reinitialize();
    void this.activityPubSub.publish(ACTIVITY_EVENTS, {
      activityEvents: { invalidate: true },
    });
    return {
      ok: r.ok,
      database: toSubsystem(r.database),
      source: toSubsystem(r.source),
      destination: toSubsystem(r.destination),
    };
  }

  @Subscription(() => ActivityEventsPayload, { name: 'activityEvents' })
  activityEvents() {
    return this.activityPubSub.asyncIterableIterator(ACTIVITY_EVENTS);
  }
}

function toSubsystem(s: {
  state: string;
  message?: string;
}): ReinitSubsystemGql {
  return {
    state: s.state,
    message: s.message,
  };
}
