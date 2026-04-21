import type { ReactNode } from 'react';

type CardSectionProps = {
  title: string;
  children: ReactNode;
  compact?: boolean;
};

export function CardSection({
  title,
  children,
  compact = false,
}: CardSectionProps) {
  return (
    <section className={`card ${compact ? 'compact' : ''}`}>
      <h2 className="ui-card-heading">{title}</h2>
      {children}
    </section>
  );
}
