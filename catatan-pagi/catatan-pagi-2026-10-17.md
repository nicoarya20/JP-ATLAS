# Catatan Pagi — Simple PM

> Bahan presentasi untuk orang awam. Posisi per 16 Oktober 2026 (sore).
> Sumber: `tahapan-proyek/05-implementasi/PROGRES.md` (cabang `feature/project-management`, sampai gelombang 14), `tahapan-proyek/04-prototype/prototype-pm/`, dan `tahapan-proyek/05-implementasi/flow/`.

## 1. Satu kalimat
Simple PM adalah aplikasi **manajemen proyek untuk tim kecil**, dibuat supaya mudah dipakai orang awam dan lansia. Kami tidak membangun dari nol, tetapi **mengembangkan aplikasi template yang sudah jalan (Makuro)** lalu mengubahnya menjadi aplikasi proyek.

## 2. Posisi sekarang (angka)
- **64 dari 93 tugas selesai** (sekitar 69%) dan sudah digabung ke jalur utama.
- Pengujian otomatis naik dari **687 menjadi 3.089 lulus, 0 gagal**.
- Pekerjaan dibagi per "gelombang". **Gelombang 1 sampai 14 selesai**, tidak ada yang gagal karena kuota.
- **Fondasi selesai seluruhnya (58 dari 58 tugas)**: prasyarat teknis, akun dan hak akses, dan "kontrak beku" (bentuk data dan API yang dikunci).
- **Layar Proyek dan Tugas baru mulai**: 4 dari 18 tugas Proyek dan 2 dari 17 tugas Tugas, semuanya di sisi server. **Layarnya sendiri belum dibangun.**
- Baru ada dua hal baru yang bisa dilihat di luar kode: **prototype klik-klik** dan **peta alur** (bagian 3e dan 3f).

Analogi: membangun rumah. Pondasi, pipa, kunci pintu, dan denah yang disepakati sudah jadi. Ruang tamu dan dapur (layar Proyek dan Tugas) baru mulai dipasang rangkanya. Sambil menunggu, kami sudah membuat **maket yang bisa dimasuki** (prototype).

## 3. Yang bisa langsung dilihat

### a. Nama baru
- Dari "Makuro Template" menjadi **Simple PM**.
- Berubah di judul halaman, menu samping, halaman depan, dan README.

### b. Peran pengguna: dari 3 menjadi 4
| | Template Makuro (sebelum) | Simple PM (sekarang) |
|---|---|---|
| Jumlah peran | 3 | **4** |
| Peran | Super-admin, Admin, User | **Super-admin, Admin, Project Manager, Member** |

Arti tiap peran, bahasa sehari-hari:
- **Super-admin**: pemilik sistem. Ditentukan lewat daftar email di pengaturan server, dan emailnya harus sudah terverifikasi. Masuk ke halaman pengelolaan teknis.
- **Admin**: mengatur akun orang lain. Menyetujui anggota baru dan mengatur peran. Masuk ke halaman admin.
- **Project Manager (baru)**: mengelola proyek dan anggotanya. Masuk ke halaman kerja.
- **Member (nama baru dari "User")**: mengerjakan tugas. Masuk ke halaman kerja.

Catatan kecil:
- Akun lama berperan "user" **otomatis terbaca sebagai Member**. Tidak ada yang perlu diubah manual.
- Admin dan Super-admin tetap boleh membuka halaman kerja.

### c. Cara masuk: hanya Google (di server produksi)
- Daftar dan masuk memakai email dan password **ditutup di produksi**. Sebelumnya ini celah keamanan.
- Akun Google tidak lagi tergabung otomatis ke akun lain yang emailnya mirip.
- **Tombol "Coba Demo" sudah dicabut**, termasuk akun demo lama yang dibersihkan otomatis.

### d. Akun baru harus disetujui (sekarang alurnya lengkap)
- Akun baru berstatus **menunggu** dan **belum bisa memakai aplikasi** sampai disetujui. Akun yang **ditolak** juga tidak bisa masuk. Berlaku juga untuk akses lewat kunci API.
- Akun lama otomatis **disetujui**, jadi tidak ada yang terkunci.
- **Halaman "Menunggu persetujuan"** sudah ada (sebelumnya akun baru terlempar ke error 404). Halaman "Ditolak" dan "Diblokir" ikut.
- **Layar Admin untuk mengurus akun** sudah ada di `/dashboard/users`: tab Persetujuan (setujui atau tolak dengan alasan), Semua pengguna (ubah peran, blokir), dan Undangan.
- **Penanda "N akun menunggu persetujuan"** muncul di menu samping dan di beranda Admin, supaya antrean tidak terlewat.
- Jalur **undangan**: email yang diundang langsung diterima dengan peran yang ditentukan (berlaku 14 hari). Domain email juga bisa dibatasi, misalnya hanya email kantor.

### e. BARU: prototype klik-klik untuk Project Manager
- Folder `tahapan-proyek/04-prototype/prototype-pm`. **Cukup buka `index.html` di browser**, tanpa server.
- Alurnya dari **Login, pilih akun Google, sampai semua menu**: Beranda, Inbox, Proyek, Tugas, Events, Tim, Sampah, Pengaturan. Di ponsel menu pindah ke bawah.
- Yang bisa dicoba: membuat proyek (form, ceritakan ke AI, atau template), memulai dan menyelesaikan tugas, meminta pemeriksaan dengan bukti, membuat event termasuk yang berulang, mencatat rapat lewat suara sampai jadi tugas, menghapus ke Sampah lalu memulihkannya.
- Ada akun contoh **"Nico (kantor)"** untuk memperlihatkan seperti apa akun baru yang menunggu persetujuan.
- Data hanya hidup di halaman. Muat ulang browser mengembalikan semuanya ke awal.
- Rancangannya berasal dari wireframe di Penpot (file `PM-New`). Semua nama dan angka (Nico, Rina, Dodi, Atlas) adalah **data contoh**.
- **Ini maket, bukan aplikasi.** Hanya 5 layar yang isi teksnya terbaca penuh dari wireframe; layar lain disusun dari nama layar dan label tombol, jadi **isi barisnya masih perlu dicocokkan dengan wireframe**.
- Sudah punya pengujian otomatis (`tests/prototype-pm.test.ts`).

### f. BARU: peta alur lengkap (bahan diagram presentasi)
Tujuannya satu: **tidak ada perilaku aplikasi yang tersembunyi ("magic")** yang baru ketahuan saat presentasi. Tiga sumber dibaca dan dicocokkan: wireframe Penpot, kode yang berjalan, dan dokumen proyek.
- **121 unit alur** dipetakan: 42 sudah konsisten di tiga sumber, 26 hanya ada di kode (kandidat "magic"), 31 hanya ada di desain, 3 hanya di dokumen, 19 saling bertentangan.
- Status 121 unit itu terhadap MVP Inti: 42 sudah dibangun, 45 sedang dibangun, 24 ditunda, 10 tidak direncanakan.
- Rencana **15 diagram** dan **58 kartu aturan** (aturan yang jalan sendiri, misalnya "peran hilang bila email dicabut dari daftar Super-admin"). Cakupannya **189 dari 195 butir kode (96,9%)**; enam sisanya punya alasan tertulis.
- Setiap diagram memakai **tiga penanda jujur**: sudah berjalan, sedang dibangun, ditunda atau tidak direncanakan.
- **Diagramnya sendiri belum digambar.** Pemilik sudah memutuskan 15 pertanyaan dengan "pakai semua default" (mis. istilah resmi "Diblokir" dan "Pengelola utama", demo dimulai dari halaman login). Gambar dibuat di Penpot, halaman `diagram flow`, dalam tiga tahap yang diperiksa di antaranya.

## 4. Yang bekerja di belakang layar (tidak terlihat, tetapi penting)
- **Tempat data proyek dan tugas sudah ada**: tabel proyek, anggota, riwayat aktivitas, tugas, daftar periksa, komentar. Perubahan database dibuat aman bila diulang dan ada cara mundur (rollback).
- **Kontrak beku (`contract-v1`) lolos**: bentuk data dan API dikunci. Ini yang memungkinkan banyak pekerja AI mengerjakan layar berbeda tanpa saling bentrok.
- **Aturan siapa boleh apa** (akun, proyek, anggota, tugas, pemeriksa) sudah ditulis sebagai kode yang bisa diuji. Tidak ada aturan yang "hanya ada di kepala orang".
- **Rumus kemajuan proyek** dan kondisi proyek (aman atau berisiko) sudah jadi.
- **API membaca proyek dan profil sudah hidup**: daftar proyek, detail proyek beserta kemajuannya, anggota proyek, serta profil dan pilihan ukuran huruf. Penyusunan jadwal tugas ("hari ini", "minggu ini", terlambat) juga sudah ada. Semuanya belum punya layar.
- **Ukuran huruf Normal / Besar / Sangat besar** sudah tersambung sampai tampilan server.
- **Kerangka 11 halaman area kerja** (Beranda, Proyek, Tugas, Pengaturan, dan lain-lain) beserta menunya sudah dipasang, isinya masih kosong. **Data contoh "Atlas"** tersedia untuk mencoba tampilan.
- **Komponen tampilan bersama** (tabel, filter, kotak konfirmasi, badge status) sudah siap dipakai ulang.
- **Pesan error seragam** dalam bahasa Indonesia yang jelas dan memberi tahu langkah berikutnya.
- **Penjaga mutu**: server menolak jalan bila kunci rahasianya lemah atau masih contoh; versi alat dikunci; tes rute dan tes basis data dijaga agar hasilnya tidak bergantung urutan.
- **Peringatan keamanan pada pustaka pihak ketiga diperbaiki** (7 peringatan, termasuk 1 kritis dan 2 tinggi). Tersisa 1 tingkat sedang pada alat pengembang, bukan di aplikasi yang berjalan.
- **Pemilih tanggal berbahasa Indonesia** (pekan mulai Senin) sudah disiapkan untuk tenggat proyek.

## 5. Yang BELUM selesai (jujur)
- **Layar Proyek dan Tugas yang sebenarnya** belum ada. Data dan API bacanya sudah, layarnya belum.
- **Pengaturan profil dan ukuran huruf**: server sudah bisa menyimpan, tetapi belum ada tombol di layar untuk mengubahnya.
- **Login Google asli belum diuji ujung ke ujung.** Pemilik memilih melanjutkan tanpa uji itu dan tanpa peninjau keamanan kedua. Risikonya dicatat apa adanya dan uji tetap terbuka.
- **Penguji lansia (5 orang, usia 50+)** masih data contoh. Orang aslinya harus ditentukan sebelum uji pengguna.
- **Diagram alur** baru berupa rencana, belum digambar.
- **Prototype** belum dicocokkan penuh dengan wireframe (lihat 3e).
- **13 temuan dari pemetaan alur** belum dikerjakan. Yang paling perlu diketahui:
  - Pesan "kami akan memberi kabar lewat email" untuk akun menunggu **menjanjikan email yang tidak pernah dikirim**. Kalimat ini akan dihapus.
  - Kartu **Hapus akun** tampil untuk semua orang. Akan disembunyikan untuk selain Super-admin.
  - Saklar "Pendaftaran publik" di pengaturan Super-admin **tidak benar-benar mencegah pendaftaran**. Labelnya akan diubah atau saklarnya dihapus.
  - Beberapa perilaku akun menunggu atau ditolak perlu **diuji saat aplikasi berjalan** sebelum presentasi, karena baru dibaca dari kode.
  - Halaman depan dan judul tab masih bertuliskan "Fullstack Template", sehingga demo dimulai dari halaman login.

Jadi **jangan menjanjikan fitur Proyek dan Tugas kepada audiens sebagai sesuatu yang sudah bisa dipakai**. Yang bisa ditunjukkan hari ini: alur akun dan persetujuan yang nyata, ditambah prototype untuk gambaran layar.

## 6. Cara kami bekerja (poin untuk meyakinkan)
- Satu tugas = satu cabang kerja terpisah, dikerjakan agen AI di ruang kerja masing-masing, 3 sampai 4 sekaligus.
- Sebelum digabung, hasil diperiksa ulang secara mandiri, lalu dicoba digabung di ruang sementara.
- Contoh nyata: pada gelombang 3 percobaan gabungan menemukan **satu bentrok yang tidak terlihat** saat tiap tugas dites sendirian. Pada gelombang 14, dua tugas yang sama-sama mengosongkan daftar kerangka halaman bentrok saat digabung dan diselesaikan sebelum masuk jalur utama.
- Perubahan sensitif (login, hak akses, database) **disetujui satu per satu** oleh pemilik proyek.
- Setiap gelombang diuji penuh, termasuk uji nyala aplikasi (kini 28 pemeriksaan).
- Pemetaan alur juga dikerjakan agen yang **hanya membaca**: Penpot, repo, dan aplikasi tidak diubah. Ada skrip yang menghitung ulang angka kelengkapan supaya bisa dicek siapa pun.

## 7. Yang akan datang
- **Gelombang 15 dan seterusnya** menunggu konfirmasi pemilik. Keputusan yang dibutuhkan (tenggat proyek bebas diubah, status proyek bebas lima nilai) sudah dijawab "ya".
- Sisa tugas **layar Proyek** (daftar, detail, buat dan ubah, anggota, Tempat Sampah) lalu **layar Tugas** (daftar, form, alur status, daftar periksa, komentar, riwayat).
- **Uji pengguna**: minimal 3 dari 5 orang berusia 50+ bisa memakainya tanpa dibantu. Tanpa ini, tahap berikutnya tidak dibuka.
- Menggambar **15 diagram alur** di Penpot, tiga tahap.
- Memperbaiki temuan pemetaan (kalimat email, kartu hapus akun, saklar pendaftaran) saat layar terkait dibangun.
- Perkiraan total versi pertama: sekitar **128 hari kerja AI, kira-kira 8 minggu** kalender.

## 8. Kemungkinan pertanyaan dan jawabannya
- **"Kenapa belum ada layar Proyek dan Tugas?"** Fondasi akun, hak akses, dan kontrak data harus aman dulu, karena kesalahan di sini susah diperbaiki setelah ada data pengguna. Fondasi kini selesai, dan layarnya mulai dikerjakan.
- **"Lalu yang di prototype itu apa?"** Maket untuk melihat dan menilai alurnya lebih awal. Datanya contoh dan tidak tersimpan. Aplikasi sungguhan dibangun terpisah dan akan dibuat mengikuti prototype setelah dicocokkan dengan wireframe.
- **"Kenapa ada pemetaan dan diagram alur?"** Supaya tidak ada perilaku yang muncul tiba-tiba. Setiap aturan yang jalan sendiri ditulis sebagai kartu bernomor, dan setiap langkah ditandai sudah berjalan, sedang dibangun, atau ditunda.
- **"Kenapa 4 peran?"** Supaya tugas mengatur proyek (Project Manager) terpisah dari mengatur akun (Admin) dan dari mengerjakan tugas (Member).
- **"Apakah data lama aman?"** Ya. Akun lama otomatis disetujui dan peran lama otomatis terbaca Member.
- **"Siapa yang menentukan Super-admin?"** Daftar email di pengaturan server, bukan lewat layar, jadi tidak bisa dinaikkan sendiri lewat aplikasi.
- **"Seberapa yakin hasilnya benar?"** 3.089 pengujian otomatis lulus, 0 gagal. Tetapi jalur login Google asli belum diuji penuh, dan beberapa perilaku akun menunggu atau ditolak baru dibaca dari kode, belum dicoba saat aplikasi berjalan.
