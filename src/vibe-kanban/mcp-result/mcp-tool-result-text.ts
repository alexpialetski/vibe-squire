/** Trimmed `text` parts from MCP `callTool` result `content` array. */
export function mcpResultTextParts(result: unknown): string[] {
  const r = result as {
    content?: Array<{ type: string; text?: string }>;
  };
  return (
    r.content
      ?.filter(
        (c): c is { type: 'text'; text: string } =>
          c.type === 'text' && typeof c.text === 'string',
      )
      .map((c) => c.text.trim())
      .filter(Boolean) ?? []
  );
}

/**
 * MCP tool failures: extract human-readable text from `callTool` result (for logging / classification).
 */
export function summarizeMcpToolErrorText(result: unknown): string {
  const parts = mcpResultTextParts(result);
  const s = parts.join(' | ').slice(0, 800);
  return s.length > 0 ? s : 'isError=true (no text in content)';
}

/**
 * When VK returns 404 for a deleted/missing issue, MCP uses `isError: true` instead of an empty body.
 * Treat as missing so callers can heal (e.g. drop `SyncedPullRequest` and recreate).
 */
export function isGetIssueNotFoundMcpResult(result: unknown): boolean {
  const r = result as { isError?: boolean };
  if (r.isError !== true) {
    return false;
  }
  const summary = summarizeMcpToolErrorText(result);
  return /\b404\b|not\s+found|issue\s+not\s+found|unknown\s+issue/i.test(
    summary,
  );
}
