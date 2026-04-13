import { z } from 'zod';

const executorOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

/**
 * Vibe Kanban settings form bootstrap (saved values, labels, executor enum).
 * Organization and project pickers use `GET /api/vibe-kanban/organizations` and
 * `GET /api/vibe-kanban/projects?organization_id=`.
 */
export const vibeKanbanUiStateSchema = z.object({
  saved: z.boolean(),
  error: z.string().nullable(),
  vkBoardPicker: z.boolean(),
  boardOrg: z.string(),
  boardProj: z.string(),
  kanbanDoneStatus: z.string(),
  vkExecutor: z.string(),
  executorOptions: z.array(executorOptionSchema),
  vkLabels: z.object({
    default_organization_id: z.string(),
    vk_workspace_executor: z.string(),
    kanban_done_status: z.string(),
  }),
  orgError: z.string().nullable(),
});

export type VibeKanbanUiState = z.output<typeof vibeKanbanUiStateSchema>;
