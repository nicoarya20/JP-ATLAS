> **Dokumen turunan** (dibangkitkan agen pembaca, 16 Okt 2026). Inventaris layar dan catatan wireframe Penpot (file PM-New, halaman WIREFRAME NICO dan halaman pendamping). Dibaca 16 Okt 2026, hanya baca. ID `SCR-*`, `NOTE-*`, `AT-*`, `G-*` dibuat oleh agen pembaca, bukan bagian dari Penpot.
> Jangan disunting tangan; bila kode, keputusan, atau wireframe berubah, bangkitkan ulang (lihat `README.md` folder ini). Dokumen ini dikecualikan dari batas ukuran berkas karena berupa data turunan.

# Inventaris Layar dan Alur — Penpot "PM-New" (hanya baca)

## 1. Ringkasan dan cara membaca

- Sumber: file Penpot `PM-New`, dibaca lewat API (`characters`, koordinat, nama). Tidak ada yang diubah. Satu ekspor gambar yang dicoba terbaca kosong, jadi SEMUA isi di sini berasal dari teks, koordinat, dan nama path, bukan dari gambar.
- Halaman: `WIREFRAME NICO` (utama), `WIREFRAME & ERD KEANO`, `WIREFRAME MOBILE KEANO`, `ERD NICO`; `diagram flow` dan `Page 2` KOSONG (0 elemen).
- Tanggal "hari ini" dalam contoh BERBEDA antar board (lihat bagian 9). Contoh: 02 dan 03 memakai Rabu 7 Okt 2026, 04 memakai Kamis 8 Okt, 01 ④ memakai Selasa 6 Okt.
- Penanda: `[tertulis]` = teks di Penpot menyebut persis; `[tersirat]` = kesimpulan saya dari tata letak atau konteks.
- Skema ID (buatan saya): `SCR-<MENU>-<nn>`, `nn` = nomor berlingkar sub-board (① = 01), huruf `b/c` untuk ①b dst. `NOTE-<MENU>-<nn>` = board "catatan · …".
- Menu: AKUN (login, 01 Login/Registrasi), BERANDA, PROYEK, TUGAS, PENGGUNA (khusus Admin), EVENTS, INBOX, TIM, SAMPAH, PENGATURAN.
- Tokoh contoh: Nico = PM (Lead Proyek Atlas), Dodi = Member, Ayu = Admin; Rina, Sri (Pemantau), Lea.
- Jumlah: 62 layar (59 dasar + 3 varian Beranda per peran; ditambah 1 layar yang hanya ada di mobile Keano), 29 board catatan dasar (+ varian per peran), 21 butir ATURAN-TERTULIS (AT-01..AT-22, tanpa AT-17; tiap butir bisa memuat beberapa aturan) selain NOTE-*.
- Struktur board peran: `A · Member`, `B · Project Manager`, `C · Admin` = salinan menu 01 Login, 02 Proyek, 03 Tugas yang sudah disesuaikan peran + menu baru Beranda, Events, Inbox, Tim, Sampah, Pengaturan. Hanya C punya `① Persetujuan user` dan `② Kelola peran`.
- Sidebar (semua layar): Beranda, Inbox, Proyek, Tugas, Events, Tim, Sampah, Pengaturan; Admin ditambah `Pengguna` (lencana 2) di layar Admin kecuali salinan Admin · Proyek/Tugas/Login (G-07). Bilah atas: logo `[Nama PM]`, `Cari…`, 🎤, avatar, `Huruf A`, lencana `Peran: …`.

## 2. Tabel layar SCR-*

Kolom "peran" = peran yang menjadi pelaku/contoh di layar. "Sumber board" = nama board (WIREFRAME NICO kecuali disebut).

### AKUN (01 · Login, Registrasi & Beranda)
| ID | Judul | Peran | Sumber board |
|---|---|---|---|
| SCR-AKUN-01 | ① Login | semua (belum login) | 01 · ① Login; salinan di A/B/C "· Login & Registrasi" |
| SCR-AKUN-02 | ② Pilih Akun Google (layar milik Google) | semua | 01 · ② ; contoh akun Nico (01, B), Dodi (A), Ayu (C) |
| SCR-AKUN-03 | ③ Profil · Menunggu Persetujuan | user baru/pending | 01 · ③ |
| SCR-AKUN-04 | ④ Beranda (rujukan ke Beranda) | semua | 01 · ④ ; di A/B/C hanya kotak penunjuk "Beranda Member/Project Manager/Admin" |
| (SCR-AKUN-05) | ⑤ Login · Akses ditolak | user ditolak/nonaktif | HANYA di WIREFRAME MOBILE KEANO (Admin mobile). Tidak ada di desktop NICO (G-03) |

### BERANDA (04 · Beranda)
| ID | Judul | Peran | Sumber |
|---|---|---|---|
| SCR-BERANDA-01 | ① Beranda · Bersama tim (anggota 2 orang atau lebih) | Nico (contoh PM) | 04 · ① |
| SCR-BERANDA-01M | Beranda Member | Dodi | A · Beranda · Member |
| SCR-BERANDA-01P | Beranda Project Manager | Nico | B · Beranda · Project Manager |
| SCR-BERANDA-01A | Beranda Admin | Ayu | C · Beranda · Admin |

### PROYEK (02 · Proyek)
| ID | Judul | Peran | Sumber |
|---|---|---|---|
| SCR-PROYEK-01 | ① Semua proyek (Admin / PM); Member: "1–3 dari 3 proyek · hanya proyek yang Anda ikuti" | Admin, PM, Member | 02 ① ; A/B/C |
| SCR-PROYEK-02 | ② Semua proyek kosong (Member) | Member (PM/Admin: "Tidak tersedia", lihat 7) | 02 ② |
| SCR-PROYEK-03 | ③ Proyek baru · pilih cara | Admin, PM (Member: "Tidak tersedia untuk Member") | 02 ③ |
| SCR-PROYEK-04 | ④ Form proyek | Admin, PM | 02 ④ |
| SCR-PROYEK-05 | ⑤ Ceritakan proyeknya ✦ (AI) | Admin, PM | 02 ⑤ |
| SCR-PROYEK-06 | ⑥ Periksa draf dari AI | Admin, PM | 02 ⑥ |
| SCR-PROYEK-07 | ⑦ Pakai template | Admin, PM | 02 ⑦ |
| SCR-PROYEK-08 | ⑧ Detail · Ringkasan (contoh Proyek Atlas) | semua yang melihat proyek | 02 ⑧ |
| SCR-PROYEK-09 | ⑨ Detail · Tugas | idem | 02 ⑨ |
| SCR-PROYEK-10 | ⑩ Detail · Tahapan | idem | 02 ⑩ |
| SCR-PROYEK-11 | ⑪ Detail · Anggota | idem | 02 ⑪ |
| SCR-PROYEK-12 | ⑫ Modal · Perpanjang tenggat (di atas ⑧) | Admin, Pengelola proyek | 02 ⑫ |

### TUGAS (03 · Tugas)
| ID | Judul | Peran | Sumber |
|---|---|---|---|
| SCR-TUGAS-01 | ① Tugas saya (List) | semua (Admin: versi sendiri) | 03 ① |
| SCR-TUGAS-02 | ② Semua tugas (List, Proyek Atlas) | semua | 03 ② |
| SCR-TUGAS-03 | ③ Papan | semua | 03 ③ |
| SCR-TUGAS-04 | ④ Tugas saya kosong | semua | 03 ④ |
| SCR-TUGAS-05 | ⑤ Tugas baru · Tulis saja ✦ (AI) | semua kecuali Pemantau | 03 ⑤ |
| SCR-TUGAS-06 | ⑥ Tugas baru · Isi form | idem | 03 ⑥ |
| SCR-TUGAS-07 | ⑦ Impor CSV | Admin, Pengelola, Anggota | 03 ⑦ |
| SCR-TUGAS-08 | ⑧ Detail · Belum dikerjakan (#14) | semua | 03 ⑧ |
| SCR-TUGAS-09 | ⑨ Detail · Sedang dikerjakan (#12) | semua | 03 ⑨ |
| SCR-TUGAS-10 | ⑩ Detail · Menunggu diperiksa (#17) | semua | 03 ⑩ |
| SCR-TUGAS-11 | ⑪ Modal Kembalikan + Modal Batalkan (dua modal dalam satu board) | Pengelola/Admin (Kembalikan); pembuat (Batalkan) | 03 ⑪ |
| SCR-TUGAS-12 | ⑫ Pengaturan proyek · Periksa, Jenis tugas & Tag | Admin, Pengelola | 03 ⑫ |

### PENGGUNA (hanya Admin; board C)
| ID | Judul | Sumber |
|---|---|---|
| SCR-PENGGUNA-01 | ① Persetujuan user | C · ① Persetujuan user |
| SCR-PENGGUNA-02 | ② Kelola peran | C · ② Kelola peran |

### EVENTS (05; modul di luar MVP?)
SCR-EVENTS-01 ① Daftar · -01b ①b Filter ▾ · -02 ② Kalender · -03a ③a Event baru (ringkas) · -03b ③b Event baru (detail) · -04 ④ Detail · Akan datang · -04b ④b Mode rekam siap · -04c ④c Sedang merekam · -05a ⑤a Rekaman selesai · -05b ⑤b Periksa teksnya · -06 ⑥ Tugas dari rapat · -07 ⑦ Hasil dikonfirmasi · -08 ⑧ Modal Batalkan event + Hapus (PM, Admin) · -08b ⑧b Hapus/Batalkan event berulang · -09 ⑨ Kosong (hanya Member). Sumber: A/B/C · Events.

### INBOX (06), TIM (07), SAMPAH (08), PENGATURAN (09)
SCR-INBOX-01 ① Perlu Anda tanggapi (default) · -02 ② Kabar terbaru · -03 ③ Kosong (semua beres).
SCR-TIM-01 ① Daftar (default) · -02 ② Detail orang (Rina) · -03 ③ Kosong (belum ada proyek) (hanya Member).
SCR-SAMPAH-01 ① Daftar (default) · -02 ② Kosong · -03 ③ Setelah menghapus: pesan Urungkan (isinya berupa layar Events + toast) · -04 ④ Hapus permanen (khusus Admin).
SCR-PENGATURAN-01 ① Pengaturan (halaman di-scroll) · -02 ② Ubah profil · -03 ③ Ajukan cuti (Member, PM) / Atur cuti (Admin) · -04 ④ Keadaan cuti (Admin: 2 keadaan; Member/PM: 4 keadaan).

## 3. Aksi per layar

Format: `label persis` (jenis) → tujuan/akibat bila terbaca.

### SCR-AKUN-01 Login
`Masuk dengan Google` (tombol utama, ikon G) → SCR-AKUN-02 [tertulis]. `Bantuan` dan `Kebijakan Privasi` (tautan teks) → tujuan tidak tertulis. Teks: "Kelola proyek tim dengan mudah", "ILUSTRASI / GAMBAR" (placeholder), "Belum punya akun? Cukup masuk dengan Google. Akun baru perlu disetujui admin sebelum bisa dipakai."
### SCR-AKUN-02 Pilih Akun Google
Daftar akun: `Nico nico@email.com`, `Nico (kantor) nama@kantor.co.id`, `+ Gunakan akun lain` (di C: Ayu; di A: Dodi). Catatan: "Layar milik Google, bukan buatan kita. Ditampilkan untuk menjelaskan alur." Tidak ada tombol Batal/Kembali.
### SCR-AKUN-03 Profil · Menunggu Persetujuan
`Keluar` (tautan), lencana `Menunggu`, `Ganti foto`; isian Nama lengkap *, Email (dari Google, tidak bisa diubah), Nama panggilan, No. HP, Jabatan, Divisi; Ukuran teks `Normal | Besar | Sangat besar`; `Cek status` (sekunder), `Simpan profil` (utama). Teks: "Akun Anda menunggu persetujuan admin", "Anda bisa membuka Beranda setelah admin menyetujui. Sambil menunggu, lengkapi profil di bawah.", "Belum ada menu lain sebelum akun disetujui admin." Tujuan `Cek status`, `Simpan profil` tidak tertulis.
### SCR-AKUN-04 Beranda (di 01)
Versi ringkas Beranda; di A/B/C diganti kotak "Setelah masuk dan disetujui, <Nama> (<peran>) diarahkan ke Beranda <peran>."
### SCR-BERANDA-01 Beranda
Bilah atas: pencarian, 🎤, `Huruf A`. Header: `🎤 Ucapkan tugas`, `+ Tugas baru` (utama). Sapaan "Kamis, 8 Oktober 2026 · Selamat pagi, Nico". Panel:
- A · Daily Briefing: `🔊 Bacakan`; tiga kartu angka klik-able `Unassigned 3`, `In Progress 8`, `Completed 12`.
- B · My Focus: kelompok `⚠ TERLAMBAT`, `🕑 HARI INI`, `MINGGU INI`; `Selesai` per baris; `Lihat semua tugas (9)`.
- C · ✦ Ask Data: kolom tanya, 🎤, `Tanya`, tiga saran pertanyaan dan contoh jawaban.
- D · Agenda & Projects: agenda hari ini (⚠ Belum siap), "Proyek saya" `Lihat semua` (Hajatan Keluarga 40% ⚠ Perlu perhatian; Renovasi Dapur 70% ✓ Aman; Arisan RT 90% ✓ Aman).
- Bawah: "Tasks Completed This Week" `Lihat semua`, "Latest Activity". Tujuan tombol/tautan tidak tertulis (G-10).
Varian: 01M (Dodi) angka "tugas Anda yang sedang aktif/selesai"; 01P (Nico) "di proyek yang saya kelola", kartu `Periksa: Perbaiki tombol simpan di halaman profil`; 01A (Ayu) kartu Proyek berjalan 4 / Tugas terlambat / Menunggu persetujuan 2, "⚠ PERLU TINDAKAN: Setujui 2 pengguna baru" + `Buka`.

### SCR-PROYEK-01 Semua proyek
Baris contoh: Proyek Atlas (Lead Nico, ! Perlu perhatian, 70%, 31 Okt, Diperpanjang ×1), Portal Klien PT Sinar (35%, 20 Okt), Migrasi Data Lama (⏰ Terlambat, 80%, 30 Sep), Internal Tools (✓ Lancar, 50%), Aplikasi Absensi (Draf, "Belum ada tugas"), Website Company Profile (Selesai, 100%). Klik baris → SCR-PROYEK-08 [tertulis].
### SCR-PROYEK-02 kosong (Member)
Teks: "Anda belum masuk proyek apa pun." "Minta admin atau project manager menambahkan Anda." "Tidak ada tombol + Proyek baru untuk Member." Ilustrasi "GAMBAR". Tanpa tombol. Versi PM/Admin hanya berisi "Tidak tersedia untuk …" dan penjelasan; jika belum ada proyek sama sekali muncul tombol `Buat proyek pertama` (hanya tertulis di catatan, tombolnya tidak digambar).
### SCR-PROYEK-03 pilih cara
Tiga kartu, tombol `Pilih`: `Isi form sendiri` → -04; `Ceritakan proyeknya ✦` (lencana `Disarankan`; "Anda tetap memeriksa draf sebelum proyek dibuat.") → -05; `Pakai template` → -07. `Batal`.
### SCR-PROYEK-04 Form proyek
Isian: Nama proyek *, Lead (pengelola utama) (default "Nico (Anda)"), Deskripsi, Status awal (`Draf | Berjalan`), Prioritas (`Rendah | Sedang | Tinggi | Kritis`), Tanggal mulai, Tanggal selesai, `Pilih cepat` (`1 mgg | 2 mgg | 1 bln | 3 bln`), Anggota & peran (`Anggota ▾`, `+ Tambah anggota`). `Batal`, `Buat proyek`. Teks: "Pembuat proyek otomatis menjadi Pengelola dan Lead. Jenis tugas default dibuat: Tugas, Bug, Ide (bisa diubah di Pengaturan proyek)."
### SCR-PROYEK-05 Ceritakan proyeknya
Kolom teks bebas (batas "120 / 2000 huruf"), `Bicara` ("segera", "Belum aktif"), panduan (tujuan, kapan selesai, siapa terlibat). `Batal`, `Susun draf ✦` → -06 [tertulis].
### SCR-PROYEK-06 Periksa draf dari AI
Fitur: lencana `Belum jadi proyek`; info proyek (Nama, Deskripsi, Tanggal, Prioritas, Status awal, Anggota); "4 tahapan · 4 milestone · 8 tugas" dengan kotak centang per tugas dan jenis `Tugas ▾`/`Bug ▾`; kotak `Simpan juga sebagai template`; tombol `Susun ulang`, `Buat proyek`. "Jenis dipilih AI dari Tugas · Bug · Ide, klik untuk mengganti. Hapus centang untuk membuang."
### SCR-PROYEK-07 Pakai template
Kiri 3 template (Aplikasi internal 60 hari, Website perusahaan 45 hari, Migrasi data 30 hari; asal: cerita atau proyek lama). Kanan "Isi data proyek": Nama proyek *, Tanggal mulai * (12 Okt 2026), Perkiraan selesai (11 Des 2026 (60 hari)). `Batal`, `Buat proyek`.
### SCR-PROYEK-08 Detail · Ringkasan
Tab (4) `Ringkasan | Tugas | Tahapan | Anggota`; tombol `Perpanjang tenggat` (Admin/Pengelola) → -12. "Kenapa: 1 tugas penting terlambat (#12 Fix login SSO)"; "Lead: Nico · Tenggat: 31 Okt 2026", "Diperpanjang ×1". Panel: Progres (Tugas selesai 70%, Waktu berjalan 60%, "sisa 24 hari"); tahapan Perencanaan/Pengembangan/Pengujian/Rilis ("Sekarang: Pengembangan · 60%", "◆ Milestone berikutnya: Rilis beta 20 Okt 2026 · 13 hari lagi", `Lihat semua tahapan →`); "Tugas yang perlu perhatian" (#12, #17, #14); "Aktivitas terakhir" (4 butir). Menu ⋯ proyek › `Pengaturan proyek` → SCR-TUGAS-12 [tertulis di TUGAS-12]; ⋯ ini tidak digambar di -08 (G-11).
### SCR-PROYEK-09 Detail · Tugas
`+ Tugas baru`; saringan `Semua | Tugas saya | Terlambat | Menunggu diperiksa saya`; `List | Papan`. Kolom #, Tugas, Jenis, Status, Prioritas, Mengerjakan, Tenggat, Langkah berikutnya; tombol baris `Minta diperiksa`, `Periksa`, `Mulai kerjakan`, `Lihat`; label "⏰ Terlambat 2 hari", "Menunggu diperiksa saya", "Tertahan oleh #12". Member: `Tandai selesai`, `Lihat` untuk tugas orang lain.
### SCR-PROYEK-10 Detail · Tahapan
`+ Tahapan`; 4 kolom tahap (Perencanaan Selesai 1–24 Sep 100%; Pengembangan Berjalan 25 Sep–20 Okt 60%; Pengujian 21–27 Okt; Rilis 28–31 Okt), per tahap `+ Milestone`, `Selesaikan tahapan`/`Mulai tahapan`; milestone Tercapai/Menunggu; "Riwayat tenggat" (15 Okt → 31 Okt, Scope bertambah, oleh Nico).
### SCR-PROYEK-11 Detail · Anggota
"4 anggota", `+ Anggota`; baris Nico (Lead, Pengelola ▾, `Keluarkan`), Dodi, Rina (Anggota), Sri (Pemantau). Teks: "Nico satu-satunya Pengelola, jadi tidak bisa dikeluarkan. Tambahkan pengelola kedua supaya tugas Nico bisa diperiksa orang lain." Panel "Arti peran".
### SCR-PROYEK-12 Modal Perpanjang tenggat
`✕`; "Tenggat sekarang 31 Okt 2026", "Tenggat baru *"; contoh galat "Tenggat baru harus setelah 31 Okt 2026."; "Kenapa diperpanjang? *" (`Scope bertambah | Menunggu pihak luar | Perkiraan meleset | Kekurangan orang | Lainnya`); "Alasan *"; "Dampak perubahan: 3 tugas dan 1 milestone melewati tenggat lama."; `Batal`, `Simpan`.

### SCR-TUGAS-01 Tugas saya
`+ Tugas baru`; tab `Tugas saya | Semua tugas`; `Cari judul, #nomor, atau tag…`; `List | Papan`; `Urutkan: Tenggat ▾`; status `Semua aktif | Belum dikerjakan | Sedang dikerjakan | Menunggu diperiksa | Selesai`; `Proyek ▾ | Orang ▾ | Jenis ▾ | Prioritas ▾ | Tag ▾`. Kelompok: Menunggu diperiksa saya, ⏰ Terlambat, Hari ini, Besok, Minggu ini. Tombol baris: `Periksa`, `Minta diperiksa`, `Mulai kerjakan`. Klik tugas → -08/-09/-10 sesuai status ("Klik tugas" ke ⑧ tertulis).
### SCR-TUGAS-02 Semua tugas
Seperti 01 ditambah `Unduh CSV`, `Impor CSV` → -07, chip `Proyek: Atlas ✕`; kolom #, Tugas, Jenis, Status, Prioritas, Mengerjakan, Tenggat, Tag; "1–6 dari 6 tugas".
### SCR-TUGAS-03 Papan
4 kolom: `Belum dikerjakan 2`, `Sedang dikerjakan 2`, `Menunggu diperiksa 1`, `Selesai 1`. Tombol kartu: `Mulai kerjakan →`, `Minta diperiksa →`, `Periksa →`, `Tandai selesai →` (#16 yang tertahan?), `Buka lagi` (di Selesai). Catatan: "Pindah kartu lewat tombol di kartu, bukan hanya drag."
### SCR-TUGAS-04 kosong
"Belum ada tugas untuk Anda." "Tugas yang ditunjuk ke Anda akan muncul di sini." tombol `+ Tugas baru`.
### SCR-TUGAS-05 Tulis saja ✦
Pemilih proyek, kolom teks bebas, `🎤 Bicara · segera`, `Susun ✦`; hasil "✦ Draf dari AI. Periksa dulu sebelum disimpan." (kotak centang per tugas; klarifikasi "✦ Rina yang mana?" `Rina Wulandari | Rina Pratiwi`); `Ubah tulisan`, `Simpan 2 tugas`. Tab `Tulis saja ✦ | Isi form`.
### SCR-TUGAS-06 Isi form
Proyek *, Judul *, Siapa yang mengerjakan, Prioritas (`Rendah|Sedang|Tinggi|Kritis`), Tenggat, `Tampilkan lebih sedikit ▴` (Deskripsi, Jenis, Tahapan, Tanggal mulai, Estimasi jam, Tag, "Perlu diperiksa" Ya/Mati, "Pemeriksa: Nico (Lead) ▾"). `Batal`, `Simpan`.
### SCR-TUGAS-07 Impor CSV
`Unduh contoh CSV`; "Ke proyek"; tab `Unggah file | Tempel teks`; `Ganti file`; Pratinjau "4 siap (1 dengan catatan) · 1 galat" (✓ Siap, ✕ Galat "Jenis 'QC' tidak ada di proyek ini", ⚠ Catatan "budi@kantor.id bukan anggota Atlas, diimpor tanpa yang mengerjakan"; kosong → default Tugas/Sedang). `Batal`, `Impor 4 tugas`.
### SCR-TUGAS-08 Detail · Belum dikerjakan (#14)
`← Kembali`; tombol `Mulai kerjakan` (utama), `Tandai selesai`, menu `⋯` (`Batalkan tugas`, `Hapus ke Sampah`); `+ Tambah langkah`; "Obrolan & riwayat" + kolom komentar ("@nama untuk menyebut"). Panel: Yang mengerjakan, Tenggat, Prioritas, Jenis, "Perlu diperiksa: Mati · langsung Tandai selesai", Tag, Dibuat oleh.
### SCR-TUGAS-09 Detail · Sedang dikerjakan (#12)
Tombol `Minta diperiksa`; menu `⋯`; langkah 2/3; "Bukti 1" + `+ Lampirkan bukti`; "Menahan 1 tugas" (#16); "Perlu diperiksa: Ya · dinyalakan Nico"; "Pemeriksa: Admin"; peringatan "Lead sendiri yang mengerjakan. Tambahkan pengelola kedua supaya ada pemeriksa di proyek."
### SCR-TUGAS-10 Detail · Menunggu diperiksa (#17)
Banner "Dodi meminta Anda memeriksa tugas ini"; tombol `Setujui` (→ otomatis Selesai), `Kembalikan` (→ modal kiri SCR-TUGAS-11); "Bukti dari Dodi 2"; "Perlu diperiksa: Ya · 🔒 terkunci saat menunggu diperiksa"; "Pemeriksa: Nico (pembuat, Pengelola)". Member: tanpa tombol; "Tugas Anda menunggu Pengelola atau Admin. Anda akan diberi tahu saat disetujui atau dikembalikan. Anda tidak melihat tombol Setujui / Kembalikan."
### SCR-TUGAS-11 Modal Kembalikan + Batalkan
Kiri "Kembalikan tugas": `Pilih cepat` (Masih ada error / Belum sesuai permintaan / Bukti kurang jelas), "Alasan *", `Batal`, `Kembalikan`. Kanan "Batalkan tugas": "Kenapa dibatalkan? *" (Dobel / sudah ada, Tidak jadi dikerjakan, Di luar cakupan proyek, Salah buat, Lainnya), "Catatan * (wajib jika Lainnya)", `Batal`, `Batalkan tugas`. Modal "Buka lagi" tidak digambar (G-12).
### SCR-TUGAS-12 Pengaturan proyek
Breadcrumb "Proyek / Proyek Atlas / Pengaturan proyek". Saklar "Tugas baru perlu diperiksa" (Mati/menyala). "Jenis tugas" (`+ Jenis`; Tugas, Bug, Ide: `Ganti nama`, `Arsipkan`, "Kategori dasar"). "Tag" (6 tag; `Ganti nama`, `Gabung`, `Hapus`).

### SCR-PENGGUNA-01 Persetujuan user
Tab `Menunggu 2 | Disetujui 5 | Ditolak 1 | Dinonaktifkan 0`; `Cari nama atau email…`. Kartu Sari Wulandari ("Jabatan: Staf Keuangan · Divisi: Keuangan") dan Budi Santoso ("Profil belum diisi. Hanya nama, email, dan foto dari Google."); per kartu `Peran awal: Member ▾`, `Tolak`, `Setujui`. `Tolak` → kolom alasan wajib, `Batal`, `Tolak pengguna`.
### SCR-PENGGUNA-02 Kelola peran
Tab `Disetujui | Dinonaktifkan`; kolom Nama, Email, Peran, Status. Ayu (Anda) Admin Aktif "–"; Nico `Project Manager ▾` `Nonaktifkan`; Rina, Dodi, Sri `Member ▾` `Nonaktifkan`. Kotak "Aturan" (kutipan di 6).

### EVENTS / INBOX / TIM / SAMPAH / PENGATURAN (ringkas)
- EVENTS-01: `+ Event baru`, tab `Akan datang | Sudah lewat`, `Cari judul atau lokasi…`, `Daftar | Kalender`, `Filter ▾`, tombol kartu `Lihat`/`Periksa hasil`. -04 ⋯ `Batalkan`/`Hapus`; -04b centang izin → `Mulai rekam`; -04c `Selesai merekam`; -05a `Ubah jadi teks ✦`; -05b `Lanjut`; -06 `Buat 2 tugas` (Konfirmasi).
- INBOX-01 tombol kartu: `Buka Pengguna` (Admin), `Periksa`, `Balas`, `Tolak`/`Setujui` (cuti), `Lihat tugas`; -02 `Tandai semua dibaca`; -03 `Lihat Kabar terbaru`.
- TIM-01: `Cari nama…`, `Semua proyek ▾`, `Urutkan: Nama ▾`, `Lihat`; -02 `← Kembali ke Tim`.
- SAMPAH-01: tab `Semua | Proyek | Tugas | Event`; `Pulihkan`, `Hapus permanen` (Admin); -03 toast + `Urungkan`; -04 konfirmasi "Hapus permanen?" `Batal`/`Hapus permanen`.
- PENGATURAN-01: `Ubah profil`; ukuran teks `Aa Normal | Aa Besar | Aa Sangat besar`; saklar Pengingat acara dan Kabar terbaru; kartu Cuti (`Atur cuti`/`Ajukan cuti`); `Keluar`; Admin: saklar Fitur AI ✦, lama simpan rekaman, pengingat bawaan, Cuti perlu persetujuan, `Peran dan izin`. -02 `Simpan`; -03 `Simpan cuti`/`Kirim pengajuan`; -04 `Batalkan cuti`/`Batalkan pengajuan`/`Ajukan lagi`.

## 4. Perpindahan antar layar

Dua jalur top-level `alur ⑧ → ⑫`: titik awal/akhir diambil dari data path (`M…L…`, panah di titik terakhir) lalu dicocokkan ke koordinat sub-board. NAMA KEDUANYA MENYESATKAN (G-01):
- Jalur 1 (123,2180 4571x3767): mulai di (4694,2180) = di dalam board `02 · Proyek` sub-board ⑨ Detail · Tugas, setinggi baris #12 "Fix login SSO"; berakhir di (124,5947) = tepat di atas sub-board `03 · Tugas ⑨ Detail · Sedang dikerjakan (#12)` (tengah atas). Arti: `SCR-PROYEK-09 --(klik tugas #12)--> SCR-TUGAS-09` [tersirat; tidak ada label teks].
- Jalur 2 (-6068,933 2023x1063): mulai di (-6068,1996) = tepi kanan `01 · ④ Beranda`; berakhir di (-4045,933) = tepi kiri `04 · ① Beranda · Bersama tim`. Arti: `SCR-AKUN-04 --> SCR-BERANDA-01` (Beranda ringkas menuju Beranda lengkap) [tersirat].
- `alur ⑧ → ⑫` yang benar (⑧ Ringkasan → ⑫ Modal) ada DI DALAM board 02 (3412,1911 772x1225), berlabel "Klik Perpanjang tenggat (hanya Admin / Pengelola proyek)". Salinannya ada di board B dan C (28578,7361 dan 41378,7361). Satu salinan nyasar di board A (11498,15201), di area Member · Events, tanpa makna.

Alur tertulis (nama path + keterangan di board):
| Dari --(aksi)--> Ke | Penanda |
|---|---|
| SCR-AKUN-01 --(Masuk dengan Google)--> -02 | [tertulis] |
| -02 --(login pertama / masih pending)--> -03 | [tertulis] "akun dibuat dengan status menunggu persetujuan… User yang masih menunggu juga diarahkan ke sini" |
| -02 --(sudah disetujui)--> -04/Beranda ; AKUN-01 --(sesi masih berlaku)--> -04 ; -03 --(admin menyetujui, login berikutnya)--> -04 | [tertulis] |
| -02 --(ditolak/dinonaktifkan)--> AKUN-01 | [tertulis] "kembali ke Login dengan pesan "Akses ditolak" beserta alasannya" (layar pesan hanya di mobile, G-03) |
| SCR-BERANDA-01A --(Setujui 2 pengguna baru / Buka)--> SCR-PENGGUNA-01 | [tertulis] panah "alur Beranda → ① Persetujuan user": "Menu Pengguna / klik "Setujui 2 pengguna baru"" |
| SCR-PENGGUNA-01 <--(tab)--> SCR-PENGGUNA-02 | [tertulis] "Persetujuan ↔ Kelola peran" |
| SCR-PROYEK-01 --(+ Proyek baru)--> SCR-PROYEK-03 | [tertulis] (Admin / PM) |
| SCR-PROYEK-01 --(Member belum punya proyek)--> SCR-PROYEK-02 | [tertulis] |
| SCR-PROYEK-03 --(Isi form sendiri / Ceritakan proyeknya / Pakai template)--> -04 / -05 / -07 | [tertulis] |
| SCR-PROYEK-05 --(Susun draf)--> -06 | [tertulis] "AI menyusun draf untuk diperiksa" |
| SCR-PROYEK-04 / -06 / -07 --(Buat proyek)--> SCR-PROYEK-08 | [tertulis] "proyek dibuat, pembuat jadi Pengelola & Lead" |
| SCR-PROYEK-01 --(klik proyek)--> SCR-PROYEK-08 | [tertulis] |
| SCR-PROYEK-08 <--> -09 <--> -10 <--> -11 | [tertulis] "Pindah tab" |
| SCR-PROYEK-08 --(Perpanjang tenggat)--> SCR-PROYEK-12 | [tertulis] |
| SCR-TUGAS-01 <--> -02 | [tertulis] "Tugas saya / Semua tugas" |
| SCR-TUGAS-02 <--> -03 | [tertulis] "List / Papan" |
| SCR-TUGAS-02 --(Impor CSV)--> SCR-TUGAS-07 | [tertulis] "Impor CSV (Member / Pengelola / Admin)" |
| SCR-TUGAS-01 --(tidak punya tugas)--> SCR-TUGAS-04 | [tertulis] "User yang belum punya tugas → layar kosong. Pemantau tidak melihat tombol + Tugas baru" |
| SCR-TUGAS-01 --(+ Tugas baru)--> SCR-TUGAS-05 (default Tulis saja) | [tertulis] |
| SCR-TUGAS-05 <--> -06 | [tertulis] "Tulis saja ✦ / Isi form" |
| SCR-TUGAS-05 / -06 --(Simpan)--> SCR-TUGAS-01 | [tertulis] "Tersimpan → kembali ke ①" |
| SCR-TUGAS-07 --(Impor)--> SCR-TUGAS-01 | [tertulis] "Diimpor → kembali ke ①" (padahal asalnya dari -02; G-13) |
| SCR-TUGAS-01 --(klik tugas)--> SCR-TUGAS-08 | [tertulis] "Klik tugas" |
| SCR-TUGAS-08 --(Mulai kerjakan)--> -09 --(Minta diperiksa)--> -10 | [tertulis] "pemeriksa dapat notifikasi" |
| SCR-TUGAS-10 --(Kembalikan + alasan)--> modal -11 lalu -09 | [tertulis] "Tugas kembali ke Sedang dikerjakan · "Dikembalikan ×1"" |
| SCR-TUGAS-10 --(Setujui)--> Selesai (done) | [tertulis] "Setujui → otomatis Selesai" |
| SCR-TUGAS-08 --(Tandai selesai)--> Selesai | [tertulis] "Tandai selesai (tugas tanpa pemeriksaan)" |
| SCR-TUGAS-08/09/10 --(menu ⋯ › Batalkan tugas)--> modal SCR-TUGAS-11 kanan | [tertulis] di catatan modal |
| SCR-PROYEK-08 --(⋯ › Pengaturan proyek)--> SCR-TUGAS-12 | [tertulis] "Dibuka dari Detail proyek ⋯ › Pengaturan proyek" |
| SCR-PROYEK-09 --(klik tugas)--> SCR-TUGAS-08..10 | [tersirat] (jalur 1 di atas) ; catatan "Komponen daftar sama dengan menu Tugas (modul 03 ②)" |
| SCR-EVENTS-01 <--> -02 ; -01 --(+ Event baru)--> -03a ; -03a --(Tambah detail lain ▾)--> -03b ; -03a --(Simpan)--> -01 | [tertulis] "Tersimpan → muncul di ① dan ②" |
| SCR-EVENTS-01 --(klik kartu)--> -04 ; --(Periksa hasil)--> -06 | [tertulis] |
| SCR-EVENTS-04 --(jam mulai tiba)--> -04b --(centang izin, Mulai rekam)--> -04c --(Selesai merekam)--> -05a --(Ubah jadi teks)--> -05b --(Lanjut)--> -06 --(Buat 2 tugas)--> -07 | [tertulis] |
| SCR-EVENTS-04 --(⋯ Batalkan / Hapus)--> -08 | [tertulis] |
| SCR-EVENTS-07 --(klik #nomor)--> SCR-TUGAS-08.. | [tertulis] "Klik #nomor → detail tugas (menu Tugas)" |
| SCR-INBOX-01 --(tab Kabar terbaru)--> -02 ; SCR-TIM-01 --(klik kartu)--> -02 ; SCR-PENGATURAN-01 --(Ubah profil)--> -02, --(Atur cuti)--> -03 | [tertulis] |
| SCR-INBOX-01 kartu "2 pengguna baru" --(Buka Pengguna)--> SCR-PENGGUNA-01 | [tersirat] dari label tombol |
[tersirat, tanpa panah]: Batal/Simpan/Keluar kembali ke layar asal; sidebar menghubungkan semua menu; Sampah -01 → -04 lewat Hapus permanen.

## 5. Catatan NOTE-* (isi penuh, "catatan · …")

**Proyek (board 02)**
- NOTE-PROYEK-01 "catatan · ② versi admin" (02): "Versi Admin / PM: di tempat pesan kosong muncul tombol "Buat proyek pertama"."
- NOTE-PROYEK-02 "catatan · ⑥ AI" (02; di B/C): "AI tidak menyimpan apa pun ke proyek sebelum Buat proyek diklik. Ceritanya hanya tersimpan sebagai draf (project_story_drafts)."
- NOTE-PROYEK-03 "catatan · ⑧ PM bukan pengelola": "PM yang bukan pengelola melihat layar ⑧–⑪ tanpa tombol ubah (asumsi A1)." B: di proyek yang dikelola semua tombol ubah tampil, selain itu hanya baca. C: "Admin melihat dan mengubah semua proyek… tanpa harus menjadi Pengelola." A: "Member yang ditunjuk jadi Pengelola proyek ini mendapat tombol ubah."
- NOTE-PROYEK-04 "catatan · matriks izin" (berlaku ① – ⑫): lihat tabel di bawah.

| Aksi (Proyek) | Admin | Project Manager | Member |
|---|---|---|---|
| Lihat tombol + Proyek baru dan membuat proyek (form, cerita, template) | ✅ | ✅ | ❌ tombol disembunyikan |
| Lihat daftar & detail proyek | Semua | Semua | Hanya yang diikuti |
| Ubah info, status, tahapan, milestone, anggota, perpanjang tenggat, kondisi manual, pindah ke Sampah | ✅ semua proyek | Hanya jika Pengelola di proyek itu | Hanya jika Pengelola di proyek itu |
| Tambah / ubah tugas di proyek | Lihat modul 03 | Lihat modul 03 | Lihat modul 03 |
| Simpan proyek sebagai template | ✅ | ✅ | ❌ |
| Setujui / Kembalikan tugas | ✅ | Hanya jika Pengelola di proyek itu | Hanya jika Pengelola di proyek itu |
Kaki matriks: "Pembuat proyek otomatis jadi Pengelola & Lead. Proyek wajib punya minimal 1 Pengelola. Peran project_manager diberikan Admin."

**Tugas (board 03)**
- NOTE-TUGAS-01 "① label & tombol": "Satu label per baris: Terlambat > Menunggu diperiksa saya > Tertahan > Mandek. Tombol langkah berikutnya selalu terlihat (tanpa hover)." A: "Tanpa bagian "Menunggu diperiksa saya": Member tidak memeriksa tugas orang lain." C: "Admin melihat tugas di semua proyek."; Admin juga memeriksa tugas yang pemeriksanya jatuh ke Admin (mis. #12).
- NOTE-TUGAS-02 "⑨ bukti & pemeriksa": "Tanpa bukti, Minta diperiksa hanya memberi peringatan (A9)." "Pemeriksa jatuh ke Admin karena Lead sendiri yang mengerjakan dan Atlas hanya punya 1 Pengelola (keputusan #7)." A: "Member hanya bisa mengubah tugas yang ia buat atau kerjakan. Tugas milik orang lain: tombol "Lihat"." "Member boleh menyalakan "Perlu diperiksa", tidak boleh mematikannya."
- NOTE-TUGAS-03 "⑩ yang boleh memeriksa": "Yang boleh memeriksa: Pengelola (termasuk Lead) dan Admin. Anggota yang membuka layar ini tidak melihat tombol Setujui / Kembalikan, dan tombol Perlu diperiksa terkunci." B: boleh bila Pengelola proyek itu. C: "Admin boleh Setujui / Kembalikan di semua proyek. Pemeriksa jatuh ke Admin saat tidak ada Pengelola lain."
- NOTE-TUGAS-04 "catatan · ⑤ AI": "AI tidak menyimpan apa pun sebelum Simpan diklik. Tanggal dihitung oleh sistem, nama hanya dari anggota proyek."
- NOTE-TUGAS-05 "catatan · ④ Pemantau": "Pemantau tidak melihat tombol + Tugas baru."
- NOTE-TUGAS-06 "catatan · matriks izin tugas" (① – ⑫):

| Aksi (Tugas) | Admin | Pengelola | Anggota | Pemantau |
|---|---|---|---|---|
| Lihat tugas | Semua proyek | Proyek itu | Proyek itu | Proyek itu |
| Buat tugas (Tulis saja, Isi form) | ✅ | ✅ | ✅ | ❌ |
| Impor CSV, unduh CSV | ✅ | ✅ | ✅ | ❌ |
| Ubah isi tugas | ✅ | ✅ | Tugas yang ia buat atau kerjakan (A2) | ❌ |
| Mulai kerjakan, Tandai selesai, Minta diperiksa | ✅ | ✅ | Yang mengerjakan (atau yang mengklik jika belum ada) | ❌ |
| Setujui, Kembalikan | ✅ | ✅ | ❌ | ❌ |
| Nyalakan "Perlu diperiksa" pada tugas | ✅ | ✅ | Tugas yang ia buat atau kerjakan | ❌ |
| Matikan "Perlu diperiksa" pada tugas | ✅ | ✅ | ❌ | ❌ |
| Ubah setelan proyek "Tugas baru perlu diperiksa" | ✅ | ✅ | ❌ | ❌ |
| Buka lagi (alasan wajib) | ✅ | ✅ | Pembuat, yang mengerjakan, atau pemeriksa | ❌ |
| Batalkan (alasan wajib), Hapus ke Sampah | ✅ | ✅ | Pembuat tugas | ❌ |
| Pulihkan dari Sampah | ✅ | ✅ | Yang menghapus | ❌ |
| Komentar | ✅ | ✅ | ✅ | ✅ |
| Lampirkan bukti | ✅ | ✅ | ✅ | ❌ |
| Kelola jenis tugas · ganti nama/gabung/hapus tag | ✅ | ✅ | ❌ | ❌ |
| Buat tag baru saat memberi tag | ✅ | ✅ | ✅ (A3) | ❌ |
Kaki: "Peran proyek dari project_members.role. Project Manager yang bukan Pengelola proyek itu hanya bisa melihat (asumsi A1 modul 02). Tombol Perlu diperiksa terkunci saat Menunggu diperiksa, Selesai, dan Dibatalkan."
- NOTE-TUGAS-07 "catatan · alur status tugas": "Dibuka lagi ×N dan Dikembalikan ×N adalah penanda, bukan status." Semua tugas dibuat (form, Tulis saja, CSV, cerita, template) awalnya todo. Status: Belum dikerjakan (todo), Sedang dikerjakan (in_progress), Menunggu diperiksa (in_review), Selesai (done), Dibatalkan (canceled). Panah (dari nama path) [tertulis]: todo→in_progress "Mulai kerjakan"; in_progress→todo "Batal mulai"; in_progress→in_review "Minta diperiksa"; in_review→in_progress "Kembalikan + alasan"; in_review→done "Setujui"; in_progress→done "Tandai selesai (tidak perlu diperiksa)"; todo→done "Tandai selesai langsung dari Belum dikerjakan (A4)"; done→in_progress "Buka lagi + alasan"; todo/in_progress/in_review→canceled "Batalkan + alasan (kategori wajib)" (bukan dari done); canceled→todo "Pulihkan". Kaki: "Setujui / Kembalikan: hanya Pengelola & Admin. Tugas yang tombol Perlu diperiksa-nya menyala tidak bisa melewati Menunggu diperiksa. Yang mati langsung Selesai lewat Tandai selesai." (G-14)

**Events (05)**
- NOTE-EVENTS-01 "matriks izin Events (usulan, erd/diskusi/05-events.md §2)": Lihat: Admin semua; PM semua event proyek + tanpa proyek yang ia ikuti/buat; Member yang ia ikuti/di proyeknya/tanpa proyek yang ia ikuti/buat. + Event baru: Admin, PM ✅; Member ✅ di proyek tempat ia Anggota/Pengelola (bukan Pemantau). Ubah/Batalkan/Hapus: Admin semua; PM buatannya atau proyek yang ia kelola; Member hanya buatannya. Tulis notulensi: Admin ✅; PM pembuat/peserta/Pengelola; Member jika peserta. Konfirmasi hasil rapat: Admin ✅; PM pembuat atau Pengelola; Member hanya event buatannya (event orang lain hanya baca). Kaki: "Pengelola = project_members.role = manager di proyek yang terhubung. Peran aplikasi (users.role) terpisah dari peran di proyek."
- NOTE-EVENTS-02 "① status & hari ini": "Daftar sengaja ringkas: jam, judul, tempat, satu tombol. Jenis, proyek, peserta, pembuat, dan badge notulensi dilihat di halaman detail (④). Kelompok Hari ini tetap menampilkan event yang sudah lewat hari itu (diberi tanda Selesai). Filter Proyek dan Jenis ada di Filter ▾."
- NOTE-EVENTS-03 "⑤ izin rekam": "Suara wajib centang izin rekam. Audio mentah dihapus 30 hari setelah hasil dikonfirmasi. AI hanya menyusun draf teks; notulis bisa mengubahnya."
- NOTE-EVENTS-04 "⑥ konfirmasi manusia": "Tidak ada tugas yang dibuat sebelum Konfirmasi. Nama hanya dicocokkan dengan peserta/anggota proyek. Kalau AI ragu (nama, tanggal), kolomnya dikosongkan, bukan ditebak."
- NOTE-EVENTS-05 "alur hasil rapat": Event selesai (status dari jam) → Notulensi (Ketik · Foto ✦ · Suara ✦) → Draf teks (bisa diubah) → Pilah ✦ (Tugas · Keputusan · Informasi · Pertanyaan) → Konfirmasi manusia (✓ · ✎ · ✕ · gabung) → Tugas masuk proyek / Keputusan ke riwayat / Pertanyaan terbuka. "Badge notulensi: Belum ada → Draf → Menunggu dikonfirmasi → Dikonfirmasi · N tugas (M selesai)". "Yang boleh mengonfirmasi: pembuat event, Pengelola proyek yang terhubung, Admin. Member hanya untuk event buatannya sendiri…". "Pertanyaan yang belum dijawab otomatis masuk agenda event berikutnya di proyek yang sama (A1 §4.3). Event tanpa proyek: hasil Tugas tidak bisa dikonfirmasi sebelum proyek dipilih."
- NOTE-EVENTS-06 "catatan · Admin" (C): "Admin (Ayu) melihat semua event, termasuk event tanpa proyek yang tidak ia ikuti. Tombol Ubah, ⋯, dan Konfirmasi selalu tersedia. Layar sama dengan PM."

**Inbox/Tim/Sampah/Pengaturan**
- NOTE-INBOX-01: "Lonceng dan angka di menu Inbox sama: jumlah kartu yang perlu Anda tanggapi. Klik lonceng langsung membuka Inbox… Hanya Admin yang menerima kartu persetujuan pengguna baru; kartunya hilang untuk semua Admin begitu satu Admin memutuskan."
- NOTE-INBOX-02: "Kabar terbaru dibundel per item ("5 perubahan di tugas #22"). Titik hitam = belum dibaca. Perubahan yang Anda buat sendiri tidak muncul. Tandai semua dibaca menghapus titik."
- NOTE-TIM-01: Admin: "melihat semua pengguna yang sudah disetujui, termasuk yang belum ikut proyek, beserta beban semua orang. Persetujuan pengguna dan peran akun ada di menu Pengguna". PM: "Angka beban terlihat bila Anda Pengelola proyeknya… Orang yang tidak berbagi proyek dengan Anda tidak tampil." Member: Tim kosong bila belum masuk proyek; "Jumlah tugas per orang hanya terlihat oleh orang itu sendiri, Pengelola proyek, dan Admin."
- NOTE-TIM-02: "Kapasitas tertimbang (jam estimasi dibagi kapasitas, heatmap 4 minggu) dan peringatan overload ditunda ke tahap berikutnya (P1). Sementara cukup jumlah tugas aktif dan terlambat."
- NOTE-SAMPAH-01 (Admin): "satu-satunya yang bisa Hapus permanen (④). Hapus proyek ikut memindahkan tugas dan event di dalamnya, dan ikut pulih bersamanya. Setelah 30 hari hilang selamanya." PM: "Hapus permanen sebelum 30 hari hanya untuk Admin."
- NOTE-SAMPAH-02: "Pulihkan mengembalikan item ke keadaan sebelum dihapus. Pesan Urungkan (③) muncul di tempat setelah menghapus, jadi salah ketuk tidak perlu membuka Sampah. Hapus permanen selalu minta konfirmasi."
- NOTE-PENGATURAN-01: Admin melihat tambahan Pengaturan tim (Fitur AI, lama simpan rekaman, pengingat bawaan, Peran dan izin hanya baca). "Persetujuan pengguna dan peran akun tetap di menu Pengguna." Member dan PM sama; "Pengaturan proyek hanya untuk Pengelola, di dalam proyek."
- NOTE-PENGATURAN-02: "Ukuran teks langsung mengubah semua layar. Permintaan yang perlu ditanggapi di Inbox tidak bisa dimatikan. Mode Pendamping ditunda dan belum masuk Pengaturan."

## 6. ATURAN-TERTULIS (kutipan + lokasi). Aturan dalam NOTE-* tidak diulang; lihat bagian 5.
- AT-01 "Login hanya dengan akun Google. User baru menunggu persetujuan admin di layar Profil." (01 subjudul)
- AT-02 Status user → layar (ERD NICO 01): google_sub belum ada → buat users (pending) + profiles → ③; pending → ③; approved → ④ (buat sesi); rejected/suspended → ① + pesan akses ditolak (rejection_reason), tanpa sesi; admin menyetujui → approved (approved_by, approved_at).
- AT-03 "Akun baru perlu disetujui admin sebelum bisa dipakai." (SCR-AKUN-01); "Belum ada menu lain sebelum akun disetujui admin." (-03); "Email … tidak bisa diubah." (-03)
- AT-04 "Yang disetujui langsung menjadi Member. Peran Project Manager diberikan di Kelola peran." ; "Alasan tampil ke pengguna saat ia mencoba masuk." ; Tolak: alasan wajib (PENGGUNA-01)
- AT-05 "Admin terakhir tidak bisa diturunkan atau dinonaktifkan."; "Mengubah peran berlaku pada login berikutnya."; "Project Manager melihat semua proyek dan mengubah hanya proyek yang ia kelola. Member yang ditunjuk jadi Pengelola proyek tetap bisa mengelola proyek itu."; "Beri atau cabut peran Project Manager, atau nonaktifkan pengguna." (PENGGUNA-02)
- AT-06 Struktur data: "Peran project_manager diberikan Admin." (NOTE-PROYEK-04)
- AT-07 Perpanjang tenggat: "hanya Admin / Pengelola proyek"; "Tenggat baru *", "Kenapa diperpanjang? *", "Alasan *" wajib; galat "Tenggat baru harus setelah 31 Okt 2026."; "Tercatat di Riwayat tenggat dan Aktivitas proyek." (PROYEK-12, panah ⑧→⑫)
- AT-08 Pengelola "mengubah proyek, tahapan, anggota, tenggat, dan memeriksa tugas"; Anggota "membuat dan mengerjakan tugas"; Pemantau "melihat dan berkomentar" (PROYEK-11 "Arti peran")
- AT-09 "Nico satu-satunya Pengelola, jadi tidak bisa dikeluarkan." (PROYEK-11) + NOTE-PROYEK-04 "Proyek wajib punya minimal 1 Pengelola."
- AT-10 "Pembuat proyek otomatis menjadi Pengelola dan Lead." ; "Jenis tugas default dibuat: Tugas, Bug, Ide" (PROYEK-04, -07)
- AT-12 Kondisi proyek (ERD NICO 02 "Nilai yang dihitung"): Terlambat jika due_date lewat; Perlu perhatian jika ada milestone terlewat, > 20% tugas aktif terlambat (konfigurasi), atau tugas high/critical terlambat; selain itu Lancar (hanya status active); override manual menimpa. Progres % = done ÷ semua tugas selain canceled/terhapus (in_review belum selesai); belum ada tugas → "Belum ada tugas". Waktu berjalan % = (hari ini − start_date) ÷ (due_date − start_date).
- AT-13 Tugas (ERD NICO 03): Terlambat = due_date < hari ini dan status ∉ {done, canceled}; Tertahan = ada blocked_by_task_id belum selesai; Mandek = in_progress dan tanpa aktivitas > TASK_STALE_DAYS (default 3, A8); Menunggu diperiksa saya = in_review dan (reviewer = saya, ATAU saya Pengelola proyek itu, ATAU saya Admin dan reviewer kosong); kelompok: Terlambat · Hari ini · Besok · Minggu ini · Nanti · Tanpa tenggat.
- AT-14 Tugas baru: "Mati: tugas baru langsung selesai dengan Tandai selesai. Menyala: tugas harus lewat Minta diperiksa. Tugas yang sudah ada tidak berubah." ; "Per tugas, Pengelola/Admin bisa mengubahnya. Anggota hanya bisa menyalakan." ; "Jenis yang sudah dipakai tugas hanya bisa diarsipkan, tidak dihapus." ; "3 dari maks. 6 jenis aktif" (TUGAS-12)
- AT-15 "Pemeriksa hanya muncul jika menyala. Pilihannya hanya Pengelola atau Admin, bukan yang mengerjakan." ; "Nilai awal ikut setelan proyek (Atlas: mati). Dinyalakan oleh Nico." (TUGAS-06); Member: "tidak bisa mematikannya lagi" (varian A)
- AT-16 "Baris galat tidak diimpor. Baris dengan catatan tetap diimpor." ; "Unduh/Impor CSV bisa dipakai Admin, Pengelola, dan Anggota (Pemantau tidak)." (TUGAS-07, -02)
- AT-18 Batalkan: kategori alasan wajib, "Catatan * (wajib jika Lainnya)"; Kembalikan: "Alasan *" wajib; "Centang selalu terlihat"; "Pindah kartu lewat tombol di kartu, bukan hanya drag." (TUGAS-02, -03, -10, -11)
- AT-19 AI (✦): "AI tidak menyimpan apa pun…" (NOTE-PROYEK-02, NOTE-TUGAS-04, NOTE-EVENTS-04); nama ambigu → "AI bertanya satu hal" (TUGAS-05); Admin bisa mematikan Fitur AI (PENGATURAN-01); suara "segera"/"Belum aktif" (PROYEK-05, TUGAS-05)
- AT-20 Sampah: "disimpan 30 hari, lalu hilang selamanya"; "Hapus permanen?" … "Ini tidak bisa diurungkan."; tugas dari proyek yang di Sampah: "Pulihkan proyeknya dulu." (SAMPAH-01, -04)
- AT-21 Cuti: Member `Ajukan cuti` → dikirim ke Pengelola proyek atau Admin; PM → dikirim ke Admin; Admin "langsung berlaku, tanpa persetujuan"; saklar "Cuti perlu persetujuan … Bila mati, cuti langsung berlaku."; bisa dibatalkan "selama belum diputuskan"; ditolak → `Ajukan lagi` (PENGATURAN-03/-04)
- AT-22 "Permintaan yang perlu Anda tanggapi selalu muncul di Inbox dan tidak bisa dimatikan."; ukuran teks "Berlaku di semua layar."; rekaman mentah dihapus setelah hasil dikonfirmasi (lama simpan default 30 hari, Admin); pengingat acara default "1 hari dan 30 menit sebelum" (PENGATURAN-01)
- Aturan lain berada di NOTE-PROYEK-04, NOTE-TUGAS-01..07, NOTE-EVENTS-01..06, NOTE-INBOX/TIM/SAMPAH/PENGATURAN (tiga matriks izin: 6 baris Proyek, 16 baris Tugas, 5 baris Events).

## 7. Perbedaan antar peran (A Member, B PM, C Admin)
- Layar hanya satu peran: PENGGUNA-01/-02, SAMPAH-04 Hapus permanen, blok Pengaturan tim (Fitur AI, lama simpan rekaman, pengingat bawaan, Cuti perlu persetujuan, Peran dan izin) = hanya Admin. TIM-03 kosong, EVENTS-09 kosong, PROYEK-03..07 dan TUGAS-12 versi "Tidak tersedia" = Member. EVENTS-08 modal Batalkan/Hapus event = PM dan Admin (Member tidak punya ⑧).
- Proyek: Member hanya proyek yang diikuti ("1–3 dari 3 proyek", tanpa `+ Proyek baru`, tanpa tab `Proyek saya/Semua proyek`); PM semua proyek, ubah hanya yang dikelola; Admin semua dan ubah semua. Detail ⑧–⑪ untuk non-Pengelola: tanpa `Perpanjang tenggat`, `+ Tahapan`, `+ Milestone`, `Mulai/Selesaikan tahapan`, `+ Anggota`, `Keluarkan`, ▾.
- Tugas: Member tanpa kelompok "Menunggu diperiksa saya", tombol `Lihat` untuk tugas orang lain, tanpa `Periksa/Setujui/Kembalikan`, tanpa `⋯` pada tugas orang lain, "Perlu diperiksa" hanya bisa dinyalakan. Admin ①: kartu "Tambahkan pengelola kedua untuk Proyek Atlas" dan tugas yang pemeriksanya jatuh ke Admin. Pemantau: tanpa `+ Tugas baru`, CSV, Lampirkan bukti.
- Beranda: tiga varian (bagian 3). Inbox: Admin kartu persetujuan pengguna/cuti PM/pemeriksa; PM kartu "Dodi meminta Anda memeriksa tugas", hasil rapat, cuti Dodi; Member 3 kartu tanpa persetujuan. Tim: Admin 5 orang/20 tugas aktif; PM hanya proyek dikelola (3/10); Member hanya Atlas (3/9). Sampah: Admin 6 item; PM 5 tanpa `Hapus permanen`; Member 2 miliknya. Pengaturan: Member = PM kecuali tujuan cuti; Admin `Atur cuti`.
- Sidebar: Admin tambah `Pengguna` (lencana 2).

## 8. Modul di luar MVP (status = putusan koordinator)
- Events (15 layar): jadwal rapat, kalender, rekam/notulensi, hasil rapat → tugas. `modul: ditunda?`
- Inbox (3): satu tempat pemberitahuan dan permintaan. `modul: ditunda?`
- Tim (3): daftar orang, ketersediaan, beban kerja; kapasitas/heatmap/overload "ditunda ke tahap berikutnya (P1)" (tertulis). `modul: ditunda?`
- Sampah (4): pulihkan proyek/tugas/event terhapus (30 hari). `modul: ditunda?`
- Pengaturan (4): akun, ukuran teks, notifikasi, cuti, pengaturan tim Admin; "Mode Pendamping ditunda" (tertulis). `modul: ditunda?`
- Beranda dashboard: briefing, fokus, Ask Data, agenda. `modul: ditunda?`
- Keano (hanya daftar): Wireframe & ERD (Login 8 layar, Home 6, Inbox 7, Projects 10 termasuk Kanban, Calendar, Gantt, Channel, All Tasks; 4 ERD); Mobile 375×812 A/B/C (Login 6, Beranda 5, Proyek 14, Tugas 16, Events 16, Inbox 4, Tim 4, Sampah; ERD 5). Kanban/Kalender/Gantt/Channel hanya di Keano. `modul: ditunda?`
- ERD NICO: 01 (users, profiles); 02 (projects, project_members, project_templates, project_story_drafts, project_phases, project_milestones, project_deadline_extensions, project_condition_overrides, project_activities); 03 (tasks, task_kinds, task_import_jobs, task_checklist_items, task_comments, task_attachments, task_reviews, task_dependencies, task_activities, task_tags, tags); Gabungan. `diagram flow` dan `Page 2`: kosong.

## 9. Keganjilan dan hal yang tidak pasti
- G-01 Dua jalur top-level `alur ⑧ → ⑫` salah nama (sebenarnya PROYEK-09 → TUGAS-09 dan AKUN-04 → BERANDA-01); satu salinan nyasar di board A.
- G-02 "Hari ini" bertentangan: 01 ④ Selasa 6 Okt; 02, 03, Inbox/Tim/Sampah/Pengaturan Rabu 7 Okt; 04 dan Beranda per peran Kamis 8 Okt (user sama).
- G-03 Panah "② → ① akun ditolak" menuju pesan "Akses ditolak" yang tidak digambar di desktop (hanya mobile ⑤).
- G-04 Angka bertentangan: Atlas "70%" (PROYEK-01, -08), tahap 60%, Waktu berjalan 60%, padahal hanya 1 dari 6 tugas Atlas Selesai (TUGAS-02). Beranda: Completed 12/In Progress 8/Unassigned 3 dan "Lihat semua tugas (9)" vs proyek 4/10+7/10+9/10 dan 5 tugas terdaftar. "Memulai tahapan Pengembangan 28 Sep" vs mulai 25 Sep.
- G-05 Dua dunia contoh: Beranda 04 (Hajatan Keluarga, Renovasi Dapur) vs menu lain (Atlas, Portal Klien PT Sinar). Judul 04 menjanjikan keadaan "Sendirian" dan "huruf sangat besar", hanya ① ada.
- G-06 Nomor tugas bentrok: #9 "Laporan progres PT Sinar" vs "Susun rancangan" (Inbox); #15 vs #18 "Periksa desain onboarding"; #18 juga "Uji tombol simpan di HP"; #19 "Revisi warna tombol" vs "Catatan rapat Atlas"; board Member berjudul "(#12)" berisi #16; Inbox Member: Nico mengembalikan #12 untuk Dodi padahal #12 dikerjakan Nico.
- G-07 `Pengguna` di sidebar tidak ada di salinan Admin · Proyek/Tugas/Login.
- G-08 Istilah campur: Pengelola vs Project Manager; Anggota vs Member; "Perlu diperiksa" vs "Menunggu diperiksa"; Lead vs "pengelola utama"; label Inggris di Beranda (Daily Briefing, My Focus, Ask Data, Unassigned, In Progress, Completed, Latest Activity).
- G-10 Tombol tanpa tujuan tertulis: Bantuan, Kebijakan Privasi, Cek status, Simpan profil, Keluar (AKUN-03); semua tombol Beranda.
- G-11 Menu ⋯ proyek tidak digambar di PROYEK-08; TUGAS-12 tanpa panah masuk.
- G-12 Modal "Buka lagi" dan "Pulihkan" tugas Dibatalkan tidak punya layar.
- G-13 "Diimpor → kembali ke ①" padahal Impor dimulai dari ②.
- G-14 NOTE-TUGAS-07 kaki "tidak bisa melewati Menunggu diperiksa" vs panah todo → done (A4) dan in_progress → done: kapan `Tandai selesai` tampil pada tugas ber-Perlu-diperiksa tidak tegas.
- G-15 Email contoh: nico@email.com (Login) vs nico@kantor.id (Pengaturan); rina@email.com (Proyek) vs rina@kantor.id (Tim).
- G-16 Rujukan "asumsi A1–A9", "keputusan #7", "§4.3", "P1" dan erd/*.md tidak didefinisikan di Penpot.
- G-17 Sampah-03 berisi layar Events + toast; Tim menampilkan Admin sebagai "Pemantau" proyek.
- G-18 Placeholder: "LOGO", "[Nama PM]", "ILUSTRASI / GAMBAR", "GAMBAR", "FOTO", "FILE", "08xx xxxx xxxx".
- TIDAK PASTI/TIDAK DIBACA: satu ekspor gambar saya kosong, jadi arah panah hanya dari data path dan nama path (alur status tugas dibaca dari nama path, bukan gambar). Detail tombol Events (selain ①, alur rekam garis besar), isi penuh Keano dan Mobile tidak dibaca per elemen. Varian peran Events/Inbox/Tim dibandingkan lewat selisih teks. ID dibuat sendiri.
