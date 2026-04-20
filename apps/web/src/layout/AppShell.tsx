import { useQuery } from '@apollo/client';
import { NavLink, Outlet } from 'react-router-dom';
import { uiNavResponseSchema, type UiNavResponse } from '@vibe-squire/shared';
import type { IntegrationNavQueryData } from '../graphql/operator-query-types';
import { INTEGRATION_NAV_QUERY } from '../graphql/operations';

export function AppShell() {
  const navQ = useQuery<IntegrationNavQueryData>(INTEGRATION_NAV_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const entries = navQ.data?.integrationNav.entries ?? [];
  const parsed = uiNavResponseSchema.safeParse({ entries });
  const safeEntries: UiNavResponse['entries'] = parsed.success
    ? parsed.data.entries
    : entries;

  return (
    <div className="shell">
      <aside className="nav-rail">
        <div className="brand">
          <span className="brand-mark">◇</span>
          <span className="brand-text">vibe-squire</span>
        </div>
        <nav className="nav">
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            end
            to="/dashboard"
          >
            Dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            to="/activity"
          >
            Activity
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            to="/settings"
          >
            General
          </NavLink>
          <div className="nav-section-heading">Sync adapters</div>
          {navQ.loading && !navQ.data ? (
            <p className="muted nav-loading">Loading…</p>
          ) : null}
          {safeEntries.map((e) => (
            <NavLink
              key={e.id}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
              to={e.href}
            >
              {e.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
