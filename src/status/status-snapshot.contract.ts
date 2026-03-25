const GH_STATES = new Set([
  'ok',
  'not_installed',
  'not_authenticated',
  'error',
]);

const DB_STATES = new Set(['ok', 'error']);

const DEST_STATES = new Set(['ok', 'degraded', 'error', 'unknown']);

const SCOUT_UI = new Set(['idle', 'running', 'skipped', 'error']);

/**
 * §16.4 — Runtime validation for `GET /api/status` JSON (contract tests + optional guards).
 * Returns `null` if valid; otherwise a short error message.
 */
export function validateStatusSnapshot(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'body is not an object';
  }
  const o = body as Record<string, unknown>;

  if (typeof o.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  if (!o.gh || typeof o.gh !== 'object') {
    return 'gh must be an object';
  }
  const gh = o.gh as Record<string, unknown>;
  if (typeof gh.state !== 'string' || !GH_STATES.has(gh.state)) {
    return 'gh.state invalid';
  }

  if (!o.database || typeof o.database !== 'object') {
    return 'database must be an object';
  }
  const db = o.database as Record<string, unknown>;
  if (typeof db.state !== 'string' || !DB_STATES.has(db.state)) {
    return 'database.state invalid';
  }

  if (!o.setup || typeof o.setup !== 'object') {
    return 'setup must be an object';
  }
  const setup = o.setup as Record<string, unknown>;
  if (typeof setup.integrationsConfigured !== 'boolean') {
    return 'setup.integrationsConfigured must be boolean';
  }
  if (typeof setup.complete !== 'boolean') {
    return 'setup.complete must be boolean';
  }
  if (typeof setup.mappingCount !== 'number') {
    return 'setup.mappingCount must be a number';
  }

  if (!o.configuration || typeof o.configuration !== 'object') {
    return 'configuration must be an object';
  }
  const cfg = o.configuration as Record<string, unknown>;
  if (typeof cfg.source_type !== 'string') {
    return 'configuration.source_type must be a string';
  }
  if (typeof cfg.destination_type !== 'string') {
    return 'configuration.destination_type must be a string';
  }
  if (typeof cfg.vk_mcp_configured !== 'boolean') {
    return 'configuration.vk_mcp_configured must be boolean';
  }
  if (typeof cfg.gh_host_override !== 'boolean') {
    return 'configuration.gh_host_override must be boolean';
  }

  if (!Array.isArray(o.destinations)) {
    return 'destinations must be an array';
  }
  for (const d of o.destinations) {
    if (!d || typeof d !== 'object') {
      return 'each destination must be an object';
    }
    const dest = d as Record<string, unknown>;
    if (typeof dest.id !== 'string') {
      return 'destination.id must be string';
    }
    if (typeof dest.state !== 'string' || !DEST_STATES.has(dest.state)) {
      return 'destination.state invalid';
    }
  }

  if (!Array.isArray(o.scouts)) {
    return 'scouts must be an array';
  }
  for (const s of o.scouts) {
    if (!s || typeof s !== 'object') {
      return 'each scout must be an object';
    }
    const sc = s as Record<string, unknown>;
    if (typeof sc.id !== 'string') {
      return 'scout.id must be string';
    }
    if (typeof sc.state !== 'string' || !SCOUT_UI.has(sc.state)) {
      return 'scout.state invalid';
    }
    if (!sc.last_poll || typeof sc.last_poll !== 'object') {
      return 'scout.last_poll must be an object';
    }
    const lp = sc.last_poll as Record<string, unknown>;
    for (const k of [
      'candidates_count',
      'skipped_unmapped',
      'issues_created',
    ]) {
      const v = lp[k];
      if (v != null && typeof v !== 'number') {
        return `scout.last_poll.${k} must be number or null`;
      }
    }
  }

  if (!o.manual_sync || typeof o.manual_sync !== 'object') {
    return 'manual_sync must be an object';
  }
  const ms = o.manual_sync as Record<string, unknown>;
  if (typeof ms.canRun !== 'boolean') {
    return 'manual_sync.canRun must be boolean';
  }

  return null;
}
