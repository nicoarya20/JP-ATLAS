// Inti prototype PM: router hash, shell aplikasi, modal, toast, dan helper komponen. Layar didaftarkan modul lain ke SCREENS/ACT.
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SCREENS = {}; // kunci rute -> (params[]) => html
const ACT = {}; // nama aksi -> (arg, el)
const JUMPS = []; // [grup, label, rute] untuk menu "Lompat ke layar"
const AUTH = new Set(['login', 'akun', 'menunggu']);

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  task: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  spark: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

// Atribut klik: go = pindah rute, act = aksi, arg = argumen aksi, busy = ms tampil loading sebelum aksi jalan.
const A = (o = {}) => ['go', 'act', 'arg', 'busy'].filter(k => o[k] != null).map(k => ` data-${k}="${esc(o[k])}"`).join('') + (o.change ? ` data-change="${esc(o.change)}"` : '');
const btn = (label, o = {}) => `<button type="button" class="btn ${o.cls || ''}"${A(o)}${o.off ? ' disabled' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>${label}</button>`;
const chip = (label, o = {}) => `<button type="button" class="chip${o.on ? ' on' : ''}${o.cls ? ' ' + o.cls : ''}"${A(o)}>${label}</button>`;
const badge = (t, k = '') => `<span class="badge ${k}">${t}</span>`;
const tabs = (list, cur, mk) => `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === cur}" class="${k === cur ? 'on' : ''}"${A(mk(k))}>${l}</button>`).join('')}</div>`;
const seg = (list, cur, mk) => `<div class="seg">${list.map(([k, l]) => `<button type="button" class="${k === cur ? 'on' : ''}" aria-pressed="${k === cur}"${A(mk(k))}>${l}</button>`).join('')}</div>`;
const bar = p => `<div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
const avatar = (id, sm) => `<span class="avatar${sm ? ' sm' : ''}" title="${esc(who(id))}">${esc((PEOPLE[id]?.n || '?')[0])}</span>`;
const avs = ids => `<span class="avs">${ids.slice(0, 4).map(i => avatar(i, true)).join('')}</span>`;
const back = (label, to) => `<button type="button" class="back" data-go="${esc(to)}">← ${esc(label)}</button>`;
const head = (title, right = '', sub = '') => `<div class="head"><div><h1>${title}</h1>${sub}</div><div class="wrap">${right}</div></div>`;
const empty = (icon, title, text, action = '') => `<div class="empty">${ico(icon)}<h3>${esc(title)}</h3><p class="mute">${esc(text)}</p>${action}</div>`;
const note = t => `<p class="note">${t}</p>`;
const val = id => ($(`#${id}`)?.value ?? '').trim();
const fld = (label, id, inner) => `<div class="field"><label for="${id}">${label}</label>${inner}</div>`;
const inp = (id, v = '', ph = '', type = 'text') => `<input id="${id}" type="${type}" value="${esc(v)}" placeholder="${esc(ph)}"${type === 'tel' ? ' inputmode="tel"' : ''}>`;
const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const kondBadge = p => ({ warn: badge('! Perlu perhatian', 'warn'), late: badge('⏰ Terlambat', 'warn'), ok: badge('✓ Lancar') }[p.kond]);

// ---- Router ----
const route = () => (location.hash.replace(/^#\/?/, '') || 'login').split('/').map(decodeURIComponent);
const go = p => { if (location.hash === `#/${p}`) render(); else location.hash = `#/${p}`; };
let lastHash = '';
function render() {
  const [key, ...params] = route();
  if (!AUTH.has(key) && !S.authed) { go('login'); return; }
  const html = SCREENS[key] ? SCREENS[key](params) : empty('alert', 'Layar tidak ditemukan', `Rute “${key}” belum ada di prototype.`, btn('Ke Beranda', { go: 'beranda' }));
  const focused = document.activeElement, fid = focused?.id, pos = focused?.selectionStart;
  const sy = window.scrollY, same = lastHash === location.hash;
  $('#app').innerHTML = AUTH.has(key) ? html : shell(key, html);
  lastHash = location.hash;
  window.scrollTo(0, same ? sy : 0);
  const again = fid && document.getElementById(fid);
  if (again && again.tagName !== 'SELECT') { again.focus(); if (pos != null && again.type === 'text') again.setSelectionRange(pos, pos); }
  document.title = `${key[0].toUpperCase()}${key.slice(1)} · Prototype PM`;
  $('#jump').value = '';
}

const NAV = [['beranda', 'Beranda', 'home'], ['inbox', 'Inbox', 'inbox'], ['proyek', 'Proyek', 'folder'], ['tugas', 'Tugas', 'task'], ['events', 'Events', 'cal'], ['tim', 'Tim', 'team']];
const NAV_B = [['sampah', 'Sampah', 'trash'], ['pengaturan', 'Pengaturan', 'gear']];
function shell(key, body) {
  const item = ([k, l, i]) => `<a class="nav-i nav-${k}${k === key ? ' on' : ''}" href="#/${k}"${k === key ? ' aria-current="page"' : ''}>${ico(i)}<span>${l}</span>${k === 'inbox' && inboxCount() ? `<b class="dot">${inboxCount()}</b>` : ''}</a>`;
  const pop = S.ui.pop === 'avatar' ? `<div class="pop" data-keep><a href="#/pengaturan">${ico('gear')} Pengaturan</a><a href="#/sampah">${ico('trash')} Sampah</a><button type="button" data-act="keluar">${ico('left')} Keluar</button></div>` : '';
  return `<div class="app">
  <header class="top"><span class="brand">[Nama PM]</span>
    <form class="search" role="search" data-submit="cari">${ico('search')}<input id="q-top" type="text" placeholder="Cari…" aria-label="Cari proyek"><kbd class="small mute">⌘K</kbd></form>
    <span class="role">Peran: Project Manager</span>
    <span class="pop-w"><button type="button" class="avatar" data-act="pop" data-arg="avatar" aria-label="Menu akun">N</button>${pop}</span>
  </header>
  <nav class="rail" aria-label="Menu utama">${NAV.map(item).join('')}<span class="gap"></span>${NAV_B.map(item).join('')}</nav>
  <main class="main"><div class="page">${body}</div></main></div>`;
}
ACT.pop = a => { S.ui.pop = S.ui.popPrev === a ? null : a; };
ACT.todo = () => toast('Bagian ini belum ada di prototype.');
ACT.keluar = () => confirmBox({ title: 'Keluar dari akun?', body: 'Kamu akan keluar dari akun ini.', label: 'Keluar', onOk: () => { S.authed = false; go('login'); } });
ACT.cari = () => { S.pu.q = val('q-top'); S.pu.scope = 'semua'; S.pu.status = 'Semua'; go('proyek'); };

// ---- Modal & toast ----
function openModal(title, body, actions) { S.modal = { title, body, actions }; renderModal(); }
function closeModal() { S.modal = null; renderModal(); }
function renderModal() {
  const m = S.modal;
  $('#modal-root').innerHTML = m ? `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(m.title)}"><div class="m-h"><h2>${esc(m.title)}</h2><button type="button" class="x" data-act="close" aria-label="Tutup">${ico('x')}</button></div><div class="m-b">${m.body}</div><div class="m-f">${m.actions.map(([l, o]) => btn(l, o)).join('')}</div></div></div>` : '';
}
// Dialog konfirmasi T2 (aksi destruktif/susah dibatalkan): selalu sebut dampaknya, tombol berlabel spesifik.
function confirmBox({ title, body, label, onOk }) {
  S.ok = onOk;
  openModal(title, `<p>${body}</p>`, [['Batal', { act: 'close' }], [label, { cls: 'dark', act: 'ok', busy: 500 }]]);
}
ACT.close = () => closeModal();
ACT.ok = () => { const f = S.ok; S.ok = null; closeModal(); if (f) f(); };
let toastTimer;
function toast(msg, undo) {
  S.toast = { msg, undo };
  renderToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.toast = null; renderToast(); }, undo ? 10000 : 3500);
}
function renderToast() {
  const t = S.toast;
  $('#toast-root').innerHTML = t ? `<div class="toast" role="status"><span>${esc(t.msg)}</span>${t.undo ? btn('Urungkan', { cls: 'sm light', act: 'undo' }) : ''}<button type="button" class="x" data-act="toast-x" aria-label="Tutup">${ico('x')}</button></div>` : '';
}
ACT.undo = () => { const u = S.toast?.undo; S.toast = null; renderToast(); if (u) u(); };
ACT['toast-x'] = () => { S.toast = null; renderToast(); };

function applyTextSize() { document.documentElement.style.setProperty('--fs', S.textSize); }
