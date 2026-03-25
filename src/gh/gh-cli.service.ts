import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { SettingsService } from '../settings/settings.service';

export type GhHealthState =
  | 'ok'
  | 'not_installed'
  | 'not_authenticated'
  | 'error';

@Injectable()
export class GhCliService {
  constructor(private readonly settings: SettingsService) {}

  /**
   * Non-interactive check: `gh` on PATH and `gh auth status` succeeds.
   */
  checkAuth(): { state: GhHealthState; message?: string } {
    const version = spawnSync('gh', ['--version'], {
      encoding: 'utf-8',
    });
    if (version.error || version.status !== 0) {
      return {
        state: 'not_installed',
        message: version.error?.message ?? 'gh not found on PATH',
      };
    }

    const ghHost = this.settings.getEffective('gh_host');
    const env = { ...process.env } as NodeJS.ProcessEnv;
    if (ghHost) {
      env.GH_HOST = ghHost;
    }

    const auth = spawnSync('gh', ['auth', 'status'], {
      encoding: 'utf-8',
      env,
    });

    if (auth.status === 0) {
      return { state: 'ok' };
    }

    const hint = [auth.stderr, auth.stdout].filter(Boolean).join('\n').trim();
    return {
      state: 'not_authenticated',
      message: hint || 'gh auth status failed',
    };
  }
}
