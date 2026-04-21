import { z } from 'zod';

export const settingsFieldRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  envVar: z.string().optional(),
  description: z.string().optional(),
});

export const settingsMetaResponseSchema = z.object({
  coreFields: z.array(settingsFieldRowSchema),
  resolvedSourceLabel: z.string(),
  resolvedDestinationLabel: z.string(),
  scheduledSyncEnabled: z.boolean(),
  autoCreateIssues: z.boolean(),
});

export type SettingsMetaResponse = z.output<typeof settingsMetaResponseSchema>;
