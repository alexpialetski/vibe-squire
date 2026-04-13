import { z } from 'zod';

export const uiNavEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
});

export const uiNavResponseSchema = z.object({
  entries: z.array(uiNavEntrySchema),
});

export type UiNavResponse = z.output<typeof uiNavResponseSchema>;
