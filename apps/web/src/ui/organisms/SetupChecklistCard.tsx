import {
  setupChecklistRowSchema,
  type StatusSnapshot,
} from '@vibe-squire/shared';
import type { z } from 'zod';
import { KeyValue } from '../atoms/KeyValue';
import { ChecklistItem } from '../molecules/ChecklistItem';
import { CardSection } from '../molecules/CardSection';

type SetupChecklistRow = z.infer<typeof setupChecklistRowSchema>;

type SetupChecklistCardProps = {
  setup: StatusSnapshot['setup'];
  items?: SetupChecklistRow[];
};

export function SetupChecklistCard({ setup, items }: SetupChecklistCardProps) {
  const checklistItems = items ?? [];

  return (
    <CardSection title="Setup checklist">
      <KeyValue label="Complete" value={setup.complete ? 'yes' : 'no'} />
      <KeyValue label="Mappings" value={String(setup.mappingCount)} />
      {setup.reason ? <KeyValue label="Reason" value={setup.reason} /> : null}
      {checklistItems.length > 0 ? (
        <ul className="setup-checklist">
          {checklistItems.map((item) => (
            <ChecklistItem
              key={`${item.text}-${item.linkHref ?? ''}`}
              text={item.text}
              linkHref={item.linkHref}
              linkLabel={item.linkLabel}
            />
          ))}
        </ul>
      ) : null}
    </CardSection>
  );
}
