(function () {
  const pre = document.getElementById('status-snap');
  const overview = document.getElementById('status-overview');
  const bootEl = document.getElementById('boot-snapshot');
  const sseEl = document.getElementById('sse-state');
  const msgEl = document.getElementById('action-msg');
  const btnSync = document.getElementById('btn-sync');
  const btnReinit = document.getElementById('btn-reinit');

  const POLL_MS = 5 * 60 * 1000;

  function esc(s) {
    if (s == null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function fmtIso(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
    } catch {
      return String(iso);
    }
  }

  function setupReasonHuman(reason) {
    if (reason === 'vk_mcp_stdio_invalid') {
      return 'Set stdio MCP command via VK_MCP_STDIO_JSON or PATCH vk_mcp_stdio_json (/api/settings).';
    }
    if (reason === 'no_default_kanban_board') {
      return 'Open Vibe Kanban and set target organization + project (required for sync).';
    }
    if (reason === 'no_mappings') {
      return 'Add at least one GitHub repo → Vibe Kanban repository mapping on Mappings.';
    }
    return reason ? String(reason) : 'Incomplete setup.';
  }

  function ghHuman(state) {
    const m = {
      ok: 'Authenticated and ready.',
      not_installed: 'Install the GitHub CLI (`gh`).',
      not_authenticated: 'Run `gh auth login`.',
      error: 'GitHub CLI error — check `gh` output.',
    };
    return m[state] || String(state);
  }

  function destHuman(d) {
    const m = {
      ok: 'Reachable.',
      degraded: 'Degraded — some calls may fail.',
      error: 'Error — check MCP stdio command and server.',
      unknown: 'Not probed yet.',
    };
    return m[d.state] || String(d.state);
  }

  /** Show Reinit when DB, gh, destination, or scout looks unhealthy (not mere setup skip). */
  function needsReinit(snap) {
    if (!snap || typeof snap !== 'object') return false;
    const db = snap.database || {};
    if (db.state === 'error') return true;
    const gh = snap.gh || {};
    if (gh.state && gh.state !== 'ok') return true;
    const dest = (snap.destinations && snap.destinations[0]) || {};
    if (dest.state === 'degraded' || dest.state === 'error') return true;
    const scout = snap.scouts && snap.scouts[0];
    if (scout && scout.state === 'error') return true;
    return false;
  }

  function card(title, dotClass, lines) {
    const body = (lines || [])
      .filter(Boolean)
      .map((l) => '<p>' + esc(l) + '</p>')
      .join('');
    return (
      '<div class="status-card">' +
      '<div class="status-card-head">' +
      '<span class="status-dot ' +
      esc(dotClass) +
      '" aria-hidden="true"></span>' +
      '<h3>' +
      esc(title) +
      '</h3></div>' +
      '<div class="status-card-body">' +
      body +
      '</div></div>'
    );
  }

  function renderOverview(snap) {
    if (!overview || !snap) return;
    const parts = [];

    const gh = snap.gh || {};
    let ghDot = 'status-neutral';
    if (gh.state === 'ok') ghDot = 'status-ok';
    else if (gh.state === 'error') ghDot = 'status-err';
    else ghDot = 'status-warn';
    const ghLines = [ghHuman(gh.state)];
    if (gh.message) ghLines.push(gh.message);
    parts.push(card('GitHub CLI', ghDot, ghLines));

    const db = snap.database || {};
    const dbDot = db.state === 'ok' ? 'status-ok' : 'status-err';
    const dbLines = [
      db.state === 'ok' ? 'Database connected.' : 'Database error.',
    ];
    if (db.message) dbLines.push(db.message);
    parts.push(card('Database', dbDot, dbLines));

    const setup = snap.setup || {};
    const setupDot = setup.complete ? 'status-ok' : 'status-warn';
    const cfg = snap.configuration || {};
    const setupLines = setup.complete
      ? [
          'Setup complete (sync allowed).',
          'PR source: ' + String(cfg.source_type ?? '—'),
          'Board: ' + String(cfg.destination_type ?? '—'),
          'Mappings: ' + String(setup.mappingCount ?? 0),
        ]
      : [
          'Finish MCP and routing (see checklist on dashboard).',
          setupReasonHuman(setup.reason),
        ];
    parts.push(card('Setup', setupDot, setupLines));

    const dest = (snap.destinations && snap.destinations[0]) || {};
    let destDot = 'status-neutral';
    if (dest.state === 'ok') destDot = 'status-ok';
    else if (dest.state === 'degraded') destDot = 'status-warn';
    else if (dest.state === 'error') destDot = 'status-err';
    const destLines = ['Vibe Kanban (MCP).', destHuman(dest)];
    if (dest.message) destLines.push(dest.message);
    if (dest.lastOkAt) destLines.push('Last OK: ' + fmtIso(dest.lastOkAt));
    parts.push(card('Destination', destDot, destLines));

    const scout = snap.scouts && snap.scouts[0];
    if (scout) {
      let scDot = 'status-neutral';
      if (scout.state === 'running') scDot = 'status-warn';
      else if (scout.state === 'error') scDot = 'status-err';
      else if (scout.state === 'skipped') scDot = 'status-warn';
      else scDot = 'status-ok';
      const scLines = [];
      const sched = snap.scheduled_sync || {};
      if (sched.enabled === false) {
        scLines.push(
          'Automatic polling is disabled — enable scheduled_sync_enabled in General settings (or SCHEDULED_SYNC_ENABLED).',
        );
      }
      if (scout.state === 'running') {
        scLines.push('Sync cycle running…');
      } else {
        scLines.push('GitHub PR scout: ' + String(scout.state));
      }
      if (scout.skipReason) {
        scLines.push('Reason: ' + String(scout.skipReason));
      }
      if (scout.lastError && scout.state === 'error') {
        scLines.push(String(scout.lastError));
      }
      const lp = scout.last_poll || {};
      if (
        lp.candidates_count != null ||
        lp.skipped_unmapped != null ||
        lp.issues_created != null
      ) {
        scLines.push(
          'Last run: ' +
            (lp.candidates_count ?? '—') +
            ' PR(s), ' +
            (lp.issues_created ?? '—') +
            ' created, ' +
            (lp.skipped_unmapped ?? '—') +
            ' skipped (unmapped)',
        );
      }
      scLines.push('Last poll: ' + fmtIso(scout.lastPollAt));
      if (sched.enabled === false) {
        scLines.push('Next scheduled: — (timer off)');
      } else {
        scLines.push('Next scheduled: ' + fmtIso(scout.nextPollAt));
      }
      parts.push(card('Sync & scout', scDot, scLines));
    }

    const ms = snap.manual_sync || {};
    let manDot = 'status-ok';
    if (ms.canRun === false) manDot = 'status-warn';
    const manLines = [];
    if (ms.canRun !== false) {
      manLines.push('You can run “Sync now” anytime (respects cooldown after a run).');
    } else if (ms.reason === 'cooldown' && ms.cooldownUntil) {
      manLines.push('Manual sync on cooldown until ' + fmtIso(ms.cooldownUntil));
    } else if (ms.reason === 'already_running') {
      manDot = 'status-warn';
      manLines.push('Wait — a sync cycle is already running.');
    } else {
      manLines.push('Manual sync unavailable: ' + String(ms.reason || 'unknown'));
    }
    parts.push(card('Manual sync', manDot, manLines));

    overview.innerHTML = parts.join('');
  }

  function setSse(s) {
    if (!sseEl) return;
    sseEl.textContent = s;
    sseEl.className = 'sse sse-' + s;
  }

  function setMsg(t) {
    if (!msgEl) return;
    msgEl.textContent = t || '';
    msgEl.style.display = t ? 'block' : 'none';
  }

  function renderManual(m) {
    if (!m || !btnSync) return;
    btnSync.disabled = m.canRun === false;
    btnSync.title =
      m.reason === 'cooldown' && m.cooldownUntil
        ? 'Cooldown until ' + m.cooldownUntil
        : 'Run one full sync cycle now (same as the scheduler, but immediate)';
  }

  function applySnapshot(snap) {
    if (!snap) return;
    renderOverview(snap);
    if (pre) pre.textContent = JSON.stringify(snap, null, 2);
    renderManual(snap.manual_sync);
    if (btnReinit) {
      btnReinit.style.display = needsReinit(snap) ? '' : 'none';
    }
  }

  function readBoot() {
    if (!bootEl || !bootEl.textContent.trim()) return null;
    try {
      return JSON.parse(bootEl.textContent);
    } catch {
      return null;
    }
  }

  async function load() {
    try {
      const res = await fetch('/api/status');
      const text = await res.text();
      const snap = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      applySnapshot(snap);
      setMsg('');
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      if (pre) pre.textContent = 'Error: ' + err;
    }
  }

  const boot = readBoot();
  if (boot) applySnapshot(boot);

  const es = new EventSource('/api/status/stream');
  setSse('connecting');
  es.onopen = () => setSse('open');
  es.onerror = () => setSse('closed');
  es.onmessage = (ev) => {
    try {
      const snap = JSON.parse(ev.data);
      applySnapshot(snap);
    } catch {
      /* ignore */
    }
  };

  window.setInterval(() => void load(), POLL_MS);
  void load();

  btnSync?.addEventListener('click', async () => {
    setMsg('');
    const res = await fetch('/api/sync/run', { method: 'POST' });
    const text = await res.text();
    if (res.status === 429) {
      try {
        const j = JSON.parse(text);
        setMsg('Cooldown — try after ' + (j.cooldownUntil || 'later'));
      } catch {
        setMsg('Cooldown');
      }
      return;
    }
    if (!res.ok) {
      setMsg(text || 'HTTP ' + res.status);
      return;
    }
    setMsg('Sync finished.');
    void load();
  });

  btnReinit?.addEventListener('click', async () => {
    if (!confirm('Run soft reinit? This resets scout backoff flags.')) return;
    setMsg('');
    const res = await fetch('/api/reinit', { method: 'POST' });
    const text = await res.text();
    if (!res.ok) {
      setMsg(text || 'HTTP ' + res.status);
      return;
    }
    setMsg('Reinit completed.');
    void load();
  });
})();
