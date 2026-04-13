import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { SetupCompleteGuard } from '../setup/setup-complete.guard';
import { SyncDependenciesGuard } from './sync-dependencies.guard';
import { PrTriageService } from './pr-triage.service';

class PrUrlBody {
  @IsString()
  @IsNotEmpty()
  prUrl!: string;
}

@ApiTags('pr')
@UseGuards(SetupCompleteGuard, SyncDependenciesGuard)
@Controller('api/pr')
export class PrTriageController {
  constructor(private readonly triage: PrTriageService) {}

  @Post('accept')
  @ApiOperation({ summary: 'Accept a triaged PR: create Kanban issue now' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { prUrl: { type: 'string' } },
      required: ['prUrl'],
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: { kanbanIssueId: { type: 'string' } },
    },
  })
  @ApiNotFoundResponse({ description: 'No triageable PR found for this URL' })
  @ApiUnprocessableEntityResponse({
    description: 'Unmapped repo or board limit reached',
  })
  async accept(@Body() body: PrUrlBody) {
    return this.triage.accept(body.prUrl);
  }

  @Post('decline')
  @ApiOperation({
    summary: 'Decline a triaged PR: suppress until it leaves scout results',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { prUrl: { type: 'string' } },
      required: ['prUrl'],
    },
  })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiNotFoundResponse({ description: 'No triageable PR found for this URL' })
  async decline(@Body() body: PrUrlBody) {
    await this.triage.decline(body.prUrl);
    return { ok: true };
  }

  @Post('reconsider')
  @ApiOperation({
    summary: 'Undo a decline: PR returns to triage inbox on next poll',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { prUrl: { type: 'string' } },
      required: ['prUrl'],
    },
  })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  })
  @ApiNotFoundResponse({ description: 'PR is not declined' })
  async reconsider(@Body() body: PrUrlBody) {
    await this.triage.reconsider(body.prUrl);
    return { ok: true };
  }
}
