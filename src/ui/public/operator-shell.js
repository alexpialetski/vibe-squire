(function () {
  var g = window;
  var VS = g.VibeSquireUi || {};
  var SSE_EVENT =
    VS.STATUS_SNAPSHOT_EVENT || g.__VS_SSE_EVENT__ || 'vibesquire:status-snapshot';
  var stateEl = document.getElementById('nav-sse-state');

  function setSse(s) {
    if (!stateEl) return;
    stateEl.textContent = s;
    stateEl.className = 'sse sse-' + s;
  }

  function publishSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return;
    try {
      g.__VS_STATUS_SNAPSHOT__ = snap;
    } catch {
      /* ignore */
    }
    g.dispatchEvent(new CustomEvent(SSE_EVENT, { detail: snap }));
  }

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
})();
