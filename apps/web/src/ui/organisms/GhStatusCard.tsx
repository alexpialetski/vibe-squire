import type { StatusSnapshot } from '@vibe-squire/shared';
import { CardSection } from '../molecules/CardSection';
import { StatusPill } from '../molecules/StatusPill';

type GhStatusCardProps = {
  status: StatusSnapshot['gh'];
};

export function GhStatusCard({ status }: GhStatusCardProps) {
  return (
    <CardSection title="GitHub">
      <StatusPill state={status.state} />
      {status.message ? <p className="muted">{status.message}</p> : null}
    </CardSection>
  );
}
