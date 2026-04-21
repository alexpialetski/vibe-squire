import {
  buildVibeSquirePrDescriptionMarker,
  VIBE_SQUIRE_PR_COMMENT_PREFIX,
} from '../vk-contract';

describe('buildVibeSquirePrDescriptionMarker', () => {
  it('builds stable HTML comment for PR URL', () => {
    const url = 'https://example.com/a/pull/1';
    expect(buildVibeSquirePrDescriptionMarker(url)).toBe(
      `<!-- vibe-squire:pr:${url} -->`,
    );
    expect(VIBE_SQUIRE_PR_COMMENT_PREFIX).toBe('<!-- vibe-squire:pr:');
  });
});
