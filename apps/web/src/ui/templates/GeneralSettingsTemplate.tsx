import type { ReactNode } from 'react';

type GeneralSettingsTemplateProps = {
  titleRow: ReactNode;
  settingsCard: ReactNode;
};

export function GeneralSettingsTemplate({
  titleRow,
  settingsCard,
}: GeneralSettingsTemplateProps) {
  return (
    <div className="stack">
      {titleRow}
      {settingsCard}
    </div>
  );
}
