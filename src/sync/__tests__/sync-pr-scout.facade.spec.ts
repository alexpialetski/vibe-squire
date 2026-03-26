jest.mock('../../settings/settings.service', () => ({
  SettingsService: class SettingsService {},
}));

import { SyncPrScoutFacade } from '../sync-pr-scout.facade';
import type { AppEnv } from '../../config/env-schema';
import type { GithubPrScoutPort } from '../../ports/github-scout.port';

function envWithSource(sourceType: AppEnv['sourceType']): AppEnv {
  return { sourceType } as AppEnv;
}

describe('SyncPrScoutFacade', () => {
  it('delegates listReviewRequestedForMe to GitHub scout when sourceType is github', () => {
    const listReviewRequestedForMe = jest.fn().mockReturnValue([]);
    const github = {
      listReviewRequestedForMe,
    } as unknown as GithubPrScoutPort;
    const facade = new SyncPrScoutFacade(envWithSource('github'), github);
    facade.listReviewRequestedForMe();

    expect(listReviewRequestedForMe).toHaveBeenCalledTimes(1);
  });

  it('throws when sourceType is not supported (future types)', () => {
    const listReviewRequestedForMe = jest.fn();
    const github = {
      listReviewRequestedForMe,
    } as unknown as GithubPrScoutPort;

    const facade = new SyncPrScoutFacade(
      envWithSource('gitlab' as AppEnv['sourceType']),
      github,
    );

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
