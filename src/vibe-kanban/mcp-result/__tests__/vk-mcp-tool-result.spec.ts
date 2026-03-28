import { safeParseVkMcpListIssuesResponse } from '../vk-mcp-list-get-issue-response.schema';
import {
  extractArrayFromMcpPayload,
  normalizeIssue,
  normalizeOrg,
  normalizeProject,
  normalizeRepo,
  parseToolJson,
  pickCreatedIssueId,
  pickWorkspaceId,
} from '../vk-mcp-tool-result';

describe('parseToolJson', () => {
  it('returns structuredContent object when present', () => {
    const payload = { issues: [{ id: '1' }] };
    expect(parseToolJson({ structuredContent: payload })).toEqual(payload);
  });

  it('returns toolResult object when structuredContent absent', () => {
    const payload = { foo: 1 };
    expect(parseToolJson({ toolResult: payload })).toEqual(payload);
  });

  it('parses first valid JSON text block from content', () => {
    expect(
      parseToolJson({
        content: [{ type: 'text', text: '{"a":1}' }],
      }),
    ).toEqual({ a: 1 });
  });

  it('tries next text block when first is not JSON', () => {
    expect(
      parseToolJson({
        content: [
          { type: 'text', text: 'not json' },
          { type: 'text', text: '[1,2]' },
        ],
      }),
    ).toEqual([1, 2]);
  });

  it('returns null when no parseable content', () => {
    expect(parseToolJson({ content: [] })).toBeNull();
    expect(
      parseToolJson({ content: [{ type: 'text', text: 'x' }] }),
    ).toBeNull();
  });
});

describe('extractArrayFromMcpPayload', () => {
  it('returns empty for null or non-object', () => {
    expect(extractArrayFromMcpPayload(null)).toEqual([]);
    expect(extractArrayFromMcpPayload('x')).toEqual([]);
  });

  it('returns array as-is', () => {
    expect(extractArrayFromMcpPayload([1, 2])).toEqual([1, 2]);
  });

  it('finds first matching key in fixed key order (issues before organizations)', () => {
    expect(
      extractArrayFromMcpPayload({
        organizations: [{ id: 'o1' }],
        issues: [{ id: 'i1' }],
      }),
    ).toEqual([{ id: 'i1' }]);
    expect(
      extractArrayFromMcpPayload({
        organizations: [{ id: 'o1' }],
      }),
    ).toEqual([{ id: 'o1' }]);
  });
});

describe('normalizeIssue', () => {
  it('unwraps issue wrapper', () => {
    expect(
      normalizeIssue({
        issue: { id: 'abc', title: 'T', status: 'Open' },
      }),
    ).toEqual({ id: 'abc', title: 'T', status: 'Open' });
  });

  it('accepts issue_id and state aliases', () => {
    expect(normalizeIssue({ issue_id: 'x', state: 'Done' })).toEqual({
      id: 'x',
      status: 'Done',
    });
  });

  it('returns null without id', () => {
    expect(normalizeIssue({ title: 'only' })).toBeNull();
  });
});

describe('normalizeOrg', () => {
  it('accepts organization_id', () => {
    expect(normalizeOrg({ organization_id: 'org-1', name: 'Acme' })).toEqual({
      id: 'org-1',
      name: 'Acme',
    });
  });
});

describe('normalizeProject', () => {
  it('accepts project_id and organizationId', () => {
    expect(
      normalizeProject({
        project_id: 'p1',
        organizationId: 'o1',
      }),
    ).toEqual({ id: 'p1', organizationId: 'o1' });
  });
});

describe('normalizeRepo', () => {
  it('accepts repo_id', () => {
    expect(normalizeRepo({ repo_id: 'r1', name: 'R' })).toEqual({
      id: 'r1',
      name: 'R',
    });
  });
});

describe('pickWorkspaceId', () => {
  it('trims string payload', () => {
    expect(pickWorkspaceId('  ws-1  ')).toBe('ws-1');
  });

  it('reads workspace_id from object', () => {
    expect(pickWorkspaceId({ workspace_id: 'w' })).toBe('w');
  });
});

describe('pickCreatedIssueId', () => {
  it('returns string body', () => {
    expect(pickCreatedIssueId('issue-uuid')).toBe('issue-uuid');
  });

  it('reads issue_id from object', () => {
    expect(pickCreatedIssueId({ issue_id: 'i' })).toBe('i');
  });
});

describe('list_issues Zod vs loose fallback (mirrors VibeKanbanMcpService.listIssues)', () => {
  it('uses loose path when payload lacks required Zod counters', () => {
    const parsed = {
      issues: [{ id: '1', title: 'T', status: 'Open' }],
    };
    expect(safeParseVkMcpListIssuesResponse(parsed)).toBeNull();
    const rows = extractArrayFromMcpPayload(parsed)
      .map(normalizeIssue)
      .filter((x): x is NonNullable<typeof x> => x != null);
    expect(rows).toEqual([{ id: '1', title: 'T', status: 'Open' }]);
  });
});
