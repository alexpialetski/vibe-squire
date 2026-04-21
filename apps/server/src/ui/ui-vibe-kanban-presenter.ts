import type { SupportedDestinationType } from '../config/integration-types';
import type { SettingsService } from '../settings/settings.service';
import type { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { isVibeKanbanBoardDestination } from '../vibe-kanban/vibe-kanban-destination';
import {
  normalizeVkWorkspaceExecutor,
  VK_WORKSPACE_EXECUTOR_OPTIONS,
} from '../config/vk-executors';
import type { UiNavEntry } from '../ports/ui-nav.types';
import { SETTING_LABELS } from './setting-labels';
import { uiNavLocals } from './ui-presenter';

export const VK_PAGE_ORG_ERROR_WRONG_DESTINATION =
  'Vibe Kanban is not available (this UI requires VIBE_SQUIRE_DESTINATION_TYPE=vibe_kanban).';

/**
 * Template locals for Vibe Kanban settings (saved board ids, executor, labels).
 * Org/project lists are loaded via `GET /api/vibe-kanban/organizations` and
 * `GET /api/vibe-kanban/projects`.
 */
export async function buildVibeKanbanPageLocals(deps: {
  settings: SettingsService;
  destinationType: SupportedDestinationType;
  setupEvaluation: Pick<SetupEvaluationService, 'evaluate'>;
  uiNavEntries: UiNavEntry[];
  saved?: string;
  err?: string;
}): Promise<Record<string, unknown>> {
  const {
    settings,
    destinationType,
    setupEvaluation,
    uiNavEntries,
    saved,
    err,
  } = deps;
  const values = settings.listEffectiveNonSecret();
  await setupEvaluation.evaluate();
  const vkBoardPicker = isVibeKanbanBoardDestination(destinationType);
  const orgError = !vkBoardPicker ? VK_PAGE_ORG_ERROR_WRONG_DESTINATION : null;
  const boardOrg = settings.getEffective('default_organization_id');
  const boardProj = settings.getEffective('default_project_id');

  const vkExecutorRaw = settings.getEffective('vk_workspace_executor').trim();
  const normalizedEx = normalizeVkWorkspaceExecutor(vkExecutorRaw);
  const vkExecutor =
    normalizedEx ?? VK_WORKSPACE_EXECUTOR_OPTIONS[0]?.value ?? 'cursor_agent';

  return {
    ...uiNavLocals(uiNavEntries),
    saved: saved === '1',
    error: err ? decodeURIComponent(err) : null,
    vkBoardPicker,
    boardOrg,
    boardProj,
    kanbanDoneStatus: values.kanban_done_status ?? '',
    vkExecutor,
    executorOptions: VK_WORKSPACE_EXECUTOR_OPTIONS.map((o) => ({ ...o })),
    vkLabels: {
      default_organization_id: SETTING_LABELS.default_organization_id,
      vk_workspace_executor: SETTING_LABELS.vk_workspace_executor,
      kanban_done_status: SETTING_LABELS.kanban_done_status,
    },
    orgError,
  };
}
