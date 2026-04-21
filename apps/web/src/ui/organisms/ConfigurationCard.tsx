import type { StatusSnapshot } from '@vibe-squire/shared';
import { KeyValue } from '../atoms/KeyValue';
import { CardSection } from '../molecules/CardSection';

type ConfigurationCardProps = {
  configuration: StatusSnapshot['configuration'];
};

export function ConfigurationCard({ configuration }: ConfigurationCardProps) {
  return (
    <CardSection title="Configuration">
      <KeyValue label="Source" value={configuration.source_type} />
      <KeyValue label="Destination" value={configuration.destination_type} />
      <KeyValue
        label="Vibe Kanban board"
        value={configuration.vibe_kanban_board_active ? 'active' : 'inactive'}
      />
    </CardSection>
  );
}
