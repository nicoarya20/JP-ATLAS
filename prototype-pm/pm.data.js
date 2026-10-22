// Data contoh + state prototype PM. Nama, angka, dan tanggal mengikuti wireframe (Penpot, WIREFRAME NICO); semuanya fiktif.
const ME = 'nico';
const TODAY = '2026-10-08'; // Kamis, 8 Oktober 2026 (tanggal di wireframe Beranda)
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BLN_L = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const parts = d => d.split('-').map(Number);
const fmt = d => { const [, m, t] = parts(d); return `${t} ${BLN[m - 1]}`; };
const fmtL = d => { const [y, m, t] = parts(d); return `${t} ${BLN_L[m - 1]} ${y}`; };
const hari = d => HARI[new Date(`${d}T00:00:00`).getDay()];
const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

const PEOPLE = {
  nico: { n: 'Nico', full: 'Nico', role: 'Project Manager', jabatan: 'Project Manager', email: 'nico@email.com' },
  rina: { n: 'Rina', full: 'Rina Wulandari', role: 'Member', jabatan: 'Desainer UI', email: 'rina@email.com' },
  dodi: { n: 'Dodi', full: 'Dodi Prasetyo', role: 'Member', jabatan: 'Pengembang', email: 'dodi@email.com' },
  ayu: { n: 'Ayu', full: 'Ayu Lestari', role: 'Member', jabatan: 'Penguji (QA)', email: 'ayu@email.com' },
  rinap: { n: 'Rina', full: 'Rina Pratiwi', role: 'Member', jabatan: 'Keuangan', email: 'rinap@email.com' },
};
const STATUS_T = { todo: 'Belum dikerjakan', doing: 'Sedang dikerjakan', review: 'Menunggu diperiksa', done: 'Selesai', cancel: 'Dibatalkan' };
const PRIORITAS = ['Rendah', 'Sedang', 'Tinggi', 'Kritis'];
const JENIS_E = ['Rapat', 'Review', 'Acara penting', 'Acara tim', 'Lainnya'];

const tahap = (a, b, c) => [{ n: 'Perencanaan', s: a }, { n: 'Pengerjaan', s: b }, { n: 'Uji dan serah terima', s: c }];
const P = (id, nama, lead, status, kond, info, progres, tenggat, o = {}) => ({
  id, nama, lead, status, kond, info, progres, tenggat, ext: 0, anggota: [lead], desk: '', tahapan: tahap('selesai', 'berjalan', 'belum'),
  periksa: 'pengelola', jenis: ['Tugas', 'Bug'], tag: ['sso', 'login', 'api', 'desain', 'uji', 'profil'], ...o,
});
const T = (id, judul, proyek, status, pj, tenggat, o = {}) => ({
  id, judul, proyek, status, pj, tenggat, prioritas: 'Sedang', jenis: 'Tugas', pemeriksa: 'nico', tag: [], desk: '', bukti: '', ...o,
});
const E = (id, judul, tgl, jam, jenis, mode, o = {}) => ({
  id, judul, tgl, jam, jenis, mode, lokasi: '', peserta: ['nico'], desk: '', status: 'akan', hasil: null, berulang: false, ...o,
});

const seed = () => ({
  authed: false, ui: {}, modal: null, toast: null, ok: null, textSize: 1, seq: 100,
  projects: [
    P('atlas', 'Proyek Atlas', 'nico', 'Berjalan', 'warn', '1 tugas penting terlambat', 70, '2026-10-31', { ext: 1, anggota: ['nico', 'rina', 'dodi', 'ayu'], desk: 'Membangun ulang portal pelanggan: masuk dengan Google, profil, dan laporan.', tahapan: [{ n: 'Perencanaan', s: 'selesai' }, { n: 'Pengerjaan', s: 'berjalan', scope: true }, { n: 'Uji dan serah terima', s: 'belum' }] }),
    P('sinar', 'Portal Klien PT Sinar', 'rina', 'Berjalan', 'warn', '2 bug Kritis terlambat', 35, '2026-10-20', { anggota: ['rina', 'dodi', 'nico'], desk: 'Portal untuk klien PT Sinar melihat progres pekerjaan.' }),
    P('migrasi', 'Migrasi Data Lama', 'dodi', 'Berjalan', 'late', 'tenggat lewat 7 hari', 80, '2026-09-30', { anggota: ['dodi', 'ayu'], desk: 'Memindahkan data pelanggan dari sistem lama.' }),
    P('internal', 'Internal Tools', 'nico', 'Berjalan', 'ok', 'sesuai jadwal', 50, '2026-12-15', { anggota: ['nico', 'ayu'], desk: 'Alat bantu internal: laporan bulanan dan rekap absensi.' }),
    P('web', 'Redesain Website', 'nico', 'Ditunda', 'ok', 'menunggu anggaran', 20, '2027-01-31', { anggota: ['nico', 'rina'], tahapan: tahap('berjalan', 'belum', 'belum') }),
    P('magang', 'Program Magang', 'nico', 'Draf', 'ok', 'belum dimulai', 0, '2027-02-28', { anggota: ['nico'], tahapan: tahap('belum', 'belum', 'belum') }),
    P('audit', 'Audit Keamanan', 'ayu', 'Selesai', 'ok', 'selesai', 100, '2026-09-15', { anggota: ['ayu', 'dodi'], tahapan: tahap('selesai', 'selesai', 'selesai') }),
    P('hajatan', 'Hajatan Keluarga', 'nico', 'Berjalan', 'warn', 'katering belum dipesan', 40, '2026-10-24', { anggota: ['nico', 'rina', 'dodi'], desk: 'Persiapan acara keluarga 24 Oktober.' }),
    P('renovasi', 'Renovasi Dapur', 'nico', 'Berjalan', 'ok', 'sesuai jadwal', 70, '2026-10-17', { anggota: ['nico'], desk: 'Renovasi dapur rumah.' }),
    P('arisan', 'Arisan RT', 'nico', 'Berjalan', 'ok', 'sesuai jadwal', 90, '2026-10-18', { anggota: ['nico', 'rinap'], desk: 'Pengurus arisan RT bulan ini.' }),
  ],
  tasks: [
    T(17, 'Perbaiki tombol simpan di halaman profil', 'atlas', 'review', 'dodi', '2026-10-08', { jenis: 'Bug', prioritas: 'Tinggi', tag: ['profil'], bukti: 'tombol-simpan-profil.png', desk: 'Tombol Simpan di halaman Profil tidak bereaksi setelah nama diubah.' }),
    T(12, 'Susun rancangan halaman login', 'atlas', 'doing', 'nico', '2026-10-09', { tag: ['login', 'desain'], pemeriksa: 'ayu', desk: 'Buat dua opsi tata letak halaman masuk untuk dipilih tim.' }),
    T(14, 'Siapkan data uji untuk SSO', 'atlas', 'todo', 'nico', '2026-10-12', { tag: ['sso', 'uji'], pemeriksa: 'dodi' }),
    T(16, 'Sambungkan login Google', 'atlas', 'doing', 'dodi', '2026-10-10', { prioritas: 'Tinggi', tag: ['sso', 'login'] }),
    T(18, 'Tulis dokumentasi API pembayaran', 'atlas', 'todo', 'rina', '2026-10-14', { prioritas: 'Rendah', tag: ['api'] }),
    T(19, 'Rapikan menu samping', 'atlas', 'done', 'ayu', '2026-10-02', { tag: ['desain'] }),
    T(20, 'Tentukan teks pesan galat', 'atlas', 'todo', null, '2026-10-15'),
    T(21, 'Perbaiki halaman gagal muat', 'sinar', 'doing', 'rina', '2026-10-05', { jenis: 'Bug', prioritas: 'Kritis' }),
    T(22, 'Data klien tercatat dua kali', 'sinar', 'todo', 'dodi', '2026-10-06', { jenis: 'Bug', prioritas: 'Kritis' }),
    T(23, 'Susun daftar permintaan klien', 'sinar', 'todo', null, '2026-10-18'),
    T(31, 'Verifikasi hasil migrasi tabel pengguna', 'migrasi', 'doing', 'dodi', '2026-09-30', { prioritas: 'Tinggi', pemeriksa: 'ayu' }),
    T(41, 'Pilih templat laporan bulanan', 'internal', 'todo', 'nico', '2026-10-20'),
    T(42, 'Buat halaman rekap absensi', 'internal', 'doing', 'ayu', '2026-10-22'),
    T(43, 'Tulis panduan pemakaian', 'internal', 'todo', null, '2026-11-05'),
    T(51, 'Pesan katering untuk 80 orang', 'hajatan', 'todo', 'nico', '2026-10-08', { prioritas: 'Tinggi' }),
    T(52, 'Konfirmasi tenda ke Pak Budi', 'hajatan', 'todo', 'nico', '2026-10-08'),
    T(53, 'Hubungi Pak RT soal izin', 'hajatan', 'todo', 'nico', '2026-10-13'),
    T(54, 'Cetak daftar tamu', 'hajatan', 'todo', 'rina', '2026-10-13'),
    T(55, 'Cari lokasi tenda', 'hajatan', 'done', 'dodi', '2026-10-07'),
    T(61, 'Bayar DP tukang keramik', 'renovasi', 'todo', 'nico', '2026-10-06', { prioritas: 'Tinggi' }),
    T(62, 'Survei harga keramik', 'renovasi', 'done', 'nico', '2026-10-08'),
    T(63, 'Beli cat dinding', 'renovasi', 'todo', 'nico', '2026-10-10'),
  ],
  events: [
    E('e1', 'Rapat panitia hajatan', '2026-10-08', '10:00', 'Rapat', 'Tatap muka', { lokasi: 'Rumah Pak RT', peserta: ['nico', 'rina', 'dodi'], desk: 'Bahas anggaran, katering, dan tenda.', siap: false }),
    E('e2', 'Review desain onboarding', '2026-10-09', '14:00', 'Review', 'Online', { lokasi: 'Tautan rapat video', peserta: ['nico', 'ayu', 'rina'], desk: 'Tinjau alur masuk dan layar sambutan.' }),
    E('e3', 'Kickoff Atlas', '2026-10-01', '09:00', 'Rapat', 'Tatap muka', { lokasi: 'Ruang Rapat 2', peserta: ['nico', 'rina', 'dodi', 'ayu'], status: 'lewat', hasil: { teks: 'Tim sepakat memulai dari halaman login dan profil. Dodi memegang masuk dengan Google.', tugas: ['Susun rancangan halaman login', 'Siapkan data uji untuk SSO'], ok: true } }),
    E('e4', 'Rapat mingguan tim', '2026-10-05', '10:00', 'Rapat', 'Online', { lokasi: 'Tautan rapat video', peserta: ['nico', 'rina', 'dodi'], status: 'lewat', hasil: { teks: 'Bug di halaman gagal muat jadi prioritas. Rina memperbaiki, Dodi memeriksa data ganda.', tugas: ['Perbaiki halaman gagal muat', 'Periksa data klien ganda'], ok: false } }),
    E('e5', 'Rapat mingguan tim', '2026-10-12', '10:00', 'Rapat', 'Online', { lokasi: 'Tautan rapat video', peserta: ['nico', 'rina', 'dodi'], berulang: true }),
    E('e6', 'Ulang tahun kantor', '2026-10-15', '16:00', 'Acara tim', 'Tatap muka', { lokasi: 'Kantor lantai 2', peserta: ['nico', 'rina', 'dodi', 'ayu'] }),
    E('e7', 'Presentasi ke PT Sinar', '2026-10-20', '13:00', 'Acara penting', 'Online', { lokasi: 'Tautan rapat video', peserta: ['nico', 'rina'] }),
  ],
  inbox: {
    perlu: [
      { id: 'i1', kind: 'periksa', teks: 'Dodi meminta Anda memeriksa tugas “Perbaiki tombol simpan di halaman profil”.', waktu: '1 jam lalu', to: 'tugas/17' },
      { id: 'i2', kind: 'hasil', teks: 'Hasil “Rapat mingguan tim” siap dikonfirmasi.', waktu: '3 hari lalu', to: 'events/e4' },
      { id: 'i3', kind: 'balas', teks: 'Rina bertanya di “Pesan katering untuk 80 orang”: apakah katering sudah dipesan?', waktu: 'kemarin' },
      { id: 'i4', kind: 'izin', teks: 'Dodi meminta perpanjang tenggat Migrasi Data Lama (30 Sep → 14 Okt).', waktu: 'kemarin' },
    ],
    kabar: [
      { id: 'k1', teks: 'Dodi menyelesaikan “Cari lokasi tenda”.', waktu: 'kemarin', to: 'tugas/55' },
      { id: 'k2', teks: 'Rina menambah catatan di “Pesan katering untuk 80 orang”.', waktu: '3 jam lalu', to: 'tugas/51' },
      { id: 'k3', teks: 'Ayu menyelesaikan “Rapikan menu samping”.', waktu: '2 hari lalu', to: 'tugas/19' },
      { id: 'k4', teks: 'Anda ditambahkan ke Portal Klien PT Sinar.', waktu: '4 hari lalu', to: 'proyek/sinar' },
      { id: 'k5', teks: 'Event “Review desain onboarding” dijadwalkan 9 Okt.', waktu: '4 hari lalu', to: 'events/e2' },
    ],
  },
  trash: [
    { id: 'x1', tipe: 'Proyek', nama: 'Kunjungan Pabrik', info: 'Dihapus 3 hari lalu · sisa 27 hari', payload: P('pabrik', 'Kunjungan Pabrik', 'nico', 'Berjalan', 'ok', 'sesuai jadwal', 30, '2026-11-10') },
    { id: 'x2', tipe: 'Tugas', nama: 'Tulis ulang README', info: 'Dihapus 5 hari lalu · sisa 25 hari', payload: T(90, 'Tulis ulang README', 'internal', 'todo', 'ayu', '2026-10-30') },
    { id: 'x3', tipe: 'Event', nama: 'Rapat vendor', info: 'Dihapus 8 hari lalu · sisa 22 hari', payload: E('e90', 'Rapat vendor', '2026-10-22', '11:00', 'Rapat', 'Online', { lokasi: 'Tautan rapat video' }) },
    { id: 'x4', tipe: 'Tugas', nama: 'Cek server staging', info: 'Dihapus 2 hari lalu · proyek “Kunjungan Pabrik” ada di Sampah', payload: T(91, 'Cek server staging', 'pabrik', 'todo', 'dodi', '2026-10-25') },
  ],
  cuti: { state: 'none' },
  profil: { nama: 'Nico', panggilan: 'Nico', hp: '0812 3456 7890', jabatan: 'Project Manager', divisi: 'Produk' },
  pu: { scope: 'semua', view: 'list', status: 'Semua', sort: 'tenggat', q: '' },
  tu: { scope: 'saya', view: 'list', filter: 'aktif', proyek: '' },
  tb: { mode: 'tulis', text: 'Rina perbaiki bug tombol login besok, prioritas tinggi\nDodi buat laporan mingguan hari Jumat', parsed: null, csvTab: 'unggah', csv: false },
  eu: { tab: 'akan', view: 'daftar', jenis: 'Semua', cal: { y: 2026, m: 9 }, ringkas: true },
  rekam: { izin: false, jeda: false, detik: 0, teks: '' },
  iu: { tab: 'perlu' }, su: { tab: 'Semua' }, ask: null,
});
let S = seed();

const me = () => PEOPLE[ME];
const who = id => (id && PEOPLE[id] ? PEOPLE[id].full : 'Belum ada penanggung jawab');
const proj = id => S.projects.find(p => p.id === id);
const task = id => S.tasks.find(t => t.id === +id);
const ev = id => S.events.find(e => e.id === id);
const nextId = () => ++S.seq;
const inboxCount = () => S.inbox.perlu.length;
const isLate = t => t.tenggat < TODAY && !['done', 'cancel'].includes(t.status);
const isLead = p => p.lead === ME;
