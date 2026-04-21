import type { ReactNode } from 'react';

type MappingsPageTemplateProps = {
  titleRow: ReactNode;
  intro: ReactNode;
  vkReposError: ReactNode | null;
  newMapping: ReactNode;
  existingMappings: ReactNode;
};

export function MappingsPageTemplate({
  titleRow,
  intro,
  vkReposError,
  newMapping,
  existingMappings,
}: MappingsPageTemplateProps) {
  return (
    <div className="stack">
      {titleRow}
      {intro}
      {vkReposError}
      {newMapping}
      {existingMappings}
    </div>
  );
}
