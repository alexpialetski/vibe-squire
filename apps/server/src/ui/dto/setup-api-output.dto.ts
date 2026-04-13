import { createZodDto } from 'nestjs-zod';
import { setupApiResponseSchema } from '@vibe-squire/shared';

export class SetupApiOutputDto extends createZodDto(setupApiResponseSchema) {}
