// Catatan rapat lewat suara: ④b siap merekam, ④c sedang merekam, lalu Langkah 1 (rekaman selesai), 2 (periksa teksnya), 3 (tugas dari rapat).
JUMPS.push(['Events', '④b Mode rekam · Siap merekam', 'events/e1/rekam', () => { S.rekam = { izin: false, jeda: false, detik: 0, teks: '', tugas: null, evId: 'e1', on: false }; }], ['Events', '④c Mode rekam · Sedang merekam', 'events/e1/rekam', () => { S.rekam = { izin: true, jeda: false, detik: 134, teks: '', tugas: null, evId: 'e1', on: true }; }],
  ['Events', '⑤a Langkah 1 · Rekaman selesai', 'events/e1/langkah/1'], ['Events', '⑤b Langkah 2 · Periksa teksnya', 'events/e1/langkah/2', () => { S.rekam.teks ||= TRANSKRIP; }], ['Events', '⑥ Langkah 3 · Tugas dari rapat', 'events/e4/langkah/3']);
const TRANSKRIP = 'Pak RT setuju rumahnya dipakai. Anggaran 5 juta disetujui. Katering untuk 80 orang harus dipesan paling lambat besok. Dodi mencari lokasi tenda.';
let recTimer;
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const steps = n => `<div class="steps">${['Rekaman selesai', 'Periksa teksnya', 'Tugas dari rapat'].map((l, i) => badge(`${i + 1} · ${l}`, i + 1 === n ? 'solid' : 'dash')).join('')}</div>`;

function eventRekam(id) {
  const e = ev(id), r = S.rekam;
  if (!e) return empty('cal', 'Event tidak ditemukan', '', btn('Ke daftar event', { go: 'events' }));
  const top = `${back('Semua event', 'events')}${head(`${ico('mic')} ${esc(e.judul)}`, btn('Lihat detail rapat', { cls: 'sm', go: `events/${id}` }))}`;
  if (r.on) {
    return `${top}<section class="card ink" style="text-align:center"><p><span class="pulse"></span> ${r.jeda ? 'Dijeda' : 'Sedang merekam'}</p><div class="rec" id="rec-t">${mmss(r.detik)}</div>
      <div class="wrap" style="justify-content:center">${btn(r.jeda ? 'Lanjutkan' : 'Jeda', { act: 'rekjeda' })}${btn('Selesai merekam', { cls: 'dark', act: 'rekselesai' })}</div></section>`;
  }
  return `${top}<section class="card ink" style="text-align:center"><p class="mute">Rekam rapat, lalu ubah jadi teks dan daftar tugas.</p>
    <label class="chk" style="justify-content:center;margin:.75rem 0"><input type="checkbox" ${r.izin ? 'checked' : ''} data-act="rekizin"> Semua peserta sudah tahu rapat ini direkam</label>
    ${btn(`${ico('mic')} Mulai rekam`, { cls: 'dark lg', act: 'rekmulai', off: !r.izin, title: r.izin ? '' : 'Centang dulu persetujuan peserta' })}${r.izin ? '' : '<p class="small mute">Tombol aktif setelah Anda mencentang persetujuan peserta.</p>'}
    <div class="sec" style="justify-content:center">atau catat dengan cara lain</div><div class="wrap" style="justify-content:center">${btn(`${ico('pen')} Ketik catatan`, { act: 'ecatat', arg: `${id}:ketik` })}${btn(`${ico('camera')} Foto papan tulis`, { act: 'ecatat', arg: `${id}:foto`, busy: 700 })}</div></section>`;
}

function eventLangkah(id, n) {
  const e = ev(id), r = S.rekam;
  if (!e) return empty('cal', 'Event tidak ditemukan', '', btn('Ke daftar event', { go: 'events' }));
  const top = `${back(e.judul, `events/${id}`)}${head('Catatan rapat')}${steps(+n)}`;
  if (n === '1') {
    return `${top}<section class="card ink"><h2>Rekaman selesai</h2><p class="mute">Durasi ${mmss(r.detik || 134)}. Ubah jadi teks agar bisa diperiksa dan dijadikan tugas.</p>${btn(`Ubah jadi teks ${ico('spark')}`, { cls: 'dark', act: 'rekteks', arg: id, busy: 1200 })}
      <div class="sec">atau</div><div class="wrap">${btn(`${ico('pen')} Ketik sendiri`, { act: 'ecatat', arg: `${id}:ketik` })}${btn(`${ico('camera')} Foto catatan`, { act: 'ecatat', arg: `${id}:foto`, busy: 700 })}${btn('⬆ Unggah rekaman', { act: 'todo' })}</div></section>`;
  }
  if (n === '2') {
    return `${top}<section class="card ink"><h2>Periksa teksnya</h2><p class="small mute">Hasil ubah suara ke teks bisa keliru. Perbaiki bila perlu.</p><textarea id="rk-t" style="min-height:11rem">${esc(r.teks)}</textarea>
      <div class="wrap sp-b" style="margin-top:.75rem">${btn('Simpan dan keluar', { act: 'reksimpan', arg: id })}${btn('Lanjut', { cls: 'dark', act: 'reklanjut', arg: id, busy: 900 })}</div></section>`;
  }
  const ts = r.tugas || (e.hasil && !e.hasil.ok ? e.hasil.tugas : ['Pesan katering untuk 80 orang', 'Cari lokasi tenda']).slice();
  r.tugas = ts; r.evId = id;
  return `${top}${note('Tugas ini hanya usulan. Tidak ada yang dibuat sebelum Anda menekan “Buat tugas”.')}<section class="card ink"><h2>Tugas dari rapat</h2>${ts.length ? ts.map((t, i) => `<div class="item"><span class="t"><b>${esc(t)}</b></span>${btn('Ubah', { cls: 'sm', act: 'rekubah', arg: i })}${btn('Buang', { cls: 'sm', act: 'rekbuang', arg: i })}</div>`).join('') : empty('task', 'Tidak ada tugas', 'Semua usulan dibuang. Anda tetap bisa menyimpan hasil rapat.')}
    ${fld('Masukkan ke proyek', 'rk-p', sel('rk-p', S.projects.filter(p => p.status === 'Berjalan').map(p => [p.id, p.nama]), r.proyek || 'atlas'))}
    <div class="wrap" style="justify-content:flex-end">${btn(`Buat ${ts.length} tugas`, { cls: 'dark', act: 'rekbuat', arg: id, busy: 800 })}</div></section>`;
}

const tick = () => {
  const r = S.rekam, el = $('#rec-t');
  if (!el) { clearInterval(recTimer); return; }
  if (!r.jeda) { r.detik += 1; el.textContent = mmss(r.detik); }
};
ACT.rekizin = () => { S.rekam.izin = !S.rekam.izin; };
ACT.rekmulai = () => { S.rekam.on = true; S.rekam.jeda = false; S.rekam.detik = 0; clearInterval(recTimer); recTimer = setInterval(tick, 1000); };
ACT.rekjeda = () => { S.rekam.jeda = !S.rekam.jeda; };
ACT.rekselesai = () => { clearInterval(recTimer); S.rekam.on = false; go(`events/${S.rekam.evId || route()[1]}/langkah/1`); };
ACT.rekteks = id => { S.rekam.teks = TRANSKRIP; go(`events/${id}/langkah/2`); };
ACT.reksimpan = id => { S.rekam.teks = val('rk-t'); ev(id).hasil = { teks: S.rekam.teks, tugas: [], ok: false }; toast('Teks disimpan sebagai draf. Anda bisa melanjutkannya nanti.'); go(`events/${id}`); };
ACT.reklanjut = id => {
  S.rekam.teks = val('rk-t');
  if (!S.rekam.teks) { toast('Teksnya masih kosong. Ketik atau ubah rekaman jadi teks dulu.'); return; }
  S.rekam.tugas = ['Pesan katering untuk 80 orang', 'Cari lokasi tenda']; go(`events/${id}/langkah/3`);
};
ACT.rekbuang = i => { S.rekam.tugas.splice(+i, 1); };
ACT.rekubah = i => openModal('Ubah tugas', fld('Judul tugas', 'ru-j', inp('ru-j', S.rekam.tugas[+i])), [['Batal', { act: 'close' }], ['Simpan perubahan', { cls: 'dark', act: 'rekubahok', arg: i }]]);
ACT.rekubahok = i => { const j = val('ru-j'); if (!j) { toast('Judul tugas tidak boleh kosong.'); return; } S.rekam.tugas[+i] = j; closeModal(); };
ACT.rekbuat = id => {
  const e = ev(id), r = S.rekam, pr = val('rk-p') || 'atlas', ts = r.tugas || [];
  ts.forEach(j => S.tasks.push(T(nextId(), j, pr, 'todo', null, addDays(TODAY, 7), { desk: `Dari rapat “${e.judul}”.` })));
  e.hasil = { teks: r.teks || e.hasil?.teks || TRANSKRIP, tugas: ts, ok: true }; e.status = e.tgl > TODAY ? e.status : 'lewat';
  resolveInbox(`events/${id}`); r.tugas = null; r.teks = '';
  toast(`${ts.length} tugas dibuat dan hasil rapat dikonfirmasi.`); go(`events/${id}`);
};
