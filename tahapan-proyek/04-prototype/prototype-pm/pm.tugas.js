// Tugas: ① Tugas saya, ② Semua tugas, ③ Papan, ④ kosong. Baris tugas (taskRow) juga dipakai tab Tugas di detail proyek.
JUMPS.push(['Tugas', '① Tugas saya (List)', 'tugas', () => { S.tu = { scope: 'saya', view: 'list', filter: 'aktif', proyek: '' }; }],
  ['Tugas', '② Semua tugas (List, Proyek Atlas)', 'tugas', () => { S.tu = { scope: 'semua', view: 'list', filter: 'aktif', proyek: 'atlas' }; }],
  ['Tugas', '③ Papan', 'tugas', () => { S.tu = { scope: 'saya', view: 'papan', filter: 'aktif', proyek: '' }; }],
  ['Tugas', '④ Tugas saya kosong', 'tugas', () => { S.tu = { scope: 'saya', view: 'list', filter: 'review', proyek: '' }; }]);
const TF = [['aktif', 'Semua aktif'], ['todo', 'Belum dikerjakan'], ['doing', 'Sedang dikerjakan'], ['review', 'Menunggu diperiksa'], ['done', 'Selesai']];
const aktif = t => !['done', 'cancel'].includes(t.status);
const mineToCheck = t => t.status === 'review' && t.pemeriksa === ME;
const byUrut = (a, b) => (mineToCheck(b) - mineToCheck(a)) || a.tenggat.localeCompare(b.tenggat);

function taskAction(t) {
  if (t.status === 'todo') return btn('Mulai kerjakan', { cls: 'sm', act: 'mulai', arg: t.id, busy: 400 });
  if (t.status === 'doing') return btn('Minta diperiksa', { cls: 'sm', act: 'mintaperiksa', arg: t.id });
  if (mineToCheck(t)) return btn('Periksa', { cls: 'sm dark', go: `tugas/${t.id}` });
  return btn('Lihat', { cls: 'sm', go: `tugas/${t.id}` });
}
function taskRow(t, showProj = true) {
  const meta = [showProj ? esc(proj(t.proyek)?.nama || '') : '', esc(who(t.pj)), isLate(t) ? `⏰ Terlambat · ${fmt(t.tenggat)}` : `Tenggat ${fmt(t.tenggat)}`, t.jenis, t.prioritas].filter(Boolean).join(' · ');
  return `<div class="item"><span class="t"><button type="button" class="back" style="margin:0;text-decoration:none;font-weight:700;color:inherit;text-align:left" data-go="tugas/${t.id}">${esc(t.judul)}</button><span class="small mute">#${t.id} · ${meta}</span></span>${badge(STATUS_T[t.status], t.status === 'done' ? 'solid' : t.status === 'review' ? 'warn' : '')}${taskAction(t)}</div>`;
}
function taskCard(t) {
  const next = { todo: btn('Mulai kerjakan →', { cls: 'sm', act: 'mulai', arg: t.id }), doing: btn('Minta diperiksa →', { cls: 'sm', act: 'mintaperiksa', arg: t.id }), review: mineToCheck(t) ? btn('Periksa →', { cls: 'sm dark', go: `tugas/${t.id}` }) : btn('Lihat', { cls: 'sm', go: `tugas/${t.id}` }), done: btn('Buka lagi', { cls: 'sm', act: 'bukalagi', arg: t.id }) }[t.status];
  return `<div class="card"><button type="button" class="back" style="margin:0;text-decoration:none;font-weight:700;color:inherit;text-align:left" data-go="tugas/${t.id}">${esc(t.judul)}</button><p class="small mute">${esc(proj(t.proyek)?.nama || '')} · ${esc(who(t.pj))}<br>${isLate(t) ? '⏰ ' : ''}${fmt(t.tenggat)} · ${t.jenis}</p>${next}</div>`;
}

function tugasList() {
  const u = S.tu, base = S.tasks.filter(t => (u.scope === 'semua' || t.pj === ME) && (!u.proyek || t.proyek === u.proyek));
  const f = { aktif: aktif, todo: t => t.status === 'todo', doing: t => t.status === 'doing', review: t => t.status === 'review', done: t => t.status === 'done', unassigned: t => !t.pj && aktif(t) }[u.filter] || aktif;
  const rows = base.filter(f).sort(byUrut), semua = u.scope === 'semua';
  const chips = [...TF, ...(u.filter === 'unassigned' ? [['unassigned', 'Tanpa penanggung jawab']] : [])].map(([k, l]) => chip(l, { on: u.filter === k, act: 'tufilter', arg: k })).join('');
  const toolbar = `<div class="wrap" style="margin-bottom:.75rem">${seg([['saya', 'Tugas saya'], ['semua', 'Semua tugas']], u.scope, k => ({ act: 'tuscope', arg: k }))}
    ${semua ? `<select data-change="tuproyek" aria-label="Pilih proyek" style="width:auto"><option value="">Semua proyek</option>${S.projects.map(p => `<option value="${p.id}"${u.proyek === p.id ? ' selected' : ''}>${esc(p.nama)}</option>`).join('')}</select>` : ''}
    ${seg([['list', 'List'], ['papan', 'Papan']], u.view, k => ({ act: 'tuview', arg: k }))}<span class="grow"></span>
    ${semua ? `${btn('Unduh CSV', { cls: 'sm', act: 'unduhcsv', busy: 700 })}${btn('Impor CSV', { cls: 'sm', go: 'tugas/impor' })}` : ''}</div><div class="wrap" style="margin-bottom:1rem">${chips}</div>`;
  let body;
  if (!rows.length) body = empty('task', 'Belum ada tugas di sini', semua ? 'Tidak ada tugas yang cocok dengan filter ini.' : 'Anda belum punya tugas dengan status ini. Buat tugas baru atau lihat Semua tugas.', btn(`${ico('plus')} Tugas baru`, { cls: 'dark', go: 'tugas/baru' }));
  else if (u.view === 'papan') body = `<div class="kan">${['todo', 'doing', 'review', 'done'].map(s => `<div><div class="sec" style="margin-top:0">${STATUS_T[s]} · ${rows.filter(t => t.status === s).length}</div>${rows.filter(t => t.status === s).map(taskCard).join('')}</div>`).join('')}</div>`;
  else {
    const chk = rows.filter(mineToCheck), rest = rows.filter(t => !mineToCheck(t));
    body = `${chk.length ? `<div class="sec">Menunggu diperiksa saya <span class="badge solid">${chk.length}</span></div>${chk.map(t => taskRow(t)).join('')}<div class="sec">Lainnya</div>` : ''}${rest.map(t => taskRow(t)).join('')}`;
  }
  return `${head('Tugas', btn(`${ico('plus')} Tugas baru`, { cls: 'dark', go: 'tugas/baru' }))}${toolbar}${body}`;
}

SCREENS.tugas = p => !p[0] ? tugasList() : p[0] === 'baru' ? tugasBaru() : p[0] === 'impor' ? tugasImpor() : tugasDetail(p[0]);

ACT.tuscope = k => { S.tu.scope = k; if (k === 'saya') S.tu.proyek = ''; };
ACT.tuview = k => { S.tu.view = k; };
ACT.tufilter = k => { S.tu.filter = k; };
ACT.tuproyek = k => { S.tu.proyek = k; };
ACT.unduhcsv = () => toast('tugas.csv diunduh (contoh).');
ACT.mulai = id => { const t = task(id); t.status = 'doing'; toast(`“${t.judul}” sekarang sedang dikerjakan.`); };
ACT.bukalagi = id => { const t = task(id); t.status = 'doing'; toast(`“${t.judul}” dibuka lagi.`); };
