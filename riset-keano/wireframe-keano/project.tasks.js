// Tampilan List (tabel per status) dan Kanban (kolom per status, kartu bisa digeser) di menu Projects.
(() => {
  const pv = window.WF_PV;
  const { ui } = pv;
  const toolbar = () => ui.toolbar(
    [ui.chip('Group: Status'), ui.chip('⤷ Subtasks')],
    [ui.chip('Filter'), ui.chip('✓ Closed'), ui.chip('Assignee'), ui.chip('⌕'), ui.chip('⚙ Customize'), ui.addBtn]);
  // Di level project & All Tasks tiap task diberi keterangan list asalnya
  const crumb = ctx => ctx.scope === 'list' ? '' : ui.line(25, 'crumb');
  const subtasks = t => t.sub ? `<span class="sub-count" title="Subtasks">⤷ 0${t.sub}</span>` : '';

  // ---------- List ----------
  pv.register('list', (body, ctx) => {
    const row = t => `<div class="dt-row" data-task="${t.id}">
      <span class="dt-name">${crumb(ctx)}<span class="dt-title"><span class="st-dot st-${t.status}"></span>${ui.line(t.w)}${subtasks(t)}</span></span>
      <span>${ui.avatar}</span><span>${t.start === null ? '<span class="muted">—</span>' : ui.line(70)}</span>${ui.prio(t)}<span></span></div>`;
    const group = (s, list) => `<details class="pl-group" open>
      <summary>${ui.statusTag(s)} <span class="muted">00</span></summary>
      <div class="dt-row dt-head"><span>Name</span><span>Assignee</span><span>Due date</span><span>Priority</span>
        <button class="dt-plus" title="Add column" aria-label="Add column">+</button></div>
      ${list.map(row).join('')}<button class="dt-add" data-add="${s}">+ Add Task</button></details>`;
    const tasks = pv.scoped();
    body.innerHTML = `<div class="pv-list">${toolbar()}
      <div class="pl-groups">${pv.STATUSES.map((_, s) => group(s, tasks.filter(t => t.status === s))).join('')}</div></div>`;

    body.firstElementChild.addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) return pv.addTask({ status: Number(add.dataset.add) || 0 });
      const open = e.target.closest('[data-task]');
      if (open) pv.openTask(open.dataset.task);
    });
  });

  // ---------- Kanban ----------
  pv.register('kanban', body => {
    const card = t => `<article class="kb-card" draggable="true" data-task="${t.id}">
      <div class="kb-title">${ui.line(t.w)}${ui.line(t.w - 25)}</div>
      <div class="kb-meta">${ui.avatar}<span class="kb-date">◷ ${t.start === null ? 'No date' : 'Date'}</span>${ui.prio(t)}${subtasks(t)}</div></article>`;
    const col = (s, list) => `<section class="kb-col" data-status="${s}">
      <header class="kb-head">${ui.statusTag(s)}<span class="muted">00</span><span class="spacer"></span>
        <button class="btn-sm" data-add="${s}" title="Add task" aria-label="Add task">+</button></header>
      <div class="kb-cards">${list.map(card).join('')}</div>
      <button class="kb-add" data-add="${s}">+ Add Task</button></section>`;
    const tasks = pv.scoped();
    body.innerHTML = `<div class="pv-kanban">${ui.toolbar(
      [ui.chip('Group: Status'), ui.chip('⤷ Subtasks')],
      [ui.chip('⇅ Sort'), ui.chip('Filter'), ui.chip('Assignee'), ui.chip('⌕'), ui.addBtn])}
      <div class="kb-board">${pv.STATUSES.map((_, s) => col(s, tasks.filter(t => t.status === s))).join('')}</div>
      <p class="muted small kb-hint">Drag a card to another column to change its status.</p></div>`;

    const root = body.firstElementChild;
    let dragId = null;
    root.addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) return pv.addTask({ status: Number(add.dataset.add) || 0 });
      const open = e.target.closest('[data-task]');
      if (open) pv.openTask(open.dataset.task);
    });
    root.addEventListener('dragstart', e => { dragId = e.target.closest('[data-task]')?.dataset.task; e.dataTransfer.effectAllowed = 'move'; });
    root.addEventListener('dragover', e => {
      const col = e.target.closest('.kb-col');
      if (!dragId || !col) return;
      e.preventDefault();
      root.querySelectorAll('.kb-col.drop').forEach(c => c !== col && c.classList.remove('drop'));
      col.classList.add('drop');
    });
    root.addEventListener('drop', e => {
      const col = e.target.closest('.kb-col');
      const task = pv.tasks.find(t => t.id === dragId);
      dragId = null;
      if (!col || !task) return;
      e.preventDefault();
      task.status = Number(col.dataset.status);
      pv.refresh();
    });
    root.addEventListener('dragend', () => { dragId = null; root.querySelectorAll('.kb-col.drop').forEach(c => c.classList.remove('drop')); });
  });
})();
