import { Module } from '@nestjs/common';
import { SetupEvaluationService } from './setup-evaluation.service';
import { SetupCompleteGuard } from './setup-complete.guard';

@Module({
  imports: [],
  providers: [SetupEvaluationService, SetupCompleteGuard],
  exports: [SetupEvaluationService, SetupCompleteGuard],
})
export class SetupModule {}
