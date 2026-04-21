import { z } from 'zod';

export const activityItemSchema = z.object({
  prUrl: z.string(),
  githubRepo: z.string(),
  prNumber: z.number(),
  prTitle: z.string(),
  authorLogin: z.string().nullish(),
  decision: z.string(),
  effectiveDecision: z.string(),
  decisionLabel: z.string(),
  detail: z.string().nullish(),
  kanbanIssueId: z.string().nullish(),
});

export const activityRunRowSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  startedAtLabel: z.string(),
  finishedAt: z.string().nullable(),
  trigger: z.string(),
  phase: z.string(),
  phaseLabel: z.string(),
  abortReason: z.string().nullable(),
  errorMessage: z.string().nullable(),
  candidatesCount: z.number().nullish(),
  issuesCreated: z.number().nullish(),
  skippedUnmapped: z.number().nullish(),
  skippedBot: z.number().nullish(),
  skippedBoardLimit: z.number().nullish(),
  skippedAlreadyTracked: z.number().nullish(),
  skippedLinkedExisting: z.number().nullish(),
  skippedTriage: z.number().nullish(),
  skippedDeclined: z.number().nullish(),
  itemCount: z.number(),
  items: z.array(activityItemSchema),
});

export const activityRunsResponseSchema = z.object({
  runs: z.array(activityRunRowSchema),
});

export type ActivityRunsResponse = z.output<typeof activityRunsResponseSchema>;
