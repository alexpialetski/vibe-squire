import { z } from 'zod';

/** Vibe Kanban local HTTP `ApiResponseEnvelope` — most VK JSON responses. */
export const vkApiEnvelopeSchema = z.looseObject({
  success: z.boolean(),
  data: z.unknown().optional(),
  /** VK may send `null` on success paths, not only omit the field. */
  message: z.string().nullish(),
});

export type VkApiEnvelope = z.infer<typeof vkApiEnvelopeSchema>;
