import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { GITHUB_PR_SCOUT_PORT } from '../ports/injection-tokens';
import type { GithubPrScoutPort } from '../ports/github-scout.port';
import type { SyncPrScoutPort } from '../ports/sync-pr-scout.port';

/**
 * Delegates PR scout calls to the adapter for the process `AppEnv.sourceType` (`SOURCE_TYPE` at boot).
 * v1: only `github` is wired; other values throw at call time (unknown types cannot boot today).
 */
@Injectable()
export class SyncPrScoutFacade implements SyncPrScoutPort {
  constructor(
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
    @Inject(GITHUB_PR_SCOUT_PORT)
    private readonly githubScout: GithubPrScoutPort,
  ) {}

  private adapter(): SyncPrScoutPort {
    const s = this.appEnv.sourceType;
    if (s === 'github') {
      return this.githubScout;
    }
    const label = JSON.stringify(s as string);
    throw new Error(`Sync source not supported: ${label}`);
  }

  listReviewRequestedForMe() {
    return this.adapter().listReviewRequestedForMe();
  }
}
