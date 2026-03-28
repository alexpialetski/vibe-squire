import type { GithubPrCandidate } from '../../integrations/github/github-pr-scout.service';
import { VIBE_SQUIRE_TITLE_MARKER } from '../../vibe-kanban/vk-contract';
import { PLACEHOLDER_VK_REPO_ID } from '../sync-constants';

const MAX_WORKSPACE_NAME_LEN = 120;

export function isValidVkRepoId(id: string): boolean {
  const t = id.trim();
  return t.length > 0 && t !== PLACEHOLDER_VK_REPO_ID;
}

export function issueTitleForPr(pr: GithubPrCandidate): string {
  const t = pr.title.trim();
  const base = t.length > 0 ? `PR #${pr.number}: ${t}` : `PR #${pr.number}`;
  return `${VIBE_SQUIRE_TITLE_MARKER} ${base}`;
}

export function workspaceNameForPr(pr: GithubPrCandidate): string {
  const base = issueTitleForPr(pr);
  return base.length > MAX_WORKSPACE_NAME_LEN
    ? `${base.slice(0, MAX_WORKSPACE_NAME_LEN - 1)}…`
    : base;
}
