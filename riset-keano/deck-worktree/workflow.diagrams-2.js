// Diagram alur bagian 2: menu Hari Ini, Tugas, Orang, Pengaturan, dan aturan otomatis.
window.WORKFLOW = (window.WORKFLOW || []).concat([
  { id: "hariini", menu: "Menu Hari Ini", judul: "Isi menu Hari Ini", arah: "TD",
    ket: "Layar pertama setiap hari. Pengguna cukup menjawab kartu; tiap jawaban langsung mengubah data.",
    kode: `
buka(["Buka aplikasi"]):::term --> pagi["Ringkasan pagi: hari ini, terlambat, menunggu kamu"]:::sys
pagi --> rencana{"Sudah memilih rencana hari ini?"}:::dec
rencana -->|Belum| pilih["Pilih 1 sampai 3 tugas"]:::main
rencana -->|Sudah| daftar["Daftar tugas hari ini"]
pilih --> daftar
daftar --> kartu{"Ada kartu yang butuh jawaban?"}:::dec
kartu -->|Ya| jawab["Jawab dengan tombol, maks. 3"]:::main
jawab --> ubah["Data berubah: tanggal, orang, atau status"]:::sys
ubah --> kartu
kartu -->|Tidak| kerja["Kerjakan, tekan Selesai"]
kerja --> jam{"Sudah jam tenang 21.00 sampai 06.00?"}:::dec
jam -->|Ya| tahan["Kabar ditahan sampai pagi"]:::sys
jam -->|Tidak| kabar["Kabar penting tampil sebagai kartu"]
kabar --> kartu
tahan --> besok(["Besok mulai lagi dari ringkasan pagi"]):::term
` },
  { id: "tugas", menu: "Menu Tugas", judul: "Isi menu Tugas", arah: "TD",
    ket: "Semua tugas milik saya dari semua proyek, dikelompokkan menurut waktu.",
    kode: `
mulai(["Buka menu Tugas"]):::term --> semua["Tugas saya: Terlambat, Hari ini, Minggu ini, Nanti, Belum berjadwal"]:::main
semua --> mau{"Mau apa?"}:::dec
mau -->|Cari| cari["Ketik kata atau pertanyaan"]
cari --> jenis{"Berupa pertanyaan?"}:::dec
jenis -->|Ya| ai["Jawaban singkat + tautan ke tugasnya"]:::sys
jenis -->|Tidak| hasil["Daftar hasil"]
mau -->|Saring| saring["Tombol saring: proyek, orang, penting"]
mau -->|Ubah banyak| lama["Tekan lama satu tugas, centang lainnya"]:::main
lama --> aksi{"Pilih aksi"}:::dec
aksi -->|Geser tanggal| a1["Tanggal semua digeser"]
aksi -->|Ganti orang| a2["Orang semua diganti"]
aksi -->|Selesai| a3["Semua ditandai selesai"]
a1 & a2 & a3 --> batal["Tombol Batalkan muncul"]:::sys
mau -->|Buka| detail(["Detail tugas"]):::term
ai & hasil & saring --> detail
` },
  { id: "orang", menu: "Menu Orang", judul: "Isi menu Orang", arah: "TD",
    ket: "Mengatur siapa ikut dan melihat siapa yang sedang sibuk. Tamu bisa ikut tanpa membuat akun.",
    kode: `
mulai(["Buka menu Orang"]):::term --> daftar["Daftar orang + jumlah tugas aktif"]:::main
daftar --> mau{"Mau apa?"}:::dec
mau -->|Undang| undang["Undang lewat WhatsApp atau tautan"]:::main
undang --> peran{"Pilih peran"}:::dec
peran -->|Pendamping| p1["Bantu mengatur semua proyek"]
peran -->|Anggota| p2["Mengerjakan tugas di proyek yang diikuti"]
peran -->|Tamu| p3["Hanya proyek yang dibagikan"]
p3 --> akun{"Tamu punya akun?"}:::dec
akun -->|Tidak| wa["Ikut lewat tautan atau WhatsApp"]:::sys
akun -->|Ya| app["Masuk lewat aplikasi"]
mau -->|Lihat beban| sibuk["Siapa sedang sibuk"]:::main
sibuk --> penuh{"Ada yang tugasnya menumpuk?"}:::dec
penuh -->|Ya| saran["Saran: pindahkan tugas ke orang yang longgar"]:::sys
saran --> pindah{"Pindahkan?"}:::dec
pindah -->|Ya| ok["Tugas pindah, kedua orang dikabari"]
pindah -->|Tidak| biar(["Tetap seperti semula"]):::term
penuh -->|Tidak| biar
mau -->|Buka orang| profil["Tugas orang itu + Minta tolong"]
` },
  { id: "pengaturan", menu: "Menu Pengaturan", judul: "Isi menu Pengaturan", arah: "TD",
    ket: "Paling banyak tiga pilihan per layar. Tidak ada mode lanjutan global.",
    kode: `
mulai(["Buka Pengaturan"]):::term --> grup{"Pilih bagian"}:::dec
grup -->|Tampilan| t1["Teks besar · Mode gelap · Bahasa"]
grup -->|Kabar| t2["Jam tenang · Kabar lewat WhatsApp · Ringkasan pagi"]
grup -->|Sambungan| t3["Google Calendar · Email · Impor"]
grup -->|Aturan otomatis| t4["Daftar kalimat aturan yang aktif"]:::main
grup -->|Akun| t5["Nama · Nomor · Keluar"]
t3 --> kal{"Sambungkan Google Calendar?"}:::dec
kal -->|Ya| sinkron["Tugas bertanggal muncul di kalender"]:::sys
kal -->|Tidak| tetap(["Tetap di aplikasi saja"]):::term
t4 --> lihat(["Ke alur Aturan otomatis"]):::term
` },
  { id: "aturan", menu: "Sistem", judul: "Aturan otomatis", arah: "TD",
    ket: "Pengguna tidak merakit aturan. Sistem melihat pola, menawarkan dalam satu kalimat, lalu pengguna cukup menjawab.",
    kode: `
pola(["Sistem melihat pola berulang"]):::term --> contoh["Contoh: tugas Belanja selalu diberikan ke Rina"]:::sys
contoh --> tawar["Kartu tawaran: Mau begini terus?"]:::main
tawar --> jawab{"Jawaban"}:::dec
jawab -->|Ya| aktif["Aturan aktif, tampil sebagai kalimat"]:::main
jawab -->|Jangan tawarkan lagi| diam["Pola tidak ditawarkan lagi"]:::sys
jawab -->|Nanti| tunda["Ditawarkan lagi minggu depan"]
aktif --> jalan["Aturan berjalan + catatan kecil di tugas"]:::sys
jalan --> salah{"Hasilnya tidak sesuai?"}:::dec
salah -->|Ya| matikan["Matikan atau ubah di Pengaturan"]
salah -->|Tidak| terus(["Aturan terus berjalan"]):::term
matikan --> selesai(["Aturan berhenti"]):::term
diam --> selesai
` }
]);
