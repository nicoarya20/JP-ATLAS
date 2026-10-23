// Projects module (part 1): project list, new-project chooser, form, AI story, AI draft review, template.
// Also defines window.PJ (shared pj- helpers + CSS) used by screens.projects.detail.js, which loads after this file.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .pj-foot { flex: none; display: flex; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4) var(--sp-5); border-top: 1px solid var(--line); background: var(--paper); }
    .pj-foot .btn:first-child { flex: 0 0 112px; } .pj-foot .btn:last-child { flex: 1; }
    .pj-check { width: 20px; height: 20px; flex: none; border: 1.5px solid var(--line-strong); border-radius: 4px; display: grid; place-items: center; }
    .pj-check.on { background: var(--accent); border-color: var(--accent); }
    .pj-check.on::after { content: "✓"; color: var(--on-accent); font-size: var(--fs-xs); font-weight: 700; }
    .pj-radio { width: 20px; height: 20px; flex: none; border: 1.5px solid var(--line-strong); border-radius: 50%; }
    .on > .pj-radio, .on > * > .pj-radio { background: var(--accent); border-color: var(--accent); }
    .pj-pick > .card.on { border: 1.5px solid var(--accent); background: var(--accent-soft); }
    .pj-select { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--sp-2); min-width: 120px; padding: 6px var(--sp-3); border: 1.5px solid var(--line-strong); border-radius: 8px; font-size: var(--fs-sm); }
    .pj-select.pill { border-radius: 999px; border-width: 1px; justify-content: center; }
    .pj-soft { background: var(--soft); }
    .pj-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
    .pj-bullets { margin: var(--sp-1) 0 0; padding-left: var(--sp-5); font-size: var(--fs-sm); }
    .pj-task { display: flex; align-items: center; gap: var(--sp-3); padding-left: var(--sp-6); }
    .pj-ms { gap: 6px; padding-left: var(--sp-6); }
    .input.pj-story { min-height: 220px; flex-direction: column; align-items: stretch; padding-bottom: var(--sp-3); }
    .pj-task .t { flex: 1; }`;
  document.head.appendChild(style);
  document.addEventListener('click', e => {
    const box = e.target.closest('.pj-check');
    if (box) box.classList.toggle('on');
  });

  const PJ = {
    /** Fixed bottom action bar: Cancel-style button + primary button. */
    foot: (left, right) => `<div class="pj-foot">${left}${right}</div>`,
    check: (on = true) => `<button class="pj-check${on ? ' on' : ''}" aria-label="Toggle"></button>`,
    radio: () => '<span class="pj-radio"></span>',
    /** Dropdown-looking button. o: UI.attrs options + {pill}. */
    select: (label, o = {}) => `<button class="pj-select${o.pill ? ' pill' : ''}"${UI.attrs(o)}>${label}</button>`,
  };
  window.PJ = PJ;
  const G = 'Projects';
  const cancelFoot = (label, go, toast) => PJ.foot(UI.btn('Cancel', 'outline', { back: true }), UI.btn(label, 'primary', { go, toast }));

  // ---------- ① All projects ----------
  const projCard = p => UI.card(`
    <div class="between"><b class="h3">${p.name}</b>${UI.pill(p.status)}</div>
    <div class="stack sm mt-3">
      <span class="small muted">Lead: ${p.lead}</span>
      <b class="small">${p.why ? `${p.health} · ${p.why}` : p.health}</b>
      <div class="row-flex"><div class="grow">${UI.progress(p.progress)}</div><b class="small">${p.progress ? `${p.progress}%` : '–'}</b></div>
      <div class="between"><span class="small muted">Due ${p.due}</span>${UI.avatars(p.members)}</div>
    </div>`, { go: 'projects.overview' });

  // Member: only projects they joined, no My/All switch and no + New project. Admin sees every project.
  const member = () => App.is('member');
  const visible = () => member() ? D.projects.filter(p => p.members.includes(D.me().name)) : D.projects;
  App.screen('projects.list', { title: () => App.is('admin') ? '① All projects (Admin)' : '① All projects', group: G, render: () => {
    const list = visible(), n = list.length;
    return `
    ${UI.appbar({ title: 'Projects', right: member() ? '' : UI.btn('+ New project', 'primary', { go: 'projects.new', sm: true }) })}
    <div class="content stack">
      ${member() ? '' : UI.seg(['My projects', 'All projects'], 1)}
      <label class="input"><input placeholder="Search project name or description…"></label>
      ${UI.chips(['All', 'Active', 'On hold', 'Done', 'Draft', '! Needs attention'])}
      <div class="between"><button class="small" data-toast="Sort options"><b>Sort: Nearest deadline ▾</b></button>
        <span class="small muted">${n} projects</span></div>
      ${list.map(projCard).join('')}
    </div>
    ${UI.tabbar('projects')}`;
  } });

  // ---------- ③ New project · choose method ----------
  const way = (title, desc, hint, go, primary = false) => `<div class="card${primary ? ' strong' : ''} stack sm">
      <div class="between"><b class="h3">${title}</b>${primary ? UI.pill('Recommended', true) : ''}</div>
      <p class="small">${desc}</p>
      <div class="between" style="align-items:flex-end"><p class="small muted" style="max-width:62%">${hint}</p>
        ${UI.btn('Choose', primary ? 'primary' : 'outline', { go, sm: true })}</div></div>`;

  App.screen('projects.new', { title: '③ New project · choose method', group: G, roles: ['pm', 'admin'], render: () => `
    ${UI.appbar({ title: 'New project', back: true })}
    <div class="content stack">
      <div class="stack xs"><h2 class="title">Create a new project</h2><p class="small">Choose the easiest way for you.</p></div>
      ${way('Tell us about the project ✦', 'Describe the project like telling a friend. AI drafts the phases and tasks.',
        'You still review the draft before the project is created.', 'projects.story', true)}
      ${way('Fill in the form yourself', 'Enter the project name, dates, and members one by one.',
        'Good if you already know the project details.', 'projects.form')}
      ${way('Use a template', 'Start from a project structure you made before.',
        'Good for projects similar to a previous one.', 'projects.template')}
      <div class="mt-2">${UI.btn('Cancel', 'outline', { back: true, block: true })}</div>
    </div>` });

  // ---------- ④ Project form ----------
  // Form shown half filled in: the signed-in creator plus the two helpers from the attendance story (Dodi, Rina).
  const memberRow = (full, role, fixed = false) => `<div class="row-flex">${UI.avatar(32, full)}<span class="grow">${full}</span>
      ${PJ.select(role, { pill: true, toast: fixed ? 'Creator stays Manager' : 'Pick a role' })}</div>`;
  const helpers = () => ['dodi', 'rina'].filter(k => k !== D.me().key).map(k => D.person(k).full);

  App.screen('projects.form', { title: '④ Project form', group: G, roles: ['pm', 'admin'], render: () => `
    ${UI.appbar({ title: 'Fill in project form', back: true })}
    <div class="content stack">
      ${UI.field('Project name *', { ph: 'e.g. Attendance App' })}
      ${UI.field('Description', { ph: "Briefly describe the project's goal", area: true })}
      ${UI.field('Lead (main manager)', { text: D.me().full, icon: '<span class="spacer"></span>▾' })}
      <div class="field"><span>Initial status</span>${UI.chips(['Draft', 'Active'], 1)}
        <span class="small muted">Other statuses can be changed after the project is created.</span></div>
      <div class="field"><span>Priority</span>${UI.chips(['Low', 'Medium', 'High', 'Critical'], 1)}</div>
      <div class="pj-grid2">${UI.field('Start date', { text: 'Oct 7, 2026' })}${UI.field('End date', { text: 'Nov 7, 2026' })}</div>
      <div class="row-flex"><span class="small muted">Quick pick</span>${UI.chips(['1 wk', '2 wk', '1 mo', '3 mo'], 2)}</div>
      <div class="field"><span>Members & roles</span>
        <div class="stack sm">${memberRow(D.me().full, 'Manager', true)}${helpers().map(f => memberRow(f, 'Member ▾')).join('')}</div></div>
      <div>${UI.link('+ Add member', { toast: 'Pick a member' })}</div>
      <p class="small muted">The creator automatically becomes Manager and Lead. Default task types created: Task, Bug, Idea (can be changed in Project settings).</p>
    </div>
    ${cancelFoot('Create project', 'projects.overview', 'Project created')}` });

  // ---------- ⑤ Tell us about the project (AI) ----------
  App.screen('projects.story', { title: '⑤ Tell us about the project', group: G, roles: ['pm', 'admin'], render: () => `
    ${UI.appbar({ title: 'Tell us about the project ✦', back: true })}
    <div class="content stack">
      <p class="small">Write it like telling a friend. AI will draft the project for you to review.</p>
      <div class="input area pj-story">
        <p>${D.story.text}</p><span class="spacer"></span><span class="small muted" style="text-align:right">${D.story.text.length} / 2000 characters</span></div>
      <div class="card fill between"><b class="muted">Speak</b>${UI.pill('Not active yet · coming soon')}</div>
      <div><b class="small">To get a good draft, mention:</b>
        <ul class="pj-bullets"><li>The project's goal</li><li>When it must be done</li><li>Who is involved</li></ul></div>
    </div>
    ${cancelFoot('Build draft ✦', 'projects.draft')}` });

  // ---------- ⑥ Review AI draft ----------
  // Task types per story phase (D.story has titles only): "Fix issues from the trial" is the one Bug.
  const DRAFT_TYPES = [['Task', 'Task'], ['Task', 'Task', 'Task'], ['Task', 'Bug'], ['Task']];
  const infoRow = (label, value) => `<div class="stack xs"><span class="small muted">${label}</span><span>${value}</span></div>`;
  const task = (title, type) => `<div class="pj-task">${PJ.check()}<span class="t">${title}</span>${PJ.select(`${type} ▾`, { pill: true, toast: 'Task · Bug · Idea' })}</div>`;
  const phase = ([label, milestone, titles], i) => {
    const [name, range] = label.split(' · ');
    return `<div class="stack sm">
      <div class="row-flex">${PJ.check()}<b>${name}</b><span class="small muted">${range}</span></div>
      <div class="row-flex small pj-ms">◆ Milestone: ${milestone}</div>
      ${titles.map((t, j) => task(t, DRAFT_TYPES[i][j])).join('')}</div>`;
  };

  App.screen('projects.draft', { title: '⑥ Review AI draft', group: G, roles: ['pm', 'admin'], render: () => {
    const S = D.story, taskCount = S.phases.reduce((n, p) => n + p[2].length, 0);
    return `
    ${UI.appbar({ title: 'Review draft', back: true })}
    <div class="content stack">
      <div class="card fill between"><b class="small">✦ This is an AI draft. Review it before creating.</b>${UI.pill('Not a project yet')}</div>
      <div class="card stack sm">
        <div class="between"><b class="h3">Project info</b>${UI.link('Edit', { go: 'projects.form' })}</div>
        ${infoRow('Project name', D.project('attendance').name)}${infoRow('Description', S.summary)}${infoRow('Dates', S.dates)}
        ${infoRow('Priority · Initial status', 'Medium · Draft')}${infoRow('Members', `${D.me().name} (Manager), ${helpers().map(f => f.split(' ')[0]).join(', ')}`)}
      </div>
      <div class="stack xs"><b class="h3">Phases, milestones & initial tasks</b>
        <p class="small muted">${S.phases.length} phases · ${S.phases.length} milestones · ${taskCount} tasks</p></div>
      ${S.phases.map(phase).join('')}
      <p class="small muted">AI picked the type from Task · Bug · Idea, tap to change. Uncheck to discard.</p>
      <div class="row-flex" style="align-items:flex-start">${PJ.check(false)}
        <div class="stack xs"><b>Also save as template</b><p class="small muted">So similar projects don't need the story again.</p></div></div>
    </div>
    ${PJ.foot(UI.btn('Rebuild', 'outline', { back: true }), UI.btn('Create project', 'primary', { go: 'projects.overview', toast: 'Project created' }))}`;
  } });

  // ---------- ⑦ Use template ----------
  const tpl = (t, on = false) => `<button class="card row-flex${on ? ' on' : ''}" style="align-items:flex-start">${PJ.radio()}
      <span class="stack xs grow"><b class="h3">${t.name}</b>
        <span class="small">${t.meta}</span>
        <span class="small muted">${t.from}</span></span></button>`;

  // New project from the "Internal app" template (60 days): start Oct 12 → end Dec 11, 2026.
  App.screen('projects.template', { title: '⑦ Use template', group: G, roles: ['pm', 'admin'], render: () => `
    ${UI.appbar({ title: 'Use template', back: true })}
    <div class="content stack">
      <div class="stack sm"><b class="h3">Choose template</b>
        <div class="stack sm pj-pick" data-single>${D.templates.map((t, i) => tpl(t, i === 0)).join('')}</div></div>
      <div class="divider"></div>
      <div class="stack"><b class="h3">Fill in project data</b>
        ${UI.field('Project name *', { text: 'Leave Request App' })}
        ${UI.field('Start date *', { text: 'Mon, Oct 12, 2026' })}
        <div class="stack sm"><span class="small muted">Estimated end</span><b>Fri, Dec 11, 2026 (60 days)</b></div></div>
      <p class="small muted">Phase and milestone dates are calculated automatically from the start date. The creator automatically becomes Manager and Lead.</p>
    </div>
    ${cancelFoot('Create project', 'projects.overview', 'Project created')}` });
})();
