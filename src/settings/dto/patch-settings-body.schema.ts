import { z } from 'zod';

export function formatZodIssuesForBadRequest(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join('; ');
}
