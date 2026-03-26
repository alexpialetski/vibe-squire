/** Result of matching or creating a Kanban issue for one GitHub PR in a poll cycle. */
export type EnsureIssueOutcome =
  | { kind: 'created'; kanbanIssueId: string }
  | { kind: 'already_tracked'; kanbanIssueId: string }
  | { kind: 'linked_existing'; kanbanIssueId: string }
  | { kind: 'skipped_unmapped' }
  | { kind: 'skipped_board_limit' };
