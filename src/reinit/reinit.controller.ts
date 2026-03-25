import { Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReinitService } from './reinit.service';

@ApiTags('reinit')
@Controller('api/reinit')
export class ReinitController {
  constructor(private readonly reinit: ReinitService) {}

  @Post()
  @ApiOperation({
    summary: 'Soft reinit — DB ping, gh check, MCP probe, reset backoff',
  })
  @ApiOkResponse({
    description: 'Health summary per subsystem',
  })
  run() {
    return this.reinit.reinitialize();
  }
}
