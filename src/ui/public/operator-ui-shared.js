(function (g) {
  var VS = (g.VibeSquireUi = g.VibeSquireUi || {});

  VS.STATUS_SNAPSHOT_EVENT = 'vibesquire:status-snapshot';
  g.__VS_SSE_EVENT__ = VS.STATUS_SNAPSHOT_EVENT;

  VS.esc = function (s) {
    if (s == null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  VS.fmtIso = function (iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
    } catch {
      return String(iso);
    }
  };

  /**
   * Subscribe to status snapshots dispatched by operator-shell (SSE).
   * @param {(snap: object) => void} callback
   * @returns {() => void} unsubscribe
   */
  VS.onStatusSnapshot = function (callback) {
    var handler = function (ev) {
      if (ev && ev.detail) callback(ev.detail);
    };
    g.addEventListener(VS.STATUS_SNAPSHOT_EVENT, handler);
    return function () {
      g.removeEventListener(VS.STATUS_SNAPSHOT_EVENT, handler);
    };
  };
})(window);
