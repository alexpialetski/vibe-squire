import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { GithubPrScoutPort } from '../ports/github-scout.port';
import { ghSearchPrsResponseSchema } from './github-search-prs.schema';

/** Branch passed to `start_workspace` for every PR (PR head not fetched). */
const WORKSPACE_BRANCH = 'main';

export type GithubPrCandidate = {
  number: number;
  title: string;
  url: string;
  githubRepo: string;
  /** ISO 8601 from GitHub (`gh search prs --json createdAt`). */
  createdAt: string;
  /** Fixed branch for `start_workspace` (not the PR head). */
  headRefName: string;
  /** From `gh search prs --json author`; used for author skip rules. */
  authorLogin: string;
};

function compareCandidatesOldestFirst(
  a: GithubPrCandidate,
  b: GithubPrCandidate,
): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
    return ta - tb;
  }
  if (!Number.isFinite(ta) && Number.isFinite(tb)) {
    return 1;
  }
  if (Number.isFinite(ta) && !Number.isFinite(tb)) {
    return -1;
  }
  return a.url.localeCompare(b.url);
}

@Injectable()
export class GithubPrScoutService implements GithubPrScoutPort {
  /**
   * Open PRs requesting review from the authenticated `gh` user.
   * Uses `gh search prs` (no local git repo required); host comes from `gh` auth default.
   * Results are ordered oldest PR first (`createdAt` ascending) for stable board limits.
   */
  listReviewRequestedForMe(): GithubPrCandidate[] {
    const proc = spawnSync(
      'gh',
      [
        'search',
        'prs',
        '--review-requested=@me',
        '--state=open',
        '--json',
        'number,title,url,createdAt,repository,author',
        '--limit',
        '200',
      ],
      {
        encoding: 'utf-8',
        env: { ...process.env } as NodeJS.ProcessEnv,
        cwd: tmpdir(),
      },
    );

    if (proc.status !== 0) {
      const hint = [proc.stderr, proc.stdout].filter(Boolean).join('\n').trim();
      throw new Error(hint || 'gh search prs failed');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(proc.stdout || '[]') as unknown;
    } catch {
      throw new Error('gh search prs: invalid JSON');
    }

    const validated = ghSearchPrsResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      const msg = validated.error.issues.map((i) => i.message).join('; ');
      throw new Error(`gh search prs: unexpected response shape (${msg})`);
    }

    const mapped = validated.data.map((row) => ({
      number: row.number,
      title: row.title,
      url: row.url,
      createdAt: row.createdAt,
      githubRepo: row.repository.nameWithOwner.trim().toLowerCase(),
      headRefName: WORKSPACE_BRANCH,
      authorLogin: row.author.login.trim(),
    }));
    mapped.sort(compareCandidatesOldestFirst);
    return mapped;
  }
}
