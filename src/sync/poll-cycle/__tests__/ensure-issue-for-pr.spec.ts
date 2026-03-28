import { buildPollIssueDescription } from '../ensure-issue-for-pr';
import { buildVibeSquirePrDescriptionMarker } from '../../../vibe-kanban/vk-contract';
import type { SettingsService } from '../../../settings/settings.service';

const pr = {
  number: 7,
  title: 'T',
  url: 'https://github.com/o/r/pull/7',
  githubRepo: 'o/r',
  createdAt: '2026-01-01T00:00:00Z',
  headRefName: 'f',
  authorLogin: 'u',
};

describe('buildPollIssueDescription', () => {
  it('prefixes marker and applies template body', () => {
    const settings = {
      getEffective: (key: string) =>
        key === 'pr_review_body_template' ? 'PR {number} on {githubRepo}' : '',
    } as Pick<SettingsService, 'getEffective'>;

    const desc = buildPollIssueDescription(pr, settings);
    const marker = buildVibeSquirePrDescriptionMarker(pr.url);
    expect(desc.startsWith(`${marker}\n\n`)).toBe(true);
    expect(desc).toContain('PR 7 on o/r');
  });
});
