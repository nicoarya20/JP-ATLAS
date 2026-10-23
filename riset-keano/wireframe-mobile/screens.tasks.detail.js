// Tasks module (Penpot "Project Manager · Tugas" ⑧–⑬): task detail per status, return/cancel sheets, project settings.
(() => {
  const TK = window.TK, { caret, status, foot, pill, days, reviewer } = TK;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .tk-banner { display: grid; gap: var(--sp-1); }
    .tk-sec { display: grid; gap: var(--sp-3); padding-top: var(--sp-2); }
    .tk-sec > .between > b { font-size: var(--fs-h3); }
    .tk-step { display: flex; align-items: center; gap: var(--sp-3); }
    .tk-ev { display: grid; gap: 6px; }
    .tk-links { display: flex; gap: var(--sp-4); font-size: var(--fs-sm); font-weight: 700; color: var(--accent-ink); }
    .item .tk-links { margin-left: var(--sp-3); }
    .tk-kv dd .muted { font-weight: 400; }
    .tk-comment { flex: 1; }
  </style>`);

  // ---------- Pieces shared by ⑧⑨⑩ (each screen shows the tapped task, else its sample: #14, #12, #17) ----------
  const kv = rows => `<dl class="tk-kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const person = name => `<span class="row-flex">${UI.avatar(20, name)}${D.person(name).full}</span>`;
  const sec = (title, right, inner) => `<section class="tk-sec"><div class="between"><b>${title}</b>${right || ''}</div>${inner}</section>`;
  const step = ([text, on]) => `<span class="tk-step"><button class="tk-check${on ? ' on' : ''}" aria-label="Step"></button><span class="small">${text}</span></span>`;
  const steps = list => list.length ? `Steps ${list.filter(s => s[1]).length}/${list.length}` : 'Steps';
  /** History line; the avatar shows the person the line starts with. */
  const log = ([text, when]) => {
    const who = text.split(/[ :]/)[0];
    return `<div class="tk-log">${UI.avatar(28, D.person(who) ? who : '')}<span class="body small">${text}</span><span class="small muted">${when}</span></div>`;
  };
  const evidence = ([file, caption]) => `<div class="tk-ev">${UI.media('Photo', 120)}<b class="small">${file}</b><span class="small muted">${caption}</span></div>`;
  const dueLabel = t => { const d = days(t.due); return t.status === 'Done' ? t.when : d < 0 ? `Overdue ${-d} days` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `Due ${t.due}`; };
  const dueNote = t => { const d = days(t.due); return t.status === 'Done' ? '' : d < 0 ? `(${-d} days late)` : d === 0 ? '(today)' : d === 1 ? '(tomorrow)' : ''; };

  /** Extras of a task; one without D.taskDetail only gets who created it (its project lead), nothing invented. */
  const info = no => {
    if (D.taskDetail[no]) return D.taskDetail[no];
    const lead = D.projects.find(p => p.name === D.task(no).project).lead;
    return { desc: '', by: lead, steps: [], proof: [], history: [[`${lead} created this task`, '']] };
  };
  /** Link card to another task; data-task makes the target screen show that task. */
  const taskLink = (t, extra = '') => `<div ${TK.attr(t)}>${UI.card(`<span class="row-flex small"><b>#${t.no}</b>${t.title} · ${t.who} · ${t.status}</span>${extra}`, { go: TK.go(t) })}</div>`;

  const isMember = () => App.is('member');
  let shown = 17; // task of the last opened detail, named by the Cancel sheet
  /** Detail page: header block, key/value facts, then sections; comment bar pinned to the bottom. o.menu = false hides ⋯ (Cancel). */
  const detail = (no, o) => {
    shown = no;
    const t = D.task(no), x = info(no);
    return `
    ${UI.appbar({ title: 'Task detail', back: true, right: o.menu === false ? '' : UI.btn('⋯', 'ghost', { sm: true, sheet: 'tasks.cancel' }) })}
    <div class="content stack">
      ${o.banner || ''}
      <div class="stack sm">
        <div class="stack xs"><h2 class="h2">${t.title}</h2>
          <span class="small muted">#${no} · ${t.project} · ${t.type}${x.phase ? ` · ${x.phase}` : ''}</span></div>
        <b class="small">${dueLabel(t)}</b>
        <span>${status(t.status, true)}</span>
      </div>
      ${o.actions}
      ${kv(o.facts)}
      ${o.after || ''}
      ${sec('Description', '', `<p class="small${x.desc ? '' : ' muted'}">${x.desc || 'No description yet.'}</p>`)}
      ${o.sections}
      ${sec('Chat & history', '', x.history.map(log).join(''))}
    </div>
    ${foot(`<label class="input tk-comment"><input placeholder="Write a comment… (@name to mention)"></label>`)}`;
  };

  /** review = "Needs review" value; left out for tasks without D.taskDetail, where it isn't known. */
  const baseFacts = (no, review, extra = []) => {
    const t = D.task(no);
    return [
      ['Assignee', person(t.who)],
      ['Due date', `<span class="row-flex">${t.due}<span class="muted">${dueNote(t)}</span></span>`],
      ['Priority', t.priority],
      ['Type', t.type],
      ...(review ? [['Needs review', review]] : []),
      ...extra,
      ['Tag', t.tags.length ? `<span class="row-flex">${t.tags.map(x => pill(x)).join('')}</span>` : '—'],
      ['Created by', info(no).by],
    ];
  };

  // ⑧ To do (sample #14) — review off, so Mark done finishes directly. A blocked task can't start: it links to its blocker.
  const blockedBy = t => { const m = t.when.match(/^Blocked by #(\d+)/); return m && D.task(+m[1]); };
  App.screen('tasks.detail-todo', { title: '⑧ Detail · To do', group: 'Tasks', render: () => {
    const no = TK.pick('tasks.detail-todo', 14), x = info(no), b = blockedBy(D.task(no));
    return detail(no, {
      menu: !isMember(),
      actions: b ? `<div class="stack sm"><b class="small">Blocked by #${b.no} · can start once it's done</b>${taskLink(b, '<span class="link">Open →</span>')}</div>`
        : `<div class="row-flex">${UI.btn('Start working', 'primary', { go: 'tasks.detail-progress', toast: 'Task started' })}${UI.btn('Mark done', 'outline', { toast: 'Marked as done' })}</div>`,
      facts: baseFacts(no, D.taskDetail[no] && (isMember() ? 'Off · you may turn it on' : 'Off · Mark done directly')),
      sections: sec(steps(x.steps), '', `${x.steps.map(step).join('') || '<p class="small muted">No steps yet.</p>'}<div>${UI.link('+ Add step', { toast: 'Step added' })}</div>`),
    });
  } });

  // ⑨ In progress (sample #12) — review on, so only Request review; lead = assignee → reviewer falls back to Admin.
  // Done tasks open here too, with their status shown and Reopen instead of Request review.
  App.screen('tasks.detail-progress', { title: '⑨ Detail · In progress', group: 'Tasks', render: () => {
    const no = TK.pick('tasks.detail-progress', 12), x = info(no), b = x.blocks && D.task(+x.blocks.match(/#(\d+)/)[1]);
    return detail(no, {
      actions: D.task(no).status === 'Done' ? UI.btn('Reopen', 'outline', { block: true, toast: 'Task reopened' })
        : UI.btn('Request review', 'primary', { block: true, go: 'tasks.detail-review', toast: 'Review requested' }),
      facts: baseFacts(no, x.reviewer && `<span>Yes · turned on by ${x.by.split(' ')[0]}</span>`, x.reviewer ? [['Reviewer', x.reviewer]] : []),
      after: x.reviewer === 'Admin' ? `<div class="card fill small">The lead is the assignee. Add a second manager so this project has a reviewer.</div>` : '',
      sections: `
        ${x.steps.length ? sec(steps(x.steps), '', x.steps.map(step).join('')) : ''}
        ${x.proof.length ? sec(`Evidence ${x.proof.length}`, '', x.proof.map(evidence).join('') + `<div>${UI.link('+ Attach evidence', { toast: 'Evidence attached' })}</div>`) : ''}
        ${b ? sec('Blocking 1 task', '', taskLink(b)) : ''}`,
    });
  } });

  // ⑩ In review (sample #17) — Approve/Return for Manager & Admin only; Needs review is locked while in review.
  // Member sees their own task waiting: no Approve/Return, just who it's waiting on.
  const asked = x => {
    const [, asker, when] = x.asked.match(/^(\S+) .* · (.+)$/), me = D.me().name;
    const text = asker === me ? `You asked ${reviewer()}` : `${asker} asked ${reviewer() === me ? 'you' : reviewer()}`;
    return `<div class="card fill strong tk-banner"><b>${text} to review this task</b><span class="small">Requested ${when}</span></div>`;
  };
  App.screen('tasks.detail-review', { title: '⑩ Detail · In review', group: 'Tasks', render: () => {
    const no = TK.pick('tasks.detail-review', 17), t = D.task(no), x = info(no);
    return detail(no, {
      banner: x.asked ? asked(x) : '',
      actions: isMember()
        ? `<div class="card fill small">Waiting for a Manager or Admin. You'll be notified when it's approved or returned.</div>`
        : `<div class="stack sm"><div class="row-flex">${UI.btn('Approve', 'primary', { go: 'tasks.all', toast: 'Task done' })}${UI.btn('Return', 'outline', { sheet: 'tasks.return' })}</div>
        <p class="small muted">Approve → automatically Done</p></div>`,
      facts: baseFacts(no, 'Yes · locked while in review', x.reviewer ? [['Reviewer', x.reviewer]] : []),
      sections: `
        ${x.proof.length ? sec(`${t.who === D.me().name ? 'Your evidence' : `Evidence from ${t.who}`} ${x.proof.length}`, '', `<div class="tk-two">${x.proof.map(evidence).join('')}</div>`) : ''}
        ${x.steps.length ? sec(`${steps(x.steps)}${x.steps.every(s => s[1]) ? ' ✓' : ''}`, '', x.steps.map(step).join('')) : ''}`,
    });
  } });

  // ---------- Sheets ----------
  const pair = (cancel, primary, toast) =>
    `<div class="tk-two">${UI.btn(cancel, 'outline', { close: true })}${UI.btn(primary, 'primary', { close: true, toast })}</div>`;
  const subNo = no => `#${no} ${D.task(no).title}`;

  // ⑪ Return (task on the review screen) — reason required; task goes back to In progress and the count is logged.
  App.sheet('tasks.return', { title: '⑪ Sheet · Return', group: 'Tasks', roles: ['pm', 'admin'], render: () => UI.sheet({
    title: 'Return task', sub: subNo(TK.pick('tasks.detail-review', 17)),
    body: `
      <div class="field"><span>Quick pick (fills the reason)</span>${UI.chips(['Still has errors', 'Not as requested', 'Evidence unclear'], -1)}</div>
      ${UI.field('Reason *', { area: true, ph: 'Explain what needs fixing…' })}
      <p class="small muted">The task goes back to In progress and is logged as "Returned ×1". ${D.task(TK.pick('tasks.detail-review', 17)).who} gets a notification.</p>`,
    actions: pair('Cancel', 'Return', 'Task returned'),
  }) });

  // ⑫ Cancel — reason required (note required for Other); moves to Canceled, can be restored. Members: own tasks only.
  App.sheet('tasks.cancel', { title: '⑫ Sheet · Cancel', group: 'Tasks', render: () => UI.sheet({
    title: 'Cancel task', sub: subNo(shown),
    body: `
      <div class="field"><span>Why cancel? *</span>
        <div class="tk-radio" data-single>${['Duplicate / already exists', 'No longer needed', 'Outside the project scope', 'Created by mistake', 'Other']
          .map((t, i) => `<button class="${i === 4 ? 'on' : ''}">${t}</button>`).join('')}</div>
      </div>
      ${UI.field('Note * (required for Other)', { area: true, ph: 'Add a note…' })}
      <p class="small muted">The task moves to Canceled. It can be restored.</p>`,
    actions: pair('Back', 'Cancel task', 'Task canceled'),
  }) });

  // ---------- ⑬ Project settings (Manager & Admin; opened from Project detail ⋯) ----------
  // Atlas types/tags with live counts; "Improvement" is an inline sample type with no tasks yet.
  const TYPES = [['Task', 'Task (task)'], ['Bug', 'Issue (issue)'], ['Improvement', 'Idea (idea)']];
  const atlasTasks = () => D.tasks.filter(t => t.project === D.project('atlas').name);
  const count = n => `${n} task${n === 1 ? '' : 's'}`;
  const typeCard = ([name, cat]) => `
    <div class="card stack sm">
      <div class="between"><b>${name}</b><span class="small muted">${count(atlasTasks().filter(t => t.type === name).length)}</span></div>
      <span class="input">${cat}${caret}</span>
      <div class="between"><span class="small muted">Base category</span>
        <span class="tk-links"><span data-toast="Rename type">Rename</span><span data-toast="Type archived">Archive</span></span></div>
    </div>`;
  const tagRow = ([tag, n]) => UI.item({
    title: pill(tag), sub: false,
    right: `<span class="small muted">${count(n)}</span><span class="tk-links"><span data-toast="Rename tag">Rename</span><span data-toast="Merge tags">Merge</span><span data-toast="Tag deleted">Delete</span></span>`,
  });
  const tagCounts = () => Object.entries(atlasTasks().flatMap(t => t.tags).reduce((m, x) => ({ ...m, [x]: (m[x] || 0) + 1 }), {}));

  App.screen('tasks.settings', { title: '⑬ Project settings', group: 'Tasks', render: () => isMember() ? `
    ${UI.appbar({ title: 'Project settings', back: true })}
    <div class="content stack">
      <div class="empty mt-6">${UI.icon(48, true).replace('<span ', '<span role="img" aria-label="Not available" ')}<b class="h3" style="color:var(--ink)">Not available for Member</b>
        <span class="small">Only Admins and this project's Manager can manage task types, tags and the "New tasks need review" setting.</span></div>
    </div>` : `
    ${UI.appbar({ title: 'Project settings', back: true })}
    <div class="content stack">
      <div class="stack xs"><h2 class="h2">${D.project('atlas').name}</h2>
        <p class="small muted">Opened from Project detail ⋯ › Project settings. Managers & Admins only.</p></div>
      <div class="card fill stack sm">
        <div class="between"><b>New tasks need review</b><span class="row-flex small"><b>Off</b><button class="tk-switch" aria-label="New tasks need review"></button></span></div>
        <span class="small">Off: new tasks finish right away with Mark done. On: tasks must go through Request review. Existing tasks don't change.</span>
        <span class="small muted">Per task, Managers/Admins can change it. Members can only turn it on.</span>
      </div>
      <section class="stack mt-2">
        <div class="stack xs"><div class="between"><h3 class="h3">Task types</h3>${UI.btn('+ Type', 'outline', { sm: true, toast: 'New type' })}</div>
          <p class="small muted">${TYPES.length} of max. 6 active types · name and category only, does not affect review</p></div>
        ${TYPES.map(typeCard).join('')}
        <p class="small muted">Types already used by tasks can only be archived, not deleted.</p>
      </section>
      <section class="stack sm mt-2"><div class="between"><h3 class="h3">Tags</h3><span class="small muted">${tagCounts().length} tags</span></div>
        <div class="list">${tagCounts().map(tagRow).join('')}</div></section>
    </div>` });
})();
