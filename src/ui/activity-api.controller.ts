import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { PollRunHistoryService } from '../sync/poll-run-history.service';
import { presentActivityRunsForView } from './ui-presenter';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

@ApiTags('activity')
@Controller('api/activity')
export class ActivityApiController {
  constructor(
    private readonly pollRunHistory: PollRunHistoryService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('runs')
  @ApiOperation({
    summary: 'Recent poll runs for Activity UI (includes running)',
  })
  @ApiOkResponse({
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
    const rows = await this.pollRunHistory.listRecentForUi(limit);

    const allPrUrls = new Set(rows.flatMap((r) => r.items.map((i) => i.prUrl)));
    const [syncedRows, declinedRows] = await Promise.all([
      allPrUrls.size > 0
        ? this.prisma.syncedPullRequest.findMany({
            where: { prUrl: { in: [...allPrUrls] } },
            select: { prUrl: true },
          })
        : [],
      allPrUrls.size > 0
        ? this.prisma.declinedPullRequest.findMany({
            where: { prUrl: { in: [...allPrUrls] } },
            select: { prUrl: true },
          })
        : [],
    ]);
    const acceptedPrUrls = new Set(
      syncedRows.map((r: { prUrl: string }) => r.prUrl),
    );
    const declinedPrUrls = new Set(
      declinedRows.map((r: { prUrl: string }) => r.prUrl),
    );

    return {
      runs: presentActivityRunsForView(rows, {
        acceptedPrUrls,
        declinedPrUrls,
      }),
    };
  }
}
