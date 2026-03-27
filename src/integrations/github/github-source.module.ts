import { Module, type Provider } from '@nestjs/common';
import { SetupModule } from '../../setup/setup.module';
import {
  GITHUB_PR_SCOUT_PORT,
  INTEGRATION_SETTINGS_PROVIDERS,
  SOURCE_STATUS_PORT,
  SYNC_PR_SCOUT_PORT,
  UI_NAV_ENTRIES,
} from '../../ports/injection-tokens';
import type { UiNavEntry } from '../../ports/ui-nav.types';
import { GhCliService } from '../../gh/gh-cli.service';
import { GithubPrScoutService } from '../../scout/github-pr-scout.service';
import { GithubSourceStatusService } from './github-source-status.service';
import { GithubIntegrationSettingsProvider } from './github-settings.provider';
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
    GhCliService,
    GithubPrScoutService,
    GithubSourceStatusService,
    GithubIntegrationSettingsProvider,
    {
      provide: INTEGRATION_SETTINGS_PROVIDERS,
      useExisting: GithubIntegrationSettingsProvider,
      multi: true,
    } as Provider,
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
    GhCliService,
    GithubPrScoutService,
    GithubSourceStatusService,
    GITHUB_PR_SCOUT_PORT,
    SYNC_PR_SCOUT_PORT,
    SOURCE_STATUS_PORT,
    UI_NAV_ENTRIES,
    INTEGRATION_SETTINGS_PROVIDERS,
  ],
})
export class GithubSourceModule {}
