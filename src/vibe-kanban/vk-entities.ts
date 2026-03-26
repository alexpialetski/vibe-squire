export type VkIssueRef = {
  id: string;
  status?: string;
  title?: string;
  /** Present when returned from `get_issue` (for reconcile / duplicate pick). */
  description?: string;
};

export type VkOrgRef = {
  id: string;
  name?: string;
  slug?: string;
};

export type VkProjectRef = {
  id: string;
  name?: string;
  organizationId?: string;
};

export type VkRepoRef = {
  id: string;
  name?: string;
};
