import { useEffect, useState } from 'react';
import type { StatusSnapshot } from '@vibe-squire/shared';
import { formatIsoDateTime } from '../format-date-time';
import { KeyValue } from '../atoms/KeyValue';
import { CardSection } from '../molecules/CardSection';
import { StatusPill } from '../molecules/StatusPill';

type ManualSyncCalloutProps = {
  manualSync: StatusSnapshot['manual_sync'];
  onSyncNow: () => void;
  syncNowPending?: boolean;
};

/** True if manual sync is allowed, including when cached status is stale (cooldown ended, no status event). */
function isManualSyncRunnable(
  m: StatusSnapshot['manual_sync'],
  nowMs: number,
): boolean {
  if (m.canRun) {
    return true;
  }
  if (m.reason !== 'cooldown' || !m.cooldownUntil) {
    return false;
  }
  const end = Date.parse(m.cooldownUntil);
  if (!Number.isFinite(end)) {
    return false;
  }
  return nowMs >= end;
}

/**
 * Status updates are push-driven (emitChanged). Cooldown expiry is not — Apollo cache can stay at canRun: false
 * until the next poll or other event. Schedule a re-render for when the server-provided cooldown instant passes.
 */
function useManualSyncRerenderWhenCooldownEnds(
  m: StatusSnapshot['manual_sync'],
) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (m.canRun || m.reason !== 'cooldown' || !m.cooldownUntil) {
      return;
    }
    const endMs = Date.parse(m.cooldownUntil);
    if (!Number.isFinite(endMs)) {
      return;
    }
    const delay = endMs - Date.now();
    if (delay <= 0) {
      return;
    }
    const id = setTimeout(() => {
      setTick((t) => t + 1);
    }, delay + 50);
    return () => {
      clearTimeout(id);
    };
  }, [m.canRun, m.reason, m.cooldownUntil]);
}

function resolveManualSyncView(manualSync: StatusSnapshot['manual_sync']): {
  state: 'ok' | 'degraded' | 'error';
  label: string;
  reasonText?: string;
} {
  if (manualSync.canRun) {
    return { state: 'ok', label: 'runnable' };
  }

  if (manualSync.reason === 'cooldown') {
    return {
      state: 'degraded',
      label: 'cooldown',
      reasonText: 'Cooldown active',
    };
  }

  if (manualSync.reason === 'already_running') {
    return {
      state: 'degraded',
      label: 'busy',
      reasonText: 'Sync is already running',
    };
  }

  if (manualSync.reason === 'setup_incomplete') {
    return {
      state: 'degraded',
      label: 'setup required',
      reasonText: 'Finish setup checklist to enable manual sync',
    };
  }

  if (manualSync.reason) {
    return { state: 'error', label: 'blocked', reasonText: manualSync.reason };
  }

  return { state: 'degraded', label: 'blocked' };
}

export function ManualSyncCallout({
  manualSync,
  onSyncNow,
  syncNowPending = false,
}: ManualSyncCalloutProps) {
  useManualSyncRerenderWhenCooldownEnds(manualSync);

  const now = Date.now();
  const canRunNow = isManualSyncRunnable(manualSync, now);
  const view = resolveManualSyncView(
    canRunNow && !manualSync.canRun ? { canRun: true } : manualSync,
  );

  return (
    <CardSection title="Manual sync">
      <StatusPill state={view.state} label={view.label} />
      <div className="actions-row manual-sync-actions">
        <button
          type="button"
          className="btn primary btn-sm"
          disabled={!canRunNow || syncNowPending}
          onClick={onSyncNow}
        >
          {syncNowPending ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
      {view.reasonText ? <p className="muted">{view.reasonText}</p> : null}
      {manualSync.cooldownUntil && !isManualSyncRunnable(manualSync, now) ? (
        <KeyValue
          label="Cooldown until"
          value={formatIsoDateTime(manualSync.cooldownUntil)}
        />
      ) : null}
    </CardSection>
  );
}
