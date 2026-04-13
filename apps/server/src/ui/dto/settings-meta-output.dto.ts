import { createZodDto } from 'nestjs-zod';
import { settingsMetaResponseSchema } from '@vibe-squire/shared';

export class SettingsMetaOutputDto extends createZodDto(
  settingsMetaResponseSchema,
) {}
