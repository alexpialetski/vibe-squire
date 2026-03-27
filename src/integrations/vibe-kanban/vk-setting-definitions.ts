import type { SettingDefinition } from '../../settings/setting-definition';

export const VK_SETTING_KEYS = [
  'vk_mcp_stdio_json',
  'default_organization_id',
  'default_project_id',
  'vk_workspace_executor',
  'kanban_done_status',
] as const;

export type VkSettingKey = (typeof VK_SETTING_KEYS)[number];

export const VK_SETTING_DEFINITIONS = {
  vk_mcp_stdio_json: {
    envVar: 'VK_MCP_STDIO_JSON' as const,
    defaultValue: '["npx","-y","vibe-kanban@latest","--mcp"]',
  },
  default_organization_id: {
    defaultValue: '',
  },
  default_project_id: { defaultValue: '' },
  vk_workspace_executor: {
    defaultValue: 'cursor_agent',
  },
  kanban_done_status: {
    defaultValue: 'Done',
  },
} satisfies Record<VkSettingKey, SettingDefinition>;

/** Keys edited together on `/ui/vibe-kanban` (not the general Settings form). */
export const VIBE_KANBAN_UI_KEYS = [
  'default_organization_id',
  'default_project_id',
  'vk_workspace_executor',
  'kanban_done_status',
] as const;

export type VibeKanbanUiSettingKey = (typeof VIBE_KANBAN_UI_KEYS)[number];
