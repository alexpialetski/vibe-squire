import type { GhCliService } from '../../gh/gh-cli.service';
import type { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import type { SyncDestinationBoardPort } from '../../ports/sync-destination-board.port';

/**
 * Outcome of the poll cycle gate: setup, GitHub CLI, then Vibe Kanban board MCP probe.
 * Persistence and `PollRunHistory` completion stay in {@link RunPollCycleService.execute}.
 */
export type PollPrerequisitesResult =
  | { kind: 'ok' }
  | { kind: 'aborted'; reason: string }
  | { kind: 'probe_failed'; message: string };

/**
 * Runs setup evaluation, `gh` auth check, and `destinationBoard.probe()`.
 * On successful probe, calls `onMcpHealthy` (typically updates `SyncRunStateService`).
 * On probe throw, calls `onMcpProbeFailed` before returning `probe_failed`.
 */
export async function runPollPrerequisites(
  setupEvaluation: SetupEvaluationService,
  gh: GhCliService,
  destinationBoard: SyncDestinationBoardPort,
  onMcpHealthy: () => void,
  onMcpProbeFailed: (message: string) => void,
): Promise<PollPrerequisitesResult> {
  const setupEv = await setupEvaluation.evaluate();
  if (!setupEv.complete) {
    return { kind: 'aborted', reason: 'setup_incomplete' };
  }

  const ghResult = gh.checkAuth();
  if (ghResult.state !== 'ok') {
    return { kind: 'aborted', reason: `gh_${ghResult.state}` };
  }

  try {
    await destinationBoard.probe();
    onMcpHealthy();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onMcpProbeFailed(msg);
    return { kind: 'probe_failed', message: msg };
  }

  return { kind: 'ok' };
}
