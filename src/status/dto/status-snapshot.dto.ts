import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Documented subset of `GET /api/status` — see status-snapshot.contract validation for full shape. */
export class StatusGhDto {
  @ApiProperty({ enum: ['ok', 'not_installed', 'not_authenticated', 'error'] })
  state!: string;

  @ApiPropertyOptional()
  message?: string;
}

export class StatusDatabaseDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  state!: string;

  @ApiPropertyOptional()
  message?: string;
}

export class StatusSetupDto {
  @ApiProperty({
    description:
      'True when a supported source and destination are configured (operator UI unlocked)',
  })
  integrationsConfigured!: boolean;

  @ApiProperty()
  complete!: boolean;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  mappingCount!: number;
}

export class StatusConfigurationDto {
  @ApiProperty({
    description: 'PR / SCM source (e.g. github)',
  })
  source_type!: string;

  @ApiProperty({
    description: 'Work board / destination integration (e.g. vibe_kanban)',
  })
  destination_type!: string;

  @ApiProperty({
    description:
      'True when Vibe Kanban MCP is configured (valid stdio spawn command JSON)',
  })
  vk_mcp_configured!: boolean;

  @ApiProperty()
  gh_host_override!: boolean;
}

export class StatusManualSyncDto {
  @ApiProperty()
  canRun!: boolean;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  cooldownUntil?: string;
}

export class StatusSnapshotDto {
  @ApiProperty()
  timestamp!: string;

  @ApiProperty({ type: StatusGhDto })
  gh!: StatusGhDto;

  @ApiProperty({ type: StatusDatabaseDto })
  database!: StatusDatabaseDto;

  @ApiProperty({ type: StatusSetupDto })
  setup!: StatusSetupDto;

  @ApiProperty({ type: StatusConfigurationDto })
  configuration!: StatusConfigurationDto;

  @ApiProperty({
    description: 'Destination health (e.g. vibe_kanban)',
    type: 'array',
    items: { type: 'object' },
  })
  destinations!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Per-scout UI state',
    type: 'array',
    items: { type: 'object' },
  })
  scouts!: Record<string, unknown>[];

  @ApiProperty({ type: StatusManualSyncDto })
  manual_sync!: StatusManualSyncDto;
}
