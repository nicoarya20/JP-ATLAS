// Proyek baru: ③ pilih cara, ④ form, ⑤ ceritakan ke AI, ⑥ periksa draf, ⑦ pakai template.
JUMPS.push(['Proyek baru', '③ Pilih cara', 'proyek/baru'], ['Proyek baru', '④ Form proyek', 'proyek/baru/form'], ['Proyek baru', '⑤ Ceritakan proyeknya', 'proyek/baru/ai'],
  ['Proyek baru', '⑥ Periksa draf dari AI', 'proyek/baru/draf'], ['Proyek baru', '⑦ Pakai template', 'proyek/baru/template']);
const AI_DEFAULT = 'Saya ingin membuat aplikasi absensi untuk kantor. Targetnya selesai dalam 2 bulan, dibantu Dodi dan Ayu.';
const TEMPLATES = {
  produk: ['Peluncuran produk', ['Tentukan target pasar', 'Siapkan materi promosi', 'Uji coba terbatas', 'Peluncuran', 'Evaluasi minggu pertama']],
  acara: ['Acara keluarga', ['Tentukan tanggal dan lokasi', 'Pesan katering', 'Konfirmasi tenda', 'Cetak daftar tamu', 'Kirim undangan']],
  renovasi: ['Renovasi rumah', ['Survei harga bahan', 'Pilih tukang', 'Bayar uang muka', 'Pengerjaan', 'Pemeriksaan akhir']],
  audit: ['Audit internal', ['Kumpulkan dokumen', 'Wawancara tim', 'Susun temuan', 'Presentasi hasil']],
};
const pf = () => (S.ui.pf ||= { nama: '', desk: '', tenggat: addDays(TODAY, 14), anggota: [ME] });
const pfSave = () => { const f = pf(); f.nama = val('pf-n') || f.nama; f.desk = $('#pf-d') ? val('pf-d') : f.desk; if (val('pf-t')) f.tenggat = val('pf-t'); };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const draftOf = text => ({
  nama: /absensi/i.test(text) ? 'Aplikasi Absensi Kantor' : cap(text.split(/\s+/).slice(0, 4).join(' ').replace(/[.,]$/, '')) || 'Proyek baru', desk: text, tenggat: addDays(TODAY, 60),
  anggota: [ME, ...['dodi', 'ayu', 'rina'].filter(k => new RegExp(PEOPLE[k].n, 'i').test(text))],
  tasks: [['Kumpulkan kebutuhan', 'Tugas'], ['Rancang tampilan layar', 'Tugas'], ['Siapkan basis data', 'Tugas'], ['Buat fitur masuk', 'Tugas'], ['Uji coba bersama tim', 'Tugas'], ['Perbaiki temuan uji coba', 'Bug'], ['Latihan pemakaian', 'Tugas'], ['Serah terima', 'Tugas']],
});

function proyekBaru(sub) {
  const bk = back('Semua proyek', 'proyek');
  if (!sub) {
    const c = (t, d, to, extra = '') => `<section class="card ink col"><div class="row sp-b"><h2>${t}</h2>${extra}</div><p class="mute grow">${d}</p>${btn('Pilih', { cls: 'dark', go: to })}</section>`;
    return `${bk}${head('Proyek baru', '', '<p class="mute">Pilih cara membuat proyek.</p>')}<div class="grid s3">${c('Isi form', 'Isi nama, deskripsi, tenggat, dan anggota sendiri.', 'proyek/baru/form')}${c(`${ico('spark')} Ceritakan ke AI`, 'Tulis proyeknya dengan kata-kata biasa, AI menyusun draf dan daftar tugas.', 'proyek/baru/ai', badge('Disarankan', 'solid'))}${c('Pakai template', 'Mulai dari kerangka proyek yang sudah jadi.', 'proyek/baru/template')}</div>`;
  }
  if (sub === 'form') {
    const f = pf(), chips = [['1 mgg', 7], ['2 mgg', 14], ['1 bln', 30], ['3 bln', 90]];
    return `${bk}${head('Form proyek')}<section class="card">${fld('Nama proyek *', 'pf-n', inp('pf-n', f.nama, 'Contoh: Renovasi dapur'))}${fld('Deskripsi', 'pf-d', `<textarea id="pf-d" placeholder="Tujuan dan batasan proyek">${esc(f.desk)}</textarea>`)}
      <div class="field"><span class="lbl">Tenggat</span><div class="wrap">${chips.map(([l, n]) => chip(l, { on: f.tenggat === addDays(TODAY, n), act: 'pftenggat', arg: n })).join('')}${inp('pf-t', f.tenggat, '', 'date').replace('<input', '<input style="width:auto"')}</div></div>
      <div class="field"><span class="lbl">Anggota</span><div class="wrap">${f.anggota.map(m => chip(`${esc(who(m))}${m === ME ? ' (Lead)' : ''}`, { on: true, cls: '' })).join('')}${btn(`${ico('plus')} Tambah anggota`, { cls: 'sm', act: 'pfanggota' })}</div></div>
      <div class="wrap" style="justify-content:flex-end">${btn('Batal', { go: 'proyek/baru' })}${btn('Buat proyek', { cls: 'dark', act: 'pfbuat', busy: 700 })}</div></section>`;
  }
  if (sub === 'ai') {
    return `${bk}${head(`${ico('spark')} Ceritakan proyeknya`)}<section class="card">${fld('Ceritakan proyek Anda', 'ai-t', `<textarea id="ai-t" placeholder="Apa yang ingin dicapai, kapan selesai, siapa yang terlibat?">${esc(S.ui.ai ?? '')}</textarea>`)}
      <p class="small mute">AI hanya menyusun draf. Anda tetap memeriksanya sebelum proyek dibuat.</p>
      <div class="wrap" style="justify-content:flex-end">${btn('Pakai contoh cerita', { cls: 'sm', act: 'aicontoh' })}${btn('Batal', { go: 'proyek/baru' })}${btn(`Susun draf ${ico('spark')}`, { cls: 'dark', act: 'aisusun', busy: 900 })}</div></section>`;
  }
  if (sub === 'draf') {
    const d = S.ui.draf || (S.ui.draf = draftOf(S.ui.ai || AI_DEFAULT));
    return `${bk}${head('Periksa draf dari AI')}${note('Draf ini dibuat AI dari cerita Anda. Periksa nama, tenggat, dan jenis tiap tugas sebelum membuat proyek.')}
      <section class="card"><h2>${esc(d.nama)}</h2><p class="mute">${esc(d.desk)}</p><p class="small">Tenggat ${fmtL(d.tenggat)} · Anggota: ${d.anggota.map(m => esc(who(m))).join(', ')}</p>
      <div class="sec">${d.tasks.length} tugas</div>${d.tasks.map(([n, j], i) => `<div class="item"><span class="t"><b>${esc(n)}</b></span>${chip(`${j} ▾`, { act: 'drafjenis', arg: i })}</div>`).join('')}
      <div class="wrap" style="justify-content:flex-end">${btn('Susun ulang', { act: 'drafulang' })}${btn('Buat proyek', { cls: 'dark', act: 'drafbuat', busy: 700 })}</div></section>`;
  }
  const k = S.ui.tpl || 'produk', [nm, ts] = TEMPLATES[k];
  return `${bk}${head('Pakai template')}<div class="two"><section class="card"><h2>Pilih template</h2>${Object.entries(TEMPLATES).map(([id, [n, l]]) => `<label class="chk item"><input type="radio" name="tpl" ${id === k ? 'checked' : ''} data-act="tplpilih" data-arg="${id}"><span class="t"><b>${n}</b><span class="small mute">${l.length} tugas awal</span></span></label>`).join('')}</section>
    <section class="card">${fld('Nama proyek', 'tp-n', inp('tp-n', nm))}<div class="sec">Tugas awal</div>${ts.map(x => `<div class="item"><span class="t">${esc(x)}</span></div>`).join('')}
    <div class="wrap" style="justify-content:flex-end">${btn('Batal', { go: 'proyek/baru' })}${btn('Buat proyek', { cls: 'dark', act: 'tplbuat', busy: 700 })}</div></section></div>`;
}

// Membuat proyek baru + tugas awalnya, lalu membuka detailnya.
function buatProyek({ nama, desk, tenggat, anggota, tasks }) {
  const id = `${nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}-${nextId()}`;
  S.projects.unshift(P(id, nama, ME, 'Berjalan', 'ok', 'baru dibuat', 0, tenggat, { anggota, desk, tahapan: tahap('berjalan', 'belum', 'belum') }));
  tasks.forEach(([judul, jenis]) => S.tasks.push(T(nextId(), judul, id, 'todo', null, tenggat, { jenis })));
  S.ui.pf = S.ui.draf = S.ui.ai = null;
  toast(`Proyek “${nama}” dibuat dengan ${tasks.length} tugas.`);
  go(`proyek/${id}`);
}
ACT.pftenggat = n => { pfSave(); pf().tenggat = addDays(TODAY, +n); };
ACT.pfanggota = () => {
  pfSave();
  const opts = Object.keys(PEOPLE).filter(k => !pf().anggota.includes(k)).map(k => [k, who(k)]);
  openModal('Tambah anggota', fld('Pilih orang', 'ag-p', sel('ag-p', opts)), [['Batal', { act: 'close' }], ['Tambah anggota', { cls: 'dark', act: 'pfanggotaok', off: !opts.length }]]);
};
ACT.pfanggotaok = () => { pf().anggota.push(val('ag-p')); closeModal(); };
ACT.pfbuat = () => {
  pfSave();
  const f = pf();
  if (!f.nama) { toast('Isi nama proyek dulu. Nama wajib diisi.'); return; }
  buatProyek({ nama: f.nama, desk: f.desk, tenggat: f.tenggat, anggota: f.anggota, tasks: [] });
};
ACT.aicontoh = () => { S.ui.ai = AI_DEFAULT; };
ACT.aisusun = () => {
  const t = val('ai-t');
  if (!t) { toast('Ceritakan proyeknya dulu, minimal satu kalimat.'); S.ui.ai = ''; return; }
  S.ui.ai = t; S.ui.draf = draftOf(t); go('proyek/baru/draf');
};
ACT.drafjenis = i => { const t = S.ui.draf.tasks[+i]; t[1] = t[1] === 'Tugas' ? 'Bug' : 'Tugas'; };
ACT.drafulang = () => go('proyek/baru/ai');
ACT.drafbuat = () => buatProyek(S.ui.draf);
ACT.tplpilih = k => { S.ui.tpl = k; };
ACT.tplbuat = () => {
  const [nm, ts] = TEMPLATES[S.ui.tpl || 'produk'], nama = val('tp-n') || nm;
  buatProyek({ nama, desk: `Dibuat dari template ${nm}.`, tenggat: addDays(TODAY, 30), anggota: [ME], tasks: ts.map(x => [x, 'Tugas']) });
};
