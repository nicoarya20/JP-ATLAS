> **Dokumen turunan** (dibangkitkan agen pembaca, 16 Okt 2026). Matriks keterlacakan, daftar selisih, rencana diagram (D01-D15), dan kartu aturan (R1-R58). Diverifikasi terhadap kode commit `69277e9`; aplikasi tidak dijalankan.
> Jangan disunting tangan; bila kode, keputusan, atau wireframe berubah, bangkitkan ulang (lihat `README.md` folder ini). Dokumen ini dikecualikan dari batas ukuran berkas karena berupa data turunan.

# Pencocokan Tiga Inventaris: Matriks Keterlacakan dan Daftar Selisih (Simple PM)

Dibuat dari tiga inventaris (Penpot, kode `caa78f7`, dokumen) ditambah verifikasi langsung ke kode `/tmp/sp-coord` (cabang `feature/project-management`, HEAD `69277e9`, setelah gelombang G14). Hanya membaca; tidak ada Penpot, repo, atau berkas lain yang diubah. Hierarki kebenaran: kode berjalan > KEPUTUSAN-MVP-INTI > PROGRES > rencana P1-P3/X1-X3 > riset > wireframe.

**Pembaruan status kode setelah G14 (sudah diverifikasi di `69277e9`):**
- `GET/PATCH /api/app/profile` NYATA (nama tampil, HP, jabatan, divisi, ukuran teks); cookie `mk-text-size` NYATA (`PATCH` menulis, `/go` memasang di perangkat baru). Tetapi TIDAK ADA kontrol di layar yang memanggilnya (`patchMyProfile` hanya dipakai tes). Jadi AUTO-70 = DIBANGUN di server, belum terlihat pengguna.
- `GET /api/app/projects`, `/projects/:id` (progres, kondisi, `can{}`), `/projects/:id/members` NYATA (hanya baca). Belum ada API tulis proyek; semua 11 halaman `/app` produk masih STUB dan `/app/settings` masih redirect ke `/profile`.
- Tiga stub API baru: `app-team.picker`, `app-projects.trash`, `app-trash` (total STUB literal tetap 17: 11 halaman + 6 API). Tidak ada rute halaman `/app/trash`.
- `server/task/*` (query daftar/detail tugas, label, kelompok jadwal) dan `server/metrics/schedule.ts` ada, tetapi belum ada rute yang memanggilnya; kebijakan alur tugas/periksa tetap BEKU.
- PROGRES: 64 dari 93 tugas selesai (S1 4/18, S2 2/17). Butir kode yang berubah ditandai "(G14)" di bawah.

**Legenda.** Kode: `[B]` DIBANGUN, `[S]` STUB, `[K]` BEKU-KEBIJAKAN (fungsi ada, belum dipakai layar/API), `[M]` DIMATIKAN, `—` tidak ada. MVP Inti: DB = DIBANGUN, SD = SEDANG DIBANGUN (irisan S1/S2), TD = DITUNDA, TP = TIDAK DIRENCANAKAN. Kategori: A konsisten, B kode-tanpa-desain ("magic" kandidat), C desain-tanpa-kode, D hanya dokumen, E bertentangan. Penpot ditulis tanpa awalan `SCR-`.

---
## 1. Matriks keterlacakan

Satu baris = satu unit alur. Kolom: U-ID | nama awam | Penpot | Kode | Dokumen | MVP | Kat. Catatan di dalam sel hanya bila perlu; rincian ada di bagian 2 dan 3.

### 1a. Akun dan akses (A)
| U-ID | Unit | Penpot | Kode | Dokumen | MVP | Kat |
|---|---|---|---|---|---|---|
| A01 | Layar Masuk dengan Google (satu-satunya jalan masuk di produksi) | AKUN-01, AT-01, AT-03 | RT-02[B], AUTO-08[B], ENV-05 | FIT-01, DEC-04 | DB | A |
| A02 | Teks dan tautan di layar masuk: "akun baru perlu disetujui admin", Bantuan, Kebijakan Privasi | AKUN-01 | — (login tidak menyebut persetujuan; tak ada Bantuan/Privasi) | FIT-73 | TD | C |
| A03 | Layar pemilih akun Google (milik Google, bukan buatan kita) | AKUN-02 | — | — | DB | A |
| A04 | Akun baru dibuat otomatis berstatus Menunggu | AT-02 | AUTO-03[B], AUTO-04[B], ST-01[B] | FIT-02, FLW-01 | DB | A |
| A05 | Layar "Menunggu persetujuan": Cek lagi, Keluar | AKUN-03, AT-02, G-10 | RT-05[B] | FIT-03, DEC-27, KON-20, FLW-01 | DB | E |
| A06 | Layar "Ditolak" + alasan dari Admin | AKUN-05(hanya mobile), AT-02, G-03 | RT-05[B], ST-01[B] | FLW-03 | DB | E |
| A07 | Layar "Akun diblokir" dan gagal masuk saat diblokir | AKUN-05(hanya mobile), AT-02 | RT-04[B], AUTO-12[B] | FIT-04, FLW-05 | DB | E |
| A08 | Setelah masuk, diarahkan ke "rumah" menurut peran dan keadaan (Member/PM `/app`, Admin `/dashboard`, Super-admin `/dev`, tertahan `/waiting`/`/banned`, tamu `/login`) | AKUN-04 (hanya "ke Beranda") | RT-03[B], PERM-01..04[B] | FLW-04, FLW-06 | DB | B |
| A09 | Keluar (dengan konfirmasi) | AKUN-03, PENGATURAN-01 (G-10 tanpa tujuan) | RT-04[B], RT-05[B] | RUL-38 | DB | A |
| A10 | Admin menyetujui akun + memilih peran awal Member/PM | PENGGUNA-01, AT-04 | CON-02[B], API-36[B], AUD-06[B], RT-20[B] | FIT-05, FLW-01 | DB | A |
| A11 | Admin menolak akun dengan alasan 3-200 huruf; boleh disetujui ulang | PENGGUNA-01, AT-04 | API-37[B], DEN-17[B], ST-01[B] | FLW-03, RUL-26 | DB | A |
| A12 | Status akun dan tabnya (Menunggu, Disetujui, Ditolak, Diblokir); "disetujui lalu ditolak" tidak ada | PENGGUNA-01, PENGGUNA-02 | ST-01[B], CON-03[B], API-30[B], API-31[B] | FIT-07, GLO-12 | DB | E |
| A13 | Admin mengubah peran Member<->Project Manager | PENGGUNA-02, AT-05 | API-32[B], PERM-12[B], AUD-01[B], CON-03[B] | FIT-07, RUL-24 | DB | E |
| A14 | Blokir/buka blokir akun (alasan, Permanen/1/7/30 hari, habis sendiri, semua sesi dan kunci API langsung mati) | PENGGUNA-02 ("Nonaktifkan") | API-34[B], API-35[B], AUTO-12[B], AUTO-07[B], AUD-02[B], AUD-03[B] | FIT-07, FLW-05 | DB | E |
| A15 | Batas peran: Admin tak bisa menyentuh Admin, Super-admin, atau dirinya; hanya Super-admin mengangkat Admin | AT-05 ("Admin terakhir tak bisa diturunkan") | PERM-10..15[B], DEN-04[B], DEN-07[B], DEN-08[B] | DEC-31, KON-18, FLW-07, RUL-24 | DB | E |
| A16 | Undangan: email + peran, berlaku 14 hari, maks 100 aktif, satu per email; pendaftar terundang langsung disetujui | — | CON-04[B], API-38..40[B], ST-02[B], AUTO-03[B], AUTO-04[B], AUD-08..10[B], DEN-33[B] | FIT-06, FLW-02, RUL-25 | DB | B |
| A17 | Super-admin hanya dari konfigurasi server; dicabut dari konfigurasi = turun jadi Member otomatis | — | AUTO-01[B], AUTO-02[B], PERM-04[B], ENV-06 | RUL-27, GLO-30 | DB | B |
| A18 | Batas domain email pendaftar | — | AUTO-03[B], ENV-07 | DEC-03, RUL-31 | DB | B |
| A19 | Antrean persetujuan terlihat: lencana angka di menu dan kartu "menunggu" di beranda Admin | BERANDA-01A, INBOX-01 (kartu), G-07 | CON-01[B] | FIT-09, FLW-08, FLW-09 | DB | A |
| A20 | Menyamar sebagai pengguna (Super-admin, 1 jam; hapus/ubah peran/setujui/undang ditolak) | — | AUTO-11[B], ST-05[B], PERM-15[B], DEN-09[B], AUD-05[B] | FIT-11, FLW-25, DEC-10 | DB | B |
| A21 | Super-admin menghapus pengguna permanen | — | API-33[B], PERM-14[B], AUD-04[B], CON-11[B] | FIT-17 (hanya hapus akun S6) | DB | B |
| A22 | Hapus akun sendiri (kartu "Zona bahaya" di /profile; tanpa pra-cek Pengelola tunggal) | — | RT-18[B], API-01[B] | FIT-17: "disembunyikan dari pengguna biasa", TD | TD | E |
| A23 | Foto dan nama profil (ubah, hapus foto, maks 2 MB) | AKUN-03, PENGATURAN-02 | API-11[B], API-12[B], RT-18[B], DEN-29[B] | FIT-62 | DB | A |
| A24 | Profil lengkap: nama panggilan, HP, jabatan, divisi | AKUN-03, PENGATURAN-02 | API-13[B](G14, tanpa layar) | FIT-62, RUL-32 | SD | C |
| A25 | Ukuran teks Normal/Besar/Sangat besar (berlaku di semua layar) | AKUN-03, PENGATURAN-01, AT-22 | AUTO-70[B](server saja, G14), API-13[B] | FIT-63, FLW-19, DEC-17 | SD | C |
| A26 | Halaman Pengaturan di menu samping | PENGATURAN-01, PENGATURAN-02 | RT-17[S](redirect ke /profile), RT-18[B] | FIT-62, DEC-54 | SD | E |
| A27 | Kartu keamanan di /profile: kata sandi, akun tertaut, perangkat dan sesi, ganti akun (maks 5), riwayat masuk | — | RT-18[B], API-20[B] | FIT-62 | DB | B |
| A28 | Kunci API pribadi (maks 10, 1-365 hari, cakupan dibatasi peran) | — | API-22[B], AUTO-82[B], AUD-26..30[B] | FIT-13, FIT-62 | DB | B |
| A29 | Hal yang ditolak untuk kunci API (setujui akun, ubah peran, undang, hapus proyek, anggota, profil, foto, kelola kunci) | — | API-01[B], API-11[B], API-22[B], API-32[B], API-36..40[B] | FIT-13, RUL-30, DEC-22, KON-23 | DB | B |
| A30 | Akun menunggu/ditolak/diblokir tak bisa memakai API, kunci, atau sesi lama | — | AUTO-06[B], AUTO-07[B], DEN-30..32[B] | RUL-29 | DB | B |
| A31 | Masuk email+kata sandi (hanya komputer pengembang) | — | AUTO-08[B], RT-02[B], ENV-01 | DEC-04, RUL-28 | DB | B |
| A32 | Halaman awal `/` (landing templat "Fullstack Template") | — | RT-01[B] | — | DB | B |
| A33 | Menu samping: 4 menu aktif (Beranda, Proyek, Tugas, Pengaturan) vs 8 menu di wireframe | seluruh layar (sidebar), G-07 | NAV app/layout[B], RT-06..17 | DEC-54, KON-11, RIS-04 | DB | E |
| A34 | Empat peran akun + tiga peran di proyek; Super-admin tidak ada di wireframe | PROYEK-11, PENGGUNA-02 | PERM-01..04[B], PERM-20..31[K] | FIT-08, GLO-30..37 | DB | B |

### 1b. Beranda (B)
| U-ID | Unit | Penpot | Kode | Dokumen | MVP | Kat |
|---|---|---|---|---|---|---|
| B01 | Beranda produk: briefing, fokus, tanya data, agenda, proyek saya | BERANDA-01 | RT-06[B](placeholder) | FIT-18, TND-02, KON-13 | TD | C |
| B02 | Beranda per peran (Member, PM, Admin; kartu "Periksa", "PERLU TINDAKAN") | BERANDA-01M, BERANDA-01P, BERANDA-01A | RT-06[B], RT-19[B] | FIT-18 | TD | C |
| B03 | Beranda nyata sekarang: "Beranda Anda masih kosong" + tombol ke proyek dan tugas | — | RT-06[B] | FIT-18 (S2-17) | DB | B |
| B04 | Beranda Admin sungguhan = `/dashboard` (satu kartu: jumlah menunggu) | BERANDA-01A | RT-19[B], CON-01[B] | D00 §2 | DB | E |

### 1c. Proyek (P)
| U-ID | Unit | Penpot | Kode | Dokumen | MVP | Kat |
|---|---|---|---|---|---|---|
| P01 | Daftar proyek: cari, saring status, urut, "saya/semua" | PROYEK-01 | RT-07[S], API-14[B](baca, G14) | FIT-21, RUL-47 | SD | A |
| P02 | Member hanya melihat proyek yang ia ikuti ("semua" diam-diam jadi "saya") | PROYEK-01, NOTE-PROYEK-04 | PERM-24[K], API-14[B] | RUL-20 | SD | A |
| P03 | Member tanpa proyek: "Anda belum masuk proyek apa pun" | PROYEK-02, TUGAS-04 | RT-07[S] | FLW-20, RIS-02 | SD | A |
| P04 | Buat proyek lewat satu form | PROYEK-04, AT-10 | RT-08[S], PERM-21[B](tanpa POST) | FIT-23, FLW-10 | SD | A |
| P05 | Layar "pilih cara membuat proyek" (form / cerita AI / template) | PROYEK-03 | — | FIT-23 (langsung tanpa pilih cara) | TP | C |
| P06 | Proyek dari cerita (AI) + periksa draf | PROYEK-05, PROYEK-06, AT-19, NOTE-PROYEK-02 | — | FIT-36, KON-03 | TP | C |
| P07 | Proyek dari template; simpan sebagai template | PROYEK-07 | — | FIT-35, TND-19 | TP | C |
| P08 | Pembuat otomatis jadi Pengelola dan Pengelola utama; jenis tugas bawaan Tugas/Bug/Ide | PROYEK-04, AT-10 | PERM-25[K], limits DEFAULT_TASK_KINDS | RUL-19, RUL-45 | SD | A |
| P09 | Detail proyek, tab Ringkasan (progres, kondisi + alasan, tugas perlu perhatian) | PROYEK-08 | RT-09[S], RT-10[S], API-14[B](G14) | FIT-24, FIT-25 | SD | A |
| P10 | Detail proyek, tab Tugas | PROYEK-09 | RT-11[S] | FIT-24 | SD | A |
| P11 | Detail proyek, tab Anggota: tambah, ubah peran, keluarkan | PROYEK-11 | RT-12[S], API-15[B](baca saja, G14), PERM-25[K] | FIT-26 | SD | A |
| P12 | Pengelola utama (Lead) di header proyek | PROYEK-04, PROYEK-11, AT-10, G-08 | PERM-26[K], DEN-14[K], DEN-24[K] | FIT-27, KON-14 | SD | E |
| P13 | Pengelola terakhir tak bisa dikeluarkan/diturunkan; saran "tambah pengelola kedua" | PROYEK-11, AT-09, TUGAS-09 | PERM-25[K], DEN-13[K] | FLW-11, RUL-18 | SD | A |
| P14 | Anggota tak bisa keluar proyek sendiri | — | rules MEMBER_CAN_LEAVE_PROJECT=false[K] | DEC-51, RUL-22 | SD | B |
| P15 | Peran di proyek (Pengelola/Anggota/Pemantau); Admin selalu penuh; PM bukan anggota hanya baca tanpa komentar | PROYEK-11 (Arti peran), NOTE-PROYEK-03, NOTE-PROYEK-04, AT-08 | PERM-20..31[K], ENV-22 | RUL-15, RUL-21, RUL-23, DEC-08 | SD | A |
| P16 | Proyek yang tak boleh dilihat dijawab "tidak ditemukan" (bukan "dilarang") | PROYEK-02, PROYEK-03 (versi "Tidak tersedia untuk Member"; layarnya sendiri milik P05) | DEN-21[B], level PERM-20[K] | RUL-20, FLW-10 ("halaman 403") | DB | E |
| P17 | Ubah info proyek, status manual 5 nilai, tenggat langsung | NOTE-PROYEK-04 (hanya matriks, tanpa layar) | RT-13[S], PERM-22[K] | FIT-28, KON-16 | SD | D |
| P18 | Perpanjang tenggat (alasan wajib) + "Diperpanjang xN" + riwayat tenggat | PROYEK-12, PROYEK-08, PROYEK-10, AT-07 | — | FIT-32, FLW-18 | TD | C |
| P19 | Tahapan dan target penting (milestone) | PROYEK-10 | — (milestone belum bertabel) | FIT-30, FIT-31 | TD | C |
| P20 | Ganti kondisi manual; kartu "Aktivitas terakhir" | PROYEK-08 | — | FIT-33, FIT-34 | TD | C |
| P21 | Kondisi proyek dihitung: Lancar/Perlu perhatian/Terlambat + alasan (hanya proyek Berjalan) | AT-12, PROYEK-01, PROYEK-08 | AUTO-58[B](G14, API) | FIT-25, RUL-05, RUL-06, DEC-38 | SD | A |
| P22 | Progres proyek % (bulat, maks 99 sebelum semua selesai, "Belum ada tugas") | AT-12, G-04 | AUTO-51[B](G14, API) | RUL-01, RUL-02, DEC-49, DEC-50, KON-08 | SD | E |
| P23 | Waktu berjalan % | AT-12, PROYEK-08 | AUTO-52[B] | RUL-07 | SD | A |
| P24 | Hapus proyek ke Sampah (dialog dampak) | NOTE-PROYEK-04, NOTE-SAMPAH-01 | API-14[S](trash), ST-03[K], ENV-21, PERM-23[K] | FIT-29, DEC-23, KON-01 | SD | A |
| P25 | Siapa boleh hapus proyek (Member-Pengelola tidak) | NOTE-PROYEK-04 (Pengelola boleh) | PERM-23[K], DEN-19[K] | DEC-24, RUL-17, RIS-05 | SD | E |
| P26 | Halaman Sampah minimal: daftar proyek terhapus + Pulihkan | SAMPAH-01, SAMPAH-02 | API-14[S](app-trash); tak ada halaman | FIT-29, FLW-12, KON-02 | SD | A |
| P27 | Hapus proyek ikut memindahkan tugasnya dan ikut pulih | NOTE-SAMPAH-01 | ST-03[K] (soft-delete) | DEC-35, FLW-14 | SD | A |
| P28 | Tampilan Grid + kolom "Perlu perhatian" | — | — | FIT-22, TND-11 | TD | D |

### 1d. Tugas (T)
| U-ID | Unit | Penpot | Kode | Dokumen | MVP | Kat |
|---|---|---|---|---|---|---|
| T01 | Tugas saya: daftar dengan kelompok jadwal | TUGAS-01, AT-13 | RT-14[S], server/task query[B tanpa rute], API-16[S] | FIT-37 | SD | A |
| T02 | Kelompok jadwal: Terlambat, Hari ini, Besok, Minggu ini, Nanti, Tanpa tenggat ("Minggu ini" kosong Sabtu/Minggu) | TUGAS-01, AT-13 | schedule.ts[B tanpa rute] | RUL-09, CHANGELOG B-7 | SD | E |
| T03 | Semua tugas (tabel maks 5 kolom, kartu di layar kecil) | TUGAS-02 | RT-14[S] | FIT-38 | SD | A |
| T04 | Cari dan saring tugas (proyek, orang, prioritas, status, urut) | TUGAS-01, TUGAS-02 | task.query[B tanpa rute] | FIT-45 | SD | A |
| T05 | Papan (Kanban) dengan tombol pindah | TUGAS-03 | — | FIT-49, TND-06 | TD | C |
| T06 | Tugas saya kosong | TUGAS-04 | RT-14[S] | FLW-20 | SD | A |
| T07 | Buat tugas lewat form | TUGAS-06 | RT-15[S], PERM-28[K] | FIT-39 | SD | A |
| T08 | Member tanpa proyek tak bisa membuat tugas (tombol mati + alasan) | TUGAS-04 | PERM-28[K] | DEC-06, RIS-02 | SD | A |
| T09 | "Tulis saja" (AI menyusun tugas) | TUGAS-05, AT-19, NOTE-TUGAS-04 | — | FIT-66, TND-18 | TP | C |
| T10 | Impor dan unduh CSV | TUGAS-07, TUGAS-02, AT-16 | — | FIT-65, KON-04, TND-17 | TP | C |
| T11 | Detail tugas halaman penuh `/app/tasks/:nomor` | TUGAS-08..10 | RT-16[S], task-detail.query[B tanpa rute] | FIT-41, DEC-12, KON-10 | SD | A |
| T12 | Mulai kerjakan, Batal mulai, Tandai selesai (juga langsung dari Belum dikerjakan) | TUGAS-08, TUGAS-09, NOTE-TUGAS-07, G-14 | ST-04[K] #1-#4, API-17[S], PERM-35[K] | FLW-15, RUL-11, FIT-40 | SD | A |
| T13 | Satu tombol "langkah berikutnya" per baris | NOTE-TUGAS-01 | ST-04[K] primaryAction | FIT-40, DEC-40 | SD | A |
| T14 | Yang memulai/menyelesaikan tugas tanpa pengerja otomatis jadi pengerjanya | NOTE-TUGAS-06 | ST-04[K] BECOMES_ASSIGNEE | RUL-12 | SD | A |
| T15 | Batalkan tugas (5 kategori, catatan bila "Lainnya") dan Pulihkan | TUGAS-11 | ST-04[K] #9-#12, DEN-18[K] | DEC-44, RUL-13 | SD | A |
| T16 | Buka lagi tugas selesai (alasan wajib; "Dibuka lagi xN") | NOTE-TUGAS-07, G-12 | ST-04[K] #8, DEN-17[B] | FLW-15, RUL-13 | SD | A |
| T17 | Minta diperiksa, Setujui, Kembalikan (alasan wajib) | TUGAS-10, TUGAS-11, AT-18 | ST-04[K] #5-#7, ENV-20[M] | FIT-46, KON-06, FLW-17 | TD | C |
| T18 | Saklar "Perlu diperiksa" (bawaan mati; Member hanya menyalakan; terkunci saat diperiksa) | TUGAS-06, TUGAS-08, TUGAS-12, AT-14 | PERM-32[K], PERM-33[K], ENV-20[M], DEN-11[K] | FIT-46, DEC-41 | TD | C |
| T19 | Pemilihan pemeriksa otomatis (pembuat, pengelola utama, pengelola tertua, lalu "Admin" + saran pengelola kedua) | TUGAS-09, TUGAS-10, AT-15, NOTE-TUGAS-02 | pickReviewer[K], DEN-27[K] | FLW-17, KON-26 | TD | C |
| T20 | Pengerja tak boleh memeriksa pekerjaannya sendiri, Admin dan Super-admin juga | NOTE-TUGAS-02, NOTE-TUGAS-03 | DEN-06[K] | DEC-07, KON-26 | TD | A |
| T21 | Hapus tugas ke Sampah (menu titik tiga) | TUGAS-08 | — | FIT-54, KON-12, DEC-16, RIS-01 | TD | C |
| T22 | Langkah (daftar periksa) serta komentar dan riwayat satu linimasa | TUGAS-08, TUGAS-09 | task-detail.query[B tanpa rute], API-18[S] | FIT-42, FIT-43 | SD | A |
| T23 | Bukti/lampiran | TUGAS-09, TUGAS-10 | — | FIT-52 | TD | C |
| T24 | Jenis tugas dan Tag; Pengaturan proyek | TUGAS-12 | DEN-25[B] (batas 6 tak dibaca) | FIT-48, FIT-53, TND-05, TND-12 | TD | C |
| T25 | Tertahan/Menahan (dependensi) | TUGAS-09 | AUTO-57[K] (masukan pemanggil) | FIT-47, TND-04 | TD | C |
| T26 | Satu label per baris: Terlambat > Menunggu diperiksa saya > Tertahan > Mandek > Dibuka lagi | NOTE-TUGAS-01, AT-13 | AUTO-55[K], AUTO-57[K] | RUL-03, RUL-04, KON-25 | SD | A |
| T27 | Terlambat = tenggat sebelum hari ini; "hari ini" satu zona WIB untuk semua | AT-13, G-02 | AUTO-50[K], AUTO-53[K], AUTO-54[K] | RUL-03, RUL-09, DEC-02 | SD | E |
| T28 | Nomor tugas satu urutan global #N | TUGAS-08..10, G-06 | task.lookup.query[B tanpa rute] | DEC-43, RUL-46 | SD | E |
| T29 | Izin tugas per peran (lihat, buat, ubah milik sendiri, komentar) | NOTE-TUGAS-06 | PERM-27..34[K] | RUL-12, RUL-14, RUL-15 | SD | A |
| T30 | Proyek di Sampah mengunci semua aksi tugasnya | AT-20, SAMPAH-01 | DEN-15[K] | RUL-56, FLW-14 | SD | A |
| T31 | Proyek Selesai/Ditunda/Dibatalkan tetap menerima tugas (banner lembut) | — | PERM-28[K], ENV flag Q12 | DEC-13, RIS-08 | SD | B |
| T32 | Pemantau hanya melihat dan berkomentar | NOTE-TUGAS-05, AT-08 | PERM-28..30[K] | RUL-14, RUL-15 | SD | A |

### 1e. Sistem diam-diam, konsol, dan modul di luar MVP (S, X)
| U-ID | Unit | Penpot | Kode | Dokumen | MVP | Kat |
|---|---|---|---|---|---|---|
| S01 | Batas laju per alamat jaringan (100 per menit) | — | AUTO-20[B], ENV-09, ENV-41, DEN-28[B], ENV-10 | RUL-44 | DB | B |
| S02 | Batas laju tulis per orang (60 per menit) di `/api/app` | — | AUTO-21[B], DEN-28[B] | RUL-44 | DB | B |
| S03 | Mode pemeliharaan (semua tutup kecuali peran terpilih) | — | AUTO-24[B], ENV-43, AUD-19[B] | — | DB | B |
| S04 | Konsol `/dev` Super-admin (15 halaman) | — | RT-21..35[B], CON-10..21[B], API-50..62[B] | FIT-14 | DB | B |
| S05 | Jejak audit aksi berhak istimewa | — | AUD-01..30[B], AUTO-80[B], CON-18[B], API-54[B] | FIT-77 | DB | B |
| S06 | Catatan kunjungan, riwayat masuk, retensi log otomatis | — | AUTO-23[B], AUTO-25[B], AUTO-40[B], ENV-42, CON-16[B] | RUL-51 | DB | B |
| S07 | Pekerjaan teknis: rollup kunci API, bersihkan akun demo, MCP, CLI, seed | — | AUTO-16[B], AUTO-41[B], AUTO-42[B], AUTO-81[B], AUTO-82[B], AUTO-84[B], API-62[B], ENV-08 | FIT-10, DEC-05 | DB | B |
| S08 | Pengaturan sistem: branding, saklar fitur, login email/pendaftaran (saklar pendaftaran tak berefek) | — | AUTO-86[B], ENV-40[B], ENV-45[B], AUD-12[B], AUD-20[B], API-02[B] | — | DB | B |
| S09 | Tidak ada email atau notifikasi; orang harus menekan "Cek lagi" | AT-02, TUGAS-10, NOTE-INBOX-01, NOTE-INBOX-02 | — (tak ada pengirim) | FIT-72, FIT-20, RIS-09 | TP | E |
| S10 | Pengalihan halaman tahan loop, sesi mati ke `/login?notice=session` | — | AUTO-06[B], AUTO-85[B] | FLW-06 | DB | B |
| S11 | API Super-admin menjawab pengalihan 302 (bukan JSON 401/403) | — | AUTO-85[B] | — | DB | B |
| S12 | Pembersihan Sampah proyek 30 hari | AT-20, NOTE-SAMPAH-01 | AUTO-46[K] (tak ada pekerjaan), ENV-11[K] | RUL-10, KON-02 | TD | C |
| X01 | Inbox, lonceng, kartu "perlu ditanggapi" | INBOX-*, NOTE-INBOX-01, NOTE-INBOX-02 | — | FIT-19, TND-01 | TD | C |
| X02 | Events: rapat, kalender, rekam, notulensi, tugas dari rapat (15 layar) | EVENTS-*, NOTE-EVENTS-01..06 | — | FIT-58..61, TND-15 | TD | C |
| X03 | Tim: daftar orang dan beban kerja | TIM-*, NOTE-TIM-01, NOTE-TIM-02 | — | FIT-56, TND-14 | TD | C |
| X04 | Sampah penuh (tugas, event), Urungkan, Hapus permanen (Admin) | SAMPAH-03, SAMPAH-04, AT-20 | — | FIT-55, FLW-13, DEC-16, DEC-36 | TD | C |
| X05 | Pemilih orang (nama + jabatan) saat menunjuk pengerja/anggota | (tersirat di PROYEK-04, TUGAS-06) | API-14[S](team.picker) | FIT-75, DEC-09 | SD | D |
| X06 | Cuti dan ketersediaan | PENGATURAN-03, PENGATURAN-04, AT-21 | — | FIT-57, KON-29 | TP | C |
| X07 | Pengaturan tim Admin (saklar AI, lama simpan rekaman, pengingat, cuti, Peran dan izin) | PENGATURAN-01, NOTE-PENGATURAN-01 | — | FIT-16 | TD | C |
| X08 | Notifikasi di Pengaturan (dua saklar) | PENGATURAN-01 | — | FIT-64 | TD | C |
| X09 | Mode Pendamping | NOTE-PENGATURAN-02 | — | FIT-70, DEC-47 | TP | A |
| X10 | Bilah atas: Cari global, suara (ikon mikrofon), tombol "Huruf A" | (bilah atas semua layar) | — | FIT-66 | TP | C |
| X11 | Layar Keano: Kanban, Kalender, Gantt, Channel, versi HP | (halaman Keano, tidak dibaca per elemen) | — | FIT-67, FIT-68, DEC-34 | TP | C |

---
## 2. Daftar selisih untuk diputuskan pemilik

Urut dari yang paling berdampak ke audiens awam. Rekomendasi: MD = masukkan ke diagram; TD = tandai ditunda; KD = koreksi dokumen; KW = koreksi wireframe; UK = ubah kode atau teks UI; PP = perlu keputusan pemilik. (Kode `Z` dipakai agar tidak tertukar dengan berkas desain D00-D09 atau diagram.)

| # | Selisih | Kat | U-ID | Bukti | Kenapa penting bagi audiens | Rek. |
|---|---|---|---|---|---|---|
| Z01 | Layar "Menunggu persetujuan": wireframe punya form profil (nama, HP, jabatan, divisi, ukuran teks, Simpan profil, Cek status); kode hanya penjelasan + Cek lagi + Keluar | E | A05 | AKUN-03, G-10; RT-05; DEC-27, KON-20 | Layar pertama semua pendatang baru; wireframe menjanjikan yang tak ada | KW (kode+KEP menang) |
| Z02 | Ditolak dan diblokir: wireframe = kembali ke Login + pesan "Akses ditolak" (layarnya hanya di mobile). Kode: Ditolak tetap di `/waiting` dengan alasan; Diblokir dengan sesi hidup ke `/banned` (alasan, tanggal berakhir); mencoba masuk lagi saat diblokir = pesan "Akun ini diblokir" di Login tanpa alasan | E | A06, A07 | AT-02, G-03; RT-04, RT-05, `auth-errors.ts`; FLW-03, FLW-05 | Tiga ujung berbeda untuk "tidak boleh masuk" | KW; diagram ikuti kode |
| Z03 | Jalur Super-admin tidak ada di wireframe; peran hanya dari konfigurasi server dan turun otomatis jadi Member bila emailnya dicabut (cukup dengan membuka halaman) | B | A17, A34 | AUTO-01, AUTO-02, PERM-04 (diverifikasi `permissions.ts:74`, `roles.ts`) | Aturan tersembunyi paling mengejutkan: siapa memegang kunci sistem | MD (diagram Super-admin + kartu R1) |
| Z04 | Undangan tidak ada di wireframe: Admin mengundang email + peran, orang itu begitu masuk Google langsung disetujui tanpa antrean | B | A16 | CON-04, API-38..40, ST-02, AUTO-03; FLW-02 | Ada dua pintu masuk (antre atau diundang), wireframe hanya satu | MD (kartu R4) |
| Z05 | "Admin terakhir tidak bisa diturunkan" (wireframe, desain D04) vs kode: Admin tak bisa menyentuh Admin sama sekali; hanya Super-admin | E | A15 | AT-05; PERM-10..15, `user.policy.ts`; DEC-31, KON-18 | Soal "siapa menjaga siapa" | KW + KD |
| Z06 | Wireframe berjanji "pemeriksa dapat notifikasi", "Anda akan diberi tahu", lonceng Inbox. Kode: tidak ada email atau notifikasi sama sekali; orang menekan "Cek lagi" | E | S09, X01 | AT-02, TUGAS-10, NOTE-INBOX-01; FIT-72, FIT-20, RIS-09 | Janji yang tak ditepati bila dipresentasikan sebagai alur | KW (teks) + TD; kartu R20 |
| Z07 | Menu samping: 8 menu di wireframe (Inbox, Events, Tim, Sampah) vs 4 aktif di kode (Beranda, Proyek, Tugas, Pengaturan); Admin/Super-admin punya tautan Dashboard/Dev | E | A33 | sidebar semua layar; NAV `app/layout.tsx`; DEC-54, KON-11 | Peta paling dasar | KW + TD; diagram pakai 4 menu |
| Z08 | Beranda penuh (briefing, fokus, tanya data, agenda, varian per peran) vs beranda kosong + dua tombol; Admin mendarat di `/dashboard`, Super-admin di `/dev` | C, E | B01, B02, B03, B04, A08 | BERANDA-01..01A; RT-06, RT-19; FIT-18, KON-13 | Wireframe paling ramai adalah yang paling belum ada | TD; PP untuk KON-13 (beranda berdata contoh di cabang prototipe) |
| Z09 | Alur Periksa (Minta diperiksa/Setujui/Kembalikan, saklar "Perlu diperiksa", pemilih pemeriksa) ada di wireframe dan kebijakan kode, tetapi dimatikan (`TASK_REVIEW_UI_ENABLED=false`), tanpa tombol atau API | C | T17, T18, T19, T20 | TUGAS-06..11, AT-14, AT-15; ST-04, ENV-20; FIT-46, KON-06 | Dua jalur selesai berbeda (langsung vs diperiksa) | TD; status tugas tampil dua lapis |
| Z10 | Inbox, Events (15 layar), Tim: modul penuh di wireframe, tak ada kode | C | X01, X02, X03 | INBOX-*, EVENTS-*, TIM-*; FIT-19, FIT-56, FIT-58 | Setengah volume wireframe | TD (kotak pudar) |
| Z11 | Sampah penuh (tugas/event, Urungkan, Hapus permanen khusus Admin, hapus otomatis 30 hari) vs hanya Sampah proyek minimal yang direncanakan; janji "bisa dipulihkan sampai {tanggal}" belum diputuskan karena tak ada penghapus otomatis | C | X04, S12, P26 | SAMPAH-01..04, AT-20; AUTO-46; FIT-55, KON-02 | Pemulihan adalah rasa aman audiens | TD (X04); PP untuk KON-02 |
| Z12 | Fitur wireframe yang sengaja tak dibangun: Papan, "Tulis saja" AI, "Ceritakan proyeknya" AI, Template, CSV, "pilih cara buat proyek" | C | T05, T09, T10, P05, P06, P07 | TUGAS-03/05/07, PROYEK-03/05/06/07; FIT-36, FIT-65, KON-03, KON-04 | Audiens akan bertanya "mana AI-nya"; desain D02 #8, D03 #11 masih memuatnya | TD/tidak direncanakan; KD |
| Z13 | Perpanjang tenggat, Tahapan, Target penting, Aktivitas terakhir, kondisi manual: wireframe penuh, kode tak ada (`/tahapan` 404) | C | P18, P19, P20 | PROYEK-08, 10, 12; FIT-30..34 | Tab Tahapan tampak di gambar | TD |
| Z14 | Hapus tugas, bukti/lampiran, jenis tugas, Tag, Tertahan: di wireframe, tak ada kode | C | T21, T23, T24, T25 | TUGAS-08, 09, 12; FIT-48, FIT-52, FIT-54, KON-12 | Mencari tombol "Hapus tugas" yang tak ada (RIS-01) | TD |
| Z15 | Pengaturan: wireframe (ubah profil, ukuran teks, notifikasi, cuti, keluar, pengaturan tim) vs kode (menu menuju `/profile`: kata sandi, akun tertaut, perangkat, kunci API, riwayat masuk, hapus akun). Ukuran teks dan profil lengkap punya API nyata, belum ada kontrol di layar | E, C | A24, A25, A26, A27, X07, X08 | PENGATURAN-01..04; RT-17, RT-18, API-13, AUTO-70; FIT-62, FIT-63 | Menu "Pengaturan" membuka halaman yang tak mirip gambar | KW untuk isi; TD layar S1-14/15 |
| Z16 | Progres "70%" di wireframe vs rumus 17% (1 dari 6 tugas selesai) | E | P22 | G-04, PROYEK-01, 08; AUTO-51; DEC-49, KON-08 | Angka paling mudah dicek | KW |
| Z17 | Hapus akun sendiri tampil bagi semua orang di /profile; dokumen bilang disembunyikan (S6). Penghapusan melepas Pengelola tunggal dari proyek tanpa pra-cek | E | A22 | `DangerZoneCard.tsx`; FIT-17; skema `project_member` cascade | Orang bisa menghilangkan pemilik proyek diam-diam | PP (sembunyikan di kode atau gambar apa adanya); lihat N03 |
| Z18 | Member yang jadi Pengelola: wireframe boleh memindahkan proyek ke Sampah; keputusan KEP: tidak (tombol tak tampil, tanpa penjelasan) | E | P25 | NOTE-PROYEK-04; PERM-23, DEN-19; DEC-24, RIS-05 | Orang bingung "kok tombolnya tak ada" | KW; kartu R32 |
| Z19 | Proyek yang tak boleh dilihat: wireframe "Tidak tersedia untuk Member", dokumen FLW-10 "halaman 403"; kode: "tidak ditemukan", sama dengan id acak | E | P16 | PROYEK-02/03; DEN-21; FLW-10 vs RUL-20 | Menjelaskan "kenapa proyek itu tak muncul" | KD (FLW-10) + KW |
| Z20 | Istilah: kode "Diblokir/Blokir" (durasi Permanen/1/7/30 hari, habis sendiri, semua sesi dicabut) vs Penpot dan glosarium "Dinonaktifkan/Nonaktifkan" | E | A12, A14 | PENGGUNA-02; `useUserActions.tsx`, `banned.tsx`; GLO-12 | Dua kata untuk satu keadaan | PP (default: "Diblokir"; KD glosarium + KW) |
| Z21 | Wireframe: "perubahan peran berlaku pada login berikutnya"; kode: langsung (peran dibaca dari DB tiap permintaan, tanpa cache sesi) | E | A13 | AT-05; `guard.ts` `resolveActor`, `auth.ts` (tanpa cookieCache) | Bila salah, audiens menunggu hal yang tak terjadi | KW (uji runtime kecil) |
| Z22 | Mode pemeliharaan menutup seluruh situs termasuk `/waiting`, `/banned`, `/app`, `/`; hanya `/login`, `/go`, auth API, aset tetap terbuka | B | S03 | AUTO-24, `settings-maintenance.ts:28-126` | Orang yang sudah masuk terjebak di halaman 503 | MD (kartu R22) |
| Z23 | Batas laju: 100 per menit per alamat jaringan; 60 tulis per menit per orang; hilang saat server restart; satu kantor berbagi jatah | B | S01, S02 | AUTO-20, AUTO-21 | "Kenapa tiba-tiba ditolak" | MD (kartu R23, R24) |
| Z24 | Kunci API: apa yang ditolak dan kunci mati begitu pemilik diblokir/menunggu | B | A28, A29, A30 | API-22, `scopes.ts`, `scopes.pm.ts`; AUTO-07 | Pintu otomatisasi yang tak tampak di wireframe | MD (kartu R21, R25-R27) |
| Z25 | Menyamar dan hapus pengguna permanen oleh Super-admin | B | A20, A21 | AUTO-11, ST-05, API-33 | Siapa bisa bertindak atas nama orang | MD (diagram Super-admin; R15-R17) |
| Z26 | Aturan proyek/tugas hanya di kode: "semua proyek" diam-diam jadi "proyek saya", Anggota tak bisa keluar sendiri, proyek Selesai tetap menerima tugas | B | P02, P14, T31 | PERM-24, rules, ENV Q12; DEC-13, DEC-51, RIS-08 | Perilaku "magic" yang ketahuan belakangan | MD (kartu R28, R33, R35) |
| Z27 | Istilah campur: Lead vs "Pengelola utama" (belum disetujui), Pengelola vs Project Manager, Anggota vs Member, "Perlu diperiksa" vs "Menunggu diperiksa", label Inggris di Beranda | E | P12 | G-08, PROYEK-04; GLO-05, KON-14, KON-15 | "Anggota" dipakai di dua tingkat | PP (default: Pengelola utama; selalu tulis "peran akun" vs "peran di proyek") |
| Z28 | Kelompok jadwal: wireframe Terlambat/Hari ini/Besok/Minggu ini; kode dan ERD juga Nanti dan Tanpa tenggat; "Minggu ini" kosong Sabtu dan Minggu (B-7 belum disetujui) | E | T02 | TUGAS-01, AT-13; `schedule.ts`, CHANGELOG | Pada akhir pekan kelompok "Minggu ini" kosong dan tugasnya jatuh ke "Nanti" | PP (B-7) + KW |
| Z29 | Tanggal "hari ini" beda antar board, nomor tugas bentrok, jalur panah salah nama (bagian 3) | E | T27, T28 | G-01, G-02, G-06 | Presentasi tersandung angka tak konsisten | KW |
| Z30 | Tidak ada layar "ubah proyek / ganti status manual / ubah tenggat langsung" di wireframe; dokumen dan kebijakan ada; KB-3/KB-12 belum disetujui | D | P17 | NOTE-PROYEK-04 (matriks saja); RT-13; FIT-28, KON-16 | Jalan mengubah proyek belum tergambar | PP (default ya, JDW §3) lalu MD |
| Z31 | Teks login tak menyebut "akun baru perlu disetujui admin" dan tak ada tautan Bantuan/Kebijakan Privasi (wireframe punya) | C | A02 | AKUN-01, AT-03; komponen login; FIT-73 | Pendatang baru kaget harus menunggu | PP (tambah satu kalimat atau hapus dari wireframe) |
| Z32 | Cuti, Mode Pendamping, Pengaturan tim Admin, Notifikasi, bilah atas (cari, suara, "Huruf A"), layar Keano (Kanban, Kalender, Gantt, Channel, HP): tidak direncanakan | C | X06, X07, X08, X10, X11 | PENGATURAN-03/04, AT-21; FIT-57, FIT-64, FIT-70; KON-29 | Menu yang tampak ada | TD/tidak direncanakan; KD |
| Z33 | Pemilih orang (nama + jabatan) dan Grid proyek ada di dokumen, tidak di Penpot | D | X05, P28 | FIT-75, FIT-22 | Teknis; tak perlu digambar | TD |
| Z34 | Konsol operasional (`/dev` 15 halaman, audit, kunjungan, retensi, pekerjaan teknis, pengaturan sistem) nyata, tak ada di wireframe | B | S04..S08 | RT-21..35, CON-10..21, AUD-*, AUTO-40 | Bagian terbesar kode yang tak tergambar | MD hanya satu kotak ringkas |
| Z35 | Layar awal `/` publik masih landing templat "Fullstack Template" | B | A32 | RT-01; DEC-21 | Kesan pertama bila demo dari alamat utama | PP (N11) |

### TEMUAN BUKAN-DIAGRAM
Kesalahan atau risiko nyata, bukan soal gambar. Kepastian: "pasti" = terbaca langsung di kode `69277e9`; "perlu uji" = butuh uji jalan.

| # | Temuan | Bukti | Kepastian | Rekomendasi |
|---|---|---|---|---|
| N01 | Teks "Akunmu belum disetujui admin. Kami akan memberi kabar lewat email." menjanjikan email yang tak ada. Saat ini TIDAK sampai ke pengguna (API memakai teks lain tanpa janji; `/waiting` tertulis "tekan Cek lagi"), tetapi akan muncul bila `PM_ERRORS.ACCOUNT_PENDING` dipakai | `server/pm/errors.ts:102`; `account/gate.ts`; grep app+server: satu kemunculan | pasti | UK: hapus kalimat itu |
| N02 | Wireframe menjanjikan pemberitahuan ("Anda akan diberi tahu saat disetujui atau dikembalikan", "pemeriksa dapat notifikasi") padahal mesin pemberitahuan baru S3 | TUGAS-10, alur TUGAS ①; FIT-20 | pasti | KW |
| N03 | Setiap pengguna masuk melihat kartu hapus akun sendiri di `/profile`. Anggota proyek ikut terhapus (`project_member.user_id` cascade), `lead_id` jadi kosong, tak ada pra-cek "Pengelola terakhir"; dokumen FIT-17 menyebut kartu itu disembunyikan | `DangerZoneCard.tsx`; `auth.ts` `deleteUser.enabled`; `schema.project.ts:32,68` | pasti (kode); akibat di proyek perlu uji | PP; minimal pra-cek atau sembunyikan |
| N04 | Akun Menunggu/Ditolak bisa memanggil endpoint Better Auth non-admin langsung: gerbang hanya menutup `/admin/*`, email di produksi, dan menolak `delete-user` saat menyamar; status akun tak diperiksa. Pasti dari kode: `/update-user` hanya mengubah nama dan foto (`role`, `approval*` bertanda `input:false`); kunci API buatan klien tak boleh membawa `permissions` (ditolak `SERVER_ONLY_PROPERTY`), jadi tak bercakupan dan ditolak `MISSING_SCOPE`; `delete-user` bisa menghapus diri sendiri | `auth-gate.ts:45-60`; `auth.ts:121-165`; `@better-auth/api-key/dist/index.mjs:729-735` | gerbang tak cek status: pasti; akibat: perlu uji | uji runtime (bagian 8); pertimbangkan gerbang status |
| N05 | Akun Ditolak bisa hapus akun sendiri lalu masuk Google lagi dan mendapat akun Menunggu baru: catatan penolakan hilang, Admin harus menolak ulang | N04 + `signup-gate.ts` | belum terbukti; perlu uji | uji runtime; PP |
| N06 | Saklar "Pendaftaran publik" di `/dev/settings` tak mencegah pendaftaran di server; hanya mengubah tampilan layar masuk di non-produksi (di produksi tak berefek, kartu diberi badge) | AUTO-86; `AuthSettingsCard.tsx`; grep `signupEnabled` | pasti | PP: ubah label atau hapus saklar |
| N07 | Mode pemeliharaan tak mengecualikan `/waiting`, `/banned`, `/app`, `/`; pengguna yang sudah masuk (di luar peran terpilih) hanya melihat 503 dengan tautan "Masuk sebagai admin" | `settings-maintenance.ts:28-126` | pasti | PP: kecualikan `/waiting` dan `/banned`? |
| N08 | Halaman `/` memanggil `resolveUserRole` yang menulis ke DB. Kasus tepi: akun Menunggu yang emailnya baru ditambahkan ke daftar Super-admin: guard menahan akun lebih dulu, tetapi `/` bisa menaikkan peran jadi super-admin sementara status tetap Menunggu; Admin tak bisa menyetujui target Super-admin (`TARGET_PROTECTED`) | `guard.ts:100-134`; `roles.ts`; `user.policy.ts:36-45`; `home.tsx:53` | dari baca kode; buntu belum diuji | uji runtime; catat sebagai risiko |
| N09 | API khusus Super-admin menjawab pengalihan 302 (bukan JSON 401/403) bila salah peran; bertentangan dengan konvensi "bentuk error API seragam" | AUTO-85, `guard.ts:26-30` | pasti | catat untuk S8; bukan untuk audiens |
| N10 | Kode galat `REASON_REQUIRED` memakai teks "alasan penolakan" juga untuk Kembalikan dan Buka lagi tugas | DEN-17, `DENY_UI` | pasti | UK (saat fitur dibangun) |
| N11 | Layar awal `/` dan judul tab masih templat ("Fullstack Template", deskripsi tumpukan teknologi) | `home.tsx:22-26`; `settings-branding.ts:13` | pasti | PP (DEC-21: narasi menunggu S8) |
| N12 | Dokumen basi: (a) `CHANGELOG.md` "Tag `contract-v1` belum dipasang" vs PROGRES "tag lokal dipasang"; (b) PROGRES tabel S1/S2 vs log G14 (KON-22); (c) RANGKUMAN-PRESENTASI "9 dari 92 tugas, 795 tes" (KON-21); (d) P3 §6.1 "tak ada jalur hapus proyek", R03 baris 177/356 (KON-01); (e) D02 #8, D09 #6 AI masuk v1 (KON-03); D03 #11, D04 #4 CSV fitur Member (KON-04); D04 "Admin terakhir" (KON-18) | lihat tiap KON | pasti | KD |
| N13 | Kata tombol: kode "Lanjutkan dengan Google", glosarium dan wireframe "Masuk dengan Google" (GLO-14) | `LoginForm.tsx:93`, AKUN-01 | pasti | PP (kecil) |

---
## 3. Pertentangan antar sumber dan pemenangnya

Hierarki: kode berjalan > KEP > PROGRES > rencana > riset > wireframe. Bukti tambahan di kode `69277e9` ditulis di kolom Bukti.

| # | Topik | Yang bertentangan | Pemenang | Bukti / alasan |
|---|---|---|---|---|
| K01 | Layar Menunggu | wireframe (form profil, Cek status) vs KEP pilihan A dan kode (tanpa form) | kode + KEP | RT-05; DEC-27; Z01 |
| K02 | Ditolak/diblokir | wireframe (kembali ke Login + "Akses ditolak") vs kode (`/waiting` dengan alasan, `/banned`, notice Login) | kode | RT-04, RT-05, `auth-errors.ts` |
| K03 | Admin terakhir | desain D04 dan wireframe vs D00 §3 dan kode (Admin tak menyentuh Admin) | kode + D00 | `user.policy.ts`; KON-18 |
| K04 | Progres Atlas | wireframe 70% vs rumus 17% | kode + X2 | AUTO-51; DEC-49 |
| K05 | Hapus proyek | P3 KB-1 "tak ada jalur UI" vs KEP §6 pilihan B | KEP | KON-01 |
| K06 | AI di v1 | D02 #8, D09 #6 vs KEP/X1-Q7 (fase 5, bawaan mati) | KEP | KON-03 |
| K07 | CSV fitur Member | D03 #11, D04 #4, wireframe vs P3/KEP (fase 5) | P3 + KEP | KON-04 |
| K08 | Mesin periksa | R10 T7 (S4) vs X2 N3 (S2) vs KB-6/P2 K2 | PROGRES/P3; kode: kebijakan lengkap tapi `ENV-20` mati | KON-06 |
| K09 | Jumlah menu | wireframe/D00 §2 (8) vs ADR2 (4) | kode `NAV` (4) | KON-11 |
| K10 | Hapus tugas | D03 #18, wireframe vs KEP X1-Q1 (S2 tak memasang) | KEP | KON-12 |
| K11 | Mandek | NOTE "3 hari" vs ">72 jam" | kode (`AUTO-55` >72 jam) | KON-25 |
| K12 | Siapa memeriksa | D02 "Setujui: Pengelola" vs pengerja tak boleh (termasuk Admin) | kode `DEN-06` + X2 K2 | KON-26 |
| K13 | Peran berlaku kapan | wireframe "login berikutnya" vs kode langsung | kode (perlu uji kecil) | Z21 |
| K14 | Ayu Admin atau Pemantau | D06/D07/Tim (Admin tercatat Pemantau) vs Admin selalu penuh | kode level `admin` + X2 K6 | KON-19, G-17 |
| K15 | Kartu hapus akun | FIT-17 "disembunyikan" vs kode tampil | kode (fakta); arah keputusan: pemilik | Z17 |
| K16 | Skala dan nama cookie teks | R08 1/1,125/1,25 dan `pm-text-size` vs R11/X1 | kode: `mk-text-size`, 1/1,25/1,5 | `text-size.ts`; KON-09 |
| K17 | Rute detail tugas | `:id` vs `:number` | kode `routes.ts` (`:number`) | KON-10 |
| K18 | Member-Pengelola hapus proyek | wireframe (boleh) vs KEP (tak boleh) | KEP + kode | Z18 |
| K19 | Proyek tersembunyi | "Tidak tersedia"/"halaman 403" vs 404 | kode | Z19 |
| K20 | Status G14 | PROGRES tabel "S1 0/18" dan inventaris kode `caa78f7` vs log "G14 digabung" | log PROGRES + kode `69277e9` (commit "mark wave G14 as merged") | butir G14 di awal berkas |
| K21 | Tombol Tandai selesai pada tugas ber-Perlu-diperiksa | NOTE-TUGAS-07 (kaki) vs panah todo/in_progress ke done | kode: boleh hanya bila `needsReview=false`, kalau tidak `REVIEW_REQUIRED` | ST-04 #3-#4; G-14 |
| K22 | Tanggal "hari ini" (G-02) | 01 ④ Selasa 6 Okt; 02, 03, Inbox/Tim/Sampah/Pengaturan Rabu 7 Okt; 04 dan Beranda per peran Kamis 8 Okt | Rabu 7 Okt 2026: "sisa 24 hari" (tenggat 31 Okt) dan "13 hari lagi" (20 Okt) hanya cocok dengan 7 Okt; jam beku tes juga Rabu 7 Okt 10.00 WIB | PROYEK-08; CHANGELOG |
| K23 | Angka tidak cocok (G-04) | Beranda 12/8/3 dan "Lihat semua tugas (9)" vs 5 tugas aktif dan 1 selesai; tahap mulai 28 Sep vs 25 Sep | rumus kode dan data Atlas | AUTO-51, DEC-49 |
| K24 | Nomor tugas bentrok (G-06) | #9, #15, #18, #19 dipakai dua tugas; board "(#12)" berisi #16; Nico mengembalikan #12 untuk Dodi padahal #12 dikerjakan Nico | nomor global tak dipakai ulang (DEC-43); wireframe harus dirapikan | DEC-43, RUL-46 |
| K25 | Jalur panah salah nama (G-01) | dua jalur bernama "alur ⑧ → ⑫" sebenarnya PROYEK-09 -> TUGAS-09 dan AKUN-04 -> BERANDA-01; satu salinan nyasar di board A | arti sebenarnya yang dipakai di diagram; nama dan salinan nyasar dikoreksi | G-01 |
| K26 | Layar tanpa alur masuk/keluar | TUGAS-12 tanpa panah masuk (menu titik tiga tak digambar G-11); AKUN-05 hanya di mobile; SAMPAH-03 berisi layar Events; modal "Buka lagi" dan "Pulihkan" tak ada (G-12); tujuan Bantuan, Privasi, Cek status, Simpan profil, Keluar tak tertulis (G-10); impor "kembali ke ①" padahal dari ② (G-13) | tidak digambar sebagai alur sampai diperbaiki; kode tak membuktikan apa pun | G-03, G-10..G-13, G-17 |
| K27 | Dua "dunia" contoh (G-05) | Beranda 04 (Hajatan Keluarga, Renovasi Dapur, Arisan RT) vs menu lain (Atlas, Portal Klien PT Sinar) | Atlas dan Sinar (data seed dan dokumen); satu kasus untuk seluruh presentasi | GLO-48 |
| K28 | Istilah (G-08), email contoh (G-15), placeholder (G-18), rujukan tak terdefinisi (G-16) | campur Indonesia/Inggris, dua email untuk orang yang sama | glosarium GLO-01..21; sisanya dibereskan di wireframe | KON-14, KON-15 |
| K29 | Sidebar tanpa "Pengguna" di salinan Admin (G-07) | sebagian salinan punya, sebagian tidak | kode: Admin lewat menu Dashboard -> Pengguna | CON-01 |

---
## 4. Rencana diagram (usulan; pemilik memutuskan)

Prinsip: bahasa awam, maksimal ±12 kotak per diagram, kotak ditunda dipudarkan dengan tulisan "belum ada" dan irisannya, setiap diagram punya jalur bawah "Yang dilakukan sistem sendiri". Tokoh: Nico = Project Manager, Dodi = Member, Sri = Pemantau (peran di proyek, akun Member), Ayu = Admin, satu tokoh baru Super-admin (tidak ada di wireframe, nyata di kode). Satu pertanyaan per diagram. Satu kotak boleh mewakili beberapa U-ID berurutan; bila hasilnya melebihi 12 kotak (D08, D09), pecah jadi dua halaman (lihat/buat, lalu status). Kolom daftar adalah satu-satunya sumber hitungan bagian 6.

| Diag | Pertanyaan yang dijawab | Kotak (U-ID) | Pudar (U-ID) | Jalur sistem sendiri (U-ID) |
|---|---|---|---|---|
| D01 | Apa saja bagian aplikasi ini dan mana yang sudah jalan? | A01, A08, A10, A16, A17, A20, A26, A28, A33, A34, B03, B04, P01, P09, T01, T11, S01, S03, S04 | B01, B02, X01, X02, X03, X04, X06, X07 | S01, S02, S03, S06, S07 |
| D02 | Apa yang dilakukan Dodi (Member) dari masuk sampai menyelesaikan tugas? | A01, A04, A05, A09, A23, A24, A25, P01, P02, P03, P09, P10, T01, T06, T07, T08, T11, T12, T14, T15, T16, T29, T30 | T17, T18, T19, T20, B01 | A04, P02, T02, T26 |
| D03 | Apa yang dilakukan Nico (Project Manager) untuk membuat dan mengelola proyek? | A01, A08, P04, P08, P11, P12, P13, P15, P21, P22, P23, P24, P26, P27, T07, T12, T15 | P05, P06, P07, P18, P19, P20, T17, T19 | P08, P21, P22, P23, P27 |
| D04 | Apa yang boleh dan tidak boleh dilakukan Sri (Pemantau)? | P15, P16, T22, T29, T32 | — | — |
| D05 | Apa yang dilakukan Ayu (Admin) setiap hari? | A08, A10, A11, A12, A13, A14, A15, A16, A18, A19, B04, P15 | X01, X07 | A14, A16 |
| D06 | Apa yang hanya bisa dilakukan Super-admin dan apa yang terjadi otomatis padanya? | A08, A15, A17, A20, A21, A28, A29, S03, S04, S05, S06, S08 | — | A17, S03, S06, S07 |
| D07 | Dari klik "Masuk dengan Google" sampai layar mana orang berakhir? | A01, A03, A04, A05, A06, A07, A08, A09, A18, A22, A30, S09, S10 | A02 | A04, A30, S10 |
| D08 | Bagaimana proyek dibuat, dilihat, diubah, dihapus, dan dipulihkan? | P01, P02, P03, P04, P08, P09, P10, P11, P12, P13, P14, P15, P16, P17, P21, P22, P23, P24, P25, P26, P27 | P05, P06, P07, P18, P19, P20, P28 | P21, P22, P23, P27 |
| D09 | Bagaimana tugas dibuat, dikerjakan, selesai, dibatalkan, dibuka lagi? | T01, T02, T03, T04, T06, T07, T08, T11, T12, T13, T14, T15, T16, T20, T22, T26, T27, T28, T29, T30, T31, T32 | T05, T09, T10, T17, T18, T19, T21, T23, T24, T25 | T02, T14, T26, T27 |
| D10 | Apa yang dilihat orang di Beranda sekarang dan apa rencananya? | A33, B03, B04 | B01, B02, X10 | — |
| D11 | Apa isi halaman Pengguna milik Admin (tab Persetujuan, Semua, Undangan)? | A10, A11, A12, A13, A14, A15, A16, A19, A21, B04 | X07 | A14, A16 |
| D12 | Siapa boleh memindahkan akun dan undangan dari status mana ke mana? | A04, A06, A07, A10, A11, A12, A14, A15, A16, A17, A30 | — | A04, A14, A16, A30 |
| D13 | Proyek bisa berstatus apa, dan apa bedanya "status" (dipilih orang) dengan "kondisi" (dihitung)? | P17, P21, P22, P23, P24, P25, P26, P27, T31 | P18, P19, P20 | P21, P27 |
| D14 | Tugas bisa berstatus apa, dan siapa yang boleh memindahkannya? | T12, T14, T15, T16, T20, T26, T27, T30 | T17, T18, T19 | T26, T27 |
| D15 | Apa saja yang dilakukan sistem sendiri tanpa ada yang menekan tombol? | A04, A14, A16, A17, A30, P02, P21, P22, T02, T26, T27, S01, S02, S03, S06, S07, S09, S10, S11 | S12, X01 | (seluruh diagram ini) |

**Sengaja TIDAK digambar** (alasan): A27 kartu keamanan /profile, A31 masuk email dev, A32 halaman awal `/` templat, X05 pemilih orang, X08 notifikasi Pengaturan, X09 Mode Pendamping, X11 layar Keano: tidak membantu audiens memahami alur; A27 dan A31 hanya disebut di catatan kaki; A32 menunggu keputusan N11; X05 teknis; X08 bagian dari X07 yang sudah pudar; X09 sudah "ditunda" di Penpot sendiri; X11 desain lain di luar produk ini. Kode dan aturannya tetap muncul sebagai kartu (bagian 5) bila relevan.

---
## 5. Kartu aturan (R1-R58)

Status: BS = berlaku sekarang; SP = disiapkan di server tetapi belum terlihat di layar; TN = ditunda atau belum ada. Diagram: lokasi penandaan. Satu kalimat awam tiap kartu.

| R | Aturan | Status | Sumber | Diagram |
|---|---|---|---|---|
| R1 | Hanya email yang didaftarkan di pengaturan server yang bisa menjadi Super-admin; bila email itu dicabut atau tidak terverifikasi, orangnya otomatis turun jadi Member saat ia membuka aplikasi lagi. | BS | AUTO-01, AUTO-02, PERM-04, ENV-06 | D06, D15 |
| R2 | Orang baru yang masuk dengan Google tanpa undangan otomatis berstatus Menunggu sampai Admin menyetujuinya. | BS | AUTO-03, ST-01, DEN-30 | D07, D12 |
| R3 | Email dari domain di luar daftar yang diizinkan tidak bisa mendaftar, juga bila diundang; daftar kosong berarti semua domain boleh. | BS | AUTO-03, ENV-07, DEN-33 | D07 |
| R4 | Undangan Admin (email + peran) berlaku 14 hari, maksimal 100 aktif, satu per email; orang itu langsung disetujui begitu masuk dengan Google. | BS | AUTO-03, AUTO-04, ST-02, CON-04, API-38, API-39, API-40, AUD-08, AUD-09, AUD-10, DEN-33 | D05, D12 |
| R5 | Undangan hanya berlaku untuk orang yang belum pernah mendaftar; yang sudah menunggu tetap harus disetujui Admin. | BS | ST-02 | D12 |
| R6 | Admin hanya bisa mengundang atau memberi peran Member dan Project Manager; peran Admin hanya Super-admin yang bisa memberi. | BS | PERM-12, PERM-13, API-32 | D05, D12 |
| R7 | Akun yang menunggu atau ditolak tidak bisa memakai aplikasi, API, atau kunci API; layar Menunggu hanya punya Cek lagi dan Keluar. | BS | AUTO-06, AUTO-07, DEN-31, DEN-32, RT-05 | D07, D15 |
| R8 | Menolak akun wajib beralasan 3-200 huruf; orangnya membaca alasannya dan Admin masih bisa menyetujuinya kemudian. | BS | ST-01, DEN-17, API-37, AUD-07 | D12 |
| R9 | Akun yang sudah disetujui tidak bisa "ditolak"; untuk mencabut akses Admin memblokirnya. | BS | ST-01, DEN-10 | D12 |
| R10 | Memblokir (alasan opsional; Permanen, 1, 7, atau 30 hari) langsung mengeluarkan orangnya dari semua perangkat dan mematikan kunci API-nya; blokir sementara berakhir sendiri. | BS | ST-01, AUTO-12, API-34, API-35, AUD-02, AUD-03, RT-04 | D05, D12, D15 |
| R11 | Bila akun diblokir sekaligus menunggu, yang tampil layar Diblokir. | BS | ST-01, RT-04 | D07 |
| R12 | Admin tidak bisa menyetujui, menolak, memblokir, mengubah peran, atau menghapus Admin lain, Super-admin, atau akunnya sendiri. | BS | PERM-10, PERM-11, DEN-04, DEN-07, DEN-08 | D05, D12 |
| R13 | Mengangkat atau menurunkan Admin hanya Super-admin; Super-admin tidak bisa dibuat dari layar. | BS | PERM-03, PERM-12 | D06 |
| R14 | Perubahan peran berlaku langsung, tidak menunggu orangnya masuk lagi (perlu uji kecil). | BS | AUD-01, AUTO-02 | D05 |
| R15 | Super-admin yang menyamar (maksimal 1 jam, ada spanduk) tidak bisa menghapus, mengubah peran, menyetujui, menolak, mengundang, atau menghapus akun. | BS | AUTO-11, ST-05, DEN-09, AUD-05 | D06 |
| R16 | Super-admin tidak bisa menyamar sebagai sesama Super-admin atau diri sendiri. | BS | PERM-15, DEN-08 | D06 |
| R17 | Hanya Super-admin yang bisa menghapus pengguna permanen. | BS | API-33, PERM-14, AUD-04, CON-11, DEN-05 | D06 |
| R18 | Setiap orang yang masuk bisa menghapus akunnya sendiri dari halaman Profil, dan proyeknya bisa tinggal tanpa pengelola (dokumen menyebut kartu ini disembunyikan). | BS | RT-18, API-01 | D07 |
| R19 | Ukuran teks Normal, Besar, Sangat besar mengubah seluruh layar dan diingat setahun, tetapi tombol pilihnya belum ada di layar. | SP | AUTO-70, API-13 | D02 |
| R20 | Aplikasi tidak mengirim email atau pemberitahuan; orang menunggu harus menekan Cek lagi, dan Inbox belum ada. | BS | RT-05, ST-01 | D07, D01 |
| R21 | Kunci API pribadi: maksimal 10 aktif, berlaku 1 sampai 365 hari, tak melebihi peran pemilik, dan mati bila pemiliknya menunggu, ditolak, atau diblokir. | BS | API-22, AUTO-07, AUTO-82, AUD-26, AUD-27, AUD-28, AUD-29, AUD-30 | D06 |
| R22 | Mode pemeliharaan menutup semua halaman dan API kecuali untuk peran yang dipilih (bawaan Super-admin saja), termasuk layar Menunggu dan Diblokir; hanya halaman masuk dan jalur masuk Google tetap terbuka. | BS | AUTO-24, ENV-43, AUD-19 | D06, D15 |
| R23 | Lebih dari 100 permintaan per menit dari satu alamat jaringan ditolak sementara (satu kantor berbagi jatah; hitungan hilang bila server dimulai ulang). | BS | AUTO-20, ENV-09, ENV-41, DEN-28 | D15 |
| R24 | Perubahan data lewat API produk dibatasi 60 per menit per orang. | BS | AUTO-21, DEN-28 | D15 |
| R25 | Kunci API tidak bisa menyetujui, menolak, mengubah peran, atau mengundang akun. | BS | API-32, API-36, API-37, API-38, API-39, API-40 | D06 |
| R26 | Kunci API tidak bisa menghapus proyek, mengelola anggota, mengubah profil atau foto, atau mengelola kunci. | BS | API-11, API-12, API-13, API-14, API-15, API-22 | D06 |
| R27 | Kunci API hanya boleh memanggil rute yang sudah dipetakan; jalur masuk Google dan sesi selalu ditolak untuk kunci. | BS | API-01, API-21, API-61 | D06 |
| R28 | Member hanya melihat proyek yang ia ikuti; meminta "semua proyek" diam-diam menjadi "proyek saya"; Admin dan Project Manager melihat semua. | SP | PERM-24, API-14 | D02, D08 |
| R29 | Proyek atau tugas yang tak boleh dilihat tampil "tidak ditemukan", sama persis dengan yang tak ada. | BS | DEN-21, PERM-20, PERM-27 | D04, D08 |
| R30 | Pembuat proyek otomatis menjadi Pengelola dan Pengelola utama; hanya Admin, Project Manager, dan Super-admin boleh membuat proyek. | SP | PERM-21, PERM-02, DEN-05 | D03, D08 |
| R31 | Pengelola terakhir tidak bisa keluar atau diturunkan (juga Admin), dan Pengelola utama tidak bisa diturunkan atau dikeluarkan. | SP | PERM-25, PERM-26, DEN-13, DEN-14, DEN-24 | D03, D08 |
| R32 | Member yang ditunjuk jadi Pengelola boleh mengubah proyek tetapi tidak boleh menghapusnya. | SP | PERM-22, PERM-23, DEN-19 | D08 |
| R33 | Anggota tidak bisa keluar dari proyek sendiri; hanya Pengelola atau Admin yang mengeluarkan. | SP | PERM-25, DEN-01 | D08 |
| R34 | Project Manager yang bukan anggota hanya melihat, Pemantau melihat dan berkomentar, Admin selalu berhak penuh. | SP | PERM-20, PERM-30, DEN-02 | D04, D08 |
| R35 | Proyek Selesai, Ditunda, atau Dibatalkan tetap boleh ditambah tugas; hanya proyek di Sampah yang terkunci. | SP | PERM-28, DEN-15 | D08, D13 |
| R36 | Menghapus proyek memindahkannya ke Sampah bersama tugasnya, dan memulihkan mengembalikan semuanya; pembersihan otomatis 30 hari belum ada. | SP | ST-03, AUTO-46, ENV-21, ENV-11 | D08, D13 |
| R37 | Progres proyek = tugas selesai dibagi tugas yang dihitung (batal dan terhapus tidak dihitung, "Menunggu diperiksa" belum selesai), tak pernah 100% sebelum semua selesai, dan tanpa tugas tertulis "Belum ada tugas". | SP | AUTO-51 | D08, D13 |
| R38 | Kondisi hanya untuk proyek Berjalan: Terlambat bila tenggat lewat; Perlu perhatian bila ada tugas Tinggi/Kritis terlambat atau lebih dari 20% tugas aktif terlambat; selain itu Lancar, selalu dengan satu kalimat alasan. | SP | AUTO-58 | D13 |
| R39 | Waktu berjalan = hari berlalu dibanding rentang mulai-tenggat; tanpa dua tanggal tertulis "-". | SP | AUTO-52 | D08 |
| R40 | Tugas terlambat bila tenggatnya sebelum hari ini (tenggat hari ini belum terlambat), dan "hari ini" selalu jam Jakarta untuk semua orang. | SP | AUTO-50, AUTO-53, AUTO-54 | D09, D14 |
| R41 | Tugas "Mandek" bila Sedang dikerjakan dan lebih dari 3 hari tanpa kegiatan. | SP | AUTO-55 | D09 |
| R42 | Satu label per baris, urutan Terlambat, Menunggu diperiksa saya, Tertahan, Mandek, Dibuka lagi. | SP | AUTO-57 | D09 |
| R43 | Alur tugas: Belum dikerjakan, Sedang dikerjakan, Selesai (boleh langsung Selesai dari Belum dikerjakan); Dibatalkan bisa dipulihkan; perpindahan lain ditolak "status sudah berubah". | SP | ST-04, DEN-10 | D14 |
| R44 | "Tandai selesai" hanya untuk tugas yang "Perlu diperiksa"-nya mati; bila menyala harus lewat Minta diperiksa (saklarnya masih dimatikan). | TN | ST-04, DEN-12, ENV-20 | D14 |
| R45 | Pengerja tak boleh menyetujui hasil kerjanya sendiri, termasuk Admin dan Super-admin; bila tak ada orang lain, Minta diperiksa ditolak dengan pesan jelas. | TN | DEN-06, DEN-27, ST-04 | D14 |
| R46 | Pemeriksa dipilih otomatis: pembuat tugas bila Pengelola, lalu Pengelola utama, lalu Pengelola paling lama bergabung, lalu "Admin" dengan saran menambah pengelola kedua. | TN | ST-04, DEN-27 | D14 |
| R47 | Setujui dan Kembalikan hanya Pengelola atau Admin; Kembalikan wajib beralasan 3-200 huruf. | TN | ST-04, DEN-17, DEN-01 | D14 |
| R48 | Batalkan tugas wajib memilih satu dari lima alasan (catatan wajib bila "Lainnya"), hanya pembuat, Pengelola, atau Admin; Pulihkan ke Belum dikerjakan. | SP | ST-04, DEN-18, DEN-03 | D14 |
| R49 | Buka lagi tugas selesai wajib beralasan 3-200 huruf, oleh pembuat, pengerja, Pengelola, atau Admin. | SP | ST-04, DEN-17 | D14 |
| R50 | Anggota hanya mengubah tugas yang ia buat atau kerjakan; yang memulai tugas tanpa pengerja otomatis menjadi pengerjanya. | SP | PERM-29, DEN-03 | D09, D14 |
| R51 | Pemantau dan Project Manager yang bukan anggota tidak bisa membuat tugas; Member harus diajak ke proyek dulu. | SP | PERM-28, DEN-02 | D04, D09 |
| R52 | Semua aksi pada proyek yang ada di Sampah, termasuk tugasnya, ditolak sampai dipulihkan. | SP | DEN-15, PERM-22 | D08, D09 |
| R53 | Daftar tugas dikelompokkan Terlambat, Hari ini, Besok, Minggu ini (sampai Minggu), Nanti, Tanpa tenggat; Sabtu dan Minggu kelompok "Minggu ini" kosong (belum disetujui). | SP | AUTO-50, AUTO-54 | D09 |
| R54 | Tugas belum bisa dihapus, hanya dibatalkan; "Hapus ke Sampah" dengan Urungkan menyusul. | TN | ST-04, ST-03 | D09 |
| R55 | Nomor tugas satu urutan untuk semua proyek dan tidak dipakai ulang. | SP | (task.lookup G14; tanpa ID) | D09 |
| R56 | Tindakan penting (setuju, tolak, blokir, ubah peran, undang, hapus, menyamar, pengaturan, kunci API) tercatat di jejak audit yang hanya dibaca Super-admin; aksi proyek dan tugas belum tercatat. | BS | AUD-01..30, AUTO-80 | D06 |
| R57 | Setiap kunjungan halaman dan setiap masuk dicatat, dan catatan disimpan selamanya sampai Super-admin mengatur masa simpan. | BS | AUTO-23, AUTO-25, AUTO-40, ENV-42 | D06, D15 |
| R58 | Akun demo anonim lama dibersihkan otomatis sekali saat server menyala. | BS | AUTO-16, AUTO-42 | D15 |

---
## 6. Metrik kelengkapan

Cara menghitung (bisa diulang): `python3 -I tahapan-proyek/05-implementasi/flow/hitung-kelengkapan.py` membaca bagian 1, 4, dan 5 berkas ini dan inventaris kode. Butir kode "tercakup" = ID-nya tertulis di kolom Kode sebuah unit yang punya kotak (atau kotak pudar) di minimal satu diagram bagian 4, atau di kolom Sumber sebuah kartu bagian 5. Rentang seperti `PERM-10..15` diperluas hanya ke ID yang ada di inventaris. Penyebut = jumlah ID yang punya baris sendiri di inventaris kode (ST dihitung dari judul ST-01..05).

**Unit (121).** Menurut kelompok: Akun A 34, Beranda B 4, Proyek P 28, Tugas T 32, Sistem S 12, Modul di luar MVP X 11.

| Dihitung | Penpot | Kode | Dokumen |
|---|---|---|---|
| Unit yang punya isi di sumber itu (kolom bukan "—") | 95 | 96 | 116 |
| Ketiganya sekaligus | 71 unit | | |
| Hanya satu sumber (A03, A32, P28, S03, S08, S11) | 6 unit | | |

| Kategori | Unit | Penpot | Kode | Dokumen | Catatan |
|---|---|---|---|---|---|
| A konsisten | 42 | 42 | 40 | 41 | beberapa masih SD (kode API ada, layar belum) |
| B kode tanpa desain | 26 | 2 | 26 | 22 | 2 unit (A08, A34) punya Penpot sebagian |
| C desain tanpa kode | 31 | 31 | 10 | 31 | 10 unit punya kode beku/sebagian (kebijakan, API tanpa layar) |
| D hanya dokumen | 3 | 2 | 2 | 3 | P17, X05, P28 |
| E bertentangan | 19 | 18 | 18 | 19 | lihat bagian 2-3 |

Menurut status MVP Inti: DIBANGUN 42, SEDANG DIBANGUN 45, DITUNDA 24, TIDAK DIRENCANAKAN 10. Menurut isi kolom Kode: DIBANGUN murni 48 unit, bercampur dengan STUB/BEKU 9, hanya STUB/BEKU/DIMATIKAN 36, tanpa kode 25, lain 3.

**Butir kode (tujuh awalan yang diminta: AUTO, DEN, AUD, API, RT, ST, PERM).** 189 dari 195 tercakup (96,9%).

| Awalan | Butir | Kotak penuh | Hanya kotak pudar | Hanya kartu | Tercakup | Tidak tercakup |
|---|---|---|---|---|---|---|
| AUTO | 34 | 33 | 1 | 0 | 34 | tidak ada |
| DEN | 29 | 19 | 3 | 6 | 28 | DEN-20 |
| AUD | 26 | 26 | 0 | 0 | 26 | tidak ada |
| API | 40 | 35 | 0 | 1 | 36 | API-10, API-20, API-70, API-75 |
| RT | 35 | 34 | 0 | 0 | 34 | RT-01 |
| ST | 5 | 5 | 0 | 0 | 5 | tidak ada |
| PERM | 26 | 26 | 0 | 0 | 26 | tidak ada |
| ENV (tambahan) | 17 | 13 | 2 | 0 | 15 | ENV-01, ENV-04 |
| CON (tambahan) | 13 | 13 | 0 | 0 | 13 | tidak ada |

Alasan butir yang tidak tercakup: DEN-20 (`VALIDATION`, pesan isian umum yang bukan aturan alur), API-10 (`whoami`, contoh templat), API-20 (riwayat masuk pribadi, hanya bagian kartu keamanan /profile A27 yang tidak digambar), API-70 dan API-75 (contoh templat posting dan `openapi.json` untuk kunci API; tidak relevan bagi alur produk), RT-01 (landing templat, menunggu keputusan N11), ENV-01 dan ENV-04 (mode produksi dan rahasia otentikasi: syarat jalan server, bukan alur; hanya A31/N11 menyebutnya). Catatan jujur: kotak "pudar" untuk 4 butir (dari tujuh awalan) hanya menunjukkan bahwa bagian itu ada tetapi belum terlihat; kode beku (`[K]`) dihitung tercakup walau tidak berjalan.

**Layar Penpot.** Penyebut 64 layar (hitung ulang: AKUN 5 termasuk ⑤ yang hanya di mobile, BERANDA 4, PROYEK 12, TUGAS 12, PENGGUNA 2, EVENTS 15, INBOX 3, TIM 3, SAMPAH 4, PENGATURAN 4; inventaris Penpot menulis 62 + 1). Semua 64 terpetakan ke satu unit atau lebih; 28 berada di unit yang punya kotak penuh (termasuk layar yang isinya sebagian ditunda, mis. PENGATURAN-01/02 dan INBOX-01 yang diwakili kartu persetujuan), 36 hanya diwakili kotak pudar (Events 15, Tim 3, Inbox ②③, Beranda ①M/P, Pengaturan ③④, Proyek ⑤⑥⑦⑩⑫, Tugas ③⑤⑦⑫, Sampah ③④); 0 tak terpetakan. Aturan tertulis Penpot: AT 19 dari 20 butir nyata ter-rujuk (AT-06 hanya struktur data); NOTE 23 dari 25 (NOTE-PROYEK-01 dan NOTE-SAMPAH-02 isinya diserap P03 dan X04); keganjilan G-01..G-18 semua ditangani di bagian 3 (G-09 tidak ada di inventaris).

**Dokumen yang terpetakan ke unit (kolom Dokumen bagian 1-2).** FIT 68 dari 78, DEC 32 dari 56 (sisanya proses kerja/teknis), FLW 20 dari 30, RUL 37 dari 56 (sisanya aturan desain UI), KON 23 dari 30, TND 12 dari 26 (sisanya sudah terwakili FIT). Yang tak terpetakan sengaja: proses pembangunan (FLW-29, FLW-30), uji pengguna (FLW-23), UAT (FLW-24), estimasi, aturan gaya UI (RUL-33..39).

**Kartu aturan.** 58 kartu: BS (berlaku sekarang) 30, SP (disiapkan, belum terlihat) 23, TN (ditunda) 5. Seluruh topik wajib ada: super-admin dan pencabutan emailnya (R1), undangan (R4-R6), menunggu/ditolak/diblokir (R2, R7-R11), batas peran Admin (R12-R13), menyamar (R15-R16), hapus proyek dan masa pulih (R36), pengelola terakhir dan Pengelola utama (R31), pemilihan pemeriksa (R46), alur status tugas (R43-R49), progres/kondisi/terlambat (R37-R41), mode pemeliharaan (R22), batas laju (R23-R24), kunci API ditolak (R25-R27), ukuran teks (R19), tidak ada email/notifikasi (R20).

---
## 7. Pertanyaan untuk pemilik (berurut menurut dampak)

| # | Pertanyaan | Default yang disarankan | Bila tidak dijawab |
|---|---|---|---|
| Q1 | Apakah diagram boleh menampilkan tokoh Super-admin dan aturan R1 (peran hilang bila email dicabut), padahal tidak ada di wireframe? | Ya (D06 + kartu R1) | Audiens tak tahu siapa memegang kunci sistem; ini aturan tersembunyi paling besar |
| Q2 | Apakah diagram diberi tiga warna jujur (berjalan / sedang dibangun / ditunda atau tidak direncanakan)? | Ya, di semua diagram | Audiens menganggap wireframe = aplikasi yang jalan (45 unit masih SD, 34 TD/TP) |
| Q3 | Wireframe dikoreksi dulu (Z01, Z02, Z05, Z16, Z21, K22-K27) atau diagram yang jadi acuan dan wireframe ditandai "desain awal"? | Diagram jadi acuan; wireframe ditandai "desain awal", koreksi menyusul | Dua versi alur beredar bersamaan |
| Q4 | Kartu "Hapus akun" di /profile (tampil untuk semua dan melepas Pengelola tunggal dari proyek): disembunyikan, diberi pra-cek, atau tampil apa adanya? | Sembunyikan untuk non-Super-admin sesuai FIT-17 | Diagram harus memuat jalur hapus akun tanpa pengaman (R18) |
| Q5 | Uji runtime N04/N05 (akun Menunggu/Ditolak memanggil endpoint Better Auth; Ditolak hapus diri lalu daftar lagi) dijalankan sebelum presentasi? | Ya, satu sesi uji | Kartu R7 tertulis "tak bisa memakai API" padahal ada jalur BA yang belum diuji |
| Q6 | Hapus kalimat "Kami akan memberi kabar lewat email" di `PM_ERRORS.ACCOUNT_PENDING` (N01)? | Ya | Janji email bisa muncul di API suatu hari |
| Q7 | Beranda digambar sebagai: yang ada sekarang (kosong + dua tombol) dengan rencana S3 pudar, atau beranda berdata contoh dari cabang prototipe (KON-13)? | Yang ada sekarang + rencana pudar | Beranda wireframe terlihat sudah jadi |
| Q8 | Istilah resmi: "Diblokir" (kode) atau "Dinonaktifkan" (glosarium)? "Pengelola utama" atau "Lead"? | "Diblokir" dan "Pengelola utama" | Dua kata untuk satu keadaan di presentasi |
| Q9 | Janji Sampah: boleh menyebut "dapat dipulihkan sampai {tanggal}" padahal belum ada penghapus otomatis 30 hari (KON-02)? | Tidak berjanji tanggal; tulis "belum dihapus otomatis" | Janji yang tak ditepati |
| Q10 | Mode pemeliharaan: `/waiting` dan `/banned` dikecualikan atau dibiarkan tertutup (N07)? | Tampilkan apa adanya di kartu R22; kecualikan di rilis berikut | Pengguna yang sudah masuk terjebak di 503 |
| Q11 | Keputusan KB-3 (tenggat bebas diubah) dan KB-12 (status proyek bebas 5 nilai) disetujui? | Ya (JDW §3) | Unit P17 tak bisa digambar pasti |
| Q12 | Kelompok "Minggu ini" (B-7) dipertahankan sampai Minggu (kosong Sabtu/Minggu)? | Ya; jelaskan di kartu R53 | Audiens bingung kelompok "Minggu ini" kosong di akhir pekan |
| Q13 | Demo dimulai dari `/login`, bukan `/` (landing templat "Fullstack Template", N11)? | Ya | Kesan pertama keliru |
| Q14 | Alur Periksa (ditunda S4) digambar pudar penuh atau disembunyikan (DEC-53 "fitur belum ada disembunyikan")? | Pudar di diagram internal; disembunyikan di versi untuk pengguna akhir | Audiens bertanya "kenapa tombolnya tak ada" |
| Q15 | Satu "dunia" contoh untuk seluruh diagram: Atlas dan Portal Klien PT Sinar (bukan Hajatan Keluarga)? | Ya | Contoh berganti-ganti antar diagram |

---
## 8. Hal yang tidak bisa dipastikan dan koreksi atas inventaris

**Tidak bisa saya pastikan (tanpa menjalankan aplikasi).**
- N04 dan N05: gerbang tak memeriksa status akun itu pasti, tetapi apa yang terjadi sungguhan bila akun Menunggu/Ditolak memanggil `/api/auth/update-user`, `/delete-user`, `/api-key/create` tidak diuji. Dari kode: nama/foto saja yang bisa diubah, kunci tanpa cakupan, hapus diri sendiri mungkin (BA meminta sesi baru atau kata sandi; setelah masuk Google sesi masih segar). Apakah Ditolak lalu daftar ulang menghapus catatan penolakan: belum terbukti.
- Z21 (peran berlaku langsung): `auth.ts` tidak mengaktifkan cache cookie sesi, dan `resolveActor` membaca ulang tiap permintaan; kemungkinan besar benar, belum diuji.
- N08 (buntu akun Menunggu yang emailnya ditambahkan ke daftar Super-admin): hanya dari membaca urutan `guard.ts`.
- Perilaku internal Better Auth (umur sesi, kode galat akun diblokir saat masuk Google, daftar endpoint plugin) hanya dibaca sebagian; teks tombol dan isi komponen layar (kartu profil, tabel pengguna) tidak dibaca piksel demi piksel.
- Penpot: saya tidak membuka Penpot lagi; seluruh klaim Penpot berasal dari inventaris (teks, koordinat, nama path). Arah panah status tugas dibaca dari nama path. Layar Keano, mobile, dan detail tombol Events belum pernah dibaca per elemen.
- Dokumen: R01-R14, X1, X3 dan P1/P2 hanya sebagian dibaca oleh agen dokumen; apakah pemilik sudah menjawab KB-3/KB-8/KB-12/seed:atlas setelah 16 Okt tak tertulis. Peran akun Sri dan Rina tak disebut (diasumsikan Member).
- Butir kode lain yang saya ambil dari inventaris tanpa membaca ulang: tabel `TASK_TRANSITIONS` (12 perpindahan), urutan `pickReviewer`, pencatatan kunjungan, retensi, rollup kunci, pembersih demo, isi katalog `DEN-*` dan `DENY_UI`.

**Diverifikasi langsung di kode `69277e9` (29 butir).** `reconcileRole` dan `resolveUserRole` (AUTO-01, 02); `resolveActor` menahan akun sebelum rekonsiliasi peran; teks email (satu kemunculan, tak tampil); `signupEnabled` tak dibaca server; pengecualian mode pemeliharaan; `auth-gate.ts` (tanpa cek status); `auth.ts` (`input:false`, `deleteUser`, tanpa cache sesi); Better Auth apiKey (`permissions` terlarang dari klien); kesegaran sesi `delete-user`; API profil dan cookie teks serta ketiadaan kontrol layar; API baca proyek dan anggota; daftar 17 STUB; `NAV` 4 menu; redirect `/app/settings`; kartu hapus akun tampil; cascade `project_member`; konstanta undangan (14 hari, 100); aturan transisi akun; `user.policy`; teks login tanpa petunjuk persetujuan dan tanpa Bantuan; notice blokir di login; landing templat; konstanta `rules.ts` dan `limits.ts`; batas laju bawaan dan pengecualiannya; daftar tolak kunci API PM dan rute akun; `project.dto` memakai metrik (progres dan kondisi sungguhan di API); `schedule.ts` (aturan "Minggu ini"); perhitungan tanggal acuan 7 Okt (sisa 24 hari); CHANGELOG vs PROGRES soal tag.

**Butir inventaris yang ternyata keliru atau basi.**
1. Inventaris kode §12-§13 dan ST-01 menyebut teks "kami akan memberi kabar lewat email" ada di `DENY_UI` dan "gate". Salah: hanya ada di `PM_ERRORS.ACCOUNT_PENDING.message` dan tidak dipakai di jalur mana pun yang sampai ke pengguna.
2. Inventaris kode: API-13/14/15 dan AUTO-70 basi sejak G14 (kini nyata; profil dan cookie teks hidup tetapi tanpa layar), plus tiga stub baru.
3. Inventaris dokumen FIT-17: "kartu Hapus akun disembunyikan dari pengguna biasa" salah untuk kode saat ini (kartu tampil, N03).
4. Inventaris dokumen KON-22/§9 butir 1 ("tidak diketahui apakah G14 di-merge"): sudah di-merge (64 dari 93).
5. Inventaris Penpot: "62 layar (+1)" tidak sama dengan enumerasi (64); "21 butir AT (tanpa AT-17)" sebenarnya 20 butir karena AT-11 juga tak ada; G-09 tak ada dalam daftar G.
