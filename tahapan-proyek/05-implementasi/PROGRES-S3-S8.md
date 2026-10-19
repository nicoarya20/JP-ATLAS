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
| S6 | Tim | [P7](rencana/P7-s6-tim.md) | 10 | 4 | **4 selesai (merged)** (M01-M04); sisa M05-M10 |
| S6 | Pengaturan | [P9](rencana/P9-pengaturan-lanjutan.md) | 9 | 0 | rencana selesai, belum dikerjakan |
| S7 | Event | [P6](rencana/P6-s7-events.md) | 16 | 5 | **5 selesai (merged)** (E-01, E-02, E-03, E-05, E-06); E-04 DIBLOKIR (butuh notify dari cabang Inbox) |
| | **Total** | | **98** | **19** | |

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
| S7 | Event | belum |
| S8 | Pengerasan dan rilis (belum direncanakan) | belum |

## 3. Migrasi dan kontrak
| Item | Nomor / perubahan | Pemilik | Status |
|---|---|---|---|
| Inbox: `notification`, `notification_pref` | 0017 | I01 | review (`9dcb52d`) |
| Event | 0018 | E-01 | review (`09cf69c`) |
| Tahapan, milestone, perpanjangan, override kondisi, `task.phase_id` | **0019** (`0019_project_plan`) | S5a-01 | selesai (merged) |
| Periksa, dependensi, tag | **0020** (bergeser dari 0019 karena S5a dikerjakan lebih dulu; L4-01 wajib memakai nomor berikutnya yang bebas) | L4-01 | belum |
| Bukti (lampiran tugas, S5b) | nomor bebas berikutnya setelah L4-01 | L5-01 (sisa) | belum |
| Indeks `project_member (project_id, role)` | menurut baton (0019) | M05 | **masih terbuka** — sengaja dipisah dari M02; M02 terbukti tanpa indeks ini |
| `contract-v1` + 3 URL Event (13 → 16) | PCC `docs/decisions/0003-contract-v1-event-urls.md` | **ADR: E-01 (selesai). Kenaikan hitungan: E-09..E-11** | disetujui user (§5 no. 2); hitungan masih 13 sampai rutenya terdaftar |
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
| M06 | Halaman daftar Tim + NAV + rute | belum | – | – | – |
| M07 | Halaman detail orang | belum | – | – | – |
| M08 | A7 — Pra-cek hapus akun pengelola tunggal | belum | – | – | – |
| M09 | A8 — Pengaturan tim Admin: pengingat acara bawaan *(BERSYARAT: setelah S7 Events; Could)* | belum | – | – | – |
| M10 | Demo, smoke, dokumen kontrak (integrator) | belum | – | – | – |

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
| E-04 | Pengingat T-1 hari & T-30 menit + kait notifikasi | belum | – | – | – |
| E-05 | Notulensi ketik dengan kunci optimis | selesai | `feature/pm-s7-e01-event-schema` | `dd05f9e` merge `7cec339` | kunci optimis via date_trunc(milliseconds); body tidak pernah di-log |
| E-06 | Rute API acara + pemetaan scope | selesai | `feature/pm-s7-e01-event-schema` | `4f9a020` merge `7cec339` | 4432 lulus/0 gagal; semua rute kecuali Sampah; +NOTE_CONFLICT/EVENT_CANCELED |
| E-07 | Hapus ke Sampah + Urungkan + ikut hapus proyek | belum | – | – | – |
| E-08 | Klien, kunci kueri, dan komponen bersama acara | belum | – | – | – |
| E-09 | Halaman Daftar Acara | belum | – | – | – |
| E-10 | Form 2 tahap | belum | – | – | – |
| E-11 | Detail acara, peserta, notulensi, Agenda Beranda | belum | – | – | – |
| E-12 | Integrasi, README kontrak, CHANGELOG — Integrator · S7 · S · 0,75 hari · dep E-06..E-11 · ★ SP-E3 | belum | – | – | – |
| E-13 | Tugas dari rapat (E4, Could) | belum | – | – | Could; geser bila waktu tidak cukup |
| E-14 | Kalender Bulan/Minggu (E5, Could) | belum | – | – | Could |
| E-15 | QA, smoke, uji gerbang S7 | belum | – | – | – |
| E-16 | Acara berulang (E6, Could) | belum | – | – | Could |


## 5. Log merge per gelombang
| Gelombang | Tugas | Hash | Tanggal |
|---|---|---|---|
| G21 (Inbox I01-I07/I11/I14, Event E-01/E-02/E-03/E-05/E-06, Tim M01-M04, Sampah Z-01) | 18 tugas, empat cabang | `ee74adb`, `7cec339`, `f47bbfb`, `3a66626`; kepala `5b7cfc3` | 19 Okt 2026 |

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
Event: E-04 (diblokir), E-07, **E-08a** (klien+komponen, sempat diluncurkan lalu dihentikan — worktree
bersih, mulai dari nol), E-09..E-16. Tim: M05-M10. Sampah: Z-02..Z-08.

### Dua keputusan user yang masih menggantung
1. **Pencarian peserta untuk Member.** `GET /events/people` mendelegasikan ke `pickPeople`; pencarian
   tanpa `projectId` terkunci `canCreateProject`, jadi Member bisa membuat acara pribadi tapi tidak bisa
   mengundang siapa pun. Usulan koordinator: batasi ke orang yang berbagi proyek, memakai `loadScopeFor`
   dari M01 — membuka fitur tanpa membuka direktori seluruh organisasi.
2. **`sort=overdue`** di daftar Tim hanya mengurutkan halaman yang tampil (lihat §8).

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

## 8. Hutang teknis terbuka
| Hutang | Pemilik penghapusan | Catatan |
|---|---|---|
| `PM_DENY_PENDING` berisi `DELETE trash/*` di `scopes.pm.ts` | Z-04, batas akhir gerbang Z-08 | Perancah agar sweep rute melapor *skipped*, bukan gagal, sampai rutenya ada |
| Tuple enum notifikasi ada di `schema.notification.ts`, bukan `server/pm/enums.ts` | gerbang S3 | `pm-enum-check.test.ts` menuntut kolom+target tes per tuple di `enums.ts` |
| `sort=overdue` di `GET /api/app/team` hanya mengurutkan **halaman yang tampil** | keputusan user sebelum M06 | Konsekuensi anggaran 4 kueri + paging offset (P7 §5); kemungkinan solusinya mengganti label, bukan kueri |
| M05 (indeks `project_member (project_id, role)`) belum dikerjakan | M05 sendiri, setelah baton 0019 bebas | M02 terbukti benar tanpanya (yang diuji jumlah kueri) |

## 6. Log perubahan
- **19 Okt 2026** — **S5a** dikerjakan lebih dulu atas permintaan user (Gantt, tab Tahapan, Perpanjang tenggat, Perlu perhatian, tampilan List/Grid/Gantt, klik penuh baris). Run `run_16a50a64efba` + `run_cba6e636b9fb`, tujuh pekerja, semua digabung di `feature/pm-s5a-project-plan` (dari `fix/pm-project-back-link`). Hasil: 5506 tes lulus/0 gagal, typecheck nol, `smoke:prod` 39/39. **Belum** di-push dan belum di-merge. Migrasi S5a = 0019, jadi L4-01 (S4) bergeser ke 0020. Hutang: KB-3 (form Ubah proyek masih bisa mengubah tenggat langsung), pemilih Tahapan di form tugas, status tahapan diubah manual, batas pindai 1000 proyek untuk filter Perlu perhatian, `smoke:binary` belum dijalankan.
- **18 Okt 2026** — Gelombang **G21** (run `run_8c394266a4d2`) dikerjakan: 10 tugas berstatus `review` di empat cabang, nol gagal di tiap cabang. Urutan menu mengikuti permintaan user: Inbox, Event, Tim, Sampah; Beranda (P4) ditunda. Sepuluh keputusan §5 dipakai apa adanya dan gerbang S2 diterobos atas keputusan user. Dua gangguan: batas pemakaian akun memutus tiga pekerja (kerja diselamatkan karena belum ter-commit), lalu restart aplikasi Orca mematikan tiga terminal (dipulihkan di worktree yang sama). Cacat setup yang ditemukan dan diperbaiki: semua worktree memakai **socket dan port Postgres yang sama** (`socketDir()` = path tetap, port default 54329), sehingga tes satu pekerja berjalan di database pekerja lain; sejak itu tiap pekerja diberi `LOCAL_PG_PORT`/`LOCAL_PG_SOCKET_DIR`/`LOCAL_PG_DB` sendiri.
- **18 Okt 2026** — Berkas dibuat dari tujuh rencana menu (run `run_ae24b153ade5`). Semua tugas berstatus `belum`.
