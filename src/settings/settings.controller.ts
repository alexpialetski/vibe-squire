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
import { type SettingKey } from '../config/setting-keys';
import { StatusEventsService } from '../events/status-events.service';
import { IntegrationSettingsEmitterService } from '../events/integration-settings-emitter.service';
import { PATCH_SETTINGS_SCHEMA } from './dto/patch-settings.dto';
import {
  formatZodIssuesForBadRequest,
  patchSettingsBodySchema,
} from './dto/patch-settings-body.schema';

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly statusEvents: StatusEventsService,
    private readonly integrationEmitter: IntegrationSettingsEmitterService,
  ) {}

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
    return this.settings.listStoredNonSecret();
  }

  /**
   * Body: `{ "vk_mcp_stdio_json": "[...]", "poll_interval_minutes": "15" }` — only known keys applied.
   */
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
    const touched: string[] = [];
    for (const [key, value] of Object.entries(parsed.data)) {
      await this.settings.setValue(key as SettingKey, value);
      touched.push(key);
    }
    await this.settings.refreshCache();
    await this.integrationEmitter.emitIntegrationSettingsChanged(
      touched as SettingKey[],
    );
    this.statusEvents.emitChanged();
    this.statusEvents.emitScheduleRefresh();
    return { ok: true };
  }
}
