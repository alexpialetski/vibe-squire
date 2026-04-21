import { z } from 'zod';

/** Remote `Issue` row (`api_types::Issue`) — extras tolerated. */
export const vkRemoteIssueRowSchema = z.looseObject({
  id: z.coerce.string(),
  project_id: z.coerce.string(),
  simple_id: z.string(),
  status_id: z.coerce.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  parent_issue_id: z.coerce.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type VkRemoteIssueRow = z.infer<typeof vkRemoteIssueRowSchema>;

export const vkProjectStatusRowSchema = z.looseObject({
  id: z.coerce.string(),
  project_id: z.coerce.string(),
  name: z.string(),
  color: z.string().optional(),
  sort_order: z.number(),
  hidden: z.boolean(),
});

export type VkProjectStatusRow = z.infer<typeof vkProjectStatusRowSchema>;

export const vkListProjectStatusesDataSchema = z.looseObject({
  project_statuses: z.array(vkProjectStatusRowSchema),
});

export const vkListIssuesSearchDataSchema = z.looseObject({
  issues: z.array(vkRemoteIssueRowSchema),
  total_count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const vkMutationIssueDataSchema = z.looseObject({
  data: vkRemoteIssueRowSchema,
  txid: z.number(),
});

export const vkListOrganizationsDataSchema = z.looseObject({
  organizations: z.array(
    z.looseObject({
      id: z.coerce.string(),
      name: z.string(),
      slug: z.string(),
      is_personal: z.boolean().optional(),
    }),
  ),
});

export const vkListProjectsDataSchema = z.looseObject({
  projects: z.array(
    z.looseObject({
      id: z.coerce.string(),
      organization_id: z.coerce.string(),
      name: z.string(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    }),
  ),
});

export const vkRepoRowSchema = z.looseObject({
  id: z.coerce.string(),
  name: z.string(),
});

export const vkStartWorkspaceDataSchema = z.looseObject({
  workspace: z.looseObject({
    id: z.coerce.string(),
  }),
});
