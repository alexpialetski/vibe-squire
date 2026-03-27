import { SETTING_DEFINITIONS } from './setting-keys';

/** Upper bound for `max_board_pr_count` (operator sanity). */
export const MAX_BOARD_PR_COUNT_CAP = 200;

const DEFAULT_MAX =
  parseInt(SETTING_DEFINITIONS.max_board_pr_count.defaultValue, 10) || 5;

/**
 * Effective max concurrent PRs with Kanban rows among the current review queue.
 * Invalid stored/env values fall back to the code default (5).
 */
export function resolveMaxBoardPrCount(raw: string): number {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_MAX;
  }
  return Math.min(n, MAX_BOARD_PR_COUNT_CAP);
}

/** True if the string is a valid setting value (1..MAX_BOARD_PR_COUNT_CAP, digits only). */
export function isValidMaxBoardPrCountInput(value: string): boolean {
  const t = value.trim();
  if (!/^\d+$/.test(t)) {
    return false;
  }
  const n = parseInt(t, 10);
  return n >= 1 && n <= MAX_BOARD_PR_COUNT_CAP;
}
