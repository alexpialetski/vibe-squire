/** SQLite `ScoutState.scoutId` for the GitHub PR review queue scout. */
export const GITHUB_PR_SCOUT_ID = 'github-pr-reviews';

/** Fallback when effective `kanban_done_status` is empty (setting + env). */
export const DEFAULT_KANBAN_DONE_STATUS = 'Done';

/** @deprecated Use `DEFAULT_KANBAN_DONE_STATUS` or effective setting. */
export const KANBAN_TERMINAL_STATUS = DEFAULT_KANBAN_DONE_STATUS;
