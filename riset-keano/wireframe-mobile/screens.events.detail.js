// Events module (Penpot "Events" ④–⑥, ⑨–⑪): event detail (one-off ④ + recurring ④b), recording mode, recording,
// results confirmed, cancel/delete sheets (one-off ⑩/⑪ + recurring ⑩b/⑪b with an "only this one / all" choice).
// Also defines window.EVD (shared evd- helpers) used by screens.events.outcomes.js, which loads after this file.
(() => {
  const G = 'Events';
  const PROJECT = () => D.project('atlas').name; // D.events have no project field; every sample event belongs to Atlas

  document.head.insertAdjacentHTML('beforeend', `<style>
    .evd-menu { position: relative; }
    .evd-menu > summary { list-style: none; cursor: pointer; font-size: var(--fs-h2); font-weight: 700; padding: 0 6px; }
    .evd-menu > summary::-webkit-details-marker { display: none; }
    .evd-menu > div { position: absolute; right: 0; top: calc(100% + 6px); z-index: 5; min-width: 190px; display: grid; padding: 6px; border: 1px solid var(--line-strong); border-radius: var(--r); background: var(--paper); }
    .evd-menu > div > button { padding: var(--sp-2) var(--sp-3); text-align: left; font-size: var(--fs); }
    .evd-soft { background: var(--soft); }
    .evd-sec { display: grid; gap: var(--sp-3); }
    .evd-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .evd-info { display: grid; gap: 6px; padding: var(--sp-3) 0; border-block: 1px solid var(--line); }
    .evd-kv { display: grid; grid-template-columns: 110px 1fr; gap: var(--sp-3) var(--sp-2); margin: 0; font-size: var(--fs-sm); padding: var(--sp-3) 0; border-block: 1px solid var(--line); }
    .evd-kv dt { color: var(--muted); } .evd-kv dd { margin: 0; font-weight: 700; }
    .evd-person { display: flex; align-items: center; gap: var(--sp-3); }
    .evd-person .body { flex: 1; }
    .evd-check { width: 22px; height: 22px; flex: none; border: 1.5px solid var(--line-strong); border-radius: 5px; display: grid; place-items: center; color: var(--on-accent); font-size: var(--fs-sm); }
    .evd-check.on { background: var(--accent); border-color: var(--accent); }
    .evd-check.on::after { content: "✓"; }
    .evd-foot { flex: none; display: grid; gap: var(--sp-2); padding: var(--sp-3) var(--sp-4) var(--sp-5); border-top: 1px solid var(--line); background: var(--bar); }
    .evd-two { display: grid; grid-template-columns: 1fr 1.6fr; gap: var(--sp-3); }
    .evd-bul { margin: 0; padding-left: var(--sp-5); display: grid; gap: 6px; }
    .evd-rec { display: grid; justify-items: center; gap: var(--sp-3); padding: calc(var(--sp-3)*3) 0 var(--sp-5); text-align: center; }
    .evd-rec .dot { width: 72px; height: 72px; border-radius: 50%; border: 6px solid var(--soft); background: var(--muted); }
    .evd-radios { display: grid; gap: var(--sp-2); }
    .evd-opt { display: flex; align-items: flex-start; gap: var(--sp-3); }
    .evd-opt.on { background: var(--accent-soft); border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .evd-radio { width: 20px; height: 20px; flex: none; border: 1.5px solid var(--line-strong); border-radius: 50%; }
    .evd-opt.on .evd-radio { border: 6px solid var(--accent); background: var(--on-accent); }
  </style>`);

  document.addEventListener('click', e => {
    // Checkboxes toggle locally; a radio option selects itself within its group; picking a ⋯ menu item closes the menu before its sheet opens.
    const box = e.target.closest('button.evd-check');
    if (box) box.classList.toggle('on');
    const opt = e.target.closest('.evd-opt');
    if (opt) opt.parentElement.querySelectorAll('.evd-opt').forEach(o => o.classList.toggle('on', o === opt));
    const item = e.target.closest('.evd-menu [data-sheet]');
    if (item) item.closest('details').open = false;
  });

  // ---------- Shared pieces ----------
  const EVD = {
    pill: (t, soft = false) => `<span class="pill${soft ? ' evd-soft' : ''}">${t}</span>`,
    sec: (title, inner, tag = '') => `<section class="evd-sec"><div class="row-flex"><b class="h3">${title}</b>${tag}</div>${inner}</section>`,
    foot: inner => `<div class="evd-foot">${inner}</div>`,
    note: t => `<p class="small muted">${t}</p>`,
    /** Title + status pills. */
    head: (title, pills) => `<div class="stack sm"><b class="h2">${title}</b><span class="evd-pills">${pills}</span></div>`,
    two: (a, b) => `<div class="evd-two">${a}${b}</div>`,
  };
  window.EVD = EVD;
  const { pill, sec, foot, note, head } = EVD;
  const bullets = items => `<ul class="evd-bul small">${items.map(t => `<li>${t}</li>`).join('')}</ul>`;

  // ⋯ holds Cancel event (⑩) and Move to Trash (⑪); suffix '-recurring' points at ⑩b/⑪b.
  // Edit/Cancel/Delete: Admin all events, PM own events or managed projects, Member only own events.
  // No sample event belongs to the Member, so a Member never gets ⋯ or Edit.
  const menu = (s = '') => `<details class="evd-menu"><summary aria-label="More">⋯</summary><div>
    <button data-sheet="events.cancel${s}">Cancel event</button><button data-sheet="events.delete${s}">Move to Trash</button></div></details>`;
  const appbar = (right = '') => UI.appbar({ title: 'Event detail', back: true, right });
  /** Compact facts block used once the event is over: date/time, place · project, attendees. */
  const info = (when, place, people) => `<div class="evd-info small"><span>${when}</span><span>${place} · ${PROJECT()}</span><span>Attendees: ${people.join(', ')}</span></div>`;

  // ---------- ④ Detail · Upcoming / ④b Detail · Recurring ----------
  // Status follows the clock: Upcoming → Ongoing → Done.
  const person = (name, role) => `<div class="evd-person">${UI.avatar(32, name)}<span class="body">${name}</span>${role ? `<span class="small muted">${role}</span>` : ''}</div>`;
  const UPDATED = { review: 'Oct 7', sprint: 'Sep 25' }; // not in D: last edit of each sample event
  const minutes = start => `<div class="card fill stack sm">
      <p class="small">Type and Photo work anytime. Voice is active from the start time (${start}) until the meeting ends.</p>
      ${UI.btn('✎ Type', 'outline', { block: true, go: 'events.step2' })}
      ${UI.btn('Photo ✦', 'outline', { block: true, toast: 'Take a photo of the whiteboard or notes' })}
      ${UI.btn(`Voice ✦ · from ${start}`, 'outline', { block: true, go: 'events.record-ready' })}
      <p class="small muted">✦ = AI-assisted. The result is a text draft you can edit first.</p>
    </div>`;

  /** Sprint review has no agenda in D. */
  const SPRINT_AGENDA = ['Demo of this sprint\'s work', 'What went well and what to fix', 'Plan for the next sprint'];

  /** Body of ④ (rec = false: D "review", created by Rina) and ④b (rec = true: D "sprint", created by Nico). */
  const detail = (rec = false) => {
    const e = D.event(rec ? 'sprint' : 'review');
    const editor = !App.is('member');
    const role = n => [n === e.creator && 'Creator', n === e.noteTaker && 'Note-taker'].filter(Boolean).join(' · ');
    const people = [e.creator, ...e.attendees.filter(n => n !== e.creator)];
    // Why the viewer may (or may not) change it; a PM who isn't the creator edits as the project's manager.
    const access = D.me().name === e.creator ? note('You created this event')
      : App.is('admin') ? note('You can change this event as an Admin')
      : App.is('member') ? `<div class="card fill small">Only the creator (${e.creator}), the project manager or an Admin can change this event.</div>`
      : '';
    return `
    ${appbar(editor ? menu(rec ? '-recurring' : '') : '')}
    <div class="content stack">
      ${head(e.title, pill('Upcoming', true) + pill(e.type) + pill(rec ? '↻ Repeats' : 'Today'))}
      ${editor ? UI.btn('Edit', 'primary', { block: true, go: 'events.new' }) : ''}
      <dl class="evd-kv">
        <dt>Time</dt><dd>${EV.date(e)} · ${e.range}</dd>
        <dt>Location</dt><dd>${EV.where(e)}</dd>
        <dt>Project</dt><dd><span class="row-flex" data-go="projects.overview">${PROJECT()} →</span></dd>
        <dt>Repeat</dt><dd>${e.repeat ? e.repeat[0].toUpperCase() + e.repeat.slice(1) : 'No'}</dd>
        <dt>Reminder</dt><dd>1 day & 30 min before</dd>
      </dl>
      ${sec(`Attendees (${people.length})`, people.map(n => person(n, role(n))).join(''))}
      ${sec('Agenda', bullets(e.agenda || SPRINT_AGENDA))}
      ${sec('Minutes', minutes(EV.start(e)), pill('None yet'))}
      ${access}
      <p class="small muted">Created by ${e.creator} · Updated ${UPDATED[e.id]}</p>
    </div>`;
  };

  App.screen('events.detail-upcoming', { title: '④ Detail · Upcoming', group: G, render: () => detail() });
  App.screen('events.detail-recurring', { title: '④b Detail · Recurring', group: G, render: () => detail(true) });

  // ---------- ⑤ Recording mode (ready) ----------
  // Recording starts only after the consent box is ticked.
  App.screen('events.record-ready', { title: '⑤ Recording mode · Ready', group: G, render: () => `
    ${UI.appbar({ title: 'Recording mode', back: true })}
    <div class="content stack">
      ${head(D.event('daily').title, pill('Ongoing', true) + pill('Meeting'))}
      <div>${UI.link('View meeting details ›', { go: 'events.step3' })}</div>
      <div class="card stack sm">
        <span class="row-flex" style="align-items:flex-start"><button class="evd-check" aria-label="Consent"></button>
          <span class="small">Attendees have been told this meeting is recorded</span></span>
        <span class="small muted">Required before recording</span>
      </div>
      <div class="evd-rec"><span class="dot"></span>${UI.btn('● Start recording', 'primary', { go: 'events.recording' })}</div>
      ${sec('Other ways', UI.btn('✎ Type notes', 'outline', { block: true, go: 'events.step2' }) +
        UI.btn('Photo of whiteboard ✦', 'outline', { block: true, toast: 'Take a photo of the whiteboard' }))}
      ${note('Uses this phone\'s microphone. Put the phone in the middle of the table for clearer sound.')}
    </div>` });

  // ---------- ⑥ Recording ----------
  App.screen('events.recording', { title: '⑥ Recording', group: G, render: () => `
    ${UI.appbar({ title: 'Recording mode', back: true })}
    <div class="content stack">
      ${head(D.event('daily').title, pill('Ongoing', true) + pill('Meeting'))}
      <div class="evd-rec">
        ${pill('● Recording', true)}
        <span class="display">00:14:52</span>
        <span class="small muted">✓ Attendees told about the recording</span>
      </div>
      ${note('Keep the screen on and this app open while recording. Audio is saved as you go.')}
    </div>
    ${foot(EVD.two(UI.btn('Pause', 'outline', { toast: 'Recording paused' }), UI.btn('Stop recording', 'primary', { go: 'events.step1' })))}` });

  // ---------- ⑨ Detail · Results confirmed ----------
  // Atlas kickoff (D.kickoff). Tasks go to the project, decisions to its history, open questions to the next meeting's agenda.
  // No ⋯: the one-off sheets show the design review.
  /** Task created from the outcomes: [label "#8 Title", status] from D.kickoff; owner, due and detail screen from D.task. */
  const made = ([label, status]) => {
    const [, no, title] = label.match(/^#(\d+) (.+)$/);
    const t = D.task(Number(no));
    return `
    <button class="card between" data-go="${TK.go(t)}" data-task="${no}" style="text-align:left">
      <span class="stack xs"><span class="row-flex"><b class="h3">#${no}</b><b class="h3">${title}</b></span><span class="small muted">${t.who} · Due ${t.due}</span></span>
      ${pill(status, status === 'Done')}
    </button>`;
  };
  /** Minutes body of the kickoff; D only has its source line. */
  const KICKOFF_MINUTES = 'Kickoff for Atlas Project. Login will use the office SSO instead of separate accounts. Before release we trial the app with 5 older users. The server budget is approved through December.';

  App.screen('events.detail-confirmed', { title: '⑨ Detail · Results confirmed', group: G, render: () => {
    const k = D.kickoff;
    const [when, range, place] = k.when.split(' · ');
    const [source, ...by] = k.source.split(' · ');
    return `
    ${appbar()}
    <div class="content stack">
      ${head(k.title, pill('Done', true) + pill('Meeting') + pill(`Confirmed · ${k.tasks.length} tasks (${k.tasks.filter(t => t[1] === 'Done').length} done)`))}
      ${info(`${when} · ${range}`, place, D.event('kickoff').attendees)}
      <div class="stack xs"><b class="h3">Meeting results</b>
        <p class="small muted">${k.confirmed}</p></div>
      ${sec(`Tasks created (${k.tasks.length})`, `
        ${k.tasks.map(made).join('')}
        ${note('Tap a task to open its detail in Tasks.')}`)}
      ${sec(`Decisions (${k.decisions.length})`, bullets(k.decisions))}
      ${sec(`Information (${k.info.length})`, bullets(k.info))}
      ${sec('Open questions (1)', `<div class="card fill stack xs"><b>${k.question.text}</b>
        <span class="small muted">${k.question.meta}</span></div>`)}
      <div class="divider"></div>
      ${sec('Minutes', `<div class="card stack sm">
        <span class="stack xs"><span class="small muted">${source}</span><span class="small muted">${by.join(' · ')}</span></span>
        <p class="small">${KICKOFF_MINUTES}</p>
      </div>
      ${UI.btn('See full minutes', 'outline', { block: true, go: 'events.step2' })}`, pill('Confirmed', true))}
    </div>`;
  } });

  // ---------- Sheets (from ⋯) ----------
  // One-off sheets use the design review (opened from ④); recurring sheets use the sprint review (from ④b).
  const one = () => D.event('review');
  const series = () => D.event('sprint');
  const reason = text => UI.field('Reason *', { area: true, text });
  const pair = (back, primary, o) => EVD.two(UI.btn(back, 'outline', { close: true }), UI.btn(primary, 'primary', { close: true, ...o }));
  /** "Which one?" single choice for recurring events. opts: [[label, hint]]; on = preselected index. */
  const which = (opts, on) => `<div class="field"><span>Which one?</span><div class="evd-radios">${opts.map(([l, h], i) =>
    `<button class="card evd-opt${i === on ? ' on' : ''}"><span class="evd-radio"></span><span class="stack sm"><b class="small">${l}</b><span class="small muted">${h}</span></span></button>`).join('')}</div></div>`;

  // ⑩ Cancel — reason required and sent to attendees; event stays visible marked Canceled.
  App.sheet('events.cancel', { title: '⑩ Sheet · Cancel event', group: G, render: () => UI.sheet({
    title: 'Cancel event?', sub: `${one().title} · ${EV.date(one())}, ${EV.start(one())}`,
    body: `
      <p class="small">The event stays visible, marked Canceled. All attendees (${one().attendees.join(', ')}) are notified.</p>
      ${reason('Rina wants to wait for the trial users\' feedback, moving to next week.')}
      ${note('The reason shows in the event detail and in the attendees\' notifications.')}
      <span class="row-flex"><button class="evd-check" aria-label="Also create a replacement event"></button><span class="small">Also create a replacement event</span></span>`,
    actions: pair('Back', 'Cancel event', { toast: 'Event canceled' }),
  }) });

  // ⑪ Delete — moves to Trash, restorable for 30 days; tasks created from the results stay. Lands on Trash ③ (Undo).
  App.sheet('events.delete', { title: '⑪ Sheet · Delete event', group: G, render: () => UI.sheet({
    title: 'Delete event?', sub: one().title,
    body: `
      <p class="small">The event moves to Trash and can be restored within 30 days. Minutes and meeting outcomes move with it. Tasks already created from the outcomes are not deleted.</p>
      <div class="card fill small">Meeting not happening? Use <b data-sheet="events.cancel">Cancel</b> so attendees know why.</div>`,
    actions: pair('Cancel', 'Move to Trash', { go: 'trash.undo' }),
  }) });

  // ⑩b Cancel recurring — default cancels only this occurrence; reason still required.
  App.sheet('events.cancel-recurring', { title: '⑩b Sheet · Cancel recurring event', group: G, render: () => UI.sheet({
    title: 'Cancel recurring event?',
    sub: `${series().title} · ${series().repeat} · ${EV.date(series())} · ${EV.start(series())}`,
    body: `
      ${which([['Only this one', 'Other occurrences continue'], ['All recurring', 'This occurrence and the following ones']], 0)}
      ${reason('This week\'s meeting is postponed.')}`,
    actions: pair('Back', 'Cancel event', { toast: 'Event canceled' }),
  }) });

  // ⑪b Delete recurring — default moves the whole series to Trash as one item. Lands on Trash ③ (Undo).
  App.sheet('events.delete-recurring', { title: '⑪b Sheet · Delete recurring event', group: G, render: () => UI.sheet({
    title: 'Delete recurring event?', sub: series().title,
    body: which([['Only this one', 'Moves to Trash, other occurrences stay'], ['All recurring', 'Whole series moves to Trash as one item']], 1),
    actions: pair('Cancel', 'Move to Trash', { go: 'trash.undo' }),
  }) });
})();
