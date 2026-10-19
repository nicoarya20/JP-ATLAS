// Tasks module (Penpot "Project Manager · Tugas" ①–⑦): lists, board, empty state, new task, CSV import.
(() => {
  const caret = '<span class="tk-caret">▾</span>';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .tk-group { display: flex; gap: 6px; align-items: center; font-size: var(--fs-h3); font-weight: 700; margin: var(--sp-2) 0 calc(var(--sp-1)*-1); }
    .tk-card { display: grid; gap: var(--sp-2); }
    .tk-card[data-go] { cursor: pointer; }
    .tk-foot { flex: none; display: flex; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4) var(--sp-5); border-top: 1px solid var(--line); background: var(--bar); }
    .tk-foot .btn { flex: 1; } .tk-foot .btn.primary { flex: 1.7; }
    .tk-check { width: 20px; height: 20px; flex: none; border: 1.5px solid var(--line-strong); border-radius: 5px; display: grid; place-items: center; color: var(--on-accent); font-size: var(--fs-xs); }
    .tk-check.on { background: var(--accent); border-color: var(--accent); }
    .tk-check.on::after { content: "✓"; }
    .tk-soft { background: var(--soft); }
    .tk-caret { margin-left: auto; color: var(--ink); }
    .tk-two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
    .tk-board { display: flex; gap: var(--sp-3); overflow-x: auto; min-height: min-content; scroll-snap-type: x mandatory; margin: 0 calc(var(--sp-4)*-1); padding: 0 var(--sp-4) var(--sp-1); scrollbar-width: none; }
    .tk-col { flex: 0 0 280px; scroll-snap-align: start; display: grid; gap: var(--sp-3); align-content: start; padding: var(--sp-3); border: 1px solid var(--line); border-radius: var(--r); background: var(--soft); }
    .tk-switch { width: 46px; height: 26px; flex: none; border-radius: 13px; background: var(--line-strong); position: relative; }
    .tk-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--on-accent); transition: left .15s; }
    .tk-switch.on { background: var(--accent); } .tk-switch.on::after { left: 23px; }
    .tk-radio > button { display: flex; align-items: center; gap: var(--sp-3); width: 100%; padding: var(--sp-2) 0; text-align: left; }
    .tk-radio > button::before { content: ""; width: 22px; height: 22px; flex: none; border-radius: 50%; border: 1.5px solid var(--line-strong); box-sizing: border-box; }
    .tk-radio > button.on::before { border: 7px solid var(--accent); }
    .tk-kv { display: grid; grid-template-columns: 130px 1fr; gap: var(--sp-3) var(--sp-2); margin: 0; font-size: var(--fs-sm); align-items: start; }
    .tk-kv dt { color: var(--muted); } .tk-kv dd { margin: 0; font-weight: 700; }
    .tk-log { display: flex; align-items: center; gap: var(--sp-3); }
    .pill.tk-filter { padding: 6px var(--sp-3); }
    .tk-wrap { flex-wrap: wrap; gap: var(--sp-2); }
    .tk-log .body { flex: 1; }
  </style>`);

  // Switches and checkboxes toggle locally; they never sit inside a data-go element.
  document.addEventListener('click', e => {
    const t = e.target.closest('.tk-switch, button.tk-check');
    if (t) t.classList.toggle('on');
  });

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const YEAR = +D.today.date.slice(-4);
  /** Date of a short "Oct 5" label in the sample year. */
  const date = s => { const [m, d] = s.split(' '); return new Date(YEAR, MON.indexOf(m), +d); };
  const TODAY = date(D.today.short.slice(5));
  /** Days from today to a short due label (negative = overdue). */
  const days = s => Math.round((date(s) - TODAY) / 864e5);
  /** Reviewer of the sample review task #17; D.tasks notes are written from their side. */
  const reviewer = () => D.taskDetail[17].reviewer.split(' ')[0];
  const blocked = t => t.when.startsWith('Blocked');
  const atlas = () => D.project('atlas');
  const atlasTasks = () => D.tasks.filter(t => t.project === atlas().name);

  /** Shared bits reused by screens.tasks.detail.js. */
  const TK = {
    caret, days, reviewer,
    /** Select-like input showing its chosen value. */
    select: (label, text) => UI.field(label, { text, icon: caret }),
    /** Status pill; soft = gray fill (detail header, Done). */
    status: (t, soft = false) => `<span class="pill${soft ? ' tk-soft' : ''}">${t}</span>`,
    /** Fixed bottom action bar (outside the scroll area). */
    foot: inner => `<div class="tk-foot">${inner}</div>`,
    /** Text pill (tag, assignee chip…); pre = label before the value. */
    pill: (text, pre = '') => `<span class="pill">${pre}${text}</span>`,
    /** Due note for the active role: an In review note names the reviewer unless that is me. */
    note: t => t.status !== 'In review' ? t.when : reviewer() === D.me().name ? 'Waiting for my review' : `Awaiting review by ${reviewer()}`,
    /** Detail screen per status; Done shares the In progress screen, which shows the real status. */
    go: t => t.status === 'In review' ? 'tasks.detail-review'
      : t.status === 'In progress' || t.status === 'Done' ? 'tasks.detail-progress' : 'tasks.detail-todo',
    /** Marks an element as opening task t; read by the click recorder below. */
    attr: t => `data-task="${t.no}"`,
    /** Task last opened per detail screen id (kept so Back re-renders the same task). */
    sel: {},
    /** Task to show on detail screen id: the tapped one if its status fits, else the screen's sample task. */
    pick: (id, fallback) => { const no = TK.sel[id], t = no && D.task(no); return t && TK.go(t) === id ? no : fallback; },
  };
  window.TK = TK;
  // Record which task a navigation opens. Capture phase, so it runs before the router renders the screen;
  // same target lookup as the router, so taps on toast-only buttons inside a card don't count.
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go],[data-sheet],[data-back],[data-close],[data-toast]');
    if (!el || !el.dataset.go) return;
    const card = el.closest('[data-task]');
    if (card) TK.sel[el.dataset.go] = +card.dataset.task; else delete TK.sel[el.dataset.go];
  }, true);

  // ---------- List header shared by ①②③④ ----------
  const header = (o = {}) => `
    ${UI.seg(['My tasks', 'All tasks'], o.all ? 1 : 0, ['tasks.my', 'tasks.all'])}
    <label class="input"><input placeholder="Search title, #number, or tag…"></label>
    ${UI.chips(['All active', 'To do', 'In progress', 'In review', 'Done'])}
    <div class="between">
      <div class="row-flex">
        ${o.all ? `<span class="pill tk-soft tk-filter">Project: ${atlas().name.split(' ')[0]} ✕</span>` : ''}
        ${UI.btn('Filter ▾', 'outline', { sm: true, toast: 'Filter options' })}
      </div>
      <div style="width:120px">${UI.seg(['List', 'Board'], o.board ? 1 : 0, ['tasks.all', 'tasks.board'])}</div>
    </div>
    <div class="between small">
      <span>Sort: Due ▾</span>
      ${o.all ? `<span class="row-flex">${UI.btn('Download CSV', 'ghost', { sm: true, toast: 'CSV downloaded' })}${UI.btn('Import CSV', 'ghost', { sm: true, go: 'tasks.csv' })}</span>` : ''}
    </div>`;

  const listShell = (inner, o = {}) => `
    ${UI.appbar({ title: 'Tasks', right: UI.btn('+ New task', 'primary', { go: 'tasks.write', sm: true }) })}
    <div class="content stack">${header(o)}${inner}</div>
    ${UI.tabbar('tasks')}`;

  // ① My tasks — grouped by urgency; card button = next action for its status.
  // Member: nothing to review, so no review group; their own task waiting on a reviewer only offers View.
  const isMember = () => App.is('member');
  const start = ['Start working', { toast: 'Task started' }];
  const action = t => t.status === 'In review' ? [isMember() ? 'View' : 'Review', { go: 'tasks.detail-review' }]
    : blocked(t) ? ['View', { go: TK.go(t) }]
    : t.status === 'In progress' ? ['Request review', { toast: 'Review requested' }] : start;
  const myCard = t => {
    const [label, o] = action(t);
    return `
    <div class="card tk-card" data-go="${TK.go(t)}" ${TK.attr(t)}>
      <b>${t.title}</b><span class="small muted">#${t.no} · ${t.project} · ${t.priority}</span>
      <div class="between">
        <span class="stack xs"><b class="small">${t.status === 'To do' && !blocked(t) ? '' : TK.note(t)}</b><span class="small muted">Due ${t.due}</span></span>
        ${UI.btn(label, 'primary', { sm: true, ...o })}
      </div>
    </div>`;
  };
  const group = (title, list) => `<p class="tk-group">${title} <span>${list.length}</span></p>${list.map(myCard).join('')}`;
  const GROUPS = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later'];
  const weekLeft = (7 - TODAY.getDay()) % 7;
  const groupOf = t => { const d = days(t.due); return d < 0 ? 0 : d <= 1 ? d + 1 : d <= weekLeft ? 3 : 4; };

  // Manager reviews the queue; Admin may review any task. Everyone else sees only their own open tasks.
  const myTasks = () => {
    const review = isMember() ? [] : D.tasks.filter(t => t.status === 'In review');
    const own = D.tasks.filter(t => t.who === D.me().name && t.status !== 'Done' && !review.includes(t));
    const groups = GROUPS.map((g, i) => [g, own.filter(t => groupOf(t) === i)]).filter(([, list]) => list.length);
    if (review.length) groups.unshift([App.is('pm') ? 'Waiting for my review' : 'Waiting for review', review]);
    return groups.map(([g, list]) => group(g, list)).join('');
  };
  App.screen('tasks.my', { title: '① My tasks (List)', group: 'Tasks', render: () => listShell(myTasks()) });

  // ② All tasks — checkbox for bulk select, body opens detail. Filtered to the Atlas project.
  const allRow = t => `
    <div class="card row-flex" style="align-items:flex-start" ${TK.attr(t)}>
      <button class="tk-check" aria-label="Select"></button>
      <div class="tk-card grow" data-go="${TK.go(t)}">
        <span class="row-flex"><b class="muted small">#${t.no}</b><b>${t.title}</b></span>
        <span class="small muted">${t.type} · ${D.person(t.who).full} · Due ${t.due}</span>
        <span>${TK.status(t.status, t.status === 'Done')}</span>
        <b class="small">${TK.note(t)}</b>
      </div>
    </div>`;

  App.screen('tasks.all', { title: '② All tasks (List)', group: 'Tasks', render: () => {
    const list = atlasTasks();
    return listShell(`${list.map(allRow).join('')}
    <p class="small muted">1–${list.length} of ${list.length} tasks · ${atlas().name}</p>`, { all: true });
  } });

  // ③ Board — one status column per screen, next column peeks; swipe to move.
  // Member: other people's cards (and their own task in review) only open the detail.
  const boardAction = t => t.status === 'Done' ? null
    : blocked(t) || isMember() && (t.who !== D.me().name || t.status === 'In review') ? ['View →', { go: TK.go(t) }]
    : t.status === 'In review' ? ['Review →', { go: 'tasks.detail-review' }]
    : t.status === 'In progress' ? ['Request review →', { go: 'tasks.detail-review' }]
    : ['Start working →', { toast: 'Task started' }];
  const boardCard = t => {
    const a = boardAction(t);
    return `
    <div class="card stack sm" ${TK.attr(t)}>
      <div class="tk-card stack sm" data-go="${TK.go(t)}">
        <b class="small muted">#${t.no}</b><b>${t.title}</b><span class="small muted">${t.type} · ${t.priority}</span>
        <b class="small">${TK.note(t)}</b>
        <span class="row-flex small">${UI.avatar(20, t.who)}${t.who}</span>
      </div>
      ${a ? UI.btn(a[0], 'outline', { sm: true, block: true, ...a[1] }) : ''}
    </div>`;
  };
  const col = (status, list) => `<section class="tk-col"><b>${status} <span>${list.length}</span></b>${list.map(boardCard).join('')}</section>`;

  App.screen('tasks.board', { title: '③ Board', group: 'Tasks', render: () => listShell(`
    <div class="tk-board">
      ${['To do', 'In progress', 'In review', 'Done'].map(s => col(s, atlasTasks().filter(t => t.status === s))).join('')}
    </div>`, { all: true, board: true }) });

  // ④ My tasks empty — still offers + New task (not for Viewers).
  App.screen('tasks.empty', { title: '④ My tasks empty', group: 'Tasks', render: () => listShell(`
    <div class="empty mt-6">${UI.icon(48, true).replace('<span ', '<span role="img" aria-label="No tasks" ')}<b class="h3" style="color:var(--ink)">No tasks for you yet.</b>
      <span class="small">Tasks assigned to you will show up here.</span>
      ${UI.btn('+ New task', 'primary', { go: 'tasks.write' })}
    </div>`) });

  // ⑤ New task · Just write ✦ — AI drafts tasks from a story; nothing is saved before Save.
  const QW = D.quickWrite;
  const draft = d => `
    <div class="card row-flex" style="align-items:flex-start">
      <button class="tk-check on" aria-label="Include"></button>
      <div class="stack sm grow"><b>${d.title}</b>
        <span class="row-flex tk-wrap">
          ${TK.pill(d.who, 'Assignee: ')}${TK.pill(d.due, 'Due: ')}${TK.pill(d.priority, 'Priority: ')}${TK.pill(d.type, 'Type: ')}
        </span></div>
    </div>`;

  App.screen('tasks.write', { title: '⑤ New task · Just write ✦', group: 'Tasks', render: () => `
    ${UI.appbar({ title: 'New task', back: true })}
    <div class="content stack">
      ${UI.seg(['Just write ✦', 'Fill form'], 0, ['', 'tasks.form'])}
      ${TK.select('Project', atlas().name)}
      <span class="input area"><span class="val">${QW.text}</span></span>
      <div class="between">
        <span class="small muted">Speak · coming soon</span>
        ${UI.btn('Compose ✦', 'primary', { toast: 'AI drafted the tasks' })}
      </div>
      <div class="card fill between small"><b>✦ Draft from AI. Check before saving.</b><span class="muted">${QW.drafts.length} tasks</span></div>
      ${QW.drafts.map(draft).join('')}
      <p class="small muted">Example when a name is ambiguous, AI asks one thing:</p>
      <div class="card fill stack sm">
        <b class="row-flex">✦ Which ${QW.ask[0].split(' ')[0]}?</b>
        ${UI.chips(QW.ask, -1)}
      </div>
    </div>
    ${TK.foot(UI.btn('Edit text', 'outline', { toast: 'Editing text' }) + UI.btn(`Save ${QW.drafts.length} tasks`, 'primary', { go: 'tasks.my', toast: 'Tasks saved' }))}` });

  // ⑥ New task · Fill form — Reviewer only Managers/Admins, never the assignee.
  // Sample = the first AI draft; description, start date and hours are inline sample values.
  const F = QW.drafts[0];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
  App.screen('tasks.form', { title: '⑥ New task · Fill form', group: 'Tasks', render: () => `
    ${UI.appbar({ title: 'New task', back: true })}
    <div class="content stack">
      ${UI.seg(['Just write ✦', 'Fill form'], 1, ['tasks.write', ''])}
      ${TK.select('Project *', atlas().name)}
      ${UI.field('Title *', { text: F.title })}
      ${TK.select('Who works on it', D.person(F.who).full)}
      <div class="field"><span>Priority</span>${UI.chips(PRIORITIES, PRIORITIES.indexOf(F.priority))}</div>
      ${UI.field('Due date', { text: F.due })}
      <b class="small">Show less ▴</b>
      <div class="divider"></div>
      ${UI.field('Description', { text: 'The login page layout breaks on phones. Fix it before the staging release.', area: true })}
      <div class="tk-two">${TK.select('Type', F.type)}${TK.select('Phase', D.atlas.phaseNow)}</div>
      <div class="tk-two">${UI.field('Start date', { text: D.today.short })}${UI.field('Estimated hours', { text: '4' })}</div>
      <label class="field"><span>Tag</span><span class="input">${TK.pill('login')} ✕<input placeholder="Type a tag…"></span></label>
      <div class="card fill stack sm">
        <div class="between"><b>Needs review</b><span class="row-flex small"><b>Yes</b><button class="tk-switch on" aria-label="Needs review"></button></span></div>
        <span class="small muted">Default follows the project setting (${atlas().name.split(' ')[0]}: off). Turned on by ${D.me().name}.</span>
        ${isMember() ? '<span class="small muted">You can turn this on, but not off. A Manager or Admin of the project reviews it.</span>'
          : `<span class="input">Reviewer: <span class="val">${D.person(reviewer()).full} · Manager</span>${caret}</span>
        <span class="small muted">Reviewer shows only when this is on. Choices are Managers or Admins only, not the assignee.</span>`}
      </div>
    </div>
    ${TK.foot(UI.btn('Cancel', 'outline', { back: true }) + UI.btn('Save', 'primary', { go: 'tasks.detail-todo', toast: 'Task created' }))}` });

  // ⑦ Import CSV — error rows are skipped; rows with notes still import; blanks get defaults.
  const C = D.csv;
  const isError = state => state.startsWith('✕');
  const csvRow = ([title, email, due, state, note], i) => `
    <div class="card ${isError(state) ? 'strong fill' : ''} stack sm">
      <div class="between"><span class="row-flex"><span class="small muted">Row ${i + 1}</span><b>${title}</b></span><b class="small">${state}</b></div>
      <span class="small">${email === '—' ? '(empty → no assignee) · (empty → Medium) · (empty → no due date)' : `${email} · Due ${due}`}</span>
      ${note ? `<b class="small">${note}</b>` : ''}
    </div>`;

  App.screen('tasks.csv', { title: '⑦ Import CSV', group: 'Tasks', render: () => `
    ${UI.appbar({ title: 'Import CSV', back: true })}
    <div class="content stack">
      <h2 class="h2">Import tasks from CSV</h2>
      <div class="between small"><span class="row-flex">To project: <b>${atlas().name}</b></span>${UI.btn('Download sample CSV', 'ghost', { sm: true, toast: 'Sample CSV downloaded' })}</div>
      ${UI.seg(['Upload file', 'Paste text'])}
      <div class="card fill between"><span>${C.file}</span>${UI.link('Change file', { toast: 'Choose another file' })}</div>
      <div class="stack xs"><h3 class="h3">Preview</h3><p class="small muted">${C.summary}</p></div>
      ${C.rows.map(csvRow).join('')}
      <p class="small muted">Error rows are not imported. Rows with notes are still imported.</p>
    </div>
    ${TK.foot(UI.btn('Cancel', 'outline', { back: true }) + UI.btn(`Import ${C.rows.filter(r => !isError(r[3])).length} tasks`, 'primary', { go: 'tasks.all', toast: 'Tasks imported' }))}` });
})();
