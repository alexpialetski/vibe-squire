import type { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import type { DestinationBoardPort } from '../../ports/destination-board.port';
import type { SourceStatusProvider } from '../../ports/source-status.port';

/**
 * Outcome of the poll cycle gate: setup, source (e.g. GitHub CLI), then destination board probe.
 * Persistence and `PollRunHistory` completion stay in {@link RunPollCycleService.execute}.
 */
export type PollPrerequisitesResult =
  | { kind: 'ok' }
  | { kind: 'aborted'; reason: string }
  | { kind: 'probe_failed'; message: string };

/**
 * Runs setup evaluation, source readiness, and `destinationBoard.probe()`.
 * On successful probe, calls `onDestinationHealthy` (typically updates {@link SyncRunStateService}).
 * On probe throw, calls `onDestinationProbeFailed` before returning `probe_failed`.
 */
export async function runPollPrerequisites(
  setupEvaluation: SetupEvaluationService,
  sourceStatus: SourceStatusProvider,
  destinationBoard: DestinationBoardPort,
  onDestinationHealthy: () => void,
  onDestinationProbeFailed: (message: string) => void,
): Promise<PollPrerequisitesResult> {
  const setupEv = await setupEvaluation.evaluate();
  if (!setupEv.complete) {
    return { kind: 'aborted', reason: 'setup_incomplete' };
  }

  const src = sourceStatus.checkReadiness();
  if (src.state !== 'ok') {
    const reason = src.errors?.[0]?.code ?? `source_${src.state}`;
    return { kind: 'aborted', reason };
  }

  try {
    await destinationBoard.probe();
    onDestinationHealthy();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onDestinationProbeFailed(msg);
    return { kind: 'probe_failed', message: msg };
  }

  return { kind: 'ok' };
}
