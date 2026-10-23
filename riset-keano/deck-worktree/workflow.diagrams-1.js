// Diagram alur bagian 1: struktur, masuk aplikasi, menu Proyek, membuat tugas, siklus tugas.
// Kelas node: term = awal/akhir, main = proses utama, (tanpa kelas) = proses biasa, dec = keputusan, sys = dikerjakan sistem, tool = Alat tambahan.
window.WORKFLOW = (window.WORKFLOW || []).concat([
  { id: "struktur", menu: "Fondasi", judul: "Struktur data", arah: "LR",
    ket: "Tiga level yang dilihat pengguna. Ruang kerja satu per akun dan tidak ditampilkan.",
    kode: `
akun(["Akun"]):::term --> proyek["Proyek"]:::main
proyek --> tugas["Tugas"]:::main
tugas --> langkah["Langkah"]
tanpa["Tugas tanpa proyek"] --> harian["Proyek Harian"]:::sys
harian --> tugas
proyek --> peran["4 peran: Pemilik, Pendamping, Anggota, Tamu"]
tugas --> isi["Kapan · Siapa · Penting · Catatan · Obrolan"]
` },
  { id: "masuk", menu: "Fondasi", judul: "Masuk pertama kali", arah: "TD",
    ket: "Mulai dari tujuan, bukan dari menyusun hierarki. Orang yang diundang langsung masuk ke proyeknya.",
    kode: `
buka(["Buka aplikasi"]):::term --> punya{"Sudah punya akun?"}:::dec
punya -->|Belum| daftar["Daftar pakai nomor WhatsApp"]:::main
daftar --> undangan{"Datang dari undangan?"}:::dec
undangan -->|Ya| gabung["Masuk ke proyek yang mengundang"]
undangan -->|Tidak| tujuan["Mau mengurus apa?"]:::main
tujuan --> cara{"Pilih contoh atau ketik sendiri?"}:::dec
cara -->|Contoh| contoh["Proyek + contoh langkah dibuat"]:::sys
cara -->|Ketik| ketik["Proyek dibuat dari kalimat"]:::sys
contoh & ketik --> ajak{"Ajak orang lain sekarang?"}:::dec
ajak -->|Ya| kirim["Kirim undangan lewat WhatsApp atau tautan, pilih peran"]
ajak -->|Nanti| hariini(["Hari Ini"]):::term
kirim --> hariini
gabung --> hariini
punya -->|Sudah| hariini
` },
  { id: "proyek", menu: "Menu Proyek", judul: "Isi menu Proyek", arah: "TD",
    ket: "Halaman proyek awalnya sederhana: ringkasan, tugas, dan obrolan. Jadwal bergaris muncul sendiri, alat lain dibuka lewat Alat tambahan.",
    kode: `
mulai(["Buka menu Proyek"]):::term --> daftar["Daftar proyek: nama, progres, jumlah terlambat"]:::main
daftar --> ada{"Proyeknya sudah ada?"}:::dec
ada -->|Belum| baru["Tombol + Proyek: Mau mengurus apa?"]
ada -->|Ada| pilih["Pilih proyek"]
baru & pilih --> hal["Halaman proyek"]:::main
hal --> ringkas["Ringkasan otomatis: selesai, terlambat, langkah berikutnya"]:::sys
hal --> lensa{"Lihat sebagai?"}:::dec
lensa -->|Daftar| ld["Daftar tugas, bawaan"]
lensa -->|Papan| lp["Kolom per status, kartu digeser"]
lensa -->|Kalender| lk["Kalender mingguan"]
hal --> urut{"Ada 2+ tugas berurutan bertanggal?"}:::dec
urut -->|Ya| jb["Pilihan Jadwal bergaris muncul"]:::sys
urut -->|Tidak| jbx["Jadwal bergaris disembunyikan"]
hal --> ob["Obrolan proyek"]
hal --> ag["Anggota dan peran"]
hal --> bg["Bagikan: tautan lihat-saja atau WhatsApp"]
hal --> alat{"Butuh alat tambahan?"}:::dec
alat -->|Tidak| tetap(["Tampilan tetap sederhana"]):::term
alat -->|Ya| at["Alat tambahan"]:::main
at --> a1["Catat waktu + Laporan waktu"]:::tool
at --> a2["Tahap tambahan, maks. 5"]:::tool
at --> a3["Target dengan angka"]:::tool
at --> a4["Info tambahan"]:::tool
at --> a5["Catatan proyek dan rapat"]:::tool
at --> a6["Formulir permintaan"]:::tool
at --> a7["Pindahkan dari Excel / Unduh"]:::tool
` },
  { id: "buat", menu: "Tombol +", judul: "Membuat tugas", arah: "TD",
    ket: "Satu kotak ketik. Sistem membaca kalimat, lalu hanya menanyakan satu hal bila ada yang kurang.",
    kode: `
plus(["Tekan + atau teruskan pesan WhatsApp"]):::term --> apa{"Mau buat apa?"}:::dec
apa -->|Proyek| kep["Ke alur proyek baru"]
apa -->|Minta tolong| mt["Pilih orang, tulis permintaan"]
apa -->|Tugas| tulis["Ketik atau rekam suara"]:::main
tulis --> baca["Baca tanggal, orang, proyek"]:::sys
baca --> chip["Tampil sebagai chip"]
chip --> benar{"Chip sudah benar?"}:::dec
benar -->|Belum| ubah["Ketuk chip untuk mengubah"]
ubah --> benar
benar -->|Ya| sebut{"Proyek disebut?"}:::dec
sebut -->|Tidak| hr["Masuk proyek Harian"]:::sys
sebut -->|Ya| msk["Masuk ke proyek itu"]
hr & msk --> kurang{"Ada info penting yang kurang?"}:::dec
kurang -->|Ya| tanya["Tanya satu hal, maks. 3 tombol"]:::sys
kurang -->|Tidak| jadi["Tugas jadi + tombol Batalkan"]:::main
tanya --> jadi
jadi --> besar{"Tugasnya besar?"}:::dec
besar -->|Ya| pecah["Tawarkan Pecah jadi langkah"]:::sys
pecah --> pakai{"Pakai usulan?"}:::dec
pakai -->|Ya| lk["Langkah ditambahkan"]
pakai -->|Tidak| simpan(["Tugas tersimpan"]):::term
lk --> simpan
besar -->|Tidak| simpan
mt --> km["Dikirim lewat aplikasi atau WhatsApp"]
km --> terima{"Diterima?"}:::dec
terima -->|Ya| tj(["Jadi tugas orang itu"]):::term
terima -->|Tidak| lain["Pengirim dikabari, bisa minta ke orang lain"]
` },
  { id: "siklus", menu: "Detail tugas", judul: "Siklus status tugas", arah: "TD",
    ket: "Pengguna hanya menekan Selesai. Menunggu giliran, Aktif, Belum berjadwal, dan Terlambat diatur sistem.",
    kode: `
dibuat(["Tugas dibuat"]):::term --> tgl{"Punya tanggal?"}:::dec
tgl -->|Tidak| bb["Belum berjadwal"]:::sys
bb --> kapan["Hari Ini bertanya: kapan dikerjakan?"]
kapan --> tgl
tgl -->|Ya| setelah{"Harus setelah tugas lain?"}:::dec
setelah -->|Ya| mg["Menunggu giliran"]:::sys
mg --> sblm{"Tugas sebelumnya selesai?"}:::dec
sblm -->|Belum| mg
sblm -->|Sudah| kabar1["Orangnya dikabari"]:::sys
kabar1 --> aktif["Aktif"]:::main
setelah -->|Tidak| aktif
aktif --> lewat{"Lewat tenggat?"}:::dec
lewat -->|Ya| tl["Terlambat"]:::sys
tl --> kartu{"Kartu tindak lanjut"}:::dec
kartu -->|Besok saja| geser["Tanggal digeser"]
geser --> aktif
kartu -->|Minta tolong| ganti["Pindah ke orang lain"]
ganti --> aktif
kartu -->|Sudah selesai| sel
lewat -->|Tidak| tekan["Tekan Selesai"]:::main
tekan --> cek{"Proyek memakai tahap Perlu dicek?"}:::dec
cek -->|Ya| pc["Perlu dicek"]:::tool
pc --> setuju{"Pemeriksa setuju?"}:::dec
setuju -->|Kembalikan| aktif
setuju -->|Setuju| sel
cek -->|Tidak| sel["Selesai"]:::main
sel --> minta{"Ada yang minta dikabari?"}:::dec
minta -->|Ya| kirim["Kabar terkirim"]:::sys
minta -->|Tidak| next["Tugas berikutnya di estafet aktif"]:::sys
kirim --> next
next --> arsip(["Diarsipkan otomatis setelah 30 hari"]):::term
` }
]);
