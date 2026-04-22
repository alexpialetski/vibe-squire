import { BadRequestException } from '@nestjs/common';
import type { SettingsService } from '../../settings/settings.service';
import type { SettingsGroupId } from '../../settings/settings-group.tokens';
import { isSettingsPatchError } from '../../settings/parse-settings-patch';

export async function applySettingsPatchOrBadRequest(
  settings: SettingsService,
  groupId: SettingsGroupId,
  body: Record<string, string>,
): Promise<void> {
  if (Object.keys(body).length === 0) {
    return;
  }

  try {
    await settings.applyGroupPatch(groupId, body);
  } catch (error) {
    if (isSettingsPatchError(error)) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
