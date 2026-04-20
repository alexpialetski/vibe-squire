import type { ReactNode } from 'react';
import { SectionHeading } from '../atoms/SectionHeading';

type DashboardTemplateProps = {
  /** Optional row under the title (e.g. recovery actions). Layout-only. */
  headActions?: ReactNode;
  overview?: ReactNode;
  sync?: ReactNode;
  health?: ReactNode;
  setup?: ReactNode;
};

export function DashboardTemplate({
  headActions,
  overview,
  sync,
  health,
  setup,
}: DashboardTemplateProps) {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Dashboard</h1>
        {headActions ? (
          <div className="dashboard-head-actions">{headActions}</div>
        ) : null}
      </div>
      <div className="dashboard-template-grid">
        {overview ? (
          <section className="dashboard-template-slot">
            <SectionHeading>Overview</SectionHeading>
            <div className="dashboard-template-stack">{overview}</div>
          </section>
        ) : null}
        {sync ? (
          <section className="dashboard-template-slot">
            <SectionHeading>Sync</SectionHeading>
            <div className="dashboard-template-stack">{sync}</div>
          </section>
        ) : null}
        {health ? (
          <section className="dashboard-template-slot">
            <SectionHeading>Health</SectionHeading>
            <div className="dashboard-template-stack">{health}</div>
          </section>
        ) : null}
        {setup ? (
          <section className="dashboard-template-slot">
            <SectionHeading>Setup</SectionHeading>
            <div className="dashboard-template-stack">{setup}</div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
