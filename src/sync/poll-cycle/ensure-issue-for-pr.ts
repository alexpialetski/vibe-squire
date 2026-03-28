import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SettingsService } from '../../settings/settings.service';
import type {
  BoardIssueRef,
  DestinationBoardPort,
} from '../../ports/destination-board.port';
import type { GithubPrCandidate } from '../../ports/github-pr-candidate';
import { redactHttpUrls } from '../../logging/redact-urls';
import {
  buildVibeSquirePrDescriptionMarker,
  VIBE_SQUIRE_TITLE_MARKER,
} from '../../vibe-kanban/vk-contract';
import { applyPrReviewBodyTemplate } from '../pr-review-template';
import type { SyncRunStateService } from '../sync-run-state.service';
import type { EnsureIssueOutcome } from './ensure-issue-outcome';
import type { VkCreateQuota } from './poll-scout-context';
import {
  isValidVkRepoId,
  issueTitleForPr,
  workspaceNameForPr,
} from './poll-pr-kanban-copy';

/** Subset of {@link SettingsService} used here. */
type EffectiveReader = Pick<SettingsService, 'getEffective'>;

export type EnsureIssueForPrDeps = {
  prisma: PrismaService;
  settings: EffectiveReader;
  destinationBoard: DestinationBoardPort;
  logger: Pick<Logger, 'debug' | 'warn' | 'log'>;
  runState: Pick<SyncRunStateService, 'setDestinationHealth'>;
  destinationHealthId: string;
};

export function buildPollIssueDescription(
  pr: GithubPrCandidate,
  settings: EffectiveReader,
): string {
  const marker = buildVibeSquirePrDescriptionMarker(pr.url);
  const template = settings.getEffective('pr_review_body_template');
  const body = applyPrReviewBodyTemplate(template, pr);
  return `${marker}\n\n${body}`;
}

function workspaceExecutor(settings: EffectiveReader): string {
  const e = settings.getEffective('vk_workspace_executor').trim();
  return e.length > 0 ? e : 'cursor_agent';
}

async function tryPersistWorkspace(
  deps: EnsureIssueForPrDeps,
  syncedRowId: string,
  pr: GithubPrCandidate,
  issueId: string,
  vkRepoId: string,
): Promise<void> {
  const { prisma, settings, destinationBoard, logger } = deps;
  if (!destinationBoard.startWorkspace) {
    return;
  }
  try {
    const wsId = await destinationBoard.startWorkspace({
      name: workspaceNameForPr(pr),
      executor: workspaceExecutor(settings),
      repositories: [{ repoId: vkRepoId, branch: pr.headRefName }],
      issueId,
    });
    await prisma.syncedPullRequest.update({
      where: { id: syncedRowId },
      data: { vibeKanbanWorkspaceId: wsId },
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    logger.warn(
      `start_workspace failed (pr #${pr.number}): ${redactHttpUrls(raw)}`,
    );
  }
}

/**
 * When several Kanban rows match the title heuristic, prefer the one whose body
 * contains the vibe-squire PR marker or the PR URL.
 */
async function disambiguateKanbanIssueHits(
  deps: EnsureIssueForPrDeps,
  pr: GithubPrCandidate,
  hits: BoardIssueRef[],
): Promise<string> {
  const { destinationBoard, logger } = deps;
  if (hits.length === 1) {
    return hits[0].id;
  }
  const marker = buildVibeSquirePrDescriptionMarker(pr.url);
  for (const h of hits) {
    const live = await destinationBoard.getIssue(h.id);
    if (
      live?.description?.includes(marker) ||
      live?.description?.includes(pr.url)
    ) {
      return h.id;
    }
  }
  logger.warn(
    {
      prUrl: pr.url,
      prNumber: pr.number,
      candidateIds: hits.map((x) => x.id),
    },
    'Multiple Kanban title matches; none had PR marker in description — linking first',
  );
  return hits[0].id;
}

/**
 * Match, create, or link a Kanban issue for one PR; persist `SyncedPullRequest` and optional workspace.
 */
export async function ensureIssueForPr(
  deps: EnsureIssueForPrDeps,
  pr: GithubPrCandidate,
  quotaForCreates: VkCreateQuota,
): Promise<EnsureIssueOutcome> {
  const { prisma, settings, destinationBoard, logger, runState } = deps;

  const map = await prisma.repoProjectMapping.findUnique({
    where: { githubRepo: pr.githubRepo },
  });
  const projectId = settings.getEffective('default_project_id').trim();
  const organizationId = settings
    .getEffective('default_organization_id')
    .trim();
  if (
    !map ||
    !isValidVkRepoId(map.vibeKanbanRepoId) ||
    !projectId ||
    !organizationId
  ) {
    logger.debug(
      { githubRepo: pr.githubRepo, prNumber: pr.number },
      'Unmapped repo — PR skipped (no mapping / target board incomplete)',
    );
    return { kind: 'skipped_unmapped' };
  }

  const vkRepoId = map.vibeKanbanRepoId.trim();

  const existing = await prisma.syncedPullRequest.findUnique({
    where: { prUrl: pr.url },
  });
  if (existing) {
    try {
      const live = await destinationBoard.getIssue(existing.kanbanIssueId);
      if (live != null) {
        if (!existing.vibeKanbanWorkspaceId) {
          await tryPersistWorkspace(
            deps,
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
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      logger.warn(
        `get_issue failed for ${existing.kanbanIssueId} (${pr.url}); keeping sync row: ${redactHttpUrls(raw)}`,
      );
      return {
        kind: 'already_tracked',
        kanbanIssueId: existing.kanbanIssueId,
      };
    }

    logger.log(
      `Kanban issue ${existing.kanbanIssueId} missing for ${pr.url}; removed sync row (re-link or create follows same quota as other PRs)`,
    );
    await prisma.syncedPullRequest.delete({ where: { id: existing.id } });
  }

  let hitCandidates: BoardIssueRef[] = [];
  const hints = [
    `${VIBE_SQUIRE_TITLE_MARKER} PR #${pr.number}`,
    pr.url,
    String(pr.number),
  ];
  for (const search of hints) {
    const listed = await destinationBoard.listIssues(projectId, {
      search,
      limit: 40,
    });
    const matches = listed.filter(
      (i) =>
        i.title?.includes(VIBE_SQUIRE_TITLE_MARKER) &&
        (i.title?.includes(`#${pr.number}`) || i.title?.includes(pr.url)),
    );
    if (matches.length > 0) {
      const seen = new Set<string>();
      hitCandidates = [];
      for (const m of matches) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          hitCandidates.push(m);
        }
      }
      break;
    }
  }

  let issueId: string | null = null;
  if (hitCandidates.length > 0) {
    issueId = await disambiguateKanbanIssueHits(deps, pr, hitCandidates);
  }

  let createdNewIssue = false;
  if (!issueId) {
    if (quotaForCreates.remaining <= 0) {
      return { kind: 'skipped_board_limit' };
    }
    issueId = await destinationBoard.createIssue({
      boardId: projectId,
      title: issueTitleForPr(pr),
      description: buildPollIssueDescription(pr, settings),
    });
    createdNewIssue = true;
    quotaForCreates.remaining -= 1;
    runState.setDestinationHealth(deps.destinationHealthId, {
      state: 'ok',
      lastOkAt: new Date().toISOString(),
    });
  }

  const row = await prisma.syncedPullRequest.create({
    data: {
      githubRepo: pr.githubRepo,
      prNumber: pr.number,
      prUrl: pr.url,
      kanbanIssueId: issueId,
      kanbanProjectId: projectId,
    },
  });

  await tryPersistWorkspace(deps, row.id, pr, issueId, vkRepoId);

  if (createdNewIssue) {
    return { kind: 'created', kanbanIssueId: issueId };
  }
  return { kind: 'linked_existing', kanbanIssueId: issueId };
}
