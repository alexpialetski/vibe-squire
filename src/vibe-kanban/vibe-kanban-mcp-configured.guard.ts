import {
  BadRequestException,
  CanActivate,
  Inject,
  Injectable,
} from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import {
  isVibeKanbanMcpConfigured,
  VK_MCP_NOT_CONFIGURED_MESSAGE,
} from './transport/mcp-transport-config';

/**
 * Ensures vibe-kanban context routes only run when {@link AppEnv.destinationType} is Vibe Kanban.
 */
@Injectable()
export class VibeKanbanMcpConfiguredGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly appEnv: AppEnv) {}

  canActivate(): boolean {
    if (!isVibeKanbanMcpConfigured(this.appEnv.destinationType)) {
      throw new BadRequestException(VK_MCP_NOT_CONFIGURED_MESSAGE);
    }
    return true;
  }
}
