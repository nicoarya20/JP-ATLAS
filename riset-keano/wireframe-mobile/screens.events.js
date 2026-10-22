// Events module (Penpot "Events" ①–③, ⑨): list, filter sheet, month calendar, new event (short + details), Member empty state.
// Also defines window.EV (shared ev- helpers) used by screens.events.detail.js, screens.events.outcomes.js and screens.trash.js.
(() => {
  const G = 'Events';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .ev-day { font-size: var(--fs-h3); font-weight: 700; line-height: var(--lh-snug); margin: var(--sp-2) 0 calc(-1*var(--sp-1)); display: flex; gap: 6px; align-items: center; }
    .ev-card { display: grid; grid-template-columns: 58px 1fr; gap: var(--sp-1) var(--sp-3); cursor: pointer; }
    .ev-when { font-size: var(--fs-sm); font-weight: 700; padding-top: 2px; }
    .ev-body { display: grid; gap: var(--sp-3); min-width: 0; }
    .ev-title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px var(--sp-2); }
    .ev-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .ev-soft { background: var(--soft); }
    .ev-foot-row { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--sp-3); }
    .ev-tools, .ev-acts { display: flex; gap: var(--sp-2); align-items: center; }
    .ev-tools .seg { flex: 1; }
    .ev-month { display: flex; align-items: center; gap: var(--sp-2); }
    .ev-month .arrow { font-size: var(--fs-h2); font-weight: 700; padding: 0 2px; }
    .ev-grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 6px; text-align: center; }
    .ev-grid .wd { font-size: var(--fs-xs); color: var(--muted); padding-bottom: var(--sp-2); }
    .ev-grid button { display: grid; justify-items: center; gap: 2px; height: 48px; padding-top: 6px; font-size: var(--fs); }
    .ev-grid button span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; margin-top: calc(-1*var(--sp-2)); }
    .ev-grid button.on span { background: var(--accent); color: var(--on-accent); font-weight: 700; }
    .ev-grid i { display: flex; gap: 2px; height: 5px; }
    .ev-grid i::before, .ev-grid i.two::after { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
    .ev-agenda { display: grid; grid-template-columns: 58px 1fr; gap: var(--sp-1) var(--sp-3); border-left: 6px solid var(--accent); }
    .ev-two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
    .ev-people { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
    .ev-people .pill { padding: 6px var(--sp-3); font-size: var(--fs-sm); }
    .ev-foot { flex: none; display: flex; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4) var(--sp-5); border-top: 1px solid var(--line); background: var(--paper); }
    .ev-foot .btn { flex: 1; } .ev-foot .btn.primary { flex: 1.8; }
    .ev-snack { position: absolute; left: 16px; right: 16px; bottom: 96px; z-index: 5; display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); border-radius: var(--r); background: var(--inverse); color: var(--on-inverse); font-size: var(--fs-sm); }
    .ev-snack button { margin-left: auto; font-weight: 700; color: var(--on-inverse); }
  </style>`);

  const appbar = () => UI.appbar({ title: 'Events', sub: 'Meetings and team events', right: UI.btn('+ New event', 'primary', { go: 'events.new', sm: true }) });
  /** Search + Filter + List/Calendar switch shared by ① and ②. */
  const tools = on => `
    <label class="input"><input placeholder="Search title or location…"></label>
    <div class="ev-tools">${UI.btn('Filter ▾', 'outline', { sm: true, sheet: 'events.filter' })}${UI.seg(['List', 'Calendar'], on, ['events.list', 'events.calendar'])}</div>`;

  // ---------- ① Events · List ----------
  /** Event card from a D.events item. Card tap → ④ detail (↻ repeat → ④b); a Done card opens its outcomes (EV.results). */
  const card = e => {
    const done = e.status === 'Done';
    const detail = e.repeat ? 'events.detail-recurring' : 'events.detail-upcoming';
    const btn = !done ? UI.btn('View', 'outline', { go: detail, sm: true })
      : EV.confirmed(e) || App.is('member') ? UI.btn('View results', 'outline', { go: EV.results(e), sm: true })
      : UI.btn('Check results', 'primary', { go: EV.results(e), sm: true });
    return `<div class="card ev-card" data-go="${done ? EV.results(e) : detail}">
    <span class="ev-when">${/^(Today|Tomorrow)/.test(e.group) ? e.time : e.day}</span>
    <div class="ev-body">
      <span class="stack xs"><span class="ev-title"><b class="h3">${e.title}</b>${e.repeat ? `<b class="small">↻ ${e.repeat}</b>` : ''}</span>
        <span class="small muted">${e.range} · ${e.place}</span></span>
      <div class="ev-foot-row">
        <span class="ev-pills">${UI.pill(e.type)}<span class="pill ev-soft">${EV.status(e)}</span></span>
        ${btn}
      </div>
    </div></div>`;
  };
  const day = label => `<p class="ev-day">${label}</p>`;
  /** D.events grouped by schedule; a Member sees only events they attend. */
  const groups = () => {
    const mine = D.events.filter(e => !App.is('member') || e.attendees.includes(D.me().name));
    return [...new Set(mine.map(e => e.group))].map(g => day(g) + mine.filter(e => e.group === g).map(card).join('')).join('');
  };

  const EV = {
    /** Body of ① (also used by Trash ③ Undo, which overlays a snackbar). */
    list: (overlay = '') => `
      ${appbar()}
      <div class="content stack">
        ${UI.tabs(['Upcoming', 'Past'], 0)}
        ${tools(0)}
        ${groups()}
      </div>
      ${overlay}
      ${UI.tabbar('events')}`,
    /** Dark snackbar pinned above the tab bar. */
    snack: (text, action, o = {}) => `<div class="ev-snack">${text}<button${UI.attrs(o)}>${action}</button></div>`,
    foot: inner => `<div class="ev-foot">${inner}</div>`,
    /** Status pill text: Done, Today, or Upcoming. */
    status: e => e.status === 'Done' ? 'Done' : e.day === 'Today' ? 'Today' : 'Upcoming',
    /** "Wed, Oct 7" from D's day ("Today" / "Fri 9"); every sample event is in October 2026. */
    date: e => e.day === 'Today' ? D.today.short : e.day.replace(/^(\w+) (\d+)$/, '$1, Oct $2'),
    start: e => `${e.range.split('–')[0]} ${e.range.slice(-2)}`,
    end: e => e.range.split('–')[1],
    where: e => e.mode === 'Online' ? 'Online' : `${e.mode} · ${e.place}`,
    /** True when a Done event's outcomes are confirmed; D.kickoff holds the only confirmed sample. */
    confirmed: e => e.id === 'kickoff',
    /** Outcomes screen of a Done event: ⑨ once confirmed, else ⑦c (PM checks, Member waits). */
    results: e => EV.confirmed(e) ? 'events.detail-confirmed' : 'events.step3',
  };
  window.EV = EV;

  App.screen('events.list', { title: '① Events · List', group: G, render: () => EV.list() });

  // ---------- ①b Sheet · Filter ----------
  App.sheet('events.filter', { title: '①b Sheet · Filter', group: G, render: () => UI.sheet({
    title: 'Filter events',
    body: `
      <div class="field"><span>Project</span>${PJ.select('All projects ▾', { toast: 'Pick a project' })}</div>
      <div class="field"><span>Event type</span>${UI.chips(['All', 'Meeting', 'Review', 'Important', 'Team event', 'Other']).replace('class="chips"', 'class="chips wrap"')}</div>
      <div class="field"><span>Group by</span>${UI.seg(['Schedule', 'Type'], 0)}</div>
      <p class="small muted">Upcoming / Past tabs and search stay in the toolbar.</p>`,
    actions: `<div class="ev-two">${UI.btn('Reset', 'outline', { toast: 'Filters reset' })}${UI.btn('Apply', 'primary', { close: true, toast: 'Filter applied' })}</div>`,
  }) });

  // ---------- ② Events · Calendar (Month) ----------
  // October 2026. Dots mark days with events in D (2 = more than one): Oct 1 = Atlas kickoff (tap → ⑨), Oct 23 = next sprint review.
  const DOTS = { 1: 1, 7: 2, 8: 1, 9: 1, 13: 1, 15: 1, 23: 1 };
  const LEAD = 3; // empty cells before day 1, like the Penpot month
  const grid = () => `<div class="ev-grid">
    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span class="wd">${d}</span>`).join('')}
    <div style="grid-column:span ${LEAD}"></div>
    <div style="display:contents" data-single>${Array.from({ length: 31 }, (_, i) => i + 1).map(n =>
      `<button class="${n === 7 ? 'on' : ''}"${n === 1 ? ` data-go="${EV.results(D.event('kickoff'))}" aria-label="Oct 1 · ${D.event('kickoff').title}"` : ''}><span>${n}</span><i class="${DOTS[n] === 2 ? 'two' : ''}"${DOTS[n] ? '' : ' style="visibility:hidden"'}></i></button>`).join('')}</div>
  </div>`;
  const agenda = e => `<button class="card ev-agenda" data-go="${e.status === 'Done' ? EV.results(e) : 'events.detail-upcoming'}">
    <span class="ev-when">${e.time}</span><span class="stack xs"><b class="h3">${e.title}</b><span class="small muted">${e.type} · ${EV.status(e)}</span></span></button>`;
  /** Today's events in time order. */
  const todays = () => ['daily', 'review'].map(D.event);

  App.screen('events.calendar', { title: '② Events · Calendar (Month)', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${tools(1)}
      <div class="between">
        <span class="ev-month"><button class="arrow" data-toast="Previous month">‹</button><b>October 2026</b><button class="arrow" data-toast="Next month">›</button></span>
        <span class="ev-acts">${UI.btn('Today', 'outline', { sm: true, toast: 'Jumped to today' })}${UI.seg(['Month', 'Week'], 0)}</span>
      </div>
      ${grid()}
      <div class="divider"></div>
      <p class="ev-day">${D.today.short} · ${todays().length} events</p>
      ${todays().map(agenda).join('')}
    </div>
    ${UI.tabbar('events')}` });

  // ---------- ③a / ③b New event ----------
  const person = name => `<span class="pill ev-soft">${name} ✕</span>`;
  /** Helper text under a control; sits inside its .field so it stays 6px from the control. */
  const hint = t => `<p class="small muted">${t}</p>`;
  const select = (label, o) => PJ.select(`${label} ▾`, o).replace('class="pj-select', 'style="width:100%" class="pj-select');
  // The form is shown filled in with the sample "Onboarding design review".
  const sample = () => D.event('review');
  const TYPES = ['Meeting', 'Review', 'Important', 'Team event', 'Other'];
  const basics = (e = sample()) => `
      ${UI.field('Title *', { text: e.title })}
      ${UI.field('Date * ▾', { text: `${EV.date(e)}, 2026` })}
      <div class="ev-two">${UI.field('Start', { text: EV.start(e) })}${UI.field('End', { text: EV.end(e) })}</div>
      <div class="field"><span>Location</span>${UI.seg(['In person', 'Online'], e.mode === 'Online' ? 1 : 0)}
        <span class="input"><span class="val">${e.place}</span></span>
        ${hint('Online: paste the meeting link (Google Meet / Zoom).')}</div>
      <div class="field"><span>Attendees · picked from team members</span>
        <div class="ev-people">${e.attendees.map(person).join('')}<button class="pill" data-toast="Add a team member">+ Add person</button></div></div>`;
  const newFoot = () => EV.foot(UI.btn('Cancel', 'outline', { back: true }) + UI.btn('Save', 'primary', { go: 'events.detail-upcoming', toast: 'Event saved' }));

  App.screen('events.new', { title: '③a New event · Short', group: G, render: () => `
    ${UI.appbar({ back: true, title: 'New event' })}
    <div class="content stack">
      ${basics()}
      <div class="card fill small">Set automatically: reminder 1 day & 30 minutes before · does not repeat</div>
      <button class="h3" style="text-align:left" data-go="events.new-details">+ Add more details ▾</button>
    </div>
    ${newFoot()}` });

  App.screen('events.new-details', { title: '③b New event · More details', group: G, render: () => `
    ${UI.appbar({ back: true, title: 'New event' })}
    <div class="content stack">
      ${basics()}
      <button class="h3" style="text-align:left" data-back>Hide details ▴</button>
      <div class="field"><span>Event type</span>${UI.chips(TYPES, TYPES.indexOf(sample().type)).replace('class="chips"', 'class="chips wrap"')}</div>
      <div class="field"><span>Project (optional)</span>${select(D.project('atlas').name, { toast: 'Pick a project' })}
        ${hint('Required if meeting outcomes will become tasks.')}</div>
      <div class="field"><span>Agenda</span><span class="input area"><span class="val">${sample().agenda.map((a, i) => `${i + 1}. ${a}`).join('<br>')}</span></span></div>
      <div class="ev-two">
        <div class="field"><span>Repeat</span>${select('No', { toast: 'No · Daily · Weekly · Every 2 weeks · Monthly' })}</div>
        <div class="field"><span>Reminder</span>${select('1 day & 30 min before', { toast: 'Pick reminder times' })}</div>
      </div>
      <p class="small muted">Minutes are written during or after the meeting, from the event detail. Attendees get reminders automatically.</p>
    </div>
    ${newFoot()}` });

  // ---------- ⑨ Events · Empty (Member) ----------
  App.screen('events.empty', { title: '⑨ Events · Empty', group: G, roles: ['member'], render: () => `
    ${appbar()}
    <div class="content stack">
      ${UI.tabs(['Upcoming', 'Past'], 0)}
      ${tools(0)}
      <div class="empty mt-6">${UI.icon(48, true).replace('<span ', '<span role="img" aria-label="No events" ')}<b class="h3" style="color:var(--ink)">No events yet</b>
        <span class="small">Meetings or events you attend will show up here.</span>
        ${UI.btn('+ New event', 'primary', { go: 'events.new' })}</div>
    </div>
    ${UI.tabbar('events')}` });
})();
