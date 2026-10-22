// Inbox module (Penpot "Inbox" ①–③): things that need my response, latest updates, all-caught-up state. Content differs per role.
// Sample items come from D.inbox (Nico, PM) and D.inbox.member (Dodi); Admin-only rows are defined below.
(() => {
  const G = 'Inbox';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .ib-card { display: grid; gap: var(--sp-3); }
    .ib-who { display: flex; align-items: center; gap: var(--sp-3); }
    .ib-who .body { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .ib-quote { border-left: 3px solid var(--line-strong); padding-left: var(--sp-3); }
    .ib-acts { display: flex; justify-content: flex-end; }
    .ib-row { display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); }
    .ib-row .body { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .ib-row .side { display: grid; justify-items: end; gap: var(--sp-1); }
    .ib-unread { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  </style>`);

  const appbar = () => UI.appbar({ title: 'Inbox', back: true });
  const tabs = (on, count = 3) => UI.tabs([`Needs your response (${count})`, 'Latest updates'], on, ['inbox.respond', 'inbox.updates']);
  /** Person behind an item: the first word of the title, else "by <name>" in the meta. */
  const actor = (title, meta = '') => {
    const name = title.split(' ')[0];
    return D.person(name) ? name : (meta.match(/by (\w+)/) || [])[1] || '';
  };
  /** Card header: avatar (or stack), a short line of who/what, meta below. */
  const who = (text, meta, lead = UI.avatar(36, actor(text))) => `<div class="ib-who">${lead}<span class="body">
    <span class="small">${text}</span><span class="small muted">${meta}</span></span></div>`;
  const card = (inner, btn) => `<div class="card ib-card">${inner}<div class="ib-acts">${btn}</div></div>`;

  /** Signed-in person's inbox; Admin reuses the PM items and adds its own. Slots: [task, outcomes or invite, mention]. */
  const IB = () => App.is('member') ? D.inbox.member : D.inbox;
  const EVENT_SCREEN = { review: 'events.detail-upcoming', sprint: 'events.detail-recurring', kickoff: 'events.detail-confirmed', daily: 'events.step3' };
  /** Where an item opens: a task by its #number (data-task picks it), an event by its title, an Atlas item its overview, else the projects list. */
  const link = text => {
    const t = D.task(+(text.match(/#(\d+)/) || [])[1]);
    if (t) return { go: TK.go(t), task: t.no };
    if (/#\d+/.test(text)) return { go: 'tasks.all' };
    const ev = D.events.find(e => text.includes(e.title));
    if (ev) return { go: EVENT_SCREEN[ev.id] || 'events.list' };
    return { go: text.includes(D.project('atlas').name) ? 'projects.overview' : 'projects.list' };
  };
  const review = (why = '') => {
    const rv = IB().respond[0];
    return card(`${who(rv.title, rv.meta)}
      <div class="stack xs"><b>${rv.sub}</b>${why ? `<p class="small muted">${why}</p>` : ''}</div>`,
    UI.btn(rv.action, 'primary', { sm: true, ...link(rv.meta) }));
  };
  // Slot [1]: the PM confirms the stand-up outcomes; the Member's is an event invite.
  const second = () => {
    const it = IB().respond[1];
    return App.is('member')
      ? card(`${who(it.title, it.meta)}<b>${it.sub}</b>`, UI.btn(it.action, 'primary', { sm: true, ...link(it.sub) }))
      : card(`${who(`✦ ${it.title}`, it.meta, UI.icon(36, true))}
      <p class="small muted">${it.sub}</p>`,
    UI.btn(it.action, 'primary', { sm: true, go: 'events.step3' }));
  };
  // The quote addresses whoever is signed in (the PM items are written to @Nico; Admin reads them as itself).
  const mention = () => {
    const mn = IB().respond[2];
    return card(`${who(mn.title, mn.meta)}
      <p class="ib-quote small">${mn.sub.replace('@Nico', `@${D.me().name}`)}</p>`,
    UI.btn(mn.action, 'outline', { sm: true, ...link(mn.title) }));
  };
  const approvals = () => card(`${who(`${D.users.counts.pending} new users awaiting approval`, D.users.pending.map(u => u.full).join(', '), UI.avatars(D.users.pending.map(u => u.full)))}
      <p class="small muted">Approval cards are for Admins only. Once one Admin decides, the card disappears for all Admins.</p>`,
    UI.btn('Open Users', 'primary', { sm: true, go: 'users.approve' }));

  // ---------- ① Needs your response ----------
  // Member and PM get three cards from their own items; Admin swaps slot [1] for approvals.
  App.screen('inbox.respond', { title: '① Inbox · Needs your response', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${tabs(0)}
      ${App.is('admin')
        ? approvals() + review('You\'re the task reviewer because the project has only one Manager') + mention()
        : review() + second() + mention()}
    </div>
    ${UI.tabbar('more')}` });

  // ---------- ② Latest updates ----------
  /** Update row from {title, meta}; the last meta part ("30 min ago") moves to the right side. */
  const row = ({ title, meta }, unread = false) => {
    const parts = meta.split(' · ');
    const time = parts.pop().replace('Yesterday ', '');
    return `<div class="ib-row">${UI.avatar(32, actor(title, meta))}
    <span class="body"><span class="small">${title}</span><span class="small muted">${parts.join(' · ')}</span></span>
    <span class="side"><span class="small muted">${time}</span>${UI.btn('View', 'ghost', { sm: true, ...link(`${title} ${meta}`) })}${unread ? '<span class="ib-unread" aria-label="Unread"></span>' : ''}</span></div>`;
  };
  // Not in D: the Admin's own feed (D.inbox.updates is written for Nico).
  const ADMIN = () => ({
    Today: [{ title: 'Rina replied to your comment', meta: 'Task #12 Fix SSO login · Atlas Project · 40 min ago' }, D.inbox.updates[2]],
    Yesterday: [{ title: 'You were made Viewer of project PT Sinar Client Portal', meta: 'by Rina · Yesterday 2:10 PM' }],
  });
  const rows = day => (App.is('admin') ? ADMIN()[day] : IB().updates.filter(u => u.day === day)).map(u => row(u, day === 'Today')).join('');
  const today = () => rows('Today');
  const yesterday = () => rows('Yesterday');

  App.screen('inbox.updates', { title: '② Inbox · Latest updates', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${tabs(1)}
      <div><div class="between">${UI.label('Today')}${UI.link('Mark all as read', { toast: 'All marked as read' })}</div>
        ${today()}</div>
      <div>${UI.label('Yesterday')}${yesterday()}</div>
    </div>
    ${UI.tabbar('more')}` });

  // ---------- ③ All caught up ----------
  App.screen('inbox.empty', { title: '③ Inbox · All caught up', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${tabs(0, 0)}
      <div class="empty mt-6"><b class="h3" style="color:var(--ink)">✓ All caught up</b>
        <span class="small">Nothing needs your response right now.</span>
        ${UI.btn('View latest updates', 'outline', { go: 'inbox.updates' })}</div>
    </div>
    ${UI.tabbar('more')}` });
})();
