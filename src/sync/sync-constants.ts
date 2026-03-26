/** SQLite `ScoutState.scoutId` for the GitHub PR review queue scout. */
export const GITHUB_PR_SCOUT_ID = 'github-pr-reviews';

/** Migrated rows without a real VK repo; treat as unmapped until user fixes mapping. */
export const PLACEHOLDER_VK_REPO_ID = '00000000-0000-4000-8000-000000000000';

/** Fallback when effective `kanban_done_status` is empty (setting + env). */
export const DEFAULT_KANBAN_DONE_STATUS = 'Done';

/** @deprecated Use `DEFAULT_KANBAN_DONE_STATUS` or effective setting. */
export const KANBAN_TERMINAL_STATUS = DEFAULT_KANBAN_DONE_STATUS;
