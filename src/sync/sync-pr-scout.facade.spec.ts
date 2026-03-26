jest.mock('../settings/settings.service', () => ({
  SettingsService: class SettingsService {},
}));

import { SyncPrScoutFacade } from './sync-pr-scout.facade';
import type { SettingsService } from '../settings/settings.service';
import type { GithubPrScoutPort } from '../ports/github-scout.port';

describe('SyncPrScoutFacade', () => {
  it('delegates listReviewRequestedForMe to GitHub scout when source_type is github', () => {
    const listReviewRequestedForMe = jest.fn().mockReturnValue([]);
    const github = {
      listReviewRequestedForMe,
    } as unknown as GithubPrScoutPort;
    const settings = {
      getEffective: (key: string) => (key === 'source_type' ? 'github' : ''),
    } as Pick<SettingsService, 'getEffective'>;

    const facade = new SyncPrScoutFacade(settings as SettingsService, github);
    facade.listReviewRequestedForMe();

    expect(listReviewRequestedForMe).toHaveBeenCalledTimes(1);
  });

  it('throws when source_type is not supported', () => {
    const listReviewRequestedForMe = jest.fn();
    const github = {
      listReviewRequestedForMe,
    } as unknown as GithubPrScoutPort;
    const settings = {
      getEffective: (key: string) => (key === 'source_type' ? 'gitlab' : ''),
    } as Pick<SettingsService, 'getEffective'>;

    const facade = new SyncPrScoutFacade(settings as SettingsService, github);

    let caught: unknown;
    try {
      facade.listReviewRequestedForMe();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      'Sync source not supported: "gitlab"',
    );
    expect(listReviewRequestedForMe).not.toHaveBeenCalled();
  });
});
