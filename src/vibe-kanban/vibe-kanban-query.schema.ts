import { z } from 'zod';

/** GET /api/vibe-kanban/projects */
export const listProjectsQuerySchema = z.object({
  organization_id: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z.string().trim().min(1, 'organization_id query parameter is required'),
  ),
});
