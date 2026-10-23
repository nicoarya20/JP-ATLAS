// Trash module (Penpot "Trash" ①–④): deleted items kept 30 days. Everyone can restore; only an Admin can delete forever.
(() => {
  const G = 'Trash';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .tr-card { display: grid; gap: var(--sp-3); }
    .tr-acts { display: flex; gap: var(--sp-2); justify-content: flex-end; }
    .tr-two { display: grid; grid-template-columns: 1fr 1.4fr; gap: var(--sp-3); }
  </style>`);

  const appbar = () => UI.appbar({ title: 'Trash', back: true });
  const intro = '<p class="small muted">Deleted items are kept 30 days, then gone for good.</p>';
  /** Empty-state icon: a neutral placeholder box (wireframe), labelled for screen readers. */
  const glyph = label => UI.icon(48, true).replace('<span ', `<span role="img" aria-label="${label}" `);

  /** Deleted item card (D.trash). kind: EVENT | TASK | PROJECT; projects also show what they include. Text block, then actions. */
  const card = t => `<div class="card tr-card">
    <div class="stack xs">${UI.label(t.kind)}
      <b class="h3">${t.title}</b>
      <span class="small muted">${t.where} · Deleted by ${t.by} · ${t.date}</span>
      <span class="small">${t.left} days left</span>
      ${t.includes ? `<span class="small muted">Includes ${t.includes}</span>` : ''}</div>
    <div class="tr-acts">
      ${App.is('admin') ? UI.btn('Delete forever', 'ghost', { sm: true, sheet: 'trash.delete' }) : ''}
      ${UI.btn('Restore', 'outline', { sm: true, toast: 'Restored' })}
    </div></div>`;

  // ---------- ① Trash · List ----------
  App.screen('trash.list', { title: '① Trash · List', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${intro}
      ${UI.chips([`All ${D.trash.length}`, ...[['Projects', 'PROJECT'], ['Tasks', 'TASK'], ['Events', 'EVENT']].map(([l, k]) => `${l} ${D.trash.filter(t => t.kind === k).length}`)])}
      <section class="stack"><b class="small">${D.trash.length} items · removed automatically after 30 days</b>
        ${D.trash.map(card).join('')}</section>
    </div>
    ${UI.tabbar('more')}` });

  // ---------- ② Trash · Empty ----------
  App.screen('trash.empty', { title: '② Trash · Empty', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${intro}
      <div class="empty mt-6">${glyph('Empty trash')}<b class="h3" style="color:var(--ink)">Trash is empty</b>
        <span class="small">What you delete stays here for 30 days.</span></div>
    </div>
    ${UI.tabbar('more')}` });

  // ---------- ③ Undo after delete (Events list + snackbar) ----------
  App.screen('trash.undo', { title: '③ Undo after delete', group: G, render: () =>
    EV.list(EV.snack('Event moved to Trash', 'Undo', { go: 'events.detail-upcoming', toast: 'Event restored' })) });

  // ---------- ④ Sheet · Delete forever (Admin) ----------
  App.sheet('trash.delete', { title: '④ Sheet · Delete forever', group: G, roles: ['admin'], render: () => UI.sheet({
    title: 'Delete forever?', sub: 'Project · Senior app trial',
    body: `
      <p class="small">Project “Senior app trial” with 8 tasks and 2 events will be gone for good. This cannot be undone.</p>
      <div class="card fill small">Only an Admin can delete forever. Others can only restore.</div>`,
    actions: `<div class="tr-two">${UI.btn('Cancel', 'outline', { close: true })}${UI.btn('Delete forever', 'primary', { close: true, toast: 'Deleted forever' })}</div>`,
  }) });
})();
