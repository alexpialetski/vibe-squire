import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { SetupEvaluationService } from './setup-evaluation.service';
import { SetupCompleteGuard } from './setup-complete.guard';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [SetupEvaluationService, SetupCompleteGuard],
  exports: [SetupEvaluationService, SetupCompleteGuard],
})
export class SetupModule {}
