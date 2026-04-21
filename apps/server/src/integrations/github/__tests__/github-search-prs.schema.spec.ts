import { ghSearchPrsResponseSchema } from '../github-search-prs.schema';

describe('ghSearchPrsResponseSchema', () => {
  it('accepts gh search prs sample shape', () => {
    const sample = [
      {
        author: {
          id: 'MDM6Qm90NTA5Ng==',
          is_bot: false,
          login: 'renovatebot[bot]',
          type: 'Bot',
          url: 'https://github.example.com/github-apps/renovatebot',
        },
        number: 5070,
        createdAt: '2026-02-06T12:26:12Z',
        repository: {
          name: 'epicgames-self-service-portal',
          nameWithOwner: 'online-web/epicgames-self-service-portal',
        },
        title: 'Update dependency faker to v6',
        url: 'https://github.example.com/online-web/epicgames-self-service-portal/pull/5070',
      },
    ];
    const r = ghSearchPrsResponseSchema.safeParse(sample);
    expect(r.success).toBe(true);
  });

  it('rejects non-array root', () => {
    expect(ghSearchPrsResponseSchema.safeParse({}).success).toBe(false);
  });

  it('rejects row missing repository or author', () => {
    const r = ghSearchPrsResponseSchema.safeParse([
      {
        number: 1,
        title: 't',
        url: 'https://github.com/o/r/pull/1',
      },
    ]);
    expect(r.success).toBe(false);
  });
});
