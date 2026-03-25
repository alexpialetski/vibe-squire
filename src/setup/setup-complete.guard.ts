import {
  CanActivate,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SetupEvaluationService } from './setup-evaluation.service';

@Injectable()
export class SetupCompleteGuard implements CanActivate {
  constructor(private readonly setup: SetupEvaluationService) {}

  async canActivate(): Promise<boolean> {
    const ev = await this.setup.evaluate();
    if (ev.complete) {
      return true;
    }
    throw new HttpException(
      {
        error: 'setup_incomplete',
        reason: ev.reason ?? 'unknown',
      },
      HttpStatus.CONFLICT,
    );
  }
}
