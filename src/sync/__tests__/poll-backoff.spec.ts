import { computeBackoffNextPollAtMs } from '../poll-backoff';

describe('computeBackoffNextPollAtMs', () => {
  const fromMs = Date.UTC(2025, 0, 1, 12, 0, 0);

  it('streak 1 uses 1× base interval (+ jitter)', () => {
    const ms = computeBackoffNextPollAtMs({
      fromMs,
      streak: 1,
      pollIntervalMinutes: 10,
      jitterMaxSeconds: 0,
      jitterMs: 0,
    });
    expect(ms - fromMs).toBe(10 * 60_000);
  });

  it('streak 2 uses 2× base interval', () => {
    const ms = computeBackoffNextPollAtMs({
      fromMs,
      streak: 2,
      pollIntervalMinutes: 10,
      jitterMaxSeconds: 0,
      jitterMs: 0,
    });
    expect(ms - fromMs).toBe(20 * 60_000);
  });

  it('streak 6 uses 32× base but capped at 30 minutes', () => {
    const ms = computeBackoffNextPollAtMs({
      fromMs,
      streak: 6,
      pollIntervalMinutes: 10,
      jitterMaxSeconds: 0,
      jitterMs: 0,
    });
    expect(ms - fromMs).toBe(30 * 60_000);
  });

  it('adds explicit jitterMs', () => {
    const ms = computeBackoffNextPollAtMs({
      fromMs,
      streak: 1,
      pollIntervalMinutes: 1,
      jitterMaxSeconds: 30,
      jitterMs: 5000,
    });
    expect(ms - fromMs).toBe(60_000 + 5000);
  });
});
