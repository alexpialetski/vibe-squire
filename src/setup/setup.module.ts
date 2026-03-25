import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { SetupEvaluationService } from './setup-evaluation.service';
import { SetupCompleteGuard } from './setup-complete.guard';
import { UiSetupRedirectMiddleware } from './ui-setup-redirect.middleware';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [
    SetupEvaluationService,
    SetupCompleteGuard,
    UiSetupRedirectMiddleware,
  ],
  exports: [
    SetupEvaluationService,
    SetupCompleteGuard,
    UiSetupRedirectMiddleware,
  ],
})
export class SetupModule {}
