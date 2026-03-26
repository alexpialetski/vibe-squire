import { isTerminalKanbanStatus } from '../kanban-terminal-status';

describe('isTerminalKanbanStatus', () => {
  it('is false for empty/undefined', () => {
    expect(isTerminalKanbanStatus(undefined)).toBe(false);
    expect(isTerminalKanbanStatus('')).toBe(false);
  });

  it('detects done-like labels case-insensitively', () => {
    expect(isTerminalKanbanStatus('Done')).toBe(true);
    expect(isTerminalKanbanStatus('closed')).toBe(true);
    expect(isTerminalKanbanStatus('Complete')).toBe(true);
    expect(isTerminalKanbanStatus('cancelled')).toBe(true);
    expect(isTerminalKanbanStatus('Open')).toBe(false);
  });
});
