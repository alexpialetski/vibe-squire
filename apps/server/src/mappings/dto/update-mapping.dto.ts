import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateRepoMappingDto {
  @ApiPropertyOptional({ example: 'acme/my-repo' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[^/\s]+\/[^/\s]+$/, {
    message: 'githubRepo must look like owner/repo',
  })
  githubRepo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  vibeKanbanRepoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}
