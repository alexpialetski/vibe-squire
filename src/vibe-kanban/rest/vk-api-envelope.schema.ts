import { z } from 'zod';

/** Vibe Kanban local HTTP `ApiResponseEnvelope` — most VK JSON responses. */
export const vkApiEnvelopeSchema = z.looseObject({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
});

export type VkApiEnvelope = z.infer<typeof vkApiEnvelopeSchema>;
