import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { SettingsService } from '../settings/settings.service';
import type { GithubPrScoutPort } from '../ports/github-scout.port';
import { parseGitHubPrUrl } from './github-pr-url';

export type GithubPrCandidate = {
  number: number;
  title: string;
  url: string;
  githubRepo: string;
  /** PR head branch ref (for `start_workspace`). */
  headRefName: string;
  /** From `gh pr list --json author`; used for bot skip rules. */
  authorLogin?: string;
};

@Injectable()
export class GithubPrScoutService implements GithubPrScoutPort {
  constructor(private readonly settings: SettingsService) {}

  /**
   * PRs currently requesting review from the authenticated `gh` user.
   */
  listReviewRequestedForMe(): GithubPrCandidate[] {
    const ghHost = this.settings.getEffective('gh_host');
    const env = { ...process.env } as NodeJS.ProcessEnv;
    if (ghHost) {
      env.GH_HOST = ghHost;
    }

    const proc = spawnSync(
      'gh',
      [
        'pr',
        'list',
        '--search',
        'review-requested:@me',
        '--json',
        'number,title,url,headRefName,author',
        '--limit',
        '200',
      ],
      { encoding: 'utf-8', env },
    );

    if (proc.status !== 0) {
      const hint = [proc.stderr, proc.stdout].filter(Boolean).join('\n').trim();
      throw new Error(hint || 'gh pr list failed');
    }

    let rows: Array<{
      number: number;
      title: string;
      url: string;
      headRefName?: string;
      author?: { login?: string };
    }>;
    try {
      rows = JSON.parse(proc.stdout || '[]') as Array<{
        number: number;
        title: string;
        url: string;
        headRefName?: string;
        author?: { login?: string };
      }>;
    } catch {
      throw new Error('gh pr list: invalid JSON');
    }

    const out: GithubPrCandidate[] = [];
    for (const row of rows) {
      const parsed = parseGitHubPrUrl(row.url);
      if (!parsed) {
        continue;
      }
      const head =
        typeof row.headRefName === 'string' && row.headRefName.trim()
          ? row.headRefName.trim()
          : 'main';
      const authorLogin =
        typeof row.author?.login === 'string' && row.author.login.trim()
          ? row.author.login.trim()
          : undefined;
      out.push({
        number: row.number,
        title: row.title,
        url: row.url,
        githubRepo: parsed.ownerRepo,
        headRefName: head,
        ...(authorLogin ? { authorLogin } : {}),
      });
    }
    return out;
  }
}
