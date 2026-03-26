jest.mock('../../settings/settings.service', () => ({
  SettingsService: class SettingsService {},
}));

import { SyncDestinationBoardFacade } from '../sync-destination-board.facade';
import type { AppEnv } from '../../config/env-schema';
import type { VibeKanbanBoardPort } from '../../ports/vibe-kanban-board.port';

function envWithDestination(
  destinationType: AppEnv['destinationType'],
): AppEnv {
  return { destinationType } as AppEnv;
}

describe('SyncDestinationBoardFacade', () => {
  it('delegates probe to Vibe Kanban adapter when destinationType is vibe_kanban', async () => {
    const probe = jest.fn().mockResolvedValue(undefined);
    const vk = { probe } as unknown as VibeKanbanBoardPort;

    const facade = new SyncDestinationBoardFacade(
      envWithDestination('vibe_kanban'),
      vk,
    );
    await facade.probe();

    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('throws when destinationType is not supported (future types)', async () => {
    const probe = jest.fn();
    const vk = { probe } as unknown as VibeKanbanBoardPort;

    const facade = new SyncDestinationBoardFacade(
      envWithDestination('linear' as AppEnv['destinationType']),
      vk,
    );

    let caught: unknown;
    try {
      await facade.probe();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      'Sync destination not supported: "linear"',
    );
    expect(probe).not.toHaveBeenCalled();
  });
});
