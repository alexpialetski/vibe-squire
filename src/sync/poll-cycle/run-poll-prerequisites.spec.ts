import { runPollPrerequisites } from './run-poll-prerequisites';
import type { GhCliService } from '../../gh/gh-cli.service';
import type { SetupEvaluationService } from '../../setup/setup-evaluation.service';
import type { SyncDestinationBoardPort } from '../../ports/sync-destination-board.port';

function setupSvc(complete: boolean): SetupEvaluationService {
  return {
    evaluate: jest.fn().mockResolvedValue({ complete }),
  } as unknown as SetupEvaluationService;
}

function ghSvc(state: 'ok' | 'not_authenticated'): GhCliService {
  return {
    checkAuth: jest.fn().mockReturnValue({ state }),
  } as unknown as GhCliService;
}

function board(probeImpl: () => Promise<void>): SyncDestinationBoardPort {
  return {
    probe: jest.fn().mockImplementation(probeImpl),
  } as unknown as SyncDestinationBoardPort;
}

describe('runPollPrerequisites', () => {
  it('aborts with setup_incomplete when setup is not complete', async () => {
    const r = await runPollPrerequisites(
      setupSvc(false),
      ghSvc('ok'),
      board(async () => {}),
      jest.fn(),
      jest.fn(),
    );
    expect(r).toEqual({ kind: 'aborted', reason: 'setup_incomplete' });
  });

  it('aborts with gh_* when GitHub auth is not ok', async () => {
    const r = await runPollPrerequisites(
      setupSvc(true),
      ghSvc('not_authenticated'),
      board(async () => {}),
      jest.fn(),
      jest.fn(),
    );
    expect(r).toEqual({ kind: 'aborted', reason: 'gh_not_authenticated' });
  });

  it('returns probe_failed and calls onMcpProbeFailed when probe throws', async () => {
    const onOk = jest.fn();
    const onFail = jest.fn();
    const r = await runPollPrerequisites(
      setupSvc(true),
      ghSvc('ok'),
      board(async () => {
        throw new Error('boom');
      }),
      onOk,
      onFail,
    );
    expect(r).toEqual({ kind: 'probe_failed', message: 'boom' });
    expect(onOk).not.toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledWith('boom');
  });

  it('returns ok and calls onMcpHealthy when probe succeeds', async () => {
    const onOk = jest.fn();
    const onFail = jest.fn();
    const r = await runPollPrerequisites(
      setupSvc(true),
      ghSvc('ok'),
      board(async () => {}),
      onOk,
      onFail,
    );
    expect(r).toEqual({ kind: 'ok' });
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });
});
