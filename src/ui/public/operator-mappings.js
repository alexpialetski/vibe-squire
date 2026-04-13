(function () {
  const form = document.getElementById('new-mapping-form');
  const repoSel = document.getElementById('mk-repo');
  const hVkRepo = document.getElementById('h-vk-repo');
  const mkErr = document.getElementById('mk-err');
  function setMkErr(t) {
    if (!mkErr) return;
    mkErr.textContent = t || '';
    mkErr.style.display = t ? 'block' : 'none';
  }

  if (form && repoSel && hVkRepo) {
    async function loadRepos() {
      repoSel.innerHTML = '<option value="">Loading…</option>';
      hVkRepo.value = '';
      setMkErr('');
      try {
        const res = await fetch('/api/vibe-kanban/repos');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data.message === 'string'
              ? data.message
              : 'Could not load repositories (' + res.status + ').';
          setMkErr(msg);
          repoSel.innerHTML = '<option value="">—</option>';
          return;
        }
        const repos = data.repos || [];
        repoSel.innerHTML =
          '<option value="">Select Vibe Kanban repository…</option>';
        for (const r of repos) {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = r.name ? r.name + ' — ' + r.id : r.id;
          repoSel.appendChild(opt);
        }
        if (!repos.length) {
          setMkErr('No repositories returned from Vibe Kanban.');
        }
      } catch (e) {
        setMkErr(e instanceof Error ? e.message : String(e));
        repoSel.innerHTML = '<option value="">—</option>';
      }
    }

    repoSel.addEventListener('change', () => {
      hVkRepo.value = repoSel.value.trim();
    });

    form.addEventListener('submit', (e) => {
      if (!hVkRepo.value.trim()) {
        e.preventDefault();
        alert('Choose a Vibe Kanban repository from the list.');
      }
    });

    void loadRepos();
  }

  function wireRow(row) {
    const id = row.getAttribute('data-id');
    if (!id) return;
    const editBtn = row.querySelector('.js-edit');
    const saveBtn = row.querySelector('.js-save');
    const cancelBtn = row.querySelector('.js-cancel');
    const inputs = row.querySelectorAll('input.edit');

    editBtn?.addEventListener('click', () => {
      row.classList.add('is-editing');
    });
    cancelBtn?.addEventListener('click', () => {
      location.reload();
    });
    saveBtn?.addEventListener('click', async () => {
      if (inputs.length < 3) return;
      const body = {
        githubRepo: inputs[0].value.trim(),
        vibeKanbanRepoId: inputs[1].value.trim(),
        label: inputs[2].value.trim() || undefined,
      };
      const res = await fetch('/api/mappings/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(t || 'HTTP ' + res.status);
        return;
      }
      location.reload();
    });
  }

  document.querySelectorAll('.js-mapping-row').forEach(wireRow);
})();
