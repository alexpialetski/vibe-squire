import {
  buildSetupChecklist,
  destinationTypeLabel,
  escapeForPre,
  presentActivityRunsForView,
  SETUP_REASON_MESSAGES,
  setupReasonHuman,
  sourceTypeLabel,
  uiNavLocals,
  type PollRunRowForActivity,
} from '../ui-presenter';
import type { SetupEvaluation } from '../../setup/setup-evaluation.service';
import type { UiNavEntry } from '../../ports/ui-nav.types';

function baseEv(over: Partial<SetupEvaluation> = {}): SetupEvaluation {
  return {
    complete: false,
    mappingCount: 0,
    sourceType: '',
    destinationType: '',
    destinationMcpConfigured: false,
    hasRouting: false,
    ...over,
  };
}

const sampleNav: UiNavEntry[] = [
  { id: 'github', label: 'GitHub', href: '/ui/github' },
  { id: 'mappings', label: 'Mappings', href: '/ui/mappings' },
  { id: 'vibe_kanban', label: 'Vibe Kanban', href: '/ui/vibe-kanban' },
];

describe('ui-presenter', () => {
  describe('escapeForPre', () => {
    it('escapes ampersand, angle brackets, and double quotes', () => {
      expect(escapeForPre('a<b>&c')).toBe('a&lt;b&gt;&amp;c');
      expect(escapeForPre('x="1"')).toBe('x=&quot;1&quot;');
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
    it('returns empty when setup is complete', () => {
      expect(buildSetupChecklist(baseEv({ complete: true }))).toEqual([]);
    });
    it('includes MCP row when VK destination and MCP not ready', () => {
      const rows = buildSetupChecklist(
        baseEv({
          destinationType: 'vibe_kanban',
          destinationMcpConfigured: false,
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

  describe('setupReasonHuman', () => {
    it('returns message for known reason codes', () => {
      expect(setupReasonHuman('no_mappings')).toBe(
        SETUP_REASON_MESSAGES['no_mappings'],
      );
      expect(setupReasonHuman('vk_mcp_stdio_invalid')).toBe(
        SETUP_REASON_MESSAGES['vk_mcp_stdio_invalid'],
      );
    });
    it('returns fallback for unknown reason', () => {
      expect(setupReasonHuman('something_new')).toBe('something_new');
    });
    it('returns default for undefined', () => {
      expect(setupReasonHuman(undefined)).toBe('Incomplete setup.');
    });
  });

  describe('uiNavLocals', () => {
    it('passes entries through for the nav partial', () => {
      const l = uiNavLocals(sampleNav);
      expect(l.navMinimal).toBe(false);
      expect(l.integrationNavEntries).toBe(sampleNav);
    });
  });
});
