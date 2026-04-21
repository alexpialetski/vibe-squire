import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import {
  GITHUB_STORAGE_DEFAULTS,
  GITHUB_STORAGE_KEYS,
  githubStorageSchema,
  githubTypedSchema,
  type GithubSettingsValues,
} from './github-settings.schema';

/**
 * Typed accessor for GitHub source-integration settings.
 * Provided by {@link GithubSourceModule}.
 */
@Injectable()
export class GithubSettings {
  constructor(private readonly settings: SettingsService) {}

  getAll(): GithubSettingsValues {
    const raw = this.rawEffectiveRecord();
    const storage = githubStorageSchema.safeParse(raw);
    const base = storage.success ? storage.data : GITHUB_STORAGE_DEFAULTS;
    return githubTypedSchema.parse(base);
  }

  get prIgnoreAuthorLogins(): Set<string> {
    return this.getAll().pr_ignore_author_logins;
  }

  get githubHost(): string {
    return this.getAll().github_host;
  }

  get prReviewBodyTemplate(): string {
    return this.getAll().pr_review_body_template;
  }

  private rawEffectiveRecord(): Record<string, string> {
    const raw: Record<string, string> = {};
    for (const key of GITHUB_STORAGE_KEYS) {
      raw[key] = this.settings.getEffective(key);
    }
    return raw;
  }
}
