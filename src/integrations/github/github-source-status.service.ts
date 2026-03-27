import { Injectable } from '@nestjs/common';
import { GhCliService } from '../../gh/gh-cli.service';
import type {
  SourceReadinessResult,
  SourceStatusProvider,
} from '../../ports/source-status.port';

@Injectable()
export class GithubSourceStatusService implements SourceStatusProvider {
  readonly sourceType = 'github' as const;

  constructor(private readonly gh: GhCliService) {}

  checkReadiness(): SourceReadinessResult {
    const r = this.gh.checkAuth();
    if (r.state === 'ok') {
      return { state: 'ok' };
    }
    if (r.state === 'not_installed') {
      const message = r.message ?? 'gh not found on PATH';
      return {
        state: 'error',
        message,
        errors: [{ code: 'source_gh_not_installed', message }],
      };
    }
    if (r.state === 'not_authenticated') {
      const message = r.message ?? 'gh auth status failed';
      return {
        state: 'error',
        message,
        errors: [{ code: 'source_gh_not_authenticated', message }],
      };
    }
    const message = r.message ?? 'GitHub CLI error';
    return {
      state: 'error',
      message,
      errors: [{ code: 'source_gh_error', message }],
    };
  }
}
