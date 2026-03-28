import { Module, type Provider } from '@nestjs/common';
import { SetupModule } from '../../setup/setup.module';
import {
  GITHUB_PR_SCOUT_PORT,
  SOURCE_STATUS_PORT,
  SYNC_PR_SCOUT_PORT,
  UI_NAV_ENTRIES,
} from '../../ports/injection-tokens';
import type { UiNavEntry } from '../../ports/ui-nav.types';
import { SOURCE_SETTINGS_GROUP } from '../../settings/settings-group.tokens';
import { GhCliService } from './gh-cli.service';
import { GithubPrScoutService } from '../../scout/github-pr-scout.service';
import { GithubSourceStatusService } from './github-source-status.service';
import { GithubSettings } from './github-settings.service';
import { GithubSettingsGroup } from './github-settings-group.service';
import { GithubUiController } from './github-ui.controller';

const GITHUB_NAV: UiNavEntry = {
  id: 'github',
  label: 'GitHub',
  href: '/ui/github',
};

@Module({
  imports: [SetupModule],
  controllers: [GithubUiController],
  providers: [
    GithubSettingsGroup,
    {
      provide: SOURCE_SETTINGS_GROUP,
      useExisting: GithubSettingsGroup,
    },
    GhCliService,
    GithubPrScoutService,
    GithubSourceStatusService,
    GithubSettings,
    {
      provide: UI_NAV_ENTRIES,
      useValue: GITHUB_NAV,
      multi: true,
    } as Provider,
    {
      provide: GITHUB_PR_SCOUT_PORT,
      useExisting: GithubPrScoutService,
    },
    {
      provide: SYNC_PR_SCOUT_PORT,
      useExisting: GithubPrScoutService,
    },
    {
      provide: SOURCE_STATUS_PORT,
      useExisting: GithubSourceStatusService,
    },
  ],
  exports: [
    GithubSettingsGroup,
    SOURCE_SETTINGS_GROUP,
    GhCliService,
    GithubPrScoutService,
    GithubSourceStatusService,
    GithubSettings,
    GITHUB_PR_SCOUT_PORT,
    SYNC_PR_SCOUT_PORT,
    SOURCE_STATUS_PORT,
    UI_NAV_ENTRIES,
  ],
})
export class GithubSourceModule {}
