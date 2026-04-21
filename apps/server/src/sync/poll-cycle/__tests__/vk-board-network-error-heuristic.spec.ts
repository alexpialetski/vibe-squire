import { looksLikeVkBoardOrNetworkError } from '../vk-board-network-error-heuristic';

describe('looksLikeVkBoardOrNetworkError', () => {
  it('matches typical destination / network failures', () => {
    expect(looksLikeVkBoardOrNetworkError('list_organizations: HTTP 401')).toBe(
      true,
    );
    expect(looksLikeVkBoardOrNetworkError('VK API: fetch failed')).toBe(true);
    expect(looksLikeVkBoardOrNetworkError('ECONNREFUSED 127.0.0.1')).toBe(true);
    expect(looksLikeVkBoardOrNetworkError('Network unreachable')).toBe(true);
  });

  it('ignores unrelated validation errors', () => {
    expect(looksLikeVkBoardOrNetworkError('validation failed')).toBe(false);
  });
});
