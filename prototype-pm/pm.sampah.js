// Sampah: ① Daftar (tab Semua/Proyek/Tugas/Event, Pulihkan), ② Kosong, ③ pesan Urungkan setelah menghapus.
JUMPS.push(['Sampah', '① Sampah · Daftar (default)', 'sampah', () => { S.su.tab = 'Semua'; }], ['Sampah', '② Sampah · Kosong', 'sampah/kosong'],
  ['Sampah', '③ Setelah menghapus: pesan Urungkan', 'events', () => { if (ev('e2')) ACT.ehapusok('e2'); }]);

const lockOf = it => (it.tipe === 'Tugas' && !proj(it.payload.proyek) ? 'Pulihkan proyeknya lebih dulu' : '');
SCREENS.sampah = ([sub]) => {
  const tab = S.su.tab, all = sub === 'kosong' ? [] : S.trash, rows = all.filter(i => tab === 'Semua' || i.tipe === tab);
  return `${head('Sampah', '', '<p class="mute">Item yang dihapus disimpan 30 hari, lalu hilang permanen.</p>')}
  ${tabs(['Semua', 'Proyek', 'Tugas', 'Event'].map(k => [k, k]), tab, k => ({ act: 'sutab', arg: k }))}
  ${rows.length ? rows.map(i => { const lock = lockOf(i); return `<div class="item"><span class="t"><b>${esc(i.nama)}</b><span class="small mute">${i.tipe} · ${esc(i.info)}${lock ? ` · ${lock}` : ''}</span></span>${badge(i.tipe)}${btn(lock ? 'Pulihkan (nonaktif)' : 'Pulihkan', { cls: 'sm', act: 'pulihkan', arg: i.id, off: !!lock, title: lock })}</div>`; }).join('')
    : empty('trash', 'Sampah kosong', tab === 'Semua' ? 'Item yang kamu hapus akan muncul di sini selama 30 hari.' : `Tidak ada ${tab.toLowerCase()} di Sampah.`)}`;
};

// Mengembalikan item Sampah ke daftar asalnya (proyek ikut membawa tugasnya).
function restoreTrash(id, undoing) {
  const it = S.trash.find(x => x.id === id);
  if (!it) return;
  if (it.tipe === 'Proyek') { S.projects.unshift(it.payload); (it.tasks || []).forEach(t => S.tasks.push(t)); }
  else if (it.tipe === 'Tugas') S.tasks.push(it.payload);
  else S.events.push(it.payload);
  S.trash = S.trash.filter(x => x.id !== id);
  toast(undoing ? `“${it.nama}” dikembalikan.` : `“${it.nama}” dipulihkan ke ${it.tipe === 'Proyek' ? 'daftar proyek' : it.tipe === 'Tugas' ? 'daftar tugas' : 'daftar event'}.`);
}
ACT.sutab = k => { S.su.tab = k; };
ACT.pulihkan = id => restoreTrash(id, false);
