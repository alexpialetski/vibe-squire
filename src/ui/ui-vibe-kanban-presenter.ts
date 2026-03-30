import type { SupportedDestinationType } from '../config/integration-types';
import type { SettingsService } from '../settings/settings.service';
import type { SetupEvaluationService } from '../setup/setup-evaluation.service';
import type { VibeKanbanMcpService } from '../vibe-kanban/vibe-kanban-mcp.service';
import { isVibeKanbanMcpConfigured } from '../vibe-kanban/transport/mcp-transport-config';
import {
  normalizeVkWorkspaceExecutor,
  VK_WORKSPACE_EXECUTOR_OPTIONS,
} from '../config/vk-executors';
import type { UiNavEntry } from '../ports/ui-nav.types';
import { SETTING_LABELS } from './setting-labels';
import { uiNavLocals } from './ui-presenter';

export const VK_PAGE_ORG_ERROR_NO_MCP =
  'Vibe Kanban MCP is not available (this UI requires VIBE_SQUIRE_DESTINATION_TYPE=vibe_kanban).';

/**
 * Template locals for `/ui/vibe-kanban` (board picker, executor, labels).
 * Async only for MCP list calls and setup evaluation.
 */
export async function buildVibeKanbanPageLocals(deps: {
  settings: SettingsService;
  destinationType: SupportedDestinationType;
  setupEvaluation: Pick<SetupEvaluationService, 'evaluate'>;
  vk: Pick<VibeKanbanMcpService, 'listOrganizations' | 'listProjects'>;
  uiNavEntries: UiNavEntry[];
  saved?: string;
  err?: string;
}): Promise<Record<string, unknown>> {
  const {
    settings,
    destinationType,
    setupEvaluation,
    vk,
    uiNavEntries,
    saved,
    err,
  } = deps;
  const values = settings.listEffectiveNonSecret();
  await setupEvaluation.evaluate();
  const mcpBoardPicker = isVibeKanbanMcpConfigured(destinationType);
  const orgError = !mcpBoardPicker ? VK_PAGE_ORG_ERROR_NO_MCP : null;
  const boardOrg = settings.getEffective('default_organization_id');
  const boardProj = settings.getEffective('default_project_id');

  let vkBoardOrganizations: { id: string; name?: string }[] = [];
  let vkBoardProjects: { id: string; name?: string }[] = [];
  let vkBoardListError: string | null = null;

  if (mcpBoardPicker) {
    try {
      vkBoardOrganizations = await vk.listOrganizations();
    } catch (e) {
      vkBoardListError = e instanceof Error ? e.message : String(e);
    }
    if (vkBoardListError === null) {
      const oid = boardOrg.trim();
      if (oid.length > 0 && vkBoardOrganizations.some((o) => o.id === oid)) {
        try {
          vkBoardProjects = await vk.listProjects(oid);
        } catch (e) {
          vkBoardListError = e instanceof Error ? e.message : String(e);
        }
      }
    }
  }

  const hasVkProjectPick =
    mcpBoardPicker &&
    boardOrg.trim().length > 0 &&
    vkBoardOrganizations.some((o) => o.id === boardOrg.trim());
  const vkBoardProjectsEmpty = hasVkProjectPick && vkBoardProjects.length === 0;

  const vkExecutorRaw = settings.getEffective('vk_workspace_executor').trim();
  const normalizedEx = normalizeVkWorkspaceExecutor(vkExecutorRaw);
  const vkExecutor =
    normalizedEx ?? VK_WORKSPACE_EXECUTOR_OPTIONS[0]?.value ?? 'cursor_agent';

  return {
    ...uiNavLocals(uiNavEntries),
    saved: saved === '1',
    error: err ? decodeURIComponent(err) : null,
    mcpBoardPicker,
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
    vkBoardOrganizations,
    vkBoardProjects,
    vkBoardListError,
    hasVkProjectPick,
    vkBoardProjectsEmpty,
  };
}
