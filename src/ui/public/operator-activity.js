(function () {
  var Ui = window.VibeSquireUi;
  if (!Ui) return;

  var root = document.getElementById('activity-runs-root');
  if (!root) return;

  var POLL_WHILE_RUNNING_MS = 2500;
  var esc = Ui.esc;
  var fmtIso = Ui.fmtIso;

  function fmtCount(v) {
    return v == null ? '—' : String(v);
  }

  function renderItemsTable(items) {
    if (!items || !items.length) return '';
    var rows = items
      .map(function (it) {
        var detailParts = [];
        if (it.kanbanIssueId) {
          detailParts.push(
            '<span class="mono">issue ' + esc(it.kanbanIssueId) + '</span>',
          );
        }
        if (it.detail) {
          detailParts.push(esc(it.detail));
        }
        var detail =
          detailParts.length > 1
            ? detailParts.join(' · ')
            : detailParts[0] || '';
        var author =
          it.authorLogin &&
          '<div class="muted" style="font-size:0.8rem">@' +
            esc(it.authorLogin) +
            '</div>';
        return (
          '<tr>' +
          '<td class="mono">' +
          '<a href="' +
          esc(it.prUrl) +
          '" target="_blank" rel="noopener noreferrer">#' +
          esc(it.prNumber) +
          '</a>' +
          '<div class="activity-pr-title muted">' +
          esc(it.prTitle) +
          '</div>' +
          (author || '') +
          '</td>' +
          '<td class="mono wrap">' +
          esc(it.githubRepo) +
          '</td>' +
          '<td>' +
          esc(it.decisionLabel) +
          '</td>' +
          '<td class="wrap muted">' +
          detail +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
    return (
      '<details class="activity-details">' +
      '<summary class="activity-details-summary">PR details (' +
      items.length +
      ')</summary>' +
      '<div class="table-wrap activity-items-wrap">' +
      '<table class="data-table activity-items-table">' +
      '<thead><tr><th>PR</th><th>Repo</th><th>Outcome</th><th>Detail</th></tr></thead>' +
      '<tbody>' +
      rows +
      '</tbody></table></div></details>'
    );
  }

  function renderRun(r) {
    var meta =
      '<div class="activity-run-meta">' +
      '<span class="activity-run-time mono">' +
      esc(r.startedAtLabel || fmtIso(r.startedAt)) +
      '</span>' +
      '<span class="activity-pill activity-pill-trigger">' +
      esc(r.trigger) +
      '</span>' +
      '<span class="activity-pill activity-pill-phase activity-pill-phase-' +
      esc(r.phase) +
      '">' +
      esc(r.phaseLabel) +
      '</span></div>';

    var summaryBody = '';
    if (r.phase === 'running') {
      summaryBody +=
        '<p class="muted activity-run-counts" style="margin:0.35rem 0 0">Sync in progress… ' +
        (r.itemCount || 0) +
        ' PR row(s) recorded so far.</p>';
    }
    if (r.phase === 'completed') {
      summaryBody +=
        '<p class="muted activity-run-counts" style="margin:0.35rem 0 0">' +
        fmtCount(r.candidatesCount) +
        ' PR(s) seen · ' +
        fmtCount(r.issuesCreated) +
        ' created · ' +
        fmtCount(r.skippedUnmapped) +
        ' unmapped · ' +
        fmtCount(r.skippedBot) +
        ' bot · ' +
        fmtCount(r.skippedBoardLimit) +
        ' board limit · ' +
        fmtCount(r.skippedAlreadyTracked) +
        ' already tracked · ' +
        fmtCount(r.skippedLinkedExisting) +
        ' linked existing</p>';
    }
    if (r.phase === 'aborted') {
      summaryBody +=
        '<p class="muted activity-run-msg" style="margin:0.35rem 0 0">' +
        (r.abortReason
          ? '<code class="mono">' + esc(r.abortReason) + '</code>'
          : 'Aborted') +
        '</p>';
    }
    if (r.phase === 'failed') {
      summaryBody +=
        '<p class="banner banner-error activity-run-msg" style="margin:0.5rem 0 0">' +
        esc(r.errorMessage || 'Sync failed') +
        '</p>';
    }

    var details = r.itemCount ? renderItemsTable(r.items) : '';

    return (
      '<div class="card activity-run">' +
      '<div class="activity-run-summary">' +
      meta +
      summaryBody +
      '</div>' +
      details +
      '</div>'
    );
  }

  function renderRuns(runs) {
    if (!runs || !runs.length) {
      return (
        '<div class="card activity-empty-card">' +
        '<p class="muted" style="margin:0">No sync runs recorded yet. Runs appear when a sync starts.</p>' +
        '</div>'
      );
    }
    return runs.map(renderRun).join('');
  }

  var pollTimer = null;
  var pollWanted = false;

  function anyRunning(runs) {
    if (!runs || !runs.length) return false;
    for (var i = 0; i < runs.length; i++) {
      if (runs[i].phase === 'running') return true;
    }
    return false;
  }

  function stopPoll() {
    if (pollTimer != null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPollInterval() {
    stopPoll();
    if (!pollWanted || document.visibilityState !== 'visible') return;
    pollTimer = window.setInterval(function () {
      void load();
    }, POLL_WHILE_RUNNING_MS);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      stopPoll();
    } else if (pollWanted) {
      void load();
      startPollInterval();
    }
  });

  function schedulePollIfNeeded(runs) {
    pollWanted = anyRunning(runs);
    if (!pollWanted) {
      stopPoll();
      return;
    }
    startPollInterval();
  }

  async function load() {
    try {
      var res = await fetch('/api/activity/runs');
      var text = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = text ? JSON.parse(text) : { runs: [] };
      var runs = data.runs || [];
      root.innerHTML = renderRuns(runs);
      schedulePollIfNeeded(runs);
    } catch {
      root.innerHTML =
        '<div class="card"><p class="muted" style="margin:0">Could not load activity. Try refreshing the page.</p></div>';
      stopPoll();
      pollWanted = false;
    }
  }

  Ui.onStatusSnapshot(function () {
    void load();
  });

  void load();
})();
