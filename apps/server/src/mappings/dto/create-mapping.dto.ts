import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

/** `owner/repo` lowercase normalized in service if needed */
export class CreateRepoMappingDto {
  @ApiProperty({ example: 'acme/my-repo' })
  @IsString()
  @MinLength(3)
  @Matches(/^[^/\s]+\/[^/\s]+$/, {
    message: 'githubRepo must look like owner/repo',
  })
  githubRepo!: string;

  @ApiProperty({ description: 'Vibe Kanban repository UUID (from list_repos)' })
  @IsString()
  @MinLength(1)
  vibeKanbanRepoId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}
