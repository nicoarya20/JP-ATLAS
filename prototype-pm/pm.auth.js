// Alur masuk: ① Login, ② Pilih akun Google, ③ Menunggu persetujuan admin, lalu ④ Beranda Project Manager.
JUMPS.push(['Masuk', '① Login', 'login'], ['Masuk', '② Pilih akun Google', 'akun'], ['Masuk', '③ Menunggu persetujuan', 'menunggu']);

SCREENS.login = () => `<main class="auth">
  <section class="auth-art" aria-hidden="true">ILUSTRASI / GAMBAR</section>
  <section class="auth-box">
    <div class="logo">LOGO</div>
    <h1>[Nama PM]</h1><p class="mute">Kelola proyek tim dengan mudah</p>
    <h2>Masuk ke akun Anda</h2>
    ${btn('<b class="g">G</b> Masuk dengan Google', { cls: 'dark lg block', go: 'akun', busy: 600 })}
    <p class="small mute">Belum punya akun? Cukup masuk dengan Google. Akun baru perlu disetujui admin sebelum bisa dipakai.</p>
    <p class="small"><button type="button" class="back" data-act="todo">Bantuan</button> · <button type="button" class="back" data-act="todo">Kebijakan Privasi</button></p>
  </section></main>`;

SCREENS.akun = () => `<main class="auth google">
  ${note('Layar milik Google, bukan buatan kita. Ditampilkan untuk menjelaskan alur. Pilih “Nico” untuk masuk sebagai Project Manager; “Nico (kantor)” mensimulasikan akun baru yang belum disetujui.')}
  <div class="card ink gbox"><span class="g" style="margin:0 auto;border:1px solid var(--line)">G</span><h2>Pilih akun</h2><p class="mute">untuk melanjutkan ke [Nama PM]</p>
    <button type="button" class="acc" data-act="masuk" data-arg="nico" data-busy="600">${avatar('nico')}<span><b>Nico</b><br><small class="mute">nico@email.com</small></span></button>
    <button type="button" class="acc" data-act="masuk" data-arg="baru" data-busy="600"><span class="avatar">N</span><span><b>Nico (kantor)</b><br><small class="mute">nama@kantor.co.id</small></span></button>
    <button type="button" class="acc" data-act="todo">${ico('plus')} Gunakan akun lain</button>
    <p class="small mute">Google akan membagikan nama, email, dan foto profil Anda ke [Nama PM].</p></div>
  ${btn('← Kembali', { go: 'login' })}</main>`;

SCREENS.menunggu = () => `<main class="pend">
  <div class="row sp-b"><b>[Nama PM]</b>${btn('Keluar', { cls: 'sm', go: 'login' })}</div>
  <div class="card ink" style="margin:1rem 0"><div class="row">${ico('clock')}<h2>Akun Anda menunggu persetujuan admin</h2>${badge('Menunggu', 'dash')}</div>
    <p class="mute">Anda bisa membuka Beranda setelah admin menyetujui. Sambil menunggu, lengkapi profil di bawah.</p></div>
  <div class="card"><h2>Profil Saya</h2>
    <div class="row" style="margin:.5rem 0 1rem"><span class="avatar" style="width:4rem;height:4rem">FOTO</span><div><p class="small mute">Foto dari akun Google</p>${btn('Ganti foto', { cls: 'sm', act: 'todo' })}</div></div>
    <div class="f2">${fld('Nama lengkap *', 'p-nama', inp('p-nama', 'Nico'))}${fld('Email (dari Google, tidak bisa diubah)', 'p-email', '<input id="p-email" type="text" value="nico@email.com" disabled>')}</div>
    <div class="f2">${fld('Nama panggilan', 'p-pang', inp('p-pang', 'Nico'))}${fld('No. HP', 'p-hp', inp('p-hp', '08xx xxxx xxxx', '', 'tel'))}</div>
    <div class="f2">${fld('Jabatan', 'p-jab', inp('p-jab', '', 'Contoh: Staf Keuangan'))}${fld('Divisi', 'p-div', inp('p-div', '', 'Contoh: Keuangan'))}</div>
    <div class="field"><span class="lbl">Ukuran teks</span>${seg([[1, 'Normal'], [1.25, 'Besar'], [1.5, 'Sangat besar']], S.textSize, k => ({ act: 'ukuran', arg: k }))}</div>
    <div class="wrap" style="justify-content:flex-end">${btn('Cek status', { act: 'cekstatus', busy: 700 })}${btn('Simpan profil', { cls: 'dark', act: 'simpanprofil0', busy: 600 })}</div></div>
  <p class="small mute" style="margin-top:.75rem">Belum ada menu lain sebelum akun disetujui admin.</p>
  ${note('Simulasi: admin menyetujui akun ini.')}${btn('Admin menyetujui → buka Beranda', { cls: 'sm', act: 'setujuiakun' })}</main>`;

ACT.masuk = a => {
  if (a === 'nico') { S.authed = true; toast('Selamat datang, Nico.'); go('beranda'); } else go('menunggu');
};
ACT.cekstatus = () => toast('Akun belum disetujui admin. Coba lagi nanti.');
ACT.simpanprofil0 = () => toast('Profil tersimpan.');
ACT.setujuiakun = () => { S.authed = true; toast('Akun disetujui. Selamat datang!'); go('beranda'); };
ACT.ukuran = a => { S.textSize = Number(a); applyTextSize(); };
