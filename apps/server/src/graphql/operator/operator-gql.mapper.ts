import type { UiNavEntry } from '../../ports/ui-nav.types';
import type { VibeKanbanPageLocals } from '../../ui/ui-vibe-kanban-presenter';
import type {
  ActivityItemGql,
  ActivityRunGql,
  IntegrationNavGql,
  ReinitIntegrationPayload,
  ReinitSubsystemGql,
  SetupChecklistRowGql,
  SetupEvaluationGql,
  SetupReasonMessageGql,
  UiNavEntryGql,
  VibeKanbanUiState,
} from './operator-bff.types';

export function toActivityRunGql(
  run: Omit<ActivityRunGql, 'items'> & {
    items: Array<Omit<ActivityItemGql, 'id'> & { id?: string }>;
  },
): ActivityRunGql {
  return {
    ...run,
    items: run.items.map((item) => ({
      ...item,
      id: item.id ?? item.prUrl,
    })),
  };
}

export function toIntegrationNavGql(entries: UiNavEntry[]): IntegrationNavGql {
  return {
    entries: entries.map(
      (entry): UiNavEntryGql => ({
        id: entry.id,
        label: entry.label,
        href: entry.href,
      }),
    ),
  };
}

export function toVibeKanbanUiState(
  locals: VibeKanbanPageLocals,
): VibeKanbanUiState {
  const {
    integrationNavEntries: _navEntries,
    navMinimal: _navMinimal,
    ...state
  } = locals;
  void _navEntries;
  void _navMinimal;
  return state;
}

export function toSetupEvaluationGql(input: {
  complete: boolean;
  reason?: string;
  mappingCount: number;
  sourceType: string;
  destinationType: string;
  vibeKanbanBoardActive: boolean;
  hasRouting: boolean;
}): SetupEvaluationGql {
  return {
    complete: input.complete,
    reason: input.reason ?? null,
    mappingCount: input.mappingCount,
    sourceType: input.sourceType,
    destinationType: input.destinationType,
    vibeKanbanBoardActive: input.vibeKanbanBoardActive,
    hasRouting: input.hasRouting,
  };
}

export function toSetupChecklistRowsGql(
  rows: Array<{ text: string; linkHref?: string; linkLabel?: string }>,
): SetupChecklistRowGql[] {
  return rows.map((row) => ({
    text: row.text,
    linkHref: row.linkHref ?? null,
    linkLabel: row.linkLabel ?? null,
  }));
}

export function toSetupReasonMessagesGql(
  messages: Record<string, string>,
): SetupReasonMessageGql[] {
  return Object.entries(messages).map(([code, message]) => ({ code, message }));
}

function toReinitSubsystemGql(input: {
  state: string;
  message?: string;
}): ReinitSubsystemGql {
  return {
    state: input.state,
    message: input.message,
  };
}

export function toReinitIntegrationPayload(input: {
  ok: boolean;
  database: { state: string; message?: string };
  source: { state: string; message?: string };
  destination: { state: string; message?: string };
}): ReinitIntegrationPayload {
  return {
    ok: input.ok,
    database: toReinitSubsystemGql(input.database),
    source: toReinitSubsystemGql(input.source),
    destination: toReinitSubsystemGql(input.destination),
  };
}
