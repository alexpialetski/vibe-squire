import { createZodDto } from 'nestjs-zod';
import { vibeKanbanUiStateSchema } from '@vibe-squire/shared';

export class VibeKanbanUiStateOutputDto extends createZodDto(
  vibeKanbanUiStateSchema,
) {}
