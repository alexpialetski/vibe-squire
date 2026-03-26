import {
  buildSetupChecklist,
  destinationTypeLabel,
  escapeForPre,
  parseSetupDestinationType,
  parseSetupSourceType,
  presentActivityRunsForView,
  sourceTypeLabel,
  uiNavLocals,
  type PollRunRowForActivity,
} from '../ui-presenter';
import type { SetupEvaluation } from '../../setup/setup-evaluation.service';

function baseEv(over: Partial<SetupEvaluation> = {}): SetupEvaluation {
  return {
    complete: false,
    integrationsConfigured: false,
    mappingCount: 0,
    sourceType: '',
    destinationType: '',
    vkMcpReady: false,
    hasRouting: false,
    ...over,
  };
}

describe('ui-presenter', () => {
  describe('escapeForPre', () => {
    it('escapes ampersand and angle brackets', () => {
      expect(escapeForPre('a<b>&c')).toBe('a&lt;b&gt;&amp;c');
    });
  });

  describe('parseSetupSourceType', () => {
    it('returns empty for undefined, null, empty, none', () => {
      expect(parseSetupSourceType(undefined)).toBe('');
      expect(parseSetupSourceType(null)).toBe('');
      expect(parseSetupSourceType('')).toBe('');
      expect(parseSetupSourceType('  ')).toBe('');
      expect(parseSetupSourceType('none')).toBe('');
    });
    it('returns github for github', () => {
      expect(parseSetupSourceType('github')).toBe('github');
    });
    it('returns null for invalid', () => {
      expect(parseSetupSourceType(1)).toBe(null);
      expect(parseSetupSourceType('gitlab')).toBe(null);
    });
  });

  describe('parseSetupDestinationType', () => {
    it('returns vibe_kanban when set', () => {
      expect(parseSetupDestinationType('vibe_kanban')).toBe('vibe_kanban');
    });
    it('returns null for unknown', () => {
      expect(parseSetupDestinationType('jira')).toBe(null);
    });
  });

  describe('sourceTypeLabel / destinationTypeLabel', () => {
    it('maps known types', () => {
      expect(sourceTypeLabel('github')).toBe('GitHub');
      expect(destinationTypeLabel('vibe_kanban')).toBe('Vibe Kanban');
    });
    it('shows placeholder for empty', () => {
      expect(sourceTypeLabel('')).toBe('(not set)');
      expect(destinationTypeLabel('')).toBe('(not set)');
    });
  });

  describe('buildSetupChecklist', () => {
    it('returns empty when complete or integrations not configured', () => {
      expect(buildSetupChecklist(baseEv({ complete: true }))).toEqual([]);
      expect(
        buildSetupChecklist(baseEv({ integrationsConfigured: false })),
      ).toEqual([]);
    });
    it('includes MCP row when VK destination and MCP not ready', () => {
      const rows = buildSetupChecklist(
        baseEv({
          integrationsConfigured: true,
          destinationType: 'vibe_kanban',
          vkMcpReady: false,
        }),
      );
      expect(rows.some((r) => r.text.includes('MCP stdio'))).toBe(true);
    });
  });

  describe('presentActivityRunsForView', () => {
    it('adds phaseLabel and decisionLabel', () => {
      const startedAt = new Date('2025-01-01T12:00:00.000Z');
      const row = {
        id: 'run1',
        startedAt,
        finishedAt: startedAt,
        trigger: 'manual',
        phase: 'completed',
        abortReason: null,
        errorMessage: null,
        candidatesCount: 1,
        issuesCreated: 0,
        skippedUnmapped: 0,
        skippedBot: 0,
        skippedBoardLimit: 0,
        skippedAlreadyTracked: 0,
        skippedLinkedExisting: 0,
        items: [
          {
            id: 'item1',
            runId: 'run1',
            prUrl: 'https://github.com/o/r/pull/1',
            githubRepo: 'o/r',
            prNumber: 1,
            prTitle: 'T',
            authorLogin: null,
            decision: 'created',
            detail: null,
            kanbanIssueId: 'k1',
          },
        ],
      } satisfies PollRunRowForActivity;
      const [out] = presentActivityRunsForView([row]);
      expect(out.phaseLabel).toBe('Completed');
      expect(out.phase).toBe('completed');
      expect(out.items[0]?.decisionLabel).toBe('Created Kanban issue');
      expect(out.items[0]?.decision).toBe('created');
    });
  });

  describe('uiNavLocals', () => {
    it('minimal nav when integrations not configured', () => {
      const l = uiNavLocals(baseEv({ integrationsConfigured: false }));
      expect(l.navMinimal).toBe(true);
      expect(l.showNavVkTools).toBe(false);
      expect(l.showNavGithubSettings).toBe(false);
    });
    it('shows GitHub nav when github source', () => {
      const l = uiNavLocals(
        baseEv({
          integrationsConfigured: true,
          sourceType: 'github',
          destinationType: 'vibe_kanban',
        }),
      );
      expect(l.navMinimal).toBe(false);
      expect(l.showNavGithubSettings).toBe(true);
      expect(l.showNavVkTools).toBe(true);
    });
  });
});
