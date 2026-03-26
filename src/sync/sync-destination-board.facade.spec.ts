jest.mock('../settings/settings.service', () => ({
  SettingsService: class SettingsService {},
}));

import { SyncDestinationBoardFacade } from './sync-destination-board.facade';
import type { SettingsService } from '../settings/settings.service';
import type { VibeKanbanBoardPort } from '../ports/vibe-kanban-board.port';

describe('SyncDestinationBoardFacade', () => {
  it('delegates probe to Vibe Kanban adapter when destination_type is vibe_kanban', async () => {
    const probe = jest.fn().mockResolvedValue(undefined);
    const vk = { probe } as unknown as VibeKanbanBoardPort;
    const settings = {
      getEffective: (key: string) =>
        key === 'destination_type' ? 'vibe_kanban' : '',
    } as Pick<SettingsService, 'getEffective'>;

    const facade = new SyncDestinationBoardFacade(
      settings as SettingsService,
      vk,
    );
    await facade.probe();

    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('throws when destination_type is not supported', async () => {
    const vk = { probe: jest.fn() } as unknown as VibeKanbanBoardPort;
    const settings = {
      getEffective: (key: string) =>
        key === 'destination_type' ? 'linear' : '',
    } as Pick<SettingsService, 'getEffective'>;

    const facade = new SyncDestinationBoardFacade(
      settings as SettingsService,
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
    expect(vk.probe).not.toHaveBeenCalled();
  });
});
