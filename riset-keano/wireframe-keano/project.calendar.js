// Tab Calendar: task sebagai batang di kalender bulan/minggu. Batang bisa digeser ke hari lain;
// task tanpa tanggal ada di panel Unscheduled dan bisa ditarik ke kalender. Tanggal hanya "00" (tanpa data asli).
(() => {
  const pv = window.WF_PV;
  const { ui } = pv;
  const { line } = ui;
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const state = { mode: 'month', week: Math.floor(pv.TODAY / 7), side: 'unscheduled', panel: true };
  const WEEKS = Math.ceil(pv.DAYS / 7);
  const isOverdue = t => t.start !== null && t.status !== 3 && t.start + t.len - 1 < pv.TODAY;

  // Satu baris minggu: lapisan sel hari di belakang, batang task di depan (dipotong di batas minggu)
  function week(w, tasks) {
    const from = w * 7, to = from + 6;
    const days = Array.from({ length: 7 }, (_, i) => `<div class="cal-day${from + i === pv.TODAY ? ' today' : ''}">
      <span class="cal-num">00</span><button class="cal-plus" data-add-day="${from + i}" title="Add task" aria-label="Add task">+</button></div>`).join('');
    const bars = tasks.filter(t => t.start !== null && t.start <= to && t.start + t.len - 1 >= from).map(t => {
      const s = Math.max(t.start, from), e = Math.min(t.start + t.len - 1, to);
      const cut = (t.start < from ? ' cut-l' : '') + (t.start + t.len - 1 > to ? ' cut-r' : '');
      return `<div class="cal-bar${cut}" draggable="true" data-task="${t.id}" style="grid-column:${s - from + 1} / span ${e - s + 1}">
        <span class="st-dot st-${t.status}"></span>${line(t.w)}</div>`;
    }).join('');
    return `<div class="cal-week" data-from="${from}"><div class="cal-days">${days}</div><div class="cal-bars">${bars}</div></div>`;
  }

  function side(tasks) {
    const items = state.side === 'unscheduled' ? tasks.filter(t => t.start === null) : tasks.filter(isOverdue);
    const tab = (key, label) => `<button data-side="${key}" ${state.side === key ? 'aria-current="true"' : ''}>${label} <span class="muted">00</span></button>`;
    return `<aside class="cal-side" data-drop-side>
      <div class="cal-side-tabs">${tab('unscheduled', 'Unscheduled')}${tab('overdue', 'Overdue')}</div>
      <ul>${items.map(t => `<li class="cal-item" draggable="true" data-task="${t.id}"><span class="st-dot st-${t.status}"></span>${line(t.w)}${ui.avatar}</li>`).join('')
        || '<li class="muted small cal-empty">No tasks</li>'}</ul>
      <p class="muted small">${state.side === 'unscheduled' ? 'Drag a task onto a day to schedule it. Drag a bar here to clear its date.' : 'Past due, not completed.'}</p></aside>`;
  }

  pv.register('calendar', body => {
    const tasks = pv.scoped();
    const weeks = state.mode === 'month' ? Array.from({ length: WEEKS }, (_, w) => w) : [state.week];
    body.innerHTML = `<div class="pv-calendar${state.panel ? '' : ' no-side'}">
      ${ui.toolbar([
        '<button class="pill" data-today>Today</button>',
        `<label class="pill"><select data-mode><option value="month" ${state.mode === 'month' ? 'selected' : ''}>Month</option><option value="week" ${state.mode === 'week' ? 'selected' : ''}>Week</option></select></label>`,
        '<button class="btn-sm" data-step="-1" aria-label="Previous">‹</button><button class="btn-sm" data-step="1" aria-label="Next">›</button>',
        `<b class="cal-title">${state.mode === 'month' ? 'Month YYYY' : 'Week 00 · Month YYYY'}</b>`,
      ], [ui.chip('Filter'), ui.chip('✓ Closed'), ui.chip('Assignee'), ui.chip('▤ Panel', `data-panel aria-pressed="${state.panel}"`), ui.addBtn])}
      <div class="cal-wrap"><div class="cal ${state.mode}">
        <div class="cal-head">${WEEKDAYS.map(d => `<span>${d}</span>`).join('')}</div>
        ${weeks.map(w => week(w, tasks)).join('')}</div>${side(tasks)}</div></div>`;

    const root = body.firstElementChild;
    root.addEventListener('change', e => { if (e.target.matches('[data-mode]')) { state.mode = e.target.value; pv.refresh(); } });
    root.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-today]')) { state.week = Math.floor(pv.TODAY / 7); return pv.refresh(); }
      const step = t.closest('[data-step]');
      // Bulan lain belum digambar di wireframe; navigasi hanya berlaku di mode minggu
      if (step) { if (state.mode === 'week') { state.week = Math.min(WEEKS - 1, Math.max(0, state.week + Number(step.dataset.step))); pv.refresh(); } return; }
      if (t.closest('[data-panel]')) { state.panel = !state.panel; return pv.refresh(); }
      const sideTab = t.closest('[data-side]');
      if (sideTab) { state.side = sideTab.dataset.side; return pv.refresh(); }
      const day = t.closest('[data-add-day]');
      if (day) return pv.addTask({ start: Number(day.dataset.addDay) });
      if (t.closest('[data-add]')) return pv.addTask();
      const open = t.closest('[data-task]');
      if (open) pv.openTask(open.dataset.task);
    });

    // ---------- Geser task: hari ditentukan dari posisi x di dalam baris minggu ----------
    let drag = null;
    const dayAt = e => {
      const wk = e.target.closest?.('.cal-week');
      if (!wk) return null;
      const r = wk.getBoundingClientRect();
      const col = Math.min(6, Math.max(0, Math.floor((e.clientX - r.left) / (r.width / 7))));
      return Number(wk.dataset.from) + col;
    };
    root.addEventListener('dragstart', e => {
      const task = pv.tasks.find(t => t.id === e.target.closest('[data-task]')?.dataset.task);
      if (!task) return;
      const day = dayAt(e);
      // Simpan jarak titik pegang ke awal task supaya batang tidak meloncat saat dilepas
      drag = { task, grab: day !== null && task.start !== null ? day - task.start : 0 };
      e.dataTransfer.effectAllowed = 'move';
    });
    root.addEventListener('dragover', e => {
      if (drag && (e.target.closest('.cal-week') || e.target.closest('[data-drop-side]'))) e.preventDefault();
    });
    root.addEventListener('drop', e => {
      if (!drag) return;
      e.preventDefault();
      const day = dayAt(e);
      if (day !== null) drag.task.start = Math.min(pv.DAYS - 1, Math.max(0, day - drag.grab));
      else if (e.target.closest('[data-drop-side]')) drag.task.start = null;
      drag = null;
      pv.refresh();
    });
    root.addEventListener('dragend', () => { drag = null; });
  });
})();
