// Pengaturan: ① halaman (profil, tampilan, cuti, keluar), ② Ubah profil, ③ Ajukan cuti, ④ Keadaan cuti.
JUMPS.push(['Pengaturan', '① Pengaturan (halaman di-scroll)', 'pengaturan'], ['Pengaturan', '② Ubah profil', 'pengaturan/profil'], ['Pengaturan', '③ Ajukan cuti', 'pengaturan/cuti'],
  ['Pengaturan', '④ Keadaan cuti · belum ada', 'pengaturan/keadaan', () => { S.cuti = { state: 'none' }; }], ['Pengaturan', '④ Keadaan cuti · diajukan', 'pengaturan/keadaan', () => { S.cuti = { state: 'diajukan', dari: '2026-10-19', sampai: '2026-10-23', alasan: 'Acara keluarga' }; }],
  ['Pengaturan', '④ Keadaan cuti · sedang cuti', 'pengaturan/keadaan', () => { S.cuti = { state: 'aktif', dari: '2026-10-08', sampai: '2026-10-10', alasan: 'Acara keluarga' }; }], ['Pengaturan', '④ Keadaan cuti · ditolak', 'pengaturan/keadaan', () => { S.cuti = { state: 'ditolak', dari: '2026-10-19', sampai: '2026-10-23', alasan: 'Acara keluarga' }; }]);

SCREENS.pengaturan = ([sub]) => ({ profil: ubahProfil, cuti: formCuti, keadaan: keadaanCuti }[sub] || halamanPengaturan)();

function halamanPengaturan() {
  const p = S.profil, c = S.cuti.state;
  return `${head('Pengaturan')}
  <section class="card"><div class="row sp-b wrap"><div class="row">${avatar('nico')}<div><b>${esc(p.nama)}</b><br><span class="small mute">${esc(p.jabatan)} · ${esc(p.divisi)} · ${me().email}</span></div></div>${btn('Ubah profil', { go: 'pengaturan/profil' })}</div></section>
  <section class="card" style="margin-top:.9rem"><h2>Tampilan</h2><p class="mute small">Ukuran teks berlaku untuk seluruh aplikasi.</p>${seg([[1, 'Normal'], [1.25, 'Besar'], [1.5, 'Sangat besar']], S.textSize, k => ({ act: 'ukuran', arg: k }))}</section>
  <section class="card" style="margin-top:.9rem"><div class="row sp-b wrap"><div><h2>Cuti</h2><p class="mute small">${{ none: 'Anda tidak sedang cuti.', diajukan: 'Pengajuan cuti menunggu persetujuan admin.', aktif: 'Anda sedang cuti. Tugas baru tidak diarahkan ke Anda.', ditolak: 'Pengajuan cuti terakhir ditolak.' }[c]}</p></div>${btn('Atur cuti', { go: 'pengaturan/keadaan' })}</div></section>
  <section class="card" style="margin-top:.9rem"><h2>Akun</h2><p class="mute small">Keluar dari akun ini di perangkat ini.</p>${btn('Keluar', { act: 'keluar' })}</section>`;
}
function ubahProfil() {
  const p = S.profil;
  return `${back('Pengaturan', 'pengaturan')}${head('Ubah profil')}<section class="card"><div class="row" style="margin-bottom:1rem"><span class="avatar" style="width:4rem;height:4rem">N</span>${btn('Ganti foto', { cls: 'sm', act: 'todo' })}</div>
  <div class="f2">${fld('Nama lengkap *', 'pr-n', inp('pr-n', p.nama))}${fld('Nama panggilan', 'pr-p', inp('pr-p', p.panggilan))}</div>
  <div class="f2">${fld('No. HP', 'pr-h', inp('pr-h', p.hp, '', 'tel'))}${fld('Email (dari Google)', 'pr-e', '<input id="pr-e" type="text" value="nico@email.com" disabled>')}</div>
  <div class="f2">${fld('Jabatan', 'pr-j', inp('pr-j', p.jabatan))}${fld('Divisi', 'pr-d', inp('pr-d', p.divisi))}</div>
  <div class="wrap" style="justify-content:flex-end">${btn('Batal', { go: 'pengaturan' })}${btn('Simpan', { cls: 'dark', act: 'profilsimpan', busy: 600 })}</div></section>`;
}
function formCuti() {
  const c = S.cuti;
  return `${back('Pengaturan', 'pengaturan')}${head('Ajukan cuti')}<section class="card"><div class="f2">${fld('Mulai', 'ct-a', inp('ct-a', c.dari || addDays(TODAY, 11), '', 'date'))}${fld('Sampai', 'ct-b', inp('ct-b', c.sampai || addDays(TODAY, 15), '', 'date'))}</div>
  ${fld('Alasan', 'ct-c', inp('ct-c', c.alasan || '', 'Contoh: Acara keluarga'))}<p class="small mute">Admin akan menyetujui atau menolak. Tugas Anda tidak berpindah otomatis.</p>
  <div class="wrap" style="justify-content:flex-end">${btn('Batal', { go: 'pengaturan/keadaan' })}${btn('Ajukan cuti', { cls: 'dark', act: 'cutisimpan', busy: 600 })}</div></section>`;
}
function keadaanCuti() {
  const c = S.cuti, rentang = c.dari ? `${fmtL(c.dari)} sampai ${fmtL(c.sampai)}` : '', s = c.state;
  const kartu = {
    none: `<h2>Tidak sedang cuti</h2><p class="mute">Ajukan cuti bila Anda akan tidak bisa dihubungi.</p>${btn('Ajukan cuti', { cls: 'dark', go: 'pengaturan/cuti' })}`,
    diajukan: `<h2>Pengajuan menunggu persetujuan ${badge('Menunggu', 'dash')}</h2><p>${rentang} · ${esc(c.alasan)}</p>${btn('Batalkan pengajuan', { act: 'cutibatal', arg: 'pengajuan' })}${note('Simulasi: tanggapan admin.')}<div class="wrap">${btn('Admin menyetujui', { cls: 'sm', act: 'cutiadmin', arg: 'aktif' })}${btn('Admin menolak', { cls: 'sm', act: 'cutiadmin', arg: 'ditolak' })}</div>`,
    aktif: `<h2>Sedang cuti ${badge('Aktif', 'solid')}</h2><p>${rentang} · ${esc(c.alasan)}</p>${btn('Batalkan cuti', { act: 'cutibatal', arg: 'cuti' })}`,
    ditolak: `<h2>Pengajuan ditolak ${badge('Ditolak', 'warn')}</h2><p>${rentang} · ${esc(c.alasan)}</p>${btn('Ajukan lagi', { cls: 'dark', go: 'pengaturan/cuti' })}`,
  }[s];
  return `${back('Pengaturan', 'pengaturan')}${head('Cuti')}<section class="card ink">${kartu}</section>`;
}

ACT.profilsimpan = () => {
  if (!val('pr-n')) { toast('Nama lengkap wajib diisi.'); return; }
  S.profil = { nama: val('pr-n'), panggilan: val('pr-p'), hp: val('pr-h'), jabatan: val('pr-j'), divisi: val('pr-d') };
  toast('Profil tersimpan.'); go('pengaturan');
};
ACT.cutisimpan = () => {
  const a = val('ct-a'), b = val('ct-b');
  if (!a || !b || b < a) { toast('Tanggal selesai harus sama atau setelah tanggal mulai.'); return; }
  S.cuti = { state: 'diajukan', dari: a, sampai: b, alasan: val('ct-c') || 'Tanpa alasan' }; toast('Pengajuan cuti terkirim ke admin.'); go('pengaturan/keadaan');
};
ACT.cutibatal = a => confirmBox({ title: a === 'cuti' ? 'Batalkan cuti?' : 'Batalkan pengajuan?', body: a === 'cuti' ? 'Cuti Anda berakhir sekarang dan tugas baru bisa kembali diarahkan ke Anda.' : 'Pengajuan cuti ini ditarik dan admin tidak perlu menanggapinya.', label: a === 'cuti' ? 'Batalkan cuti' : 'Batalkan pengajuan', onOk: () => { S.cuti = { state: 'none' }; toast(a === 'cuti' ? 'Cuti dibatalkan.' : 'Pengajuan dibatalkan.'); } });
ACT.cutiadmin = a => { S.cuti.state = a; toast(a === 'aktif' ? 'Cuti disetujui admin.' : 'Pengajuan ditolak admin.'); };
