import {
  CanActivate,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { GhCliService } from '../gh/gh-cli.service';
import { SyncRunStateService } from './sync-run-state.service';

/**
 * Blocks manual sync when GitHub CLI auth is not usable or Vibe Kanban has
 * been marked in error. Does not block on `unknown` / `degraded` VK health
 * (e.g. before the first poll).
 */
@Injectable()
export class SyncDependenciesGuard implements CanActivate {
  constructor(
    private readonly gh: GhCliService,
    private readonly syncRunState: SyncRunStateService,
  ) {}

  canActivate(): boolean {
    const gh = this.gh.checkAuth();
    if (gh.state !== 'ok') {
      throw new HttpException(
        {
          error: 'dependency_unavailable',
          subsystem: 'github',
          state: gh.state,
          ...(gh.message ? { message: gh.message } : {}),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const vk = this.syncRunState.getVibeKanbanHealth();
    if (vk.state === 'error') {
      throw new HttpException(
        {
          error: 'dependency_unavailable',
          subsystem: 'vibe_kanban',
          state: vk.state,
          ...(vk.message ? { message: vk.message } : {}),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return true;
  }
}
