import { createZodDto } from 'nestjs-zod';
import { activityRunsResponseSchema } from '@vibe-squire/shared';

export class ActivityRunsOutputDto extends createZodDto(
  activityRunsResponseSchema,
) {}
