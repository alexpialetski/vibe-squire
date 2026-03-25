import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { GhCliService } from '../gh/gh-cli.service';
import { StatusEventsService } from '../events/status-events.service';
import {
  GITHUB_PR_SCOUT_PORT,
  WORK_BOARD_PORT,
} from '../ports/injection-tokens';
import type { GithubPrScoutPort } from '../ports/github-scout.port';
import type { WorkBoardPort } from '../ports/work-board.port';
import {
  DEFAULT_KANBAN_DONE_STATUS,
  GITHUB_PR_SCOUT_ID,
} from './sync-constants';
import { computeErrorNextPollAt } from './poll-backoff';
import { applyPrReviewBodyTemplate } from './pr-review-template';
import { redactHttpUrls } from '../logging/redact-urls';
import { SyncRunStateService } from './sync-run-state.service';
import type { GithubPrCandidate } from '../scout/github-pr-scout.service';
import { SetupEvaluationService } from '../setup/setup-evaluation.service';
import { PollRunHistoryService } from './poll-run-history.service';
import { POLL_RUN_ITEM_DECISION } from './poll-run-decisions';
import { isIgnoredBotAuthor } from './ignored-pr-authors';

type EnsureIssueOutcome =
  | { kind: 'created'; kanbanIssueId: string }
  | { kind: 'already_tracked'; kanbanIssueId: string }
  | { kind: 'linked_existing'; kanbanIssueId: string }
  | { kind: 'skipped_unmapped' };

/** Migrated rows without a real VK repo; treat as unmapped until user fixes mapping. */
const PLACEHOLDER_VK_REPO_ID = '00000000-0000-4000-8000-000000000000';

const MAX_WORKSPACE_NAME_LEN = 120;

function isValidVkRepoId(id: string): boolean {
  const t = id.trim();
  return t.length > 0 && t !== PLACEHOLDER_VK_REPO_ID;
}

function isTerminalKanbanStatus(status: string | undefined): boolean {
  if (!status) {
    return false;
  }
  const s = status.toLowerCase();
  return (
    s.includes('done') ||
    s.includes('closed') ||
    s.includes('complete') ||
    s === 'cancelled' ||
    s === 'canceled'
  );
}

function issueTitleForPr(pr: GithubPrCandidate): string {
  const t = pr.title.trim();
  return t.length > 0 ? `PR #${pr.number}: ${t}` : `PR #${pr.number}`;
}

function workspaceNameForPr(pr: GithubPrCandidate): string {
  const base = issueTitleForPr(pr);
  return base.length > MAX_WORKSPACE_NAME_LEN
    ? `${base.slice(0, MAX_WORKSPACE_NAME_LEN - 1)}…`
    : base;
}

/**
 * Application service: one full poll cycle (scheduled or manual).
 * Keeps MCP / gh details behind ports; orchestrates persistence and run state.
 */
@Injectable()
export class RunPollCycleService {
  private readonly logger = new Logger(RunPollCycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly gh: GhCliService,
    @Inject(GITHUB_PR_SCOUT_PORT)
    private readonly scout: GithubPrScoutPort,
    @Inject(WORK_BOARD_PORT)
    private readonly workBoard: WorkBoardPort,
    private readonly runState: SyncRunStateService,
    private readonly statusEvents: StatusEventsService,
    private readonly setupEvaluation: SetupEvaluationService,
    private readonly pollRunHistory: PollRunHistoryService,
  ) {}

  computeNextPollAt(from = new Date()): Date {
    const minutes = this.settings.getPollIntervalMinutes();
    const jitterMax = this.settings.getEffectiveInt('jitter_max_seconds', 30);
    const jitterSec = Math.floor(Math.random() * (jitterMax + 1));
    return new Date(from.getTime() + minutes * 60_000 + jitterSec * 1000);
  }

  async execute(trigger: 'scheduled' | 'manual'): Promise<void> {
    if (this.runState.isRunning()) {
      this.logger.debug('Poll skipped: already running');
      return;
    }

    this.runState.setRunning(true);
    this.statusEvents.emitChanged();

    let runId: string | null = null;
    try {
      runId = await this.pollRunHistory.beginRun(trigger);

      const setupEv = await this.setupEvaluation.evaluate();
      if (!setupEv.complete) {
        await this.persistScoutSkipped('setup_incomplete');
        await this.pollRunHistory.completeAborted(runId, 'setup_incomplete');
        return;
      }

      const ghResult = this.gh.checkAuth();
      if (ghResult.state !== 'ok') {
        await this.persistScoutSkipped(`gh_${ghResult.state}`);
        await this.pollRunHistory.completeAborted(
          runId,
          `gh_${ghResult.state}`,
        );
        return;
      }

      try {
        await this.workBoard.probe();
        this.runState.setVibeKanbanHealth({
          state: 'ok',
          lastOkAt: new Date().toISOString(),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.applyDestinationFailure(msg);
        await this.persistScoutError(`mcp_probe: ${msg}`);
        await this.pollRunHistory.completeFailed(runId, `mcp_probe: ${msg}`);
        return;
      }

      const candidates = this.scout.listReviewRequestedForMe();
      const urlsNow = new Set(candidates.map((c) => c.url));

      let created = 0;
      let skippedUnmapped = 0;
      let skippedBot = 0;
      let skippedAlreadyTracked = 0;
      let skippedLinkedExisting = 0;

      for (const pr of candidates) {
        if (isIgnoredBotAuthor(pr.authorLogin)) {
          skippedBot += 1;
          await this.appendPollRunItem(
            runId,
            pr,
            POLL_RUN_ITEM_DECISION.skippedBot,
            {
              detail: pr.authorLogin
                ? `Author ${pr.authorLogin}`
                : 'Bot author (login unknown)',
            },
          );
          continue;
        }

        const outcome = await this.ensureIssueForPr(pr);
        if (outcome.kind === 'created') {
          created += 1;
          await this.appendPollRunItem(
            runId,
            pr,
            POLL_RUN_ITEM_DECISION.created,
            {
              kanbanIssueId: outcome.kanbanIssueId,
            },
          );
        } else if (outcome.kind === 'skipped_unmapped') {
          skippedUnmapped += 1;
          await this.appendPollRunItem(
            runId,
            pr,
            POLL_RUN_ITEM_DECISION.skippedUnmapped,
            {
              detail:
                'No repo mapping or Kanban org/project not set for this GitHub repo',
            },
          );
        } else if (outcome.kind === 'already_tracked') {
          skippedAlreadyTracked += 1;
          await this.appendPollRunItem(
            runId,
            pr,
            POLL_RUN_ITEM_DECISION.alreadyTracked,
            {
              kanbanIssueId: outcome.kanbanIssueId,
              detail: 'Already synced; Kanban issue unchanged',
            },
          );
        } else {
          skippedLinkedExisting += 1;
          await this.appendPollRunItem(
            runId,
            pr,
            POLL_RUN_ITEM_DECISION.linkedExisting,
            {
              kanbanIssueId: outcome.kanbanIssueId,
              detail: 'Matched existing Kanban issue; linked for tracking',
            },
          );
        }
      }

      await this.reconcileRemoved(urlsNow);

      const now = new Date();
      await this.prisma.scoutState.upsert({
        where: { scoutId: GITHUB_PR_SCOUT_ID },
        create: {
          scoutId: GITHUB_PR_SCOUT_ID,
          lastPollAt: now,
          nextPollAt: this.computeNextPollAt(now),
          lastError: null,
          failureStreak: 0,
          lastPollCandidatesCount: candidates.length,
          lastPollSkippedUnmapped: skippedUnmapped,
          lastPollIssuesCreated: created,
        },
        update: {
          lastPollAt: now,
          nextPollAt: this.computeNextPollAt(now),
          lastError: null,
          failureStreak: 0,
          lastPollCandidatesCount: candidates.length,
          lastPollSkippedUnmapped: skippedUnmapped,
          lastPollIssuesCreated: created,
        },
      });

      this.runState.markPollCompleted();

      await this.pollRunHistory.completeSuccess(runId, {
        candidatesCount: candidates.length,
        issuesCreated: created,
        skippedUnmapped,
        skippedBot,
        skippedAlreadyTracked,
        skippedLinkedExisting,
      });

      if (skippedUnmapped > 0 || skippedBot > 0) {
        this.logger.log(
          `Sync (${trigger}): ${candidates.length} PR(s), ${created} created, ${skippedUnmapped} skipped (unmapped), ${skippedBot} skipped (bot)`,
        );
      } else {
        this.logger.log(
          `Sync (${trigger}): ${candidates.length} PR(s), ${created} created`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Sync (${trigger}) failed: ${redactHttpUrls(msg)}`);
      if (this.looksLikeMcpOrNetworkError(msg)) {
        this.applyDestinationFailure(msg);
      }
      await this.persistScoutError(msg);
      if (runId) {
        await this.pollRunHistory.completeFailed(runId, redactHttpUrls(msg));
      }
    } finally {
      this.runState.setRunning(false);
      this.statusEvents.emitChanged();
    }
  }

  private async appendPollRunItem(
    runId: string,
    pr: GithubPrCandidate,
    decision: string,
    opts?: { detail?: string; kanbanIssueId?: string },
  ): Promise<void> {
    await this.pollRunHistory.appendItem(runId, {
      prUrl: pr.url,
      githubRepo: pr.githubRepo,
      prNumber: pr.number,
      prTitle: pr.title,
      authorLogin: pr.authorLogin,
      decision,
      detail: opts?.detail,
      kanbanIssueId: opts?.kanbanIssueId,
    });
  }

  private kanbanDoneStatus(): string {
    const s = this.settings.getEffective('kanban_done_status').trim();
    return s.length > 0 ? s : DEFAULT_KANBAN_DONE_STATUS;
  }

  private buildIssueDescription(pr: GithubPrCandidate): string {
    const marker = `<!-- vibe-squire:pr:${pr.url} -->`;
    const template = this.settings.getEffective('pr_review_body_template');
    const body = applyPrReviewBodyTemplate(template, pr);
    return `${marker}\n\n${body}`;
  }

  private applyDestinationFailure(message: string): void {
    const prev = this.runState.getVibeKanbanHealth();
    if (prev.lastOkAt) {
      this.runState.setVibeKanbanHealth({
        state: 'degraded',
        message,
        lastOkAt: prev.lastOkAt,
      });
    } else {
      this.runState.setVibeKanbanHealth({ state: 'error', message });
    }
  }

  private looksLikeMcpOrNetworkError(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes('mcp') ||
      m.includes('fetch') ||
      m.includes('econnrefused') ||
      m.includes('socket') ||
      m.includes('network') ||
      m.includes('streamablehttp')
    );
  }

  private async persistScoutSkipped(reason: string): Promise<void> {
    const now = new Date();
    await this.prisma.scoutState.upsert({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
      create: {
        scoutId: GITHUB_PR_SCOUT_ID,
        lastPollAt: now,
        nextPollAt: this.computeNextPollAt(now),
        lastError: `skipped: ${reason}`,
        failureStreak: 0,
        lastPollCandidatesCount: null,
        lastPollSkippedUnmapped: null,
        lastPollIssuesCreated: null,
      },
      update: {
        lastPollAt: now,
        nextPollAt: this.computeNextPollAt(now),
        lastError: `skipped: ${reason}`,
        failureStreak: 0,
        lastPollCandidatesCount: null,
        lastPollSkippedUnmapped: null,
        lastPollIssuesCreated: null,
      },
    });
    this.runState.markPollCompleted();
  }

  private async persistScoutError(message: string): Promise<void> {
    const now = new Date();
    const row = await this.prisma.scoutState.findUnique({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
    });
    const streak = (row?.failureStreak ?? 0) + 1;
    const nextPollAt = computeErrorNextPollAt(now, streak, this.settings);
    await this.prisma.scoutState.upsert({
      where: { scoutId: GITHUB_PR_SCOUT_ID },
      create: {
        scoutId: GITHUB_PR_SCOUT_ID,
        lastPollAt: now,
        nextPollAt,
        lastError: message,
        failureStreak: streak,
        lastPollCandidatesCount: null,
        lastPollSkippedUnmapped: null,
        lastPollIssuesCreated: null,
      },
      update: {
        lastPollAt: now,
        nextPollAt,
        lastError: message,
        failureStreak: streak,
        lastPollCandidatesCount: null,
        lastPollSkippedUnmapped: null,
        lastPollIssuesCreated: null,
      },
    });
    this.runState.markPollCompleted();
  }

  private defaultKanbanProjectId(): string {
    return this.settings.getEffective('default_project_id').trim();
  }

  private defaultKanbanOrganizationId(): string {
    return this.settings.getEffective('default_organization_id').trim();
  }

  private workspaceExecutor(): string {
    const e = this.settings.getEffective('vk_workspace_executor').trim();
    return e.length > 0 ? e : 'cursor_agent';
  }

  private async tryPersistWorkspace(
    syncedRowId: string,
    pr: GithubPrCandidate,
    issueId: string,
    vkRepoId: string,
  ): Promise<void> {
    try {
      const wsId = await this.workBoard.startWorkspace({
        name: workspaceNameForPr(pr),
        executor: this.workspaceExecutor(),
        repositories: [{ repoId: vkRepoId, branch: pr.headRefName }],
        issueId,
      });
      await this.prisma.syncedPullRequest.update({
        where: { id: syncedRowId },
        data: { vibeKanbanWorkspaceId: wsId },
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `start_workspace failed (pr #${pr.number}): ${redactHttpUrls(raw)}`,
      );
    }
  }

  private async ensureIssueForPr(
    pr: GithubPrCandidate,
  ): Promise<EnsureIssueOutcome> {
    const map = await this.prisma.repoProjectMapping.findUnique({
      where: { githubRepo: pr.githubRepo },
    });
    const projectId = this.defaultKanbanProjectId();
    const organizationId = this.defaultKanbanOrganizationId();
    if (
      !map ||
      !isValidVkRepoId(map.vibeKanbanRepoId) ||
      !projectId ||
      !organizationId
    ) {
      this.logger.debug(
        { githubRepo: pr.githubRepo, prNumber: pr.number },
        'Unmapped repo — PR skipped (no mapping / target board incomplete)',
      );
      return { kind: 'skipped_unmapped' };
    }

    const vkRepoId = map.vibeKanbanRepoId.trim();

    const existing = await this.prisma.syncedPullRequest.findUnique({
      where: { prUrl: pr.url },
    });
    if (existing) {
      if (!existing.vibeKanbanWorkspaceId) {
        await this.tryPersistWorkspace(
          existing.id,
          pr,
          existing.kanbanIssueId,
          vkRepoId,
        );
      }
      return {
        kind: 'already_tracked',
        kanbanIssueId: existing.kanbanIssueId,
      };
    }

    let issueId: string | null = null;
    const hints = [pr.url, String(pr.number), `${pr.githubRepo}#${pr.number}`];
    for (const search of hints) {
      const listed = await this.workBoard.listIssues(projectId, {
        search,
        limit: 40,
      });
      const hit = listed.find(
        (i) =>
          i.title?.includes(`#${pr.number}`) ||
          i.title?.includes(pr.url) ||
          i.title?.toLowerCase().includes(pr.githubRepo),
      );
      if (hit) {
        issueId = hit.id;
        break;
      }
    }

    let createdNewIssue = false;
    if (!issueId) {
      issueId = await this.workBoard.createIssue({
        projectId,
        title: issueTitleForPr(pr),
        description: this.buildIssueDescription(pr),
      });
      createdNewIssue = true;
      this.runState.setVibeKanbanHealth({
        state: 'ok',
        lastOkAt: new Date().toISOString(),
      });
    }

    const row = await this.prisma.syncedPullRequest.create({
      data: {
        githubRepo: pr.githubRepo,
        prNumber: pr.number,
        prUrl: pr.url,
        kanbanIssueId: issueId,
        kanbanProjectId: projectId,
      },
    });

    await this.tryPersistWorkspace(row.id, pr, issueId, vkRepoId);

    if (createdNewIssue) {
      return { kind: 'created', kanbanIssueId: issueId };
    }
    return { kind: 'linked_existing', kanbanIssueId: issueId };
  }

  private async reconcileRemoved(urlsNow: Set<string>): Promise<void> {
    const tracked = await this.prisma.syncedPullRequest.findMany();
    for (const row of tracked) {
      if (urlsNow.has(row.prUrl)) {
        continue;
      }
      try {
        const issue = await this.workBoard.getIssue(row.kanbanIssueId);
        if (!isTerminalKanbanStatus(issue?.status)) {
          await this.workBoard.updateIssue(row.kanbanIssueId, {
            status: this.kanbanDoneStatus(),
          });
        }
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        this.logger.warn(
          `Reconcile (pr ${row.prNumber}): ${redactHttpUrls(raw)}`,
        );
      }
      try {
        await this.prisma.syncedPullRequest.delete({ where: { id: row.id } });
      } catch {
        // ignore
      }
    }
  }
}
