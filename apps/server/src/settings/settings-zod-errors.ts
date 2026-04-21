import { z } from 'zod';

export function formatZodIssuesForBadRequest(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('; ');
}
