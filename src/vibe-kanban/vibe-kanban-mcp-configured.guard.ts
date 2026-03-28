import {
  BadRequestException,
  CanActivate,
  Inject,
  Injectable,
} from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { SettingsService } from '../settings/settings.service';
import {
  isVibeKanbanMcpConfigured,
  VK_MCP_NOT_CONFIGURED_MESSAGE,
} from './transport/mcp-transport-config';

/**
 * Ensures vibe-kanban context routes only run when destination is VK and stdio MCP JSON is valid.
 */
@Injectable()
export class VibeKanbanMcpConfiguredGuard implements CanActivate {
  constructor(
    private readonly settings: SettingsService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  canActivate(): boolean {
    if (
      !isVibeKanbanMcpConfigured(this.settings, this.appEnv.destinationType)
    ) {
      throw new BadRequestException(VK_MCP_NOT_CONFIGURED_MESSAGE);
    }
    return true;
  }
}
