// Settings module (Penpot "Pengaturan" ①–③): account, notifications, leave, and Admin-only team settings. Reached from More.
(() => {
  const G = 'Settings';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .st-card { padding: 0 var(--sp-4); }
    .st-row { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); }
    .st-row:last-child { border-bottom: 0; }
    .st-row .body { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .st-switch { width: 46px; height: 26px; flex: none; border-radius: 13px; background: var(--line-strong); position: relative; cursor: pointer; }
    .st-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--on-accent); transition: left .15s; }
    .st-switch.on { background: var(--accent); } .st-switch.on::after { left: 23px; }
    .st-select { flex: none; padding: 6px var(--sp-3); border: 1.5px solid var(--line-strong); border-radius: 8px; font-size: var(--fs-sm); white-space: nowrap; }
    .st-row .link { flex: none; }
    .st-two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
    .st-acts { display: grid; grid-template-columns: 1fr 1.4fr; gap: var(--sp-3); }
    .st-foot { flex: none; display: grid; grid-template-columns: 1fr 1.4fr; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4) var(--sp-5); border-top: 1px solid var(--line); background: var(--bar); }
  </style>`);

  // Switches toggle locally; they are spans so they never nest inside another button.
  document.addEventListener('click', e => {
    const t = e.target.closest('.st-switch');
    if (t) t.classList.toggle('on');
  });

  const sw = (on = true) => `<span class="st-switch${on ? ' on' : ''}" role="switch" aria-checked="${on}"></span>`;
  /** Setting row: bold title, muted hint (may wrap, so a <p>), control on the right. */
  const row = (title, hint, control) => `<div class="st-row">
    <span class="body"><b>${title}</b><p class="small muted">${hint}</p></span>${control}</div>`;
  /** Labelled group of rows; note = optional footnote that belongs to this group. */
  const section = (label, rows, note = '') => `<div class="stack xs">${UI.label(label)}<div class="card st-card">${rows}</div>${note ? `<p class="small muted mt-1">${note}</p>` : ''}</div>`;

  // ---------- ① Settings ----------
  App.screen('settings.main', { title: '① Settings', group: G, render: () => {
    const admin = App.is('admin'), me = D.me();
    return `
    ${UI.appbar({ title: 'Settings', sub: admin ? 'Manage your account, notifications and team' : 'Manage your account and notifications', back: true })}
    <div class="content stack">
      <div class="stack xs">${UI.label('My account')}
        ${UI.card(`<div class="row-flex">${UI.avatar(56, me.name)}
          <div class="stack xs grow"><b class="h3">${me.full}</b>
            <span class="small muted">${me.title} · ${me.division} division</span>
            <span class="small muted">${me.phone} · ${me.email}</span></div></div>
          <div class="mt-3">${UI.btn('Edit profile', 'outline', { block: true, sm: true, go: 'settings.profile' })}</div>`)}
      </div>
      ${section('Notifications',
        row('Event reminders', '1 day and 30 minutes before the event starts', sw()) +
        row('Inbox updates', 'Comments, task changes, and event invites', sw()),
        'Requests that need your response always appear in Inbox and can\'t be turned off.')}
      ${section('Availability', row('Leave', 'Not on leave. Teammates see you as Available.',
        UI.btn(admin ? 'Set leave' : 'Request leave', 'outline', { sm: true, sheet: 'settings.leave' })))}
      ${admin ? section('Team settings (Admin only)',
        row('AI features ✦', 'Voice recording, note photos, and picking meeting outcomes', sw()) +
        row('Recording retention', 'Raw recordings are deleted automatically after meeting outcomes are confirmed', '<span class="st-select">30 days ▾</span>') +
        row('Default event reminder', 'Used for new events unless the creator changes it', '<span class="st-select">1 day &amp; 30 min ▾</span>') +
        row('Leave needs approval', 'Leave requests must be approved by the project Manager or Admin first. If off, leave applies immediately.', sw()) +
        row('Roles and permissions', 'See who can do what (read-only)', UI.link('View ›', { toast: 'Roles and permissions — not in the wireframe yet' }))) : ''}
      ${UI.btn('Sign out', 'outline', { block: true, go: 'auth.login', replace: true })}
      <p class="small muted center">Project settings live inside each project.${admin ? ' Account roles are managed in Users (Admin).' : ''}</p>
    </div>`;
  } });

  // ---------- ② Edit profile ----------
  App.screen('settings.profile', { title: '② Edit profile', group: G, render: () => {
    const me = D.me();
    return `
    ${UI.appbar({ title: 'Edit profile', back: true })}
    <div class="content stack">
      <div class="stack sm" style="justify-items:center">${UI.avatar(80, me.name)}${UI.btn('Change photo', 'ghost', { sm: true, toast: 'Change photo — not in the wireframe yet' })}</div>
      ${UI.field('Full name', { text: me.full })}
      ${UI.field('Nickname (for greetings)', { text: me.name })}
      ${UI.field('Job title', { text: me.title })}
      ${UI.field('Division', { text: me.division })}
      ${UI.field('Phone number', { text: me.phone })}
      <div class="stack sm">${UI.field('Email', { text: me.email, disabled: true })}
        <p class="small muted">Email comes from your Google account and can't be changed.</p></div>
    </div>
    <div class="st-foot">${UI.btn('Cancel', 'outline', { back: true })}${UI.btn('Save', 'primary', { back: true, toast: 'Profile saved' })}</div>`;
  } });

  // ---------- ③ Sheet · Leave (copy differs per role) ----------
  const leave = {
    member: { title: 'Request leave', hint: 'Request is sent to your project Manager or Admin.', save: 'Send request', toast: 'Leave request sent' },
    pm: { title: 'Request leave', hint: 'Request is sent to Admin.', save: 'Save', toast: 'Leave request sent' },
    admin: { title: 'Set leave', hint: 'Admin leave applies immediately, no approval.', save: 'Save leave', toast: 'Leave saved' },
  };
  App.sheet('settings.leave', { title: () => `③ Sheet · ${leave[App.role].title}`, group: G, render: () => {
    const l = leave[App.role];
    return UI.sheet({
      title: l.title, sub: l.hint,
      body: `
        <div class="st-two">${UI.field('From date', { text: 'Mon, Oct 12, 2026', icon: UI.icon(18) })}${UI.field('To date', { text: 'Wed, Oct 14, 2026', icon: UI.icon(18) })}</div>
        ${UI.field('Note (optional)', { area: true, text: 'Family leave' })}`,
      actions: `<div class="st-acts">${UI.btn('Cancel', 'outline', { close: true })}${UI.btn(l.save, 'primary', { close: true, toast: l.toast })}</div>`,
    });
  } });
})();
