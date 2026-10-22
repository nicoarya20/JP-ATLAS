# R02 · Skema data MVP (ERD modul 01–03 + Events + Inbox → Drizzle)

> Tanggal: 15 Oktober 2026. Riset saja; tidak ada file kode yang diubah. Acuan: `tahapan-proyek/03-desain/erd/{user-profile,project,task,gabungan}.md` dan diskusi 00, 02, 03, 05, 06, 08, 09. Bila bentrok dengan fondasi kode, fondasi menang. Tanda **ASUMSI** = tidak diverifikasi.

## 1. Ringkasan eksekutif

1. MVP butuh **24 tabel baru + 1 tabel yang diubah (`user`)**; total 292 ribu baris / sekitar 118 MB pada 50 pengguna, 200 proyek, 20.000 tugas (estimasi, bagian 3.10). Volume ini kecil; tidak ada keputusan skema yang dipaksa oleh performa.
2. **Satu konvensi**: id `text` (`crypto.randomUUID()`), nama tabel **tunggal** (`project`, `task`), waktu `timestamptz` untuk tabel baru, tanggal murni `date` mode string, enum = **`text` + tuple `as const` + CHECK** (bukan `pgEnum`; fondasi tidak punya `pgEnum` sama sekali), tanpa `relations()` baru (fondasi tidak memakai query relasional).
3. **ERD memakai `NOT NULL` + FK ke user di banyak kolom** (`created_by`, `author_id`, `lead_id`, …). Itu tidak bisa disatukan dengan hapus akun (`/profile` dan `removeUser` meng-cascade user). Keputusan: semua FK "siapa yang melakukan" jadi **nullable + `ON DELETE SET NULL`**, dengan snapshot nama di 4 tabel riwayat. `CASCADE` hanya untuk milik pribadi (keanggotaan, profil, notifikasi). `RESTRICT` tidak dipakai; pencegahan dilakukan di service.
4. Ditunda dari ERD (sesuai keputusan fase 5): `project_story_drafts`, `project_templates`, `task_import_jobs`, hasil rapat AI, `leave_requests`, `workspace_settings` (+ kolom turunannya).
5. Delapan penyimpangan struktural lain (bagian 3.4), terpenting: `google_sub` dibuang (sudah ada di `account`), UNIQUE `(project_id, position)` diganti index biasa, `tasks.number` memakai kolom identity, lampiran memisahkan `url` dan `storage_key`.
6. **Soft delete**: `deleted_at/deleted_by` (+ `deleted_with_project_id`) di `project`, `task`, `event`; filter lewat satu helper `isLive()` + test penjaga; index parsial `WHERE deleted_at IS NULL`.
7. **Jebakan tooling**: `drizzle.config.ts` mendaftar file schema satu per satu (`drizzle.config.ts:7-12`); file baru yang lupa didaftarkan tidak ikut migrasi. Introspeksi `/dev/db-schema` menampilkan `[object Object]` untuk index ekspresi (`schema-introspect.ts:130`, terbukti lewat percobaan) dan salah menamai tipe `bigint/smallint/date`. Keduanya perlu patch kecil sebelum tabel baru masuk.
8. Migrasi: 5 file berurutan `0014`–`0018` (akun, proyek, tugas, event, notifikasi), masing-masing di-edit tangan jadi idempotent seperti `0011`–`0013`, dijaga test baru. Estimasi total **M: 7–10 hari-orang AI + 2 hari reviewer**.

## 2. Temuan (dengan bukti)

### 2.1 Konvensi fondasi yang ditemukan

| # | Temuan | Bukti | Akibat bagi desain |
|---|---|---|---|
| F1 | PK `text` dengan `$defaultFn(() => crypto.randomUUID())`; tidak ada default di DB | `server/db/schema.app.ts:6-9`, `schema.logs.ts:9-11`, `schema.keys.ts:60-62` | Insert mentah/backfill SQL wajib mengisi id (`gen_random_uuid()::text`, PG ≥13) |
| F2 | Nama tabel **tunggal** snake_case (`user`, `post`, `visit_log`, `app_setting`, `apikey`) | seluruh `schema.*.ts` | ERD berbentuk jamak (`projects`, `tasks`) harus diubah |
| F3 | Waktu: `timestamp` **tanpa zona** (`schema.auth.ts:12-17`, `schema.app.ts:12-17`); log memakai `.defaultNow()` (`schema.logs.ts:33`); `date` mode default string (`schema.keys.ts:94`) | — | Brief menetapkan `timestamptz` untuk tabel baru; kolom lama tetap. Fragmen SQL mentah memakai `::timestamptz` untuk tabel baru (aturan `::timestamp` di CLAUDE.md untuk tabel lama) |
| F4 | **Tidak ada `pgEnum` atau `check()`**; `role` adalah `text` (`schema.auth.ts:22`); `status` log `text` | grep `pgEnum\|check(` di `server app`: nol hasil | Enum ERD (15 jenis) harus dipetakan; lihat 3.1 |
| F5 | `relations()` hanya untuk `post`/`user` (`schema.app.ts:23-29`); **tidak ada** `db.query.*` atau `with:` di `server/` dan `app/` | grep nol hasil | Tabel baru tidak perlu `relations()`; query pakai join |
| F6 | Semua FK ke `user`: `cascade` untuk milik pribadi (`session`, `account`, `apikey`, `login_log`, `post`), `set null` untuk jejak (`visit_log`, `rate_limit_log`, `audit_log` + snapshot `actor_email`) | `schema.auth.ts`, `schema.logs.ts:17,96,114`, `schema.keys.ts` | Pola sudah ada: jejak = SET NULL + snapshot. Dipakai ulang |
| F7 | Hapus user melewati satu jalur DB: self-delete (`server/auth.ts:127`, klien `DangerZoneCard.tsx:25`) dan `removeUser` (`server/api/admin.ts:129-138`, hanya super-admin). Hook `user.delete.after` hanya menghapus avatar (`auth.ts:75-76`) | — | FK menentukan nasib data; `NOT NULL` + FK non-cascade akan membuat hapus akun gagal |
| F8 | Better Auth: `user.deleteUser.beforeDelete` dipanggil di jalur self-delete (`node_modules/better-auth/dist/api/routes/update-user.mjs:338,390`). `databaseHooks.user.delete.before` yang mengembalikan `false` hanya membuat delete diam-diam batal (`db/with-hooks.mjs:126-129`) | — | Pencegahan hapus akun (pengelola tunggal) butuh 2 titik: `beforeDelete` (melempar error) dan pra-cek di handler `admin.ts` sebelum baris 138 |
| F9 | `resolveActor` memakai `auth.api.getSession` tanpa `cookieCache`/`additionalFields` (grep `server/auth.ts` kosong) | `server/guard.ts:67-95` | Kolom `approval_status` di `user` harus dideklarasikan sebagai `additionalFields` agar ikut `session.user` (**ASUMSI**: BA membuang kolom yang tidak terdaftar). Cadangan: guard membaca baris `user` seperti cabang API key (`guard.ts:70-72`) |
| F10 | `drizzle.config.ts:7-12` mendaftar 4 file schema eksplisit; `server/db/schema.ts:6-9` adalah barrel yang dipakai `drizzle(client, { schema })` (`db/index.ts`) dan introspeksi (`schema-introspect.ts:86`) | — | Setiap file baru wajib masuk **dua** tempat (config dan barrel) atau tabelnya hilang dari migrasi/konsol |
| F11 | Migrator drizzle menjalankan **semua** migrasi tertunda dalam **satu transaksi** dan memilih yang `folderMillis` (`when` di jurnal) lebih besar dari migrasi terakhir; tidak membandingkan hash | `node_modules/drizzle-orm/pg-core/dialect.js:44-70` | (a) `CREATE INDEX CONCURRENTLY`/`ALTER TYPE ADD VALUE` bermasalah; (b) edit SQL setelah dijalankan di DB dev tidak berefek; (c) migrasi hasil merge dengan `when` lebih lama dari yang terakhir diterapkan **terlewat diam-diam** |
| F12 | Migrasi 0004, 0006–0013 sudah idempotent dengan tangan (`IF NOT EXISTS`, blok `DO $$ … EXCEPTION WHEN duplicate_object`), komentar "kenapa" di kepala file; 0000–0003 tidak | `server/db/migrations/0010…0013*.sql` | Aturan global "IF NOT EXISTS untuk produksi" dipenuhi dengan edit tangan hasil `drizzle-kit generate`, bukan opsi drizzle-kit. Belum ada test yang menjaganya |
| F13 | Batas file schema **200 baris** (`server/file-health/file-health.rules.ts:32`), `schema.ts` ikut klasifikasi `schema` (`tests/file-health/file-health.rules.test.ts:18`) | — | Rencana file bagian 3.3 |
| F14 | Postgres: embedded `18.4.0-beta.17` (`server/local-pg/runtime.ts:20`), compose `pgvector/pgvector:pg16` (`docker-compose.yml:15`). Versi produksi **ASUMSI** ≥16 | — | Hindari fitur ≥17; ekstensi `pg_trgm` tidak dijamin ada di embedded → pencarian judul pakai `ILIKE` dulu |
| F15 | Introspeksi: `PG_TYPE_MAP` tidak memuat `PgBigInt53/64`, `PgSmallInt`, `PgDateString`, `PgNumericNumber`; `timestamptz` ditampilkan `timestamp`; kolom ekspresi index → `"[object Object]"`; hanya kolom FK pertama dipakai; `where` index dan CHECK tidak tampil | `schema-introspect.ts:41-54,95-103,128-132`; percobaan `bun -e` (hasil: `n PgBigInt53 number`, `d PgDateString string`, index `["p","[object Object]"]`, `withTimezone=true` tersedia di kolom) | Patch kecil, bagian 3.8 |
| F16 | `schemaStats` menjalankan 1 query per tabel (`count(*)` + `pg_total_relation_size`) lewat `Promise.all` pada pool 5; test menuntut `bytes > 0` untuk tiap tabel (`schema-stats.ts:24-30`, `tests/db/schema-stats.test.ts`) | — | 38 tabel = 38 query ringan; aman |
| F17 | `bun run db:migrate` untuk dev; DB test dimigrasi otomatis di mode PG lokal (`CLAUDE.md` › Test) atau `DATABASE_URL=$DATABASE_URL_TEST bun run db:migrate`; boot lokal juga memanggil `migrate()` (`server/local-pg/boot.ts:11-14`) | — | Alur migrasi 3.9 |

### 2.2 Cakupan MVP yang diterjemahkan

Dari brief: ditunda ke fase 5 = AI (cerita proyek, notulensi foto/suara, Ask Data), template, CSV, cuti, Gantt, Retro, Ticket. Konsekuensi skema: `project_story_drafts`, `project_templates`, `task_import_jobs`, `event_note_sources`, `event_outcomes`, `leave_requests` tidak dibuat; kolom yang hanya melayani fitur itu (`projects.created_via/template_id/story_draft_id`, `tasks.source/import_job_id`) ikut ditunda.

## 3. Rekomendasi

### 3.1 Keputusan konvensi (satu konvensi)

| Topik | Keputusan | Alternatif ditolak | Alasan |
|---|---|---|---|
| id | `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())` | `uuid` + `gen_random_uuid()` (ERD) | F1; FK ke `user.id` (text) harus bertipe sama; brief sudah final |
| Nama tabel | tunggal snake_case; PK komposit pakai `primaryKey({ columns })` (pola `schema.keys.ts`) | jamak (ERD) | F2; konsol `/dev/db-schema` dan test membaca nama apa adanya |
| Waktu | `timestamp(n, { withTimezone: true }).defaultNow().notNull()`; `updated_at` ditambah `.$onUpdate(() => new Date())`; tanggal murni `date(n, { mode: 'string' })` | `timestamp` tanpa zona (fondasi) | Brief; mode string menghindari geser zona pada `due_date` |
| Enum | `text(n, { enum: TUPLE })` + `CHECK (kolom IN (...))` dibuat dari tuple yang sama; tuple di `server/pm/enums.ts` (murni, bisa diimpor klien; test `client-server-imports` melarang jalur `/db`) | `pgEnum`; `text` tanpa CHECK | `pgEnum`: tidak ada `CREATE TYPE IF NOT EXISTS`, nilai baru lewat `ALTER TYPE … ADD VALUE` tidak bisa dipakai dalam transaksi yang sama (F11), nilai tak bisa dihapus. Tanpa CHECK: skrip/seed bisa menulis nilai liar. CHECK diganti drizzle-kit otomatis saat tuple berubah |
| Teks | `text` saja; batas panjang di TypeBox (boundary) | `varchar(n)` (ERD) | Fondasi tidak memakai varchar; mengubah panjang = migrasi |
| Relasi | tanpa `relations()` baru | `relations()` untuk semua | F5; `userRelations` lama tetap (dua panggilan `relations()` untuk satu tabel berisiko tertimpa — **ASUMSI**) |
| FK ke user | lihat 3.6 | — | F6 |
| Index | nama `<tabel>_<kolom>_idx`/`_uidx`; parsial `WHERE deleted_at IS NULL` untuk daftar hidup | index penuh | Sampah kecil, daftar hidup besar |
| Kolom umum | helper `pk()`, `createdAt()`, `updatedAt()`, `softDelete()`, `oneOf()` di `schema.columns.ts` | mengulang di tiap tabel | Menghemat ±80 baris dari batas 200/file |

### 3.2 Proposal skema tabel-demi-tabel

Legenda: `t` text, `tz` timestamptz, `d` date(string), `i` integer, `b` boolean. Tanpa tanda `?` = NOT NULL. `+ts` = `created_at`, `updated_at` tz default `now()`. `→X SN` = FK ke X `ON DELETE SET NULL`; `CAS` = cascade; `NA` = no action (default). Kolom FK `?` selalu nullable karena SN. `IDX` = index; `P` = parsial.

**Modul 01 · akun** (`schema.auth.ts` diubah, `schema.profile.ts` baru)
```
user (+kolom)  approval_status t='pending' · approval_decided_by t? →user SN · approval_decided_at tz? · approval_reason t?
   CHECK approval_status IN (pending,approved,rejected)   [suspended = banned yang ada]   IDX (approval_status) P approval_status<>'approved'
profile        id · user_id t UNIQUE →user CAS · display_name t? · phone t? · job_title t? · department t? · text_size t='normal' · +ts
   CHECK text_size IN (normal,besar,sangat_besar)
user_invitation id · email t (huruf kecil) · role t='member' · invited_by t? →user SN · accepted_user_id t? →user SN · accepted_at tz? · revoked_at tz? · created_at
   UNIQUE IDX (email) P accepted_at IS NULL AND revoked_at IS NULL      [sumber: diskusi 00 §4, §6; bukan dari ERD]
```
**Modul 02 · proyek** (`schema.project.ts`, `schema.project-history.ts`)
```
project        id · name · description? · status='draft' · priority='medium' · lead_id? →user SN · start_date? d · due_date? d · original_due_date? d
               · tasks_need_review_default b=false · completed_at? tz · deleted_at? tz · deleted_by? →user SN · created_by? →user SN · +ts
   CHECK status IN (draft,active,on_hold,completed,canceled) · priority IN (low,medium,high,critical) · due_date>=start_date
   IDX (status,due_date) P deleted_at IS NULL · (deleted_at) P deleted_at IS NOT NULL
project_member PK(project_id →project CAS, user_id →user CAS) · role='member' · added_by? →user SN · created_at
   CHECK role IN (manager,member,viewer)   IDX (user_id)
project_phase  id · project_id →project CAS · name · description? · position smallint · start_date? d · end_date? d · status='not_started'
               · started_at? tz · finished_at? tz · +ts      CHECK status IN (not_started,in_progress,done) · end_date>=start_date
   IDX (project_id,position)   [bukan UNIQUE, lihat 3.4 #6]
project_milestone id · project_id →CAS · phase_id? →project_phase SN · title · description? · due_date d · reached_at? tz · +ts   IDX (project_id,due_date)
project_deadline_extension id · project_id →CAS · old_due_date d · new_due_date d · reason_category · reason · extended_by? →user SN · created_at
   CHECK new_due_date>old_due_date · reason_category IN (scope_added,external_dependency,estimate_missed,resources,other)   IDX (project_id,created_at)
project_condition_override id · project_id →CAS · condition · reason · set_by? →user SN · expires_at? tz · cleared_at? tz · created_at
   CHECK condition IN (on_track,at_risk,off_track)   IDX (project_id,created_at)
project_activity id · project_id →CAS · actor_id? →user SN · actor_name? t (snapshot) · action t · payload? jsonb · created_at   IDX (project_id,created_at)
```
**Modul 03 · tugas** (`schema.task.ts`, `schema.task-detail.ts`)
```
task_kind      id · project_id →project CAS · name · base_kind · position smallint · archived_at? tz · +ts
   CHECK base_kind IN (task,issue,idea)   UNIQUE IDX (project_id, lower(name))
task           id · project_id →project CAS · number bigint IDENTITY BY DEFAULT (task_number_seq) · phase_id? →project_phase SN · kind_id →task_kind NA
               · title · description? · status='todo' · priority='medium' · assignee_id? →user SN · reviewer_id? →user SN · needs_review b=false
               · created_by? →user SN · start_date? d · due_date? d · estimate_hours? numeric(6,1) · reopen_count i=0 · return_count i=0
               · cancel_category? · cancel_note? · started_at? · review_requested_at? · completed_at? · canceled_at? (tz)
               · last_activity_at tz=now() · deleted_at? tz · deleted_by? →user SN · deleted_with_project_id? →project SN · +ts
   CHECK status IN (todo,in_progress,in_review,done,canceled) · priority IN (…) · cancel_category IN (duplicate,not_needed,out_of_scope,created_by_mistake,other)
         due_date>=start_date · reviewer_id IS NULL OR assignee_id IS NULL OR reviewer_id<>assignee_id
         status<>'canceled' OR cancel_category IS NOT NULL · cancel_category IS DISTINCT FROM 'other' OR cancel_note IS NOT NULL · reopen_count>=0 AND return_count>=0
   IDX UNIQUE (number) · (project_id,status) P live · (assignee_id,status,due_date) P live · (project_id,reviewer_id) P status='in_review' AND live
       · (deleted_at) P deleted_at IS NOT NULL · (deleted_with_project_id) P NOT NULL        [live = deleted_at IS NULL]
task_checklist_item id · task_id →task CAS · text · is_done b=false · done_by? →user SN · done_at? tz · position smallint · +ts   IDX (task_id,position)
task_comment   id · task_id →CAS · author_id? →user SN · author_name? t · body · edited_at? tz · deleted_at? tz · created_at   IDX (task_id,created_at)
task_attachment id · task_id →CAS · type · url? · storage_key? · file_name? · mime_type? · size_bytes? i · note? · uploaded_by? →user SN · deleted_at? tz · created_at
   CHECK type IN (file,image,link) · (type='link' AND url IS NOT NULL) OR (type<>'link' AND storage_key IS NOT NULL)   IDX (task_id)
task_dependency PK(task_id →task CAS, blocked_by_task_id →task CAS) · created_by? →user SN · created_at   CHECK task_id<>blocked_by_task_id   IDX (blocked_by_task_id)
task_review    id · task_id →CAS · requested_by? →user SN · reviewer_id? →user SN · decision? · decided_by? →user SN · decided_by_name? t · note? · requested_at tz=now() · decided_at? tz
   CHECK decision IN (approved,returned)   UNIQUE IDX (task_id) P decision IS NULL · IDX (task_id,requested_at)
task_activity  id · task_id →CAS · actor_id? →user SN · actor_name? t · action t · payload? jsonb · created_at   IDX (task_id,created_at)
tag            id · project_id →CAS · name (huruf kecil, trim) · created_by? →user SN · created_at   UNIQUE IDX (project_id, lower(name))
task_tag       PK(task_id →task CAS, tag_id →tag CAS) · created_at   IDX (tag_id)
```
**Events (usulan 05)** (`schema.event.ts`)
```
event          id · project_id? →project CAS · title · kind='meeting' · starts_at tz · ends_at tz · location_type='offline' · location_text? · agenda?
               · recurrence='none' · series_id? t (id kejadian pertama; tanpa FK) · canceled_at? tz · cancel_reason? · notes? t · notes_updated_at? tz
               · notes_updated_by? →user SN · created_by? →user SN · deleted_at? tz · deleted_by? →user SN · deleted_with_project_id? →project SN · +ts
   CHECK kind IN (meeting,review,important,team,other) · location_type IN (offline,online) · recurrence IN (none,weekly,biweekly,monthly) · ends_at>=starts_at
   IDX (starts_at) P live · (project_id,starts_at) P live · (series_id) P NOT NULL · (deleted_at) P NOT NULL
event_participant PK(event_id →event CAS, user_id →user CAS) · is_note_taker b=false · created_at   IDX (user_id)
```
**Inbox (usulan 06)** (`schema.notification.ts`)
```
notification   id · recipient_id →user CAS · actor_id? →user SN · project_id? →project CAS · lane · kind t · ref_type? · ref_id? · bundle_key? · bundle_count i=1
               · dedupe_key? · payload? jsonb (judul + nama pengirim + kutipan pendek, tanpa isi sensitif) · created_at · read_at? tz · resolved_at? tz
   CHECK lane IN (action,info)
   IDX (recipient_id) P lane='action' AND resolved_at IS NULL (badge) · (recipient_id,created_at) · (ref_type,ref_id) P resolved_at IS NULL
       · UNIQUE (recipient_id,dedupe_key) P dedupe_key IS NOT NULL (pengingat acara & pembundelan idempotent)
notification_preference PK(user_id →user CAS, kind t) · in_app b=true      [jarang: baris hanya ada bila user mengubah dari bawaan "hidup"]
```
Tuple enum yang dibuat di `server/pm/enums.ts`: `PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_MEMBER_ROLES, PHASE_STATUSES, EXTENSION_REASONS, PROJECT_CONDITIONS, TASK_BASE_KINDS, TASK_STATUSES, TASK_CANCEL_CATEGORIES, TASK_ATTACHMENT_TYPES, REVIEW_DECISIONS, EVENT_KINDS, EVENT_RECURRENCES, NOTIFICATION_LANES, APPROVAL_STATUSES, TEXT_SIZES` (+ konstanta bernama asumsi: `TRASH_RETENTION_DAYS=30`, `TASK_STALE_DAYS=3`, `TASK_KINDS_MAX_ACTIVE=6`, `PROJECT_AT_RISK_OVERDUE_RATIO=0.2`, `NOTIFICATION_RETENTION_DAYS=30`, `EVENT_REMINDER_OFFSETS_MIN=[1440,30]`, `EVENT_RECURRENCE_HORIZON_DAYS=90`).

### 3.3 Rencana file schema (maks 200 baris/file, F13)

| File | Isi | Anggaran baris | Catatan |
|---|---|---|---|
| `schema.columns.ts` (baru) | `pk()`, `createdAt()`, `updatedAt()`, `softDelete()`, `oneOf()` | 40 | bukan tabel; tidak diekspor ke barrel |
| `schema.auth.ts` (ada, 72) | + 4 kolom `user` + index | ≈ 90 | komentar kepala "regenerate" perlu diperbarui: kolom kita bukan hasil `auth:generate` |
| `schema.profile.ts` | `profile`, `user_invitation` | ≈ 70 | |
| `schema.project.ts` | `project`, `project_member`, `project_phase`, `project_milestone` | ≈ 130 | |
| `schema.project-history.ts` | `project_deadline_extension`, `project_condition_override`, `project_activity` | ≈ 80 | |
| `schema.task.ts` | `task_kind`, `task`, `tag`, `task_tag` | ≈ 175 | `task` ±100 baris dengan 5 CHECK + 6 index; **batas risiko**: bila >190 pindahkan `tag`,`task_tag` ke `schema.task-detail.ts` |
| `schema.task-detail.ts` | checklist, comment, attachment, dependency, review, activity | ≈ 130 | |
| `schema.event.ts` | `event`, `event_participant` | ≈ 95 | |
| `schema.notification.ts` | `notification`, `notification_preference` | ≈ 70 | |
| `schema.ts` (barrel) | `export *` 9 file | ≈ 14 | maks 50 baris; **tambahkan 5 baris** |
| `server/pm/enums.ts` (baru) | tuple + tipe + konstanta | ≈ 100 | murni; dipakai UI dan schema |
| `drizzle.config.ts` | `schema: ['./server/db/schema.*.ts']` | 0 | glob menggantikan daftar eksplisit (F10); `schema.ts` tidak cocok pola karena tidak punya segmen tengah; verifikasi dengan `drizzle-kit generate` yang harus "No schema changes" |

Total ≈ 820 baris schema. Test penjaga `tests/db/schema-wiring.test.ts` (baru, ±40 baris): setiap `schema.*.ts` (kecuali `columns`) muncul di `schema.ts`, dan setiap tabel punya `deletedAt` hanya bila ada di daftar soft-delete.

### 3.4 Penyimpangan dari ERD

| # | ERD | Keputusan | Jenis | Alasan |
|---|---|---|---|---|
| 1 | Nama jamak `users`, `projects`, `tasks`, … | Tunggal | ganti | F2 |
| 2 | `users` tabel sendiri, `uuid`, enum `role/status` | Tabel `user` Better Auth; `role` tetap `text` (nilai `member/project_manager/admin/super-admin`); `status` → `approval_status`; `approved_by/at`, `rejection_reason` → `approval_decided_by/at`, `approval_reason` | ganti | Fondasi + keputusan 00 §1,§4. Nama `status` ditolak karena rancu dengan `banned` |
| 3 | `users.google_sub` | **Dibuang**: `account.account_id` bila `provider_id='google'` | hapus | Tabel `account` BA sudah menyimpan `sub`; kolom ganda bisa basi |
| 4 | `users.last_login_at` | **Dibuang**: `max(login_log.created_at)` per user (`login_log_user_id_idx`) | hapus | Sudah dicatat tiap login; 50 user murah |
| 5 | `profiles.full_name`, `avatar_url` | → `user.name`, `user.image` (+ `server/api/app-avatar.ts`) | hapus | Dua sumber kebenaran untuk nama/foto akan berbeda |
| 6 | `project_phases` UNIQUE `(project_id, position)` | Index biasa; susun ulang posisi dalam satu transaksi | ganti | Drizzle tidak punya UNIQUE `DEFERRABLE`; menukar dua tahapan melanggar UNIQUE di tengah `UPDATE` |
| 7 | `tasks.number` dari `nextval('task_number_seq')` | Kolom `bigint … GENERATED BY DEFAULT AS IDENTITY` | ganti | Satu objek, ikut DROP tabel, `CREATE TABLE IF NOT EXISTS` tetap idempotent. `BY DEFAULT` agar seed/test bisa mengisi nomor |
| 8 | `lead_id`, `created_by`, `author_id`, `uploaded_by`, `extended_by`, `set_by`, `actor_id`, `requested_by` `NOT NULL` | Nullable + SET NULL | ganti | 3.6 |
| 9 | — | Tambah `actor_name`/`author_name`/`decided_by_name` di 4 tabel riwayat | tambah | Riwayat tetap terbaca setelah akun dihapus (pola `audit_log.actor_email`, F6) |
| 10 | `task_attachments.url` (tautan atau lokasi storage) | `url` (hanya tautan) + `storage_key` + `mime_type` + `size_bytes`, CHECK salah satu | ganti | CLAUDE.md › Storage: tipe dari magic bytes, key bukan URL; storage bisa mati (`503 STORAGE_DISABLED`) → tautan tetap jalan |
| 11 | `tasks.kind_id` FK tanpa aksi | `NO ACTION` (bukan RESTRICT) | tegas | Hapus proyek meng-cascade `task_kind` dan `task` dalam satu statement; RESTRICT bisa gagal tergantung urutan, NO ACTION diperiksa di akhir statement |
| 12 | `projects.created_via`, `template_id`, `story_draft_id`; `tasks.source`, `import_job_id` | Ditunda | tunda | Hanya melayani AI/template/CSV; tambah kolom nanti = `ADD COLUMN … DEFAULT 'form'` (S) |
| 13 | `project_story_drafts`, `project_templates`, `task_import_jobs` | Ditunda | tunda | Keputusan brief |
| 14 | `events.recurrence_parent_id` (FK diri) | `series_id` tanpa FK | ganti | Menghapus "induk" seri tidak boleh meng-cascade; Sampah mengelompokkan lewat `series_id` (diskusi 08 #12) |
| 15 | `event_notes`, `event_note_sources`, `event_outcomes` | Notulensi ketik jadi kolom `notes*` di `event`; sisanya ditunda | tunda | Tanpa AI hanya ada 1 teks per event; status Draf/Menunggu/Dikonfirmasi tidak bermakna. Pemisahan kembali ke tabel = S–M saat fase 5 |
| 16 | `events.meeting_url` | Digabung ke `location_text` | hapus | Layar hanya satu isian "teks atau tautan" (05 §3 ③a); UI membuat tautan otomatis |
| 17 | `workspace_settings` (09 §4) | **Tidak dibuat**; `app_setting` tidak diubah | hapus | Fondasi sudah punya singleton `app_setting` (`schema.app.ts:32`); semua isinya (AI, rekaman, cuti) ditunda; pengingat/retensi jadi konstanta |
| 18 | `leave_requests` | Ditunda; status "Cuti" di Tim tidak ada di MVP | tunda | Brief |
| 19 | `notifications.ref_id` uuid | `text`, tanpa FK; ditambah `dedupe_key` | ganti/tambah | id text; polimorfik; kunci idempoten pengingat |
| 20 | `tasks.needs_review` tanpa default | `default false` | tegas | Insert mentah/seed tidak gagal; nilai asli tetap diisi service dari proyek |
| 21 | — | `user_invitation` | tambah | Keputusan 00 §4, §6 (undangan awal) |
| 22 | `task_comments`/`task_attachments` soft delete | Dipertahankan (`deleted_at`) tetapi **tidak** masuk Sampah | sesuai | Diskusi 08 #13: pesan "Urungkan" beberapa detik |

### 3.5 Soft delete dan strategi query default

- Kolom: `project`, `task`, `event` memakai `deleted_at tz?`, `deleted_by →user SN`; `task` dan `event` ditambah `deleted_with_project_id →project SN` (diskusi 08 #11). `task_comment`/`task_attachment`: hanya `deleted_at`.
- **Query default = hidup.** Drizzle tidak punya global scope. Tiga opsi: (a) helper kondisi, (b) view `task_live`, (c) disiplin manual. **Pilih (a)**: `server/pm/soft-delete.ts` mengekspor `isLive(t)` = `isNull(t.deletedAt)` dan `isTrashed(t)`; semua `*.query.ts` di `server/pm/` wajib memakainya. Ditolak (b): view tidak muncul di introspeksi (`is(value, PgTable)`), menggandakan nama, dan tidak mengamankan tulis. Ditolak (c): satu lupa = tugas terhapus muncul di Beranda.
- Penjaga: `tests/pm/soft-delete-guard.test.ts` memindai `server/pm/**/*.query.ts`; tiap file yang menyebut `task`/`project`/`event` harus memuat `isLive(` atau `isTrashed(` (pola seperti `tests/app-routes.test.ts`). Ditambah test per daftar: baris dengan `deleted_at` terisi tidak muncul.
- Predikat index parsial dibuat sama persis dengan keluaran `isLive` (`"deleted_at" is null`) supaya planner memakainya.
- **Hapus proyek** (satu transaksi): `UPDATE project SET deleted_at=now(), deleted_by=:u` lalu `UPDATE task|event SET deleted_at=now(), deleted_by=:u, deleted_with_project_id=:p WHERE project_id=:p AND deleted_at IS NULL`. **Pulihkan**: proyek lalu `WHERE deleted_with_project_id=:p` (diskusi 08 #4). Tugas yang proyeknya di Sampah: pulihkan proyek dulu (08 #14) — dicek di service.
- **Purge 30 hari** (`TRASH_RETENTION_DAYS`, job harian meniru `settings-retention.ts`): `DELETE FROM project WHERE deleted_at < :cutoff` (FK meng-cascade semua anak), lalu `task`/`event` yang `deleted_at < :cutoff` (tidak lewat `deleted_with_project_id`). Urutan wajib: ambil `storage_key` lampiran → hapus baris → hapus objek storage (gagal lunak + log), supaya tidak ada baris yatim menunjuk objek hilang.
- Seri event berulang: satu item Sampah = `GROUP BY series_id` pada baris terhapus yang `deleted_at` sama.
- UNIQUE yang melibatkan baris terhapus: `task.number` tidak pernah dipakai ulang (identity); `tag`/`task_kind` tidak soft delete, jadi UNIQUE `lower(name)` aman.

### 3.6 Nasib data PM saat user dihapus

Jalur: `DELETE FROM "user"` (F7). Prinsip: **pekerjaan orang tidak ikut hilang bersama akunnya**; milik pribadi ikut hilang.

| FK ke `user.id` | Aksi | Efek yang terlihat |
|---|---|---|
| `profile.user_id`, `notification.recipient_id`, `notification_preference.user_id`, `event_participant.user_id`, `project_member.user_id` | CASCADE | Orang hilang dari proyek/undangan acara; pengelola lain tetap |
| `task.assignee_id`, `task.reviewer_id` | SET NULL | Tugas jadi "belum ada yang pegang"; pemeriksa kosong = jatuh ke Admin (aturan sudah ada di task.md) → cocok tanpa kode tambahan |
| `project.lead_id` | SET NULL | **Dicegah di service** (di bawah); SET NULL hanya jaring pengaman |
| `*.created_by`, `deleted_by`, `added_by`, `done_by`, `uploaded_by`, `extended_by`, `set_by`, `requested_by`, `decided_by`, `approval_decided_by`, `invited_by`, `accepted_user_id`, `notes_updated_by`, `actor_id` (notifikasi) | SET NULL | UI: "Pengguna yang sudah dihapus" |
| `task_comment.author_id`, `task_activity.actor_id`, `project_activity.actor_id`, `task_review.decided_by` | SET NULL + snapshot nama | Tampil `coalesce(user.name, snapshot)` → "Dodi (akun dihapus)" |
| `event.created_by` | SET NULL | Acara tetap; hanya Admin/Pengelola proyek yang bisa mengubah (matriks 05 §2) |

Tidak ada `RESTRICT`: ia membuat self-delete dan `removeUser` gagal dengan galat FK mentah. Pencegahan di service (F8): tolak hapus bila user adalah **satu-satunya Pengelola** proyek hidup (pesan Indonesia actionable: "Kamu satu-satunya pengelola proyek Atlas. Tunjuk pengelola lain dulu"), di `deleteUser.beforeDelete` dan di handler `admin.ts` sebelum baris 138. Alternatif yang ditolak: `CASCADE` ke tugas/komentar (menghapus kerja tim), `RESTRICT` (F7), mengganti pemilik ke Admin otomatis (menebak). Rekomendasi operasional: hapus akun bukan jalur biasa; **Nonaktifkan (`banned`) mempertahankan semuanya** (pertanyaan 1, bagian 6).

### 3.7 Index untuk query yang diketahui

| Query (layar) | Index yang melayani | Catatan |
|---|---|---|
| Tugas saya, Beranda "Fokus saya", Tim (beban per orang, Admin) | `task (assignee_id,status,due_date) P live` | satu index untuk tiga layar |
| Semua tugas per proyek, progres %, Terlambat/Mandek di Beranda/Ringkasan | `task (project_id,status) P live` | progres dihitung `GROUP BY project_id,status` (20 ribu baris, ms); **tidak** disimpan (ERD) |
| Menunggu diperiksa saya | `task (project_id,reviewer_id) P status='in_review'` | terkecil dari semua; hanya tugas menunggu |
| Daftar proyek (Admin/PM semua), Member | `project (status,due_date) P live` ; `project_member (user_id)` | Member: join `project_member` lalu `project` PK |
| Tim: peran proyek bersama | PK `project_member (project_id,user_id)` + `(user_id)` | |
| Sampah (3 jenis) | `(deleted_at) P NOT NULL` di `project`,`task`,`event` | Member: `deleted_by = :me` memfilter hasil kecil |
| Events daftar/kalender | `event (starts_at) P live`, `(project_id,starts_at) P live`; "sedang rapat" memakai `event_participant (user_id)` | |
| Inbox badge/daftar/selesaikan lintas penerima | tiga index `notification` di 3.2 | `resolved_at` diisi massal via `(ref_type,ref_id)` |
| Timeline detail tugas | `task_comment (task_id,created_at)`, `task_activity (task_id,created_at)` | merge di aplikasi |
| Cari judul tugas | tanpa index; `ILIKE` dibatasi `project_id`/hak lihat | `pg_trgm` ditunda (F14); evaluasi bila >100 ribu tugas |

Sengaja **tidak diindeks**: FK ke `user` untuk kolom jejak (`created_by`, `deleted_by`, …): hanya dipakai saat hapus akun (jarang, tabel ≤ 120 ribu baris → scan ms); `task (phase_id)`, `task (kind_id)` (dikerjakan dalam rentang `project_id`). Setiap index tambahan memperlambat tulis tugas (aktivitas ≈ 6 tulis/tugas).

### 3.8 Dampak ke `/dev/db-schema` dan skrip schema-stats

- Tabel di konsol naik dari 14 → **38**. Otomatis (introspeksi `Object.values(schema)`) **asal barrel lengkap** (F10). `landingStats().tables` ikut naik; test `> 5` aman (`tests/landing-stats.test.ts:26`).
- `tests/db/schema-stats.test.ts` memeriksa `rows ≥ 0` dan `bytes > 0` tiap tabel: lolos (setiap relasi ≥ 8 KB). Badge sidebar `/dev/db-schema` menghitung `journal − applied` (`schema-stats.ts:33-58`): akan menyala 5 sampai migrasi dijalankan, sesuai maksud.
- **Patch kecil `schema-introspect.ts` (S, ±35 baris + test)**, wajib sebelum modul 03: (1) `PG_TYPE_MAP` + `PgBigInt53/64→bigint`, `PgSmallInt→smallint`, `PgDateString→date`, `PgTimestampString`, `PgNumericNumber→numeric`; `timestamp` dengan `col.withTimezone` → `timestamptz`; (2) kolom index ekspresi: pakai `is(c, SQL)` + rangkai chunk seperti `describeDefault` (hilangkan `[object Object]`); (3) `IndexMeta.where?: string` agar index parsial terbaca; (4) opsional: tampilkan jumlah CHECK per tabel. `defaultLabel` untuk identity akan menampilkan `sql` (identity → `hasDefault=true`, `default` kosong): tambahkan cabang `generatedIdentity → 'identity'`.
- Graf ERD: ±60 sisi, tiga tabel hub (`user`, `project`, `task`) → tata letak dagre padat. Mode `compact` (hanya kolom kunci) sudah ada (`erd.layout.ts:24-26`); pertimbangkan filter per kelompok (akun/proyek/tugas/event/inbox) — ide, di luar skema.
- `schemaStats` per tabel `count(*)`: 38 query paralel pada pool 5 (`db/index.ts:21`); tabel terbesar `task_activity` ≈ 120 ribu baris → `count(*)` puluhan ms. Bila halaman terasa lambat: ganti dengan `reltuples` (perkiraan) — tidak perlu sekarang.

### 3.9 Rencana migrasi

Hanya `drizzle-kit generate` + edit tangan; **bukan** `db:push` (tidak meninggalkan jejak untuk produksi). Lima migrasi berurutan menurut dependensi FK; tiap migrasi ikut PR modulnya (jangan membuat tabel sebelum kodenya ada).

| Nomor | Isi | Syarat |
|---|---|---|
| `0014` akun | 4 kolom `user`; backfill `role 'user'→'member'`; `profile` + backfill baris per user; `user_invitation` | Fase 0 (00 §6) |
| `0015` proyek | 7 tabel proyek | 0014 |
| `0016` tugas | 10 tabel tugas | 0015 (FK `project`, `project_phase`) |
| `0017` event | `event`, `event_participant` | 0015 |
| `0018` inbox | `notification`, `notification_preference` | 0015 |

Langkah per migrasi (memenuhi CLAUDE.md global §4):
1. Tulis/ubah `schema.<modul>.ts`, daftar di barrel; `bun run typecheck`.
2. `bun run db:generate` → file baru `00NN_<nama>.sql` + snapshot + jurnal.
3. **Edit tangan sebelum dijalankan di mana pun** (F11: edit setelah diterapkan tidak berefek): komentar kepala *kenapa*; `CREATE TABLE IF NOT EXISTS`; `CREATE [UNIQUE] INDEX IF NOT EXISTS`; `ADD COLUMN IF NOT EXISTS`; tiap `ADD CONSTRAINT … FOREIGN KEY/CHECK` dibungkus `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;` (salin pola `0011:36-42`); CHECK di dalam `CREATE TABLE IF NOT EXISTS` tidak perlu dibungkus. Kolom identity ikut `CREATE TABLE IF NOT EXISTS` sehingga sequence otomatis idempotent.
4. Kolom NOT NULL di tabel berisi data (`user.approval_status`): `ADD COLUMN IF NOT EXISTS … NOT NULL DEFAULT 'approved'` (backfill: akun lama jangan terkunci, 00 §4) lalu `ALTER COLUMN … SET DEFAULT 'pending'` (akun baru). Idempotent karena set default berulang tak berbahaya.
5. Jalankan dev: `bun run db:migrate`; test: `DATABASE_URL=$DATABASE_URL_TEST bun run db:migrate` (mode PG lokal: dibuat otomatis oleh `server/local-pg/test-db.ts`). Verifikasi hasil dengan `/dev/db-schema` dan `psql \d+`.
6. **Jalankan SQL dua kali** pada DB scratch (`psql -f 00NN.sql` dua kali, tanpa error) — pembuktian idempotent. Test baru `tests/db/migration-idempotent.test.ts` (S, ±50 baris) memindai file ≥ `0014`: larang `CREATE TABLE "`, `CREATE INDEX "`, `ADD COLUMN "` tanpa `IF NOT EXISTS` dan `ADD CONSTRAINT` di luar blok `DO`. Berkas 0000–0013 dikecualikan.
7. `bun run test`, `bun run smoke:prod`, `bun run smoke:binary` (menyentuh `server/`), dan `bun run smoke:coldboot` (menjalankan seluruh migrasi dari DB kosong).
8. Sebelum deploy: bandingkan skema aktif dengan file migrasi (global §4 "Sebelum deploy"); jalankan `drizzle-kit generate` lagi → harus "No schema changes".
Catatan: rebase/merge cabang lain yang punya migrasi: nomor dan `when` jurnal harus naik monoton; jika `when` migrasi kita lebih kecil dari yang terakhir diterapkan di DB, migrator **melewatinya diam-diam** (F11). Setelah merge: regenerasi migrasi kita.

### 3.10 Perkiraan jumlah baris dan ukuran (50 pengguna, 200 proyek, 20.000 tugas)

Angka di bawah **estimasi saya** (bukan pengukuran): baris = asumsi rasio dari dokumen desain/angka brief; ukuran = (byte heap + byte index per baris) × baris × 1,15, dengan byte per baris diperkirakan dari lebar kolom (header tuple 24 B). Verifikasi dengan data seed dan kolom "Ukuran" di `/dev/db-schema` (`pg_total_relation_size`).

| Tabel | Baris | Asumsi rasio | Ukuran |
|---|---|---|---|
| `task` | 20.000 | brief | 18,6 MB |
| `task_activity` | 120.000 | ±6 per tugas | 44,7 MB |
| `task_comment` | 30.000 | 1,5 per tugas | 14,5 MB |
| `task_checklist_item` | 20.000 | ±1 per tugas | 5,5 MB |
| `task_tag` / `tag` | 24.000 / 1.600 | 1,2 per tugas / 8 per proyek | 4,7 / 0,4 MB |
| `task_attachment` / `task_review` / `task_dependency` | 6.000 / 4.000 / 2.000 | 0,3 / 0,2 / 0,1 per tugas | 2,1 / 1,4 / 0,4 MB |
| `event` / `event_participant` | 6.000 / 24.000 | ±2 per proyek per bulan, 4 peserta, horizon ulang 90 hari | 3,9 / 4,7 MB |
| `notification` | 25.000 | 50 user × ±15/hari × 30 hari retensi | 13,7 MB |
| `project_activity` | 6.000 | 30 per proyek | 2,0 MB |
| `project`, `project_member`, `project_phase`, `project_milestone`, `task_kind`, lainnya | ±3.500 | 5 anggota, 4 tahapan, 3 milestone, ±3 jenis per proyek | ≈ 1,6 MB |
| `profile`, `user_invitation`, `notification_preference` | ±160 | | < 0,1 MB |
| **Total** | **≈ 292.000** | | **≈ 118 MB** |

Kesimpulan: `task_activity` dan `task_comment` mendominasi (±50%); keduanya aman tanpa partisi. Tabel log yang sudah ada (`visit_log` dll.) kemungkinan lebih besar dari seluruh data PM; retensinya sudah dikelola (`settings-retention.ts`). Bila `task_activity` perlu dipangkas, tambahkan retensi di fase berikutnya, bukan sekarang.

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| File schema baru lupa didaftarkan di `drizzle.config.ts`/barrel → tabel tidak ter-migrasi atau hilang dari konsol | Tinggi | Sedang | Glob di config + `tests/db/schema-wiring.test.ts` (3.3) |
| Migrasi tidak idempotent masuk produksi (global §4) | Sedang | Tinggi | Langkah 3 + 6 dan test `migration-idempotent`; jalankan dua kali di scratch |
| `when` jurnal migrasi hasil merge lebih kecil dari yang terakhir diterapkan → terlewat diam-diam (F11) | Sedang | Tinggi | Regenerasi setelah rebase; badge `/dev/db-schema` "migrasi belum diterapkan"; `smoke:coldboot` dari DB kosong |
| Query lupa `isLive()` → tugas/proyek terhapus muncul di Beranda/Tim, atau terhitung di progres | Sedang | Tinggi | Helper tunggal, test pemindai `*.query.ts`, test per daftar (3.5) |
| Hapus akun menghilangkan akuntabilitas (siapa menyetujui/memeriksa) atau membuat proyek tanpa pengelola | Sedang | Sedang | SET NULL + snapshot nama (3.6), pra-cek pengelola tunggal, rekomendasi Nonaktifkan |
| Purge 30 hari meninggalkan objek storage yatim atau baris menunjuk objek hilang | Sedang | Sedang | Urutan ambil key → hapus baris → hapus objek, gagal lunak + log; skrip rekonsiliasi di fase 5 |
| Berubah pikiran soal tipe/enum setelah data ada (mis. tambah `status` tugas) | Sedang | Rendah | CHECK diganti otomatis oleh drizzle-kit; tuple tunggal di `server/pm/enums.ts`; bukan `pgEnum` |
| `schema.task.ts` melewati 200 baris (CHECK + index banyak) | Sedang | Rendah | Rencana cadangan memindah `tag`,`task_tag`; helper `oneOf()` menghemat baris |
| Kolom `approval_status` tak muncul di `session.user` (F9) → guard salah izinkan/blokir | Sedang | Tinggi | Deklarasi `additionalFields` + test guard (pending/rejected diblokir); cadangan baca baris `user` |
| Event berulang (materialisasi 90 hari, "Hanya yang ini / Semua") paling rumit di skema ini | Tinggi | Sedang | Isolasi di `series_id`; uji matriks hapus/ubah; pertanyaan 2 (boleh ditunda) |
| Hub FK ke `user` dan `project` membuat graf ERD sulit dibaca | Tinggi | Rendah | Mode compact, filter kelompok, patch introspeksi (3.8) |
| Estimasi volume meleset (aktivitas per tugas lebih besar) | Sedang | Rendah | Index sudah parsial; ukur dengan seed 20 ribu tugas sebelum rilis |

## 5. Estimasi usaha (pekerja AI + 1 reviewer manusia)

| Paket | Isi | Ukuran | AI (hari-orang) | Reviewer |
|---|---|---|---|---|
| A. Infrastruktur skema | `schema.columns.ts`, `server/pm/enums.ts`, glob config, test wiring + idempotent, patch introspeksi + test | S–M | 1,5–2 | 0,5 |
| B. Akun (0014) | kolom `user`, `additionalFields`, `profile`, `user_invitation`, backfill, test guard | M | 1,5–2 | 0,5 |
| C. Proyek (0015) | 7 tabel + test cascade/CHECK | S–M | 1–1,5 | 0,3 |
| D. Tugas (0016) | 10 tabel, identity, CHECK, index parsial, test constraint | M | 2–2,5 | 0,5 |
| E. Event + Inbox (0017, 0018) | 4 tabel, `series_id`, `dedupe_key` | M | 1,5–2 | 0,4 |
| F. Soft delete + hapus akun | `soft-delete.ts`, test pemindai, pra-cek pengelola tunggal, kerangka purge | M | 1,5–2 | 0,4 |
| **Total skema + penjaga** | | **M–L** | **9–12** (≈ 7–10 bila A tumpang tindih dengan B) | **2–2,6** |

Di luar angka ini: logika service per fitur, UI, dan job purge/pengingat (dikerjakan bersama modulnya).

## 6. Pertanyaan terbuka untuk user

1. **Hapus akun**: untuk user yang sudah punya pekerjaan di proyek, izinkan hapus (data tetap, nama jadi "akun dihapus") atau arahkan hanya ke **Nonaktifkan**? Usulan: izinkan, tetapi tombol hapus di `/profile` dan di konsol memperingatkan dampaknya.
2. **Acara berulang (Ulangi)** masuk MVP? Ia menentukan `series_id`, penghalusan job 90 hari, dan dialog "Hanya yang ini / Semua". Usulan: tunda ke setelah Events dasar jalan (kolom bisa ditambah, S).
3. **Bukti tugas**: MVP cukup tautan dulu, file/foto menyusul begitu storage dipastikan aktif di produksi?
4. **`project_condition_override`** (ganti kondisi manual dengan alasan) tetap MVP? Tidak ada di daftar tunda, tetapi nilainya rendah dibanding biaya UI.
5. **Retensi** Sampah 30 hari dan Inbox 30 hari: konstanta di kode (usulan) atau pengaturan Admin di `app_setting`?
6. **Notulensi event** disimpan sebagai teks di `event` (usulan) atau langsung tabel terpisah yang siap AI?
7. Siapa pemilik DDL `user`/`profile`/`user_invitation` (Fase 0)? Bagian 3.2 hanya mencantumkannya agar kesatuan skema terlihat; koordinasikan dengan riset peran/akun.

## 7. Sumber

Kode yang dibaca: `server/db/{schema.ts,schema.auth.ts,schema.app.ts,schema.keys.ts,schema.logs.ts,schema-introspect.ts,schema-stats.ts,index.ts}`, `server/db/migrations/{0000,0004,0008,0010,0011,0012,0013}*.sql` dan `meta/_journal.json`, `drizzle.config.ts`, `package.json` (skrip `db:*`), `server/{auth.ts,guard.ts,roles.ts,permissions.ts,settings-retention.ts,landing-stats.ts}`, `server/api/{admin.ts,app.ts}`, `server/local-pg/{boot.ts,runtime.ts}`, `server/file-health/file-health.rules.ts`, `app/lib/db-schema-format.ts`, `app/components/db-schema/erd.layout.ts`, `tests/db/*`, `tests/client-server-imports.test.ts`, `docker-compose.yml`, `app/routes/app/profile.tsx`.
Dependensi terpasang (dibaca dari `node_modules`): `drizzle-orm 0.45.2` (`pg-core/dialect.js:44-70` migrator; `pg-core/columns/*.js` nama kelas kolom), `drizzle-kit 0.31.10`, `better-auth/dist/{db/with-hooks.mjs,api/routes/update-user.mjs}`. Percobaan `bun -e` tanpa DB pada `getTableConfig` (index ekspresi, identity, `withTimezone`).
Desain: `tahapan-proyek/03-desain/erd/{user-profile,project,task,gabungan}.md`; `diskusi/{00-role-dan-area,01-login-registrasi-beranda,02-proyek,03-tugas,05-events,06-inbox,07-tim,08-sampah,09-pengaturan}.md`; `tahapan-proyek/05-implementasi/riset/_BRIEF.md`; `CLAUDE.md` proyek dan global.
**Tidak diverifikasi (ASUMSI)**: versi Postgres produksi; BA membuang kolom `user` yang tidak terdaftar di `additionalFields`; glob `schema` didukung penuh oleh drizzle-kit 0.31.10 (dokumentasinya menyebut ya; uji dengan `generate` kosong); dua panggilan `relations()` untuk satu tabel; rasio baris dan lebar baris di 3.10; ketersediaan `pg_trgm` pada Postgres embedded.
