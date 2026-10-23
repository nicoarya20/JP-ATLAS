// Users module (Penpot "Admin · Users" ①–②): approve new Google sign-ins and manage roles. Admin only.
(() => {
  const G = 'Users';
  const ADMIN = ['admin'];

  document.head.insertAdjacentHTML('beforeend', `<style>
    .us-card { display: grid; gap: var(--sp-3); }
    .us-who { display: flex; align-items: flex-start; gap: var(--sp-3); }
    .us-who .body { flex: 1; min-width: 0; display: grid; gap: var(--sp-1); }
    .us-two { display: grid; grid-template-columns: 1fr 1.4fr; gap: var(--sp-3); }
    .us-row { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); }
    .us-row .body { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .us-row .side { display: grid; justify-items: end; gap: 6px; }
    .us-bul { margin: 0; padding-left: var(--sp-5); display: grid; gap: 6px; }
    .us-bul li { line-height: var(--lh-body); }
  </style>`);

  const appbar = () => UI.appbar({ title: 'Users', back: true });
  const tabs = on => UI.tabs(['Approval', 'Roles'], on, ['users.approve', 'users.roles']);
  const intro = t => `<p class="small muted">${t}</p>`;
  const box = (title, items) => `<div class="card fill stack sm"><b class="small">${title}</b>
    <ul class="us-bul small">${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
  const who = (u, extra) => `<div class="us-who">${UI.avatar(40, u.full)}<span class="body">
    <span class="between"><b>${u.full}</b><span class="small muted">${u.day} · ${u.time}</span></span>
    <span class="small">${u.email}</span>${extra}</span></div>`;
  const [sari, budi] = D.users.pending, C = D.users.counts;

  // ---------- ① Approval ----------
  const pending = () => `<div class="card us-card">
    ${who(sari, `<span class="small muted">Position: ${sari.job} · Division: ${sari.division}</span>
      <span class="small muted">Phone ${sari.phone}</span>`)}
    <div class="between"><span class="small">Starting role</span>${PJ.select('Member ▾', { pill: true, toast: 'Member · Project Manager' })}</div>
    <div class="us-two">${UI.btn('Reject', 'outline', { toast: 'Write a reason first' })}${UI.btn('Approve', 'primary', { toast: 'User approved as Member' })}</div>
  </div>`;
  const rejecting = () => `<div class="card us-card">
    ${who(budi, '<span class="small muted">Profile not filled in. Only name, email and photo from Google.</span>')}
    <div class="stack sm">${UI.field('Reason for rejecting (required)', { area: true, text: 'Please sign in with your office email (@kantor.id). This account is not on the employee list yet.' })}
      <p class="small muted">The reason is shown to the user when they try to sign in.</p></div>
    <div class="us-two">${UI.btn('Cancel', 'outline', { toast: 'Rejection canceled' })}${UI.btn('Reject user', 'primary', { toast: 'User rejected' })}</div>
  </div>`;

  App.screen('users.approve', { title: '① Users · Approval', group: G, roles: ADMIN, render: () => `
    ${appbar()}
    <div class="content stack">
      ${tabs(0)}
      ${intro('New users sign in with Google and wait for your decision. Only Admins can approve.')}
      <div class="stack sm">${UI.chips([`Pending ${C.pending}`, `Approved ${C.approved}`, `Rejected ${C.rejected}`, `Deactivated ${C.disabled}`])}
        <label class="input"><input placeholder="Search name or email…"></label></div>
      <section class="stack"><b class="small">${C.pending} waiting</b>
        ${pending()}${rejecting()}</section>
      ${box('After approval', [
        'Approved users become Members right away; their next sign-in goes straight to Home.',
        'The Project Manager role is given in the Roles tab.',
      ])}
    </div>
    ${UI.tabbar('more')}` });

  // ---------- ② Roles ----------
  const row = key => {
    const p = D.person(key), role = p.role, o = { you: key === D.me().key };
    return `<div class="us-row">${UI.avatar(36, p.name)}
    <span class="body"><span class="row-flex"><b>${p.full}</b>${o.you ? '<span class="small">(You)</span>' : ''}</span><span class="small muted">${p.email}</span></span>
    <span class="side">${o.you ? `${UI.pill('Active')}<b class="small">${role}</b>`
      : `${PJ.select(`${role} ▾`, { pill: true, toast: 'Member · Project Manager' })}${UI.btn('Deactivate', 'ghost', { sm: true, toast: 'User deactivated' })}`}</span></div>`;
  };

  App.screen('users.roles', { title: '② Users · Roles', group: G, roles: ADMIN, render: () => `
    ${appbar()}
    <div class="content stack">
      ${tabs(1)}
      ${intro('Give or remove the Project Manager role, or deactivate a user.')}
      <div class="stack sm">${UI.chips([`Approved ${C.approved}`, `Deactivated ${C.disabled}`])}
        <label class="input"><input placeholder="Search name or email…"></label></div>
      <section class="stack xs"><b class="small">${C.approved} users</b>
        <div>${D.users.approved.map(row).join('')}</div></section>
      ${box('Rules', [
        'The last Admin can\'t be demoted or deactivated.',
        'Role changes take effect at the next sign-in.',
        'Project Managers see all projects and edit only the projects they manage. A Member appointed as a project\'s Manager can still manage that project.',
      ])}
    </div>
    ${UI.tabbar('more')}` });
})();
