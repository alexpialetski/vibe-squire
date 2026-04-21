import type { StatusSnapshot } from '@vibe-squire/shared';
import { CardSection } from '../molecules/CardSection';
import { StatusPill } from '../molecules/StatusPill';

type ScheduledSyncIndicatorProps = {
  scheduledSync: StatusSnapshot['scheduled_sync'];
};

export function ScheduledSyncIndicator({
  scheduledSync,
}: ScheduledSyncIndicatorProps) {
  const state = scheduledSync.enabled ? 'ok' : 'degraded';
  const label = scheduledSync.enabled ? 'enabled' : 'disabled';

  return (
    <CardSection title="Scheduled sync" compact>
      <StatusPill state={state} label={label} />
      {!scheduledSync.enabled ? (
        <p className="muted">Disabled in General settings.</p>
      ) : null}
    </CardSection>
  );
}
