// Jenis kartu dashboard Home. Wireframe mentah: tiap kartu hanya menggambar kerangka isinya
// (garis pengganti teks, angka 00, bentuk grafik generik), tanpa data asli.
(() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // Garis abu-abu pengganti teks; lebar dalam persen supaya tiap baris terlihat beda panjang
  const line = (w, cls = '') => `<span class="ph-line ${cls}" style="width:${w}%"></span>`;
  const dot = i => `<span class="st-dot st-${i}"></span>`;
  const avatar = '<span class="ph-avatar"></span>';

  // Pilihan data untuk kartu Angka. Hint = catatan apa yang dihitung, bukan data.
  const METRICS = {
    unassigned: { label: 'Unassigned', hint: 'open tasks with no assignee' },
    active:     { label: 'In Progress', hint: 'tasks in an active status' },
    done:       { label: 'Completed', hint: 'tasks in a done status' },
    overdue:    { label: 'Overdue', hint: 'past due, not completed' },
    dueWeek:    { label: 'Due in 7 Days', hint: 'not completed, due within 7 days' },
  };

  const rows = (n, widths) => `<ul class="task-rows">${Array.from({ length: n }, (_, i) =>
    `<li>${line(widths[i % widths.length])}${line(18, 'muted')}</li>`).join('')}</ul>`;

  const TYPES = {
    'ai-summary': {
      render: () => `<ul class="ai-list">${[90, 70, 85, 60].map(w => `<li>${line(w)}</li>`).join('')}</ul>
        <div class="ai-foot"><span class="muted">AI writes this summary from project data.</span><button class="btn-sm">Regenerate</button></div>`,
    },

    count: {
      render: card => `<button class="count" data-drill="${esc(METRICS[card.metric].label)}" title="View tasks">
          <span class="count-num">00</span><span class="count-unit">tasks</span></button>
        <div class="count-hint muted">${METRICS[card.metric].hint}</div>`,
    },

    'status-bar': {
      render() {
        const segs = [35, 15, 10, 40];
        const bar = segs.map((w, i) => `<button class="seg st-${i}" style="width:${w}%" data-drill="Status ${i + 1}" title="Status ${i + 1}"></button>`).join('');
        const ticks = [0, 25, 50, 75, 100].map(p => `<span style="left:${p}%">${p}%</span>`).join('');
        const legend = segs.map((_, i) => `<button class="legend-item" data-drill="Status ${i + 1}"><span class="swatch st-${i}"></span>Status ${i + 1} <b>00</b></button>`).join('');
        return `<div class="stack">${bar}</div><div class="ticks">${ticks}</div><div class="legend">${legend}</div>`;
      },
    },

    'assignee-pie': {
      render() {
        // Tiga irisan generik (50/30/20) hanya untuk menunjukkan bentuk grafik
        let acc = 0;
        const pt = a => `${50 + 48 * Math.sin(a)} ${50 - 48 * Math.cos(a)}`;
        const slices = [.5, .3, .2].map((f, i) => {
          const a0 = acc * 2 * Math.PI, a1 = (acc += f) * 2 * Math.PI;
          return `<path class="pie p-${i}" d="M50 50 L${pt(a0)} A48 48 0 ${f > .5 ? 1 : 0} 1 ${pt(a1)} Z"/>`;
        }).join('');
        const legend = [0, 1, 2].map(i => `<span class="legend-item"><span class="swatch p-${i}"></span>Name <b>00%</b></span>`).join('');
        return `<div class="pie-wrap"><svg viewBox="0 0 100 100" class="pie-svg" aria-hidden="true">${slices}</svg>
          <div class="legend col">${legend}</div></div>`;
      },
    },

    'assignee-bar': {
      render() {
        const grid = Array.from({ length: 6 }, () => '<div class="gridline"></div>').join('');
        const bars = [80, 55, 30].map(h =>
          `<button class="vbar" data-drill="Open tasks: Name"><span class="vbar-fill" style="height:${h}%"><b>00</b></span><span class="vbar-label">Name</span></button>`).join('');
        return `<div class="vchart"><div class="vgrid">${grid}</div><div class="vbars">${bars}</div></div>`;
      },
    },

    'done-week': { render: () => rows(4, [70, 55, 80, 45]) },
    'due-soon': { render: () => rows(6, [75, 60, 85, 50, 70, 65]) },

    'due-this-week': {
      render() {
        const row = i => `<div class="dt-row"><span class="dt-name">${line(35, 'crumb')}
            <span class="dt-title">${dot(i % 3)}${line([70, 55, 80, 60][i % 4])}</span></span>
          <span>${avatar}</span><span>${line(70)}</span><span class="prio"><span class="flag">⚑</span>${line(60)}</span><span></span></div>`;
        const group = (n, start) => `<details class="dt-group" open><summary><b>Group label</b> <span class="muted">00</span></summary>
          ${Array.from({ length: n }, (_, i) => row(start + i)).join('')}<button class="dt-add">+ Add Task</button></details>`;
        return `<div class="dt-bar"><span class="chip">Group: Due date</span><span class="chip">⤷ Subtasks</span><span class="spacer"></span>
            <span class="chip">Filters</span><span class="chip">✓ Closed</span><span class="chip">⌕ Search</span><span class="chip">⚙</span></div>
          <div class="dt"><div class="dt-row dt-head"><span>Name</span><span>Assignee</span><span>Due date</span><span>Priority</span>
            <button class="dt-plus" title="Add column" aria-label="Add column">+</button></div>${group(1, 0)}${group(3, 1)}</div>`;
      },
    },

    activity: {
      render: () => `<div class="act-day">${line(25, 'muted')}</div><ul class="act-list">${[0, 1, 2].map(i => `<li class="act-item">
          <div class="act-task">${dot(i)}${line([65, 75, 55][i])}</div>${line(90, 'muted')}${line(35, 'muted')}</li>`).join('')}</ul>`,
    },

    note: {
      render: card => `<div class="note" data-note contenteditable="true" spellcheck="false">${esc(card.text || 'Write a note for the team here…')}</div>`,
    },
  };

  // Isi pilihan "Add card". Default Home = 10 kartu pertama (susunan meniru template Simple Dashboard ClickUp).
  const CATALOG = [
    { type: 'ai-summary', title: 'AI Executive Summary', w: 6, h: 2, desc: 'Project status summarized in plain sentences' },
    { type: 'count', metric: 'unassigned', title: 'Unassigned', w: 2, h: 1, desc: 'Number: open tasks with no assignee' },
    { type: 'count', metric: 'active', title: 'In Progress', w: 2, h: 1, desc: 'Number: tasks currently in progress' },
    { type: 'count', metric: 'done', title: 'Completed', w: 2, h: 1, desc: 'Number: completed tasks' },
    { type: 'status-bar', title: 'Workload by Status', w: 6, h: 1, desc: 'Bar: task distribution by status' },
    { type: 'assignee-pie', title: 'Total Tasks by Assignee', w: 4, h: 2, desc: 'Pie: task count per person' },
    { type: 'assignee-bar', title: 'Open Tasks by Assignee', w: 5, h: 2, desc: 'Bar: unfinished tasks per person' },
    { type: 'done-week', title: 'Tasks Completed This Week', w: 3, h: 2, desc: 'List: tasks completed in the last 7 days' },
    { type: 'due-this-week', title: 'Tasks Due This Week or Overdue', w: 8, h: 3, desc: 'List: open tasks due this week or overdue, grouped by due date' },
    { type: 'activity', title: 'Latest Activity', w: 4, h: 3, desc: 'Feed: recent changes to tasks' },
    { type: 'count', metric: 'overdue', title: 'Overdue', w: 2, h: 1, desc: 'Number: past due, not completed' },
    { type: 'count', metric: 'dueWeek', title: 'Due in 7 Days', w: 2, h: 1, desc: 'Number: due within a week' },
    { type: 'due-soon', title: 'Upcoming Deadlines', w: 4, h: 2, desc: 'List: the tasks due soonest' },
    { type: 'note', title: 'Note', w: 3, h: 1, desc: 'Free text, e.g. a team announcement' },
  ];
  const DEFAULT_COUNT = 10;

  window.WF_CARDS = { TYPES, METRICS, CATALOG, DEFAULT_COUNT, esc, line };
})();
