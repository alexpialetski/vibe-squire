/** True when Kanban issue status looks terminal (done / closed / cancelled). */
export function isTerminalKanbanStatus(status: string | undefined): boolean {
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
