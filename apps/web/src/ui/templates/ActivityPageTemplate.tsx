import type { ReactNode } from 'react';

type ActivityPageTemplateProps = {
  titleRow: ReactNode;
  intro: ReactNode;
  feed: ReactNode;
};

export function ActivityPageTemplate({
  titleRow,
  intro,
  feed,
}: ActivityPageTemplateProps) {
  return (
    <div className="stack">
      {titleRow}
      {intro}
      {feed}
    </div>
  );
}
