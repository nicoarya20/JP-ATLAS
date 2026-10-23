// Tab Gantt: task yang sama dengan Calendar, digambar sebagai pohon (kiri) + garis waktu (kanan).
// Satu wadah scroll: kolom nama menempel di kiri, header minggu/hari menempel di atas.
(() => {
  const pv = window.WF_PV;
  const { ui } = pv;
  const { line } = ui;
  const ZOOM = { week: 36, month: 16 }; // lebar satu hari (px)
  const state = { zoom: 'week', colW: ZOOM.week, pane: true, closed: new Set() };
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const bar = (start, len, cls, attrs = '') => start === null ? '<span class="gt-nodate muted small">No dates</span>'
    : `<button class="gt-bar ${cls}" ${attrs} style="left:${start * state.colW}px;width:${len * state.colW - 4}px"></button>`;
  // Batang ringkasan grup = dari task paling awal sampai paling akhir di dalamnya
  const span = tasks => {
    const dated = tasks.filter(t => t.start !== null);
    if (!dated.length) return [null, 0];
    const s = Math.min(...dated.map(t => t.start));
    return [s, Math.max(...dated.map(t => t.start + t.len)) - s];
  };
  const row = (cls, name, timeline) => `<div class="gt-row ${cls}"><div class="gt-name">${name}</div><div class="gt-time">${timeline}</div></div>`;

  function rows(ctx) {
    const tasks = pv.scoped();
    const lists = ctx.scope === 'list' ? [ctx.list] : [0, 1];
    const taskRow = t => row('gt-task', `<span class="st-dot st-${t.status}"></span>${line(t.w)}${ui.avatar}`,
      bar(t.start, t.len, `st-${t.status}`, `data-task="${t.id}" title="Open task"`));
    const listRows = lists.map(l => {
      const own = tasks.filter(t => t.list === l);
      const open = !state.closed.has(l);
      return row('gt-list', `<button class="gt-toggle" data-toggle="${l}" aria-expanded="${open}">${open ? '▾' : '▸'}</button>
          <span class="ph-icon"></span><b>List Name</b><span class="muted small">00</span>`, bar(...span(own), 'gt-sum'))
        + (open ? own.map(taskRow).join('') : '');
    }).join('');
    const top = ctx.scope === 'list' ? '' : row('gt-project', '<span class="p-avatar">P</span><b>Project Name</b>', bar(...span(tasks), 'gt-sum'));
    return top + listRows;
  }

  function header() {
    const weeks = Array.from({ length: Math.ceil(pv.DAYS / 7) }, () => `<span style="width:${7 * state.colW}px">Week 00</span>`).join('');
    const days = Array.from({ length: pv.DAYS }, (_, d) => `<span class="${d === pv.TODAY ? 'today' : ''}" style="width:${state.colW}px">
      ${state.colW >= 20 ? DAY_LETTERS[d % 7] : ''}</span>`).join('');
    return row('gt-header', '<span class="muted small">Name</span>', `<div class="gt-weeks">${weeks}</div><div class="gt-days">${days}</div>`);
  }

  pv.register('gantt', (body, ctx) => {
    body.innerHTML = `<div class="pv-gantt${state.pane ? '' : ' no-pane'}" style="--col:${state.colW}px;--days:${pv.DAYS};--today:${pv.TODAY}">
      ${ui.toolbar([
        `<button class="btn-sm" data-pane aria-pressed="${state.pane}" title="Show/hide task list">▤</button>`,
        '<button class="pill" data-today>Today</button>',
        `<label class="pill"><select data-zoom>${Object.keys(ZOOM).map(z => `<option value="${z}" ${z === state.zoom ? 'selected' : ''}>${z[0].toUpperCase() + z.slice(1)}</option>`).join('')}</select></label>`,
        '<button class="chip" data-fit>⤢ Auto fit</button>', ui.chip('↧ Export'),
      ], [ui.chip('⇅ Sort'), ui.chip('Filter'), ui.chip('Assignee'), ui.addBtn])}
      <div class="gt-scroll"><div class="gt-inner">${header()}${rows(ctx)}<div class="gt-today" aria-hidden="true"></div></div></div></div>`;

    const root = body.firstElementChild;
    const scroller = root.querySelector('.gt-scroll');
    const nameW = () => state.pane ? root.querySelector('.gt-name').offsetWidth : 0;
    const toToday = () => { scroller.scrollLeft = Math.max(0, pv.TODAY * state.colW - (scroller.clientWidth - nameW()) / 3); };
    toToday();
    root.addEventListener('change', e => {
      if (!e.target.matches('[data-zoom]')) return;
      state.zoom = e.target.value;
      state.colW = ZOOM[state.zoom];
      pv.refresh();
    });
    root.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-pane]')) { state.pane = !state.pane; return pv.refresh(); }
      if (t.closest('[data-today]')) return toToday();
      // Auto fit: seluruh rentang hari muat di lebar layar tanpa scroll horizontal
      if (t.closest('[data-fit]')) { state.colW = Math.max(8, Math.floor((scroller.clientWidth - nameW()) / pv.DAYS)); return pv.refresh(); }
      const tog = t.closest('[data-toggle]');
      if (tog) {
        const l = Number(tog.dataset.toggle);
        if (!state.closed.delete(l)) state.closed.add(l);
        return pv.refresh();
      }
      if (t.closest('[data-add]')) return pv.addTask();
      const open = t.closest('[data-task]');
      if (open) pv.openTask(open.dataset.task);
    });
  });
})();
