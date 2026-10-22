// Team module (Penpot "Team" ①–③): who's on my team and what they're working on. Scope and visible counts differ per role.
(() => {
  const G = 'Team';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .tm-row { display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); width: 100%; text-align: left; }
    .tm-row .body { flex: 1; min-width: 0; display: grid; gap: var(--sp-1); }
    .tm-row .counts { display: flex; gap: var(--sp-3); font-size: var(--fs-xs); font-weight: 700; }
    .tm-tools { display: flex; gap: var(--sp-2); }
    .tm-kv { display: grid; grid-template-columns: 110px 1fr; gap: var(--sp-3) var(--sp-2); margin: 0; font-size: var(--fs-sm); }
    .tm-kv dt { color: var(--muted); } .tm-kv dd { margin: 0; font-weight: 700; }
    .tm-task { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); width: 100%; text-align: left; }
    .tm-task .body { flex: 1; min-width: 0; display: grid; gap: 2px; }
  </style>`);

  const appbar = () => UI.appbar({ title: 'Team', back: true });
  /** Empty-state icon: a neutral placeholder box (wireframe), labelled for screen readers. */
  const glyph = label => UI.icon(48, true).replace('<span ', `<span role="img" aria-label="${label}" `);
  const note = t => `<p class="small muted">${t}</p>`;
  /** Intro line, then the filter controls as one tight group. */
  const tools = () => `
    <p class="small muted">Who's on your team and what they're working on</p>
    <div class="stack sm"><div class="tm-tools">${PJ.select('All projects ▾', { toast: 'Pick a project' })}${PJ.select('Sort: Name ▾', { toast: 'Name · Overdue · Active tasks' })}</div>
      <label class="input"><input placeholder="Search name…"></label></div>`;

  /** Person row. o: {key, you, role, status, extra, active, overdue}. counts = false hides the task counts (Member sees only their own). */
  const row = (o = {}) => {
    const p = D.person(o.key), status = o.status || 'Available';
    return `<button class="tm-row" data-go="team.person">${UI.avatar(40, p.name)}
    <span class="body">
      <span class="row-flex"><b>${p.full}</b>${o.you ? '<span class="small">(You)</span>' : ''}</span>
      <span class="small muted">${o.role}</span>
      <span class="small">${status === 'Available' ? '●' : '○'} ${status}</span>
      ${o.extra ? `<span class="small muted">${o.extra}</span>` : ''}
      ${o.counts === false ? '' : `<span class="counts"><span>${o.active} active</span><span>${o.overdue}</span></span>`}
    </span>
    <span class="btn ghost sm">View</span></button>`;
  };
  const [nico, rina, dodi] = D.team.list;

  const variants = {
    pm: () => `
      <div class="card fill small">${D.team.summary}</div>
      <div>${row({ ...nico, you: true })}${row(rina)}${row(dodi)}</div>`,
    admin: () => `
      <div class="card fill small">All projects · 6 people · 18 active tasks · 4 overdue</div>
      <div>${row({ key: 'ayu', you: true, role: 'Admin · No project', counts: false })}${row({ ...nico, role: 'Project Manager · Atlas Project, Internal Tools' })}
        ${row({ ...rina, extra: '' })}${row(dodi)}${row({ key: 'sri', role: 'Observer · Atlas Project', counts: false })}</div>
      ${note('Approving new users and changing roles happens in More › Users.')}`,
    member: () => `
      <div class="card fill small">Project Atlas Project · ${D.project('atlas').members.length} people</div>
      <div>${row({ ...dodi, you: true })}${row({ ...nico, counts: false })}${row({ ...rina, extra: '', counts: false })}</div>
      ${note('Task counts per person are visible only to that person, the project Manager and Admin.')}`,
  };

  // ---------- ① Team · List ----------
  App.screen('team.list', { title: '① Team · List', group: G, render: () => `
    ${appbar()}
    <div class="content stack">${tools()}${variants[App.role]()}</div>
    ${UI.tabbar('more')}` });

  // ---------- ② Team · Person ----------
  const R = D.person('rina');
  /** Task row → the detail screen for its status. Only numbers in D.tasks get data-task; #11/#18 fall back to the sample task. */
  const task = ([title, meta, pill]) => {
    const no = +title.match(/\d+/)[0];
    return `<button class="tm-task" data-go="tasks.detail-${pill === 'To do' ? 'todo' : 'progress'}"${D.task(no) ? ` data-task="${no}"` : ''}><span class="body"><b>${title}</b><span class="small muted">${meta}</span></span>${UI.pill(pill)}</button>`;
  };
  const tasks = () => App.is('member')
    ? `<div class="card fill small">Other people's task lists are visible only to the project Manager and Admin.</div>`
    : `<section class="stack sm"><div class="between"><b class="h3">Active tasks</b><span class="small muted">3 active · 1 overdue</span></div>
        <div>${D.team.rinaTasks.map(task).join('')}</div>
        ${App.is('admin') ? note('2 more tasks are in the Tasks menu.')
          : note(`${R.name} also works on PT Sinar Client Portal. Details are visible only to that project's Manager and Admin.`)}</section>`;

  App.screen('team.person', { title: '② Team · Person', group: G, render: () => `
    ${UI.appbar({ title: 'Team member', back: true })}
    <div class="content stack">
      <div class="row-flex">${UI.avatar(56, R.name)}<div class="stack xs grow"><b class="h2">${R.full}</b><span class="small">● Available</span></div></div>
      <dl class="tm-kv">
        <dt>Job title</dt><dd>${R.title}</dd>
        <dt>Division</dt><dd>${R.division}</dd>
        <dt>Email</dt><dd>${R.email}</dd>
        <dt>Account role</dt><dd>${R.role}</dd>
      </dl>
      <section class="stack sm"><b class="h3">Shared projects</b>
        <div>${UI.item({ title: 'Atlas Project', sub: false, chev: true, go: 'projects.overview' })}${UI.item({ title: 'PT Sinar Client Portal', sub: false, chev: true, go: 'projects.overview' })}</div></section>
      ${tasks()}
    </div>
    ${UI.tabbar('more')}` });

  // ---------- ③ Team · Empty (Member) ----------
  App.screen('team.empty', { title: '③ Team · Empty', group: G, roles: ['member'], render: () => `
    ${appbar()}
    <div class="content stack">
      <div class="empty mt-6">${glyph('No team')}<b class="h3" style="color:var(--ink)">No team yet</b>
        <span class="small">You haven't joined any project yet. Your team will show up once a Manager adds you to a project.</span></div>
    </div>
    ${UI.tabbar('more')}` });
})();
