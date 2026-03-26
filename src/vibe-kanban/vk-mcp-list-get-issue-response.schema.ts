import { z } from 'zod';

/**
 * Documented shapes for **parsed** Vibe Kanban MCP tool results (`list_issues`, `get_issue`).
 *
 * VK may add fields — sub-objects use {@link z.looseObject} so extras do not fail parse.
 * Tool names and parameters: `vibe-kanban-mcp-server.md`.
 *
 * **Contract:** vibe-squire only treats Kanban rows as its own when the title contains
 * {@link VIBE_SQUIRE_TITLE_MARKER} (see `list_issues` `search` / linking in `RunPollCycleService`).
 * Canonical PR URL is in the HTML comment in the body (`<!-- vibe-squire:pr:<url> -->`,
 * {@link buildVibeSquirePrDescriptionMarker}).
 */

/** Visible title token for filtering via `list_issues` `search` (leading segment recommended). */
export const VIBE_SQUIRE_TITLE_MARKER = '[vibe-squire]';

/** Opening segment of the hidden PR marker line in issue description. */
export const VIBE_SQUIRE_PR_COMMENT_PREFIX = '<!-- vibe-squire:pr:';

/** `<!-- vibe-squire:pr:${url} -->` — same contract as `RunPollCycleService` issue bodies. */
export function buildVibeSquirePrDescriptionMarker(prUrl: string): string {
  return `${VIBE_SQUIRE_PR_COMMENT_PREFIX}${prUrl} -->`;
}

/** One row inside `list_issues` `issues[]` (observed VK ~2026-03). */
export const vkMcpListIssuesRowSchema = z.looseObject({
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

/** Top-level parsed JSON from MCP `list_issues`. */
export const vkMcpListIssuesResponseSchema = z.looseObject({
  issues: z.array(vkMcpListIssuesRowSchema),
  total_count: z.number(),
  returned_count: z.number(),
  limit: z.number(),
  offset: z.number(),
  project_id: z.string().optional(),
});

/** `get_issue` → `issue` object (observed VK ~2026-03). */
export const vkMcpGetIssueDetailSchema = z.looseObject({
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

/** Top-level parsed JSON from MCP `get_issue` (payload wraps `issue`). */
export const vkMcpGetIssueResponseSchema = z.looseObject({
  issue: vkMcpGetIssueDetailSchema,
});

export type VkMcpListIssuesRow = z.infer<typeof vkMcpListIssuesRowSchema>;
export type VkMcpListIssuesResponse = z.infer<typeof vkMcpListIssuesResponseSchema>;
export type VkMcpGetIssueDetail = z.infer<typeof vkMcpGetIssueDetailSchema>;
export type VkMcpGetIssueResponse = z.infer<typeof vkMcpGetIssueResponseSchema>;

export function safeParseVkMcpListIssuesResponse(
  parsed: unknown,
): VkMcpListIssuesResponse | null {
  const r = vkMcpListIssuesResponseSchema.safeParse(parsed);
  return r.success ? r.data : null;
}

export function safeParseVkMcpGetIssueResponse(
  parsed: unknown,
): VkMcpGetIssueResponse | null {
  const r = vkMcpGetIssueResponseSchema.safeParse(parsed);
  return r.success ? r.data : null;
}
