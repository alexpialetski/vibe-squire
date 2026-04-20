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
  const view = resolveManualSyncView(manualSync);

  return (
    <CardSection title="Manual sync">
      <StatusPill state={view.state} label={view.label} />
      <div className="actions-row manual-sync-actions">
        <button
          type="button"
          className="btn primary btn-sm"
          disabled={!manualSync.canRun || syncNowPending}
          onClick={onSyncNow}
        >
          {syncNowPending ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
      {view.reasonText ? <p className="muted">{view.reasonText}</p> : null}
      {manualSync.cooldownUntil ? (
        <KeyValue
          label="Cooldown until"
          value={formatIsoDateTime(manualSync.cooldownUntil)}
        />
      ) : null}
    </CardSection>
  );
}
