# PROGRES — Simple PM, MVP Inti (S0-S2)

> Dibuat 15 Oktober 2026. **Satu-satunya tempat yang menunjukkan tugas mana yang sudah selesai.** Diperbarui oleh koordinator setiap ada tugas yang mulai, masuk review, selesai, atau diblokir. Daftar tugas dihasilkan dari tiga rencana di `rencana/`; bila rencana berubah, ID di sini harus ikut diperbarui (jangan ubah ID tanpa mengubah rencananya).

**Status:** `belum` · `berjalan` · `review` (selesai dikerjakan, menunggu persetujuan merge gelombang) · `selesai` (sudah di-merge ke `feature/project-management`) · `diblokir` (tulis alasannya di kolom Hasil).

## Ringkasan

| Kelompok | Tugas | Selesai | Berjalan/review | Diblokir |
|---|---|---|---|---|
| S0.0 — Prasyarat ops | 9 | 5 | 0 | 0 |
| S0.a — Akun dan akses | 15 | 0 | 0 | 0 |
| S0.b — Kontrak beku | 33 | 0 | 0 | 0 |
| S1 — Proyek dan profil | 18 | 0 | 0 | 0 |
| S2 — Tugas inti | 17 | 0 | 0 | 0 |
| **Total** | **92** | **5** | **0** | **0** |

Estimasi total MVP Inti ≈ 128 hari-orang AI (KEPUTUSAN-MVP-INTI.md §6). Gerbang S2 (uji pengguna) belum terpenuhi: penguji masih data dummy.

## Gerbang dan titik sinkron

| Gerbang | Syarat | Dibuka oleh | Status |
|---|---|---|---|
| SP-0.0 | S0.0-01..09 selesai; `bun run test` hijau di worktree bersih; `bun audit` nol high/critical; laporan ke user | S0.a, S0.b | belum |
| SP1a | S0B-01 ter-merge (enum + `schema.columns`) | S0.a memakai `TEXT_SIZES`/`APPROVAL_STATUSES` | belum |
| SP0a | S0.a merge pertama: `Role` 4 nilai + `assertAccountApproved` | S0B-12 ke atas | belum |
| SP0 | S0.a merge migrasi 0014 (+ `ROLE_RANK`) | S0B-03 (0015), S0B-19/21/25 | belum |
| SY-1 .. SY-4 | S0B-13 · S0B-20 (guard rekursif) · S0B-04 (introspect) · S0B-23 (ratchet 0) | lajur lain S0.b | belum |
| **contract-v1 (SP1)** | S0B-33 lulus + **persetujuan user** | semua lajur S1 dan S2 | belum |
| SP-S1a / SP-S1b | S1-02 merge · S1-03 dan S1-04 merge | UI proyek, form tugas | belum |
| SP2 | S2-03 merge (`GET /tasks…` stabil) | UI tugas | belum |
| SP-S2a / SP-M | S2-05, S2-06 merge · S1-10 merge | S2-12/13 · S2-14 | belum |
| SP-G1 | S1-17: demo S1 diterima user | (tidak memblokir S2) | belum |
| **SP-G2** | S2-16: uji pengguna ≥3 dari 5 penguji **nyata** berusia ≥50 selesai tanpa bantuan | S3 boleh dimulai | belum |

## S0.0 — Prasyarat ops

Sumber spesifikasi: `rencana/P1-s0a-akun-akses.md §4`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S0.0-01 | Commit rebrand + catatan (M0) | Gel. 1 | – | S | **selesai** | `feature/project-management` | `972971f` `707117a` `0e4e490` `03d572c` `13b5e80` | typecheck nol dan 687 test lulus dilaporkan worker rebrand; tidak dijalankan ulang saat commit. Dilakukan sebagai 5 commit (rencana: 2) karena ikut mencatat keputusan |
| S0.0-02 | Pin Bun 1.4.2, `.gitattributes` CHANGELOG union | Gel. 2 | 01 | S | **selesai** | `chore/pm-s00-bun-pin` | `3e6cc47` merge `68724ee` | worker: 694 lulus/0 gagal, lint = baseline. Koordinator: cabang, basis `da48344`, berkas dalam Target. CHANGELOG belum diisi (ditangani saat integrasi) |
| S0.0-03 | `BETTER_AUTH_SECRET`: `.env.example`, `env.ts`, preload test | Gel. 2 | 01 | S | **selesai** | `chore/pm-s00-auth-secret` | `bd1c451` merge `952b171` | worker: 692 lulus/0 gagal; smoke:prod dan smoke:binary 23/23 (Bun 1.4.2 sementara). Penyimpangan: `\|\|=` bukan `??=` di preload (rahasia kosong dianggap tidak di-set) |
| S0.0-06 | Generator migrasi berguard + dua test penjaga | Gel. 2 | 01 | L | **selesai** | `chore/pm-s00-migration-generator` | `7e21b26` `0ce6a7e` merge `df71f93` | worker: 749 lulus/0 gagal; migrasi 0004-0013 idempoten tanpa pengecualian; `db:generate` tanpa argumen gagal dengan pesan jelas. Penyimpangan: handler memakai `duplicate_object OR duplicate_table` |
| S0.0-08 | Subcommand `migrate` + Docker + doctor | Gel. 2 | 01 | M | **selesai** | `chore/pm-s00-migrate-command` | `c7328e3` merge `263c667` | worker: 696 lulus/0 gagal; smoke:prod/binary/coldboot 23/23 (Bun 1.4.2 sementara). Penyimpangan: ikut mengubah `tests/cli/dispatch.test.ts` (1 baris) dan `docker-compose.yml` hanya komentar |
| S0.0-04 | Pin Mantine 9.6.3 + `@mantine/dates` + `dayjs` | Gel. 3 | 02 | M | belum |  |  |  |
| S0.0-07 | Stub skema + barrel + `drizzle.config.ts` + CI drift | Gel. 3 | 02, 06 | S | belum |  |  |  |
| S0.0-09 | `tests/test-hygiene.test.ts` (ratchet `mock.module`) | Gel. 3 | 03 | S | belum |  |  |  |
| S0.0-05 | Perbaikan `bun audit` (proxy-addr, MCP SDK, source-map-js) | Gel. 4 | 04 | M | belum |  |  |  |

## S0.a — Akun dan akses

Sumber spesifikasi: `rencana/P1-s0a-akun-akses.md §5`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S0A-01 | Rename role → 4 role, `emailVerified` super-admin | Gel. A | SP-0.0 | M | belum |  |  |  |
| S0A-02 | Skema akun + migrasi 0014 (pemegang baton) | Gel. A | SP-0.0 | L | belum |  |  |  |
| S0A-03 | Kebijakan akun murni (`server/access`) | Gel. B | 01 | M | belum |  |  |  |
| S0A-05 | `auth.ts`: field persetujuan, kebijakan email, linking | Gel. B | 02 | M | belum |  |  |  |
| S0A-04 | Undangan + keputusan sign-up | Gel. C | 01, 02, 03 | M | belum |  |  |  |
| S0A-07 | Guard menahan pending/rejected + API key | Gel. C | 05 | L | belum |  |  |  |
| S0A-12 | Layar login Google-only | Gel. C | 05 | S | belum |  |  |  |
| S0A-06 | Hook sign-up: pending, undangan, profil, audit | Gel. D | 04, 05 | M | belum |  |  |  |
| S0A-08 | Gerbang `/api/auth/*` (admin, email prod) | Gel. D | 05 | M | belum |  |  |  |
| S0A-09 | Pecah admin API + matriks role baru | Gel. D | 03, 07 | L | belum |  |  |  |
| S0A-10 | Endpoint setujui/tolak + undangan | Gel. E | 04, 06, 09 | L | belum |  |  |  |
| S0A-11 | Halaman tahan `/waiting` | Gel. E | 07 | M | belum |  |  |  |
| S0A-13 | Cabut demo anonim | Gel. E | 06, 07, 08, 12 | M | belum |  |  |  |
| S0A-14 | Halaman `/dashboard/users` | Gel. F | 10, 11 (UI lunak sejak 09) | L | belum |  |  |  |
| S0A-15 | Gerbang akhir S0.a, ADR, UAT, permintaan review | Gel. G | semua | S | belum |  |  |  |

## S0.b — Kontrak beku

Sumber spesifikasi: `rencana/P2-s0b-kontrak-beku.md §3`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S0B-01 | Enum bersama, soft delete, helper kolom, sesi DB UTC | Lajur D | G0 | 🔥 | belum |  |  |  |
| S0B-02 | Skema proyek | Lajur D | S0B-01 | M (1) | belum |  |  |  |
| S0B-03 | Migrasi 0015 `project_core` | Lajur D | S0B-02, G0, G-A2, G-Q5 | 🧊 🔥 | belum |  |  |  |
| S0B-04 | Patch `schema-introspect` (D8e) | Lajur D | S0B-01 | S (0,75) | belum |  |  |  |
| S0B-05 | Skema tugas | Lajur D | S0B-02, S0B-04 | M (1,5) | belum |  |  |  |
| S0B-06 | Migrasi 0016 `task_core` | Lajur D | S0B-03, S0B-05 (S0B-04 sudah merge) | 🧊 🔥 | belum |  |  |  |
| S0B-07 | Tes kontrak skema dan indeks | Lajur D | S0B-06 | S (0,75) | belum |  |  |  |
| S0B-08 | Metrics 1: konfigurasi, tanggal, hitungan tugas | Lajur D | S0B-01 | M (1) | belum |  |  |  |
| S0B-09 | Metrics 2: progres, waktu berjalan, kondisi proyek | Lajur D | S0B-08 | M (1) | belum |  |  |  |
| S0B-10 | Keanggotaan proyek (query) | Lajur D | S0B-06, S0B-12 | M (1) | belum |  |  |  |
| S0B-11 | Infrastruktur `server/pm`: galat, transaksi, keyset, batas | Lajur K | S0B-01 | M (1) | belum |  |  |  |
| S0B-12 | Fondasi `server/access`: tipe, keputusan, level, flag | Lajur K | S0B-11, G-A1 | M (1) | belum |  |  |  |
| S0B-13 | Izin pengguna dan status akun | Lajur K | S0B-12 | M (1) | belum |  |  |  |
| S0B-14 | Izin proyek dan anggota | Lajur K | S0B-12 | M (1,5) | belum |  |  |  |
| S0B-15 | Izin pemeriksa (review) | Lajur K | S0B-12 | M (1) | belum |  |  |  |
| S0B-16 | Izin tugas dan alur kerja | Lajur K | S0B-12, S0B-15 | L (2,5) | belum |  |  |  |
| S0B-17 | Kapabilitas (`can{}`) dan paritas | Lajur K | S0B-13, 14, 15, 16 | M (1) | belum |  |  |  |
| S0B-18 | Kerangka API `/api/app` | Lajur K | S0B-11, G-A1 | 🔥 | belum |  |  |  |
| S0B-19 | Pemetaan scope kunci API (`PM_KEY_DENY`) | Lajur K | S0B-18, G-A2 | 🔥 | belum |  |  |  |
| S0B-20 | `app-routes.test.ts` rekursif (D8a) | Lajur A | G0 | S (0,25) | belum |  |  |  |
| S0B-21 | `tests/support` dasar (D8c) | Lajur A | S0B-20, G-A2 | M (1) | belum |  |  |  |
| S0B-22 | Konversi `mock.module(guard)` batch 1 (D8d) | Lajur A | S0B-21 | M (1,5) | belum |  |  |  |
| S0B-23 | Konversi batch 2 + ratchet ke 0 | Lajur A | S0B-22 | M (1,5) | belum |  |  |  |
| S0B-24 | Tema dan token R11 (D2) | Lajur A | G0 | M (1) | belum |  |  |  |
| S0B-25 | Ukuran teks di root loader dan cookie `mk-text-size` | Lajur A | S0B-24, G-A2 | 🔥 | belum |  |  |  |
| S0B-26 | Komponen dasar T1 | Lajur A | S0B-24 | M (1) | belum |  |  |  |
| S0B-27 | Komponen domain T2 | Lajur A | S0B-26, S0B-08 | M (1) | belum |  |  |  |
| S0B-28 | Komponen tabel, filter, modal alasan, hook T3-T4 | Lajur A | S0B-26, S0B-27 | M (1,5) | belum |  |  |  |
| S0B-29 | Stub rute `/app/*`, NAV, layout | Lajur A | S0B-20, S0B-26, G-A1 | 🔥 📝 | belum |  |  |  |
| S0B-30 | Factory proyek/tugas, data Atlas, skrip seed | Lajur A | S0B-06, S0B-09, S0B-21 | M (1,5) | belum |  |  |  |
| S0B-31 | Koreksi `CLAUDE.md` (D9) — tugas terpisah | Lajur silang | S0B-18, 19, 25, 29 | S (0,5) | belum |  |  |  |
| S0B-32 | README bagian kontrak | Lajur silang | S0B-19, S0B-29 | S (0,5) | belum |  |  |  |
| S0B-33 | Gerbang `contract-v1`: verifikasi, catatan keputusan, tag lokal | Lajur silang | semua | 🔥 🧊 | belum |  |  |  |

## S1 — Proyek dan profil

Sumber spesifikasi: `rencana/P3-s1-s2-proyek-tugas.md §4`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S1-01 | Daftarkan modul baru S1 di `app.ts` | L-C/integrator | SP1 | S (0,25) | belum |  |  |  |
| S1-02 | Query, DTO, dan rute baca proyek (daftar, detail, anggota) | L1a | S1-01 | M (2) | belum |  |  |  |
| S1-03 | Service dan rute tulis proyek (buat, ubah, status, pengelola utama) | L1a | S1-02 | M (2) | belum |  |  |  |
| S1-04 | Anggota proyek dan pemilih orang | L1a | S1-03 | M (2,5) | belum |  |  |  |
| S1-05 | Hapus proyek ke Sampah + pulihkan minimal (backend, tanpa UI) | L1a | S1-04 | S (1,5) | belum |  |  |  |
| S1-06 | API profil dan cookie `mk-text-size` | L4 | S1-01 | M (1,5) | belum |  |  |  |
| S1-07 | Tema berskala dan loader root | L4 | S1-06 | S (0,5) | belum |  |  |  |
| S1-08 | Klien proyek (API, saringan, aksi) | L1b | SP-S1a | S (1) | belum |  |  |  |
| S1-09 | Halaman Daftar proyek (①②) | L1b | S1-08 | M (2) | belum |  |  |  |
| S1-10 | Detail proyek: layout, header, Ringkasan (⑧) | L1b | SP-S1a | M (2,5) | belum |  |  |  |
| S1-11 | Form Proyek baru (④) | L1b | S1-08, SP-S1b (S1-03) | M (2) | belum |  |  |  |
| S1-12 | Tab Anggota (⑪) | L1b | S1-10, SP-S1b (S1-04) | M (1,5) | belum |  |  |  |
| S1-13 | Ubah proyek (info + status) | L1b | S1-10, S1-11 | S (1) | belum |  |  |  |
| S1-14 | Halaman Pengaturan: profil + ukuran teks | L4 | S1-06, S1-07 | M (1,5) | belum |  |  |  |
| S1-15 | Peleburan `/profile` → `/app/settings` | L4 | S1-14 | S (1) | belum |  |  |  |
| S1-16 | Smoke, QA tiga ukuran teks, dokumen S1 | L10 | S1-12, S1-14 | S (1,5) | belum |  |  |  |
| S1-17 | Integrasi dan gerbang demo S1 | Integrator | S1-05, S1-13, S1-16 | S (0,5) | belum |  |  |  |
| S1-18 | Halaman Sampah minimal (khusus proyek) + aktifkan tombol Hapus proyek | L1b | S1-05, S1-10 (layout/daftar proyek), SP-1 (stub `/app/trash` dari S0.b) | M (2-3) | belum |  |  |  |

## S2 — Tugas inti

Sumber spesifikasi: `rencana/P3-s1-s2-proyek-tugas.md §5`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S2-01 | Metrics S2 murni: kelompok jadwal | L2 | SP1 | S (1) | belum |  |  |  |
| S2-02 | Query tugas: daftar keyset, hitungan, detail | L2 | S2-01 | M (3) | belum |  |  |  |
| S2-03 | Rute baca tugas (menetapkan SP2) | L2 | S2-02 | S (1,5) | belum |  |  |  |
| S2-04 | Service dan rute buat/ubah tugas | L2 | S2-03 | M (2,5) | belum |  |  |  |
| S2-05 | Mesin status: Mulai, Batal mulai, Selesai, Buka lagi, Batalkan, Pulihkan | L2 | S2-04 | M (3) | belum |  |  |  |
| S2-06 | Daftar periksa, komentar, linimasa | L2 | S2-04 | M (3) | belum |  |  |  |
| S2-07 | Penjaga keamanan dan kinerja tugas | L2 | S2-05, S2-06 | S (2) | belum |  |  |  |
| S2-08 | Klien tugas: API, saringan, aksi | L3 | SP2 | S (1,5) | belum |  |  |  |
| S2-09 | Komponen daftar tugas | L3 | S2-08 | M (2,5) | belum |  |  |  |
| S2-10 | Halaman Tugas (①②④) | L3 | S2-09 | M (2,5) | belum |  |  |  |
| S2-11 | Form Tugas baru (⑥) | L3b | SP-S1b, S2-04, S2-08 | M (2,5) | belum |  |  |  |
| S2-12 | Detail tugas: header, langkah berikutnya, ubah/batalkan/buka lagi (⑧⑨) | L3 | S2-10, SP-S2a (S2-05) | M (3) | belum |  |  |  |
| S2-13 | Detail tugas: daftar periksa, komentar, riwayat | L3b | S2-12, SP-S2a (S2-06) | M (2,5) | belum |  |  |  |
| S2-14 | Tab Tugas di detail proyek + sorotan Ringkasan | L3b | SP-M (S1-10), S2-09 | S (1,5) | belum |  |  |  |
| S2-15 | Smoke S2, QA, persiapan uji pengguna | L10 | S2-13, S2-14 | S (2) | belum |  |  |  |
| S2-16 | Uji pengguna putaran 1 dan perbaikan | L10 + reviewer | S2-15, KB-4 terjawab | S (2 AI + 1,5 reviewer + sesi) | belum |  |  |  |
| S2-17 | Integrasi dan gerbang demo S2 | Integrator | S2-07, S2-16 | S (0,5) | belum |  |  |  |

## Log merge per gelombang

Satu baris per gelombang yang disetujui user. Isi: tanggal, tugas yang masuk, cabang, hasil `typecheck`/`test`/`smoke`, dan kata persetujuan user.

| Tanggal | Gelombang | Tugas | Hasil | Persetujuan |
|---|---|---|---|---|
| 15 Okt 2026 | Gelombang 2 (S0.0) | S0.0-02, S0.0-03, S0.0-06, S0.0-08 (merge `68724ee`, `952b171`, `df71f93`, `263c667`) | Pasca-merge di cabang utama: `typecheck` nol error, **770 lulus / 17 dilewati / 0 gagal**, lint = baseline (1 error + 1 warning pra-ada). Tidak ada konflik. Tidak ada berkas wajib-satu-per-satu (auth, guard, permissions, migrasi) yang tersentuh | User: "merge gelombang 2, lalu push" |

## Log perubahan

- **15 Okt 2026** — dokumen ini dibuat. S0.0-01 (commit rebrand dan catatan) selesai. Jumlah tugas 92: S1 bertambah satu (`S1-18` Sampah minimal) setelah keputusan user memilih pilihan B untuk hapus proyek.
- **15 Okt 2026** — S0.0 gelombang 2 (02, 03, 06, 08) selesai dikerjakan dan berstatus `review`. Tiap cabang diverifikasi koordinator (basis, berkas dalam Target, isi kunci). **Uji gabungan** keempat cabang di worktree sementara (tidak dipush): tanpa konflik, `typecheck` nol error, **770 lulus / 17 dilewati / 0 gagal** (sebelumnya 687), lint = baseline. Menunggu persetujuan user untuk merge gelombang. Catatan: CHANGELOG belum diisi untuk 02/03/06/08, ditangani saat integrasi; smoke tidak diulang untuk hasil gabungan.
- **15 Okt 2026** — Gelombang 2 digabung ke `feature/project-management` atas persetujuan user. Empat poin CHANGELOG `[Unreleased]` ditambahkan (migrate, generator migrasi, pin Bun, kunci rahasia). S0.0 kini 5 dari 9 tugas selesai; sisa gelombang 3 (04, 07, 09) dan 4 (05).
