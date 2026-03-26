import {
  isValidVkRepoId,
  issueTitleForPr,
  workspaceNameForPr,
} from './poll-pr-kanban-copy';
import { PLACEHOLDER_VK_REPO_ID } from '../sync-constants';
import { VIBE_SQUIRE_TITLE_MARKER } from '../../vibe-kanban/vk-mcp-list-get-issue-response.schema';

const basePr = {
  number: 42,
  title: 'Fix thing',
  url: 'https://github.com/o/r/pull/42',
  githubRepo: 'o/r',
  createdAt: '2026-01-01T00:00:00Z',
  headRefName: 'fix',
  authorLogin: 'u',
};

describe('poll-pr-kanban-copy', () => {
  describe('isValidVkRepoId', () => {
    it('rejects empty and placeholder UUID', () => {
      expect(isValidVkRepoId('')).toBe(false);
      expect(isValidVkRepoId('  ')).toBe(false);
      expect(isValidVkRepoId(PLACEHOLDER_VK_REPO_ID)).toBe(false);
    });
    it('accepts non-placeholder id', () => {
      expect(isValidVkRepoId('11111111-1111-4111-8111-111111111111')).toBe(
        true,
      );
    });
  });

  describe('issueTitleForPr', () => {
    it('prefixes marker and uses title when present', () => {
      expect(issueTitleForPr(basePr)).toBe(
        `${VIBE_SQUIRE_TITLE_MARKER} PR #42: Fix thing`,
      );
    });
    it('omits empty title segment', () => {
      expect(issueTitleForPr({ ...basePr, title: '  ' })).toBe(
        `${VIBE_SQUIRE_TITLE_MARKER} PR #42`,
      );
    });
  });

  describe('workspaceNameForPr', () => {
    it('truncates long titles with ellipsis', () => {
      const longTitle = 'x'.repeat(200);
      const ws = workspaceNameForPr({ ...basePr, title: longTitle });
      expect(ws.length).toBe(120);
      expect(ws.endsWith('…')).toBe(true);
    });
  });
});
