jest.mock('../../settings/settings.service', () => ({
  SettingsService: class SettingsService {},
}));

import { BadRequestException } from '@nestjs/common';
import type { AppEnv } from '../../config/app-env.token';
import type { SettingsService } from '../../settings/settings.service';
import { VK_MCP_NOT_CONFIGURED_MESSAGE } from '../transport/mcp-transport-config';
import { VibeKanbanMcpConfiguredGuard } from '../vibe-kanban-mcp-configured.guard';

function vkEnv(): AppEnv {
  return { destinationType: 'vibe_kanban' } as AppEnv;
}

function otherDestEnv(): AppEnv {
  return { destinationType: 'github_projects' } as unknown as AppEnv;
}

function guardWith(
  getEffective: SettingsService['getEffective'],
  appEnv: AppEnv,
): VibeKanbanMcpConfiguredGuard {
  return new VibeKanbanMcpConfiguredGuard(
    { getEffective } as SettingsService,
    appEnv,
  );
}

describe('VibeKanbanMcpConfiguredGuard', () => {
  it('allows when VK destination and stdio JSON parses', () => {
    const g = guardWith(() => '["npx","vibe-kanban","--mcp"]', vkEnv());
    expect(g.canActivate()).toBe(true);
  });

  it('throws BadRequestException when stdio JSON invalid', () => {
    const g = guardWith(() => '[]', vkEnv());
    expect(() => g.canActivate()).toThrow(BadRequestException);
    try {
      g.canActivate();
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).message).toBe(
        VK_MCP_NOT_CONFIGURED_MESSAGE,
      );
    }
  });

  it('throws when destination is not vibe_kanban', () => {
    const g = guardWith(() => '["npx","vibe-kanban","--mcp"]', otherDestEnv());
    expect(() => g.canActivate()).toThrow(BadRequestException);
  });
});
