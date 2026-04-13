import { Injectable } from '@nestjs/common';
import {
  githubStorageSchema,
  GITHUB_SETTING_ENV,
} from './github-settings.schema';
import { SettingsGroupBase } from '../../settings/settings-group.base';
import type { SettingsGroupId } from '../../settings/settings-group.tokens';

@Injectable()
export class GithubSettingsGroup extends SettingsGroupBase {
  readonly groupId: SettingsGroupId = 'source';
  readonly storageSchema = githubStorageSchema;
  readonly envKeys = GITHUB_SETTING_ENV;
}
