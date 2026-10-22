# P2 — Rencana eksekusi S0.b "Kontrak beku" (MVP Inti)

> 15 Okt 2026 · tahap 2 (rencana, belum ada kode) · STATUS: lengkap, siap diserahkan ke koordinator. Ditulis oleh worker `task_85366b8e4685`.

## 1. Ringkasan
- **Hasil:** 33 tugas implementasi berurutan (S0B-01 … S0B-33) di tiga lajur paralel (D data/skema, K kontrak server, A app+tes), semuanya dalam format kontrak yang bisa ditempel ke `orca orchestration worker-start --spec`.
- **Lingkup tabel (arahan koordinator, mempersempit X3 M27):** hanya tabel S1-S2. Migrasi **0015** = `project`, `project_member`, `project_activity`; **0016** = `task_kind`, `task`, `task_checklist_item`, `task_comment`, `task_activity`. `profile` sudah milik 0014/S0.a. Tabel S3+ (`project_phase`, `project_milestone`, `project_deadline_extension`, `project_condition_override`, `task_attachment`, `task_dependency`, `task_review`, `tag`, `task_tag`, event, notification) **tidak dibuat**; kolom pada `task`/`project` yang dipakai S2 tetap ada, `task.phase_id` ditambah kelak (expand-only). Konsekuensi dan default lihat §7 K1-K3.
- **Modul murni:** `server/access/*` (tipe `Principal`, bukan `Actor`; tanpa `index.ts`) dan `server/metrics/*`; 53 dari 66 kasus uji R03 ikut, 13 kasus S3+ ditunda (daftar di §5.1 butir 5).
- **Kerangka API:** gerbang 401 di `derive` (D5), 6 plugin `app-*.ts` kosong, `PM_KEY_DENY` (D10). **App:** 12 berkas stub rute (11 URL) S0-S2, NAV 4 item, tema skala 1/1,25/1,5, 17 komponen/helper bersama + 4 hook, `tests/support`, data Atlas (17%).
- **Wajib sebelum tag:** konversi 13 berkas `mock.module(guard)` (S0B-22/23, D8d); 12 koreksi `CLAUDE.md` (S0B-31 + tabel kepemilikan).
- **Estimasi:** ±37 hari-orang AI (rentang 30-40); R10 §5 menulis 16-22. Selisih ±15-21 berasal dari D8d (3), D2 (1,75), D5/D10 + `pm/*` (3,5), 8e (0,75), 8 persona M21, kapasitas peninjau. Kalender ±12-14 hari kerja pada lajur terpanjang (R10: 7-11) → risiko jadwal di §7 K9.
- **Keputusan tertunda untuk user:** M28 (hapus proyek tanpa Sampah), peninjau kedua S0.b, konfirmasi X1-Q5 sebelum menyentuh migrasi (§7).

## 2. Prasyarat, lajur, dan aturan umum
### 2.1 Prasyarat (diperiksa di repo 15 Okt 2026)
| Gerbang | Isi | Keadaan repo sekarang | Bila belum |
|---|---|---|---|
| **G0 = S0.0 selesai** | `scripts/db-generate.ts` + `bun run db:generate` memakai wrapper; `tests/db/migrations-guard.test.ts` + `migrations-idempotent.test.ts` (`GUARDED_FROM = 4`); stub 5 berkas skema terdaftar di `drizzle.config.ts` + barrel `server/db/schema.ts`; `tests/test-hygiene.test.ts` (8b); `.gitattributes` `CHANGELOG.md merge=union`; Mantine pin 9.6.3 + `@mantine/dates` + `dayjs` | **Belum ada**: `scripts/` hanya `build-binary|release-notes|smoke-*`; `drizzle.config.ts` mendaftar 4 berkas; Mantine terpasang 9.6.0 | Jangan mulai S0B-03/06 (migrasi). S0B-02 menambah sendiri pendaftaran berkas di `drizzle.config.ts` + barrel bila stub S0.0 belum ada (pemilik tunggal lajur D) |
| **G-A1 = SP0a** | Dari S0.a, merge pertama: `Role` 4 nilai (`member`,`project_manager`,`admin`,`super-admin`) + `isAdminRole` di `server/permissions.ts`; `assertAccountApproved(actor)` di `server/guard.ts` (M18) | `server/roles.ts`/`permissions.ts` masih 3 role | Tugas yang mengimpor `Role` (S0B-12 ke atas, 18, 19) menunggu; sisanya jalan |
| **G-A2 = SP0** | Migrasi **0014** (profile, `user.approval_status`, `user_invitation`) merge ke cabang integrasi; `ROLE_RANK` 4 role di `scopes.ts` | belum | S0B-03 (0015) wajib rebase di atasnya; `db:generate` hanya setelah itu (baton, D6) |
| **G-Q5** | Konfirmasi user: migrasi 0000-0013 belum pernah dijalankan di produksi sungguhan (KEPUTUSAN §5 butir 3) | belum dikonfirmasi | Sebelum S0B-03: agen bertanya lewat `orca orchestration ask`; jawaban "pernah" = hentikan |

### 2.2 Lajur, cabang, urutan merge
| Lajur | Pekerja & cabang kerja (basis `feature/project-management`) | Tugas | Pemilik berkas (X3 §2d) |
|---|---|---|---|
| **D** data | `feature/s0b-data` | S0B-01…07 skema+migrasi, 08-09 metrics, 10 membership | L-B (skema); metrics + `membership.query.ts` ditulis lajur D karena lebih longgar, **pemilik tetap L-C** setelah merge |
| **K** kontrak server | `feature/s0b-server` | S0B-11…19 `pm/*`, `access/*`, API kerangka, scope | L-C |
| **A** app + tes | `feature/s0b-app` | S0B-20…30 tema, stub rute, komponen, `tests/support`, Atlas, konversi mock | L-C |
| silang | cabang pemilik terkait | S0B-31 (CLAUDE.md), 32 (README), 33 (gerbang tag) | L-C / integrator |

Urutan merge (X3 §2d, `--no-ff`, `merge: <ringkasan>`, tanpa merge sendiri; tiap merge diikuti `bun run test`, `typecheck`, `lint`): **D → K → A → S0B-33**; rebase + jalankan ulang test bagi yang kedua dan ketiga. Maks. **3 pekerja serentak, satu per lajur** (memori `worker-token-quota-limit`: 14 worker memicu 429; luncurkan 2-3 per batch).

### 2.3 Berlaku untuk SEMUA tugas (tidak diulang di tiap blok)
- Baca dulu `CLAUDE.md` proyek + `KEPUTUSAN-MVP-INTI.md` (aturan global §19). Cabang kerja lajur dibuat sekali; **satu tugas = satu commit** (`<type>(<scope>): <english imperative>`, akhiri `Co-Authored-By` sesuai aturan sesi); tidak ada `git push`, deploy, atau merge tanpa perintah user.
- Done tiap tugas: `bun run typecheck` **nol** error tanpa filter · `bun run lint` hijau · `bun run test` hijau (termasuk `tests/client-server-imports.test.ts`) · tes baru bukan placeholder · tanpa empty `catch`, TODO tanpa konteks, `console.log`, nilai hardcode (konstanta bernama/env), PII di log · docstring satu baris untuk fungsi/modul publik baru.
- Batas baris (aturan global §8): route/handler 150 · service 300 · repository/query 250 · schema 200 · types 300 · util 200 · config 100 · test 400; keras 500 baris/20.000 karakter. Periksa ukuran berkas sebelum edit; berkas ≥80% batas → pecah dulu.
- Lencana: 📝 = tambah butir `## [Unreleased]` di `CHANGELOG.md` (Indonesia, sudut pandang pengguna, M32) di commit yang sama · 🔥 = jalankan `bun run smoke:prod` **dan** `bun run smoke:binary` (menyentuh `server/`, `app/root.tsx`, atau build) · 🧊 = juga `bun run smoke:coldboot` (menyentuh migrasi). Migrasi baru dijalankan ke dev **dan** test: `bun run db:migrate` + `DATABASE_URL=$DATABASE_URL_TEST bun run db:migrate`, lalu `drizzle-kit generate` harus kosong.
- Impor dari `server/access|metrics|pm` selalu **file eksplisit** (`@server/access/task.policy`), tidak ada impor direktori; tes memakai `spyOn`, bukan `mock.module`. Ukuran: S ≤0,75 · M 1-1,5 · L ≥2 hari-orang AI.

## 3. Daftar tugas (S0B-01 … S0B-33)
> Format blok: **Target** (path persis; *baru* = belum ada, induknya sudah diperiksa ada) · **Change** · **Constraints/Ownership** · **Acceptance** (berkas test + kasus utama) · **Commit**. Rujukan `§` = bagian laporan sumber. Urutan ID = urutan prioritas, bukan urutan wajib; kolom dep menentukan.

### Lajur D — skema, migrasi, metrics, keanggotaan

#### S0B-01 · Enum bersama, soft delete, helper kolom, sesi DB UTC · D · S0.b · dep: G0 · S (0,5) · 🔥
- **Target:** `server/pm/enums.ts` (*baru*, ≤120), `server/pm/soft-delete.ts` (*baru*, ≤60), `server/db/schema.columns.ts` (*baru*, ≤100), `server/db/index.ts` (+1 opsi), `tests/pm/enums.test.ts`, `tests/db/session-timezone.test.ts` (*baru*).
- **Change:** tuple `as const` yang dibutuhkan S0-S2: `PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_MEMBER_ROLES, PROJECT_CONDITIONS, TASK_BASE_KINDS, TASK_STATUSES, TASK_CANCEL_CATEGORIES, TEXT_SIZES=['normal','besar','sangat_besar'] (M12), APPROVAL_STATUSES` + tipe turunannya. Tuple S3+ (`PHASE_STATUSES`, `REVIEW_DECISIONS`, `EVENT_*`, dst.) **tidak** dibuat. `schema.columns.ts`: `pk()`, `createdAt()`, `updatedAt()` (`timestamptz`, D7), `softDelete()`, `oneOf(col, TUPLE)` yang menghasilkan CHECK dari tuple (R02 §3.1). `soft-delete.ts`: `isLive(table)` (`deleted_at IS NULL`, R02 §3.5). `server/db/index.ts`: `pgClient(dbUrl, { max: 5, connection: { TimeZone: 'UTC' } })` (D7; opsi `connection` = ASUMSI, periksa).
- **Constraints/Ownership:** hanya lajur D menyentuh `enums.ts`, `soft-delete.ts`, `schema.columns.ts`; berkas `enums.ts` murni (tanpa `Bun.`/`process.`/impor db, juga di komentar) karena diimpor klien. **Merge dini (SP1a)** ke cabang integrasi atas persetujuan user supaya S0.a (`TEXT_SIZES`, `APPROVAL_STATUSES`) dan lajur K mengimpor.
- **Acceptance:** `enums.test.ts`: tiap tuple tidak kosong, unik, nilai persis seperti R02 §3.2 (`TEXT_SIZES` = 3 nilai); `session-timezone.test.ts`: `SHOW TimeZone` = `UTC`; `tests/client-server-imports.test.ts` hijau; 🔥.
- **Commit:** `feat(pm): add shared enums, soft-delete helper and UTC session zone`

#### S0B-02 · Skema proyek · D · S0.b · dep: S0B-01 · M (1)
- **Target:** `server/db/schema.project.ts` (*baru*, ≤200: `project`, `project_member`), `server/db/schema.project-history.ts` (*baru*, ≤60: `project_activity`), `drizzle.config.ts` + `server/db/schema.ts` (hanya bila stub S0.0 belum terdaftar), `tests/db/schema-wiring.test.ts` (*baru*, R02 §3.3).
- **Change:** kolom/CHECK/indeks persis R02 §3.2 modul 02 untuk 3 tabel itu: id `text` `crypto.randomUUID()`, `lead_id`/`created_by`/`deleted_by` nullable FK `user` SET NULL (M3), `project_member` PK `(project_id,user_id)` CAS + `role` CHECK `manager|member|viewer` + indeks `(user_id)`, `project.tasks_need_review_default` `false` (T-A10), `original_due_date` tetap ada (diisi S5), CHECK `due_date>=start_date`, indeks `(status,due_date)` parsial live dan `(deleted_at)` parsial. `project_activity`: `actor_name` snapshot, `payload jsonb`, indeks `(project_id,created_at)`. Komentar "kenapa" untuk kolom nullable-SET NULL dan `timestamptz` vs kolom `user` lama (D7).
- **Constraints/Ownership:** tidak ada `relations()` baru (R02 §3.1); tabel `project_phase`/`milestone`/`extension`/`condition_override` **tidak** dibuat; belum menjalankan `db:generate`. Pemilik tunggal lajur D.
- **Acceptance:** `schema-wiring.test.ts`: setiap `server/db/schema.*.ts` terdaftar di `drizzle.config.ts` **dan** barrel; `tests/db/schema-introspect.test.ts` hijau; `typecheck` nol.
- **Commit:** `feat(db): add project, project_member and project_activity schema`

#### S0B-03 · Migrasi 0015 `project_core` · D · S0.b · dep: S0B-02, G0, G-A2, G-Q5 · M (1) · 🧊 🔥
- **Target:** `server/db/migrations/0015_project_core.sql` + `meta/*` (dibangkitkan), `server/db/rollback/0015_project_core.down.sql` (*baru*), `tests/db/project-core-migration.test.ts` (*baru*).
- **Change:** rebase di atas 0014 → `bun run db:generate -- --name=project_core` (wrapper S0.0: `IF NOT EXISTS`, `ADD CONSTRAINT` dibungkus `DO $$ … duplicate_object`, baris pertama `-- why:` ≥20 karakter: alasan, bukan apa). Down = `DROP … IF EXISTS` urutan terbalik. Jalankan ke dev **dan** test dua kali; `drizzle-kit generate` kosong.
- **Constraints/Ownership:** pemegang baton = lajur D; tidak menulis nomor ≥0017 (M1); tidak mengedit `.sql` yang dibangkitkan kecuali lewat wrapper/`--custom`.
- **Acceptance:** `migrations-guard.test.ts` + `migrations-idempotent.test.ts` hijau termasuk 0015; `project-core-migration.test.ts`: statement 0015 dijalankan ulang tanpa galat, 3 tabel + 8 indeks/CHECK ada, `DELETE` proyek meng-CASCADE `project_member`+`project_activity`, hapus `user` menjadikan `project.lead_id` NULL; `bun run smoke:coldboot` hijau.
- **Commit:** `feat(db): add project core migration 0015`

#### S0B-04 · Patch `schema-introspect` (D8e) · D · S0.b · dep: S0B-01 · S (0,75)
- **Target:** `server/db/schema-introspect.ts` (138 → ≤185 baris), `tests/db/schema-introspect.test.ts` (99 → ≤260).
- **Change:** `PG_TYPE_MAP` + `PgBigInt53/64`, `PgSmallInt`, `PgDateString`, `PgTimestampString`, `PgNumericNumber`; `timestamp` ber-`withTimezone` → `timestamptz`; kolom indeks ekspresi lewat `is(c, SQL)` (hapus `"[object Object]"`, baris 128-132); `IndexMeta.where` untuk indeks parsial; cabang `generatedIdentity ⇒ 'identity'`.
- **Constraints/Ownership:** wajib ter-merge **sebelum** 0016 (S0B-06); tabel uji sintetis `pgTable` di dalam test (tabel tugas belum ada); tidak mengubah format keluaran yang dipakai `/dev/db-schema` selain tipe baru.
- **Acceptance:** `schema-introspect.test.ts` +kasus: `smallint`, `date` mode string, `numeric`, `timestamptz`, identity, indeks `lower(name)` bukan `"[object Object]"`, indeks parsial membawa `where`.
- **Commit:** `fix(db): extend schema introspection for new column and index types`

#### S0B-05 · Skema tugas · D · S0.b · dep: S0B-02, S0B-04 · M (1,5)
- **Target:** `server/db/schema.task.ts` (*baru*, ≤200: `task_kind`, `task`), `server/db/schema.task-detail.ts` (*baru*, ≤200: `task_checklist_item`, `task_comment`, `task_activity`), `tests/db/schema-wiring.test.ts`.
- **Change:** persis R02 §3.2 modul 03 untuk 5 tabel. `task.number` = `bigint` identity `BY DEFAULT` (`task_number_seq`) + `UNIQUE`; `kind_id` NOT NULL FK `task_kind` NO ACTION; `created_by` nullable (M3); semua CHECK R02 (status, priority, `cancel_category`, `due_date>=start_date`, `reviewer_id<>assignee_id`, `canceled ⇒ cancel_category`, `'other' ⇒ cancel_note`, `reopen_count>=0 AND return_count>=0`); indeks `(number)` UNIK, `(project_id,status)` P live, `(assignee_id,status,due_date)` P live, `(deleted_at)` P, `(deleted_with_project_id)` P; `task_kind` UNIK `(project_id, lower(name))`. **Kolom `phase_id` TIDAK dibuat** (FK ke `project_phase` yang ditunda; ditambah kelak, nullable, expand-only). Kolom `reviewer_id`, `needs_review`, `review_requested_at`, `reopen_count`, `return_count`, `cancel_*` **tetap ada** (dipakai transisi S2, §7 K2).
- **Constraints/Ownership:** bila `schema.task.ts` >200 baris, pindahkan `task_kind` ke `schema.task-detail.ts` (nama tabel tidak berubah); `task_review`, `task_dependency`, `task_attachment`, `tag`, `task_tag` tidak dibuat.
- **Acceptance:** wiring + introspect hijau; `typecheck` nol.
- **Commit:** `feat(db): add task, task_kind and task detail schema`

#### S0B-06 · Migrasi 0016 `task_core` · D · S0.b · dep: S0B-03, S0B-05 (S0B-04 sudah merge) · M (1) · 🧊 🔥
- **Target:** `server/db/migrations/0016_task_core.sql` + `meta/*`, `server/db/rollback/0016_task_core.down.sql`, `tests/db/task-core-migration.test.ts` (*baru*).
- **Change:** seperti S0B-03; wrapper memastikan identity/sequence aman diulang (tabel dibuat `IF NOT EXISTS`, tidak ada `ALTER … ADD GENERATED`). Jalankan dev + test dua kali, `drizzle-kit generate` kosong.
- **Constraints/Ownership:** baton lajur D; tanpa nomor ≥0017.
- **Acceptance:** guard + idempotent hijau; `task-core-migration.test.ts`: dua tugas mendapat `number` naik; hapus proyek meng-CASCADE tugas+checklist+komentar+aktivitas; hapus `task_kind` yang dipakai ditolak (NO ACTION); hapus `user` menjadikan `task.created_by`/`assignee_id` NULL; tiap CHECK menolak nilai liar; smoke:coldboot hijau; `/dev/db-schema` (via `schema-stats`) menampilkan 8 tabel PM baru.
- **Commit:** `feat(db): add task core migration 0016`

#### S0B-07 · Tes kontrak skema dan indeks · D · S0.b · dep: S0B-06 · S (0,75)
- **Target:** `tests/db/pm-schema-contract.test.ts`, `tests/db/pm-indexes.test.ts`, `tests/db/pm-enum-check.test.ts`, `tests/db/timezone-mixing.test.ts` (semua *baru*).
- **Change:** (1) snapshot persis daftar tabel+kolom+tipe 8 tabel PM (lewat `schema-introspect`) — perubahan apa pun merah dan harus disengaja; (2) indeks hasil introspeksi = daftar R02 §3.2/§3.7 untuk tabel dalam lingkup + `EXPLAIN` dengan `SET enable_seqscan=off` memakai indeks untuk 2 query (daftar proyek per status, tugas per pengerja); (3) tiap tuple `enums.ts` ↔ nilai CHECK: setiap nilai valid bisa di-INSERT, satu nilai liar ditolak; (4) D7: pada satu koneksi `SET TIME ZONE 'Asia/Jakarta'`, JOIN `user.created_at` ↔ `task.created_at` lewat `AT TIME ZONE 'UTC'` benar.
- **Constraints/Ownership:** DB test saja (`DATABASE_URL_TEST`); data uji berprefiks `TAG` dan dibersihkan per id (bukan `DELETE` global).
- **Acceptance:** keempat berkas hijau dua kali berturut-turut.
- **Commit:** `test(db): add project and task schema contract tests`

#### S0B-08 · Metrics 1: konfigurasi, tanggal, hitungan tugas · D · S0.b · dep: S0B-01 · M (1)
- **Target:** `server/metrics/config.ts`, `dates.ts`, `types.ts`, `task.metrics.ts` (semua *baru*, ≤200), `server/pm/metrics-env.ts` (*baru*, server-only, ≤60), `tests/metrics/{dates,task.metrics}.test.ts` (*baru*).
- **Change:** `METRICS` (`AT_RISK_OVERDUE_RATIO 0.2`, `AT_RISK_PRIORITIES ['high','critical']`, `TASK_STALE_DAYS 3`, `TRASH_RETENTION_DAYS 30`, `TASK_KINDS_MAX_ACTIVE 6`, `TIME_ZONE 'Asia/Jakarta'`, `UNDO_WINDOW_SECONDS 10`, `PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE 99`; X2 §2D) tanpa membaca env; `metrics-env.ts` membaca `APP_TIME_ZONE`, `PROJECT_AT_RISK_OVERDUE_RATIO`, `TASK_STALE_DAYS`, `TRASH_RETENTION_DAYS` dan mengembalikan `METRICS` yang di-override (nilai tak valid → default + log `warn`). `dates.ts`: `IsoDate`, `isoDateIn(d,tz)`, `diffDays`. `task.metrics.ts`: `ACTIVE_STATUSES`, `isActive`, `isOverdue`, `isStale`, `ageDays`, `taskLabels(t, {today, now, blocked, awaitingMe})` + tipe **`TaskLabel = 'overdue'|'awaiting_my_review'|'blocked'|'stale'|'reopened'`** (M13; `blocked` datang dari pemanggil, `isBlocked` ditunda ke S4).
- **Constraints/Ownership:** `now: Date` dan `today: IsoDate` selalu parameter (R03 D9); tanpa `new Date()` di dalam modul; modul `metrics/*` hanya mengimpor satu sama lain, `../pm/enums`, `../permissions` (tipe) — tanpa `env/db/logger/node:/Bun./process.`; pemilik setelah merge: L-C.
- **Acceptance:** `tests/metrics/*`: R03 F13 (5 kasus `isOverdue`), F14 (72 jam tepat/+1 menit), F15 (`ageDays` 6 vs hitung UTC 7), F16 (`2026-10-06T17:30:00Z` ⇒ hari ini `2026-10-07`), F20 (urutan label), `diffDays` lintas bulan; `metrics-env` menolak nilai non-angka.
- **Commit:** `feat(metrics): add metrics config, date helpers and task counters`

#### S0B-09 · Metrics 2: progres, waktu berjalan, kondisi proyek · D · S0.b · dep: S0B-08 · M (1)
- **Target:** `server/metrics/project.metrics.ts`, `server/metrics/condition.ts` (*baru*, ≤200), `tests/metrics/{project.metrics,condition}.test.ts` (*baru*).
- **Change:** `progress(tasks)` (kolam: bukan terhapus, bukan `canceled`; `in_review` belum selesai) dengan **`Math.round`, maksimum 99 kecuali semua selesai, `percent=null` bila kolam kosong** (X2 §2C; menggantikan floor R03 K20, §7 K4); `elapsed`; `milestoneState`, `computeCondition(input, cfg)` dengan `ConditionInput.milestones/overrides` tetap bagian tanda tangan (S1 mengisi `[]`), `activeOverride`, `formatConditionReason` (kondisi `on_track|at_risk|off_track`, M13).
- **Constraints/Ownership:** `progress(tasks, phaseId?)`: parameter `phaseId` **tidak** ada (tabel tahapan ditunda; ditambah S5 sebagai argumen opsional, bukan perubahan tanda tangan yang ada).
- **Acceptance:** R03 F01-F03, F05-F12 sebagai `test.each` (F04 versi fase ditunda; ganti F04 dengan kasus 2/3 ⇒ **67**); golden Atlas: 1 selesai dari 6 non-batal ⇒ **17**, waktu berjalan **60**, aktif 5, terlambat 1, `at_risk` + `IMPORTANT_OVERDUE count=1`; 199/200 ⇒ 99, 200/200 ⇒ 100.
- **Commit:** `feat(metrics): add progress, elapsed time and project condition`

#### S0B-10 · Keanggotaan proyek (query) · D · S0.b · dep: S0B-06, S0B-12 · M (1)
- **Target:** `server/project/membership.query.ts` (*baru*, ≤250), `tests/project/membership.query.test.ts` (*baru*; folder `tests/project/` baru).
- **Change:** `loadMembership(userId, projectIds[], exec=db): Promise<Map<string, Membership>>` (satu query untuk banyak proyek; `joinedAt` = `project_member.created_at`, M2), `toPrincipal(actor: { user: { id: string }; role: Role }): Principal` (struktural, tanpa mengimpor `guard.ts` agar tidak siklik; menyelesaikan konflik nama dengan `guard.Actor`), `loadReviewerPool(projectId, exec=db): Promise<ReviewerPool>` (satu query: Pengelola aktif + Admin/SA `approved` dan tidak `banned`).
- **Constraints/Ownership:** satu-satunya tempat membaca keanggotaan; bukan di `access/` (murni); eksekutor `Executor` dari `server/pm/tx.ts` (S0B-11) boleh ditambahkan setelah S0B-11 merge, sebelum itu `typeof db`.
- **Acceptance:** DB test (graf kecil, id `TAG-…`): 3 proyek ⇒ **1 query** (penghitung query), non-anggota tidak ada di Map, Admin `rejected`/`banned` tidak masuk pool, Pengelola tanpa Admin ⇒ pool hanya Pengelola; `toPrincipal` memetakan 4 role.
- **Commit:** `feat(project): add membership and reviewer pool queries`

### Lajur K — `server/pm/*`, `server/access/*`, kerangka API, scope

#### S0B-11 · Infrastruktur `server/pm`: galat, transaksi, keyset, batas · K · S0.b · dep: S0B-01 · M (1)
- **Target:** `server/pm/errors.ts` (*baru*, ≤150, murni), `server/pm/respond.ts` (*baru*, ≤60), `server/pm/tx.ts` (*baru*, ≤40), `server/pm/keyset.ts` (*baru*, ≤80), `server/pm/limits.ts` (*baru*, ≤100, murni), `tests/pm/{errors,keyset,tx-discipline}.test.ts` (*baru*).
- **Change:** `errors.ts`: `PM_ERRORS: Record<PmCode,{http,message}>` = katalog R04 §3.5 **dipangkas ke S0-S2** (`VALIDATION`, `NOT_FOUND`, `STATE_CONFLICT`, `STALE_VERSION`, `LAST_MANAGER`, `LEAD_MUST_BE_MANAGER`, `KIND_LIMIT`, `KIND_IN_USE`, `REASON_REQUIRED`, `CANCEL_NOTE_REQUIRED`, `NO_ELIGIBLE_REVIEWER`, `RATE_LIMITED`, `STORAGE_DISABLED`) + kode kebijakan `DenyCode` (`NOT_MANAGER`, `NOT_MEMBER`, `NOT_OWNER`, `NOT_ADMIN`, `NOT_APP_ROLE`, `SELF_REVIEW`, `SELF_TARGET`, `TARGET_PROTECTED`, `IMPERSONATING`, `WRONG_STATE`, `LOCKED_BY_STATUS`, `REVIEW_REQUIRED`, `LAST_MANAGER`, `IS_LEAD`, `PROJECT_IN_TRASH`, `NO_PROJECT`) ; ejaan R04 menang (M8) — `NOT_VISIBLE` dipetakan ke `NOT_FOUND`/404, `EXPIRED`/410 ditambah bersama Sampah (S6). Akun: `ACCOUNT_PENDING`, `ACCOUNT_REJECTED` (M18; `ACCOUNT_NOT_APPROVED` tidak ada). `respond.ts` (server-only): `fail(status, code, extra?)` → `{ error, code }` dan `denyResponse(decision)` → `{ http, body }`. `tx.ts`: `Tx`, `Executor`, `inTx`. `keyset.ts`: `encodeCursor/decodeCursor` (base64url JSON `[sortValue,id]`, cursor rusak ⇒ `VALIDATION`), `limits.ts`: `DEFAULT_TASK_KINDS` (Tugas/task, Bug/issue, Ide/idea), `PAGE_LIMIT_DEFAULT/MAX`, `WRITE_RATE_MAX`/`WRITE_RATE_WINDOW_SECONDS`, **`TASK_REVIEW_UI_ENABLED = false`** (M25), **`PROJECT_DELETE_UI_ENABLED`** (nilai: lihat §7 K3).
- **Constraints/Ownership:** `errors.ts` dan `limits.ts` diimpor klien ⇒ murni; pesan Indonesia actionable, tanpa jargon; 5xx tidak membawa pesan internal. Pemilik tunggal lajur K.
- **Acceptance:** `errors.test.ts`: setiap kode punya `http` ∈ {403,404,409,422,429,503}, pesan non-kosong, kode unik; `keyset.test.ts`: round-trip + cursor rusak; `tx-discipline.test.ts`: fungsi pemindai (diuji dengan cuplikan buruk: `db.` di dalam callback `inTx`, `await storage()`/`fetch`/`Bun.sleep` di dalam callback) lalu memindai `server/**/*.service.ts` (kosong di S0.b, aktif otomatis untuk S1/S2).
- **Commit:** `feat(pm): add error catalog, transaction and keyset helpers`

#### S0B-12 · Fondasi `server/access`: tipe, keputusan, level, flag · K · S0.b · dep: S0B-11, G-A1 · M (1)
- **Target:** `server/access/{types,decision,level,rules}.ts` (*baru*; ≤120/150/60/80), `tests/access/fixtures.ts` (*baru*), `tests/access/{level,purity}.test.ts` (*baru*), `tests/client-server-imports.test.ts` (perketat saja).
- **Change:** `Principal = { id; appRole: Role; impersonating: boolean }` (bukan `Actor`, F2 R03; `impersonating` untuk Q9, §7 K7), `ProjectRole`, `Membership = { role; joinedAt: Date } | null`, `ProjectSubject` (`leadId: string|null`), `TaskSubject` (`createdBy: string|null`) (M3); `Decision`, `DenyCode` (diekspor ulang dari `pm/errors`, M8), `DENY_UI: Record<DenyCode,{http:403|404|409|410|422; ui:'hide'|'disable'; message}>`, `allow/deny`; `levelOf(p, m, rules)` (K1/K6); `ACCESS_RULES` hanya flag yang dipakai S0-S2: `P_A1_PM_NON_MEMBER_READS`, `P_A1B_PM_NON_MEMBER_COMMENTS`, `T_A2_MEMBER_EDIT_SCOPE`, `T_A4_COMPLETE_FROM_TODO`, `T_A5_MEMBER_ENABLES_REVIEW`, `PROJECT_CLOSED_ALLOWS_TASK_WRITES`, `MEMBER_CAN_LEAVE_PROJECT` (X2 §2D; flag S3+ ditambah irisannya). Persona fixture `persona('PM-K')` dst. (Boss/Ayu/Nico/Mira/Rina/Dodi/Sri/Lea/Bella, R03 §3.8).
- **Constraints/Ownership:** **tanpa `index.ts`** di `server/access/` dan `server/metrics/` (menyelesaikan impor direktori yang ditolak `tests/client-server-imports`: spesifikasi `@server/access` di-resolve ke `server/access.ts` yang tidak ada ⇒ ENOENT; §7 K8); impor selalu file eksplisit tanpa ekstensi. `client-server-imports.test.ts`: regex diperluas ke `import * as` dan `export … from`, target tak ter-resolve ⇒ pesan gagal jelas — hanya memperketat.
- **Acceptance:** `level.test.ts`: `levelOf` untuk 8 persona + monoton `admin ⊇ manager ⊇ member ⊇ viewer ⊇ reader ⊇ none`, `P_A1=false` ⇒ `none`; `purity.test.ts`: berkas `server/access/*`, `server/metrics/*`, `server/pm/{enums,errors,limits}.ts` bebas `Bun.`/`process.`/`node:`/`env`/`db`/`logger` (termasuk di komentar), tidak ada impor direktori, tidak ada `index.ts`; `DENY_UI` punya entri tiap `DenyCode` (tipe `Record`).
- **Commit:** `feat(access): add principal, decision and level foundations`

#### S0B-13 · Izin pengguna dan status akun · K · S0.b · dep: S0B-12 · M (1)
- **Target:** `server/access/user.policy.ts` (*baru*, ≤150), `server/access/account-status.rules.ts` (*baru*, ≤100), `tests/access/{user.policy,account-status.rules}.test.ts` (*baru*).
- **Change:** `canActOnUser(p, target)`, `canSetUserRole(p, target, next)`, `canInviteWithRole(p, role)` (X2 §2E1: Admin boleh Member↔PM, hanya SA menyentuh Admin, `TARGET_PROTECTED` untuk super-admin, `SELF_TARGET`, `IMPERSONATING` memblokir hapus/ubah role/setujui/tolak/nonaktifkan); `canTransitionAccount(from, to, actor, target)` (M19; transisi `pending→approved|rejected`, `approved→suspended(banned)`; `rejected→approved` oleh Admin).
- **Constraints/Ownership:** dibutuhkan S0.a (halaman Pengguna) — jadwalkan **tepat sesudah S0B-12** dan beri tahu L-A lewat catatan serah; bila S0.a sudah menulis logika serupa di `server/permissions.ts`, refaktor hanya dengan persetujuan L-A (§7 K6). `canChangeTeamSettings` ditunda (S6).
- **Acceptance:** R03 C36, C37, C38 (bagian undangan) sebagai `test.each` + matriks 4 role akun × aksi (E1); tabel transisi akun lengkap (valid & tidak valid) dari R09 A4.
- **Commit:** `feat(access): add user and account status policies`

#### S0B-14 · Izin proyek dan anggota · K · S0.b · dep: S0B-12 · M (1,5)
- **Target:** `server/access/project.policy.ts`, `server/access/members.policy.ts` (*baru*, ≤150), `tests/access/{project.policy,members.policy}.test.ts` (*baru*).
- **Change:** `canViewProject`, `canCreateProject`, `canManageProject` (ubah, status, setelan; `PROJECT_IN_TRASH`), **`canTrashProject(p, project, m, rules)`** (hapus-ke-Sampah; **keputusan user 15 Okt**: = `canManageProject` ∧ (Admin/Super-admin ∨ role akun PM ∨ `rules.MEMBER_MANAGER_CAN_TRASH_PROJECT`); kode tolak `IMPERSONATING` bila menyamar, dan kode baru `ROLE_CANNOT_TRASH` untuk Member-Pengelola, ditambahkan aditif ke katalog `PM_ERRORS`), `canChangeManagerSet(p, project, m, i)` — **dengan pelaku** (M10): cek `canManageProject` lebih dulu lalu `LAST_MANAGER`/`IS_LEAD`; `canSetLead(p, project, m, nextLeadId, managerIds)` (galat `LEAD_MUST_BE_MANAGER`, ejaan R04; C28 diuji dengan kode itu); `projectListScope(p)`, `matchesProjectScope`, `clampListScope(requested, allowed)` (M11: Member dengan `scope=all` dijepit ke `mine`). Ditunda: `canSaveTemplate`, `validateExtension` (S5), `canRestoreProject`/`trashScope` (S6, §7 K3).
- **Constraints/Ownership:** hanya pembanding `Level` (tidak ada `appRole ===` selain di `level.ts`; `canTrashProject` memakai helper `isPmOrAbove(p)` yang ditambahkan di `level.ts`); konstanta baru `ACCESS_RULES.MEMBER_MANAGER_CAN_TRASH_PROJECT=false` (satu baris di `rules`, dibalik bila user berubah pikiran); setiap fungsi menerima `rules = ACCESS_RULES` terakhir.
- **Acceptance:** R03 **C01-C06, C25-C28** (10 kasus) + matriks eksaustif E2 (8 persona × `view/create/update/setStatus/trash/member.add|changeRole|remove/setLead`) + invarian SA≡AD, PM-K≡M-K **untuk semua aksi proyek KECUALI `trash`** (kasus eksplisit: M-K `trash` → `ROLE_CANNOT_TRASH`; PM-K, AD, SA → allow; flag `true` membalik hasil M-K; selama menyamar → `IMPERSONATING`); PM bukan anggota ⇒ `view` allow, `update` `NOT_MANAGER`; Member bukan anggota ⇒ `NOT_VISIBLE`; `clampListScope` (M11).
- **Commit:** `feat(access): add project and membership policies`

#### S0B-15 · Izin pemeriksa (review) · K · S0.b · dep: S0B-12 · M (1)
- **Target:** `server/access/review.policy.ts` (*baru*, ≤200), `tests/access/review.policy.test.ts` (*baru*).
- **Change:** `ReviewerPool`, `pickReviewer(i)` (urutan: pembuat-Pengelola → Lead → Pengelola lain → pool Admin; seri ⇒ id terkecil; `suggestSecondManager`), `canRequestReview(p, task, m, pool)` (`NO_ELIGIBLE_REVIEWER`), `canApproveTask` (`SELF_REVIEW` tidak bisa menyetujui hasil sendiri, Q6), `canReturnTask(p, task, m, note)` (`REASON_REQUIRED`), `canChangeReviewer`.
- **Constraints/Ownership:** hanya logika kebijakan; **tidak ada** tabel `task_review` (S4) dan tidak ada UI (flag `TASK_REVIEW_UI_ENABLED=false`, §7 K2).
- **Acceptance:** R03 **C12-C14, C39-C43, C45** (9 kasus) + persona 8 untuk `approve`/`return`.
- **Commit:** `feat(access): add review policy and reviewer selection`

#### S0B-16 · Izin tugas dan alur kerja · K · S0.b · dep: S0B-12, S0B-15 · L (2,5)
- **Target:** `server/access/task.policy.ts` (≤250), `server/access/task-flow.policy.ts` (≤250) (*baru*), `tests/access/{task.policy,task-flow.policy,task-matrix}.test.ts` (*baru*).
- **Change:** `canViewTask`, `canCreateTask` (juga di proyek Selesai/Ditunda, `PROJECT_CLOSED_ALLOWS_TASK_WRITES`; di Sampah ❌), `canEditTask` (`T_A2='own'`), `canComment` (PM bukan anggota ❌ = K10), `canManageKinds`, `canToggleNeedsReview`, `resolveNeedsReviewOnCreate` (**mengabaikan `true` selama `TASK_REVIEW_UI_ENABLED=false`**, `ignored:true`, M25); `canStartTask`, `canUnstartTask`, `canCompleteTask` (`T_A4`, `REVIEW_REQUIRED`), `canReopenTask(…, reason)`, `canCancelTask(…, {category,note})`, **`canUncancelTask` (M9)**, `TASK_TRANSITIONS` (12 pasangan *dari→ke*, data), `nextStatuses(task)`, `primaryAction(p, task, m, pool)`. Ditunda: `canTrashTask/Untrash` (S6), `canAttach` (S5), `canManageTags` (S4).
- **Constraints/Ownership:** satu sumber transisi: `TASK_TRANSITIONS` dipakai service S2 **dan** tes; kunci `can` UI (M29) turun dari nama fungsi di S0B-17.
- **Acceptance:** R03 **C07-C11, C15-C19, C22, C24, C44, C46** (14 kasus) + `task-matrix.test.ts`: `status(5) × needsReview(2) × persona(8) × hubungan(pembuat/pengerja/keduanya/bukan)` = 320 kombinasi per aksi untuk 8 persona (M21: PM bukan-anggota 👁 dan Member bukan-anggota 404 ikut diuji); setiap pasangan di luar `TASK_TRANSITIONS` ditolak `WRONG_STATE`.
- **Commit:** `feat(access): add task and workflow policies`

#### S0B-17 · Kapabilitas (`can{}`) dan paritas · K · S0.b · dep: S0B-13, 14, 15, 16 · M (1)
- **Target:** `server/access/capabilities.ts` (*baru*, ≤200), `tests/access/capabilities.test.ts`, `tests/pm/errors-parity.test.ts`, `tests/no-role-branching.test.ts` (*baru*).
- **Change:** `buildCaps`, `projectCaps`, `taskCaps` dengan kunci **`update, start, unstart, complete, requestReview, approve, return, reopen, cancel, uncancel, comment, needsReviewOn, needsReviewOff, changeReviewer`** + `primary` (M29; `trash`/`untrash`/`attach` ditambah irisannya), `appCaps = { createProject, dashboard, dev }`.
- **Constraints/Ownership:** UI hanya membaca `can`/`appCaps` dari server; `tests/no-role-branching.test.ts` memindai `app/routes/app/**` dan `app/components/{ui,pm,projects,tasks}/**` untuk pembandingan `role ===`/`appRole ===` kecuali daftar putih peta tampilan murni (`ROLE_SHORT`, `BADGE_COLOR`).
- **Acceptance:** `can` tiap persona×keadaan = hasil `canX` langsung; setiap `DenyCode` ada di `PM_ERRORS`/`DENY_UI` (paritas, M8); no-role-branching merah pada cuplikan buruk dan hijau pada repo.
- **Commit:** `feat(access): add capability builder and parity tests`

#### S0B-18 · Kerangka API `/api/app` · K · S0.b · dep: S0B-11, G-A1 · M (1,5) · 🔥
- **Target:** `server/api-error.ts` (+≈6 baris `unauthorizedResponse`), `server/api/app-context.ts` (*baru*, ≤90), `server/api/app-common.ts` (*baru*, ≤80), `server/api/app.ts` (36 → ≤60), plugin kosong ber-label stub: `app-profile.ts`, `app-projects.ts`, `app-projects.members.ts`, `app-tasks.ts`, `app-tasks.workflow.ts`, `app-tasks.detail.ts` (*baru*, ≤150), `tests/app-gate.test.ts`, `tests/api/app-context.test.ts`, `tests/api/app-stubs.test.ts` (*baru*), `tests/api/api-errors.test.ts` (+1 kasus).
- **Change:** D5: `appContext = new Elysia({ name: 'app-context' })` dengan `derive({ as:'scoped' })` → `resolveActor`; anonim ⇒ **`throw unauthorizedResponse(request)`** (Response JSON `{error,code:'UNAUTHORIZED',status:401,requestId,method,path}`; jangan pernah `throw status()` di `derive`); `onBeforeHandle({as:'scoped'})`: `assertAccountApproved(actor)` ⇒ 403 `ACCOUNT_PENDING|ACCOUNT_REJECTED` (M18) lalu pembatas tulis per pengguna (R04 §3.10; angka dari `limits.ts`). `app.ts`: `.use(appContext)` **pertama**, lalu keenam plugin, `/whoami`, avatar; hapus 3 cast `actor as NonNullable`. Tiap plugin = `new Elysia({ prefix })` kosong dengan komentar `// STUB(S1|S2): diisi irisan <nama>; hapus dari tes app-stubs saat terisi`. App `/api/app` tetap di bawah urutan hook `index.ts` (tidak diubah, M31).
- **Constraints/Ownership:** berkas bersama milik L-C (X3 §2d); `server/api/index.ts`, `server/auth.ts`, `server/guard.ts` **tidak disentuh** (L-A); ≤10 rute per instance Elysia; tanpa Drizzle di `app-*.ts` (tes pemindai di `app-stubs.test.ts`).
- **Acceptance:** `app-gate.test.ts`: (a) spike 1 jam — Elysia uji dengan `appContext` + rute POST ber-`t.Object` ⇒ anonim body salah = **401 bukan 422**, pengguna sah body salah = 422 seragam; (b) sapuan `app.routes`: tiap `/api/app/**` dipanggil anonim ⇒ 401; `app-context.test.ts`: pending ⇒ `ACCOUNT_PENDING`, rejected ⇒ `ACCOUNT_REJECTED`, approved lolos, bentuk galat `{error,code,status,requestId}`; `tests/api/app.test.ts` (38 baris) tetap hijau; 🔥 smoke hijau.
- **Commit:** `feat(api): add app context plugin with 401 gate and stub modules`

#### S0B-19 · Pemetaan scope kunci API (`PM_KEY_DENY`) · K · S0.b · dep: S0B-18, G-A2 · M (1) · 🔥
- **Target:** `server/api-keys/scopes.pm.ts` (*baru*, ≤50), `server/api-keys/scopes.ts` (+3 baris sebelum baris `/api/app/`), `tests/api-keys/scopes.test.ts` (67 → ≤90), `tests/api-keys/scopes.pm.test.ts` (*baru*).
- **Change:** D10: `PM_KEY_DENY` = `DELETE /api/app/projects/*`, `* /api/app/projects/*/members*`, `PATCH /api/app/profile`, `* /api/app/avatar`; `isPmKeyDenied(method, path)` dipanggil `requiredScope` sebelum cabang `app:read|app:write` ⇒ `null`. `PM_DENY_OWNER` memetakan tiap pola ke plugin pemiliknya.
- **Constraints/Ownership:** `scopes.ts` & `scopes.test.ts` milik L-A pada S0 ⇒ edit **hanya setelah M1 (S0.a) ter-merge**, tambah blok `describe` tersendiri (tanpa mengubah baris L-A); irisan S1/S2 menambah baris tolaknya sendiri + assertion di tes modulnya. 📝 `Changed`: kunci API tidak lagi bisa mengubah foto/profil.
- **Acceptance:** `scopes.test.ts` +8 assertion (4 baris tolak ⇒ `null`; `POST /api/app/tasks` ⇒ `app:write`, `PATCH /api/app/tasks/1` ⇒ `app:write`; `GET /api/app/projects` ⇒ `app:read`, `GET /api/app/tasks` ⇒ `app:read`); `scopes.pm.test.ts`: sapuan tiap rute `api.routes` berprefiks `/api/app/` punya `requiredScope` bukan `undefined`, dan tiap pola `PM_KEY_DENY` **wajib** cocok ≥1 rute nyata bila plugin pemiliknya sudah punya rute (selama masih stub: dilewati dengan pesan eksplisit, bukan hijau diam-diam); rute ditolak hilang dari OpenAPI kunci.
- **Commit:** `feat(api-keys): deny destructive PM routes for API keys`

### Lajur A — tes infrastruktur, tema, komponen, stub rute, seed

#### S0B-20 · `app-routes.test.ts` rekursif (D8a) · A · S0.b · dep: G0 · S (0,25)
- **Target:** `tests/app-routes.test.ts` (48 → ≤110).
- **Change:** `flatten()` dipakai di semua pernyataan: (1) setiap berkas `routes/app/**` selain layout adalah **keturunan** layout `/app` (bukan hanya anak langsung); (2) setiap berkas dengan `default export` dan setiap layout bersarang (`routes/app/project/layout.tsx`) wajib memanggil `requireUser|requireAnyRole|requireRole(request` di loader; (3) fungsi `unguardedFiles(entries)` diekspor lokal agar dua kasus negatif bisa diuji.
- **Constraints/Ownership:** **commit pertama S0.b yang menyentuh rute**, sebelum stub bersarang apa pun didaftarkan di `app/routes.ts` (S0B-29 bergantung padanya). Milik L-C.
- **Acceptance:** tes lama tetap hijau; kasus negatif: rute bersarang tanpa guard ⇒ `unguardedFiles` tidak kosong (merah pada konfigurasi sintetis); anak-dari-anak yang berguard ⇒ hijau.
- **Commit:** `test(app): make app route guard contract recursive`

#### S0B-21 · `tests/support` dasar (D8c) · A · S0.b · dep: S0B-20, G-A2 · M (1)
- **Target:** `tests/support/{cleanup,auth,api,clock,factory.user}.ts` (*baru*; folder baru, ≤150 tiap berkas), `tests/support.test.ts` (*baru*).
- **Change:** `createCleaner()` (`track(kind,id)`, `flushTest`, `flushAll`; hapus per id berurutan taskPart→task→project→invitation→audit→user, galat dikumpulkan jadi `AggregateError`, tanpa `.catch(() => {})`); **`installAuthSpies()`** → `{ as(user|null) }` (`spyOn(auth.api,'getSession')` + `spyOn(rolesMod,'resolveUserRole')` di `beforeAll`, dipulihkan di `afterAll`); `call(method,path,body?,headers?)` lewat `api.handle`, `expectApiError(res,status,code)`, `waitForAudit(where)` (polling ≤1 dtk, bukan `Bun.sleep`); `ATLAS_NOW = 2026-10-07T03:00:00Z`, `freezeAt(d)`; `f.user({ role, status, banned })` dengan id `${TAG}-${uuid8}`.
- **Constraints/Ownership:** tanpa `DELETE FROM` global; tanpa `mock.module`; tanpa pustaka factory pihak ketiga (aturan dependensi); ≤400 baris/berkas tes. Pemilik L-C (R10/X3).
- **Acceptance:** `support.test.ts`: urutan hapus + `AggregateError`; setelah `afterAll` `auth.api.getSession` kembali ke fungsi asli; `expectApiError` memeriksa bentuk `{error,code,status,requestId}`; `freezeAt` dipulihkan `afterEach`.
- **Commit:** `test(support): add cleaner, auth spies and api helpers`

#### S0B-22 · Konversi `mock.module(guard)` batch 1 (D8d) · A · S0.b · dep: S0B-21 · M (1,5)
- **Target:** `tests/api/{logs,analytics-ratelimits,analytics-logins,analytics-visits,file-health,analytics,sessions}.test.ts` (7 berkas, sudah ada), `tests/test-hygiene.test.ts` (ratchet 13 → 6; milik S0.0, hanya ubah konstanta).
- **Change:** ganti `mock.module('../../server/guard', …)` dengan `installAuthSpies()` + `as({role})`; guard asli (`requireRole`/`resolveActor`) berjalan; tidak mengubah kode produksi.
- **Constraints/Ownership:** jumlah kasus per berkas tidak berkurang (catat `bun test <berkas>` sebelum/sesudah di pesan commit); tidak menyentuh berkas non-guard; pola acuan `tests/api/posts.test.ts`, `me-api-keys.test.ts`.
- **Acceptance:** tiap berkas lulus sendiri **dan** dalam run penuh; `bun test tests/api/audit.test.ts tests/api/app.test.ts` lulus pada kedua urutan (spike kebocoran 8b); `grep -rl "mock.module(.*guard" tests | wc -l` = 6.
- **Commit:** `test(api): replace guard mock.module with auth spies (batch 1)`

#### S0B-23 · Konversi batch 2 + ratchet ke 0 · A · S0.b · dep: S0B-22 · M (1,5)
- **Target:** `tests/api/{audit,ops,settings-ops,api-keys-api,api-keys-usage,settings}.test.ts` (6 berkas), `tests/test-hygiene.test.ts`.
- **Change:** sama seperti S0B-22; `api-keys-api.test.ts` (satu-satunya pola `requireRole`-only yang semula diizinkan CLAUDE.md) ikut dikonversi; ratchet diturunkan ke **0** dan daftar putih dikosongkan.
- **Constraints/Ownership:** **wajib selesai sebelum `contract-v1`** (X1 D8d); sesudahnya `mock.module` dilarang di tes baru.
- **Acceptance:** `grep -rl "mock.module" tests | wc -l` = 0 untuk guard; `bun run test` hijau pada urutan normal dan `bun test --randomize` bila tersedia (atau urutan dibalik manual dua berkas pembocor lama).
- **Commit:** `test(api): replace guard mock.module with auth spies (batch 2)`

#### S0B-24 · Tema dan token R11 (D2) · A · S0.b · dep: G0 · M (1)
- **Target:** `app/lib/theme.ts` (8 → ≤100), `app/lib/theme-palette.ts`, `theme-components.ts`, `theme-vars.ts` (*baru*, ≤100 tiap berkas), `app/lib/theme.css` (*baru*), `tests/theme-scale.test.ts`, `tests/theme-contrast.test.ts` (*baru*).
- **Change:** `buildTheme(scale)` → `createTheme({ scale, breakpoints: default × scale (em), primaryColor:'blue', primaryShade:{light:8,dark:8}, colors:{ok,warn,danger}, respectReducedMotion:true, components:{ Button/TextInput/Select/…: size 'lg', ActionIcon 'xl', Checkbox/Radio/Switch 'lg', Badge vars (fz 16, tinggi 32) } })`; palet tuple `ok/warn/danger` dan `cssVariablesResolver` (teks sekunder gray-7, placeholder `#6b7280`) persis R11 §3.2; ring fokus 3 px blue-8 offset 2 px (`theme.css`). Konstanta skala `TEXT_SCALE = { normal: 1, besar: 1.25, sangat_besar: 1.5 }` hidup di `server/text-size.ts` (S0B-25; murni).
- **Constraints/Ownership:** mekanisme tunggal `theme.scale` (tanpa `--mantine-scale` manual, tanpa `html{font-size}`/`zoom`); ikon baru `size="1.25em"` (D2 butir 4, bukan `1.1em` R05); `/dashboard` & `/dev` tidak diaudit. Pemilik mekanisme: S0.b → **L4 sesudah tag** (konflik daftar X3 vs X1 D2, §7 K5).
- **Acceptance:** `theme-scale.test.ts`: `buildTheme(1.25).breakpoints.sm = '60em'`, `1.5 → '72em'`, skala 1 = bawaan Mantine, `scale` terisi; `theme-contrast.test.ts`: menghitung rasio WCAG untuk setiap pasangan di R11 §3.2.3 (teks ≥4,5; non-teks ≥3); spike R11 (4 butir *belum terverifikasi*) dicatat hasilnya di pesan commit: `--input-bd` tertimpa, `Badge vars` memakai `rem()`; SSR `renderToString` dengan `buildTheme(1.5)` memuat `--mantine-scale:1.5`.
- **Commit:** `feat(theme): add scalable accessible theme tokens`

#### S0B-25 · Ukuran teks di root loader dan cookie `mk-text-size` · A · S0.b · dep: S0B-24, G-A2 · S (0,75) · 🔥
- **Target:** `server/text-size.ts` (*baru*, murni ≤60), `server/text-size.loader.ts` (*baru*, server-only ≤60), `app/root.tsx` (115 → ≤135), `scripts/smoke-server.checks.ts` (+1 entri), `tests/text-size.test.ts`, `tests/text-size-ssr.test.ts` (*baru*).
- **Change:** `TEXT_SIZE_COOKIE = 'mk-text-size'`, `TEXT_SCALE`, `getTextSize(request)` (nilai tak dikenal ⇒ `normal`), `textSizeCookie(size)` (`Path=/; Max-Age=31536000; SameSite=Lax`); `resolveTextSize(request)`: cookie, atau bila kosong dan ada cookie sesi → `profile.text_size`. `root.tsx`: loader menambah `textSize`, `<html lang="id">`, `MantineProvider theme={buildTheme(TEXT_SCALE[textSize])}` (di-`useMemo`). Endpoint penulis cookie (`PATCH /api/app/profile`) = S1.
- **Constraints/Ownership:** `root.tsx` ditulis S0.b lalu milik L4; cookie bukan rahasia; tidak memanggil DB bila tidak ada cookie sesi.
- **Acceptance:** `text-size.test.ts`: parse/serialisasi + 3 nilai + nilai liar; `text-size-ssr.test.ts`: render root dengan `Cookie: mk-text-size=sangat_besar` ⇒ HTML memuat `--mantine-scale:1.5` dan `lang="id"`; entri `SMOKE_CHECKS` baru (`GET /login` dengan cookie `besar` memuat `--mantine-scale:1.25`; nama unik, path absolut) lulus `tests/smoke-server.test.ts`; 🔥 hijau.
- **Commit:** `feat(root): apply per-user text scale from cookie on server render`

#### S0B-26 · Komponen dasar T1 · A · S0.b · dep: S0B-24 · M (1)
- **Target:** `app/components/ui/{PageContainer,PageHeader,EmptyState,DateText}.tsx`, `ui/confirmAction.ts`, `ui/notify.ts`, `app/lib/pm-labels.ts` (*semua baru*, ≤200), `tests/ui-labels.test.ts`, `tests/ui-components.test.tsx`.
- **Change:** R05 §3.4 #1-#7: `PageContainer` (`wide|narrow`), `PageHeader` (`Group wrap="wrap"`, `back?`), `EmptyState` (`icon,title,description,action,filtered,onReset`), `confirmAction({title,body,confirmLabel,danger,onConfirm})` di atas `modals.openConfirmModal` (label batal "Batal"), `notify.success|error|undo` (5/8/`UNDO_WINDOW_SECONDS` detik), `DateText` (`date|datetime|relative|due`, memakai `useTimeFormat`), `pm-labels.ts`: label+ikon+warna-token untuk status tugas/proyek, prioritas, kondisi, `TaskLabel` (glosarium R11 §3.4; kondisi "Lancar/Perlu perhatian/Terlambat", M13). Semua ikon `size="1.25em"`, tanpa `size={16}`.
- **Constraints/Ownership:** pemilik L-C (T1); tiap komponen ≤200; tanpa pembandingan role; teks UI Indonesia dari konstanta.
- **Acceptance:** `ui-labels.test.ts`: setiap nilai `TASK_STATUSES`, `PROJECT_STATUSES`, `PROJECT_PRIORITIES`, `PROJECT_CONDITIONS`, `TaskLabel` punya label + ikon dan **tidak ada dua status berbagi ikon**; `ui-components.test.tsx` (`renderToString`): `EmptyState` memuat judul+ikon, `PageHeader` memuat `wrap`, `DateText` mode `due` untuk tenggat hari ini; pemindai: `wrap="nowrap"` tidak ada di `PageHeader`.
- **Commit:** `feat(ui): add page layout, empty state and confirm helpers`

#### S0B-27 · Komponen domain T2 · A · S0.b · dep: S0B-26, S0B-08 · M (1)
- **Target:** `app/components/pm/{StatusBadge,PriorityBadge,ConditionPill,TaskLabelChip,ProgressBar}.tsx`, `app/components/ui/MemberAvatar.tsx` (memuat `AvatarStack`), `tests/pm-badges.test.tsx` (*baru*).
- **Change:** R05 §3.4 #8, #13-#17 dengan penamaan kanonik: `ConditionPill condition: 'on_track'|'at_risk'|'off_track'`, `TaskLabelChip label: TaskLabel` (menggantikan `ScheduleLabel`; `'today'` adalah `ScheduleGroup`, bukan label, M13), `ProgressBar { done,total,timePct? }` (null ⇒ "Belum ada tugas"). Selalu ikon + teks (tidak pernah warna saja).
- **Constraints/Ownership:** `TaskRow/TaskCard/NextStepButton` bukan di sini (dimiliki L3, `components/tasks/`).
- **Acceptance:** `pm-badges.test.tsx`: untuk setiap nilai enum, `renderToString` memuat `<svg` **dan** label teks; `ProgressBar` 0/0 ⇒ "Belum ada tugas", 1/6 ⇒ "17%".
- **Commit:** `feat(ui): add status, priority and condition badges`

#### S0B-28 · Komponen tabel, filter, modal alasan, hook T3-T4 · A · S0.b · dep: S0B-26, S0B-27 · M (1,5)
- **Target:** `app/components/ui/{ResponsiveTable,ViewToggle,FilterPopover,ReasonModal,BackLink}.tsx`, `app/lib/{http,use-url-filters,use-api-mutation,use-unsaved-guard}.ts` (*baru*), `tests/{http,url-filters,ui-responsive-table}.test.ts(x)`, `tests/mobile-baseline.test.ts` (*baru*).
- **Change:** `ResponsiveTable` (`columns[].hideBelow`, `rows`, `renderCard`; desktop `Box overflowX:auto visibleFrom="sm"`, kartu `hiddenFrom="sm"`), `ViewToggle`, `FilterPopover`, `openReasonModal({title,quick,categories,requireNote,confirmLabel,onSubmit})`, `BackLink`; `http.ts`: `ApiError {status,code,requestId}`, parsing galat seragam, 401 ⇒ arahkan ke `/login?notice=session`; `useUrlFilters` (parse/serialisasi generik; penerjemah domain Indonesia→API ditulis S1/S2 di `app/lib/<domain>-filters.ts`, M16), `useApiMutation` (loading + notifikasi sukses/gagal; pesan galat actionable), `useUnsavedGuard`.
- **Constraints/Ownership:** pemilik L-C; tanpa dependensi baru; hanya `@mantine/core|hooks|modals|notifications`.
- **Acceptance:** `http.test.ts`: `{error,code,status,requestId}` ⇒ `ApiError`; 422 ⇒ `issues`; `ui-responsive-table.test.tsx`: SSR memuat tabel desktop **dan** daftar kartu dengan kelas `visibleFrom`/`hiddenFrom`; `mobile-baseline.test.ts`: pemindai `app/components/{ui,pm}` & `app/routes/app` tidak memuat `<Burger … pos="fixed"` maupun `wrap="nowrap"` pada grup berisi `Button`.
- **Commit:** `feat(ui): add responsive table, reason modal and api hooks`

#### S0B-29 · Stub rute `/app/*`, NAV, layout · A · S0.b · dep: S0B-20, S0B-26, G-A1 · M (1,5) · 🔥 📝
- **Target:** `app/routes.ts` (34 baris; hanya blok layout `/app`), `app/routes/app/layout.tsx` (88 → ≤120), `app/components/AppFrame.tsx` (peta `ROLE_SHORT` 4 role), stub *baru*: `app/routes/app/{projects,project-new,tasks,task-new,task-detail,settings}.tsx`, `app/routes/app/project/{layout,summary,tasks,members,settings}.tsx`; ubah `app/routes/app/home.tsx`; `tests/app-nav.test.ts`, `tests/app-stubs.test.ts` (*baru*).
- **Change:** X1 D4: `route('app', home)`, `app/projects`, `app/projects/new`, `app/projects/:projectId` (layout `project/layout.tsx` + `index(summary)` + `tasks`, `members`, `settings`), `app/tasks`, `app/tasks/new`, `app/tasks/:number`, `app/settings`; `profile` tetap. **12 berkas / 11 URL**; `phases` tidak ada (S5). Tiap stub: `meta()` `'… — Simple PM'`, loader `await requireUser(request)` (anak `project/*` memanggilnya sendiri), komponen `PageContainer`+`PageHeader`+`EmptyState` "Fitur ini sedang disiapkan", komentar `// STUB(S1|S2)` (dicatat di `app-stubs.test.ts`). `settings.tsx` S0.b = guard lalu `redirect('/profile')` (profil lama tetap dipakai sampai S1). `home.tsx`: keadaan kosong + dua tautan. `NAV` 4 item: Beranda `/app`, Proyek `/app/projects`, Tugas `/app/tasks`, Pengaturan `/app/settings` (ikon `FiHome|FiFolder|FiCheckSquare|FiSettings`, `description` satu kalimat); hapus `consoleLabel="App"`; `BADGE_COLOR`/`ROLE_SHORT`: `member` "Anggota", `project_manager` "PM", `admin`, `super-admin`.
- **Constraints/Ownership:** `routes.ts`/`layout.tsx` milik L-C; **setelah tag tidak diubah** kecuali membuka NAV/rute irisan baru lewat integrator (X3 §2d); `:number` non-digit ⇒ 404 menjadi tugas S2; tanpa `stage`/`NAV_ENABLED_STAGES` (§7 K5); Beranda penuh = S3.
- **Acceptance:** `app-routes.test.ts` (S0B-20) hijau dengan 12 berkas; `app-nav.test.ts`: tepat 4 item, tiap `NAV[].to` terdaftar di `routes.ts`, `isNavActive` benar untuk `/app/projects/abc/tasks`; `app-stubs.test.ts`: daftar stub = berkas bertanda `STUB`; `bun run build` sukses; 🔥; CHANGELOG `Changed`: menu aplikasi Beranda/Proyek/Tugas/Pengaturan.
- **Commit:** `feat(app): register project and task route stubs with app navigation`

#### S0B-30 · Factory proyek/tugas, data Atlas, skrip seed · A · S0.b · dep: S0B-06, S0B-09, S0B-21 · M (1,5)
- **Target:** `tests/support/{factory.project,factory.task,atlas}.ts` (*baru*), `server/seed/atlas.data.ts`, `server/seed/atlas.insert.ts` (*baru*; folder `server/seed/` baru), `scripts/seed-dev.ts` (*baru*), `tests/atlas.golden.test.ts`, `tests/seed-guard.test.ts` (*baru*).
- **Change:** `f.project({ lead, members, status, startDate, dueDate })`, `f.task({...})`, `f.tasks(project, n)` (INSERT multi-baris, potongan 500); `seedAtlas(f, { now })` → `AtlasScenario` memakai data murni `atlas.data.ts` (tanggal **relatif** ke hari ini; hari acuan Rabu 7 Okt 2026): proyek Atlas + Portal Klien (tugas #9 milik Sinar); tugas Atlas **6 non-batal**: #8 selesai, #12 (Tinggi, terlambat), #14 (tenggat hari ini), #15, #16, #17 (menunggu diperiksa). `scripts/seed-dev.ts atlas|reset`: menolak `NODE_ENV=production` atau tanpa `SEED_ALLOW=1`, id berawalan `seed-` (bukan `seed_`, M22), sandi dari `SEED_PASSWORD`/acak (dicetak sekali), impor `db` dinamis. `load` (1.000 tugas) ditambah S2. Skrip npm `seed:atlas` = permintaan ke integrator (`package.json`).
- **Constraints/Ownership:** `server/seed/` dikecualikan File Health; `scripts/seed-dev.ts` **tidak** masuk biner (bukan subcommand CLI); pemilik L-C.
- **Acceptance:** `atlas.golden.test.ts` (DB test, `freezeAt(ATLAS_NOW)`): `progress` = **17** (bukan 70), waktu berjalan = **60**, aktif 5, terlambat 1 (#12; #14 bukan), kondisi `at_risk` alasan `IMPORTANT_OVERDUE`, `taskLabels` Nico ⇒ #17 `awaiting_my_review`; tes murni atas `atlas.data.ts` (tanpa DB) menegaskan 6 non-batal/1 selesai; `seed-guard.test.ts`: menolak tanpa `SEED_ALLOW=1`/di production, `reset` hanya menghapus `seed-…`.
- **Commit:** `test(seed): add project and task factories with Atlas scenario`

### Lintas lajur

#### S0B-31 · Koreksi `CLAUDE.md` (D9) — tugas terpisah · silang · S0.b · dep: S0B-18, 19, 25, 29 · S (0,5)
- **Target:** `CLAUDE.md` (proyek; 351 baris, hanya baris yang disebut), `tests/claude-md.test.ts` (*baru*, ≤40).
- **Change:** 8 dari 12 koreksi D9 menjadi tugas S0.b — #2 (`home.tsx` bukan lagi panduan), #4 (UX §1: tiga tingkat Urungkan/dialog/ketik nama; **tidak lagi bersyarat**, X1-Q1 dijawab "ya"; "S2 tidak memasang hapus tugas"), #5 (Button/Input `size="lg"`, ActionIcon `size="xl"` lewat `defaultProps`; `sm` bukan 44 px), #6 (`::timestamptz` untuk tabel baru + sesi UTC), #8a-c (gerbang 401 di `derive` & dilarang `throw status()`; berkas `app-<modul>[.<bagian>].ts`; `PM_KEY_DENY` + tes tiap rute), #9 ("23 pemeriksaan" ⇒ "lihat `scripts/smoke-server.checks.ts`"), #11 (ikon `size="1.25em"`, breakpoint terskala). Sisanya bukan tugas ini: **#1, #3 = S0.a**; **#7, #8d, #10 = S0.0**; **#12 = integrator S8**.
- **Constraints/Ownership:** hanya baris terkait; tanpa penulisan ulang; irisan S1/S2 tidak menyunting `CLAUDE.md`.
- **Acceptance:** `tests/claude-md.test.ts`: tidak memuat lagi frasa `44px touch area`; memuat `unauthorizedResponse`/"derive" untuk gerbang 401, `PM_KEY_DENY`, `timestamptz`, `mk-text-size`; delapan butir diperiksa satu per satu di pesan commit.
- **Commit:** `docs(claude): correct UX, touch-target, timestamp and API conventions`

#### S0B-32 · README bagian kontrak · silang · S0.b · dep: S0B-19, S0B-29 · S (0,5)
- **Target:** `README.md` (hanya bagian API key dan daftar menu `/app` bila ada).
- **Change:** tambah rute yang ditolak kunci API (`PM_KEY_DENY`) dan catatan "`PATCH /api/app/profile` dan `/api/app/avatar` kini 403 untuk kunci"; menu `/app` bila README mendaftarnya. Heading kosong per modul **tidak** ditambahkan (README publik; §7 K10).
- **Constraints/Ownership:** bagian editorial/badge milik user — tidak disentuh; tanpa rahasia/hostname.
- **Acceptance:** `tests/readme-endpoint.test.ts` hijau; diff README hanya pada bagian itu.
- **Commit:** `docs(readme): document API key route restrictions and app menu`

#### S0B-33 · Gerbang `contract-v1`: verifikasi, catatan keputusan, tag lokal · silang · S0.b · dep: semua · M (1,5) · 🔥 🧊
- **Target:** `tests/contract-v1.test.ts` (*baru*, ≤150), `docs/decisions/0001-contract-v1.md` (*baru*; folder `docs/decisions/` baru).
- **Change:** pelaksana = integrator + peninjau. (1) Jalankan seluruh daftar §5 dan tempel hasilnya; (2) `tests/contract-v1.test.ts`: daftar berkas kontrak ada, nama ekspor publik `server/access/*`, `server/metrics/*`, `server/pm/{enums,errors,limits}.ts` sama dengan snapshot, `app/routes.ts` memuat 11 URL, `NAV` 4 item — perubahan sesudah tag harus sengaja mengubah snapshot; (3) `docs/decisions/0001-contract-v1.md`: apa yang beku, pemilik, protokol perubahan (§5), kontradiksi §7 beserta keputusannya; (4) tag **lokal** `contract-v1` pada hasil merge; **push tag hanya atas perintah user**.
- **Constraints/Ownership:** tidak memperbaiki apa pun yang gagal di sini — kembalikan ke tugas pemiliknya; merge ke cabang integrasi hanya dengan persetujuan user.
- **Acceptance:** semua butir §5 hijau; peninjau (dan peninjau kedua bila sudah bernama) menandatangani; tag `contract-v1` ada lokal.
- **Commit:** `chore(contract): record contract-v1 freeze and public surface snapshot`

## 4. Lajur paralel dan titik sinkron
### 4.1 Urutan kerja per lajur (kolom dep tetap menentukan; urutan ini meminimalkan menunggu)
| Lajur | Urutan yang disarankan | Total | Menunggu |
|---|---|---|---|
| **D** | 01 → 08 → 09 → 02 ∥ 04 → *(SP0)* 03 → 05 → 06 → 07 → 10 | 9,5 hari | 08-09 mengisi waktu sebelum SP0 dan G-Q5; 10 menunggu S0B-12 (lajur K) |
| **K** | 11 → *(SP0a)* 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 | 11,5 hari | 12 menunggu role 4 nilai; 19 menunggu SP0 + merge M1 |
| **A** | 20 → 24 → *(SP0)* 21 → 22 → 23 → 25 → 26 → 27 → 28 → 29 → 30 | 13,5 hari | 21/25 menunggu 0014; 30 menunggu 0016 + S0B-09 |
| silang | 31 → 32 → 33 setelah ketiga lajur ter-merge | 2,5 hari | persetujuan user atas tiap merge |

### 4.2 Titik sinkron
| SP | Kejadian | Pemilik | Membuka |
|---|---|---|---|
| **SP1a** | S0B-01 ter-merge dini (enum + `schema.columns`) | D | S0.a mengimpor `TEXT_SIZES`/`APPROVAL_STATUSES`; lajur K mulai S0B-11 |
| **SP0a** | S0.a merge pertama: `Role` 4 nilai + `assertAccountApproved` | L-A | S0B-12 ke atas, S0B-18, S0B-29 (peta peran) |
| **SP0** | S0.a merge 0014 (+ `ROLE_RANK`) | L-A | S0B-03 (0015), S0B-21, S0B-25, S0B-19 |
| **SY-1** | S0B-13 (`user.policy`, `account-status.rules`) ter-merge | K | L-A boleh memakai/mengganti logika izin pengguna (K6) |
| **SY-2** | S0B-20 (guard rekursif) ter-merge | A | S0B-29 boleh mendaftarkan rute bersarang |
| **SY-3** | S0B-04 (introspect) ter-merge | D | S0B-06 (0016) boleh di-merge |
| **SY-4** | S0B-23 (ratchet 0) ter-merge | A | S0B-33 |
| **SP1 = `contract-v1`** | S0B-33 lulus + persetujuan user | integrator + peninjau | L1 (S1), L2 (S2 servis/API), L3 (UI S2 setelah SP2), L4 (profil/ukuran teks) |
Pelanggaran urutan yang paling mahal: dua `db:generate` bersamaan (yang kalah **digenerate ulang**, bukan di-merge, R14 §3.7); rute bersarang terdaftar sebelum S0B-20; konversi mock sesudah tag.

## 5. Kriteria `contract-v1` dan aturan perubahan sesudah beku
### 5.1 Kriteria terukur — semua harus hijau sebelum tag; S1/S2 tidak boleh dimulai sebelum itu
| # | Kriteria | Cara ukur | Ambang |
|---|---|---|---|
| 1 | Seluruh test | `bun run test` | 0 gagal, 0 `skip`/`todo` baru (`grep -rn "test.skip\|test.todo\|it.skip" tests` tidak bertambah) |
| 2 | Tipe dan lint | `bun run typecheck`; `bun run lint` | 0 error tanpa filter; 0 pelanggaran Biome |
| 3 | Migrasi | `bun run db:migrate` dan `DATABASE_URL=$DATABASE_URL_TEST bun run db:migrate` dua kali; `drizzle-kit generate` | tanpa galat; keluaran generate kosong ("no changes"); `tests/db/migrations-{guard,idempotent}.test.ts` hijau; `.down.sql` 0015/0016 ada |
| 4 | Smoke | `smoke:prod`, `smoke:binary`, `smoke:coldboot` | exit 0 ketiganya (`SMOKE_CHECKS` + entri cookie `mk-text-size`) |
| 5 | Kasus izin/rumus R03 | `grep -rhoE "\b(C\|F)[0-9]{2}\b" tests/access tests/metrics \| sort -u \| wc -l` | **53** (R03 66 − 13 ditunda: C20, C21, C23, C29, C30-C35, F17, F18, F19) + matriks eksaustif 8 persona hijau |
| 6 | Tes tidak bocor | `grep -rl "mock.module" tests` untuk guard; `tests/test-hygiene.test.ts` | 0 berkas; ratchet 0; spike dua urutan (`audit`↔`app`) lulus |
| 7 | Guard halaman | `tests/app-routes.test.ts` (rekursif, 2 kasus negatif), `tests/app-nav.test.ts`, `tests/app-stubs.test.ts` | hijau pada 12 berkas rute; NAV tepat 4 item; setiap `STUB` terdaftar |
| 8 | Gerbang API | `tests/app-gate.test.ts`, `tests/api/app-context.test.ts` | anonim ke setiap `/api/app/**` = 401 (juga POST body salah); pending/rejected = 403 `ACCOUNT_PENDING/REJECTED` |
| 9 | Scope kunci API | `tests/api-keys/scopes.test.ts`, `scopes.pm.test.ts` | 4 baris `PM_KEY_DENY` ⇒ `null`; sapuan rute↔scope tanpa `undefined`; pola hidup wajib cocok ≥1 rute |
| 10 | Skema | `tests/db/pm-schema-contract.test.ts`, `pm-indexes`, `pm-enum-check`, `timezone-mixing`, `session-timezone` | snapshot 8 tabel PM cocok; `SHOW TimeZone`=UTC; `/dev/db-schema` memuat tabel baru |
| 11 | Angka emas Atlas | `tests/atlas.golden.test.ts` | progres **17**, waktu berjalan **60**, aktif 5, terlambat 1, kondisi `at_risk` (`IMPORTANT_OVERDUE` 1); tidak ada angka 70 di tes/seed |
| 12 | Kemurnian modul | `tests/access/purity.test.ts`, `tests/client-server-imports.test.ts`, `tests/no-role-branching.test.ts` | hijau; tidak ada `index.ts`/impor direktori |
| 13 | Ukuran berkas | File Health (`tests/file-health/*`) atas berkas yang diubah | 0 pelanggaran batas §8; tak ada berkas baru >80% batas tanpa alasan |
| 14 | Permukaan publik | `tests/contract-v1.test.ts` | snapshot ekspor `access/metrics/pm` + 11 URL + NAV 4 cocok |
| 15 | Dokumen | `tests/claude-md.test.ts`, `tests/readme-endpoint.test.ts`; `CHANGELOG.md` | 8 koreksi D9 terpasang; README lulus pemindai rahasia; `[Unreleased]` memuat butir S0.b (menu, kunci API) |
| 16 | Tinjauan | catatan peninjau di PR tiap lajur | peninjau manusia menyetujui; peninjau kedua S0.b menyetujui **atau** user menyatakan menerima tanpa peninjau kedua; 0 komentar terbuka |
| 17 | Kontradiksi | §7 | K1-K3 sudah diakui user (atau default dicatat di `docs/decisions/0001-contract-v1.md`); G-Q5 terjawab |
| 18 | Utang teknis | `grep -rn "TODO\|FIXME" <berkas diubah>`; `STUB(...)` | tiap TODO berkonteks; tiap stub tercatat di `app-stubs.test.ts`/`app-stubs` API; tidak ada kode mati |

### 5.2 Aturan perubahan sesudah beku (`contract-v1`)
| Objek | Aturan | Siapa/cara |
|---|---|---|
| Skema DB | **Expand-only**: tabel/kolom baru (nullable atau `DEFAULT`), tidak mengubah/menghapus yang ada; nomor migrasi berikut via baton (satu per waktu); snapshot `pm-schema-contract` diperbarui di commit yang sama | pemegang baton; PR kecil + peninjau |
| `server/access/*`, `server/metrics/*`, `server/pm/{enums,errors,limits}.ts` | Menambah fungsi/flag/kode: boleh oleh pemilik irisan lewat PR kecil + tes + snapshot `contract-v1.test.ts`. Mengubah tanda tangan atau perilaku yang ada: **Permintaan Perubahan Kontrak** tertulis ke L-C | PPK = isi PR: apa, kenapa, irisan terdampak, tes yang berubah |
| Berkas bersama (`app/routes.ts`, `layout.tsx` NAV, `server/api/app.ts`, `app-context.ts`, `app-common.ts`, `api-error.ts`) | Hanya L-C; membuka rute/menu irisan = 1-3 baris oleh **integrator** pada commit merge irisan itu | integrator |
| Nama kanonik (§6, X3 §2b) | Tidak dikembalikan ke ejaan lama; dokumen yang bertentangan dikoreksi pemiliknya | pemilik dokumen |
| Versi | Tambahan kompatibel ⇒ tag `contract-v1.N`; perubahan merusak ⇒ `contract-v2` hanya atas persetujuan user | integrator, tag lokal; push tag hanya atas perintah user |
| Larangan keras | `mock.module` baru; dua `db:generate` serentak; edit snapshot tanpa peninjau; irisan menyunting `CLAUDE.md` | tes dan peninjau |

## 6. Pemetaan M1..M32 → keputusan
> Tingkat dan teks M# dari `tinjauan/X3-konsistensi-kontrak.md §2b`. "S0.b" = tugas di sini; "bukan S0.b" = keputusan tetap berlaku tetapi dikerjakan irisan lain.
| M | Keputusan untuk S0.b | Tugas |
|---|---|---|
| M1 | Hanya 0014 (S0.a), **0015**, **0016**; tidak ada nomor ≥0017 dipesan; tabel event/notification tidak dibuat | 03, 06 |
| M2 | Tabel `project_member`; `Membership.joinedAt` ← `project_member.created_at` | 02, 10, 12 |
| M3 | `leadId: string\|null`, `createdBy: string\|null`; `null` ⇒ tak ada pemilik, Admin/Pengelola tetap boleh | 12, 14, 16 |
| M4 | `server/{access,metrics,pm,project,task}/` tunggal; `loadMembership`/`toPrincipal` di `server/project/membership.query.ts`; `denyResponse` di `server/pm/respond.ts`; tidak ada `server/projects/` | 10, 11 |
| M5 | `user.approval_status`, `user_invitation` + `expires_at` — **bukan S0.b** (S0.a); S0.b hanya memakai `APPROVAL_STATUSES` | 01 |
| M6 | Prosedur R14: wrapper `db:generate`, dua tes jamak, `GUARDED_FROM=4`, `.down.sql` | 03, 06 (prasyarat G0) |
| M7 | Nama berkas skema R02: `schema.project|project-history|task|task-detail|columns.ts` | 01, 02, 05 |
| M8 | Satu sumber `server/pm/errors.ts`; ejaan R04 (`LEAD_MUST_BE_MANAGER`, `STATE_CONFLICT`); `DenyCode` ⊂ `PM_ERRORS`; `DENY_UI.http` 403\|404\|409\|410\|422; tes paritas | 11, 12, 17 |
| M9 | `canUncancelTask` + 1 baris matriks | 16 |
| M10 | `canChangeManagerSet(p, project, m, i)` — cek berhak dulu | 14 |
| M11 | `clampListScope(requested, allowed)`: Member `scope=all` ⇒ `mine` tanpa galat | 14 |
| M12 | `TEXT_SIZES = ['normal','besar','sangat_besar']`, cookie `mk-text-size` (D2), skala 1/1,25/1,5 | 01, 24, 25 |
| M13 | Kondisi `on_track\|at_risk\|off_track`; `TaskLabel` (`overdue,awaiting_my_review,blocked,stale,reopened`); 'today' = `ScheduleGroup` | 08, 09, 26, 27 |
| M14 | Glob kepemilikan L1/L3/L4 dipakai; **stub hanya rute S0-S2** (X1 D4 menang, §7 K5); `:number` halaman, `:ref` API | 29 |
| M15 | NAV: 4 item (D4); `stage`/`NAV_ENABLED_STAGES` tidak dipakai (§7 K5) | 29 |
| M16 | Penerjemah filter `app/lib/<domain>-filters.ts` ditulis S1/S2; hook generik `useUrlFilters` di sini; tugas = keyset, proyek = `limit+offset+total`; `:ref` = digit saja | 11, 28 |
| M17 | Katalog endpoint/halaman S0.a — **bukan S0.b**; S0.b hanya menyediakan `user.policy` | 13 |
| M18 | `assertAccountApproved` satu fungsi (S0.a); `app-context` memanggilnya; kode `ACCOUNT_PENDING`/`ACCOUNT_REJECTED`; `ACCOUNT_NOT_APPROVED` dihapus | 11, 18 |
| M19 | Tes mengikuti modul `tests/access|metrics|pm`; modul baru `account-status.rules.ts`; `dependency.rules.ts` ditunda (S4) | 12-16 |
| M20 | Skema R02 menang: tanpa UNIQUE `(project_id,position)`; nama tabel tunggal; indeks dari R02 §3.7 | 05, 07 |
| M21 | Matriks tugas 8 persona (PM bukan-anggota & Member bukan-anggota ikut) | 16 |
| M22 | Data murni `server/seed/atlas.data.ts` + `scripts/seed-dev.ts`; id `seed-`; bukan subcommand CLI | 30 |
| M23 | Penghitung query ≤6 & konstan (pintu S2) — **bukan S0.b**; S0.b menyediakan penghitung query di `tests/support` bila S0.0 belum | 21 (opsional) |
| M24 | `status?: 'draft'\|'active'` di `POST /projects` — **S1**; enum tersedia | 01 |
| M25 | Kebijakan memuat 12 transisi + `needsReview` dipaksa false (`TASK_REVIEW_UI_ENABLED=false`); endpoint review & tabel `task_review` ditunda (§7 K2) | 11, 15, 16 |
| M26 | Semua berkas fondasi API = L-C; `scopes.pm.ts` L-C; `scopes.ts` L-A | 18, 19 |
| M27 | Dipersempit arahan koordinator: 8 tabel PM, bukan 17 (§7 K1) | 02, 05 |
| M28 | Belum diputuskan user: `PROJECT_DELETE_UI_ENABLED` (default tersembunyi; §7 K3) | 11, 14 |
| M29 | Kunci `can{}` = nama fungsi tanpa `can`; `appCaps` + `dev`; peta tampilan murni di daftar putih | 17 |
| M30 | Pola pindai `server/api/app-*.ts` | 18 |
| M31 | `server/api/index.ts`, `auth.ts`, `guard.ts` tidak disentuh S0.b | 18 |
| M32 | Tiap lajur menulis butir CHANGELOG-nya (📝) di commit yang sama; `merge=union`; integrator hanya merapikan | 19, 29 |

## 7. Kontradiksi baru
> Kontradiksi yang ditemukan saat menyusun rencana ini dan **tidak dipecahkan diam-diam**; kolom default = yang dipakai tugas di atas (paling konservatif, tidak menutup pilihan).
| # | Kontradiksi | Default yang dipakai | Perlu |
|---|---|---|---|
| K1 | Arahan koordinator (hanya 9 tabel S1-S2) vs X1 D6 / X3 M27 (0015 = 7 tabel, 0016 = 10 tabel, "kontrak beku memuat semua") | 0015 = 3 tabel, 0016 = 5 tabel; tabel S3+ lewat 0017+ via baton; kolom dan CHECK `task` untuk S2 tetap lengkap; `task.phase_id` ditambah S5 | peninjau menyetujui; D6/M27 dikoreksi |
| K2 | X3 M25 (S2 membangun 9 endpoint kerja + penulisan `task_review`) vs tanpa tabel `task_review` | Kebijakan + `TASK_TRANSITIONS` lengkap & teruji; endpoint `request-review/approve/return` dan tabel menyusul di S4; `needs_review` selalu false. Bila S2 tetap mau 9 endpoint ⇒ migrasi `task_review` (expand-only) **sebelum** S2 mulai | perencana S2 |
| K3 | M28: hapus proyek (dialog, X1-Q1) tanpa halaman Sampah (S6) ⇒ proyek hilang tanpa jalur pulih | `PROJECT_DELETE_UI_ENABLED = false` (satu konstanta di `limits.ts`; endpoint S1 tetap soft delete); opsi: tarik `/app/trash` minimal + `canRestoreProject` ke S1 (±2-3 hari) | **user** |
| K4 | Pembulatan progres: R03 K20/F04 (`floor`, 66) vs X2 §2C (`round`, cap 99, Atlas 17) | X2 §2C; F04 diganti 2/3 ⇒ 67; R03 dikoreksi | dicatat |
| K5 | X1 D4 (stub hanya rute S0-S2, NAV 4 item) vs X3 M14/M15 (semua rute R05, NAV 8 dengan `stage`); X1 D2 (S0.b memiliki mekanisme tema/root) vs X3 §2d (`root.tsx`/`theme.ts` milik L4) | D4 dan D2 (keduanya masuk daftar KEPUTUSAN §4); `routes.ts`/NAV bertambah 1-3 baris per irisan oleh integrator; `root.tsx`/`theme.ts` ditulis S0.b lalu diserahkan ke L4 pada tag | dicatat |
| K6 | `user.policy`/`account-status.rules` milik L-C (M19) tetapi S0.a (merge lebih dulu) memakainya; `scopes.ts`/`scopes.test.ts` L-A (S0 saja) vs D10 yang menambah assertion | S0B-13 dijadwalkan tepat sesudah S0B-12 (SY-1); S0.a boleh sementara di `permissions.ts`; edit scope-test hanya sesudah M1 sebagai blok `describe` terpisah | L-A dan L-C |
| K7 | Q9 (menyamar memblokir aksi merusak) butuh `Principal.impersonating`; `Actor` tidak membawa `session.impersonatedBy` | Field ada, `toPrincipal` mengisi `false` sampai S0.a/`resolveActor` menyalurkannya; kebijakan diuji dengan `true`; S0B-33 mencatat bila belum tersambung | L-A |
| K8 | R03 §3.2 `server/access/index.ts` (re-export) vs tes `client-server-imports` yang menolak impor direktori/`export … from` | Tanpa `index.ts`; impor file eksplisit; tes diperketat | dicatat |
| K9 | Estimasi ±37 hari-orang AI dan ±12-14 hari kalender vs R10 §5 (16-22; 7-11) | 3 lajur; bila perlu pindahkan S0B-22/23 kembali ke S0.0 (sesuai X1 D8d) atau tambah pekerja ke-4 saat kuota token memungkinkan; tanggal tag mengikuti | **user** (jadwal) |
| K10 | X1 D9 / R14: heading README kosong per modul vs README dilayani publik | Tidak menambah heading kosong; bagian ditambah saat modul punya kontrak | dicatat |
| K11 | X1 D5 menulis 403 `ACCOUNT_NOT_APPROVED`; X3 M18 menetapkan `ACCOUNT_PENDING`/`ACCOUNT_REJECTED`; R03 C28 `LEAD_NOT_MANAGER` vs R04 `LEAD_MUST_BE_MANAGER` | M18 dan ejaan R04 (X3 lebih baru, nama kanonik) | dicatat |
| K12 | Ukuran ikon: R05 `1.1em` vs X1 D2 `1.25em`; cookie `pm-text-size` (R05) vs `mk-text-size` (D2) | D2 | dicatat |

## 8. Bukti yang belum diverifikasi
Rencana ini bergantung pada klaim runtime berikut yang **belum dijalankan** (tahap 2 read-only); tiap butir punya tugas yang memverifikasinya.
| # | Klaim | Sumber | Diverifikasi di |
|---|---|---|---|
| 1 | `derive` yang `throw Response` ⇒ 401 sebelum validasi body; `status()` di `derive` ⇒ 500 | R04 §2.2 probe (tidak diulang), X1 D5 | S0B-18 (spike 1 jam) |
| 2 | `pgClient(url, { connection: { TimeZone: 'UTC' } })` didukung | X1 D7 (ASUMSI) | S0B-01 |
| 3 | Wrapper `db-generate` membungkus CHECK/UNIQUE (bukan hanya FK) dan aman untuk identity; artefak S0.0 belum ada di repo (diperiksa 15 Okt) | X1 D6, R14 §3.1 | G0, S0B-03/06 |
| 4 | Kebocoran `mock.module(guard)` antar berkas bergantung urutan | X1 D8 (ASUMSI) | S0B-22 (dua urutan) |
| 5 | `RR` memberi prioritas rute statis `/app/projects/new` atas `:projectId` | R05 §3.1 (ASUMSI) | S0B-29 (`app-routes`/build) |
| 6 | Skala 1,25/1,5: lebar navbar, Modal, tinggi tombol, `Badge vars`, `--input-bd` tidak memotong teks pada 1024×768 dan 820×1180 | R11 §3.2.6, R05 §3.7 butir 7 | S0B-24 (spike 0,5 hari) |
| 7 | `TEXT_SCALE` 1/1,25/1,5 adalah ASUMSI sampai diuji 2-3 lansia | X1 D2, KEPUTUSAN Q14 | setelah S1 |
| 8 | `session.impersonatedBy` dapat dibaca dari `resolveActor` | X2 E1 (Q9) | S0.a / K7 |
| 9 | Drizzle 0.45.2: `.for('update')`, `generatedByDefaultAsIdentity({ name })` | R04 §3.6, R02 | S0B-05/06 |
| 10 | Migrasi 0000-0013 belum pernah berjalan di produksi sungguhan | KEPUTUSAN X1-Q5 | G-Q5 (tanya user) |
| 11 | Angka golden Atlas (17/60/5/1) dihitung dari X2 §2C, belum dijalankan terhadap kode | X2 §2C, R09 §2.3 | S0B-30 |
| 12 | `bun test --randomize` tersedia (urutan acak) | tidak diperiksa | S0B-23 (pakai urutan dibalik manual bila tidak) |
| 13 | Estimasi hari-orang AI dan kalender | ASUMSI (R10 §5 sebagai pembanding) | setelah lajur D selesai |
| 14 | Jumlah 13 berkas `mock.module(guard)` dan daftar namanya | `grep` 15 Okt (13), X1 D8 | S0B-22/23 |

## 9. Sumber
- **Wajib baca:** `rencana/_BRIEF-TAHAP2.md`, `KEPUTUSAN-MVP-INTI.md` (§1-§5), `riset/_BRIEF.md`, `tinjauan/_BRIEF-GELOMBANG2.md`.
- **Laporan:** `riset/R02 §3.1-3.2` (konvensi, tabel modul 02-03), `R03 §3.1-3.3, 3.6, 3.8` (arsitektur, tipe, rumus, 66 kasus), `R04 §3.1, 3.3, 3.5, 3.6, 5`, `R05 §3.1, 3.2, 3.4, 3.7`, `R09 §2.3, 3.4-3.6`, `R10 §3.3, 3.5, 5`, `R11 §3.2`; `tinjauan/X1 D2, D4-D10`, `X2 §2C-2E`, `X3 §2b, §2d`.
- **Kode yang dibaca (15 Okt 2026):** `drizzle.config.ts`, `server/db/{schema,index}.ts`, `server/api/app.ts`, `server/guard.ts`, `server/roles.ts`, `server/api-keys/scopes.ts:155-190`, `app/routes.ts`, `app/routes/app/layout.tsx:1-40`, `app/lib/theme.ts`, `app/root.tsx` (grep), `tests/app-routes.test.ts`, `tests/client-server-imports.test.ts`, `tests/preload.ts`, `package.json`; `ls` `scripts/`, `tests/`, `server/db/migrations`; `grep` `mock.module(.*guard` = 13.
