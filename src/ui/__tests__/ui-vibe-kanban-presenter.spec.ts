import {
  buildVibeKanbanPageLocals,
  VK_PAGE_ORG_ERROR_NO_MCP,
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
    destinationMcpConfigured: true,
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
    const vk = {
      listOrganizations: jest.fn(),
      listProjects: jest.fn(),
    };

    const locals = await buildVibeKanbanPageLocals({
      settings,
      destinationType: 'not_vk' as SupportedDestinationType,
      setupEvaluation,
      vk,
      uiNavEntries: [],
    });

    expect(locals.orgError).toBe(VK_PAGE_ORG_ERROR_NO_MCP);
    expect(locals.mcpBoardPicker).toBe(false);
    expect(vk.listOrganizations).not.toHaveBeenCalled();
  });

  it('loads organizations and projects when MCP is configured', async () => {
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
    const vk = {
      listOrganizations: jest
        .fn()
        .mockResolvedValue([{ id: 'org-1', name: 'O' }]),
      listProjects: jest.fn().mockResolvedValue([{ id: 'p1', name: 'P' }]),
    };

    const locals = await buildVibeKanbanPageLocals({
      settings,
      destinationType: 'vibe_kanban',
      setupEvaluation,
      vk,
      uiNavEntries: [],
    });

    expect(locals.orgError).toBeNull();
    expect(locals.mcpBoardPicker).toBe(true);
    expect(vk.listOrganizations).toHaveBeenCalled();
    expect(vk.listProjects).toHaveBeenCalledWith('org-1');
    expect(locals.vkBoardOrganizations).toEqual([{ id: 'org-1', name: 'O' }]);
    expect(locals.vkBoardProjects).toEqual([{ id: 'p1', name: 'P' }]);
    expect(locals.hasVkProjectPick).toBe(true);
    expect(locals.kanbanDoneStatus).toBe('Done');
  });

  it('captures listOrganizations failure in vkBoardListError', async () => {
    const settings = {
      listEffectiveNonSecret: () => ({}),
      getEffective: (key: string) => {
        if (key === 'default_organization_id') {
          return '';
        }
        if (key === 'default_project_id') {
          return '';
        }
        if (key === 'vk_workspace_executor') {
          return '';
        }
        return '';
      },
    } as unknown as SettingsService;
    const setupEvaluation = {
      evaluate: jest.fn().mockResolvedValue(baseEv()),
    } as Pick<SetupEvaluationService, 'evaluate'>;
    const vk = {
      listOrganizations: jest.fn().mockRejectedValue(new Error('rpc down')),
      listProjects: jest.fn(),
    };

    const locals = await buildVibeKanbanPageLocals({
      settings,
      destinationType: 'vibe_kanban',
      setupEvaluation,
      vk,
      uiNavEntries: [],
    });

    expect(locals.vkBoardListError).toBe('rpc down');
    expect(vk.listProjects).not.toHaveBeenCalled();
  });
});
