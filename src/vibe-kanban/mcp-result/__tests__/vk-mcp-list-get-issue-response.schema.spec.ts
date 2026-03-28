import {
  buildVibeSquirePrDescriptionMarker,
  VIBE_SQUIRE_TITLE_MARKER,
} from '../../vk-contract';
import {
  safeParseVkMcpGetIssueResponse,
  safeParseVkMcpListIssuesResponse,
} from '../vk-mcp-list-get-issue-response.schema';

describe('vk-mcp list_issues / get_issue response schemas', () => {
  const listFixture = {
    issues: [
      {
        id: 'fc01fd36-cdbc-41a1-be0c-acc84c523d3a',
        title: `${VIBE_SQUIRE_TITLE_MARKER} PR #5167: Example`,
        simple_id: 'ALI-14',
        status: 'In progress',
        priority: null,
        parent_issue_id: null,
        created_at: '2026-03-26T10:16:46.292855+00:00',
        updated_at: '2026-03-26T10:16:47.998574+00:00',
        pull_request_count: 0,
        latest_pr_url: null,
        latest_pr_status: null,
      },
    ],
    total_count: 1,
    returned_count: 1,
    limit: 5,
    offset: 0,
    project_id: 'c50ba8db-811e-4b36-8220-bb50dfc72de0',
  };

  const getFixture = {
    issue: {
      id: 'fc01fd36-cdbc-41a1-be0c-acc84c523d3a',
      title: `${VIBE_SQUIRE_TITLE_MARKER} PR #5167: Example`,
      simple_id: 'ALI-14',
      description: `${buildVibeSquirePrDescriptionMarker('https://example.com/org/repo/pull/5167')}\n\nBody`,
      status: 'In progress',
      status_id: 'de48bd8e-c6b6-49ec-af62-c4f6c413dfb6',
      priority: null,
      parent_issue_id: null,
      start_date: null,
      target_date: null,
      completed_at: null,
      created_at: '2026-03-26T10:16:46.292855+00:00',
      updated_at: '2026-03-26T10:16:47.998574+00:00',
      pull_requests: [],
      tags: [],
      relationships: [],
      sub_issues: [],
    },
  };

  it('parses list_issues-shaped payload', () => {
    expect(safeParseVkMcpListIssuesResponse(listFixture)).toEqual(listFixture);
  });

  it('parses get_issue-shaped payload', () => {
    expect(safeParseVkMcpGetIssueResponse(getFixture)).toEqual(getFixture);
  });

  it('allows extra keys on list rows (forward compatible)', () => {
    const extended = {
      ...listFixture,
      issues: [{ ...listFixture.issues[0], future_field: 1 }],
    };
    const r = safeParseVkMcpListIssuesResponse(extended);
    expect(r).not.toBeNull();
    expect((r!.issues[0] as { future_field?: number }).future_field).toBe(1);
  });
});
