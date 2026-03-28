import { BadRequestException } from '@nestjs/common';
import type { AppEnv } from '../../config/app-env.token';
import { VK_MCP_NOT_CONFIGURED_MESSAGE } from '../transport/mcp-transport-config';
import { VibeKanbanMcpConfiguredGuard } from '../vibe-kanban-mcp-configured.guard';

function vkEnv(): AppEnv {
  return { destinationType: 'vibe_kanban' } as AppEnv;
}

function otherDestEnv(): AppEnv {
  return { destinationType: 'github_projects' } as unknown as AppEnv;
}

function guardFor(appEnv: AppEnv): VibeKanbanMcpConfiguredGuard {
  return new VibeKanbanMcpConfiguredGuard(appEnv);
}

describe('VibeKanbanMcpConfiguredGuard', () => {
  it('allows when DESTINATION_TYPE is vibe_kanban', () => {
    expect(guardFor(vkEnv()).canActivate()).toBe(true);
  });

  it('throws BadRequestException when destination is not vibe_kanban', () => {
    const g = guardFor(otherDestEnv());
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
});
