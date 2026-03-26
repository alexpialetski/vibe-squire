import { Inject, Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { GITHUB_PR_SCOUT_PORT } from '../ports/injection-tokens';
import type { GithubPrScoutPort } from '../ports/github-scout.port';
import type { SyncPrScoutPort } from '../ports/sync-pr-scout.port';

/**
 * Delegates PR scout calls to the adapter for the current `source_type`.
 * v1: only `github` is wired; other values throw at call time.
 */
@Injectable()
export class SyncPrScoutFacade implements SyncPrScoutPort {
  constructor(
    private readonly settings: SettingsService,
    @Inject(GITHUB_PR_SCOUT_PORT)
    private readonly githubScout: GithubPrScoutPort,
  ) {}

  private adapter(): SyncPrScoutPort {
    const s = this.settings.getEffective('source_type').trim();
    if (s === 'github') {
      return this.githubScout;
    }
    throw new Error(
      `Sync source not supported: ${s.length > 0 ? JSON.stringify(s) : '(empty)'}`,
    );
  }

  listReviewRequestedForMe() {
    return this.adapter().listReviewRequestedForMe();
  }
}
