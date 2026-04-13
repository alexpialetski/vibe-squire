import { z } from 'zod';

export const settingsFieldRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
});

export const settingsMetaResponseSchema = z.object({
  coreFields: z.array(settingsFieldRowSchema),
  resolvedSourceLabel: z.string(),
  resolvedDestinationLabel: z.string(),
  scheduledSyncEnabled: z.boolean(),
  autoCreateIssues: z.boolean(),
});

export type SettingsMetaResponse = z.output<typeof settingsMetaResponseSchema>;
