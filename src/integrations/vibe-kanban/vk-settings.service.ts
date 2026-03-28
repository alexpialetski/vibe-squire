import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import {
  VK_STORAGE_DEFAULTS,
  VK_STORAGE_KEYS,
  vkStorageSchema,
  type VkSettingsValues,
} from './vk-settings.schema';

/**
 * Typed accessor for Vibe Kanban destination-integration settings.
 * Provided by {@link VibeKanbanDestinationModule}.
 */
@Injectable()
export class VkSettings {
  constructor(private readonly settings: SettingsService) {}

  getAll(): VkSettingsValues {
    const raw = this.rawEffectiveRecord();
    const s = vkStorageSchema.safeParse(raw);
    return s.success ? s.data : VK_STORAGE_DEFAULTS;
  }

  get defaultProjectId(): string {
    return this.getAll().default_project_id;
  }

  get defaultOrganizationId(): string {
    return this.getAll().default_organization_id;
  }

  get vkMcpStdioJson(): string {
    return this.getAll().vk_mcp_stdio_json;
  }

  get vkWorkspaceExecutor(): string {
    return this.getAll().vk_workspace_executor;
  }

  get kanbanDoneStatus(): string {
    return this.getAll().kanban_done_status;
  }

  private rawEffectiveRecord(): Record<string, string> {
    const raw: Record<string, string> = {};
    for (const key of VK_STORAGE_KEYS) {
      raw[key] = this.settings.getEffective(key);
    }
    return raw;
  }
}
