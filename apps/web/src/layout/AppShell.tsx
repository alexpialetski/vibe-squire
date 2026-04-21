import { useQuery, useSubscription } from '@apollo/client';
import { useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { uiNavResponseSchema, type UiNavResponse } from '@vibe-squire/shared';
import type { IntegrationNavQueryData } from '../graphql/operator-query-types';
import {
  INTEGRATION_NAV_QUERY,
  STATUS_QUERY,
  STATUS_UPDATED_SUBSCRIPTION,
  type StatusQueryData,
  type StatusUpdatedSubscriptionData,
} from '../graphql/operations';

export function AppShell() {
  const navQ = useQuery<IntegrationNavQueryData>(INTEGRATION_NAV_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const statusQ = useQuery<StatusQueryData>(STATUS_QUERY, {
    fetchPolicy: 'cache-first',
  });

  useSubscription<StatusUpdatedSubscriptionData>(STATUS_UPDATED_SUBSCRIPTION, {
    onData: ({ data, client }) => {
      const snapshot = data.data?.statusUpdated;
      if (!snapshot) return;
      client.writeQuery({
        query: STATUS_QUERY,
        data: { status: snapshot },
      });
    },
  });

  const entries = navQ.data?.integrationNav.entries ?? [];
  const parsed = uiNavResponseSchema.safeParse({ entries });
  const safeEntries: UiNavResponse['entries'] = parsed.success
    ? parsed.data.entries
    : entries;
  const triageCount = useMemo(() => {
    const value = statusQ.data?.status?.pending_triage_count;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }, [statusQ.data?.status?.pending_triage_count]);
  const lastNotifiedTriageKey = useRef('');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (triageCount <= 0) {
      lastNotifiedTriageKey.current = '';
      return;
    }
    const key = String(triageCount);
    if (lastNotifiedTriageKey.current === key) return;
    lastNotifiedTriageKey.current = key;
    void new Notification('vibe-squire: PRs need triage', {
      body: `${triageCount} PR(s) awaiting your review or decline decision`,
      icon: '/favicon.svg',
      tag: 'vs-triage',
    });
  }, [triageCount]);

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
            {triageCount > 0 ? (
              <span
                className="nav-badge"
                aria-label={`${triageCount} pending triage`}
              >
                {triageCount}
              </span>
            ) : null}
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
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            to="/mappings"
          >
            Mappings
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
