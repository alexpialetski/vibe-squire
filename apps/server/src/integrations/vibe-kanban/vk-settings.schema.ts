import { z } from 'zod';
import {
  normalizeVkWorkspaceExecutor,
  VK_WORKSPACE_EXECUTOR_OPTIONS,
} from './vk-workspace-executors';

const EXECUTOR_VALUES = [
  ...VK_WORKSPACE_EXECUTOR_OPTIONS.map((o) => o.value),
] as [string, ...string[]];

const vkWorkspaceExecutorField = z
  .string()
  .default('cursor_agent')
  .superRefine((val, ctx) => {
    if (!normalizeVkWorkspaceExecutor(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid workspace executor',
      });
    }
  })
  .transform((s) => normalizeVkWorkspaceExecutor(s)!);

export const vkStorageSchema = z
  .object({
    default_organization_id: z.string().default(''),
    default_project_id: z.string().default(''),
    vk_workspace_executor: vkWorkspaceExecutorField.pipe(
      z.enum(EXECUTOR_VALUES),
    ),
    kanban_done_status: z.string().default('Done'),
  })
  .strict();

export type VkSettingsValues = z.output<typeof vkStorageSchema>;

export const VK_STORAGE_DEFAULTS: VkSettingsValues = vkStorageSchema.parse({});

/** No destination env overrides for VK storage keys. */
export const VK_SETTING_ENV = {} as const satisfies Partial<
  Record<keyof VkSettingsValues, string>
>;

export const VK_STORAGE_KEYS = Object.keys(
  vkStorageSchema.shape,
) as (keyof VkSettingsValues)[];

export type VkSettingKey = keyof VkSettingsValues;

/** Keys edited together on `/ui/vibe-kanban` (not the general Settings form). */
export const VIBE_KANBAN_UI_KEYS = [
  'default_organization_id',
  'default_project_id',
  'vk_workspace_executor',
  'kanban_done_status',
] as const satisfies readonly VkSettingKey[];

export type VibeKanbanUiSettingKey = (typeof VIBE_KANBAN_UI_KEYS)[number];
