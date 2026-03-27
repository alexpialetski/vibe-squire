import { runPollPrerequisites } from '../run-poll-prerequisites';
import type { SetupEvaluationService } from '../../../setup/setup-evaluation.service';
import type { DestinationBoardPort } from '../../../ports/destination-board.port';
import type { SourceStatusProvider } from '../../../ports/source-status.port';

function setupSvc(complete: boolean): SetupEvaluationService {
  return {
    evaluate: jest.fn().mockResolvedValue({ complete }),
  } as unknown as SetupEvaluationService;
}

function sourceSvc(
  state: 'ok' | 'error',
  errors?: { code: string; message: string }[],
): SourceStatusProvider {
  return {
    sourceType: 'github',
    checkReadiness: jest
      .fn()
      .mockReturnValue(errors?.length ? { state, errors } : { state }),
  } as unknown as SourceStatusProvider;
}

function board(probeImpl: () => Promise<void>): DestinationBoardPort {
  return {
    probe: jest.fn().mockImplementation(probeImpl),
  } as unknown as DestinationBoardPort;
}

describe('runPollPrerequisites', () => {
  it('aborts with setup_incomplete when setup is not complete', async () => {
    const r = await runPollPrerequisites(
      setupSvc(false),
      sourceSvc('ok'),
      board(async () => {}),
      jest.fn(),
      jest.fn(),
    );
    expect(r).toEqual({ kind: 'aborted', reason: 'setup_incomplete' });
  });

  it('aborts with source_* when source readiness is not ok', async () => {
    const r = await runPollPrerequisites(
      setupSvc(true),
      sourceSvc('error', [
        { code: 'source_gh_not_authenticated', message: 'no token' },
      ]),
      board(async () => {}),
      jest.fn(),
      jest.fn(),
    );
    expect(r).toEqual({
      kind: 'aborted',
      reason: 'source_gh_not_authenticated',
    });
  });

  it('returns probe_failed and calls onMcpProbeFailed when probe throws', async () => {
    const onOk = jest.fn();
    const onFail = jest.fn();
    const r = await runPollPrerequisites(
      setupSvc(true),
      sourceSvc('ok'),
      board(() => Promise.reject(new Error('boom'))),
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
      sourceSvc('ok'),
      board(async () => {}),
      onOk,
      onFail,
    );
    expect(r).toEqual({ kind: 'ok' });
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });
});
