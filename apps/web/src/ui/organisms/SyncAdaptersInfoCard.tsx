import { CardSection } from '../molecules/CardSection';

type SyncAdaptersInfoCardProps = {
  resolvedSourceLabel: string;
  resolvedDestinationLabel: string;
};

export function SyncAdaptersInfoCard({
  resolvedSourceLabel,
  resolvedDestinationLabel,
}: SyncAdaptersInfoCardProps) {
  return (
    <CardSection title="Sync adapters">
      <p className="muted sync-adapters-lead">
        Active source → destination for this process (from environment and
        settings).
      </p>
      <p>
        <strong>{resolvedSourceLabel}</strong>
        <span className="muted"> → </span>
        <strong>{resolvedDestinationLabel}</strong>
      </p>
      <dl className="field-hints-dl">
        <div>
          <dt className="muted">Source type env</dt>
          <dd>
            <code>VIBE_SQUIRE_SOURCE_TYPE</code>
          </dd>
        </div>
        <div>
          <dt className="muted">Destination type env</dt>
          <dd>
            <code>VIBE_SQUIRE_DESTINATION_TYPE</code>
          </dd>
        </div>
      </dl>
    </CardSection>
  );
}
