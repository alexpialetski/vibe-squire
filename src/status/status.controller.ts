import { Controller, Get, MessageEvent, Sse } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, from, interval, merge } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { StatusService } from './status.service';
import { StatusEventsService } from '../events/status-events.service';
import {
  StatusConfigurationDto,
  StatusDatabaseDto,
  StatusGhDto,
  StatusManualSyncDto,
  StatusScheduledSyncDto,
  StatusSetupDto,
  StatusSnapshotDto,
} from './dto/status-snapshot.dto';

@ApiTags('status')
@ApiExtraModels(
  StatusSnapshotDto,
  StatusGhDto,
  StatusDatabaseDto,
  StatusSetupDto,
  StatusConfigurationDto,
  StatusManualSyncDto,
  StatusScheduledSyncDto,
)
@Controller('api/status')
export class StatusController {
  constructor(
    private readonly status: StatusService,
    private readonly statusEvents: StatusEventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Runtime status snapshot (§4.2, §9)' })
  @ApiOkResponse({ type: StatusSnapshotDto })
  snapshot() {
    return this.status.getSnapshot();
  }

  @Sse('stream')
  @ApiOperation({
    summary: 'Server-Sent Events stream of status snapshots',
    description:
      'Emits JSON-encoded snapshots on change; periodic keep-alive frames omit a snapshot (no DB work).',
  })
  @ApiProduces('text/event-stream')
  stream(): Observable<MessageEvent> {
    const keepAlive = interval(30_000).pipe(
      map((): MessageEvent => ({ data: ' ' })),
    );
    const onChange = this.statusEvents.updates().pipe(
      switchMap(() => from(this.status.getSnapshot())),
      map((snap) => ({ data: JSON.stringify(snap) })),
    );
    return merge(keepAlive, onChange);
  }
}
