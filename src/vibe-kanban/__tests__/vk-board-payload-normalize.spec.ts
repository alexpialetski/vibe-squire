import {
  normalizeIssue,
  normalizeOrg,
  normalizeProject,
  normalizeRepo,
  pickCreatedIssueId,
  pickWorkspaceId,
} from '../vk-board-payload-normalize';

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
