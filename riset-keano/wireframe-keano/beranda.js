// Dashboard Home: susunan kartu, mode edit (seret, ubah lebar, hapus, ganti data), tambah kartu,
// dan panel daftar tugas saat angka/batang diklik. Isi kartu & panel hanya kerangka (tanpa data).
(() => {
  const { TYPES, METRICS, CATALOG, DEFAULT_COUNT, esc, line } = window.WF_CARDS;
  const STORE_KEY = 'wf-beranda-layout-v4';
  const WIDTHS = [2, 3, 4, 5, 6, 8, 12];

  const $ = id => document.getElementById(id);
  const grid = $('dashGrid');
  const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fromCatalog = item => { const { desc, ...card } = item; return { ...card, id: newId() }; };
  const defaultCards = () => CATALOG.slice(0, DEFAULT_COUNT).map(fromCatalog);

  // Susunan disimpan per browser supaya hasil edit tidak hilang saat reload (hanya untuk review wireframe)
  function loadCards() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (Array.isArray(saved) && saved.every(c => TYPES[c.type])) return saved;
    } catch (e) {
      console.warn('Saved dashboard layout unreadable, using default:', e.message);
    }
    return defaultCards();
  }
  function saveCards() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.cards)); }
    catch (e) { console.warn('Dashboard layout could not be saved:', e.message); }
  }

  const state = { cards: loadCards(), editing: false, dragId: null };

  function metricSelect(card) {
    const opts = Object.entries(METRICS).map(([k, m]) =>
      `<option value="${k}" ${k === card.metric ? 'selected' : ''}>${m.label}</option>`).join('');
    return `<select class="btn-sm" data-act="metric" title="Change data">${opts}</select>`;
  }

  function renderCard(card) {
    const tools = state.editing ? `<span class="card-tools">
        ${card.type === 'count' ? metricSelect(card) : ''}
        <button class="btn-sm" data-act="width" title="Change width">↔ ${card.w}/12</button>
        <button class="btn-sm" data-act="remove" title="Remove card">✕</button></span>` : '';
    return `<article class="card" data-id="${card.id}" data-type="${card.type}" style="--w:${card.w};--h:${card.h}" ${state.editing ? 'draggable="true"' : ''}>
      <header class="card-head">
        ${state.editing ? '<span class="handle" title="Drag to move">⠿</span>' : ''}
        <h2 class="card-title" ${state.editing ? 'contenteditable="true" spellcheck="false"' : ''}>${esc(card.title)}</h2>
        ${tools}
      </header>
      <div class="card-body">${TYPES[card.type].render(card)}</div>
    </article>`;
  }

  function render() {
    grid.classList.toggle('editing', state.editing);
    $('editHint').hidden = !state.editing;
    grid.innerHTML = state.cards.length
      ? state.cards.map(renderCard).join('')
      : `<div class="dash-empty">Dashboard is empty. <button class="btn-sm" id="emptyAdd">+ Add card</button></div>`;
  }

  const findCard = el => state.cards.find(c => c.id === el.closest('.card')?.dataset.id);
  const update = () => { saveCards(); render(); };

  // ---------- Interaksi kartu ----------
  grid.addEventListener('click', e => {
    if (e.target.id === 'emptyAdd') return openPicker();
    const act = e.target.closest('[data-act]')?.dataset.act;
    const card = findCard(e.target);
    if (act === 'width') { card.w = WIDTHS[(WIDTHS.indexOf(card.w) + 1) % WIDTHS.length]; return update(); }
    if (act === 'remove') { state.cards = state.cards.filter(c => c !== card); return update(); }
    const drill = e.target.closest('[data-drill]');
    if (drill && !state.editing) openDrawer(drill.dataset.drill);
  });

  grid.addEventListener('change', e => {
    if (e.target.dataset.act !== 'metric') return;
    const card = findCard(e.target);
    // Judul ikut berganti hanya kalau pengguna belum mengubahnya sendiri
    if (card.title === METRICS[card.metric].label) card.title = METRICS[e.target.value].label;
    card.metric = e.target.value;
    update();
  });

  grid.addEventListener('focusout', e => {
    const card = findCard(e.target);
    if (!card) return;
    if (e.target.matches('.card-title')) card.title = e.target.textContent.trim() || card.title;
    else if (e.target.matches('[data-note]')) card.text = e.target.textContent.trim();
    else return;
    saveCards();
  });
  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('.card-title')) { e.preventDefault(); e.target.blur(); }
  });

  // ---------- Seret untuk memindah urutan kartu ----------
  grid.addEventListener('dragstart', e => {
    state.dragId = e.target.closest('.card')?.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragover', e => {
    if (!state.dragId) return;
    e.preventDefault();
    grid.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    e.target.closest('.card')?.classList.add('drop-target');
  });
  grid.addEventListener('drop', e => {
    e.preventDefault();
    const targetId = e.target.closest('.card')?.dataset.id;
    const from = state.cards.findIndex(c => c.id === state.dragId);
    const to = state.cards.findIndex(c => c.id === targetId);
    if (from > -1 && to > -1 && from !== to) state.cards.splice(to, 0, state.cards.splice(from, 1)[0]);
    state.dragId = null;
    update();
  });
  grid.addEventListener('dragend', () => { state.dragId = null; render(); });

  // ---------- Toolbar ----------
  $('editToggle').addEventListener('change', e => { state.editing = e.target.checked; render(); });
  $('resetBtn').addEventListener('click', () => { state.cards = defaultCards(); update(); });
  $('refreshBtn').addEventListener('click', () => { $('refreshedAt').textContent = 'Refreshed just now'; render(); });
  $('autoBtn').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = `Auto refresh: ${on ? 'On' : 'Off'}`;
  });

  // ---------- Tambah kartu ----------
  const picker = $('pickerDlg');
  function openPicker() {
    $('pickerList').innerHTML = CATALOG.map((c, i) => `<li><button data-i="${i}">
      <span class="ph-icon"></span><span><b>${esc(c.title)}</b><span class="muted">${esc(c.desc)}</span></span></button></li>`).join('');
    picker.showModal();
  }
  $('addBtn').addEventListener('click', openPicker);
  $('pickerList').addEventListener('click', e => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    state.cards.push(fromCatalog(CATALOG[btn.dataset.i]));
    state.editing = true;
    $('editToggle').checked = true;
    picker.close();
    update();
    grid.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ---------- Daftar tugas (drill-down) ----------
  const drawer = $('drawer');
  function openDrawer(title) {
    $('drawerTitle').textContent = title;
    $('drawerList').innerHTML = [70, 55, 80, 60, 75, 50].map(w => `<li>${line(w)}${line(w - 20, 'muted')}</li>`).join('');
    drawer.hidden = false;
    $('drawerClose').focus();
  }
  // Panel yang sama dipakai Inbox untuk membuka detail task
  window.WF_DRAWER = { open: openDrawer };
  $('drawerClose').addEventListener('click', () => { drawer.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') drawer.hidden = true; });

  render();
})();
