import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import { uiNavResponseSchema } from '@vibe-squire/shared';
import { apiJson } from '../api';

export function AppShell() {
  const navQ = useQuery({
    queryKey: ['ui', 'nav'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/ui/nav');
      return uiNavResponseSchema.parse(data);
    },
  });

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
          {navQ.data?.entries.map((e) => (
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
