import { validateStatusSnapshot } from '../status-snapshot.schema';

describe('validateStatusSnapshot', () => {
  const minimal = {
    timestamp: '2026-01-01T00:00:00.000Z',
    gh: { state: 'ok' as const },
    database: { state: 'ok' as const },
    setup: {
      integrationsConfigured: true,
      complete: true,
      mappingCount: 0,
    },
    configuration: {
      source_type: 'github',
      destination_type: 'vibe_kanban',
      vk_mcp_configured: false,
    },
    destinations: [{ id: 'vibe_kanban', state: 'unknown' as const }],
    scouts: [
      {
        id: 'github_pr',
        state: 'idle' as const,
        last_poll: {
          candidates_count: null,
          skipped_unmapped: null,
          issues_created: null,
        },
      },
    ],
    manual_sync: { canRun: true },
    scheduled_sync: { enabled: true },
  };

  it('accepts minimal valid snapshot', () => {
    expect(validateStatusSnapshot(minimal)).toBeNull();
  });

  it('rejects invalid gh.state', () => {
    expect(
      validateStatusSnapshot({
        ...minimal,
        gh: { state: 'nope' },
      }),
    ).not.toBeNull();
  });
});
