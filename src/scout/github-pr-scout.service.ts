import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { GithubPrScoutPort } from '../ports/github-scout.port';
import { parseGitHubPrUrl } from './github-pr-url';

/** Branch passed to `start_workspace` for every PR (PR head not fetched). */
const WORKSPACE_BRANCH = 'main';

export type GithubPrCandidate = {
  number: number;
  title: string;
  url: string;
  githubRepo: string;
  /** Fixed branch for `start_workspace` (not the PR head). */
  headRefName: string;
  /** From `gh search prs --json author`; used for bot skip rules. */
  authorLogin?: string;
};

type SearchRow = {
  number: number;
  title: string;
  url: string;
  repository?: { nameWithOwner?: string } | string;
  author?: { login?: string };
};

function ownerRepoFromSearchRow(row: SearchRow): string | null {
  const r = row.repository;
  if (typeof r === 'string' && r.includes('/')) {
    return r.trim().toLowerCase();
  }
  if (r && typeof r === 'object') {
    const nwo = r.nameWithOwner;
    if (typeof nwo === 'string' && nwo.includes('/')) {
      return nwo.trim().toLowerCase();
    }
  }
  const parsed = parseGitHubPrUrl(row.url);
  return parsed ? parsed.ownerRepo : null;
}

@Injectable()
export class GithubPrScoutService implements GithubPrScoutPort {
  /**
   * Open PRs requesting review from the authenticated `gh` user.
   * Uses `gh search prs` (no local git repo required); host comes from `gh` auth default.
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
        'number,title,url,repository,author',
        '--limit',
        '200',
      ],
      { encoding: 'utf-8', env: { ...process.env } as NodeJS.ProcessEnv, cwd: tmpdir() },
    );

    if (proc.status !== 0) {
      const hint = [proc.stderr, proc.stdout].filter(Boolean).join('\n').trim();
      throw new Error(hint || 'gh search prs failed');
    }

    let rows: SearchRow[];
    try {
      rows = JSON.parse(proc.stdout || '[]') as SearchRow[];
    } catch {
      throw new Error('gh search prs: invalid JSON');
    }

    const out: GithubPrCandidate[] = [];
    for (const row of rows) {
      const githubRepo = ownerRepoFromSearchRow(row);
      if (!githubRepo) {
        continue;
      }
      const authorLogin =
        typeof row.author?.login === 'string' && row.author.login.trim()
          ? row.author.login.trim()
          : undefined;
      out.push({
        number: row.number,
        title: row.title,
        url: row.url,
        githubRepo,
        headRefName: WORKSPACE_BRANCH,
        ...(authorLogin ? { authorLogin } : {}),
      });
    }
    return out;
  }
}
