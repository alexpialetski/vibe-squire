import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { ActivityPage } from './pages/ActivityPage';
import { DashboardPage } from './pages/DashboardPage';
import { GithubPage } from './pages/GithubPage';
import { MappingsPage } from './pages/MappingsPage';
import { SettingsPage } from './pages/SettingsPage';
import { VibeKanbanPage } from './pages/VibeKanbanPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="mappings" element={<MappingsPage />} />
        <Route path="github" element={<GithubPage />} />
        <Route path="vibe-kanban" element={<VibeKanbanPage />} />
      </Route>
    </Routes>
  );
}
