import {
  BadRequestException,
  CanActivate,
  Inject,
  Injectable,
} from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import {
  isVibeKanbanBoardDestination,
  VK_DESTINATION_NOT_ACTIVE_MESSAGE,
} from './vibe-kanban-destination';

/**
 * Ensures vibe-kanban context routes only run when {@link AppEnv.destinationType} is Vibe Kanban.
 */
@Injectable()
export class VibeKanbanDestinationConfiguredGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly appEnv: AppEnv) {}

  canActivate(): boolean {
    if (!isVibeKanbanBoardDestination(this.appEnv.destinationType)) {
      throw new BadRequestException(VK_DESTINATION_NOT_ACTIVE_MESSAGE);
    }
    return true;
  }
}
