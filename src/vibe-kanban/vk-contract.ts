/**
 * Cross-cutting Vibe Kanban / vibe-squire conventions (titles, issue body markers).
 * Issue list/get Zod helpers live in `vk-list-get-issue-response.schema.ts`.
 */

/** Visible title token for filtering via `list_issues` `search` (leading segment recommended). */
export const VIBE_SQUIRE_TITLE_MARKER = '[vibe-squire]';

/** Opening segment of the hidden PR marker line in issue description. */
export const VIBE_SQUIRE_PR_COMMENT_PREFIX = '<!-- vibe-squire:pr:';

/** `<!-- vibe-squire:pr:${url} -->` — same contract as `RunPollCycleService` issue bodies. */
export function buildVibeSquirePrDescriptionMarker(prUrl: string): string {
  return `${VIBE_SQUIRE_PR_COMMENT_PREFIX}${prUrl} -->`;
}
