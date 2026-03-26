import { looksLikeMcpOrNetworkError } from './mcp-network-error-heuristic';

describe('looksLikeMcpOrNetworkError', () => {
  it('matches common MCP / transport substrings', () => {
    expect(looksLikeMcpOrNetworkError('MCP tool failed')).toBe(true);
    expect(looksLikeMcpOrNetworkError('ECONNREFUSED 127.0.0.1')).toBe(true);
    expect(looksLikeMcpOrNetworkError('Network unreachable')).toBe(true);
    expect(looksLikeMcpOrNetworkError('streamablehttp timeout')).toBe(true);
  });
  it('returns false for unrelated errors', () => {
    expect(looksLikeMcpOrNetworkError('validation failed')).toBe(false);
  });
});
