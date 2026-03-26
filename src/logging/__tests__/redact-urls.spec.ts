import { redactHttpUrls } from '../redact-urls';

describe('redactHttpUrls', () => {
  it('replaces http(s) URLs', () => {
    expect(redactHttpUrls('connect http://a/b and https://x?q=1 end')).toBe(
      'connect [url] and [url] end',
    );
  });
});
