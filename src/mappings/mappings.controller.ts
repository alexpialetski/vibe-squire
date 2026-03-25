import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MappingsService } from './mappings.service';
import { CreateRepoMappingDto } from './dto/create-mapping.dto';
import { UpdateRepoMappingDto } from './dto/update-mapping.dto';
import { StatusEventsService } from '../events/status-events.service';

@ApiTags('mappings')
@Controller('api/mappings')
export class MappingsController {
  constructor(
    private readonly mappings: MappingsService,
    private readonly statusEvents: StatusEventsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List GitHub repo → Vibe Kanban repository mappings',
  })
  @ApiOkResponse({ description: 'Ordered by githubRepo' })
  list() {
    return this.mappings.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create mapping' })
  @ApiCreatedResponse({ description: 'Created mapping row' })
  async create(@Body() dto: CreateRepoMappingDto) {
    const row = await this.mappings.create(dto);
    this.statusEvents.emitChanged();
    return row;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update mapping by id' })
  @ApiOkResponse({ description: 'Updated row' })
  @ApiNotFoundResponse()
  async update(@Param('id') id: string, @Body() dto: UpdateRepoMappingDto) {
    const row = await this.mappings.update(id, dto);
    this.statusEvents.emitChanged();
    return row;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete mapping by id' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiNotFoundResponse()
  async remove(@Param('id') id: string) {
    await this.mappings.remove(id);
    this.statusEvents.emitChanged();
    return { ok: true };
  }
}
