import type { StatusSnapshot } from '@vibe-squire/shared';
import { CardSection } from '../molecules/CardSection';
import { StatusPill } from '../molecules/StatusPill';

type DatabaseStatusCardProps = {
  status: StatusSnapshot['database'];
};

export function DatabaseStatusCard({ status }: DatabaseStatusCardProps) {
  return (
    <CardSection title="Database">
      <StatusPill state={status.state} />
      {status.message ? <p className="muted">{status.message}</p> : null}
    </CardSection>
  );
}
