# PROGRES S3-S8 — Status tugas setelah MVP Inti

> Dibuat 18 Oktober 2026. **Berkas ini terpisah dari [`PROGRES.md`](PROGRES.md)** (yang hanya mencatat MVP Inti S0-S2, 91 dari 93 tugas). Jangan menjumlahkan keduanya. Sumber tugas: [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md) dan rencana [`P4`..`P10`](rencana/).

## 1. Status keseluruhan
| Irisan | Menu | Rencana | Tugas | Selesai | Status |
|---|---|---|---|---|---|
| S3 | Inbox | [P5](rencana/P5-s3-inbox.md) | 14 | 9 | **9 selesai (merged)** (I01-I07, I11, I14); sisa I08-I10, I12, I13 |
| S3 | Beranda | [P4](rencana/P4-s3-beranda.md) | 12 | 0 | rencana selesai, belum dikerjakan |
| S4 | Tugas lanjutan (Periksa, dependensi, tag, Papan) | [P10](rencana/P10-s4-s5-tugas-lanjutan.md) | 15 | 0 | rencana selesai, belum dikerjakan |
| S5a | Tahapan, milestone, perpanjang tenggat, Perlu perhatian, Gantt (dikerjakan lebih dulu atas permintaan user 19 Okt) | [P10](rencana/P10-s4-s5-tugas-lanjutan.md) L5-01..04, 08..11 + [P3](rencana/P3-s1-s2-proyek-tugas.md) tampilan proyek | 8 + 2 | 10 | **selesai (merged)** ke `feature/project-management` 19 Okt 2026; belum di-push |
| S5b | Jenis tugas dan Bukti (unggah foto) | [P10](rencana/P10-s4-s5-tugas-lanjutan.md) L5-05..07, 12..14 | 6 | 0 | belum dikerjakan |
| S6 | Sampah | [P8](rencana/P8-s6-sampah.md) | 8 | 1 | **1 selesai (merged)** (Z-01) |
| S6 | Tim | [P7](rencana/P7-s6-tim.md) | 10 | 4 | **4 selesai (merged)** (M01-M04); **3 review** (M06, M07, M10 sebagian) di `feature/pm-team-menu`; sisa M05, M08, M09 |
| S6 | Pengaturan | [P9](rencana/P9-pengaturan-lanjutan.md) | 9 | 0 | rencana selesai, belum dikerjakan |
| S7 | Event | [P6](rencana/P6-s7-events.md) | 16 | 13 | **13 selesai** (E-01..E-12, E-15): E-01..E-03, E-05, E-06 merged; E-04, E-07..E-12, E-15 di `feature/pm-events-menu` / `nicoarya20/events-c-integrasi` (belum di-merge ke `feature/project-management`); E-13, E-14, E-16 ditunda (HUTANG H-D3b/c/d). Lingkup dipangkas 20 Okt: buat, batalkan, hapus ke Sampah |
| Lajur Admin | Area `/dashboard` (paralel, bukan bagian S3-S8) | [P11](rencana/P11-area-admin.md) | 20 | 5 | **5 selesai (merged)** (AD-01, AD-02, AD-09, AD-10, AD-20); gelombang berikutnya: **AD-03 gerbangnya** (menunggu persetujuan user), AD-11/AD-14/AD-16/AD-18 bebas |
| Lajur Cuti | Cuti jadi status yang disetel Admin | [P14](rencana/P14-cuti-status-admin.md) | 8 | 8 | **8 selesai (CU-01..CU-08)** di `nicoarya20/sp-p14-cuti`, **belum di-push dan belum di-merge** ke `feature/project-management`; migrasi `0023` baru jalan di DB lane |
| | **Total** | | **126** | **40** | |

**Syarat sebelum tugas pertama dimulai:**
1. Gerbang S2 lulus (S2-16 uji pengguna nyata, lalu S2-17), kecuali S3a Inbox (I01-I04) bila user menyetujuinya.
2. User menjawab 10 keputusan di [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md) §5.
3. Rencana ini di-merge ke `feature/project-management` atas persetujuan user.

## 2. Gerbang
| Gerbang | Isi | Status |
|---|---|---|
| Gerbang S2 | S2-16 + S2-17 dari `PROGRES.md` | **diterobos atas keputusan user 18 Okt** — menerima risiko kerja ulang bila UP-1 mengubah alur halaman tugas |
| S3a | Inbox I01-I04 (tabel, `notify()`, API baca) | **lulus (review)** — keempatnya hijau di `feature/pm-s3-i01-i02-notification-core` |
| S3 | Demo Inbox dan Beranda; uji pengguna S3 (Beranda ≤10 detik) | belum |
| S4 | Periksa, dependensi, tag, Papan | belum |
| S5a | Tahapan, milestone, tenggat, Perlu perhatian, Gantt | **selesai, merged** (5506 tes lulus, `smoke:prod` 39/39; `smoke:binary` belum jalan: butuh Bun 1.4.2) |
| S5b | Jenis tugas dan Bukti | belum |
| S6 | Sampah, Tim, Pengaturan | belum |
| S7 | Event | **lingkup dipangkas lulus otomatis (review)**: `tests/e2e-flow/events-gate.test.ts`, 6059 lulus/0 gagal, typecheck 0, `smoke:prod` dan `smoke:binary` 44/44. **Belum:** cek visual di browser dan uji pengguna nyata (aturan global melarang Playwright tanpa perintah) |
| S8 | Pengerasan dan rilis (belum direncanakan) | belum |

## 3. Migrasi dan kontrak
| Item | Nomor / perubahan | Pemilik | Status |
|---|---|---|---|
| Inbox: `notification`, `notification_pref` | 0017 | I01 | review (`9dcb52d`) |
| Event | 0018 | E-01 | review (`09cf69c`) |
| Tahapan, milestone, perpanjangan, override kondisi, `task.phase_id` | **0019** (`0019_project_plan`) | S5a-01 | selesai (merged) |
| Periksa, dependensi, tag | **0020** (bergeser dari 0019 karena S5a dikerjakan lebih dulu; L4-01 wajib memakai nomor berikutnya yang bebas) | L4-01 | belum |
| Bukti (lampiran tugas, S5b) | nomor bebas berikutnya setelah L4-01 | L5-01 (sisa) | belum |
| Pengumuman + kebijakan akses + pemberitahuan bawaan (kolom `settings`) | **0022** (`0022_admin_policy`; rencana P11 menulis `0021`, **dikoreksi 21 Okt** — `0021_leave_request.sql` sudah ada). **Lima** kolom, bukan enam: `working_days` dicabut 23 Okt 2026 (P14 D1, `HUTANG.md` H-E15) | AD-05 / P13 RD-01 | selesai (mendarat lebih dulu, lalu memberi nomor `0023` ke lajur cuti) |
| `leave_period` menggantikan `leave_request`; `app_setting.leave_requires_approval` dicabut; kartu Inbox cuti lama ditutup | **0023** (`0023_leave_period`; bergeser dari `0022` karena `0022_admin_policy` mendarat duluan — P14 §4 K3) | P14 CU-01 (+ penyapu notifikasi CU-08) | **selesai di cabang, belum dijalankan ke DB dev/test bersama** — dijalankan saat merge, lihat §6b |
| Indeks `project_member (project_id, role)` | menurut baton (0019) | M05 | **masih terbuka** — sengaja dipisah dari M02; M02 terbukti tanpa indeks ini |
| `contract-v1` + 3 URL Event (13 → 16) | PCC `docs/decisions/0003-contract-v1-event-urls.md` | **ADR: E-01 (selesai). Kenaikan hitungan: E-09..E-11 (selesai)** | disetujui user (§5 no. 2); ketiga rute terdaftar, hitungan beku kini **20** (tab Tahapan dan detail orang Tim ikut menambah) |
| `GET /api/app/home` | tambahan kompatibel | B-06 | belum |

## 4. Daftar tugas per irisan
Aturan pengisian sama dengan `README.md` §5: `berjalan` + cabang saat mulai, `review` + hasil tes saat selesai dikerjakan, `selesai` + hash setelah user menyetujui gelombang, `diblokir` + alasan.


### S3 · Inbox
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| I01 | Skema `notification`, `notification_pref`, migrasi 0017 | selesai | `feature/pm-s3-i01-i02-notification-core` | `9dcb52d` merge `ee74adb` | 4228 lulus/0 gagal di kepala cabang; 11 tes skema, 5 indeks, rollback 0017 |
| I02 | Katalog, tipe, penerima | selesai | `feature/pm-s3-i01-i02-notification-core` | `97c8a3d` merge `ee74adb` | 14 kind (7 dikirim S3); filterRecipients terbukti 1 kueri |
| I03 | Inti `notify()`, `resolveNotifications()`, `dropForUserInProject()` | selesai | `feature/pm-s3-i01-i02-notification-core` | `b133f77` merge `ee74adb` | notify gagal di dalam inTx tidak menggagalkan baris domain (diuji spy); <=3 kueri |
| I04 | Query + API baca/tandai + pengecualian rate limit (**penutup S3a**) | selesai | `feature/pm-s3-i01-i02-notification-core` | `e613b41` merge `ee74adb` | 4269 lulus/0 gagal; daftar 20 kartu = 1 kueri; count bebas 429. **Penutup S3a** |
| I05 | Kait penugasan tugas (buat, ubah penugasan) | selesai | `feature/pm-s3-i01-i02-notification-core` | `1c54dd7` merge `ee74adb` | kait createTask/updateTask; task.service.ts 299/300 |
| I06 | Kait transisi status dan komentar | selesai | `feature/pm-s3-i01-i02-notification-core` | `f26212e` merge `ee74adb` | G-2 terbukti lewat sesi DAN kunci API; unstart kini bersuara (keputusan koordinator) |
| I07 | Kait proyek dan anggota | selesai | `feature/pm-s3-i01-i02-notification-core` | `5bf2ea2` merge `ee74adb` | pulihkan proyek tidak menghidupkan ulang kartu (terbukti) |
| I08 | Klien Inbox: API, kunci query, hook hitungan | belum | – | – | – |
| I09 | Lonceng, badge menu, NAV, rute (pemilik tunggal berkas bingkai) | belum | – | – | – |
| I10 | Halaman Inbox | belum | – | – | – |
| I11 | Scheduler pembersih | selesai | `feature/pm-s3-i01-i02-notification-core` | `91ce31b` merge `ee74adb` | retensi 30 hari, batch 500, tidak dipasang saat NODE_ENV=test |
| I12 | Kontrak lintas-jalur, keamanan, kinerja, smoke, dokumen | belum | – | – | – |
| I13 | Integrasi dan gerbang demo S3-Inbox | belum | – | – | – |
| I14 | (Opsional, Should) Kartu "Pengguna baru menunggu persetujuan" | selesai | `feature/pm-s3-i01-i02-notification-core` | `bc0cf89` merge `ee74adb` | Admin yang tidak menekan tombol ikut kehilangan kartu; +3 berkas di luar Target (disetujui) |

### S3 · Beranda
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| B-01 | DTO, konstanta, salinan, pekan, dan ringkasan murni | belum | – | – | – |
| B-02 | Query Sekilas dan Selesai minggu ini | belum | – | – | – |
| B-03 | Query Fokus saya | belum | – | – | – |
| B-04 | Query Proyek saya (kondisi + progres) | belum | – | – | – |
| B-05 | Layanan komposit `getHome` dan seam Inbox | belum | – | – | – |
| B-06 | Endpoint `GET /api/app/home` | belum | – | – | – |
| B-07 | Klien Beranda (API, kunci, fixture) | belum | – | – | – |
| B-08 | UI blok atas: Sapaan, Ringkasan, Kartu Admin, baris tanggap, Sekilas | belum | – | – | – |
| B-09 | UI blok bawah dan halaman: Fokus, Proyek saya, Selesai minggu ini, `home.tsx` | belum | – | – | – |
| B-10 | Kinerja: seed, hitungan query, EXPLAIN | belum | – | – | – |
| B-11 | QA tiga skala, smoke, dokumen | belum | – | – | – |
| B-12 | Jahitan Inbox: nyalakan baris tanggap dan kalimat ② | belum | – | – | – |

### S4 · Tugas lanjutan (Periksa, dependensi, tag, Papan)
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| L4-01 | Migrasi 0019: Periksa, dependensi, tag [MIG]* | belum | – | – | – |
| L4-02 | Aturan dependensi murni | belum | – | – | – |
| L4-03 | Pengurai mention murni | belum | – | – | – |
| L4-04 | Service dan rute dependensi + "Giliran Anda" | belum | – | – | – |
| L4-05 | Service dan rute Periksa (aktivasi T7) | belum | – | – | – |
| L4-06 | Service dan rute tag | belum | – | – | – |
| L4-07 | Perakitan rute S4 + scope + penjaga (SP-S4a) | belum | – | – | – |
| L4-08 | Klien API S4 | belum | – | – | – |
| L4-09 | UI Periksa | belum | – | – | – |
| L4-10 | UI Tertahan dan dependensi | belum | – | – | – |
| L4-11 | UI Tag | belum | – | – | – |
| L4-12 | Papan | belum | – | – | – |
| L4-13 | Mention di komentar | belum | – | – | – |
| L4-14 | Kartu Inbox "Terlambat" (T16) | belum | – | – | – |
| L4-15 | Smoke, QA, dokumen, gerbang S4 | belum | – | – | – |

### S5 · Tugas lanjutan (Tahapan, tenggat, bukti)
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| L5-01 | Migrasi: Tahapan, milestone, perpanjangan, override [MIG]* | selesai | `feature/pm-s5a-project-plan` | – | Nomor **0019**. Tabel Bukti sengaja tidak ikut (S5b) |
| L5-02 | Kondisi proyek: ≥ 12 kasus tabel | selesai | `feature/pm-s5a-project-plan` | – | 13 kasus + milestone/override sungguhan di query daftar dan detail |
| L5-03 | Tahapan dan milestone (service + rute) | selesai | `feature/pm-s5a-project-plan` | – | Nama field mengikuti R02 (`endDate`, `title`, `in_progress`) |
| L5-04 | Perpanjang tenggat dan override kondisi | selesai | `feature/pm-s5a-project-plan` | – | Termasuk `GET activity` untuk kartu Aktivitas |
| L5-05 | Kelola jenis tugas | belum | – | – | – |
| L5-06 | Pengenal tipe berkas (magic bytes) murni | belum | – | – | – |
| L5-07 | Bukti: unggah, daftar, unduh | belum | – | – | – |
| L5-08 | Perakitan rute S5 + scope + penjaga (SP-S5a) | selesai | `feature/pm-s5a-project-plan` | – | Hanya rute S5a; `extend-deadline` dan override ditolak untuk kunci API; juga filter `?perhatian=1`/`?rencana=1` |
| L5-09 | Klien API S5 | selesai | `feature/pm-s5a-project-plan` | – | Bagian S5a: `project-plan-api.ts`, `project-deadline-api.ts` |
| L5-10 | UI Tahapan dan milestone | selesai | `feature/pm-s5a-project-plan` | – | Tab sendiri `/app/projects/:id/phases` (URL `/app` 16 → 17). Pemilih Tahapan di form tugas belum (DTO tugas belum membawa `phaseId`) |
| L5-11 | UI Perpanjang tenggat dan kondisi | selesai | `feature/pm-s5a-project-plan` | – | Modal, lencana ×N, atur kondisi, baris "Kenapa:". "Geser tenggat" Inbox (L4-14) belum ada |
| L5-12 | UI Bukti | belum | – | – | – |
| L5-13 | UI kelola jenis tugas | belum | – | – | – |
| L5-14 | Smoke, QA, dokumen, gerbang S5 | belum | – | – | – |

### S6 · Sampah
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| Z-01 | Kebijakan, kode galat, audit, penolakan kunci API · Dep: – · S (1) | selesai | `feature/pm-s6-z01-trash-policy` | `f47f636` merge `3a66626` | 4170 lulus/0 gagal di DB terisolasi. PM_DENY_PENDING = hutang, wajib dihapus Z-04/Z-08 |
| Z-02 | Hapus tugas ke Sampah (backend) · Dep: Z-01 · M (1,5) · PARALEL dgn Z-03, Z-04 | belum | – | – | – |
| Z-03 | Daftar Sampah gabungan + pulihkan tugas · Dep: Z-01 · L (2) · PARALEL | belum | – | – | – |
| Z-04 | Hapus permanen (Admin) · Dep: Z-01 · M (1,5) · PARALEL | belum | – | – | – |
| Z-05 | Purge otomatis 30 hari · Dep: Z-04 · M (1,5) | belum | – | – | – |
| Z-06 | UI halaman Sampah (daftar, penyaring, pulihkan, hapus permanen) · Dep: Z-03 (kontrak API), Z-04 untuk tombol · L (2,5) | belum | – | – | – |
| Z-07 | UI hapus tugas dengan Urungkan (T1) · Dep: Z-02, Z-03 (endpoint restore) · M (1,5) · PARALEL dgn Z-06 | belum | – | – | – |
| Z-08 | Gerbang S6-Sampah: uji lintas, dokumen, demo · Dep: Z-05, Z-06, Z-07 · S (1) · titik sinkron | belum | – | – | – |

### S6 · Tim
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| M01 | Kebijakan murni visibilitas Tim (D10) | selesai | `feature/pm-s6-m01-team-policy` | `769177d` merge `f47bbfb` | 4167 lulus/0 gagal; scope Pengelola = irisan proyek bersama; irisan kosong = none |
| M02 | Kueri Tim (orang, peran, beban, ringkasan) ≤ 4 kueri | selesai | `feature/pm-s6-m01-team-policy` | `bbb0041` merge `f47bbfb` | 4200 lulus/0 gagal; tepat 4 statement untuk 4 maupun 41 orang |
| M03 | Rute daftar `GET /api/app/team` + tes privasi per peran | selesai | `feature/pm-s6-m01-team-policy` | `ccee194` merge `f47bbfb` | privasi beban per peran terkunci tes; +SORT_NOT_ALLOWED |
| M04 | Rute detail `GET /api/app/team/:userId` | selesai | `feature/pm-s6-m01-team-policy` | `aca0cab` merge `f47bbfb` | detail: Admin boleh buka akun ter-ban/pending, lainnya NOT_FOUND |
| M05 | Migrasi indeks `project_member (project_id, role)` — *sinkron: pemegang baton* | belum | – | – | – |
| M06 | Halaman daftar Tim + NAV + rute | review | `feature/pm-team-menu` | – | Tersambung ke API; urut Nama / Tugas aktif terbanyak; satu daftar, tidak dipecah per proyek. Ketersediaan sempat disembunyikan (keputusan user 20 Okt) dan **menyala 26 Okt 2026** bersama P14: lencana `Cuti sampai <tgl>` dari `leave_period`, satu bentuk. Urutan berdasarkan ketersediaan masih terbuka (`HUTANG.md` H-D4) |
| M07 | Halaman detail orang | review | `feature/pm-team-menu` | – | `/app/team/:userId`; URL `/app` 17 → 18; Peran akun hanya Admin/Super-admin |
| M08 | A7 — Pra-cek hapus akun pengelola tunggal | belum | – | – | – |
| M09 | A8 — Pengaturan tim Admin: pengingat acara bawaan *(BERSYARAT: setelah S7 Events; Could)* | belum | – | – | – |
| M10 | Demo, smoke, dokumen kontrak (integrator) | review (sebagian) | `feature/pm-team-menu` | – | Smoke (40/40) dan README/CHANGELOG selesai; demo ke user belum |

### S6 · Pengaturan
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| G-01 | Rapikan Lanjutan → "Keamanan dan perangkat" | belum | – | – | – |
| G-02 | Pra-cek penghalang hapus akun (server) | belum | – | – | – |
| G-03 | UI hapus akun (T3) untuk pengguna sesuai keputusan | belum | – | – | – |
| G-04 | Hook server `before delete` (penegakan semua jalur) | belum | – | – | – |
| G-05 | Saklar Pemberitahuan (API + kartu) | belum | – | – | – |
| G-06 | Efek saklar di Inbox & pengingat (titik sinkron S3a/S4) | belum | – | – | – |
| G-07 | Pengaturan tim: pengingat acara bawaan (A8) | belum | – | – | – |
| G-08 | Form Event membaca bawaan tim (titik sinkron S4) | belum | – | – | – |
| G-09 | QA, smoke, dokumen, gerbang | belum | – | – | – |

### S7 · Event
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| E-01 | Skema acara + migrasi 0018 + Permintaan Perubahan Kontrak | selesai | `feature/pm-s7-e01-event-schema` | `09cf69c` merge `7cec339` | 4226 lulus/0 gagal; migrasi 0018 + rollback + PCC 0003 |
| E-02 | Kebijakan akses & kemampuan acara | selesai | `feature/pm-s7-e01-event-schema` | `ad81d54` merge `7cec339` | kebijakan acara murni + kemampuan |
| E-03 | Servis & kueri acara (CRUD, peserta, batal) | selesai | `feature/pm-s7-e01-event-schema` | `d7003d3` merge `7cec339` | 4341 lulus/0 gagal; `listEvents` tepat 3 kueri, tetap 3 pada halaman 20x lebih panjang; tanpa email/HP di payload |
| E-04 | Pengingat T-1 hari & T-30 menit + kait notifikasi | selesai | `feature/events-a-server-e04-e07` | `ea89ba7`, `ba75243` merge `9302a57` | kartu undangan/ubah/batal + tick idempoten; `event_invited` dipindah ke lane info; kartu pengingat lama belum ditutup saat acara batal/dihapus (H-D3i) |
| E-05 | Notulensi ketik dengan kunci optimis | selesai | `feature/pm-s7-e01-event-schema` | `dd05f9e` merge `7cec339` | kunci optimis via date_trunc(milliseconds); body tidak pernah di-log |
| E-06 | Rute API acara + pemetaan scope | selesai | `feature/pm-s7-e01-event-schema` | `4f9a020` merge `7cec339` | 4432 lulus/0 gagal; semua rute kecuali Sampah; +NOTE_CONFLICT/EVENT_CANCELED |
| E-07 | Hapus ke Sampah + Urungkan + ikut hapus proyek | selesai | `feature/events-a-server-e04-e07` | `214104d` merge `9302a57` | Sampah bagian Acara; acara ikut proyek ke Sampah (tanpa baris sendiri) dan pulih bersamanya; kunci API ditolak |
| E-08 | Klien, kunci kueri, dan komponen bersama acara | selesai | `nicoarya20/events-b-daftar` | `01d2412` merge `7a12b3c` | klien Eden, `events-format`, filter URL; `events.dummy.ts` dan `MonthGrid.tsx` dihapus (`15de33f`) |
| E-09 | Halaman Daftar Acara | selesai | `nicoarya20/events-b-daftar` | `a6756f0` merge `7a12b3c` | tab, cari, saring jenis/proyek; tanpa Daftar/Kalender. Acara yang sedang berlangsung tampil di Sudah lewat (H-D3j, keputusan user menunggu) |
| E-10 | Form 2 tahap | selesai | `nicoarya20/events-b-form` | `9953bf1` merge `7d116ba` | `/app/events/new`; pemilih peserta lewat `/team?q=` (H-D3h); satu tanggal saja (H-D3k) |
| E-11 | Detail acara, peserta, notulensi, Agenda Beranda | selesai (dipangkas) | `nicoarya20/events-b-detail` | `213f40e`, `f0a3e45`, `bac319a` merge `405ba73` | detail, Batalkan dengan alasan, Hapus + Urungkan; tautan rapat hanya http(s) (`d2c4c03` server). Tanpa notulensi UI dan Agenda Beranda (H-D3a, H-D3e); tanpa Ubah/peserta (H-D3g) |
| E-12 | Integrasi, README kontrak, CHANGELOG — Integrator · S7 · S · 0,75 hari · dep E-06..E-11 · ★ SP-E3 | selesai | `nicoarya20/events-c-integrasi` | `e77651b`, `bfb45f7` | CHANGELOG, README (halaman Event, aturan http(s)), ADR 0003/0004, `TimeInput`/`MultiSelect` masuk tema; `readme-endpoint` dan `changelog` hijau |
| E-13 | Tugas dari rapat (E4, Could) | ditunda | – | – | HUTANG H-D3b (keputusan user 20 Okt 2026) |
| E-14 | Kalender Bulan/Minggu (E5, Could) | ditunda | – | – | HUTANG H-D3c (keputusan user 20 Okt 2026) |
| E-15 | QA, smoke, uji gerbang S7 | selesai | `nicoarya20/events-c-integrasi` | `ad9af2b` | `events-gate.test.ts` (12 tes bernama), 4 pemeriksaan smoke baru; `smoke:prod` dan `smoke:binary` 44/44 (binary: Bun 1.4.2 dari folder sementara, Bun terpasang 1.3.14 tidak punya `--asset`) |
| E-16 | Acara berulang (E6, Could) | ditunda | – | – | HUTANG H-D3d (keputusan user 20 Okt 2026) |


### Lajur Admin · Area `/dashboard` (P11, paralel dengan S3-S8)
Cabang induk lajur ini **`plan/p11-area-admin`** (= `feature/project-management` + dokumen rencana), bukan `feature/project-management` langsung.

| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| AD-01 | Pengalih area tiga entri + Pengaturan akun ke menu avatar | selesai | `nicoarya20/sp-ad01-nav` | `0d61177` merge `b4c8e03` | 29 tes baru (`tests/area-switcher.test.ts`); `Antrean persetujuan` dicabut dari `/dev`, badge tetap di menu Pengguna; `/app` tetap memakai `appCaps` |
| AD-02 | Kerangka `/dashboard/settings` | selesai | `nicoarya20/sp-ad02-settings-shell` | `1559131`, `87a13fc` merge `97a578b` | 15 tes baru; 8 tab, `?tab=` bisa ditautkan, `Tabs.List` dalam `ScrollArea`. **Isi tiap tab masih placeholder** yang menyebut pemiliknya (AD-04..AD-10, P9 G-02) |
| AD-03 | Longgarkan guard setelan organisasi ke Admin | belum | – | – | **Gerbang Tahap 1** — menyentuh kewenangan, wajib persetujuan user satu per satu (di luar merge per gelombang). AD-04, AD-06, AD-08 menunggu di belakangnya |
| AD-04 | Tab Identitas | belum | – | – | dep AD-03; pakai ulang `BrandingCard.tsx` |
| AD-05 | Pengumuman: migrasi **0022** + API + banner semua area | belum | – | – | dep AD-02; **pemegang baton migrasi**; menyentuh `AppFrame` → wajib `smoke:prod` + `smoke:binary` |
| AD-06 | Tab Akses masuk | belum | – | – | dep AD-03 |
| ~~AD-07~~ | ~~Tab Kebijakan kerja~~ | **DICORET** | – | – | **Dicoret 23 Okt 2026 (P14 D1), berkasnya dihapus 26 Okt 2026 (P14 CU-07).** Saklar "Cuti perlu persetujuan" hilang bersama alur persetujuan; hari kerja dan hari libur jadi `HUTANG.md` **H-E15** dengan konsumennya disebut (kalkulator tenggat) |
| AD-08 | Tab Fitur terkurasi | belum | – | – | dep AD-03 |
| AD-09 | **Menu** Peran & izin (baca saja) | selesai | `nicoarya20/sp-ad09-peran-izin` | `98c91af`, `096608e` merge `ce4e40e` | `GET /api/admin/permissions-matrix`; matriks dihitung dengan memanggil fungsi `permissions.ts` tiap request, dibuktikan `spyOn`. Pindah dari tab ke `/dashboard/permissions` di AD-20 |
| AD-10 | **Menu** Ekspor data | selesai | `nicoarya20/sp-ad10-ekspor` | `6657aa7` merge `7b82973` | `GET /api/admin/export/:kind`; CSV keyset 500/halaman + LEFT JOIN (tanpa N+1), BOM UTF-8 + RFC 4180, audit `data.export`, 10 unduhan/5 menit, kunci API ditolak. `smoke:prod` 47/47. Pindah ke `/dashboard/export` di AD-20 |
| AD-11 | API daftar proyek lintas organisasi | belum | – | – | – |
| AD-12 | Halaman Proyek | belum | – | – | dep AD-11 |
| AD-13 | Ganti Pengelola | belum | – | – | dep AD-11; dialog T2, audit `PROJECT_MANAGER_SET` |
| AD-14 | `GET /api/admin/overview` | belum | – | – | pola `server/home/*`, tiap bagian gagal-lunak |
| AD-15 | Beranda admin (6 widget) | belum | – | – | dep AD-14 |
| AD-16 | Pengguna: nonaktifkan, cabut sesi, riwayat per-orang | belum | – | – | – |
| AD-17 | Pra-cek Pengelola tunggal | belum | – | – | dep AD-11; menutup HUTANG H-D4/M08 |
| AD-18 | Halaman Aktivitas | belum | – | – | – |
| AD-19 | Gerbang: uji lintas, dokumen, demo | belum | – | – | dep semua; menyunting `CLAUDE.md` root (definisi `/dashboard` berubah), README, ADR baru, `HUTANG.md` |
| **AD-20** | Pecah Peran & izin + Ekspor data jadi menu sendiri | selesai | `nicoarya20/sp-ad20-split-menu` | `8e3e0d5`, `d1d221d` merge `658c37a` | **Tugas baru 21 Okt 2026** dari pengamatan user atas layar nyata: 8 tab tidak muat di 1366px dan dua di antaranya bukan setelan. Sidebar Admin jadi 5 entri, Pengaturan turun ke 6 tab, panel dipindah `git mv` tanpa ubah perilaku, endpoint tidak disentuh |


## 5. Log merge per gelombang
| Gelombang | Tugas | Hash | Tanggal |
|---|---|---|---|
| G21 (Inbox I01-I07/I11/I14, Event E-01/E-02/E-03/E-05/E-06, Tim M01-M04, Sampah Z-01) | 18 tugas, empat cabang | `ee74adb`, `7cec339`, `f47bbfb`, `3a66626`; kepala `5b7cfc3` | 19 Okt 2026 |
| G22 · Lajur Admin gelombang 1 (AD-01, AD-02) | 2 tugas, dua cabang | `b4c8e03`, `97a578b`; kepala `97a578b` di `plan/p11-area-admin`, sudah di-push ke `origin` | 21 Okt 2026 |
| G23 · Lajur Admin gelombang 2 (AD-09, AD-10) | 2 tugas, dua cabang | `ce4e40e`, `7b82973`; kepala `0eceb16`, sudah di-push | 21 Okt 2026 |
| G24 · Lajur Admin AD-20 (pecah menu) | 1 tugas, satu cabang | `658c37a`; kepala `0c895c0` | 21 Okt 2026 |

## 6b. TITIK LANJUT — baca ini dulu saat melanjutkan

Gelombang **G21** dihentikan atas permintaan user, bukan karena kegagalan. Semua pekerja dimatikan dan
seluruh dispatch dilepas; **tidak ada kerja yang menggantung** — keempat worktree bersih.

### Empat cabang sudah di-merge ke `feature/project-management` dan di-push (19 Okt, kepala `5b7cfc3`)
| Cabang | Kepala | Isi |
|---|---|---|
| `feature/pm-s3-i01-i02-notification-core` | `bc0cf89` | I01-I07, I11, I14 |
| `feature/pm-s7-e01-event-schema` | `4f9a020` | E-01, E-02, E-03, E-05, E-06 |
| `feature/pm-s6-m01-team-policy` | `aca0cab` | M01-M04 |
| `feature/pm-s6-z01-trash-policy` | `f47f636` | Z-01 |

Uji gabungan keempatnya dijalankan dua kali dan **lulus bersih** keduanya. Satu-satunya konflik
ada di `tests/contract-v1.test.ts` dan bentuknya aditif murni (dua cabang menambah ekspor ke entri
snapshot yang sama) — selesaikan sebagai **gabungan**, jangan pilih salah satu.
Worktree uji buangan sudah dihapus; hasilnya terbukti ulang pada kepala final `5b7cfc3`: 4756 lulus / 19 skip / 0 gagal, typecheck 0, lint 164/33/4, `smoke:prod` dan `smoke:binary` 39/39, drift skema nol.

### Langkah pertama saat melanjutkan (merge SUDAH selesai — ini alasan blokir sebelumnya, kini terbuka)
Tiga pekerjaan terkunci sampai keempat cabang menyatu:
1. **E-04** (pengingat acara) butuh `notify()` yang ada di cabang Inbox. P6 R-E1 melarang membuat tiruan.
2. **Berkas bingkai** (`app/routes.ts`, `NAV` di `app/routes/app/layout.tsx`, `AppFrame.tsx`) diklaim
   sebagai pemilik tunggal oleh DUA rencana sekaligus — I09 (P5) dan E-08 (P6). Jangan biarkan dua
   pekerja menyentuhnya di cabang berbeda. Setelah merge, **satu tugas integrator** memasang NAV + rute
   untuk Inbox dan Event sekaligus, sekalian menaikkan `APP_URLS` 13 → 16.
3. **Halaman Event** (E-09..E-11) baru bisa jalan setelah rutenya terpasang.

### Yang belum dikerjakan sama sekali
Inbox: I08 (klien), I09 (lonceng/NAV/rute), I10 (halaman), I12 (QA lintas-jalur), I13 (gerbang demo).
Event: tidak ada yang tersisa dari lingkup 20 Okt (E-04, E-07..E-12, E-15 selesai); E-13, E-14, E-16 ditunda
(HUTANG H-D3b/c/d). Tim: M05-M10. Sampah: Z-02..Z-08.

### Dua keputusan user yang masih menggantung
1. **Pencarian peserta untuk Member.** `GET /events/people` mendelegasikan ke `pickPeople`; pencarian
   tanpa `projectId` terkunci `canCreateProject`, jadi Member bisa membuat acara pribadi tapi tidak bisa
   mengundang siapa pun. Usulan koordinator: batasi ke orang yang berbagi proyek, memakai `loadScopeFor`
   dari M01 — membuka fitur tanpa membuka direktori seluruh organisasi.
2. ~~**`sort=overdue`** di daftar Tim hanya mengurutkan halaman yang tampil~~ **Selesai 20 Okt 2026:** urutan beban kini global (jendela 200 orang).

## 7. Koreksi rencana yang ditemukan pekerja
Empat kontradiksi internal ditemukan saat mengerjakan, semuanya diselesaikan dengan prinsip **kode fondasi menang**.
Rencana sudah dibetulkan; baris ini menjaga jejaknya.

| # | Dokumen | Yang tertulis | Yang benar | Penemu |
|---|---|---|---|---|
| K-1 | P6 §6 E-01 | "contract-v1 hijau dengan 16 URL" sebagai akseptansi E-01 | Tes **menurunkan** daftar URL dari `app/routes.ts`, jadi hitungan naik di E-09..E-11 saat rutenya didaftarkan, bukan di E-01 | E-01 |
| K-2 | PROGRES-S3-S8 §3 | Baris kontrak menaruh kenaikan 13→16 pada E-01 | Sama dengan K-1 | koordinator |
| K-3 | P5 §5.3 | `resolveNotifications(..., by?)` | Tabel `notification` di §5.1 **tidak punya** kolom `resolved_by`; parameter `by` dihapus | I03 |
| K-4 | P5 §5.4 | Kursor rusak → `400 VALIDATION` | `VALIDATION` berstatus **422** di katalog; repo sudah membekukan **`400 BAD_CURSOR`** | I04 |
| K-5 | P6 §6 E-06 | `PROJECT_IN_TRASH` dijawab **422** | Katalog `server/pm/errors.ts` memetakannya ke **409**, dan kode itu sudah dipakai jalur S1/S2 — mengubahnya berarti mengubah perilaku beku | E-03 |
| K-6 | P5 §6 I14 | Daftar Target kurang tiga berkas | `notification.catalog.ts` (`user_pending` harus `shipped:true` — komentar katalog sendiri menulis "shipped by I14"), `tests/notification/catalog.test.ts`, dan `server/api/admin-moderation.ts` (satu-satunya titik ban ada di controller, bukan service) | I14 |
| K-7 | P5 §6 I09 vs P6 §6 E-08 | Keduanya mengklaim "pemilik tunggal" `app/routes.ts` + NAV | Berkas bingkai dikerjakan **satu tugas integrator setelah merge**, bukan oleh lajur menu mana pun | koordinator |
| K-8 | P11 §1/§5/§6/§8 | Migrasi AD-05 bernomor `0021` | `0021_leave_request.sql` **sudah ada**; nomor bebas berikutnya **`0022`**. Rencana sudah dibetulkan | koordinator |
| K-9 | P11 §2/§8 R8 | ASUMSI: `CONSOLE_PAGE_COUNT` mungkin ikut menghitung halaman `/dashboard` | **Tidak.** Angkanya diturunkan dari `countDevPages(routes)` — hanya `/dev`. Halaman Admin baru tidak menambah tempat sunting | koordinator |

## 8. Hutang teknis terbuka
| Hutang | Pemilik penghapusan | Catatan |
|---|---|---|
| Berkas binary `simple-pm` (hasil `build:binary`) ikut terlacak git sejak `3a41a76`; `smoke:binary` menimpanya dan `git status` jadi kotor | siapa pun yang berikutnya menyentuh build | Seharusnya di `.gitignore`; `git checkout -- simple-pm` memulihkannya. Ditemukan E-15 |
| `PM_DENY_PENDING` berisi `DELETE trash/*` di `scopes.pm.ts` | Z-04, batas akhir gerbang Z-08 | Perancah agar sweep rute melapor *skipped*, bukan gagal, sampai rutenya ada |
| Tuple enum notifikasi ada di `schema.notification.ts`, bukan `server/pm/enums.ts` | gerbang S3 | `pm-enum-check.test.ts` menuntut kolom+target tes per tuple di `enums.ts` |
| ~~`sort=overdue` di `GET /api/app/team` hanya mengurutkan halaman yang tampil~~ | **selesai 20 Okt 2026** | Diperluas ke jendela 200 orang (`team.sort.ts`), tetap 4 statement |
| M05 (indeks `project_member (project_id, role)`) belum dikerjakan | M05 sendiri, setelah baton 0019 bebas | M02 terbukti benar tanpanya (yang diuji jumlah kueri) |

## 6. Log perubahan
- **26 Okt 2026** — **Lajur Cuti (P14) selesai di cabang `nicoarya20/sp-p14-cuti`, belum di-push dan belum di-merge.** CU-01..CU-08: migrasi `0023_leave_period` (baris `approved` pindah, `leave_request` dan saklar `leave_requires_approval` dibuang), alur pengajuan dan persetujuan dicabut dari server dan layar, Ketersediaan di `/app/settings` jadi baca-saja, tab Kebijakan kerja dihapus (Pengaturan admin 6 → 5 tab), tiga rute admin `/api/admin/users/:id/leave` (setel, akhiri, riwayat berpaginasi) dengan audit `leave.set`/`leave.clear` dan penolakan untuk kunci API apa pun scope-nya, layar Ketersediaan + riwayat di `/dashboard/users`, kartu Inbox `leave_recorded` menggantikan dua kartu lama. Keputusan user 26 Okt 2026: migrasi `0023` sekalian **menutup kartu Inbox cuti lama** dan memindahkannya ke Kabar terbaru, supaya penghitung "Perlu Anda tanggapi" tidak macet sampai retensi 30 hari habis. **Tertunggak saat merge:** `bun run db:migrate` ke DB dev dan test bersama. Dokumen tersunting: `README.md`, `CHANGELOG.md`, `HUTANG.md` (H-D4, H-E15 baru), `P11`, `P13`, ADR `docs/decisions/`, dan berkas ini.
- **21 Okt 2026** — **Lajur Admin gelombang 2 (AD-09, AD-10) dan AD-20.** AD-09 menyajikan matriks peran × kemampuan baca-saja yang dihitung dari `server/permissions.ts` tiap request (bukan tabel salinan; `spyOn` membuktikan ia ikut berubah), AD-10 menyajikan ekspor CSV ter-stream yang diaudit dan ditolak kunci API. **AD-20 adalah tugas baru dari user**, lahir dari melihat layar aslinya: delapan tab tidak muat satu baris di laptop 1366px sehingga dua tab terakhir tersembunyi tanpa tanda, dan dua di antaranya memang bukan setelan — Peran & izin laporan, Ekspor data alat. Keduanya naik jadi menu, Pengaturan turun ke 6 tab. **Dua kegagalan hanya muncul setelah merge**, tidak terlihat oleh worker mana pun karena tiap worker hanya menjalankan berkas tesnya sendiri: (1) AD-09 menaruh berkas baru di `server/access/` yang daftar berkasnya dibekukan `tests/contract-v1.test.ts` — diselesaikan dengan memindahkan berkas itu ke `server/api/admin-permissions.matrix.ts` (ia tidak memutuskan akses apa pun, hanya melaporkan jawaban `permissions.ts`), bukan dengan mengubah snapshot beku; (2) harness `tests/ui/admin-settings-shell.test.tsx` kekurangan `QueryClientProvider` begitu panel pertama yang mengambil data terdaftar. Koordinator juga menambahkan registry panel (`panels.tsx`) sebelum gelombang 2 diluncurkan supaya dua worker tidak menulis ulang loop render yang sama. Suite penuh di kepala `0c895c0`: 6853 lulus / 1 gagal (H-D3n, hijau sendirian), typecheck 0, `smoke:prod` 47/47, `smoke:binary` tidak bisa dijalankan (Bun 1.3.14 tanpa `--asset`).
- **21 Okt 2026** — **Lajur Admin (P11) gelombang 1** selesai: AD-01 (pengalih area tiga entri, `Pengaturan akun` ke menu avatar) dan AD-02 (kerangka `/dashboard/settings` 8 tab) di run `run_2cc2b834449e`, dua worker worktree dari induk **`plan/p11-area-admin`**. Hasil di commit merge `97a578b`: typecheck 0, **6777 lulus / 1 gagal** — kegagalan itu `tests/db/pm-indexes.test.ts` "tasks by assignee" (HUTANG H-D3n), gagal juga di baseline tanpa perubahan P11 dan hijau saat dijalankan sendiri. Sudah di-push ke `origin`; kedua worktree worker dihapus. Dua koreksi rencana: K-8 (migrasi `0022`) dan K-9 (ASUMSI R8 ditutup). **Dua hutang lingkungan yang muncul:** (1) `bun run lint` repo-wide merah sejak baseline — 163 errors + 35 warnings, mayoritas biome memformat `tahapan-proyek/**`, butuh `chore(lint)` tersendiri (tambahkan folder itu ke ignore biome + bereskan `drizzle.config.ts` dan `server/project/project-milestone.service.ts`); (2) dua worker yang menjalankan `bun run test` penuh **bersamaan** di satu mesin menghasilkan kegagalan acak yang berbeda tiap run walau port `LOCAL_PG_*`/`LOCAL_S3_*` sudah diisolasi — sejak gelombang ini suite penuh dijalankan koordinator secara bergantian, worker cukup menjalankan test berkasnya sendiri.
- **20 Okt 2026** — **S7 Event dipangkas** (buat, batalkan, hapus ke Sampah + Urungkan) selesai di `feature/pm-events-menu`: server E-04/E-07, klien + daftar E-08/E-09, form E-10, detail E-11, integrasi E-12 dan gerbang E-15 di `nicoarya20/events-c-integrasi`. Tanpa notulensi UI, kalender, berulang, Agenda Beranda (HUTANG H-D3a..e). Hutang baru dari para pekerja: H-D3g..H-D3n.
- **19 Okt 2026** — **S5a** dikerjakan lebih dulu atas permintaan user (Gantt, tab Tahapan, Perpanjang tenggat, Perlu perhatian, tampilan List/Grid/Gantt, klik penuh baris). Run `run_16a50a64efba` + `run_cba6e636b9fb`, tujuh pekerja, semua digabung di `feature/pm-s5a-project-plan` (dari `fix/pm-project-back-link`). Hasil: 5506 tes lulus/0 gagal, typecheck nol, `smoke:prod` 39/39. **Belum** di-push dan belum di-merge. Migrasi S5a = 0019, jadi L4-01 (S4) bergeser ke 0020. Hutang: KB-3 (form Ubah proyek masih bisa mengubah tenggat langsung), pemilih Tahapan di form tugas, status tahapan diubah manual, batas pindai 1000 proyek untuk filter Perlu perhatian, `smoke:binary` belum dijalankan.
- **18 Okt 2026** — Gelombang **G21** (run `run_8c394266a4d2`) dikerjakan: 10 tugas berstatus `review` di empat cabang, nol gagal di tiap cabang. Urutan menu mengikuti permintaan user: Inbox, Event, Tim, Sampah; Beranda (P4) ditunda. Sepuluh keputusan §5 dipakai apa adanya dan gerbang S2 diterobos atas keputusan user. Dua gangguan: batas pemakaian akun memutus tiga pekerja (kerja diselamatkan karena belum ter-commit), lalu restart aplikasi Orca mematikan tiga terminal (dipulihkan di worktree yang sama). Cacat setup yang ditemukan dan diperbaiki: semua worktree memakai **socket dan port Postgres yang sama** (`socketDir()` = path tetap, port default 54329), sehingga tes satu pekerja berjalan di database pekerja lain; sejak itu tiap pekerja diberi `LOCAL_PG_PORT`/`LOCAL_PG_SOCKET_DIR`/`LOCAL_PG_DB` sendiri.
- **18 Okt 2026** — Berkas dibuat dari tujuh rencana menu (run `run_ae24b153ade5`). Semua tugas berstatus `belum`.
