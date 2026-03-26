/** Allowed string values for `scheduled_sync_enabled` (DB / PATCH / UI form). */
export function isValidScheduledSyncEnabledInput(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return (
    v === 'true' ||
    v === 'false' ||
    v === '1' ||
    v === '0' ||
    v === 'yes' ||
    v === 'no'
  );
}
