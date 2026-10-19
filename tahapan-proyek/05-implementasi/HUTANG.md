# HUTANG — Daftar semua yang belum dikerjakan

> Dibuat 19 Oktober 2026, setelah S5a (Proyek) selesai dan di-push. **Satu tempat untuk memanggil hutang saat fokus pengerjaan berikutnya ditentukan.** Berkas ini merangkum dari [`PROGRES.md`](PROGRES.md), [`PROGRES-S3-S8.md`](PROGRES-S3-S8.md), [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md), [`KEPUTUSAN-MVP-INTI.md`](KEPUTUSAN-MVP-INTI.md), rencana `rencana/P3..P10`, dan hasil kerja S5a. Bila bentrok, dokumen sumber itu yang berlaku; perbarui berkas ini setelah tiap gelombang.

**Cara memakai:** pilih bagian lalu panggil dengan ID-nya (mis. "kerjakan H-A3"). Kolom **Sumber** menunjuk dokumen dengan rincian lengkap. Tanda **(pengamatan)** berarti dicatat dari kondisi kode nyata, bukan dari dokumen rencana.

**Kondisi kode saat berkas ini dibuat:** cabang `feature/project-management` di `9ab8261` (sudah di-push). 5506 tes lulus, typecheck nol, `smoke:prod` 39/39.

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
| H-B5 | **Pemilih Tahapan di form tugas** + `phaseId` di DTO tugas | Server sudah menerima `PATCH /tasks/:ref {phaseId}`; yang kurang DTO tugas dan UI. **Dikerjakan bersamaan dengan menu Tugas** | laporan `ui-05` |
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
| H-C1 | **Audit menu Tugas terhadap wireframe** (seperti yang dilakukan untuk Proyek): daftar, filter, form, detail, tab Tugas di proyek. Belum pernah dibandingkan sejak S2 selesai **(pengamatan)** | **ya** | sesi 19 Okt |
| H-C2 | **Periksa** (T7): minta diperiksa, setujui/kembalikan, pemeriksa tidak boleh menyetujui hasil sendiri | pasca | `P10` L4-05, L4-09 |
| H-C3 | **Dependensi** ("Menunggu tugas lain") + "Giliran Anda" | pasca | `P10` L4-02, L4-04, L4-10 |
| H-C4 | **Tag** pada tugas | pasca | `P10` L4-06, L4-11 |
| H-C5 | **Papan/Kanban** di daftar tugas dan tab Tugas proyek (`?tampilan=papan`) | pasca | `P10` L4-12 |
| H-C6 | **Mention** (@nama) di komentar | pasca | `P10` L4-03, L4-13 |
| H-C7 | **Hapus tugas ke Sampah** dengan tombol Urungkan (T1). Sengaja tidak dipasang di S2 karena Sampah tugas baru ada di S6 | pasca (bergantung Sampah, H-D5) | KEPUTUSAN X1-Q1 |
| H-C8 | **Bukti** (unggah foto/PDF ≤10 MB) dan **kelola jenis tugas** (S5b) | pasca | `P10` L5-05..07, L5-12..14 |
| H-C9 | Impor/unduh CSV, pilih massal, "Tulis saja ✦" (AI), estimasi jam tampil | fase 5 | `P3` §2 Tugas ②⑤⑦ |
| H-C10 | Kartu Inbox **"Terlambat"** dan "Geser tenggat" dari kartu ke modal Perpanjang tenggat | pasca | `P10` L4-14, L5-11 |
| H-C11 | Hitungan **Atlas 70% (wireframe) vs 17% (rumus)**: seed, UI, dan tes memakai 17% | catatan | `P3` KB-10 |

> **Migrasi:** S5a memakai `0019`. S4 (H-C2..C6) harus mulai dari **`0020`**, lalu S5b.

## H-D. Menu lain — layar masih data contoh

**Temuan (pengamatan):** `app/routes/app/{home,inbox,events,team}.tsx` memakai `*.dummy.ts` (commit `1ab100f` "bring the prototype menus onto the backend branch"). Backend sebagian sudah ada, tetapi **layarnya belum tersambung**. Sidebar menampilkannya, jadi pengguna bisa mengira fiturnya jalan.

| ID | Menu | Backend | Yang belum | Sumber |
|---|---|---|---|---|
| H-D1 | **Beranda** | `GET /api/app/home` belum ada | Seluruh P4 (12 tugas): kartu hitungan, fokus, agenda, ringkasan. Rilis dua tahap tanpa "Perlu Anda tanggapi" dulu | `P4`; `PROGRES-S3-S8` §4 |
| H-D2 | **Inbox** | I01-I07, I11, I14 selesai (kartu, `notify()`, API, pembersihan) | I08 klien, I09 lonceng/NAV/rute, I10 halaman, I12 QA lintas-jalur, I13 gerbang demo | `P5` |
| H-D3 | **Events** | E-01..E-03, E-05, E-06 selesai (tabel, izin, mesin baca-tulis, API) | E-04 pengingat (menunggu `notify()`), E-07 Sampah acara, E-08a klien, E-09..E-16 halaman dan QA. Tambah 3 URL `/app/events*` ke `contract-v1` | `P6` |
| H-D4 | **Tim** | M01-M04 selesai (aturan, baca data, API daftar/detail) | M05 indeks `project_member (project_id, role)`, M06..M10 halaman dan QA. `sort=overdue` hanya mengurutkan halaman tampil | `P7` |
| H-D5 | **Sampah** | Z-01 (aturan). Sampah **proyek** sudah jalan (S1-18) | Z-02..Z-08: Sampah tugas dan acara, hapus permanen (Admin), pembersihan 30 hari, Urungkan | `P8` |
| H-D6 | **Pengaturan lanjutan** | Profil + ukuran teks sudah (S1-14) | Seluruh P9 (9 tugas, G-01..G-09): bagian "Keamanan dan perangkat", hapus akun sendiri (T3; Super-admin dulu), saklar Pemberitahuan dan efeknya di Inbox, pengaturan tim (pengingat acara bawaan), QA | `P9` |
| H-D7 | Berkas bingkai (`app/routes.ts`, `NAV`, `AppFrame.tsx`) diklaim dua rencana (I09 dan E-08) | Satu tugas integrator memasang NAV+rute Inbox dan Event sekaligus, `APP_URLS` naik. **Hitungan URL kini 17** (tab Tahapan) | `PROGRES-S3-S8` §6b |
| H-D8 | Dua keputusan user menggantung: (1) pencarian peserta untuk Member (`GET /events/people`), (2) `sort=overdue` Tim | Butuh jawaban sebelum E-09 dan M06 | `PROGRES-S3-S8` §6b |

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

## H-F. Fase 5 dan sesudahnya (sengaja belum dijadwalkan)

AI: cerita proyek, notulensi foto/suara, Ask Data (butuh `ai_enabled`, D3) · Template proyek (H-B2) · Impor/unduh CSV · Cuti dengan persetujuan · Mode Pendamping · Retro/commits/status update AI · Kalender proyek, Channel · Menu Ticket/Pengembangan terpisah · **S8 Pengerasan dan rilis** (belum direncanakan): tinjauan UU PDP sebelum rilis, narasi editorial README (X1-Q8), uji rilis "≥4 dari 5 dalam ≤3 menit".

## H-G. Keputusan user yang masih terbuka

| ID | Pertanyaan | Usulan | Dampak |
|---|---|---|---|
| H-G1 | Tutup jalur ubah tenggat langsung (KB-3)? | Ya, arahkan ke Perpanjang tenggat | H-A7 |
| H-G2 | Buka `extend-deadline`/`condition-override` untuk API key? | Tetap ditolak | H-B8 |
| H-G3 | Fitur AI: penyedia, biaya, dan privasi data | belum ada usulan | H-B1 |
| H-G4 | Pencarian peserta Event untuk Member (H-D8-1) | Batasi ke orang sekawan proyek (`loadScopeFor`) | E-09 |
| H-G5 | `sort=overdue` Tim: ganti label atau perluas kueri (H-D8-2) | Ganti label | M06 |
| H-G6 | Arsip/duplikat proyek perlu? (H-B13) | Tunda | |

---

## Urutan yang disarankan untuk MVP 1

1. **H-C1** audit menu Tugas terhadap wireframe, lalu perbaiki selisihnya (seperti Proyek).
2. **H-B5** pemilih Tahapan di form tugas, dikerjakan bersama H-C1.
3. **H-A7 / H-G1** putuskan KB-3 (kecil, tapi memengaruhi riwayat tenggat).
4. **H-A4** jalankan smoke binary dan coldboot dengan Bun 1.4.2.
5. **H-A1..A3** cari penguji nyata, jalankan uji pengguna, lalu **H-A2** gerbang demo S2.
6. **H-A9** rilis: CHANGELOG berversi, PR ke `main`.

Setelah MVP 1: **H-C2..C5** (S4), lalu **H-D** (hubungkan layar contoh ke backend) menurut menu yang paling dibutuhkan.
