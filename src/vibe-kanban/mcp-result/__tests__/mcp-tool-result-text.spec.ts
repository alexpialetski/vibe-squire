import { isGetIssueNotFoundMcpResult } from '../mcp-tool-result-text';

describe('isGetIssueNotFoundMcpResult', () => {
  it('is false when not isError', () => {
    expect(isGetIssueNotFoundMcpResult({ isError: false })).toBe(false);
    expect(isGetIssueNotFoundMcpResult({})).toBe(false);
  });

  it('detects 404 in text content', () => {
    expect(
      isGetIssueNotFoundMcpResult({
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'VK API returned error status: 404 Not Found',
            }),
          },
        ],
      }),
    ).toBe(true);
  });

  it('detects not found phrasing', () => {
    expect(
      isGetIssueNotFoundMcpResult({
        isError: true,
        content: [{ type: 'text', text: 'Issue not found' }],
      }),
    ).toBe(true);
  });

  it('is false for unrelated tool errors', () => {
    expect(
      isGetIssueNotFoundMcpResult({
        isError: true,
        content: [{ type: 'text', text: 'VK API returned error status: 500' }],
      }),
    ).toBe(false);
  });
});
