import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { PATCH_SETTINGS_SCHEMA } from './dto/patch-settings.dto';
import { isSettingsPatchError } from './parse-settings-patch';
import type { SettingsGroupId } from './settings-group.tokens';

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Effective non-secret settings (env + DB merged)' })
  @ApiOkResponse({
    description: 'Map of setting key → effective string value',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
  })
  listEffective() {
    return this.settings.listEffectiveNonSecret();
  }

  @Patch('core')
  @ApiOperation({ summary: 'Upsert core / scheduler settings' })
  @ApiBody({ schema: PATCH_SETTINGS_SCHEMA })
  @ApiOkResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiBadRequestResponse({
    description: 'Unknown key for core group or validation error',
  })
  async patchCore(@Body() body: unknown) {
    return this.patchPartition('core', body);
  }

  @Patch('source')
  @ApiOperation({ summary: 'Upsert active source integration settings' })
  @ApiBody({ schema: PATCH_SETTINGS_SCHEMA })
  @ApiOkResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiBadRequestResponse({
    description: 'Unknown key for source group or validation error',
  })
  async patchSource(@Body() body: unknown) {
    return this.patchPartition('source', body);
  }

  @Patch('destination')
  @ApiOperation({ summary: 'Upsert active destination integration settings' })
  @ApiBody({ schema: PATCH_SETTINGS_SCHEMA })
  @ApiOkResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiBadRequestResponse({
    description: 'Unknown key for destination group or validation error',
  })
  async patchDestination(@Body() body: unknown) {
    return this.patchPartition('destination', body);
  }

  private async patchPartition(
    groupId: SettingsGroupId,
    body: unknown,
  ): Promise<{ ok: true }> {
    try {
      await this.settings.applyGroupPatch(groupId, body);
      return { ok: true };
    } catch (e) {
      if (isSettingsPatchError(e)) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
