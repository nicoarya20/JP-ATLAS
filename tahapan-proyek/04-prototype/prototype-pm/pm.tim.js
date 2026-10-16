// Tim: ① Daftar orang, ② Detail orang (Rina).
JUMPS.push(['Tim', '① Tim · Daftar (default)', 'tim'], ['Tim', '② Tim · Detail orang (Rina)', 'tim/rina']);
const CUTI_ORANG = { dodi: '12–14 Okt' };
const aktifOf = id => S.tasks.filter(t => t.pj === id && aktif(t));
const statusOrang = id => CUTI_ORANG[id] ? badge(`Cuti ${CUTI_ORANG[id]}`, 'dash') : id === ME && S.cuti.state === 'aktif' ? badge('Sedang cuti', 'dash') : badge('Tersedia');

SCREENS.tim = ([id]) => {
  if (id) return timDetail(id);
  const q = (S.ui.timq || '').toLowerCase(), rows = Object.keys(PEOPLE).filter(k => `${PEOPLE[k].full} ${PEOPLE[k].jabatan}`.toLowerCase().includes(q));
  return `${head('Tim', '', `<p class="mute">${Object.keys(PEOPLE).length} orang di tim</p>`)}
  <div class="search" style="margin:0 0 1rem;max-width:340px">${ico('search')}<input id="tim-q" type="text" data-live="timq" value="${esc(S.ui.timq || '')}" placeholder="Cari nama atau jabatan…" aria-label="Cari anggota tim"></div>
  ${rows.length ? rows.map(k => `<div class="item">${avatar(k)}<span class="t"><b>${esc(PEOPLE[k].full)}${k === ME ? ' (Anda)' : ''}</b><span class="small mute">${PEOPLE[k].jabatan} · ${PEOPLE[k].role} · ${aktifOf(k).length} tugas aktif</span></span>${statusOrang(k)}${btn('Lihat', { cls: 'sm', go: `tim/${k}` })}</div>`).join('')
    : empty('team', 'Tidak ada yang cocok', `Tidak ada orang dengan kata kunci “${S.ui.timq}”.`, btn('Hapus pencarian', { act: 'timq', arg: '' }))}`;
};
function timDetail(id) {
  const o = PEOPLE[id];
  if (!o) return empty('team', 'Orang tidak ditemukan', '', btn('Ke daftar tim', { go: 'tim' }));
  const ts = aktifOf(id), ps = S.projects.filter(p => p.anggota.includes(id));
  return `${back('Semua orang', 'tim')}${head(esc(o.full), btn('Lihat semua tugasnya', { act: 'timtugas', arg: id }), `<p class="wrap">${statusOrang(id)}${badge(o.role)}<span class="mute">${o.jabatan} · ${o.email}</span></p>`)}
  <div class="two"><section class="card"><h2>Tugas aktif (${ts.length})</h2>${ts.length ? ts.map(t => taskRow(t)).join('') : empty('task', 'Tidak ada tugas aktif', `${esc(o.n)} sedang tidak memegang tugas.`)}</section>
  <section class="card"><h2>Proyek (${ps.length})</h2>${ps.map(p => `<button type="button" class="item" style="width:100%;text-align:left;cursor:pointer" data-go="proyek/${p.id}"><span class="t"><b>${esc(p.nama)}</b><span class="small mute">${p.lead === id ? 'Lead' : 'Anggota'} · tenggat ${fmt(p.tenggat)}</span></span>${badge(p.status)}</button>`).join('') || '<p class="mute">Belum ikut proyek apa pun.</p>'}</section></div>`;
}
ACT.timq = v => { S.ui.timq = v; };
ACT.timtugas = id => { S.tu = { scope: 'semua', view: 'list', filter: 'aktif', proyek: '' }; toast(`Menampilkan semua tugas aktif. Cari tugas milik ${who(id)} di daftar.`); go('tugas'); };
