import { createZodDto } from 'nestjs-zod';
import { githubFieldsResponseSchema } from '@vibe-squire/shared';

export class GithubFieldsOutputDto extends createZodDto(
  githubFieldsResponseSchema,
) {}
