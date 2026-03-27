import type { SettingDefinition } from '../../settings/setting-definition';
import { parsePrIgnoreAuthorLogins } from '../../sync/pr-ignore-author-logins';

export const GITHUB_INTEGRATION_SETTING_KEYS = [
  'pr_ignore_author_logins',
  'pr_review_body_template',
] as const;

export type GithubIntegrationSettingKey =
  (typeof GITHUB_INTEGRATION_SETTING_KEYS)[number];

export const GITHUB_INTEGRATION_SETTING_DEFINITIONS = {
  pr_ignore_author_logins: {
    defaultValue:
      'renovate[bot];renovatebot[bot];dependabot[bot];dependabot-preview[bot]',
    validate(value: string): string | null {
      const parsed = parsePrIgnoreAuthorLogins(value);
      return parsed.ok
        ? null
        : `Invalid pr_ignore_author_logins: ${parsed.message}`;
    },
  },
  pr_review_body_template: {
    defaultValue:
      'Examine the diff for PR {prUrl}. Highlight architectural risks and logic bugs. Provide a summary report in the workspace.',
  },
} satisfies Record<GithubIntegrationSettingKey, SettingDefinition>;
