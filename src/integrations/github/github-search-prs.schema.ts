import { z } from 'zod';

/** `gh search prs --json repository` — object with owner/repo identity. */
const repositorySchema = z.looseObject({
  nameWithOwner: z.string().min(1),
  name: z.string().min(1),
});

const authorSchema = z.looseObject({
  login: z.string().min(1),
});

export const ghSearchPrsRowSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  url: z.string().min(1),
  /** ISO 8601 from `gh search prs` (sort oldest-first in scout). */
  createdAt: z.string().min(1),
  repository: repositorySchema,
  author: authorSchema,
});

export const ghSearchPrsResponseSchema = z.array(ghSearchPrsRowSchema);

export type GhSearchPrsRow = z.infer<typeof ghSearchPrsRowSchema>;
