import { z } from 'zod';
import { settingsFieldRowSchema } from './settings-meta';

export const githubFieldsResponseSchema = z.object({
  disabled: z.boolean(),
  fields: z.array(settingsFieldRowSchema),
});

export type GithubFieldsResponse = z.output<typeof githubFieldsResponseSchema>;
