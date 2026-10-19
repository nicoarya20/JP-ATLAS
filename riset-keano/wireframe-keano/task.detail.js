// Detail task sebagai overlay (modal): isian task + deskripsi + lampiran bukti di kiri, Activity + komentar di kanan.
// Dibuka dari semua tampilan task (List/Kanban/Calendar/Gantt), Inbox, dan task yang ditempel di Channel.
// Isi tetap placeholder; teks yang diketik user (komentar, nama file) selalu di-escape.
(() => {
  const { esc, line } = window.WF_CARDS;
  const dlg = document.getElementById('taskDlg');
  const avatar = '<span class="ph-avatar"></span>';
  const LOG = ['created this task', 'set the start date', 'set the due date', 'assigned to: Name', 'set priority to Normal'];
  // Task dari luar daftar bersama (mis. Inbox) dibuka sebagai contoh; perubahannya tidak memengaruhi tampilan lain
  const PREVIEW = { id: 'preview', status: 0, prio: 2, start: 0, len: 1, w: 60, sub: 0 };
  const store = new Map(); // id task → { files, feed }
  let task = null;
  let showActivity = true;

  function detail(t) {
    if (!store.has(t.id)) store.set(t.id, {
      files: [{ name: null, size: '00 KB' }],
      feed: [...LOG.map(what => ({ who: 'Name', what, time: 'Date' })), { who: 'Name', comment: null, time: 'Date' }],
    });
    return store.get(t.id);
  }
  const log = what => detail(task).feed.push({ who: 'You', what, time: 'Just now' });
  const field = (label, value) => `<div class="td-field"><span class="muted"><span class="ph-icon"></span>${label}</span><div>${value}</div></div>`;

  function statusControl(pv) {
    const opts = pv.STATUSES.map((s, i) => `<option value="${i}" ${i === task.status ? 'selected' : ''}>${s}</option>`).join('');
    return `<span class="td-status"><label class="st-tag"><span class="st-dot st-${task.status}"></span><select data-status aria-label="Status">${opts}</select></label>
      <button class="btn-sm" data-next title="Next status" aria-label="Next status">▸</button>
      <button class="btn-sm" data-done title="Mark complete" aria-label="Mark complete">✓</button></span>`;
  }

  // Deskripsi teks biasa (placeholder baris abu-abu)
  const description = () => `<section class="td-sec"><header><b>Description</b></header>
    <div class="td-text">${[90, 75, 85, 40].map(line).join('')}</div></section>`;

  const files = d => `<section class="td-sec"><header><b>Attachments</b><span class="muted small">Evidence · 00</span><span class="spacer"></span>
      <label class="btn-sm td-browse">+ Attach<input type="file" multiple hidden data-file></label></header>
    <label class="td-drop" data-drop><input type="file" multiple hidden data-file>Drop files here or <u>browse</u> — proof the task is done (photo, document, screenshot)</label>
    <ul class="td-files">${d.files.map((f, i) => `<li><span class="ph-icon td-thumb"></span>
      <span class="td-file-name">${f.name === null ? line(60) : `<span class="ellipsis">${esc(f.name)}</span>`}<span class="muted small">${esc(f.size)} · ${f.name === null ? 'Name · Date' : 'You · Just now'}</span></span>
      <button class="btn-sm" title="Download" aria-label="Download">↓</button>
      <button class="btn-sm" data-remove-file="${i}" title="Remove" aria-label="Remove file">✕</button></li>`).join('')}</ul></section>`;

  const subtasks = () => `<section class="td-sec"><header><b>Subtasks</b><span class="muted small">00</span></header>
    <ul class="td-subs">${Array.from({ length: task.sub }, (_, i) => `<li><span class="st-dot st-0"></span>${line([60, 45, 70][i % 3])}${avatar}</li>`).join('')}</ul>
    <button class="dt-add" data-subtask>+ Add subtask</button></section>`;

  const feedItem = f => f.what
    ? `<li class="td-log"><span>${esc(f.who)} ${esc(f.what)}</span><span class="nowrap">${esc(f.time)}</span></li>`
    : `<li class="td-comment">${avatar}<div><div class="td-who"><b>${esc(f.who)}</b><span class="muted small">${esc(f.time)}</span></div>
        ${f.comment === null ? `${line(85)}${line(50)}` : `<p>${esc(f.comment)}</p>`}
        <div class="td-c-tools"><button class="btn-sm" title="React">☺</button><button class="btn-sm">Reply</button></div></div></li>`;

  function render() {
    const pv = window.WF_PV;
    const d = detail(task);
    const inList = pv.tasks.includes(task) ? '' : 'disabled';
    const keepScroll = dlg.querySelector('.td-main')?.scrollTop || 0;
    dlg.innerHTML = `<div class="td-top">
        <button class="btn-sm" data-step="-1" ${inList} title="Previous task" aria-label="Previous task">‹</button>
        <button class="btn-sm" data-step="1" ${inList} title="Next task" aria-label="Next task">›</button>
        <span class="td-crumb"><span class="p-avatar">P</span>Project Name <span class="muted">/</span><span class="ph-icon"></span>List Name</span>
        <span class="spacer"></span><span class="muted small td-created">Created Date</span>
        <button class="btn-sm">Share</button><button class="btn-sm" title="More">⋯</button><button class="btn-sm" title="Favorite">☆</button>
        <button class="btn-sm" data-activity aria-pressed="${showActivity}" title="Show/hide activity" aria-label="Show/hide activity">◫</button>
        <button class="btn-sm" data-close title="Close" aria-label="Close">✕</button></div>
      <div class="td-body${showActivity ? '' : ' no-activity'}">
        <div class="td-main">
          <div class="td-type"><button class="chip">◉ Task ▾</button>${task.sub ? `<span class="muted small">⤷ 0${task.sub}</span>` : ''}</div>
          <h2 class="td-title">${line(task.w)}</h2>
          <div class="td-ai"><span class="ai-tag">AI</span>Ask AI to write a description or a summary for this task</div>
          <div class="td-fields">
            ${field('Status', statusControl(pv))}${field('Assignees', `${avatar} Name`)}
            ${field('Dates', task.start === null ? '<span class="muted">Empty</span>' : '◷ Date → ◷ Date')}
            ${field('Priority', `<span class="prio"><span class="flag">⚑</span>${pv.PRIORITIES[task.prio]}</span>`)}
            ${field('Time estimate', '00h')}${field('Track time', '<button class="btn-sm">▶ Start</button>')}
            ${field('Tags', '<span class="muted">Empty</span>')}
          </div>
          ${description()}${files(d)}${subtasks()}
        </div>
        <aside class="td-activity">
          <header class="td-act-head"><b>Activity</b><span class="spacer"></span>
            <button class="btn-sm" title="Search">⌕</button><button class="btn-sm" title="Notifications">🔔 00</button><button class="btn-sm" title="Filter">⚲</button></header>
          <ul class="td-feed">${d.feed.map(feedItem).join('')}</ul>
          <form class="td-compose"><textarea name="comment" rows="2" placeholder="Write a comment…"></textarea>
            <div class="td-compose-bar"><button type="button" class="btn-sm" title="Attach">+</button><button type="button" class="btn-sm" title="Mention">@</button>
              <button type="button" class="btn-sm" title="Emoji">☺</button><span class="spacer"></span><button class="pill solid">Send</button></div></form>
        </aside></div>`;
    dlg.querySelector('.td-main').scrollTop = keepScroll;
    const feed = dlg.querySelector('.td-feed');
    feed.scrollTop = feed.scrollHeight;
  }

  // Perubahan yang terlihat di tampilan lain (status, subtask) ikut menggambar ulang tab project di belakang overlay
  const update = () => { render(); window.WF_PV.refresh(); };
  function setStatus(n) {
    task.status = n;
    log(`changed status to ${window.WF_PV.STATUSES[n]}`);
    update();
  }
  function addFiles(list) {
    const d = detail(task);
    [...list].forEach(f => d.files.push({ name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB` }));
    if (list.length) { log(`attached ${list.length > 1 ? 'files' : 'a file'} as evidence`); render(); }
  }

  dlg.addEventListener('click', e => {
    const t = e.target;
    const d = detail(task);
    // Klik di luar panel (backdrop) atau ✕ menutup overlay
    if (t === dlg || t.closest('[data-close]')) return dlg.close();
    if (t.closest('[data-activity]')) { showActivity = !showActivity; return render(); }
    const step = t.closest('[data-step]');
    if (step) {
      const all = window.WF_PV.tasks;
      task = all[(all.indexOf(task) + Number(step.dataset.step) + all.length) % all.length];
      return render();
    }
    if (t.closest('[data-next]')) return setStatus((task.status + 1) % window.WF_PV.STATUSES.length);
    if (t.closest('[data-done]')) return setStatus(window.WF_PV.STATUSES.length - 1);
    const file = t.closest('[data-remove-file]');
    if (file) { d.files.splice(Number(file.dataset.removeFile), 1); log('removed an attachment'); return render(); }
    if (t.closest('[data-subtask]')) { task.sub += 1; log('added a subtask'); update(); }
  });
  dlg.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-status]')) return setStatus(Number(t.value));
    if (t.matches('[data-file]')) addFiles(t.files);
  });
  dlg.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches('textarea[name="comment"]') && !e.shiftKey) {
      e.preventDefault();
      e.target.form.requestSubmit();
    }
  });
  dlg.addEventListener('submit', e => {
    e.preventDefault();
    const text = e.target.elements.comment.value.trim();
    if (!text) return;
    detail(task).feed.push({ who: 'You', comment: text, time: 'Just now' });
    render();
    dlg.querySelector('textarea[name="comment"]').focus();
  });
  // Seret file dari komputer ke kotak lampiran
  dlg.addEventListener('dragover', e => {
    const drop = e.target.closest('[data-drop]');
    if (!drop) return;
    e.preventDefault();
    drop.classList.add('over');
  });
  dlg.addEventListener('dragleave', e => e.target.closest('[data-drop]')?.classList.remove('over'));
  dlg.addEventListener('drop', e => {
    if (!e.target.closest('[data-drop]')) return;
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });

  function open(id) {
    task = window.WF_PV.tasks.find(t => t.id === id) || PREVIEW;
    render();
    if (!dlg.open) dlg.showModal();
  }
  window.WF_TASK = { open };
})();
