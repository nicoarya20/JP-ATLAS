// Projects module (part 2): project detail tabs (overview, tasks, phases, members) + extend-deadline sheet.
// Uses window.PJ helpers/CSS from screens.projects.js (loaded first in index.html).
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .pj-head { padding: var(--sp-3) var(--sp-4); }
    .pj-body { padding: var(--sp-4); }
    .pj-indent { padding-left: var(--sp-4); }
    .pj-tabs .tabs button { flex: 1; padding: var(--sp-3) var(--sp-1); }
    .pj-steps { display: grid; grid-template-columns: repeat(4, 1fr); }
    .pj-steps > div { position: relative; display: grid; justify-items: center; gap: var(--sp-2); }
    .pj-steps > div + div::before { content: ""; position: absolute; top: 10px; right: 50%; width: 100%; height: 1.5px; background: var(--line-strong); }
    .pj-steps i { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--line-strong); background: var(--paper);
      display: grid; place-items: center; font-style: normal; font-size: var(--fs-caption); color: var(--on-accent); }
    .pj-steps .done i { background: var(--accent); border-color: var(--accent); } .pj-steps .now i { background: var(--accent-soft); border-color: var(--accent); }
    .pj-steps span { text-align: center; }
    .pj-num { width: 28px; height: 28px; flex: none; border-radius: 50%; border: 1.5px solid var(--ink); display: grid; place-items: center; font-weight: 700; font-size: var(--fs-sm); }
    .pj-num.done { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
    .pj-row { display: flex; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); width: 100%; text-align: left; }
    .pj-row:last-child { border-bottom: 0; }
    .pj-roles { display: grid; grid-template-columns: 84px 1fr; gap: var(--sp-2) var(--sp-3); font-size: var(--fs-sm); }`;
  document.head.appendChild(style);

  const G = 'Projects';
  const TABS = ['projects.overview', 'projects.tasks', 'projects.phases', 'projects.members'];
  // ⋯ is not drawn on the ⑧–⑪ app bar in Penpot; the flow "⋯ › Project settings" comes from the Tasks module (⑬), so ⋯ links straight there.
  const SETTINGS = UI.btn('⋯', 'ghost', { go: 'tasks.settings', sm: true });

  // Penpot notes: deadline and members are changed by the project's Manager or an Admin, so Members see them read-only.
  const canEdit = () => !App.is('member');
  // Every project card opens the Atlas Project detail (the only project with full sample data in D).
  const P = () => D.project('atlas'), A = D.atlas;
  /** Shared detail header: status, attention reason, lead/deadline, extend button (Manager/Admin), tabs. */
  const head = on => `<div class="pj-head stack sm">
      <div class="row-flex">${UI.pill(P().status)}<span class="pill pj-soft">${P().health}</span></div>
      <span class="small">Why: ${P().why}</span>
      <b class="small mt-1">Lead: ${P().lead} · Due: ${P().dueLong}</b>
      <div class="between">${UI.pill(P().extended)}${canEdit() ? UI.btn('Extend deadline', 'outline', { sheet: 'projects.extend', sm: true }) : ''}</div>
    </div><div class="pj-tabs">${UI.tabs(['Overview', 'Tasks', 'Phases', 'Members'], on, TABS)}</div>`;
  const detail = (on, body) => `
    ${UI.appbar({ back: true, title: P().name, right: SETTINGS })}
    <div class="content flush">${head(on)}<div class="stack pj-body">${body}</div></div>
    ${UI.tabbar('projects')}`;
  const pct = (label, p) => `<div class="stack xs"><div class="between"><span class="small">${label}</span><b class="small">${p}%</b></div>${UI.progress(p)}</div>`;

  // Task notes are written from the reviewer's (Nico's) side in D; everyone else sees who the review waits on.
  const reviewer = () => D.taskDetail[17].reviewer.split(' ')[0];
  const note = t => t.status === 'In review' && !App.is('pm') ? `Awaiting review by ${reviewer()}` : t.when;
  const atlasTasks = () => D.tasks.filter(t => t.project === P().name);

  // ---------- ⑧ Overview ----------
  const STEP = { Done: 'done', 'In progress': 'now' };
  const step = ph => `<div class="${STEP[ph.state] || ''}"><i>${ph.state === 'Done' ? '✓' : ''}</i><span class="small">${ph.name}</span></div>`;
  const attn = (reason, no, go) => {
    const t = D.task(no);
    return `<button class="pj-row" data-go="${go}" data-task="${no}">${UI.icon(18, true).replace('<span ', `<span role="img" aria-label="${reason}" `)}
      <span class="stack xs grow"><b class="small">#${t.no} ${t.title}</b><span class="small muted">${t.who} · ${note(t)}</span></span></button>`;
  };
  const activity = ([text, date]) => `<div class="pj-row"><span class="small">${text}</span><span class="spacer"></span><span class="small muted">${date}</span></div>`;

  App.screen('projects.overview', { title: '⑧ Detail · Overview', group: G, render: () => detail(0, `
    <div class="card stack"><b class="h3">Progress</b>${pct('Tasks done', P().progress)}${pct('Time elapsed', A.timeElapsed)}
      <span class="small muted">Start ${A.started} · due ${P().due} · ${A.daysLeft} days left</span></div>
    <div class="card stack"><b class="h3">Phases & next milestone</b>
      <div class="pj-steps">${A.phases.map(step).join('')}</div>
      <b class="small">Now: ${A.phaseNow} · ${A.phasePct}%</b>
      <div class="stack sm"><span class="small">◆ Next milestone: ${A.nextMilestone.name}</span>
        <span class="small muted pj-indent">${A.nextMilestone.date} · in ${A.nextMilestone.inDays} days</span></div>
      <div>${UI.link('See all phases →', { go: 'projects.phases' })}</div></div>
    <div class="card"><b class="h3">Tasks needing attention</b>
      ${attn('Overdue', 12, 'tasks.detail-progress')}${attn('Awaiting review', 17, 'tasks.detail-review')}${attn('Due today', 14, 'tasks.detail-todo')}</div>
    <div class="card"><b class="h3">Recent activity</b>${A.activity.map(activity).join('')}</div>`) });

  // ---------- ⑨ Tasks ----------
  const DETAIL = { 'To do': 'tasks.detail-todo', 'In progress': 'tasks.detail-progress', 'In review': 'tasks.detail-review', Done: 'tasks.detail-progress' };
  const taskCard = (t, action) => `<div class="card stack sm" data-go="${DETAIL[t.status]}" data-task="${t.no}" role="button">
      <div class="row-flex"><span class="small muted">#${t.no}</span><b class="h3">${t.title}</b></div>
      <div>${t.status === 'Done' ? `<span class="pill pj-soft">${t.status}</span>` : UI.pill(t.status)}</div>
      <span class="small">${t.type} · ${t.priority} · ${t.who} · ${t.due}</span>
      <div class="between" style="align-items:flex-end"><b class="small">${note(t)}</b>${action}</div></div>`;
  const act = (label, kind, o) => UI.btn(label, kind, { sm: true, ...o });
  // Main action per task (Manager/Admin view). A Member only gets View, since none of these actions are theirs to take.
  const ACTIONS = {
    12: () => act('Request review', 'primary', { toast: 'Sent for review' }),
    17: () => act('Review', 'primary', { go: 'tasks.detail-review', task: 17 }),
    14: () => act('Start working', 'primary', { toast: 'Task started' }),
    15: () => act('Start working', 'outline', { toast: 'Task started' }),
  };
  const action = t => !App.is('member') && ACTIONS[t.no] ? ACTIONS[t.no]() : act('View', 'outline', { go: DETAIL[t.status], task: t.no });

  App.screen('projects.tasks', { title: '⑨ Detail · Tasks', group: G, render: () => detail(1, `
    ${UI.chips(['All', 'My tasks', 'Overdue', 'Awaiting review'])}
    <div class="between"><div style="width:150px">${UI.seg(['List', 'Board'], 0, ['', 'tasks.board'])}</div>
      ${UI.btn('+ New task', 'primary', { go: 'tasks.form', sm: true })}</div>
    ${atlasTasks().map(t => taskCard(t, action(t))).join('')}
    <span class="small muted">${atlasTasks().length} tasks</span>`) });

  // ---------- ⑩ Phases ----------
  const milestone = ph => `<div class="stack sm"><b class="small">Milestone</b>
      ${ph.milestone ? `<span class="small">◆ ${ph.milestone}</span><span class="small muted pj-indent">${ph.mState}</span>` : ''}
      <div>${UI.link('+ Milestone', { toast: 'Add milestone' })}</div></div>`;
  const PHASE_PCT = { Done: 100, 'In progress': A.phasePct };
  const PHASE_BTN = {
    'In progress': () => UI.btn('Complete phase', 'primary', { block: true, sm: true, toast: 'Phase completed' }),
    Testing: () => UI.btn('Start phase', 'outline', { block: true, sm: true, toast: 'Phase started' }),
  };
  const phaseCard = (ph, i) => {
    const p = PHASE_PCT[ph.state] || 0, btn = PHASE_BTN[ph.state] || PHASE_BTN[ph.name];
    return `<div class="card stack${ph.state === 'In progress' ? ' strong' : ''}">
      <div class="row-flex" style="align-items:flex-start"><span class="pj-num${ph.state === 'Done' ? ' done' : ''}">${ph.state === 'Done' ? '✓' : i + 1}</span>
        <span class="stack xs grow"><b class="h3">${ph.name}</b><span class="small muted">${ph.range}</span></span>
        ${ph.state === 'In progress' ? `<span class="pill pj-soft">${ph.state}</span>` : UI.pill(ph.state)}</div>
      ${p ? `<div class="row-flex"><div class="grow">${UI.progress(p)}</div><b class="small">${p}%</b></div>` : '<span class="small muted">No progress yet</span>'}
      ${milestone(ph)}${btn ? btn() : ''}</div>`;
  };
  const H = A.deadlineHistory;

  App.screen('projects.phases', { title: '⑩ Detail · Phases', group: G, render: () => detail(2, `
    <div class="between"><span class="small muted">${A.phases.length} phases</span>${UI.btn('+ Phase', 'outline', { sm: true, toast: 'Add phase' })}</div>
    ${A.phases.map(phaseCard).join('')}
    <div class="card fill stack sm"><b class="h3">Deadline history</b>
      <span class="small muted">Original deadline: ${H.original}</span>
      <div class="between"><b>${H.change}</b>${UI.pill(H.reason)}</div>
      <span class="small">${H.note} · ${H.by}</span></div>`) });

  // ---------- ⑪ Members ----------
  // Project roles are not in D: Nico is Manager + Lead, Sri joined as Observer (= Viewer), the rest are Members.
  const ROLE = { Nico: 'Manager', Sri: 'Viewer' };
  const member = name => {
    const p = D.person(name), role = ROLE[name] || 'Member', lead = name === P().lead;
    return `<div class="card stack sm">
      <div class="row-flex">${UI.avatar(36, p.name)}<span class="stack xs grow">
        <span class="row-flex"><b>${p.full}</b>${p.name === D.me().name ? '<span class="small">(You)</span>' : ''}${lead ? UI.pill('Lead') : ''}</span>
        <span class="small muted">${p.title} · ${p.division}</span></span></div>
      ${!canEdit() ? `<b class="small">${role}</b>` : `<div class="between">${PJ.select(`${role} ▾`, { toast: 'Manager · Member · Viewer' })}
        ${lead ? '<b class="small muted">Remove</b>'
          : '<button class="small" data-toast="Member removed"><b>Remove</b></button>'}</div>`}</div>`;
  };

  App.screen('projects.members', { title: '⑪ Detail · Members', group: G, render: () => detail(3, `
    <div class="between"><span class="small muted">${P().members.length} members</span>${canEdit() ? UI.btn('+ Member', 'outline', { sm: true, toast: 'Pick a member' }) : ''}</div>
    ${P().members.map(member).join('')}
    ${canEdit() ? `<div class="card fill small">${P().lead} is the only Manager, so they can't be removed. Add a second Manager so their tasks can be reviewed by someone else.</div>` : ''}
    <div class="stack sm"><b class="h3">What roles mean</b>
    <div class="pj-roles"><b>Manager</b><span>edit the project, phases, members, deadline, and review tasks</span>
      <b>Member</b><span>create and work on tasks</span><b>Viewer</b><span>view and comment</span></div></div>`) });

  // ---------- ⑫ Extend deadline (sheet over dimmed ⑧) ----------
  const reasons = ['Scope increased', 'Waiting on third party', 'Estimate was off', 'Short-staffed', 'Other'];
  const X = A.extend;
  App.sheet('projects.extend', { title: '⑫ Extend deadline', group: G, roles: ['pm', 'admin'], render: () => UI.sheet({
    title: '<span class="between">Extend deadline<button data-close aria-label="Close">✕</button></span>',
    body: `<div class="pj-grid2"><div class="stack sm"><b class="small">Current deadline</b><b class="h3">${X.current}</b></div>
        ${UI.field('New deadline *', { text: X.next })}</div>
      <span class="small muted">Example error: “New deadline must be after ${X.current}.”</span>
      <div class="field"><span>Why extend? *</span>
        <div class="pj-grid2" data-single>${reasons.map((r, i) =>
          `<button class="row-flex small${i ? '' : ' on'}" style="text-align:left">${PJ.radio()}${r}</button>`).join('')}</div></div>
      ${UI.field('Reason *', { text: X.reason, area: true })}
      <div class="card fill stack sm"><b class="small">Impact of change</b><span class="small">${X.impact}</span></div>
      <span class="small muted">Recorded in Deadline history and Project activity.</span>`,
    actions: `<div class="row-flex">${UI.btn('Cancel', 'outline', { close: true })}
      <span class="grow">${UI.btn('Save', 'primary', { block: true, close: true, toast: 'Deadline extended' })}</span></div>`,
  }) });
})();
