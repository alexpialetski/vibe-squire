import type { CoreSettings } from '../settings/core-settings.service';

const MAX_BACKOFF_MS = 30 * 60_000;

export type BackoffParams = {
  fromMs: number;
  streak: number;
  pollIntervalMinutes: number;
  jitterMaxSeconds: number;
  /** Fixed jitter for deterministic tests. */
  jitterMs?: number;
};

/**
 * §11 — Next poll after an error: base interval × 2^(streak-1), capped, plus jitter.
 * `streak` is the new value after increment (≥ 1).
 */
export function computeBackoffNextPollAtMs(p: BackoffParams): number {
  const baseMs = p.pollIntervalMinutes * 60_000;
  const pow = Math.min(5, Math.max(0, p.streak - 1));
  const delay = Math.min(MAX_BACKOFF_MS, baseMs * Math.pow(2, pow));
  const jitter =
    p.jitterMs ?? Math.floor(Math.random() * (p.jitterMaxSeconds + 1)) * 1000;
  return p.fromMs + delay + jitter;
}

export function computeErrorNextPollAt(
  from: Date,
  streak: number,
  coreSettings: CoreSettings,
): Date {
  const ms = computeBackoffNextPollAtMs({
    fromMs: from.getTime(),
    streak,
    pollIntervalMinutes: coreSettings.pollIntervalMinutes,
    jitterMaxSeconds: coreSettings.jitterMaxSeconds,
  });
  return new Date(ms);
}
