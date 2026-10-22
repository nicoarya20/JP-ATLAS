# Uji pengguna gabungan — semua menu Simple PM

Dokumen tunggal untuk **semua pengujian yang dilakukan manusia** (bukan tes otomatis). Dikumpulkan dari `rencana/P3`–`P10`, `uji-pengguna/demo-s1.md`, `putaran-1-skrip.md`, `qa-s1.md`, `qa-s2.md`, dan `uat/UAT-S0A.md`.

**Cara pakai:** pembangunan menu jalan terus tanpa menunggu pengujian. Pengujian dijalankan sekali di akhir (atau per menu yang sudah selesai). Centang kolom **Hasil** (`✔` lulus, `✘` gagal + catatan, `–` belum bisa diuji karena menu belum ada).

> Tes otomatis (bun test, smoke) tetap jalan di setiap pekerjaan dan **tidak** diulang di sini. Dokumen ini hanya memuat yang butuh mata dan tangan manusia, atau penguji nyata.

## 0. Persiapan

| Hal | Isi |
|---|---|
| Data | `bun scripts/seed-dev.ts atlas` (proyek Atlas) dan `SEED_ALLOW=1 bun scripts/seed-dev.ts uji` (Renovasi Dapur + `Penguji-1..5 (dummy)`). Hanya DB dev. |
| Akun/persona | **Nico** = Project Manager · **Rina** = Pengelola proyek · **Dodi** = Member (Anggota) · **Sri** = Pemantau · **Admin** · **Super-admin**. Satu orang bisa memakai beberapa akun lewat jendela privat. |
| Login | Hanya Google (produksi). UAT login Google asli masih terbuka (§10). |
| Perangkat | Laptop 1280 px, tablet 768 px, ponsel 375 px. |
| Ukuran teks | Ulangi bagian bertanda 🔠 pada **3 ukuran**: Normal (1), Besar (1,25), Sangat besar (1,5) di Pengaturan. |

Status menu per 18 Okt 2026: **Proyek, Tugas, Pengaturan dasar, Sampah proyek = sudah dibangun (S1–S2)**. **Beranda, Inbox, Event, Tim, Sampah penuh, Pengaturan lanjutan, Periksa/Papan/Tahapan = belum** (rencana P4–P10). Bagian menu yang belum ada ditandai ⏳.

---

## 1. Menu Proyek (`/app/projects`) — sudah ada

### 1.1 Matriks izin yang harus terbukti

| Aksi | Super-admin / Admin | PM (Pengelola proyek itu) | Member-Pengelola | Anggota | Pemantau | Bukan anggota |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Lihat daftar/detail | semua | proyek yang diikuti (PM: semua, hanya baca bila bukan anggota) | ikuti | ikuti | ikuti | **404** (sama dengan id acak) |
| Buat proyek | ✔ | ✔ | – | – | – | Member: halaman 403 "Hanya Admin dan Project Manager…" |
| Ubah info + status | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ (PM bukan anggota: hanya baca) |
| Kelola anggota | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ |
| Hapus proyek (ke Sampah) | ✔ | ✔ | **✘ tombol tidak tampil** | ✘ | ✘ | ✘ |

### 1.2 Langkah uji

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| P-01 | Nico buka **Proyek** | Atlas tampil, kondisi ikon + teks (progres 17%), tombol **+ Proyek baru** | |
| P-02 | Dodi buka **Proyek** | Hanya proyek yang ia ikuti, **tanpa** tombol buat; Member tanpa proyek melihat pesan kosong yang informatif | |
| P-03 | **Create:** Nico buat "Renovasi Dapur" (Berjalan, tenggat tombol cepat 3 bln, Rina Pengelola, Dodi Anggota, Sri Pemantau) | Selesai < 60 dtk; detail: "Belum ada tugas", kondisi Lancar | |
| P-04 | Buat proyek dengan nama kosong | Pesan error jelas, tombol Simpan ber-`loading`, data tidak hilang | |
| P-05 | **Detail:** buka tab Ringkasan · Tugas · Anggota | Progres vs waktu berjalan, hitungan terlambat, kartu tugas penting | |
| P-06 | **Edit:** Rina ubah nama, prioritas, tanggal, status | Tersimpan, notifikasi sukses, tampil di daftar | |
| P-07 | Dodi (Anggota) coba buka halaman ubah | Tidak ada menu Ubah / halaman ditolak | |
| P-08 | Tab Anggota: tambah, ubah peran, keluarkan | Dialog konfirmasi menyebut dampak; anggota yang dikeluarkan kehilangan akses | |
| P-09 | Turunkan/keluarkan Pengelola terakhir | **Ditolak** dengan alasan "Proyek harus punya minimal satu pengelola…" | |
| P-10 | Keluarkan Pengelola utama | Ditolak | |
| P-11 | **Akses:** Dodi buka URL proyek yang bukan miliknya | "Tidak ditemukan" (bukan "dilarang") | |
| P-12 | Nico buka proyek Sinar (bukan anggota) | Hanya baca, ada catatan "Anda hanya bisa melihat proyek ini." | |
| P-13 | **Delete:** Nico pilih ⋯ → **Hapus proyek** | Dialog menyebut jumlah tugas ikut terhapus; setelah konfirmasi proyek hilang dan muncul tombol **Urungkan** | |
| P-14 | Klik **Urungkan** (atau pulihkan dari Sampah) | Proyek + tugasnya kembali | |
| P-15 | Member-Pengelola buka ⋯ | **Tidak ada** "Hapus proyek" | |
| P-16 | Tablet/ponsel: daftar proyek | Kartu di mobile, tidak ada gulir horizontal; tampilan Gantt/daftar terbaca 🔠 | |

---

## 2. Menu Tugas (`/app/tasks`) — sudah ada

> **Catatan hapus tugas:** di S2 *sengaja tidak ada* tombol hapus tugas (Sampah baru lengkap di S6). Hapus tugas = ⏳ bagian 7. Yang ada sekarang: **Batalkan** (dengan alasan) dan **Buka lagi**.

### 2.1 Matriks izin

Sumber: `server/access/task.policy.ts` dan `task-flow.policy.ts` (feature/project-management), dengan pengaturan bawaan `rules.ts` (`T_A2_MEMBER_EDIT_SCOPE='own'`, `P_A1B_PM_NON_MEMBER_COMMENTS=false`). "Pengelola" mencakup Admin dan Pengelola proyek itu. "PM bukan anggota" = akun PM yang tidak tergabung di proyek.

| Aksi | Admin / Pengelola proyek | Anggota | Pemantau | PM bukan anggota | Bukan anggota (Member) |
|---|:-:|:-:|:-:|:-:|:-:|
| Lihat detail | ✔ | ✔ | ✔ | ✔ (hanya baca) | **404** |
| Buat tugas | ✔ | ✔ | **✘** `NOT_MEMBER` (tombol tidak ada; URL langsung ⇒ 403 "Anda hanya bisa melihat proyek ini") | ✘ `NOT_MEMBER` | **404** |
| Ubah isi, daftar periksa, penanggung jawab | ✔ semua tugas | **hanya tugas yang ia buat atau ditugaskan padanya** (lainnya `NOT_OWNER`) | ✘ | ✘ | 404 |
| Mulai / Batal mulai / Selesai | ✔ | tugas miliknya **atau tugas yang belum punya penanggung jawab** (ia otomatis jadi penanggung jawab) | ✘ | ✘ | 404 |
| Buka lagi (setelah selesai, alasan 3–200 karakter) | ✔ | pembuat atau penanggung jawab | ✘ | ✘ | 404 |
| Batalkan / Pulihkan (batalkan) | ✔ | **hanya pembuat tugas** | ✘ | ✘ | 404 |
| Komentar | ✔ | ✔ | ✔ | **✘** (baca saja, tanpa kotak komentar) | 404 |
| Tugas di proyek Sampah / tugas terhapus | semua aksi ditolak (`PROJECT_IN_TRASH` / `WRONG_STATE`); hanya Pulihkan | | | | |

Catatan: proyek berstatus Selesai, Ditunda, atau Dibatalkan **tetap menerima tugas baru** (Q12). Tombol "Minta diperiksa" tidak ada di MVP (menunggu S4).

### 2.2 Langkah uji

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| T-01 | **Create:** Dodi **+ Tugas baru** — Proyek, Judul, tenggat besok | Tugas muncul di "Tugas saya" kelompok yang benar; bawaan "yang mengerjakan" = dirinya | |
| T-02 | "Tampilkan lebih banyak": deskripsi, jenis, tanggal mulai, langkah awal | Tersimpan semua | |
| T-03 | Sri (Pemantau) buka form tugas baru | Tombol tidak ada; via URL ⇒ halaman 403 jelas | |
| T-04 | **Daftar:** toggle Tugas saya/Semua tugas, cari, chip status, saringan Proyek·Orang·Prioritas | Kelompok Terlambat/Hari ini/Besok/Minggu ini/Nanti/Tanpa tenggat dengan hitungan benar | |
| T-05 | Daftar kosong | Pesan + tombol tambah (bukan layar kosong) | |
| T-06 | **Detail:** buka tugas | Header, "langkah berikutnya", daftar periksa, komentar, riwayat | |
| T-07 | **Edit:** ubah judul, tenggat, prioritas, penanggung jawab | Tersimpan, riwayat mencatat | |
| T-07b | Dodi coba ubah / batalkan tugas yang dibuat dan dikerjakan orang lain | Tombol tidak tersedia atau ditolak ("bukan milik Anda"); Rina (Pengelola) bisa | |
| T-07c | Dodi mulai tugas yang belum punya penanggung jawab | Berhasil dan Dodi otomatis jadi penanggung jawab | |
| T-08 | Mulai → centang langkah → Selesai | Status berubah, progres "2/3", progres proyek naik | |
| T-09 | **Batalkan** dengan alasan (kategori "lainnya" wajib catatan), lalu **Pulihkan** | Alasan wajib; hanya pembuat atau Pengelola yang bisa | |
| T-09b | **Buka lagi** tugas selesai dengan alasan < 3 karakter | Ditolak, pesan alasan wajib | |
| T-10 | Komentar: tulis, ubah, hapus komentar sendiri | Tampil di linimasa; HTML tidak dieksekusi | |
| T-11 | Dua tab: ubah tugas yang sama di keduanya | Tidak diam-diam menimpa (konflik ditangani/pesan jelas) | |
| T-12 | 🔠 Detail tugas pada 3 ukuran teks di 375 px | Tombol & teks tidak terpotong, tidak ada gulir horizontal | |
| T-13 | **Delete tugas** ⏳ | Lihat §7 (menunggu S6) | – |

---

## 3. Menu Inbox ⏳ (rencana P5)

| Aturan role | Perilaku |
|---|---|
| Semua role login punya Inbox sendiri | Pengguna A **tidak** bisa melihat/menandai kartu pengguna B |
| Admin | Kartu tambahan "Pengguna baru menunggu persetujuan" (opsional I14) |
| Pemantau | Hanya kabar (tidak ada kartu "perlu ditanggapi" untuk menulis) |

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| I-01 | Nico menugaskan tugas ke Dodi | Lonceng Dodi berubah ≤ 70 dtk (tab lain), badge menu = angka lonceng | |
| I-02 | Dodi buka **Inbox → Perlu Anda tanggapi (N)** | Kartu "Dodi menunjuk Anda mengerjakan #…", satu tombol **Lihat tugas** | |
| I-03 | Dodi mulai/selesaikan tugas itu | Kartu hilang sendiri (tanpa tombol tutup) | |
| I-04 | Tab **Kabar terbaru** | Kelompok Hari ini/Kemarin/Lebih lama; titik = belum dibaca; komentar berulang dibundel | |
| I-05 | **Tandai semua dibaca** | Titik hilang + notifikasi sukses | |
| I-06 | Keluarkan Dodi dari proyek | Kartu proyek itu hilang; tidak bocor judul | |
| I-07 | Inbox kosong (kedua tab) | Teks "Semua beres" / "Belum ada kabar" + ikon | |
| I-08 | Gagal muat (matikan jaringan) | Kartu "Inbox belum bisa dimuat" + **Muat ulang** | |
| I-09 | 🔠 Ponsel 375 px: lonceng bisa diketuk, kartu satu kolom | Tanpa overflow | |
| I-10 | Pemberitahuan dimatikan di Pengaturan (⏳ P9) | Kabar berhenti, "perlu ditanggapi" tetap ada | |

---

## 4. Menu Event ⏳ (rencana P6)

### 4.1 Matriks izin

| Aksi | Admin | Pembuat acara | Pengelola proyek | Anggota proyek | Pemantau | Peserta saja |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Buat acara (di proyek) | ✔ | – | ✔ | ✔ | **✘ 403** | – |
| Buat acara pribadi (tanpa proyek) | ✔ semua role bertipe pengguna | | | | | |
| Lihat detail | ✔ | ✔ | ✔ | jika peserta/proyek | jika peserta | ✔ |
| Ubah / batalkan / hapus / kelola peserta | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ |
| Tulis notulensi | ✔ | ✔ | ✔ | ✘ | ✘ | ✔ (peserta) |

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| E-01 | **Create:** Dodi **+ Acara baru** | Layar awal **tepat 4 isian** (judul, tanggal, jam mulai, jam selesai); Simpan langsung bisa | |
| E-02 | Tahap 2 "Tambahkan rincian" (jenis, proyek, peserta, tempat/tautan, agenda) | Boleh dilewati; pilihan proyek hanya proyek yang diikuti | |
| E-03 | Jam selesai ≤ jam mulai | Pesan error jelas | |
| E-04 | Sri (Pemantau) buat acara di proyeknya | Ditolak (tombol tidak ada / 403) | |
| E-05 | **Daftar:** tab Akan datang/Sudah lewat, cari, saring jenis & proyek | Kelompok Hari ini/Besok/Minggu ini/Nanti; "Tampilkan lebih banyak" | |
| E-06 | **Detail:** peserta (nama + jabatan saja), tombol **Buka tautan rapat** | Tampil benar | |
| E-07 | **Edit:** ubah jam/tempat/peserta | Peserta dapat kabar "acara berubah" di Inbox | |
| E-08 | **Notulensi:** ketik → Simpan → **Tandai final** | Draf → Dikonfirmasi; dua orang menyunting bersamaan → pesan konflik, tidak menimpa | |
| E-09 | **Batalkan acara** | Alasan wajib; banner dibatalkan; kartu pengingat hilang | |
| E-10 | **Delete:** Hapus | Langsung hilang + toast **Urungkan** ±10 dtk memulihkan; masuk Sampah | |
| E-11 | Pengingat: acara 1 hari & 30 menit lagi | Kartu di Inbox sekali saja (tidak ganda) | |
| E-12 | Beranda: widget **Agenda** (hari ini + besok, maks 4) | Kosong: "Tidak ada acara hari ini atau besok." | |
| E-13 | 🔠 Form & detail di 375 px | Tidak ada overflow; skala 1,5 aman | |

---

## 5. Menu Tim ⏳ (rencana P7)

**Aturan privasi (inti pengujian):** angka beban (Aktif/Terlambat) orang lain hanya terlihat oleh **Pengelola proyek itu** dan **Admin**; setiap orang melihat bebannya sendiri.

| Pengamat → target | Melihat |
|---|---|
| Member/Pemantau/PM-Member → Member lain | nama, peran, proyek bersama, **tanpa angka** |
| Pengelola proyek X → anggota X | angka beban **hanya dari proyek X** |
| Pengelola X → anggota yang juga di proyek Y | hanya "juga mengerjakan proyek lain", tanpa angka |
| Admin | semua |
| Siapa pun → dirinya | beban sendiri |
| Orang yang tidak berbagi proyek | **404** di halaman detail |

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| M-01 | Nico (Pengelola) buka **Tim** | Kartu anggota dengan Aktif/Terlambat (ikon + teks), filter proyek, cari, urut "Terlambat terbanyak" | |
| M-02 | Dodi (Member) buka **Tim** | Rekan tampil **tanpa** angka; teks "Jumlah tugas orang lain hanya terlihat oleh Pengelola proyek dan Admin." | |
| M-03 | Sri (Pemantau) buka **Tim** | Sama seperti Member (tanpa angka) | |
| M-04 | Admin buka **Tim** | Semua orang + angka | |
| M-05 | Detail orang: Pengelola buka | Proyek bersama, tugas aktif (maks 20, terlambat dulu); HP **hanya** diri sendiri/Admin | |
| M-06 | Member buka detail orang yang tidak sebersama | 404 | |
| M-07 | Pengelola tunggal coba **hapus akun** (A7) | Ditolak, pesan menyebut nama proyek; setelah menunjuk pengelola lain berhasil | |
| M-08 | Empty state Member tanpa proyek | Pesan informatif | |
| M-09 | 🔠 375 px: kartu satu kolom | Tanpa overflow | |

---

## 6. Beranda ⏳ (rencana P4)

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| B-01 | Dodi dengan 7 tugas aktif | **Fokus**: 5 tugas urut tenggat + "Lihat semua (7)" | |
| B-02 | "Tandai selesai" di kartu Fokus | Sekilas berkurang, Selesai minggu ini bertambah, tanpa muat ulang | |
| B-03 | PM: **Proyek saya** | Kondisi sama persis dengan halaman Proyek | |
| B-04 | Admin: kartu "N pengguna menunggu persetujuan" | N sama dengan badge `/dashboard/users`; tautan jalan | |
| B-05 | Member tanpa proyek | Kartu panduan, tanpa tombol buat tugas | |
| B-06 | Satu bagian gagal dimuat | Kartu "belum bisa dimuat", halaman tetap utuh | |
| B-07 | 🔠 375 px tiga skala | Tidak terpotong | |

---

## 7. Menu Sampah (lengkap) ⏳ (rencana P8)

| Aksi | Siapa |
|---|---|
| Pulihkan item | pemilik/pengelola sesuai kebijakan |
| **Hapus permanen** | **Hanya Admin** (PM ⇒ 403) |

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| Z-01 | **Delete tugas:** hapus dari detail/daftar | **Tanpa dialog**, toast **Urungkan** ±10 dtk; klik Urungkan memulihkan | |
| Z-02 | Hapus proyek berisi 5 tugas → Pulihkan | Kelimanya kembali; tugas yang dihapus *lebih dulu* tidak ikut pulih | |
| Z-03 | Penyaring jenis (Proyek/Tugas/Acara) | Daftar benar, kosong ⇒ pesan informatif | |
| Z-04 | PM coba **Hapus permanen** | Tombol tidak ada / 403 | |
| Z-05 | Admin **Hapus permanen** | Dialog ketik nama (T3); item hilang dan tak bisa dipulihkan | |
| Z-06 | Teks "dihapus otomatis setelah 30 hari" | Tampil hanya bila purge otomatis aktif | |

---

## 8. Pengaturan (`/app/settings`) — dasar sudah ada, lanjutan ⏳ (P9)

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| S-01 | Dodi ubah profil (nama, jabatan, HP) | Tersimpan; terlihat di Tim sesuai aturan | |
| S-02 | Ubah **Ukuran teks** ke Sangat besar | Seluruh layar, modal, notifikasi membesar; bertahan setelah muat ulang & di perangkat lain; sidebar jadi laci | |
| S-03 | `/profile` | Dialihkan ke `/app/settings` | |
| S-04 ⏳ | Hapus akun (T3, ketik email) bila bukan pengelola tunggal | Berhasil, sesi berakhir, proyek tetap ada | |
| S-05 ⏳ | Saklar Pemberitahuan | Tersimpan setelah muat ulang; "perlu ditanggapi" tidak bisa dimatikan | |
| S-06 ⏳ | Admin: pengaturan tim (pengingat acara bawaan) | Hanya Admin; Member/PM ⇒ 403; tidak mengubah acara yang sudah ada | |
| S-07 | 🔠 Halaman pada skala 1,5 di 375 px | Tombol ≥ 44 px, tanpa overflow | |

---

## 9. Tugas lanjutan ⏳ (rencana P10, S4–S5)

| # | Langkah | Yang harus terjadi | Hasil |
|---|---|---|---|
| L-01 | Dodi **Minta diperiksa** → Sari terima kartu → **Kembalikan** (alasan) → Dodi perbaiki → **Setujui** | Alur lengkap, riwayat putaran tercatat; pengerja Admin tidak bisa memeriksa sendiri | |
| L-02 | Tugas bergantung tugas lain; selesaikan penghalang | Penerus dapat kartu "Giliran Anda"; siklus ditolak | |
| L-03 | Tag: buat tag beda huruf besar/kecil | Nama unik tanpa beda huruf | |
| L-04 | **Papan**: pindahkan kartu lewat "Pindahkan ke…" | Hanya tujuan sah yang tersedia | |
| L-05 | Mention `@nama` di komentar | Orang itu dapat kabar | |
| L-06 | PM buat 3 fase + 2 milestone, satu terlewat | Proyek "Perlu perhatian" dengan satu kalimat alasan | |
| L-07 | **Perpanjang tenggat** | Lencana "Diperpanjang ×1" | |
| L-08 | Unggah JPEG/PNG sebagai bukti; coba berkas SVG/HTML | Gambar sah diterima; SVG/HTML ditolak | |
| L-09 | Non-anggota membuka tautan unduh | 404 | |

---

## 10. Lintas menu (wajib dicek sekali per rilis)

| # | Pemeriksaan | Hasil |
|---|---|---|
| X-01 | 🔠 Matriks tampilan: **3 ukuran teks × 375/768/1280 px** untuk tiap menu — tidak ada teks terpotong, tombol tetap bisa diketuk (≥ 44 px), tanpa gulir horizontal (isi sel `qa-s1.md` §2 dan `qa-s2.md`) | |
| X-02 | Setiap aksi async menampilkan `loading` lalu notifikasi sukses/gagal yang bisa dipahami | |
| X-03 | Setiap tabel/daftar kosong menampilkan pesan, bukan layar kosong | |
| X-04 | Setiap aksi destruktif: hapus ke Sampah = Urungkan tanpa dialog; lainnya dialog (T2); hapus permanen/akun = ketik nama (T3) | |
| X-05 | Role bertukar: `member` → `project_manager` → `admin` → `super-admin` melihat menu & tombol sesuai matriks bagian 1–8 | |
| X-06 | Login Google asli (UAT-S0A): akun baru ⇒ menunggu persetujuan `/waiting`; setelah disetujui masuk `/app`; akun ditolak ⇒ layar ditolak | |
| X-07 | Admin menyetujui/menolak akun di `/dashboard/users`; badge antrean di menu super-admin turun seketika | |
| X-08 | Peninjau kedua keamanan S0.a (`uat/REVIEW-KEAMANAN-S0A.md`) — butuh orang kedua | |

---

## 11. Uji pengguna nyata (penguji ≥ 50 tahun) — gerbang S2 dan S3

Ini satu-satunya bagian yang **tidak bisa digantikan** AI atau data dummy. Detail skrip fasilitator dan lembar catat ada di `putaran-1-skrip.md` dan `putaran-1-lembar-catat.md`; di sini ringkasannya.

**Syarat:** ≥ 3 dari 5 penguji **sungguhan**, usia ≥ 50, tanpa bantuan. Sesi 45 menit, data fiktif, fasilitator hanya boleh mengulang kalimat tugas.

| # | Dibacakan | Batas | Inti | Menu |
|---|---|---|:-:|---|
| T0 | "Kalau tulisan di layar ini kurang nyaman dibaca, atur sampai nyaman." | 90 dtk | – | Pengaturan |
| T1 | "Cari tugas Anda yang harus selesai hari ini." | 60 dtk | ✔ | Tugas |
| T2 | "Mulai kerjakan tugas itu, lalu centang satu langkahnya." | 90 dtk | ✔ | Tugas |
| T3 | "Tulis catatan 'Sudah saya cek' pada tugas itu." | 60 dtk | – | Tugas |
| T4 | "Tambahkan tugas baru 'Beli cat dapur' untuk Anda sendiri, tenggatnya besok." | 120 dtk | ✔ | Tugas |
| T5 | "Tugas 'Beli cat dapur' sudah beres. Tandai selesai." | 60 dtk | ✔ | Tugas |
| T6 | "Tugas lain ini tidak jadi dikerjakan. Batalkan dan tulis alasannya." | 90 dtk | – | Tugas |
| T7 | "Lihat seberapa jauh proyek Renovasi Dapur." | 60 dtk | – | Proyek |

**Tugas tambahan untuk putaran berikutnya** (ditambahkan saat menu terkait selesai; diusulkan, belum dibakukan di rencana):

| # | Dibacakan | Menu | Kriteria |
|---|---|---|---|
| U-B | "Dari halaman awal, tunjukkan tugas yang harus Anda kerjakan dulu." | Beranda ⏳ | ≤ 10 detik (gerbang S3) |
| U-I | "Ada kabar baru buat Anda. Cari dan buka." | Inbox ⏳ | menemukan lonceng/Inbox tanpa bantuan |
| U-E | "Buat rapat besok jam 9 sampai jam 10 bernama 'Rapat dapur'." | Event ⏳ | selesai dari layar awal 4 isian |
| U-P | "Buat proyek baru 'Renovasi Kamar' dan tambahkan Dodi sebagai anggota." | Proyek (khusus PM) | < 3 menit |
| U-H | "Hapus tugas ini, lalu batalkan penghapusannya." | Sampah ⏳ | menemukan Urungkan |

**Gagal** bila penguji meminta bantuan, menyerah, atau melewati 3× batas wajar. Gagal gerbang ⇒ perbaikan ≤ 3 hari, ulang dengan ≥ 2 penguji baru; S3 tidak dimulai.

**Menunggu keputusan user:** nama penguji UP-1 (belum ada), demo S1 (CP3), dan 10 keputusan rencana S3+.

---

## 12. Ringkasan: apa yang sudah bisa diuji sekarang

| Bagian | Bisa diuji sekarang? |
|---|---|
| 1 Proyek | ✔ (kecuali sebagian P-13/P-14 bergantung Sampah proyek, sudah ada) |
| 2 Tugas | ✔ (hapus tugas ⏳) |
| 8 Pengaturan | sebagian (S-01–S-03, S-07) |
| 10 Lintas menu | X-01–X-07 ✔; X-08 butuh orang lain |
| 11 Uji pengguna nyata | ✔ T0–T7, menunggu penguji |
| 3, 4, 5, 6, 7, 9 | ⏳ menunggu menu dibangun |
