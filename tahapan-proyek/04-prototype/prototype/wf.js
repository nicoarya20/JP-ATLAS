// Shell wireframe bersama: sprite ikon, top bar, rail navbar, dan interaksinya. Halaman cukup punya
// <div class="app" data-active="tim"><main class="main">…</main></div> lalu memuat file ini di akhir <body>.

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  task: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  spark: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
};
document.body.insertAdjacentHTML('afterbegin',
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
  Object.entries(ICONS).map(([k, p]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${p}</symbol>`).join('') +
  '</svg>');

// Menu rail. href null = halaman wireframe belum dibuat (klik hanya memindah highlight). badge = jumlah belum dibaca.
const NAV_MAIN = [
  { key: 'beranda', label: 'Beranda', icon: 'home', href: '01-beranda.html' },
  { key: 'inbox', label: 'Inbox', icon: 'inbox', href: null, badge: 4 },
  { key: 'proyek', label: 'Proyek', icon: 'folder', href: null },
  { key: 'tugas', label: 'Tugas', icon: 'task', href: null },
  { key: 'events', label: 'Events', icon: 'cal', href: '05-events.html' },
  { key: 'tim', label: 'Tim', icon: 'team', href: '06-tim.html' },
];
const NAV_BOTTOM = [
  { key: 'sampah', label: 'Sampah', icon: 'trash', href: null },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'gear', href: null },
];

const app = document.querySelector('.app');
const active = app.dataset.active;
const navItem = n => {
  const tag = n.href ? 'a' : 'button';
  const attrs = n.href ? `href="${n.href}"` : 'type="button"';
  const cur = n.key === active ? ' aria-current="page"' : '';
  const badge = n.badge ? `<span class="dot">${n.badge}</span>` : '';
  return `<${tag} class="nav-i nav-${n.key}" ${attrs}${cur}><svg class="ico"><use href="#i-${n.icon}"/></svg>${badge}${n.label}</${tag}>`;
};
app.insertAdjacentHTML('afterbegin', `
  <header class="top">
    <div class="ws"><span>PM-New</span><svg class="ico sm"></svg></div>
    <div class="search-wrap" id="search-wrap">
      <div class="search">
        <svg class="ico sm"><use href="#i-search"/></svg>
        <input id="q" type="text" placeholder="Cari…" aria-label="Cari">
        <span class="kbd">⌘K</span>
        <button type="button" class="ai-btn" id="ai-btn"><span>Tanya AI</span><svg class="ico sm"><use href="#i-spark"/></svg></button>
      </div>
      <div class="drop">
        <h4>Tanya AI</h4>
        <button type="button"><svg class="ico sm"><use href="#i-spark"/></svg><span class="ln" style="width:60%"></span></button>
        <button type="button"><svg class="ico sm"><use href="#i-spark"/></svg><span class="ln" style="width:45%"></span></button>
        <h4>Hasil pencarian</h4>
        <button type="button"><span class="box"></span><span class="ln" style="width:50%"></span></button>
        <button type="button"><span class="box"></span><span class="ln" style="width:35%"></span></button>
      </div>
    </div>
    <div class="top-right"><div class="avatar">N</div></div>
  </header>
  <nav class="rail" id="rail" aria-label="Menu utama">
    ${NAV_MAIN.map(navItem).join('')}
    <span class="sp"></span>
    ${NAV_BOTTOM.map(navItem).join('')}
  </nav>`);

const rail = document.getElementById('rail');
rail.addEventListener('click', e => {
  const item = e.target.closest('button.nav-i');
  if (!item) return;
  rail.querySelectorAll('.nav-i').forEach(b => b.removeAttribute('aria-current'));
  item.setAttribute('aria-current', 'page');
});

const wrap = document.getElementById('search-wrap');
const q = document.getElementById('q');
q.addEventListener('focus', () => wrap.classList.add('open'));
document.getElementById('ai-btn').addEventListener('click', () => q.focus());
document.addEventListener('click', e => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); }
  if (e.key === 'Escape') { wrap.classList.remove('open'); q.blur(); }
});

// <div class="seg|tabs"><button data-show="id-panel">…</button></div>: tombol aktif ditandai; jika ada data-show,
// panel milik tombol lain di grup yang sama disembunyikan. Tanpa data-show = hanya demo pilihan.
document.querySelectorAll('.seg, .tabs').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    group.querySelectorAll('button').forEach(b => {
      b.setAttribute('aria-pressed', String(b === btn));
      const panel = b.dataset.show && document.getElementById(b.dataset.show);
      if (panel) panel.hidden = b !== btn;
    });
  });
});
