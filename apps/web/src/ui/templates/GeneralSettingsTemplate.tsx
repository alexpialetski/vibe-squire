import type { ReactNode } from 'react';

type GeneralSettingsTemplateProps = {
  titleRow: ReactNode;
  adaptersCard: ReactNode;
  settingsCard: ReactNode;
};

export function GeneralSettingsTemplate({
  titleRow,
  adaptersCard,
  settingsCard,
}: GeneralSettingsTemplateProps) {
  return (
    <div className="stack">
      {titleRow}
      {adaptersCard}
      {settingsCard}
    </div>
  );
}
