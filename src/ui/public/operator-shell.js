(function () {
  var g = window;
  var VS = g.VibeSquireUi || {};
  var SSE_EVENT =
    VS.STATUS_SNAPSHOT_EVENT || g.__VS_SSE_EVENT__ || 'vibesquire:status-snapshot';
  var stateEl = document.getElementById('nav-sse-state');
  var badgeEl = document.getElementById('nav-triage-badge');

  function setSse(s) {
    if (!stateEl) return;
    stateEl.textContent = s;
    stateEl.className = 'sse sse-' + s;
  }

  /* ── Nav badge ── */

  function updateTriageBadge(count) {
    if (!badgeEl) return;
    if (count > 0) {
      badgeEl.textContent = String(count);
      badgeEl.hidden = false;
    } else {
      badgeEl.textContent = '';
      badgeEl.hidden = true;
    }
  }

  /* ── Web Notifications ── */

  var lastNotifiedTriageKey = '';

  function requestNotificationPermission() {
    if (!('Notification' in g)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function maybeNotifyTriage(count) {
    if (!('Notification' in g) || Notification.permission !== 'granted') return;
    if (count <= 0) {
      lastNotifiedTriageKey = '';
      return;
    }
    var key = String(count);
    if (key === lastNotifiedTriageKey) return;
    lastNotifiedTriageKey = key;
    new Notification('vibe-squire: PRs need triage', {
      body: count + ' PR(s) awaiting your review or decline decision',
      icon: '/ui/assets/favicon.svg',
      tag: 'vs-triage',
    });
  }

  /* ── Favicon notification dot ── */

  var faviconLink = document.querySelector('link[rel="icon"]');
  var baseFaviconImg = null;
  var faviconCanvas = null;
  var faviconReady = false;
  var lastFaviconHasDot = false;

  (function initFavicon() {
    if (!faviconLink) return;
    var img = new Image();
    img.onload = function () {
      baseFaviconImg = img;
      faviconCanvas = document.createElement('canvas');
      faviconCanvas.width = 32;
      faviconCanvas.height = 32;
      faviconReady = true;
    };
    img.src = '/ui/assets/favicon.svg';
  })();

  function setFaviconDot(show) {
    if (!faviconReady || show === lastFaviconHasDot) return;
    lastFaviconHasDot = show;
    var ctx = faviconCanvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(baseFaviconImg, 0, 0, 32, 32);
    if (show) {
      ctx.beginPath();
      ctx.arc(25, 7, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#c9a227';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#121815';
      ctx.stroke();
    }
    faviconLink.href = faviconCanvas.toDataURL('image/png');
  }

  /* ── Snapshot dispatch ── */

  function publishSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return;
    try {
      g.__VS_STATUS_SNAPSHOT__ = snap;
    } catch {
      /* ignore */
    }
    var triageCount =
      typeof snap.pending_triage_count === 'number'
        ? snap.pending_triage_count
        : 0;
    updateTriageBadge(triageCount);
    maybeNotifyTriage(triageCount);
    setFaviconDot(triageCount > 0);
    g.dispatchEvent(new CustomEvent(SSE_EVENT, { detail: snap }));
  }

  /* ── SSE connection ── */

  var es = new EventSource('/api/status/stream');
  setSse('connecting');
  es.onopen = function () {
    setSse('open');
  };
  es.onerror = function () {
    setSse('closed');
  };
  es.onmessage = function (ev) {
    if (!ev.data || !String(ev.data).trim()) {
      return;
    }
    try {
      var snap = JSON.parse(ev.data);
      publishSnapshot(snap);
    } catch {
      /* ignore */
    }
  };

  requestNotificationPermission();
})();
