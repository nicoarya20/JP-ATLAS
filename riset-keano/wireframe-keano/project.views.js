// Menu Projects: tab tampilan (Channel, Overview, List, Kanban, Calendar, Gantt) dan data task bersama.
// Semua tampilan membaca daftar task yang sama, jadi task yang digeser di Kanban/Calendar ikut berubah di tampilan lain.
// Task hanya kerangka: judul berupa garis abu-abu, tanggal berupa indeks hari, tanpa data asli.
(() => {
  const { esc, line } = window.WF_CARDS;

  const VIEWS = {
    channel: { label: 'Channel' },
    overview: { label: 'Overview' },
    list: { label: 'List' },
    kanban: { label: 'Kanban' },
    calendar: { label: 'Calendar' },
    gantt: { label: 'Gantt' },
  };
  // Channel & Overview milik project. List/Kanban/Calendar/Gantt juga dipakai di level list dan All Tasks
  const TASK_VIEWS = ['list', 'kanban', 'calendar', 'gantt'];
  const SCOPE_VIEWS = { project: Object.keys(VIEWS), list: TASK_VIEWS, all: TASK_VIEWS };
  const DEFAULT_VIEW = { project: 'overview', list: 'list', all: 'list' };

  const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];
  const PRIORITIES = ['Urgent', 'High', 'Normal', 'Low'];
  const DAYS = 35;  // 5 minggu, dipakai bersama oleh Calendar dan Gantt (hari 0 = sel pertama kalender)
  const TODAY = 10; // posisi "hari ini" di kedua tampilan

  // [list, status, hari mulai, lama hari]; mulai null = belum dijadwalkan
  const SEED = [[0, 3, 0, 3], [0, 3, 2, 2], [1, 2, 5, 4], [0, 1, 8, 5], [1, 1, 9, 2], [0, 0, 11, 1], [1, 0, 12, 3],
    [0, 0, 15, 5], [1, 2, 16, 2], [0, 1, 19, 1], [1, 0, 22, 4], [0, 0, 26, 2], [1, 0, null, 1], [0, 0, null, 1]];
  const WIDTHS = [70, 55, 80, 60, 75, 50, 65];
  let seq = 0;
  const makeTask = ([list, status, start, len]) => {
    const i = seq++;
    return { id: 't' + i, list, status, start, len, w: WIDTHS[i % WIDTHS.length], prio: i % PRIORITIES.length, sub: i % 4 === 1 ? 2 : 0 };
  };
  const tasks = SEED.map(makeTask);

  const body = document.getElementById('pvBody');
  const tabs = document.getElementById('pvTabs');
  const renderers = {};
  let ctx = null;

  // ---------- Potongan tampilan yang dipakai bersama ----------
  const ui = {
    esc, line,
    avatar: '<span class="ph-avatar"></span>',
    statusTag: s => `<span class="st-tag"><span class="st-dot st-${s}"></span>${STATUSES[s]}</span>`,
    prio: t => `<span class="prio"><span class="flag">⚑</span>${PRIORITIES[t.prio]}</span>`,
    // Toolbar: tombol kiri, jarak, tombol kanan
    toolbar: (left, right) => `<div class="pv-bar">${left.join('')}<span class="spacer"></span>${right.join('')}</div>`,
    chip: (label, attrs = '') => `<button class="chip" ${attrs}>${label}</button>`,
    addBtn: '<button class="pill solid" data-add>+ Add Task</button>',
  };

  // Task di cakupan aktif: level list hanya task list itu, project & All Tasks semuanya
  const scoped = () => ctx.scope === 'list' ? tasks.filter(t => t.list === ctx.list) : tasks;
  function addTask(patch = {}) {
    const t = makeTask([ctx.scope === 'list' ? ctx.list : 0, 0, null, 1]);
    tasks.push(Object.assign(t, patch));
    refresh();
  }
  const openTask = id => window.WF_TASK.open(id);

  function hashFor(view) { return [...ctx.base, view].join('/'); }

  function refresh() {
    if (!ctx) return; // belum pernah membuka menu Projects (mis. detail task dibuka dari Inbox)
    tabs.innerHTML = SCOPE_VIEWS[ctx.scope].map(key => `<a href="${hashFor(key)}" ${key === ctx.view ? 'aria-current="page"' : ''}>
      <span class="ph-icon"></span>${VIEWS[key].label}</a>`).join('');
    body.dataset.view = ctx.view;
    renderers[ctx.view](body, ctx);
  }

  // Dipanggil projects.js setiap hash berubah. base = hash tanpa nama tampilan
  function show({ scope, base, list, view }) {
    const allowed = SCOPE_VIEWS[scope];
    ctx = { scope, base, list, view: allowed.includes(view) ? view : DEFAULT_VIEW[scope] };
    refresh();
  }
  // Pindah project/list tetap di tampilan yang sama bila tampilan itu ada di cakupan baru
  const keepView = scope => ctx && SCOPE_VIEWS[scope].includes(ctx.view) ? ctx.view : null;

  window.WF_PV = {
    VIEWS, STATUSES, PRIORITIES, DAYS, TODAY, tasks, ui,
    scoped, addTask, openTask, refresh, show, keepView,
    register: (key, fn) => { renderers[key] = fn; },
  };
})();
