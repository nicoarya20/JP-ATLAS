# HUTANG — Daftar semua yang belum dikerjakan

> Dibuat 19 Oktober 2026, setelah S5a (Proyek) selesai dan di-push. **Satu tempat untuk memanggil hutang saat fokus pengerjaan berikutnya ditentukan.** Berkas ini merangkum dari [`PROGRES.md`](PROGRES.md), [`PROGRES-S3-S8.md`](PROGRES-S3-S8.md), [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md), [`KEPUTUSAN-MVP-INTI.md`](KEPUTUSAN-MVP-INTI.md), rencana `rencana/P3..P10`, dan hasil kerja S5a. Bila bentrok, dokumen sumber itu yang berlaku; perbarui berkas ini setelah tiap gelombang.

**Cara memakai:** pilih bagian lalu panggil dengan ID-nya (mis. "kerjakan H-A3"). Kolom **Sumber** menunjuk dokumen dengan rincian lengkap. Tanda **(pengamatan)** berarti dicatat dari kondisi kode nyata, bukan dari dokumen rencana.

**Kondisi kode saat berkas ini dibuat (diperbarui 19 Okt 2026 untuk menu Tugas, cabang `feature/pm-tasks-menu`: 5790 tes lulus, typecheck nol, `smoke:prod` 39/39):** cabang `feature/project-management` di `9ab8261` (sudah di-push). 5506 tes lulus, typecheck nol, `smoke:prod` 39/39.

## 0. Apa itu "MVP 1"

Menurut [`KEPUTUSAN-MVP-INTI.md`](KEPUTUSAN-MVP-INTI.md) §1, **MVP Inti = S0 (akun dan akses) + S1 (Proyek) + S2 (Tugas inti)**. Menu lain (Inbox, Beranda, Events, Tim, Sampah penuh, Pengaturan lanjutan) sengaja **di luar** MVP 1.

| Bagian MVP 1 | Status kode | Yang tersisa |
|---|---|---|
| S0 Akun dan akses | selesai (91 dari 93 tugas `PROGRES.md`) | lihat H-A |
| S1 Proyek + profil | selesai, ditambah S5a (Tahapan, Perpanjang tenggat, Gantt) | lihat H-B |
| S2 Tugas inti | selesai dibangun (S2-01..15) | **gerbang uji pengguna nyata belum**; menu Tugas belum diaudit terhadap wireframe (H-C1) |

**MVP 1 dianggap selesai bila seluruh H-A terpenuhi.** Bagian H-B dan H-C yang bertanda "MVP 1" sebaiknya ikut; sisanya pasca MVP 1.

---

## H-A. Penutup MVP 1 (gerbang dan verifikasi)

| ID | Hutang | Kenapa | Sumber |
|---|---|---|---|
| H-A1 | **Uji pengguna putaran 1 dengan penguji NYATA** (S2-16): ≥3 dari 5 penguji berusia ≥50 menyelesaikan skenario tanpa bantuan. Skrip dan lembar catat sudah ada | Ini **gerbang S2 (SP-G2)**. Penguji masih `Penguji-1..5 (dummy)`; hasil dummy tidak dihitung | `PROGRES.md` S2-16; `uji-pengguna/putaran-1-*.md`; KEPUTUSAN §5 |
| H-A2 | **Gerbang demo S2** (S2-17): integrasi setelah uji pengguna, perbaikan temuan | Menutup S2 | `PROGRES.md` S2-17 |
| H-A3 | Ganti `Penguji-1..5 (dummy)` dan `Peninjau-2 (dummy)` dengan orang sungguhan | Prasyarat H-A1; dummy tidak boleh jadi dasar gerbang | KEPUTUSAN §5 butir 1-2 |
| H-A4 | **`smoke:binary` dan `smoke:coldboot` belum dijalankan** untuk S5a. Butuh **Bun 1.4.2** (mesin ini 1.3.14, build binary gagal di `./server/db/migrations`) | CLAUDE.md mewajibkan untuk perubahan di `server/` | `qa-s2.md` §5; sesi 19 Okt |
| H-A5 | **UAT login Google (S0A-15)** dijalankan manusia; kolom "Hasil" di `uat/UAT-S0A.md` masih kosong **(pengamatan)** | Cerita masuk-undangan-setujui belum terbukti di layar sungguhan | `uat/UAT-S0A.md` |
| H-A6 | Persetujuan user atas `contract-v1` dan demo S1 (SP-G1) | Di tabel gerbang `PROGRES.md` masih "belum" **(pengamatan: bisa jadi hanya belum diperbarui)** | `PROGRES.md` gerbang |
| H-A7 | **KB-3:** form "Ubah proyek" masih bisa mengubah tenggat langsung, tanpa lewat Perpanjang tenggat | Riwayat tenggat dan lencana "Diperpanjang ×N" bisa bolong. Perlu keputusan: tutup jalur itu atau biarkan | `P3` KB-3; laporan `ui-06` |
| H-A8 | `bun audit`: cek ulang high/critical sebelum rilis (terakhir 1 moderate saat SP-0.0) | Aturan global §10 | `PROGRES.md` SP-0.0 |
| H-A9 | **Rilis:** `main` tertinggal 431 commit dari `feature/project-management`. Belum ada PR/merge ke `main`, belum ada versi/tag. CHANGELOG masih `[Unreleased]` | Tanpa ini tidak ada yang bisa dipakai di luar cabang | sesi 19 Okt |

## H-B. Menu Proyek

**Pasca-MVP 1 (fitur yang ditunda sengaja):**

| ID | Hutang | Catatan | Sumber |
|---|---|---|---|
| H-B1 | **Cerita proyek (AI)** — kartu "Ceritakan proyeknya" masih **Coming soon**; layar ⑤⑥ belum dibangun | Fase 5 (P11). Butuh `ai_enabled` (bawaan mati, D3), tabel `project_story_drafts`, keputusan penyedia AI/biaya/privasi (R12, R13) | R10 P11; `P3` §2 Proyek ③ |
| H-B2 | **Template proyek** — kartu "Pakai template" **Coming soon**; layar ⑦; "Simpan sebagai template" di form | Fase 5. Butuh tabel `project_templates`. Tidak butuh AI, jadi bisa lebih dulu dari H-B1 | R10 P11; R02 |
| H-B3 | Retro, commits, status update AI di detail proyek | Dipangkas saat 7 tab jadi 4 (D02 #6). Jadwal tidak jelas ("fase 2" vs "fase 5") | `diskusi/02-proyek.md` #6; KON-05 |
| H-B4 | **Kalender proyek** dan **Channel** (layar Keano) | Kalender tanpa irisan; Channel tidak direncanakan. Inventaris tidak membaca isinya per elemen | `flow/04-pencocokan.md` X11 |

**Perlu dikerjakan / diputuskan (kecil-menengah):**

| ID | Hutang | Catatan | Sumber |
|---|---|---|---|
| H-B5 | ~~Pemilih Tahapan di form tugas + `phaseId` di DTO tugas~~ **Selesai 19 Okt 2026 (F1)**: form buat/ubah, `POST` menerima `phaseId`, detail memuat `phase`, riwayat `phase_changed`. **Sisa:** kolom/lencana Tahapan di **daftar** tugas (`phase` belum ada di `TaskListItem`) | Kecil; kerjakan bersama H-C12 | laporan `tm-F1` |
| H-B6 | Kartu "Tugas yang perlu perhatian" belum memuat tugas **jatuh tempo hari ini** dan "Menunggu diperiksa saya" | Yang kedua menunggu S4 Periksa | laporan `ui-06` |
| H-B7 | Hak **Perpanjang tenggat / Atur kondisi** memakai `can.update`, belum punya `can.extend`/`can.override` sendiri | Ubah bila ingin hak dibedakan | laporan `ui-06` |
| H-B8 | `extend-deadline` dan `condition-override` **ditolak untuk API key** (konservatif) | Bila butuh otomasi, buka dengan sadar + tes | laporan `s5a-04` |
| H-B9 | Filter "Perlu perhatian" menilai maks **1000** proyek aktif (`ATTENTION_SCAN_LIMIT`); kondisi dihitung ulang tiap permintaan, tanpa cache | Aman untuk target ≤200 proyek; tinjau bila data besar | laporan `s5a-04` |
| H-B10 | **Status tahapan diubah manual**; aktivitas "memulai tahapan" hanya muncul bila diubah manual | Opsi: turunkan otomatis dari tugas | laporan `ui-05` |
| H-B11 | Nama tahapan di batang Gantt hanya di `title`/`aria-label`, tidak tampil sebagai teks | Aksesibilitas visual; ubah bila terlalu samar | laporan `ui-07` |
| H-B12 | Halaman **riwayat aktivitas penuh** (sekarang hanya kartu dengan "Muat lebih banyak") **(pengamatan)** | | sesi 19 Okt |
| H-B13 | **Arsip dan duplikat proyek** tidak ada di dokumen mana pun **(pengamatan)**; sebagian besar kerjanya mirip H-B2 | Putuskan dulu perlu atau tidak | sesi 19 Okt |
| H-B14 | Layar admin memberi/mencabut peran Project Manager: dulu "belum ada wireframe". Cek apakah `/dashboard/users` sudah menutupnya **(pengamatan)** | | `diskusi/02-proyek.md` |
| H-B15 | Filter **Jenis tugas** di daftar tugas ditunda (tak berarti bagi awam) | Dicatat F3/KB-9 | `P3` KB-9 |

## H-C. Menu Tugas

| ID | Hutang | MVP 1? | Sumber |
|---|---|---|---|
| H-C1 | ~~Audit menu Tugas terhadap wireframe~~ **Selesai 19 Okt 2026** untuk daftar (L1, 7 selisih diperbaiki) dan form buat/ubah (F1). **Sisa audit:** halaman **detail** tugas dan tab Tugas proyek terhadap wireframe, serta pengecekan visual di browser (belum pernah dilihat; tes klik hanya tingkat alur) | **ya** (sisa) | laporan `tm-L1`, `tm-F1` |
| H-C2 | **Periksa** (T7): minta diperiksa, setujui/kembalikan, pemeriksa tidak boleh menyetujui hasil sendiri | pasca | `P10` L4-05, L4-09 |
| H-C3 | **Dependensi** ("Menunggu tugas lain") + "Giliran Anda" | pasca | `P10` L4-02, L4-04, L4-10 |
| H-C4 | **Tag** pada tugas | pasca | `P10` L4-06, L4-11 |
| H-C5 | **Papan/Kanban** di daftar tugas dan tab Tugas proyek (`?tampilan=papan`) | pasca | `P10` L4-12 |
| H-C6 | **Mention** (@nama) di komentar | pasca | `P10` L4-03, L4-13 |
| H-C7 | ~~Hapus tugas ke Sampah dengan tombol Urungkan (T1)~~ **Selesai 19 Okt 2026 (D1)**: `DELETE /api/app/tasks/:ref` (hapus lunak, izin pembuat + Pengelola + Admin), pulihkan, bagian Tugas di `/app/trash`. **Sisa:** hapus permanen dan pembersihan 30 hari tetap di H-D5 | selesai | laporan `tm-D1` |
| H-C8 | **Bukti** (unggah foto/PDF ≤10 MB) dan **kelola jenis tugas** (S5b) | pasca | `P10` L5-05..07, L5-12..14 |
| H-C9 | Impor/unduh CSV, pilih massal, estimasi jam tampil. ("Tulis saja ✦" **selesai 19 Okt 2026**: backend A1 + UI U1; **belum diuji ke API Anthropic sungguhan**, lihat H-C14) | fase 5 | `P3` §2 Tugas ②⑤⑦ |
| H-C10 | Kartu Inbox **"Terlambat"** dan "Geser tenggat" dari kartu ke modal Perpanjang tenggat | pasca | `P10` L4-14, L5-11 |
| H-C11 | Hitungan **Atlas 70% (wireframe) vs 17% (rumus)**: seed, UI, dan tes memakai 17% | catatan | `P3` KB-10 |
| H-C12 | Kolom/lencana **Tahapan** di daftar tugas; **nomor tugas** (`#42`) kecil di baris daftar supaya pencarian `#nomor` berguna; teks **"1–6 dari N tugas"** (butuh `total` di `GET /tasks`, KB-11 memilih tanpa total); lencana status di baris "Tugas saya" bila tak ada label utama **(RAGU dari L1)** | belum diputuskan | laporan `tm-L1` RAGU-1..3 |
| H-C13 | **Chip Belum/Sedang dikerjakan dan filter Tenggat** ditambahkan L1 di luar teks P3 (ada di wireframe SCR-TUGAS-01). Mudah dicabut bila terlalu ramai bagi penguji awam; putuskan setelah uji pengguna | catatan | laporan `tm-L1` RAGU-4 |
| H-C14 | **"Tulis saja ✦" belum diuji ke API Anthropic sungguhan** (semua tes memakai stub). Butuh `ANTHROPIC_API_KEY` di `.env`; periksa kualitas draf bahasa Indonesia, pencocokan nama, dan tanggal relatif ("Jumat") terhadap contoh di `03-tugas.md`; ukur latensi dan biaya per draf. Model default `claude-haiku-5-5` (`TASK_AI_MODEL`) | **ya** (bila AI dipamerkan) | laporan `tm-A1` |
| H-C15 | **Eden mengubah string `YYYY-MM-DD` menjadi objek `Date`** di klien (`app/lib/eden.ts`). U1 memulihkannya di `useTaskDraft`, tetapi pembaca Eden lain bisa terdampak diam-diam. Audit semua pemakai `client.api.app.*` yang membaca tanggal; perbaikan paling bersih di klien Eden bersama | **ya** | laporan `tm-U1` |
| H-C16 | `EmptyState` memakai tombol `size="sm"` (36 px) di semua layar `/app` (seharusnya `lg`); `ProjectFilters` Chip masih 28 px. Perbaikan terbersih di tema (`theme-components.ts`: Chip `xl`, SegmentedControl/MultiSelect `lg`) | kecil | laporan `tm-L1` RAGU-5 |
| H-C17 | Hapus tugas **tidak menulis `logActivity`** (hanya `audit()`); komentar usang di `app-tasks.write.ts` soal hapus belum dibersihkan; riwayat tugas tak mencatat "dihapus/dipulihkan" | kecil | laporan `tm-D1` |

> **Migrasi:** S5a memakai `0019`. S4 (H-C2..C6) harus mulai dari **`0020`**, lalu S5b.

## H-D. Menu lain — layar masih data contoh

**Temuan (pengamatan):** `app/routes/app/{home,inbox,events,team}.tsx` memakai `*.dummy.ts` (commit `1ab100f` "bring the prototype menus onto the backend branch"). Backend sebagian sudah ada, tetapi **layarnya belum tersambung**. Sidebar menampilkannya, jadi pengguna bisa mengira fiturnya jalan.

| ID | Menu | Backend | Yang belum | Sumber |
|---|---|---|---|---|
| H-D1 | **Beranda** | `GET /api/app/home` belum ada | Seluruh P4 (12 tugas): kartu hitungan, fokus, agenda, ringkasan. Rilis dua tahap tanpa "Perlu Anda tanggapi" dulu | `P4`; `PROGRES-S3-S8` §4 |
| H-D2 | **Inbox** | I01-I07, I11, I14 selesai (kartu, `notify()`, API, pembersihan) | I08 klien, I09 lonceng/NAV/rute, I10 halaman, I12 QA lintas-jalur, I13 gerbang demo | `P5` |
| H-D3 | **Events** | **Lingkup dipangkas selesai 20 Okt 2026 (buat, batalkan, hapus ke Sampah + Urungkan)**: E-01..E-12 dan E-15 selesai (E-04, E-07..E-11 di `feature/pm-events-menu`; E-12 dan E-15 di `nicoarya20/events-c-integrasi`, belum di-merge). Halaman `/app/events`, `/app/events/new`, `/app/events/:id` nyata; `contract-v1` kini 20 URL; 6059 tes lulus, typecheck nol, `smoke:prod` dan `smoke:binary` 44/44. Belum terbukti: tampilan di browser dan uji pengguna nyata (H-G12) | Sub-butir H-D3a..H-D3f (ditunda) dan H-D3g..H-D3n (hutang temuan pekerja) di bawah | `P6`; laporan E-04..E-15 |
| H-D3a | Events: notulensi ketik di UI | Backend E-05 sudah ada (kunci optimis). Detail acara memakai teks pasif "segera hadir" | UI notulensi di E-11 | `P6` §3 |
| H-D3b | Events: rekam suara, foto, AI, hasil rapat, tugas dari rapat (wireframe layar 5a-7, E-13) | Belum ada skema `event_note_source`/`event_outcome`, status `waiting_confirm`, atau speech-to-text | Keputusan terbuka: penyedia speech-to-text, retensi audio (usul 30 hari setelah dikonfirmasi), persetujuan peserta direkam, apakah Member boleh mengonfirmasi tugas. Jalur terpisah, induk `feature/pm-events-voice` | diskusi `05-events.md` §6 |
| H-D3c | Events: kalender Bulan/Minggu (E-14) | Layar contoh punya `MonthGrid`; tombol Daftar/Kalender disembunyikan sampai ada | `GET /calendar` + grid, sekitar 2 hari | `P6` E-14 |
| H-D3d | Events: acara berulang dan "Hanya yang ini / Semua" (E-16, wireframe 8b) | Tidak ada | `event_series`, materialisasi 90 hari | `P6` E-16 |
| H-D3e | Events: widget Agenda di Beranda (bagian E-11, H3) | `GET /events/agenda` sudah ada | Menunggu Beranda produk (H-D1) | `P6` H3 |
| H-D3f | Wireframe layar 8 "Hapus event?" bentrok dengan T1 (hapus tanpa dialog + Urungkan) | Implementasi mengikuti T1 | Revisi wireframe | keputusan 20 Okt 2026 |
| H-D3g | Events: **Ubah acara** dan **tambah/hapus peserta** di detail | `PATCH /events/:id`, `POST /events/:id/participants`, dan `DELETE …/participants/:userId` sudah ada, tetapi detail acara tidak punya item "Ubah acara" (wireframe layar 4 punya tombol Ubah) maupun UI peserta (`can.manageParticipants`) | Halaman/form ubah (pakai ulang `EventForm`) + UI peserta | laporan E-11 |
| H-D3h | Events: `GET /api/app/events/people` terbalik dan menolak Member | Tanpa `projectId` memakai `canCreateProject` (Member dijawab 403 `NOT_APP_ROLE`); dengan `projectId` justru **mengecualikan** anggota proyek. Komentar di `app-events.ts` bertentangan dengan perilaku. Form Event baru memakai `GET /api/app/team?q=` (sejalan H-G4) | Perbaiki endpoint atau cabut; README sudah mencatat bahwa form tidak memakainya | laporan E-10 |
| H-D3i | Events: kartu `event_reminder` lama tidak ditutup saat acara dibatalkan atau dihapus; belum ada UI/endpoint preferensi notifikasi | Lane info tidak punya "selesai", jadi kartu lama tetap di Kabar terbaru; tombol pengaturan pemberitahuan menunggu S6 (H-D6) | Tutup/hapus kartu pengingat saat batal/hapus; preferensi di S6 | laporan E-04 |
| H-D3j | ~~Events: tab **Akan datang** memotong di `starts_at >= now`~~ | **Selesai 20 Okt 2026** di `fix/pm-events-running-tab`: tab kini memotong di `ends_at` (Akan datang = belum berakhir, Sudah lewat = sudah berakhir), jadi acara yang sedang berlangsung tetap di Akan datang. Kursor paginasi tetap di `starts_at`. Sisa: kueri `GET /events/agenda` masih memotong di `starts_at >= now` (acara berlangsung tidak ikut Agenda; ikut diperbaiki saat widget Agenda dibangun, H-D3e); belum ada indeks `ends_at` (daftar Akan datang memindai indeks `starts_at` dari awal; tambahkan indeks parsial bila acara mencapai ribuan, nomor migrasi menunggu baton) | – | laporan E-09 |
| H-D3k | Events: acara lintas tengah malam tidak bisa dibuat dari form | Form hanya satu tanggal (jam selesai harus setelah jam mulai di hari yang sama); API menerimanya, dan daftar sudah menyebut hari akhir | Pilihan tanggal selesai di tahap 2 | laporan E-10 |
| H-D3l | Repo tidak punya DOM test | Klik, efek navigasi setelah simpan, dan dialog Batalkan hanya dites lewat markup, pohon elemen, dan panggilan API tiruan, tidak dijalankan di DOM/browser | Tambah happy-dom/testing-library atau uji browser eksplisit (H-G12) | laporan E-10, E-11 |
| H-D3m | `tests/storage/bucket.test.ts` ("ensureBucket live S3") gagal bila RustFS milik user di port 54330 sedang jalan | Masalah lingkungan, bukan kode Events: tes menolak RustFS yang bukan miliknya. Dilaporkan 3 tes gagal di lari penuh; 1 gagal saat berkas dijalankan sendiri (20 Okt). Lolos dengan `LOCAL_S3_PORT=<port bebas>` | Pilih port tes yang tidak bentrok secara otomatis | laporan E-08..E-11, E-15 |
| H-D3n | `tests/db/pm-indexes.test.ts` "tasks by assignee" sempat flaky sekali | Gagal sekali pada lari penuh pertama E-04..E-07, lulus sendirian dan di lari berikutnya (diduga pilihan planner); tidak muncul di 6059 tes E-15 | Amati; bila berulang, stabilkan tesnya | laporan E-04 |
| H-D4 | **Tim** | M01-M04 selesai; **M06 (daftar) dan M07 (detail) selesai 20 Okt 2026** di `feature/pm-team-menu`: tersambung ke API, urutan Nama / Tugas aktif terbanyak (global, jendela 200 orang), Peran akun hanya Admin/Super-admin, ketersediaan disembunyikan | M05 indeks `project_member (project_id, role)` (tidak diperlukan sejauh ini), M08 pra-cek hapus akun pengelola tunggal, M09 pengaturan tim, sisa M10 (demo). **Ketersediaan/cuti dan urutan ketersediaan:** menunggu cuti (fase 5) dan Events | `P7` |
| H-D5 | **Sampah** | Z-01 (aturan). Sampah **proyek** sudah jalan (S1-18) | Z-02..Z-08: Sampah tugas dan acara, hapus permanen (Admin), pembersihan 30 hari, Urungkan | `P8` |
| H-D6 | **Pengaturan lanjutan** | Profil + ukuran teks sudah (S1-14) | Seluruh P9 (9 tugas, G-01..G-09): bagian "Keamanan dan perangkat", hapus akun sendiri (T3; Super-admin dulu), saklar Pemberitahuan dan efeknya di Inbox, pengaturan tim (pengingat acara bawaan), QA | `P9` |
| H-D7 | Berkas bingkai (`app/routes.ts`, `NAV`, `AppFrame.tsx`) diklaim dua rencana (I09 dan E-08) | Satu tugas integrator memasang NAV+rute Inbox dan Event sekaligus, `APP_URLS` naik. **Hitungan URL kini 20** (tab Tahapan, `/app/team/:userId`, `/app/events/new`, `/app/events/:id`); rute Events terpasang | `PROGRES-S3-S8` §6b |
| H-D8 | Keputusan user menggantung: (1) pencarian peserta untuk Member (`GET /events/people`): form Event baru sementara memakai `GET /team?q=` (H-D3h). ~~(2) `sort=overdue` Tim~~ **selesai 20 Okt 2026**: urutan beban kini global (jendela 200 orang) | Butuh jawaban sebelum E-09 dan M06 | `PROGRES-S3-S8` §6b |

## H-E. Hutang teknis

| ID | Hutang | Pemilik penghapusan | Sumber |
|---|---|---|---|
| H-E1 | `PM_DENY_PENDING` berisi `DELETE trash/*` di `scopes.pm.ts` (perancah) | Z-04; batas akhir gerbang Z-08 | `PROGRES-S3-S8` §8 |
| H-E2 | Tuple enum notifikasi di `schema.notification.ts`, bukan `server/pm/enums.ts` | gerbang S3 | idem |
| H-E3 | `task.service.ts` 306 baris (batas 300; +7 baris kohesif untuk `phaseId`) | pecah saat menyentuh berkas itu lagi | laporan `s5a-02` |
| H-E4 | Satu `biome-ignore noArrayIndexKey` (sel pengisi statis di Gantt), beralasan | pantau | audit pra-push |
| H-E5 | Batas 1000 proyek pada filter perhatian, tanpa cache kondisi | lihat H-B9 | laporan `s5a-04` |
| H-E6 | Audit baru `project.condition.set/cleared` ditambahkan di luar permintaan pasti; hapus bila tak diinginkan | keputusan user | laporan `s5a-04` |
| H-E7 | Tes `project.query` memakai anggaran query detail 8 (naik dari 4-6 karena riwayat tenggat + rencana kondisi); tinjau bila detail ditambah | pemilik query detail | penggabungan S5a |
| H-E8 | **Tes yang sesekali gagal:** `tests/db/pm-indexes.test.ts` (`tasks by assignee … task_assignee_id_status_due_date_idx`, statistik perencana Postgres) gagal sekali dari tiga run penuh dan lulus saat diulang; `membership.query` dilaporkan serupa oleh worker. Tidak terkait menu Tim | pemilik tes indeks | gelombang Tim 20 Okt |
| H-E9 | **Tes rute hanya membaca teks sumber** (`tests/app-routes.test.ts`), tidak mengimpor loader: impor yang rusak (`getPerson` dipindah modul) lolos dari `bun run test` dan baru ditolak typecheck/build. Tambah tes yang mengimpor tiap modul rute, atau jadikan typecheck gerbang wajib | pemilik tes rute | gelombang Tim 20 Okt |

## H-F. Fase 5 dan sesudahnya (sengaja belum dijadwalkan)

AI: cerita proyek, notulensi foto/suara, Ask Data (butuh `ai_enabled`, D3) · Template proyek (H-B2) · Impor/unduh CSV · Cuti dengan persetujuan · Mode Pendamping · Retro/commits/status update AI · Kalender proyek, Channel · Menu Ticket/Pengembangan terpisah · **S8 Pengerasan dan rilis** (belum direncanakan): tinjauan UU PDP sebelum rilis, narasi editorial README (X1-Q8), uji rilis "≥4 dari 5 dalam ≤3 menit".

## H-G. Keputusan user yang masih terbuka

| ID | Pertanyaan | Usulan | Dampak |
|---|---|---|---|
| H-G1 | Tutup jalur ubah tenggat langsung (KB-3)? | Ya, arahkan ke Perpanjang tenggat | H-A7 |
| H-G2 | Buka `extend-deadline`/`condition-override` untuk API key? | Tetap ditolak | H-B8 |
| H-G3 | Fitur AI: penyedia, biaya, dan privasi data | **Default sementara dipakai (19 Okt 2026):** Anthropic Messages API lewat `fetch`, kunci opsional `ANTHROPIC_API_KEY`, hanya teks + nama anggota yang dikirim, tanpa log teks. Menunggu persetujuan user; biaya belum diukur (H-C14) | H-B1 |
| H-G4 | Pencarian peserta Event untuk Member (H-D8-1) | Batasi ke orang sekawan proyek (`loadScopeFor`) | E-09 |
| H-G5 | ~~`sort=overdue` Tim: ganti label atau perluas kueri (H-D8-2)~~ | **Selesai 20 Okt 2026**: dijawab dengan memperluas kueri (jendela 200 orang) | M06 |
| H-G6 | Arsip/duplikat proyek perlu? (H-B13) | Tunda | |
| H-G7 | **Menu Tugas, 19 Okt 2026:** setujui atau ganti penyedia AI "Tulis saja ✦" (sama dengan H-G3, kini sudah dibangun): Anthropic via `fetch`, model default `claude-haiku-5-5`. Perlu `ANTHROPIC_API_KEY` dari user untuk uji sungguhan | Setujui, lalu jalankan H-C14 | H-C14 |
| H-G8 | **Eden mengubah `YYYY-MM-DD` menjadi `Date`:** perbaiki di klien Eden bersama (`app/lib/eden.ts`) atau tetap menambal per pemakai seperti `useTaskDraft`? | Perbaiki di klien bersama, setelah audit semua pembaca tanggal | H-C15 |
| H-G9 | **Chip Belum/Sedang dikerjakan dan filter Tenggat** di daftar tugas (tambahan L1, ada di wireframe tapi bukan di P3): pertahankan atau cabut? | Pertahankan sampai uji pengguna nyata, lalu putuskan dari temuan | H-C13 |
| H-G10 | **Daftar tugas:** tampilkan **nomor `#42`** di baris? Tambah kolom/lencana **Tahapan**? Tambah **total** ("1–6 dari N tugas") padahal KB-11 memilih keyset tanpa total? Lencana status di "Tugas saya" bila tak ada label? | Nomor: ya (satu baris kecil di bawah judul). Tahapan: ya. Total: tunda. Lencana status: tunda | H-C12 |
| H-G11 | **Ukuran sentuh di tema:** ubah `theme-components.ts` (Chip `xl`, SegmentedControl dan MultiSelect `lg`) dan tombol `EmptyState` jadi `lg` untuk seluruh `/app`? | Ya, satu PR kecil `chore(theme)` | H-C16 |
| H-G12 | **Cek visual di browser** menu Tugas (daftar, Tulis saja, Hapus + Urungkan, Sampah) belum pernah dilakukan; aturan global melarang Playwright tanpa perintah eksplisit | User memerintahkan "buka browser dan cek …" atau mengeceknya sendiri | H-C1 |
| H-G13 | **Push dan PR cabang `feature/pm-tasks-menu`** ke `origin`/`main`, lalu hapus 5 worktree anak (`tm-l1-list`, `tm-f1-form`, `tm-a1-ai-draft` di folder `tm-l1-ai-draft`, `tm-d1-delete`, `tm-u1-write-ui`). Wajib laporan Pre-Push Guarantee dan perintah eksplisit "push"; merge ke `main` hanya atas persetujuan | Push setelah H-G7..G12 diputuskan atau dicatat | H-A9 |

---

## Urutan yang disarankan untuk MVP 1

1. ~~**H-C1** audit menu Tugas, **H-B5** pemilih Tahapan~~ selesai untuk daftar dan form (19 Okt); sisa: audit detail tugas + cek visual di browser, **H-C15** (Eden Date), **H-C14** (uji AI sungguhan), **H-C12** (kolom Tahapan/nomor di daftar).
3. **H-A7 / H-G1** putuskan KB-3 (kecil, tapi memengaruhi riwayat tenggat).
4. **H-A4** jalankan smoke binary dan coldboot dengan Bun 1.4.2.
5. **H-A1..A3** cari penguji nyata, jalankan uji pengguna, lalu **H-A2** gerbang demo S2.
6. **H-A9** rilis: CHANGELOG berversi, PR ke `main`.

Setelah MVP 1: **H-C2..C5** (S4), lalu **H-D** (hubungkan layar contoh ke backend) menurut menu yang paling dibutuhkan.
