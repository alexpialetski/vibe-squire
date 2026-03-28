import { mcpResultTextParts } from './mcp-tool-result-text';
import type {
  VkIssueRef,
  VkOrgRef,
  VkProjectRef,
  VkRepoRef,
} from '../vk-entities';

export function parseToolJson(result: unknown): unknown {
  const r = result as {
    structuredContent?: unknown;
    toolResult?: unknown;
  };
  const sc = r.structuredContent ?? r.toolResult;
  if (sc != null && typeof sc === 'object') {
    return sc;
  }
  for (const text of mcpResultTextParts(result)) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // try next text block
    }
  }
  return null;
}

/** First array found on common MCP list payload keys, or the value if it is already an array. */
export function extractArrayFromMcpPayload(parsed: unknown): unknown[] {
  if (parsed == null) {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (typeof parsed !== 'object') {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  for (const key of [
    'issues',
    'organizations',
    'projects',
    'repos',
    'repositories',
    'data',
    'items',
    'results',
  ] as const) {
    const v = o[key];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

export function unwrapListOrGetIssueRow(parsed: unknown): unknown {
  if (parsed != null && typeof parsed === 'object') {
    const inner = (parsed as { issue?: unknown }).issue;
    if (inner != null && typeof inner === 'object') {
      return inner;
    }
  }
  return parsed;
}

export function normalizeIssue(raw: unknown): VkIssueRef | null {
  const row = unwrapListOrGetIssueRow(raw);
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.issue_id === 'string' && o.issue_id) ||
    (typeof o.issueId === 'string' && o.issueId);
  if (!id) {
    return null;
  }
  const status =
    typeof o.status === 'string'
      ? o.status
      : typeof o.state === 'string'
        ? o.state
        : undefined;
  const title = typeof o.title === 'string' ? o.title : undefined;
  const description =
    typeof o.description === 'string' ? o.description : undefined;
  return { id, status, title, ...(description != null ? { description } : {}) };
}

export function normalizeOrg(raw: unknown): VkOrgRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.organization_id === 'string' && o.organization_id);
  if (!id) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : undefined;
  const slug = typeof o.slug === 'string' ? o.slug : undefined;
  return { id, name, slug };
}

export function normalizeProject(raw: unknown): VkProjectRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.project_id === 'string' && o.project_id);
  if (!id) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : undefined;
  const organizationId =
    typeof o.organization_id === 'string'
      ? o.organization_id
      : typeof o.organizationId === 'string'
        ? o.organizationId
        : undefined;
  return { id, name, organizationId };
}

export function normalizeRepo(raw: unknown): VkRepoRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === 'string' && o.id) ||
    (typeof o.repo_id === 'string' && o.repo_id);
  if (!id) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : undefined;
  return { id, name };
}

export function pickWorkspaceId(parsed: unknown): string | null {
  if (parsed == null) {
    return null;
  }
  if (typeof parsed === 'string' && parsed.trim()) {
    return parsed.trim();
  }
  if (typeof parsed !== 'object') {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  for (const key of ['workspace_id', 'workspaceId', 'id'] as const) {
    const v = o[key];
    if (typeof v === 'string' && v) {
      return v;
    }
  }
  return null;
}

export function pickCreatedIssueId(parsed: unknown): string | null {
  if (parsed == null) {
    return null;
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  if (typeof parsed !== 'object') {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  for (const key of ['issue_id', 'issueId', 'id'] as const) {
    const v = o[key];
    if (typeof v === 'string' && v) {
      return v;
    }
  }
  return null;
}
