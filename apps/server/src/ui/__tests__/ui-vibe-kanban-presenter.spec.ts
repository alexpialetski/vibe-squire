import {
  buildVibeKanbanPageLocals,
  VK_PAGE_ORG_ERROR_WRONG_DESTINATION,
} from '../ui-vibe-kanban-presenter';
import type { SettingsService } from '../../settings/settings.service';
import type {
  SetupEvaluation,
  SetupEvaluationService,
} from '../../setup/setup-evaluation.service';
import type { SupportedDestinationType } from '../../config/integration-types';

function baseEv(): SetupEvaluation {
  return {
    complete: true,
    mappingCount: 1,
    sourceType: 'github',
    destinationType: 'vibe_kanban',
    vibeKanbanBoardActive: true,
    hasRouting: true,
  };
}

describe('buildVibeKanbanPageLocals', () => {
  it('sets orgError when destination is not Vibe Kanban', async () => {
    const settings = {
      listEffectiveNonSecret: () => ({ kanban_done_status: '' }),
      getEffective: (key: string) => {
        if (key === 'default_organization_id') {
          return '';
        }
        if (key === 'default_project_id') {
          return '';
        }
        if (key === 'vk_workspace_executor') {
          return 'cursor_agent';
        }
        return '';
      },
    } as unknown as SettingsService;
    const setupEvaluation = {
      evaluate: jest.fn().mockResolvedValue(baseEv()),
    } as Pick<SetupEvaluationService, 'evaluate'>;

    const locals = await buildVibeKanbanPageLocals({
      settings,
      destinationType: 'not_vk' as SupportedDestinationType,
      setupEvaluation,
      uiNavEntries: [],
    });

    expect(locals.orgError).toBe(VK_PAGE_ORG_ERROR_WRONG_DESTINATION);
    expect(locals.vkBoardPicker).toBe(false);
  });

  it('exposes saved board ids and kanban status when Vibe Kanban is the destination', async () => {
    const settings = {
      listEffectiveNonSecret: () => ({ kanban_done_status: 'Done' }),
      getEffective: (key: string) => {
        if (key === 'default_organization_id') {
          return 'org-1';
        }
        if (key === 'default_project_id') {
          return 'proj-1';
        }
        if (key === 'vk_workspace_executor') {
          return 'cursor_agent';
        }
        return '';
      },
    } as unknown as SettingsService;
    const setupEvaluation = {
      evaluate: jest.fn().mockResolvedValue(baseEv()),
    } as Pick<SetupEvaluationService, 'evaluate'>;

    const locals = await buildVibeKanbanPageLocals({
      settings,
      destinationType: 'vibe_kanban',
      setupEvaluation,
      uiNavEntries: [],
    });

    expect(locals.orgError).toBeNull();
    expect(locals.vkBoardPicker).toBe(true);
    expect(locals.boardOrg).toBe('org-1');
    expect(locals.boardProj).toBe('proj-1');
    expect(locals.kanbanDoneStatus).toBe('Done');
  });
});
