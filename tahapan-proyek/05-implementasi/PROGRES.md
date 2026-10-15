# PROGRES — Simple PM, MVP Inti (S0-S2)

> Dibuat 15 Oktober 2026. **Satu-satunya tempat yang menunjukkan tugas mana yang sudah selesai.** Diperbarui oleh koordinator setiap ada tugas yang mulai, masuk review, selesai, atau diblokir. Daftar tugas dihasilkan dari tiga rencana di `rencana/`; bila rencana berubah, ID di sini harus ikut diperbarui (jangan ubah ID tanpa mengubah rencananya).

**Status:** `belum` · `berjalan` · `review` (selesai dikerjakan, menunggu persetujuan merge gelombang) · `selesai` (sudah di-merge ke `feature/project-management`) · `diblokir` (tulis alasannya di kolom Hasil).

## Ringkasan

| Kelompok | Tugas | Selesai | Berjalan/review | Diblokir |
|---|---|---|---|---|
| S0.0 — Prasyarat ops | 9 | 9 | 0 | 0 |
| S0.a — Akun dan akses | 15 | 10 | 0 | 0 |
| S0.b — Kontrak beku | 33 | 10 | 0 | 0 |
| S1 — Proyek dan profil | 18 | 0 | 0 | 0 |
| S2 — Tugas inti | 17 | 0 | 0 | 0 |
| **Total** | **92** | **29** | **0** | **0** |

Estimasi total MVP Inti ≈ 128 hari-orang AI (KEPUTUSAN-MVP-INTI.md §6). Gerbang S2 (uji pengguna) belum terpenuhi: penguji masih data dummy.

## Gerbang dan titik sinkron

| Gerbang | Syarat | Dibuka oleh | Status |
|---|---|---|---|
| SP-0.0 | S0.0-01..09 selesai; `bun run test` hijau di worktree bersih; `bun audit` nol high/critical; laporan ke user | S0.a, S0.b | **lolos** 15 Okt 2026 pada `78e0154`: 795 lulus/0 gagal di worktree bersih, `bun audit` = 1 moderate (0 kritis/tinggi), typecheck nol, skema tidak bergeser. Dilaporkan ke user |
| SP1a | S0B-01 ter-merge (enum + `schema.columns`) | S0.a memakai `TEXT_SIZES`/`APPROVAL_STATUSES` | **lolos** 15 Okt (`b3a2690`) |
| SP0a-1 | S0A-01 ter-merge (`Role` 4 nilai, `isAdminRole`, `ROLE_RANK`) | S0B-12, S0B-29 | **lolos** 15 Okt (`a6eed0d`) |
| SP0a-2 | S0A-07 ter-merge (`assertAccountApproved` di `guard.ts`); dikoreksi dari P2 yang menaruhnya di merge pertama | S0B-18 | belum |
| SP0 | S0A-02 ter-merge (migrasi 0014; `ROLE_RANK` datang dari S0A-01) | S0B-03 (0015), S0B-19/21/25 | **lolos** 15 Okt (`6ceb09a`) |
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
| S0.0-04 | Pin Mantine 9.6.3 + `@mantine/dates` + `dayjs` | Gel. 3 | 02 | M | **selesai** | `chore/pm-s00-mantine-pin` | `be7435c` merge `9551a57` | worker: 774 lulus/0 gagal; smoke:prod dan smoke:binary 23/23 (Bun 1.4.2 sementara). Semua `@mantine/*` terkunci 9.6.3 tanpa `^`; `bun.lock` hanya berubah untuk Mantine, `@mantine/dates`, `dayjs`. **Perlu pemeriksaan visual oleh user** (tanpa Playwright). Menemukan `bun audit`: 1 kritis + 2 tinggi (ditangani S0.0-05) |
| S0.0-07 | Stub skema + barrel + `drizzle.config.ts` + CI drift | Gel. 3 | 02, 06 | S | **selesai** | `chore/pm-s00-schema-stubs` | `dedf48e` `c410c7b` merge `0c49fc9` | worker: 780 lulus/0 gagal; smoke 23/23. **Diverifikasi koordinator:** `drizzle-kit generate` = "No schema changes" dan tidak menulis berkas. Job CI `schema-drift` ditambahkan |
| S0.0-09 | `tests/test-hygiene.test.ts` (ratchet `mock.module`) | Gel. 3 | 03 | S | **selesai** | `chore/pm-s00-test-hygiene` | `48068be` merge `c6ced12` | worker: 781 lulus/0 gagal; uji kebocoran `mock.module` pada dua urutan: tidak bocor. **Keterkaitan:** daftar putih ketat, jadi S0B-22/23 yang mengonversi berkas `mock.module` wajib menghapus entrinya di `tests/test-hygiene.test.ts` |
| S0.0-05 | Perbaikan `bun audit` (proxy-addr, MCP SDK, source-map-js) | Gel. 4 | 04 | M | **selesai** | `chore/pm-s00-audit-fix` | `a1282e2` `279f733` merge `78e0154` | worker: `bun audit` 1 kritis + 2 tinggi + 4 moderate -> hanya 1 moderate (`esbuild`, alat dev); MCP SDK 1.30.0->1.32.1, vite 8.2.2->8.3.4, 3 override (`proxy-addr`, `fast-uri`, `ip-address`) dengan alasan di `docs/decisions/dependency-overrides.md`; smoke:prod/binary 23/23. **Diverifikasi koordinator** (worktree terisolasi, Bun 1.3.14): audit = 1 moderate, 795 lulus/0 gagal, typecheck nol, lint = baseline. **Koreksi:** worker menulis `audit --prod` bersih, tetapi pemeriksaan gerbang menunjukkan `--prod` juga memuat 1 moderate yang sama (`esbuild` lewat `drizzle-kit` dan `vite › tsx`, karena keduanya ada di `dependencies`); tidak ada kritis/tinggi. `Dockerfile:15` menyalin devDependencies ke image runtime: dilaporkan, tidak diubah |

## S0.a — Akun dan akses

Sumber spesifikasi: `rencana/P1-s0a-akun-akses.md §5`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S0A-01 | Rename role → 4 role, `emailVerified` super-admin | Gel. A | SP-0.0 | M | **selesai** | `feature/pm-s0a-01-roles` | `055aee1` merge `a6eed0d` | **WAJIB DISETUJUI SATU PER SATU (`auth.ts`, `permissions.ts`).** worker: 898 lulus/0 gagal; smoke prod+binary 23/23. Diverifikasi koordinator: `auth.ts` hanya berubah di `defaultRole`; `ROLES.USER` = 0; `canSetRole`/`canActOnTarget`/`canImpersonate` tidak disentuh; super-admin kini wajib `emailVerified`. 7 berkas di luar Target (UI role, filter legacy `user`), semuanya minimal dan beralasan |
| S0A-02 | Skema akun + migrasi 0014 (pemegang baton) | Gel. A | SP-0.0 | L | **selesai** | `feature/pm-s0a-02-account-schema` | `7b99b99` merge `6ceb09a` | **WAJIB DISETUJUI SATU PER SATU (migrasi 0014).** worker: 807 lulus/0 gagal; smoke coldboot+prod+binary 23/23. Diverifikasi koordinator: SQL dibaca penuh, backfill `approved` SEBELUM default `pending` (akun lama tidak terkunci), anonim -> `rejected`, berguard idempoten, `-- no-down`. 1 baris regex di `db-generate-rewrite.test.ts` (di luar Target, perlu) |
| S0A-03 | Kebijakan akun murni (`server/access`) | Gel. B | 01 | M | **selesai** | `feature/pm-s0a-03-account-policy` | `8932bec` merge `ad60c00` | worker: 1.106 lulus/0 gagal; `test:pm` 176 lulus. Diverifikasi koordinator: berkas murni (0 baris terlarang), `package.json` hanya skrip `test:pm`, `Principal = {id, appRole, impersonating}` (bentuk P2, penyimpangan sengaja dari P1). Catatan: `canInviteWithRole`/`canManageUsers` belum diblokir saat menyamar (aditif nanti). **`DenyCode` duplikat dengan `server/pm/errors.ts` (S0B-11): disatukan oleh S0B-12** |
| S0A-05 | `auth.ts`: field persetujuan, kebijakan email, linking | Gel. B | 02 | M | **selesai** | `feature/pm-s0a-05-auth-config` | `ee17e54` merge `ce0a560` | **WAJIB DISETUJUI SATU PER SATU (`auth.ts`).** Worker mati karena koneksi putus (bukan 429) saat `smoke:prod`; pekerjaan sudah ter-commit dan worktree bersih, jadi dispatch di-`abandon` dan **koordinator memverifikasi sendiri**: gabungan G2 = 1.210 lulus/0 gagal, `smoke:coldboot` 23/23 dan `smoke:binary` 23/23 (Bun 1.4.2). **`smoke:prod` (mode skrip) TIDAK dijalankan** (butuh instansi Postgres sendiri). Pada commit akhir pasca-merge `e49380d` smoke diulang: `smoke:binary` 23/23 dan `smoke:coldboot` 23/23. Terbukti lewat test: `update-user` dengan `approvalStatus`/`role`/`approval*` ditolak 400 `FIELD_NOT_ALLOWED` (C-AUTH-6); sign-up tidak bisa menyelundupkan status; akun email baru `pending`. `additionalFields` di blok `user` (benar), `accountLinking.disableImplicitLinking`. Belum terbukti: jalur Google asli (menunggu UAT S0A-15). 1 berkas di luar Target (`app/lib/auth-client.ts`, impor tipe saja). Tidak ada laporan worker |
| S0A-04 | Undangan + keputusan sign-up | Gel. C | 01, 02, 03 | M | **selesai** | `feature/pm-s0a-04-signup-gate` | `90302ca`, `f3f8e44` | worker: 1.264 lulus/0 gagal. Diverifikasi koordinator: tidak ada siklus impor (`signup-gate` hanya menjangkau `limits`, `permissions`, `pm/enums`, `ssr-log`), klaim undangan serentak diuji. **Koreksi koordinator `f3f8e44`:** tipe `http` hasil undangan (`403 \| 409 \| 422`) tidak lolos typecheck setelah digabung dengan S0B-12 (status `DENY_UI` bisa 404/410); kini diturunkan dari `INVITATION_ERRORS` dan `DENY_UI`, tetap lolos sendirian |
| S0A-07 | Guard menahan pending/rejected + API key | Gel. C | 05 | L | **selesai** | `feature/pm-s0a-07-account-gate` | `e946024`, `622bfaa` | **WAJIB DISETUJUI SATU PER SATU (`guard.ts`).** worker: 1.255 lulus/17 dilewati/0 gagal, `smoke:binary` 23/23; `guard.ts` tepat 150 baris (batas rute). Akun ditahan menjadi `resolveActor` null di jalur sesi dan API key (fail-closed, tanpa pengecualian role); 20 berkas test dikonversi ke `testUser()`. **Risiko keadaan antara:** tanpa S0A-06 (hook sign-up) dan S0A-11 (`/waiting`), akun BARU berstatus `pending` lalu diarahkan ke `/waiting` yang masih 404; akun lama aman (backfill 0014 `approved`). Demo anonim rusak sampai S0A-13 |
| S0A-12 | Layar login Google-only | Gel. C | 05 | S | belum |  |  |  |
| S0A-06 | Hook sign-up: pending, undangan, profil, audit | Gel. D | 04, 05 | M | **selesai** | `feature/pm-s0a-06-signup-hooks` | `f95fae3` | **WAJIB DISETUJUI SATU PER SATU (`auth.ts`).** worker: 1.424 lulus/0 gagal, `smoke:binary` dan `smoke:coldboot` 23/23. Diverifikasi koordinator: `auth.ts` hanya +11/-5 baris (impor, `databaseHooks.user.create`, komentar); hook **fail-closed** (galat apa pun ⇒ `pending`/`member`), tidak mengimpor `server/auth`, log hanya nama/kode galat + id (tanpa email). Dibuktikan lewat `internalAdapter.createUser` asli: terverifikasi+undangan ⇒ `approved` + role undangan + `profile` + `accepted_user_id` + audit; tanpa undangan ⇒ `pending`; **SA env terverifikasi ⇒ `approved`/`super-admin`, tidak terverifikasi ⇒ `pending`**; domain terlarang ⇒ tak ada baris; DB gagal ⇒ `pending`. 1 berkas di luar Target: `tests/auth-config.test.ts` (4 baris, tanggal persetujuan kini ditulis lewat update karena hook menentukan status saat INSERT). Anonim/demo tetap `pending` (dicabut S0A-13) |
| S0A-08 | Gerbang `/api/auth/*` (admin, email prod) | Gel. D | 05 | M | belum |  |  |  |
| S0A-09 | Pecah admin API + matriks role baru | Gel. D | 03, 07 | L | **selesai** | `feature/pm-s0a-09-admin-api-split` | `36d31de`, `7462eee` | worker: 1.454 lulus/0 gagal, `smoke:binary` 23/23. `admin.ts` 177→88 baris + `admin-context.ts` + `admin-moderation.ts`; role ditulis ke DB setelah `canSetUserRole`, ban/unban mencabut sesi, hapus user hanya super-admin, menyamar ⇒ 403 `IMPERSONATING`; direktori user memuat `approvalStatus`/`approvalReason`, filter `approval`, stat `pending`. **Perubahan perilaku:** admin API untuk anonim kini **401** (sebelumnya 403), 1 assertion di `tests/api-keys/api-keys.test.ts` disesuaikan. Di luar Target: `tests/api/admin-gate.test.ts` (baru, sapuan rute), `tests/test-hygiene.test.ts` (entri `mock.module` basi dihapus, tidak ada yang ditambah). Catatan: hapus user oleh Admin memakai kode `NOT_APP_ROLE` (tak ada kode "hanya SA"); validasi body 422 berjalan sebelum gerbang; ubah role tanpa kunci optimistik (balapan kecil); parameter filter `approval` belum ada di klien (milik S0A-14) |
| S0A-10 | Endpoint setujui/tolak + undangan | Gel. E | 04, 06, 09 | L | **selesai** | `feature/pm-s0a-10-approval-endpoints` | `4d2d933`, `f015c49` | worker: 1.604 lulus/0 gagal, `smoke:binary` 23/23. `approval.service.ts` (setujui/tolak atomik: `UPDATE … WHERE approval_status = $from AND role IS NOT DISTINCT FROM $role`, dua permintaan serentak ⇒ satu 200 dan satu 409 `WRONG_STATE`, terbukti lewat tes), `POST users/:id/approve|reject`, undangan daftar/buat/cabut, audit dengan email dimasker. **Kunci API ditolak (`requiredScope` = `null`)** untuk approve/reject/role dan `/api/admin/invitations*`. Diverifikasi koordinator: kebijakan dicek sebelum tulis, role ikut dikunci di `WHERE`. Penyimpangan: `INVALID_EMAIL` tetap **422** (mengikuti `createInvitation` yang ada; spesifikasi menyebut 400); 3 berkas bantu di luar Target (`invitation.admin.query.ts`, `mask-email.ts`, `admin-invitations.ts`); tes HTTP persetujuan di `admin-approval.test.ts` (agar `admin-users.test.ts` <400 baris) |
| S0A-11 | Halaman tahan `/waiting` | Gel. E | 07 | M | **selesai** | `feature/pm-s0a-11-waiting-page` | `ec0bd47` | worker: 1.593 lulus/0 gagal, `smoke:binary` **24/24** (pemeriksaan baru `waiting-anon-redirect`). Halaman `/waiting` (menunggu/ditolak, **tanpa form profil**), `HoldShell` bersama `/banned`, noindex, matriks anti-loop 6 keadaan × 7 halaman (≤3 lompatan, tanpa siklus). `guard.ts` tidak disentuh. **Menutup 404 `/waiting`.** `/dev` dikeluarkan dari matriks (`requireRole` di-mock proses-global oleh tes lain). **Angka "23 pemeriksaan" di `CLAUDE.md` perlu jadi 24 (koordinator, saat merge)** |
| S0A-13 | Cabut demo anonim | Gel. E | 06, 07, 08, 12 | M | belum |  |  |  |
| S0A-14 | Halaman `/dashboard/users` | Gel. F | 10, 11 (UI lunak sejak 09) | L | belum |  |  |  |
| S0A-15 | Gerbang akhir S0.a, ADR, UAT, permintaan review | Gel. G | semua | S | belum |  |  |  |

## S0.b — Kontrak beku

Sumber spesifikasi: `rencana/P2-s0b-kontrak-beku.md §3`.

| ID | Judul | Lajur | Bergantung pada | Ukuran | Status | Cabang | Commit | Hasil tes |
|---|---|---|---|---|---|---|---|---|
| S0B-01 | Enum bersama, soft delete, helper kolom, sesi DB UTC | Lajur D | G0 | 🔥 | **selesai** | `feature/pm-s0b-01-shared-enums` | `1b6d249` merge `b3a2690` | worker: 815 lulus/0 gagal; smoke prod+binary 23/23. Diverifikasi koordinator: `enums.ts` murni (39 baris), `TEXT_SIZES` 3 nilai, sesi DB UTC terbukti test. Penyimpangan kecil tercatat |
| S0B-02 | Skema proyek | Lajur D | S0B-01 | M (1) | **selesai** | `feature/pm-s0b-02-project-schema` | `0b85219` | `project`, `project_member`, `project_activity`; dimajukan dari G4 ke G3 agar skema dan migrasi 0015 masuk bersamaan (CI `schema-drift`). Worker melapor `failed` hanya karena `schema-stats` butuh migrasi (diharapkan, tidak dilemahkan); hijau begitu S0B-03 digabung |
| S0B-03 | Migrasi 0015 `project_core` | Lajur D | S0B-02, G0, G-A2, G-Q5 | 🧊 🔥 | **selesai** | `feature/pm-s0b-03-project-migration` | `49d87be` (di atas `0b85219`) | **WAJIB DISETUJUI SATU PER SATU (migrasi).** Dimajukan dari G9 ke G3. 3 tabel, 4 indeks, 4 CHECK; semua `IF NOT EXISTS` / `DO $$ … duplicate_object`, komentar "Why"; file rollback `server/db/rollback/0015_project_core.down.sql`; 6 test baru. Diverifikasi koordinator: hanya 5 berkas Target, tidak ada migrasi ≥0016, `drizzle-kit generate` = tidak ada perubahan |
| S0B-04 | Patch `schema-introspect` (D8e) | Lajur D | S0B-01 | S (0,75) | **selesai** | `feature/pm-s0b-04-schema-introspect` | `160c781` | worker: 1.419 lulus/0 gagal, `smoke:binary` 23/23. Tipe kolom baru, `timestamptz`, identity (`defaultKind: 'identity'`), indeks ekspresi (`lower(name)`, bukan `[object Object]`), `IndexMeta.where` untuk indeks parsial; 9 tes baru. Hanya 3 berkas (termasuk CHANGELOG). Drawer UI belum menampilkan `where` (di luar Target). Syarat "sebelum 0016" terpenuhi |
| S0B-05 | Skema tugas | Lajur D | S0B-02, S0B-04 | M (1,5) | **selesai** | `feature/pm-s0b-05-task-schema` | `cfc5323` | 5 tabel (`task_kind`, `task`, `task_checklist_item`, `task_comment`, `task_activity`) persis R02 §3.2; 1.557 lulus/**1 gagal** = `schema-stats` 42P01 (diharapkan sampai 0016). **Wajib digabung bersama S0B-06.** Penyimpangan: indeks tambahan `task_project_id_reviewer_id_idx` (ada di R02, bukan di daftar Target); `task.priority` memakai `PROJECT_PRIORITIES`; `position` NOT NULL tanpa default. Terbukti: `generatedByDefaultAsIdentity({ name })` berfungsi (P2 klaim #9) |
| S0B-06 | Migrasi 0016 `task_core` | Lajur D | S0B-03, S0B-05 (S0B-04 sudah merge) | 🧊 🔥 | **selesai** | `feature/pm-s0b-06-task-migration` | `7d1c921` (di atas `cfc5323`) | **WAJIB DISETUJUI SATU PER SATU (migrasi).** Baton dimajukan dari G12 ke G5. `0016_task_core`: 5 tabel, 9 indeks, 8 CHECK, idempoten (`IF NOT EXISTS`, `DO $$ … duplicate_object`), identity `task.number` aman diulang; rollback `0016_task_core.down.sql` (anak sebelum induk). worker: 1.570 lulus/0 gagal (`schema-stats` hijau), drift kosong, `smoke:coldboot` dan `smoke:binary` 23/23. Satu penyesuaian di luar Target: `tests/db/project-core-migration.test.ts` (rollback 0015 kini menjalankan down 0016 lebih dulu). Diverifikasi koordinator: hanya 7 berkas termasuk CHANGELOG, tanpa nomor ≥0017 |
| S0B-07 | Tes kontrak skema dan indeks | Lajur D | S0B-06 | S (0,75) | belum |  |  |  |
| S0B-08 | Metrics 1: konfigurasi, tanggal, hitungan tugas | Lajur D | S0B-01 | M (1) | belum |  |  |  |
| S0B-09 | Metrics 2: progres, waktu berjalan, kondisi proyek | Lajur D | S0B-08 | M (1) | belum |  |  |  |
| S0B-10 | Keanggotaan proyek (query) | Lajur D | S0B-06, S0B-12 | M (1) | belum |  |  |  |
| S0B-11 | Infrastruktur `server/pm`: galat, transaksi, keyset, batas | Lajur K | S0B-01 | M (1) | **selesai** | `feature/pm-s0b-11-pm-infra` | `ed14161` merge `e49380d` | worker: 1.000 lulus/0 gagal. Diverifikasi koordinator: berkas dalam Target, `errors.ts`/`limits.ts` murni, semua http dalam {403,404,409,422,429,503}, `PROJECT_DELETE_UI_ENABLED=true` (sesuai keputusan opsi B). `DenyCode` di `errors.ts` adalah superset yang dimaksudkan diekspor ulang oleh `decision.ts` |
| S0B-12 | Fondasi `server/access`: tipe, keputusan, level, flag | Lajur K | S0B-11, G-A1 | M (1) | **selesai** | `feature/pm-s0b-12-access-foundation` | `1995d76`, `6d8e6fa` | worker: 1.294 lulus/0 gagal. `DenyCode` disatukan (re-export dari `server/pm/errors`, 19 kode ↔ 19 entri `DENY_UI`), `Principal` kanonik di `types.ts`, `tests/client-server-imports.test.ts` diperketat. Penyimpangan kecil: tes kemurnian memeriksa impor/pola, bukan kata dalam prosa |
| S0B-13 | Izin pengguna dan status akun | Lajur K | S0B-12 | M (1) | belum |  |  |  |
| S0B-14 | Izin proyek dan anggota | Lajur K | S0B-12 | M (1,5) | belum |  |  |  |
| S0B-15 | Izin pemeriksa (review) | Lajur K | S0B-12 | M (1) | **selesai** | `feature/pm-s0b-15-review-policy` | `2ccf69a` | worker: 1.477 lulus/0 gagal, `smoke:binary` 23/23. `review.policy.ts` murni (167 baris; hanya mengimpor `server/access/*`), 67 tes (C12-C14, C39-C43, C45 + 8 persona). **Koreksi atas brief koordinator:** `NO_ELIGIBLE_REVIEWER` ada di `PM_API_CODES` (HTTP 409), bukan `DENY_CODES`/`DENY_UI`; dipakai lewat tipe lokal `ReviewDecision` tanpa mengubah katalog (menjaga tes 19↔19). Keputusan terbuka untuk S0B-17: petakan atau tambahkan kode itu. Berkas tes tepat 400 baris (batas) |
| S0B-16 | Izin tugas dan alur kerja | Lajur K | S0B-12, S0B-15 | L (2,5) | belum |  |  |  |
| S0B-17 | Kapabilitas (`can{}`) dan paritas | Lajur K | S0B-13, 14, 15, 16 | M (1) | belum |  |  |  |
| S0B-18 | Kerangka API `/api/app` | Lajur K | S0B-11, G-A1 | 🔥 | belum |  |  |  |
| S0B-19 | Pemetaan scope kunci API (`PM_KEY_DENY`) | Lajur K | S0B-18, G-A2 | 🔥 | belum |  |  |  |
| S0B-20 | `app-routes.test.ts` rekursif (D8a) | Lajur A | G0 | S (0,25) | belum |  |  |  |
| S0B-21 | `tests/support` dasar (D8c) | Lajur A | S0B-20, G-A2 | M (1) | belum |  |  |  |
| S0B-22 | Konversi `mock.module(guard)` batch 1 (D8d) | Lajur A | S0B-21 | M (1,5) | belum |  |  |  |
| S0B-23 | Konversi batch 2 + ratchet ke 0 | Lajur A | S0B-22 | M (1,5) | belum |  |  |  |
| S0B-24 | Tema dan token R11 (D2) | Lajur A | G0 | M (1) | **selesai** | `feature/pm-s0b-24-theme-tokens` | `1d8f110` | worker: 1.591 lulus/0 gagal, `smoke:binary` 23/23. `buildTheme(scale)`, palet `ok/warn/danger`, `cssVariablesResolver`, `theme.css` (ring fokus 3 px); semua pasangan kontras R11 §3.2.3 dihitung di tes dan lolos. Spike: `--input-bd` tertimpa, resolver pada variabel turunan, `Badge` `rem()` **terbukti** (analisis CSS + render SSR, bukan browser nyata); **fokus `Input` gagal dari bawaan** ⇒ `theme.css` menambah ring 3 px. Ekspor `theme` lama sengaja tidak diubah sampai S0B-25 memasangnya di root |
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

## Jadwal peluncuran S0.a + S0.b (disetujui user 15 Okt 2026)

Dihasilkan dari simulasi ketergantungan (P1 §3, P2 §3-4), rantai berkas bersama, satu baton migrasi, dan batas worker. **Ukuran dan sebagian aturan "tidak sewave" adalah turunan koordinator, bukan daftar resmi**; urutan nyata bergeser mengikuti persetujuan dan hasil verifikasi.

**Aturan yang disetujui user:**
1. **Risiko-dulu:** dua slot per gelombang untuk S0.a (jalur autentikasi), satu slot untuk S0.b, sampai S0.a selesai (G9).
2. **Mulai 3 worker per batch; naik ke 4** setelah dua gelombang berturut-turut tanpa galat 429.
3. **Titik cek setelah G4:** berhenti dan lapor ke user sebelum G5 (empat klaim Better Auth di P1 §7 #1-#4 sudah terbukti atau gagal pada saat itu).
4. **`*` = tugas yang menyentuh `auth.ts`, `guard.ts`, `permissions.ts`, atau migrasi: disetujui user SATU PER SATU.** Sisanya satu persetujuan per gelombang.
5. **Satu cabang per tugas** (penyimpangan dari P1/P2 yang membayangkan satu cabang per lajur): memungkinkan persetujuan satu-per-satu dan merge per gelombang. Basis gelombang berikutnya = HEAD setelah merge gelombang sebelumnya.
6. Baton migrasi: S0A-02 (G1), lalu S0B-03 (G3, dimajukan dari G9), lalu S0B-06 (G12); tidak boleh ada dua migrasi dalam satu gelombang.
7. UAT login Google (S0A-15, G9) dijalankan **user** dengan envman; peninjau kedua keamanan idealnya sudah ada saat itu (saat ini placeholder).

| Gel. | Worker 1 | Worker 2 | Worker 3 | Status |
|---|---|---|---|---|
| **G1** | S0A-02* skema akun + migrasi 0014 (baton) | S0A-01* 4 role + super-admin wajib email terverifikasi | S0B-01 enum bersama, soft delete | **selesai, di-merge** 15 Okt (`a6eed0d`, `6ceb09a`, `b3a2690`) |
| **G2** | S0A-05* pengaturan Better Auth (status, kebijakan email) | S0A-03 aturan izin akun | S0B-11 infrastruktur `server/pm` | **selesai, di-merge** 16 Okt (`ce0a560`, `ad60c00`, `e49380d`) |
| **G3** | S0A-07* guard menahan akun pending/ditolak | S0A-04 undangan + keputusan sign-up | S0B-12 fondasi `server/access` | **selesai, di-merge** 16 Okt (`d8f295a`…`3ba85f9`; 4 worker; + S0B-02 skema proyek dan S0B-03* migrasi 0015, dimajukan dari G4/G9) |
| **G4** | S0A-09 pecah admin API + matriks role | S0A-06* hook sign-up (pending, undangan, profil) | S0B-04 patch introspeksi skema + S0B-15 izin pemeriksa (S0B-02 sudah di G3; S0B-15 dimajukan dari G6) | **selesai, di-merge** 16 Okt (`0ecf3d2`…`4e72392`; run `run_66e25d720ba0`, basis `570a495`, 4 worker, tanpa 429) |
| **G5** | S0A-10 endpoint setujui/tolak + undangan | S0A-11 halaman `/waiting` | S0B-05 skema tugas (+ S0B-06* migrasi 0016 menyusul di atas commitnya, seperti S0B-03) dan S0B-24 tema + token (dimajukan dari G7/G8) | **selesai, di-merge** 16 Okt (`77b839e`…`f80b525`; run `run_60bd13d65173`, basis `5e9b5c0`, 5 worker termasuk S0B-06, tanpa 429) |
| **G6** | S0A-14 halaman `/dashboard/users` | S0A-08 gerbang `/api/auth/*` | (S0B-15 sudah di G4) | belum |
| **G7** | S0A-12 layar login Google | S0B-24 tema dan token | S0B-20 tes rute rekursif | belum |
| **G8** | S0A-13* cabut demo anonim | S0B-05 skema tugas | S0B-21 `tests/support` | belum |
| **G9** | S0A-15 gerbang akhir S0.a + UAT | (S0B-03 sudah di G3) | S0B-16 izin tugas dan alur kerja | belum |
| **G10** | S0B-26 komponen dasar | S0B-08 metrics 1 | S0B-18 kerangka API `/api/app` | belum |
| **G11** | S0B-22 konversi mock batch 1 | S0B-09 metrics 2 | S0B-27 komponen domain | belum |
| **G12** | S0B-06* migrasi 0016 tugas (baton) | S0B-14 izin proyek dan anggota | S0B-29 stub rute + NAV | belum |
| **G13** | S0B-13 izin pengguna + status akun | S0B-30 factory + data Atlas | S0B-28 komponen tabel/filter/modal | belum |
| **G14** | S0B-23 konversi batch 2 + ratchet 0 | S0B-19 pemetaan scope API key | S0B-25 ukuran teks (root + cookie) | belum |
| **G15** | S0B-10 query keanggotaan | S0B-17 kapabilitas `can{}` | S0B-07 tes kontrak skema | belum |
| **G16** | S0B-32 README kontrak | S0B-31 koreksi `CLAUDE.md` |  | belum |
| **G17** | S0B-33 gerbang `contract-v1` |  |  | belum |

**Hitungan gelombang tanpa galat 429** (syarat naik ke 4 worker: dua gelombang berturut-turut): G1 dan G2 tanpa 429 (2 dari 2). **Syarat terpenuhi: G3 boleh memakai 4 worker.** G3 dijalankan dengan 4 worker (5 tugas, S0B-03 menyusul di atas S0B-02) dan **tanpa 429** (3 dari 3). (Satu worker G2 mati karena koneksi putus; itu bukan 429 dan tidak dihitung.)

Dengan 4 worker: 13 gelombang (S0.a tetap selesai di G9). Perkiraan kasar: 17 gelombang ≈ 3,5 minggu, 13 gelombang ≈ 2,5-3 minggu, bila satu gelombang ≈ 1 hari kerja. P1/P2 mengira ±6 worker paralel; dengan batas kuota, durasinya kira-kira dua kali lipat.

**Gerbang S0.b yang dikoreksi koordinator:** P2 menulis `G-A1` sebagai "merge pertama S0.a" memuat `assertAccountApproved`, tetapi di P1 fungsi itu dibuat S0A-07 (G3), dan hanya S0B-18 yang memakainya. Maka `G-A1` dipecah (lihat tabel gerbang). `S0B-33` diasumsikan menunggu `S0A-15` (P2 hanya menulis "semua").

## Log merge per gelombang

Satu baris per gelombang yang disetujui user. Isi: tanggal, tugas yang masuk, cabang, hasil `typecheck`/`test`/`smoke`, dan kata persetujuan user.

| Tanggal | Gelombang | Tugas | Hasil | Persetujuan |
|---|---|---|---|---|
| 15 Okt 2026 | Gelombang 2 (S0.0) | S0.0-02, S0.0-03, S0.0-06, S0.0-08 (merge `68724ee`, `952b171`, `df71f93`, `263c667`) | Pasca-merge di cabang utama: `typecheck` nol error, **770 lulus / 17 dilewati / 0 gagal**, lint = baseline (1 error + 1 warning pra-ada). Tidak ada konflik. Tidak ada berkas wajib-satu-per-satu (auth, guard, permissions, migrasi) yang tersentuh | User: "merge gelombang 2, lalu push" |
| 15 Okt 2026 | Gelombang 3 (S0.0) | S0.0-04, S0.0-07, S0.0-09 (merge `9551a57`, `0c49fc9`, `c6ced12`) | Pasca-merge pada `c6ced12` di worktree terisolasi: `typecheck` nol error, **795 lulus / 17 dilewati / 0 gagal**, lint = baseline, `drizzle-kit generate` = tidak ada perubahan skema. Tidak ada konflik. Tidak ada berkas wajib-satu-per-satu yang tersentuh | User: "Setujui merge gelombang 3" |
| 15 Okt 2026 | Gelombang 4 (S0.0) | S0.0-05 (merge `78e0154`) | Gerbang SP-0.0 pada `78e0154` di worktree bersih: `typecheck` nol error, **795 lulus / 17 dilewati / 0 gagal**, lint = baseline, `bun audit` = 1 moderate (0 kritis/tinggi), skema tidak bergeser. Tidak ada konflik. Hanya `package.json`, `bun.lock`, CHANGELOG, dan 1 dokumen yang tersentuh | User: "merge dan push" |
| 15 Okt 2026 | G1 (S0.a + S0.b) | S0A-01, S0A-02, S0B-01 (merge `a6eed0d`, `6ceb09a`, `b3a2690`) | Pasca-merge pada `b3a2690` di worktree bersih: `typecheck` nol error, **930 lulus / 17 dilewati / 0 gagal**, lint = baseline, skema tidak bergeser, `bun audit` = 1 moderate. Tidak ada konflik; ketiga cabang tetap di commit yang diverifikasi | User: "setujui semua, merge lalu push" (S0A-01 dan S0A-02 disetujui satu per satu) |
| 16 Okt 2026 | G2 (S0.a + S0.b) | S0A-05, S0A-03, S0B-11 (merge `ce0a560`, `ad60c00`, `e49380d`) | Pasca-merge pada `e49380d` di worktree bersih: `typecheck` nol error, **1.210 lulus / 17 dilewati / 0 gagal**, lint = baseline, skema tidak bergeser, `bun audit` = 1 moderate, **`smoke:binary` 23/23 dan `smoke:coldboot` 23/23** (Bun 1.4.2). Tidak ada konflik; ketiga cabang tetap di commit yang diverifikasi. `smoke:prod` tidak dijalankan | User: "setujui semua, merge lalu push" (S0A-05 disetujui satu per satu) |
| 16 Okt 2026 | G3 (S0.a + S0.b) | S0B-02, S0B-03, S0A-04, S0B-12, S0A-07 (merge `d8f295a`, `1c9816b`, `e4bc277`, `5b24656`, `3ba85f9`; docs `ebe217a`) | Pasca-merge pada `ebe217a` di worktree bersih: `typecheck` nol error, **1.410 lulus / 17 dilewati / 0 gagal**, lint = baseline, skema tidak bergeser, `smoke:binary` 23/23 (uji coba pra-merge juga `smoke:coldboot` 23/23). Tanpa konflik; satu koreksi koordinator di S0A-04 (`f3f8e44`). | User: S0A-07 digabung sekarang dengan syarat tidak login memakai akun baru sampai S0A-06 + S0A-11; S0B-03 (migrasi) disetujui; S0A-04, S0B-12, S0B-02 satu paket; push diizinkan |
| 16 Okt 2026 | G4 (S0.a + S0.b) | S0B-04, S0B-15, S0A-06, S0A-09 (merge `0ecf3d2`, `7bfed3c`, `507955a`, `4e72392`; docs `5e9b5c0`) | Pasca-merge pada `5e9b5c0` di worktree bersih: `typecheck` nol error, **1.544 lulus / 17 dilewati / 0 gagal**, lint = baseline, skema tidak bergeser, `bun audit` = 1 moderate, `smoke:binary` 23/23 (uji coba pra-merge juga `smoke:coldboot` 23/23). Tanpa konflik; tanpa koreksi koordinator. Di-push `570a495..5e9b5c0`. | User: "merge G4" (S0A-06 `auth.ts` termasuk), lalu "push dan luncurkan G5" |

## Log perubahan

- **15 Okt 2026** — dokumen ini dibuat. S0.0-01 (commit rebrand dan catatan) selesai. Jumlah tugas 92: S1 bertambah satu (`S1-18` Sampah minimal) setelah keputusan user memilih pilihan B untuk hapus proyek.
- **15 Okt 2026** — S0.0 gelombang 2 (02, 03, 06, 08) selesai dikerjakan dan berstatus `review`. Tiap cabang diverifikasi koordinator (basis, berkas dalam Target, isi kunci). **Uji gabungan** keempat cabang di worktree sementara (tidak dipush): tanpa konflik, `typecheck` nol error, **770 lulus / 17 dilewati / 0 gagal** (sebelumnya 687), lint = baseline. Menunggu persetujuan user untuk merge gelombang. Catatan: CHANGELOG belum diisi untuk 02/03/06/08, ditangani saat integrasi; smoke tidak diulang untuk hasil gabungan.
- **15 Okt 2026** — Gelombang 2 digabung ke `feature/project-management` atas persetujuan user. Empat poin CHANGELOG `[Unreleased]` ditambahkan (migrate, generator migrasi, pin Bun, kunci rahasia). S0.0 kini 5 dari 9 tugas selesai; sisa gelombang 3 (04, 07, 09) dan 4 (05).
- **15 Okt 2026** — S0.0 gelombang 3 (04, 07, 09) selesai dikerjakan dan berstatus `review`. Tiap cabang diverifikasi koordinator. **Uji gabungan** ketiganya di worktree sementara (basis `9050f1d`, tidak dipush): tanpa konflik, `typecheck` nol error, **795 lulus / 17 dilewati / 0 gagal**, lint = baseline. Menunggu persetujuan merge. Pelajaran: RustFS milik user di port 54330 membuat 3 test storage gagal bila `LOCAL_S3_PORT` tidak diisi (kode menolak memakai RustFS yang bukan miliknya, jadi data user tidak tersentuh); semua verifikasi dan spesifikasi berikutnya memakai `LOCAL_S3_PORT` terpisah.
- **15 Okt 2026** — Gelombang 3 digabung ke `feature/project-management` atas persetujuan user. S0.0 kini 8 dari 9 tugas selesai; tersisa S0.0-05 (perbaikan keamanan pustaka) lalu gerbang SP-0.0. Catatan: `node_modules` di working tree utama user tidak sinkron dengan `package.json` (Mantine 9.6.3); user perlu menjalankan `bun install` sebelum `bun dev` berikutnya.
- **15 Okt 2026** — S0.0-05 (gelombang 4) selesai dikerjakan dan berstatus `review`; menunggu persetujuan merge, lalu gerbang SP-0.0. Atas permintaan user, **7 worktree gelombang 2 dan 3 ditutup** (`orca worktree rm`, semuanya bersih, ter-merge, dan sudah di origin); cabang `chore/pm-s00-*` yang ter-merge ikut terhapus oleh Orca (commit tetap di riwayat). Worktree `pm-s00-audit-fix` dipertahankan karena belum ter-merge. Penghapusan berjalan di latar belakang: laporan "OK" dari Orca datang lebih dulu daripada folder yang benar-benar hilang.
- **15 Okt 2026** — S0.0-05 digabung atas persetujuan user; **S0.0 selesai (9 dari 9)** dan **gerbang SP-0.0 lolos**. Kini S0.a (akun dan akses) dan S0.b (kontrak beku) bisa dimulai. Catatan: `node_modules` di working tree utama user perlu `bun install` (MCP SDK, Vite, Mantine berubah).
- **15 Okt 2026** — Jadwal peluncuran S0.a + S0.b disimpan di bagian "Jadwal peluncuran" atas persetujuan user (3 worker, risiko-dulu, titik cek setelah G4). Gerbang SP0a dipecah menjadi SP0a-1 dan SP0a-2.
- **15 Okt 2026** — G1 (S0A-01, S0A-02, S0B-01) selesai dikerjakan dan berstatus `review`. Tiap cabang diverifikasi koordinator. **Uji gabungan** (basis `1da0d98`, worktree sementara, tidak dipush): tanpa konflik, `typecheck` nol error, **930 lulus / 17 dilewati / 0 gagal** (sebelumnya 795), lint = baseline, `drizzle-kit generate` = tidak ada perubahan skema. Menunggu persetujuan: S0A-01 dan S0A-02 **satu per satu**, S0B-01 per gelombang.
- **15 Okt 2026** — G1 digabung atas persetujuan user (S0A-01 dan S0A-02 satu per satu, S0B-01 per gelombang). Gerbang SP1a, SP0a-1, dan SP0 terbuka. 12 dari 92 tugas selesai. Gelombang tanpa 429: G1 (1 dari 2). Berikutnya G2 (S0A-05, S0A-03, S0B-11), menunggu perintah luncurkan.
- **16 Okt 2026** — G2 (S0A-05, S0A-03, S0B-11) selesai dikerjakan dan berstatus `review`. S0A-05: worker mati (koneksi putus) setelah commit; dispatch di-`abandon`, koordinator memverifikasi sendiri termasuk `smoke:coldboot` dan `smoke:binary` pada hasil gabungan (23/23 dan 23/23); `smoke:prod` tidak dijalankan. **Uji gabungan** (basis `ec53847`, tidak dipush): tanpa konflik, `typecheck` nol error, **1.210 lulus / 17 dilewati / 0 gagal** (sebelumnya 930), lint = baseline, skema tidak bergeser. Menunggu persetujuan: S0A-05 satu per satu; S0A-03 dan S0B-11 per gelombang.
- **16 Okt 2026** — G2 digabung atas persetujuan user (S0A-05 satu per satu). 15 dari 92 tugas selesai. Gelombang tanpa 429: G1 dan G2, jadi **G3 boleh 4 worker**. G3 (usulan): S0A-07*, S0A-04, S0B-12 (termasuk menyatukan `DenyCode` dengan `server/pm/errors.ts`), S0B-02. Titik cek setelah G4 tetap berlaku. Menunggu perintah luncurkan G3.
- **16 Okt 2026** — G3 (S0A-07, S0A-04, S0B-12, S0B-02, S0B-03) selesai dikerjakan dan berstatus `review`; belum ada yang di-merge atau di-push. Tiap cabang diverifikasi koordinator (basis, berkas dalam Target, isi kunci). **Uji gabungan** kelima cabang di worktree sementara (basis `21e4543`, tidak dipush): tanpa konflik teks, tetapi **typecheck menemukan satu benturan antar-cabang** (S0A-04 × S0B-12, tipe `http` hasil undangan) yang diperbaiki koordinator dengan satu commit di cabang S0A-04 (`f3f8e44`). Setelah itu: `typecheck` nol error, **1.410 lulus / 17 dilewati / 0 gagal** (sebelumnya 1.210), lint = baseline (1 error + 1 warning pra-ada), `drizzle-kit generate` = tidak ada perubahan skema, `bun audit` = 1 moderate (esbuild), **`smoke:binary` 23/23 dan `smoke:coldboot` 23/23** (Bun 1.4.2); `smoke:prod` tidak dijalankan. Gelombang tanpa 429: G1, G2, G3. S0B-02 dan S0B-03 dimajukan ke G3 (migrasi bersama skema), S0B-15 ke G4. Dua insiden pekerja: S0B-12 dan S0B-03 sempat menjalankan test tanpa lingkungan terisolasi (data lokal `./data/pg` di worktree sendiri, sudah dibersihkan). Menunggu persetujuan user: **S0A-07 dan S0B-03 satu per satu**, sisanya per gelombang.
- **16 Okt 2026** — G3 digabung atas persetujuan user (S0A-07 dan S0B-03 satu per satu) dan di-push. 20 dari 92 tugas selesai. Gelombang tanpa 429: G1-G3. **Peringatan sampai S0A-06 + S0A-11 masuk (G4-G5):** jangan login dengan akun baru (akan `pending` lalu ke `/waiting` yang 404); Coba Demo belum berfungsi. Berikutnya G4 (usulan): S0A-09, S0A-06*, S0B-04, S0B-15, lalu titik cek. Menunggu perintah luncurkan G4.
- **16 Okt 2026** — G4 diluncurkan atas perintah user: S0A-09, S0A-06*, S0B-04, S0B-15 (4 worker, basis `570a495`, cabang `feature/pm-s0a-09-admin-api-split`, `-s0a-06-signup-hooks`, `-s0b-04-schema-introspect`, `-s0b-15-review-policy`). Bun 1.4.2 diunduh ulang dan sha256-nya dicocokkan dengan `SHASUMS256.txt` resmi. S0A-06 (`auth.ts`) wajib disetujui satu per satu. Titik cek berlaku setelah G4: berhenti dan lapor sebelum G5.
- **16 Okt 2026** — G4 (S0A-09, S0A-06, S0B-04, S0B-15) selesai dikerjakan dan berstatus `review`; belum di-merge atau di-push. Tiap cabang diverifikasi koordinator. **Uji gabungan** (basis `570a495`, worktree sementara, tidak dipush): tanpa konflik, `typecheck` nol error, **1.544 lulus / 17 dilewati / 0 gagal** (sebelumnya 1.410), lint = baseline, `drizzle-kit generate` = tidak ada perubahan skema, `bun audit` = 1 moderate, **`smoke:binary` dan `smoke:coldboot` 23/23** (Bun 1.4.2); `smoke:prod` tidak dijalankan. Gelombang tanpa 429: G1-G4. Tidak ada insiden pekerja. **Titik cek setelah G4 tercapai:** berhenti dan lapor; G5 menunggu perintah. Menunggu persetujuan: **S0A-06 satu per satu (`auth.ts`)**, sisanya per gelombang.
- **16 Okt 2026** — G4 digabung atas persetujuan user ("merge G4", S0A-06 termasuk), di-push (`570a495..5e9b5c0`), 4 worktree G4 ditutup. 24 dari 92 tugas selesai. G5 diluncurkan atas perintah user: S0A-10, S0A-11, S0B-05, S0B-24 (4 worker). S0B-05 sengaja dipasangkan dengan migrasi 0016 (S0B-06): akan dibuat setelah S0B-05 selesai, bertumpuk di atas commitnya, supaya skema dan migrasi masuk bersamaan (CI `schema-drift`); baton migrasi dimajukan dari G12 ke G5. `tests/db/schema-stats.test.ts` di S0B-05 diharapkan gagal sampai migrasi masuk.
- **16 Okt 2026** — G5 (S0A-10, S0A-11, S0B-05, S0B-24) selesai dikerjakan; S0B-06 (migrasi 0016) dibuat koordinator-peluncuran di atas commit S0B-05 dan juga selesai. Kelima berstatus `review`; belum di-merge atau di-push. **Uji gabungan** (basis `5e9b5c0`, worktree sementara): tanpa konflik, `typecheck` nol error, **1.726 lulus / 17 dilewati / 0 gagal** (sebelumnya 1.544), lint = baseline, `drizzle-kit generate` = tidak ada perubahan skema, `bun audit` = 1 moderate, **`smoke:binary` dan `smoke:coldboot` 24/24** (Bun 1.4.2); `smoke:prod` tidak dijalankan. Gelombang tanpa 429: G1-G5. Menunggu persetujuan: **S0B-06 satu per satu (migrasi)**, S0B-05 wajib bersamanya, sisanya per gelombang.
