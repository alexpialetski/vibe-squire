import { z } from 'zod';

export const setupReasonSchema = z.enum([
  'no_default_kanban_board',
  'no_mappings',
]);

export const setupEvaluationSchema = z.object({
  complete: z.boolean(),
  reason: setupReasonSchema.nullish(),
  mappingCount: z.number(),
  sourceType: z.string(),
  destinationType: z.string(),
  vibeKanbanBoardActive: z.boolean(),
  hasRouting: z.boolean(),
});

export const setupChecklistRowSchema = z.object({
  text: z.string(),
  linkHref: z.string().optional(),
  linkLabel: z.string().optional(),
});

export const setupReasonMessagesSchema = z.record(z.string(), z.string());

export const setupApiResponseSchema = z.object({
  evaluation: setupEvaluationSchema,
  checklist: z.array(setupChecklistRowSchema),
  reasonMessages: setupReasonMessagesSchema,
});

export type SetupApiResponse = z.output<typeof setupApiResponseSchema>;
export type SetupEvaluationDto = z.output<typeof setupEvaluationSchema>;
