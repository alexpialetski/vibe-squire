import {
  CORE_SETTING_DEFINITIONS,
  MAX_BOARD_PR_COUNT_CAP,
} from './core-setting-keys';

export { MAX_BOARD_PR_COUNT_CAP } from './core-setting-keys';

const DEFAULT_MAX =
  parseInt(CORE_SETTING_DEFINITIONS.max_board_pr_count.defaultValue, 10) || 5;

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
