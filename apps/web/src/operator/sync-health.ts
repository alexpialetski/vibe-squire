import type { StatusSnapshot } from '@vibe-squire/shared';

/** Matches dashboard: show recovery reinit when core checks look unhealthy. */
export function dashboardNeedsReinit(snapshot: StatusSnapshot): boolean {
  if (snapshot.database.state === 'error') {
    return true;
  }
  const { state: ghState } = snapshot.gh;
  if (ghState && ghState !== 'ok') {
    return true;
  }
  const dest0 = snapshot.destinations[0];
  if (dest0 && (dest0.state === 'degraded' || dest0.state === 'error')) {
    return true;
  }
  const scout0 = snapshot.scouts[0];
  if (scout0?.state === 'error') {
    return true;
  }
  return false;
}
