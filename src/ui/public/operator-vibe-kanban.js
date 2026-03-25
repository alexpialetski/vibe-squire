(function () {
  const orgSel = document.getElementById('vk-sel-org');
  const projSel = document.getElementById('vk-sel-proj');
  const inOrg = document.getElementById('vk-in-org');
  const inProj = document.getElementById('vk-in-proj');
  const errBoard = document.getElementById('vk-board-err');

  function setBoardErr(t) {
    if (!errBoard) return;
    errBoard.textContent = t || '';
    errBoard.style.display = t ? 'block' : 'none';
  }

  function syncHiddenFromSelects() {
    if (!inOrg || !inProj || !orgSel || !projSel) return;
    inOrg.value = orgSel.value.trim();
    inProj.value = projSel.value.trim();
  }

  async function loadProjectsForOrg(clearProjectSelection) {
    if (!orgSel || !projSel || !inOrg || !inProj) return;
    const oid = orgSel.value.trim();
    if (clearProjectSelection !== false) {
      inProj.value = '';
    }
    if (!oid) {
      projSel.innerHTML = '<option value="">Select organization first</option>';
      projSel.disabled = true;
      syncHiddenFromSelects();
      return;
    }
    projSel.innerHTML = '<option value="">Loading…</option>';
    projSel.disabled = true;
    setBoardErr('');
    try {
      const q = new URLSearchParams({ organization_id: oid });
      const res = await fetch('/api/vibe-kanban/projects?' + q);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBoardErr(
          typeof data.message === 'string'
            ? data.message
            : 'Could not load projects.',
        );
        projSel.innerHTML = '<option value="">—</option>';
        return;
      }
      const projects = data.projects || [];
      projSel.innerHTML = '<option value="">Select project…</option>';
      for (const p of projects) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name ? p.name + ' — ' + p.id : p.id;
        projSel.appendChild(opt);
      }
      projSel.disabled = false;
      const savedProj = inProj.value.trim();
      if (
        clearProjectSelection === false &&
        savedProj &&
        [...projSel.options].some((o) => o.value === savedProj)
      ) {
        projSel.value = savedProj;
      }
      syncHiddenFromSelects();
      if (!projects.length) {
        setBoardErr('No projects for this organization.');
      }
    } catch (e) {
      setBoardErr(e instanceof Error ? e.message : String(e));
      projSel.innerHTML = '<option value="">—</option>';
    }
  }

  if (orgSel && projSel && inOrg && inProj) {
    syncHiddenFromSelects();
    orgSel.addEventListener('change', () => {
      void loadProjectsForOrg(true);
    });
    projSel.addEventListener('change', () => {
      syncHiddenFromSelects();
    });
  }

  document.getElementById('vk-settings-form')?.addEventListener('submit', () => {
    if (orgSel && projSel && inOrg && inProj) {
      syncHiddenFromSelects();
    }
  });
})();
