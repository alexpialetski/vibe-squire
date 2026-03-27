import {
  Body,
  Controller,
  Get,
  Patch,
  BadRequestException,
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
import {
  formatZodIssuesForBadRequest,
  patchSettingsBodySchema,
} from './dto/patch-settings-body.schema';

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

  @Patch()
  @ApiOperation({ summary: 'Upsert settings by key (strings only)' })
  @ApiBody({ schema: PATCH_SETTINGS_SCHEMA })
  @ApiOkResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiBadRequestResponse({ description: 'Unknown key or non-string value' })
  async patch(@Body() body: unknown) {
    const parsed = patchSettingsBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(formatZodIssuesForBadRequest(parsed.error));
    }
    await this.settings.applyPatch(parsed.data);
    return { ok: true };
  }
}
