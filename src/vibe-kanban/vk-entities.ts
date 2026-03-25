export type VkIssueRef = {
  id: string;
  status?: string;
  title?: string;
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
