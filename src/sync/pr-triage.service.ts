import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  SYNC_DESTINATION_BOARD_PORT,
  SOURCE_STATUS_PORT,
} from '../ports/injection-tokens';
import type { DestinationBoardPort } from '../ports/destination-board.port';
import type { SourceStatusProvider } from '../ports/source-status.port';
import type { GithubPrCandidate } from '../ports/github-pr-candidate';
import { SyncRunStateService } from './sync-run-state.service';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { ensureIssueForPr } from './poll-cycle/ensure-issue-for-pr';
import { POLL_RUN_ITEM_DECISION } from './poll-run-decisions';

@Injectable()
export class PrTriageService {
  private readonly logger = new Logger(PrTriageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    @Inject(SYNC_DESTINATION_BOARD_PORT)
    private readonly destinationBoard: DestinationBoardPort,
    @Inject(SOURCE_STATUS_PORT)
    private readonly sourceStatus: SourceStatusProvider,
    private readonly runState: SyncRunStateService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  async accept(prUrl: string): Promise<{ kanbanIssueId: string }> {
    const item = await this.findTriageableItem(prUrl);

    await this.prisma.declinedPullRequest.deleteMany({
      where: { prUrl },
    });

    const pr = itemToCandidate(item);
    const quota = { remaining: 1 };
    const outcome = await ensureIssueForPr(
      {
        prisma: this.prisma,
        settings: this.settings,
        destinationBoard: this.destinationBoard,
        logger: this.logger,
        runState: this.runState,
        destinationHealthId: this.appEnv.destinationType,
        autoCreateIssues: true,
      },
      pr,
      quota,
    );

    if (outcome.kind === 'created' || outcome.kind === 'linked_existing') {
      return { kanbanIssueId: outcome.kanbanIssueId };
    }
    if (outcome.kind === 'already_tracked') {
      return { kanbanIssueId: outcome.kanbanIssueId };
    }
    if (outcome.kind === 'skipped_unmapped') {
      throw new HttpException(
        {
          error: 'unmapped',
          message: 'No mapping or target board for this repo',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (outcome.kind === 'skipped_board_limit') {
      throw new HttpException(
        {
          error: 'board_limit',
          message:
            'Board limit reached; increase max_board_pr_count or close existing issues',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    throw new HttpException(
      { error: 'unexpected_outcome', kind: outcome.kind },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async decline(prUrl: string): Promise<void> {
    await this.findTriageableItem(prUrl);
    await this.prisma.declinedPullRequest.upsert({
      where: { prUrl },
      create: { prUrl },
      update: { declinedAt: new Date() },
    });
  }

  async reconsider(prUrl: string): Promise<void> {
    const deleted = await this.prisma.declinedPullRequest.deleteMany({
      where: { prUrl },
    });
    if (deleted.count === 0) {
      throw new HttpException(
        { error: 'not_found', message: 'PR is not declined' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Find the most recent PollRunItem for this prUrl that was triageable
   * (skipped_triage, skipped_board_limit, or skipped_declined).
   */
  private async findTriageableItem(prUrl: string) {
    const triageDecisions = [
      POLL_RUN_ITEM_DECISION.skippedTriage,
      POLL_RUN_ITEM_DECISION.skippedBoardLimit,
      POLL_RUN_ITEM_DECISION.skippedDeclined,
    ];
    const item = await this.prisma.pollRunItem.findFirst({
      where: {
        prUrl,
        decision: { in: triageDecisions },
      },
      orderBy: { run: { startedAt: 'desc' } },
    });
    if (!item) {
      throw new HttpException(
        { error: 'not_found', message: 'No triageable PR found for this URL' },
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }
}

function itemToCandidate(item: {
  prUrl: string;
  githubRepo: string;
  prNumber: number;
  prTitle: string;
  authorLogin: string | null;
}): GithubPrCandidate {
  return {
    url: item.prUrl,
    githubRepo: item.githubRepo,
    number: item.prNumber,
    title: item.prTitle,
    authorLogin: item.authorLogin ?? '',
    createdAt: new Date().toISOString(),
    headRefName: 'main',
  };
}
