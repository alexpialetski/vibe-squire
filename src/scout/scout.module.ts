import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { GITHUB_PR_SCOUT_PORT } from '../ports/injection-tokens';
import { GithubPrScoutService } from './github-pr-scout.service';

@Module({
  imports: [SettingsModule],
  providers: [
    GithubPrScoutService,
    {
      provide: GITHUB_PR_SCOUT_PORT,
      useExisting: GithubPrScoutService,
    },
  ],
  exports: [GithubPrScoutService, GITHUB_PR_SCOUT_PORT],
})
export class ScoutModule {}
