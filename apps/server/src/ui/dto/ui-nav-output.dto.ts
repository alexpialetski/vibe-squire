import { createZodDto } from 'nestjs-zod';
import { uiNavResponseSchema } from '@vibe-squire/shared';

export class UiNavOutputDto extends createZodDto(uiNavResponseSchema) {}
