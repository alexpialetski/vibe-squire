import { z } from 'zod';

/**
 * Zod shapes for **parsed** Vibe Kanban list/get issue payloads (historical JSON shapes).
 *
 * VK may add fields — sub-objects use {@link z.looseObject} so extras do not fail parse.
 *
 * **Contract:** title/body markers are defined in `vk-contract.ts`.
 */

/** One row inside `issues[]` (observed VK ~2026-03). */
export const vkListIssuesRowSchema = z.looseObject({
  id: z.string().min(1),
  title: z.string(),
  simple_id: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().nullable().optional(),
  parent_issue_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  pull_request_count: z.number().optional(),
  latest_pr_url: z.string().nullable().optional(),
  latest_pr_status: z.string().nullable().optional(),
});

export const vkListIssuesResponseSchema = z.looseObject({
  issues: z.array(vkListIssuesRowSchema),
  total_count: z.number(),
  returned_count: z.number(),
  limit: z.number(),
  offset: z.number(),
  project_id: z.string().optional(),
});

export const vkGetIssueDetailSchema = z.looseObject({
  id: z.string().min(1),
  title: z.string(),
  simple_id: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  status_id: z.string().optional(),
  priority: z.string().nullable().optional(),
  parent_issue_id: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  target_date: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  pull_requests: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
  relationships: z.array(z.unknown()).optional(),
  sub_issues: z.array(z.unknown()).optional(),
});

export const vkGetIssueResponseSchema = z.looseObject({
  issue: vkGetIssueDetailSchema,
});

export type VkListIssuesRow = z.infer<typeof vkListIssuesRowSchema>;
export type VkListIssuesResponse = z.infer<typeof vkListIssuesResponseSchema>;
export type VkGetIssueDetail = z.infer<typeof vkGetIssueDetailSchema>;
export type VkGetIssueResponse = z.infer<typeof vkGetIssueResponseSchema>;

export function safeParseVkListIssuesResponse(
  parsed: unknown,
): VkListIssuesResponse | null {
  const r = vkListIssuesResponseSchema.safeParse(parsed);
  return r.success ? r.data : null;
}

export function safeParseVkGetIssueResponse(
  parsed: unknown,
): VkGetIssueResponse | null {
  const r = vkGetIssueResponseSchema.safeParse(parsed);
  return r.success ? r.data : null;
}
