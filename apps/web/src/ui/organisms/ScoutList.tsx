import type { StatusSnapshot } from '@vibe-squire/shared';
import { formatIsoDateTime } from '../format-date-time';
import { KeyValue } from '../atoms/KeyValue';
import { CardSection } from '../molecules/CardSection';
import { StatusPill } from '../molecules/StatusPill';

type ScoutListProps = {
  scouts: StatusSnapshot['scouts'];
};

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function formatPollNumber(value: unknown): string {
  return typeof value === 'number' ? String(value) : 'n/a';
}

export function ScoutList({ scouts }: ScoutListProps) {
  return (
    <CardSection title="Scouts">
      {scouts.length === 0 ? <p className="muted">No scouts</p> : null}
      <ul className="id-list">
        {scouts.map((scout) => {
          const dynamic = scout as Record<string, unknown>;
          const lastPollAt = readOptionalString(dynamic.lastPollAt);
          const nextPollAt = readOptionalString(dynamic.nextPollAt);
          const lastPoll = scout.last_poll;

          return (
            <li key={scout.id}>
              <StatusPill state={scout.state} />
              <KeyValue label="ID" value={scout.id} />
              {lastPollAt ? (
                <KeyValue
                  label="Last poll"
                  value={formatIsoDateTime(lastPollAt)}
                />
              ) : null}
              {nextPollAt ? (
                <KeyValue
                  label="Next poll"
                  value={formatIsoDateTime(nextPollAt)}
                />
              ) : null}
              {lastPoll ? (
                <>
                  <KeyValue
                    label="Candidates"
                    value={formatPollNumber(lastPoll.candidates_count)}
                  />
                  <KeyValue
                    label="Skipped"
                    value={formatPollNumber(lastPoll.skipped_unmapped)}
                  />
                  <KeyValue
                    label="Issues created"
                    value={formatPollNumber(lastPoll.issues_created)}
                  />
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </CardSection>
  );
}
