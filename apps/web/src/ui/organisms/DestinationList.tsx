import type { StatusSnapshot } from '@vibe-squire/shared';
import { formatIsoDateTime } from '../format-date-time';
import { KeyValue } from '../atoms/KeyValue';
import { CardSection } from '../molecules/CardSection';
import { StatusPill } from '../molecules/StatusPill';

type DestinationListProps = {
  destinations: StatusSnapshot['destinations'];
};

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function DestinationList({ destinations }: DestinationListProps) {
  return (
    <CardSection title="Destinations">
      {destinations.length === 0 ? (
        <p className="muted">No destinations</p>
      ) : null}
      <ul className="id-list">
        {destinations.map((destination) => {
          const dynamic = destination as Record<string, unknown>;
          const lastOkAt = readOptionalString(dynamic.lastOkAt);
          const message = readOptionalString(dynamic.message);

          return (
            <li key={destination.id}>
              <StatusPill state={destination.state} />
              <KeyValue label="ID" value={destination.id} />
              {lastOkAt ? (
                <KeyValue label="Last ok" value={formatIsoDateTime(lastOkAt)} />
              ) : null}
              {message ? <p className="muted">{message}</p> : null}
            </li>
          );
        })}
      </ul>
    </CardSection>
  );
}
