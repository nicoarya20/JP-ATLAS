// Home module: dashboard per role (Daily Briefing, My Focus, Ask Data, Agenda & Projects), More menu, search.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .appbar.hm-bar { flex-wrap: wrap; row-gap: var(--sp-2); }   /* row 1: greeting + avatar, row 2: search */
    .hm-search { width: 100%; }
    /* Stat chips: horizontal scroller bleeding to the screen edges (ClickUp Home style); each chip as wide as its text (never wraps); first chip highlighted. */
    .hm-stats { display: flex; gap: var(--sp-2); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--sp-4); scrollbar-width: none; min-height: min-content;
      margin: 0 calc(var(--sp-4) * -1); padding: 0 var(--sp-4); }
    .hm-stats::-webkit-scrollbar { display: none; }
    .hm-stats .card { flex: none; width: auto; white-space: nowrap; display: grid; gap: 2px; padding: var(--sp-3) var(--sp-5) var(--sp-3) var(--sp-3); background: var(--soft); border-color: transparent; scroll-snap-align: start; }
    .hm-stats .card:first-child { background: var(--accent-soft); }
    .hm-ico { width: 24px; height: 24px; margin-bottom: var(--sp-1); border-radius: 6px; background: var(--bar); color: var(--ink); display: grid; place-items: center; }
    .hm-ico svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .hm-stats .card:first-child .hm-ico { background: var(--accent); color: var(--on-accent); }
    .hm-count { font-weight: 400; }
    .hm-time { width: 56px; height: 56px; border-radius: var(--r); background: var(--soft); display: grid; place-items: center; font-weight: 700; }
    .item.hm-project { display: grid; gap: var(--sp-2); }
    .hm-row-head { margin: var(--sp-4) 0 var(--sp-1); }   /* same rhythm as .label: 16px above, 4px below */
    .hm-list > .item:first-child { padding-top: 0; }
    .hm-bullet { display: flex; gap: var(--sp-3); } .hm-bullet::before { content: ""; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--ink); flex: none; }`;
  document.head.appendChild(style);

  /** Neutral mic placeholder (wireframe: icons are boxes, no emoji). */
  const mic = '<span class="icon round" style="--s:20px" role="img" aria-label="Voice input"></span>';
  const search = '<span class="icon round" style="--s:18px" role="img" aria-label="Search"></span>';
  /** Button rendered as a span: rows are already <button>s and buttons can't nest. Clicks still route via data-*. */
  const inBtn = (label, kind, o) => UI.btn(label, kind, { sm: true, ...o }).replace(/^<button/, '<span').replace(/<\/button>$/, '</span>');
  const sm = t => `<span class="small muted">${t}</span>`;
  // Focus rows are Nico's Home sample (not D.tasks), so they open the sample task; o overrides the target (e.g. the #17 review).
  const focusRow = (t, btn = inBtn('Done', 'outline', { toast: 'Task marked done' }), o = { go: 'tasks.detail-progress' }) =>
    UI.item({ title: `<b>${t.title}</b>`, sub: sm(t.meta), right: btn, ...o });
  const projectRow = p => `<button class="item hm-project" data-go="projects.overview">
      <span class="stack xs"><span class="between"><b>${p.name}</b>${UI.pill(p.state)}</span>${sm(p.meta)}</span>${UI.progress(p.pct)}</button>`;
  const seeAll = (label, o) => `<div class="mt-3">${UI.link(`${label} →`, o)}</div>`;

  // Per-role differences (Penpot Home · Member / PM / Admin). Stats, My Focus rows and list lengths change; layout stays.
  // Stat tuple: [label, count, unit (also picks the target screen), sub line (defaults to unit)].
  // Member (Dodi) counts are his own tasks; Admin counts come from D (projects, tasks, users).
  const H = D.home, F = H.focus;
  const R = {
    member: { stats: [['Assigned', 3, 'tasks', '0 overdue'], ['In Progress', 2, 'tasks'], ['Completed', 5, 'tasks']], asks: 2, done: 2, activity: 1 },
    pm: { stats: [['Assigned', H.stats.assigned, 'tasks', '0 overdue'], ['In Progress', H.stats.inProgress, 'tasks'], ['Completed', H.stats.completed, 'tasks']], asks: 3, done: 4, activity: 3 },
    admin: { stats: [['Active', D.projects.filter(p => p.status === 'Active').length, 'projects'], ['Overdue', 3, 'tasks'], ['Awaiting', D.users.counts.pending, 'users']], asks: 3, done: 4, activity: 3 },
  };
  const statGo = { tasks: 'tasks.all', projects: 'projects.list', users: 'users.approve' };
  /** Stat chip icons (inline SVG paths, 24px grid, stroked via .hm-ico svg), keyed by stat label. */
  const statIcon = {
    Assigned: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 13-3.5"/><path d="m16 18 2 2 4-4"/>',
    'In Progress': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    Completed: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    Active: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    Overdue: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    Awaiting: '<path d="M6 3h12M6 21h12M7 3v3l5 6-5 6v3M17 3v3l-5 6 5 6v3"/>',
  };
  const statSvg = l => `<svg viewBox="0 0 24 24" aria-hidden="true">${statIcon[l]}</svg>`;
  const focus = {
    member: () => `${UI.label('Overdue')}${F.overdue.map(t => focusRow(t)).join('')}
        ${UI.label('Today')}${F.today.map(t => focusRow(t)).join('')}
        ${UI.label('This week')}${F.week.map(t => focusRow(t)).join('')}
        ${seeAll('See all tasks (9)', { go: 'tasks.my' })}`,
    pm: () => `${UI.label('Overdue')}${F.overdue.map(t => focusRow(t)).join('')}
        ${UI.label('Today')}${F.today.map(t => focusRow(t)).join('')}
        ${UI.label('This week')}${focusRow(F.week[0])}
        ${focusRow(F.review, inBtn('Review', 'primary', { go: 'tasks.detail-review', task: 17 }), { go: 'tasks.detail-review', task: 17 })}
        ${seeAll(F.all, { go: 'tasks.my' })}`,
    admin: () => `${UI.label('Needs action')}
        ${UI.item({ title: `<b>Approve ${D.users.counts.pending} new users</b>`, sub: sm('Users · Approval · Waiting 1 day'), right: inBtn('Open', 'primary', { go: 'users.approve' }), go: 'users.approve' })}
        ${UI.label('Today')}${F.today.map(t => focusRow(t)).join('')}
        ${UI.label('This week')}${focusRow(F.week[0])}
        ${seeAll('See all tasks (9)', { go: 'tasks.my' })}`,
  };

  App.screen('home.main', { title: () => `① Home · ${App.ROLES[App.role]}`, group: 'Home', render: () => `
    <header class="appbar hm-bar"><h1>${D.today.greeting}, ${D.me().name}</h1>${UI.avatar(40, D.me().name)}
      <button class="input hm-search" data-go="home.search">${search}Search or ask anything…<span class="spacer"></span>${mic}</button></header>
    <div class="content stack">
      <div class="hm-stats">${R[App.role].stats.map(([l, n, unit, sub = unit]) =>
          UI.card(`<span class="hm-ico">${statSvg(l)}</span><b class="small">${l} <span class="hm-count">${n}</span></b><span class="small muted">${sub}</span>`, { go: statGo[unit] })).join('')}</div>

      <section class="card stack">${UI.head('✦ Daily Briefing', 'What do I need to know today?')}
        <div class="stack sm">${H.briefing.map(t => `<p>${t}</p>`).join('')}</div>
        ${sm(H.briefingMeta)}</section>

      <section class="card">${UI.head('My Focus', 'What should I work on now?')}
        ${focus[App.role]()}</section>

      <section class="card stack">${UI.head('✦ Ask Data', 'Ask anything about your projects')}
        <div class="row-flex"><span class="input grow">Type or say a question…<span class="spacer"></span>${mic}</span>
          ${UI.btn('Ask', 'primary', { toast: 'Answer generated' })}</div>
        <div class="chips wrap" data-single>${H.ask.questions.slice(0, R[App.role].asks).map((q, i) =>
          `<button class="chip${i ? '' : ' on'}">${q}</button>`).join('')}</div>
        <div class="card fill stack"><p class="small">${H.ask.answer}</p>
          ${H.projects.map(p => `<div class="stack xs"><div class="between"><span class="small">${p.name}</span><b class="small">${p.pct}%</b></div>${UI.progress(p.pct)}</div>`).join('')}</div></section>

      <section class="card">${UI.head('Agenda & Projects', 'Any meetings? How are my projects?')}
        ${UI.label('Today')}
        ${UI.card(`<div class="row-flex"><span class="hm-time">${H.agenda.time}</span><span class="stack xs grow"><b>${H.agenda.title}</b>${sm(H.agenda.warn)}</span></div>`, { go: 'events.detail-upcoming' })}
        <div class="between hm-row-head">${UI.label('My projects')}${UI.link('See all →', { go: 'projects.list', replace: true })}</div>
        <div class="hm-list">${H.projects.map(projectRow).join('')}</div></section>

      <section class="card">${UI.head('Tasks Completed This Week')}
        <div class="hm-list">${H.doneThisWeek.slice(0, R[App.role].done).map(([t, who]) => UI.item({ lead: '✓', title: t, sub: false, right: sm(who) })).join('')}</div>
        ${seeAll('See all', { go: 'tasks.my', replace: true })}</section>

      <section class="card stack">${UI.head('Latest Activity')}
        ${H.activity.slice(0, R[App.role].activity).map(([t, meta]) => `<div class="hm-bullet"><div class="stack xs grow"><span>${t}</span>${sm(meta)}</div></div>`).join('')}</section>
    </div>
    ${UI.tabbar('home')}` });

  /** More row; go = null keeps a "not in the wireframe yet" toast. */
  const moreItem = (title, sub, go, right = '') => UI.item({ lead: UI.icon(26), title: `<b>${title}</b>`, sub: `<span class="small muted">${sub}</span>`, right, chev: true,
    ...(go ? { go } : { toast: `${title} — not in the wireframe yet` }) });
  const badge = n => `<span class="badge">${n}</span>`;
  App.screen('home.more', { title: '② More', group: 'Home', render: () => `
    ${UI.appbar({ title: 'More', right: UI.barRight() })}
    <div class="content stack">
      ${UI.card(`<div class="row-flex">${UI.avatar(48, D.me().name)}<div class="stack xs grow"><b>${D.me().full}</b><span class="small muted row-flex">${D.me().title} · ${D.me().division}${App.is('admin') ? ' · Admin' : ''}</span></div><span class="chev"></span></div>`, { go: 'auth.pending' })}
      <div class="stack sm">
        ${UI.card(moreItem('Inbox', 'Notifications & mentions', 'inbox.respond', badge(D.inbox.respond.length)))}
        ${UI.card(moreItem('Team', 'Team members', 'team.list'))}
        ${App.is('admin') ? UI.card(moreItem('Users', 'Approve new users & manage roles', 'users.approve', badge(D.users.counts.pending))) : ''}
        ${UI.card(moreItem('Trash', 'Deleted projects, tasks & events', 'trash.list'))}
        ${UI.card(moreItem('Settings', 'Account, notifications, leave', 'settings.main'))}
      </div>
      ${UI.btn('Sign out', 'outline', { block: true, go: 'auth.login', replace: true })}
      <p class="small muted center">Help · Privacy Policy · Version 1.0</p>
    </div>
    ${UI.tabbar('more')}` });


  const result = (title, sub, go, task) => UI.item({ title: `<b>${title}</b>`, sub: `<span class="small muted">${sub}</span>`, go, task });
  App.screen('home.search', { title: '③ Search / ask', group: 'Home', render: () => `
    <header class="appbar"><button class="back" data-back aria-label="Back">←</button>
      <label class="input grow"><input placeholder="Search…" value="Atlas" autofocus><span class="muted">✕</span></label>${mic}</header>
    <div class="content stack">
      ${UI.card(`<span class="stack xs"><b class="h3">✦ Ask: “Atlas”</b><span class="small muted">Answers from your project data, like Ask Data</span></span>`, { cls: 'fill', toast: 'Answer generated' })}
      ${UI.label('Tasks')}<div class="list">${result('#12 Fix SSO login', 'Atlas Project · In progress · 2 days overdue', 'tasks.detail-progress', 12)}${result('#14 Write the API spec', 'Atlas Project · To do · Today', 'tasks.detail-todo', 14)}</div>
      ${UI.label('Projects')}<div class="list">${result('Atlas Project', 'Lead Nico · 70% · Due Oct 31', 'projects.overview')}</div>
      ${UI.label('Events')}<div class="list">${result('Atlas sprint review', 'Fri, Oct 9 · 1:00–2:00 PM · every 2 weeks', 'events.detail-recurring')}</div>
      <p class="small muted">Search task, project, event, and people names. Tap the mic to ask by voice.</p>
    </div>` });
})();
