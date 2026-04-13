import { BadRequestException } from '@nestjs/common';
import type { AppEnv } from '../../config/app-env.token';
import { VK_DESTINATION_NOT_ACTIVE_MESSAGE } from '../vibe-kanban-destination';
import { VibeKanbanDestinationConfiguredGuard } from '../vibe-kanban-destination-configured.guard';

function vkEnv(): AppEnv {
  return { destinationType: 'vibe_kanban' } as AppEnv;
}

function otherDestEnv(): AppEnv {
  return { destinationType: 'github_projects' } as unknown as AppEnv;
}

function guardFor(appEnv: AppEnv): VibeKanbanDestinationConfiguredGuard {
  return new VibeKanbanDestinationConfiguredGuard(appEnv);
}

describe('VibeKanbanDestinationConfiguredGuard', () => {
  it('allows when VIBE_SQUIRE_DESTINATION_TYPE resolves to vibe_kanban', () => {
    expect(guardFor(vkEnv()).canActivate()).toBe(true);
  });

  it('throws BadRequestException when destination is not vibe_kanban', () => {
    const g = guardFor(otherDestEnv());
    expect(() => g.canActivate()).toThrow(BadRequestException);
    try {
      g.canActivate();
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ message: VK_DESTINATION_NOT_ACTIVE_MESSAGE }),
      );
    }
  });
});
