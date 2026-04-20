import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ActivityRunsOutputDto } from './dto/activity-runs-output.dto';
import { ActivityUiService } from './activity-ui.service';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

@ApiTags('activity')
@Controller('api/activity')
export class ActivityApiController {
  constructor(private readonly activityUi: ActivityUiService) {}

  @Get('runs')
  @ApiOperation({
    summary: 'Recent poll runs for Activity UI (includes running)',
  })
  @ZodResponse({
    status: 200,
    type: ActivityRunsOutputDto,
    description:
      'Runs ordered by start time (newest first), same shape as Activity page rows',
  })
  async runs(@Query('limit') limitRaw?: string) {
    let limit = DEFAULT_LIMIT;
    if (limitRaw !== undefined && limitRaw !== '') {
      const n = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(n) && n > 0) {
        limit = Math.min(n, MAX_LIMIT);
      }
    }
    const runs = await this.activityUi.listPresentedRuns(limit);
    return { runs };
  }
}
