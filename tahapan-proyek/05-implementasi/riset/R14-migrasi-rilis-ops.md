# R14 — Migrasi, rilis, dan operasional implementasi Simple PM

> Tanggal: 15 Oktober 2026. Riset/perencanaan, **tidak ada kode, dokumen, atau `.env` yang diubah**. Branch dasar: `feature/project-management`.
> Konvensi: "ASUMSI" = tidak saya verifikasi langsung. Nomor baris = hasil baca hari ini. Fondasi kode menang atas desain; usulan yang mengubah fondasi diberi tanda **[FONDASI]** beserta biayanya.

## 1. Ringkasan eksekutif

1. **Migrasi:** drizzle-kit 0.31.10 tidak bisa menghasilkan `IF NOT EXISTS` (tidak ada opsi, tidak ada literalnya di `bin.cjs`). Migrasi 0000–0003 tak ber-guard (26 statement DDL), 0004–0013 semuanya ber-guard hasil **edit tangan**. Untuk ±20–30 tabel baru, edit tangan tidak layak: usul **wrapper `db:generate` yang memasang guard + dua test penjaga** (bentuk dan idempotensi).
2. **Jebakan migrator Drizzle:** migrasi hanya dibandingkan lewat `created_at` terakhir terhadap `when` di journal. Migrasi cabang yang `when`-nya lebih kecil dari yang sudah diterapkan **dilewati diam-diam**. Karena itu migrasi harus dibuat berurutan oleh satu pemilik ("schema-first", Gelombang 0), bukan paralel per fitur.
3. **Jalur prod eksternal (Docker) tidak punya langkah migrasi sama sekali** (`start` hanya migrasi di mode Postgres lokal; image tak memuat `drizzle.config.ts`). Usul subcommand `migrate` **[FONDASI, ±0,5–1 hari]**.
4. **Rollback:** Drizzle tak punya down. Rencana 4 tingkat: transaksi tunggal → binary lama (aman bila expand-only) → backup pra-deploy → file `.down.sql` manual.
5. **Lingkungan lokal tidak siap menjalankan test/smoke:** `.env` hanya berisi satu variabel tak terkait (tanpa `BETTER_AUTH_SECRET`/`DATABASE_URL`), Bun lokal 1.3.14 vs CI/stack 1.4.2 (rilis terbaru 1.4.3), dan `bun audit` melaporkan **1 critical + 2 high** yang wajib dilaporkan ke user.
6. **Paralel:** titik rawan konflik terbesar ada di migrasi/journal, `app/routes.ts`, `server/api/app.ts`, barrel + `drizzle.config.ts`, rename role (±112 baris cocok) dan CHANGELOG. Solusi: **Fase 0 men-stub semua registrasi**, satu pemilik per file bersama, `merge=union` untuk CHANGELOG, worktree dengan port/DB terpisah. **Prasyarat keras:** 98 file rebrand yang belum di-commit harus di-commit dulu, kalau tidak setiap worktree lahir dari kode lama.

## 2. Temuan (dengan bukti)

### 2.1 (a) Alur migrasi saat ini

| Lingkungan | Pemicu | Bukti |
|---|---|---|
| Dev (`bun run dev`) | otomatis, gagal-lunak | `server/dev-entry.ts:5-12` (komentar `:7` "prod migrates as an explicit deploy step") |
| Test, mode lokal | otomatis ke `<db>_test` di tiap run | `server/local-pg/test-db.ts:23-37`, dipanggil dari `tests/preload.ts` |
| Test, Postgres eksternal | manual ke DB kedua | CLAUDE.md §Test; `ci.yml:45` (`bun run db:migrate`) |
| Prod lokal (`start`, `init`) | otomatis | `server/local-pg/boot.ts:26-29`, `server/cli/init.ts:143` |
| **Prod eksternal / Docker** | **tidak ada** | `boot.ts:26` `if (!isLocalMode()) return false`; `Dockerfile:15-19` hanya menyalin node_modules/build/server/package.json/CHANGELOG (tanpa `drizzle.config.ts`), `Dockerfile:23` CMD hanya `start`; `server/cli/doctor.checks.ts:153` memberi petunjuk "migrasi dijalankan otomatis saat start" yang **salah** untuk mode ini |

**Konfigurasi.** `drizzle.config.ts:7-12` menyebut 4 file schema satu per satu (bukan barrel `server/db/schema.ts`, yang 9 baris). Output `server/db/migrations` (14 migrasi, 13 tabel di snapshot 0013, folder 436 KB; `meta/` 380 KB). `db:generate` = `drizzle-kit generate` (`package.json`). Nama file acak (`0013_bitter_phil_sheldon`); `drizzle-kit generate --help` menunjukkan `--name` dan `--custom` tersedia.

**Embed binary.** `scripts/build-binary.ts:48-49` memberi `--asset ./server/db/migrations`; runtime membaca `/$bunfs/root/migrations` (`server/local-pg/paths.ts:70-75`). Seluruh folder ikut tertanam, termasuk `meta/*_snapshot.json` (87% ukuran folder) padahal migrator hanya membaca `_journal.json` + `.sql` (`node_modules/drizzle-orm/migrator.js`, `readMigrationFiles`). Dampak: (i) versi binary = versi skema; migrasi baru tak berlaku di binary lama; (ii) tiap migrasi menambah satu snapshot (≈3,3 KB/tabel × tabel yang ada; ±130 KB/snapshot pada ±40 tabel, perkiraan saya) ke repo dan binary: kecil dibanding binary, tetapi file JSON itu **tidak bisa di-merge** antar cabang. Tidak ada test yang memeriksa embed ini; satu-satunya pembuktian black-box adalah `smoke:coldboot` (`scripts/smoke-coldboot.ts`: `init --yes --db=local` → `doctor --json` → `start`).

**Perilaku migrator** (`node_modules/drizzle-orm/pg-core/dialect.js:44-72`):
- Semua migrasi pending dijalankan dalam **satu transaksi** (`:60`); gagal = rollback semua.
- Penentu "sudah diterapkan" hanya `last.created_at < migration.folderMillis` (`:62`), `last` diambil sekali sebelum loop. **Hash tidak pernah dibandingkan.**
- Akibat: (1) migrasi dengan `when` ≤ yang terakhir diterapkan di DB itu dilewati diam-diam; (2) mengedit file yang sudah diterapkan tidak terdeteksi (aman untuk menambah guard, berbahaya untuk perubahan semantik); (3) `ALTER TYPE … ADD VALUE` dan `CREATE INDEX CONCURRENTLY` bermasalah dalam transaksi tunggal.
- Journal sekarang monoton (`when` 0000…0013 naik, dicek dengan skrip); rantai snapshot `prevId` utuh (0013→0012). **Belum ada test yang menjaganya.**

**Guard IF NOT EXISTS.**
- `grep -ci "if not exists" node_modules/drizzle-kit/bin.cjs` = **0**; flag `generate` tak memuat opsi terkait. Generator selalu menulis `CREATE TABLE "x" (…)` polos.
- Isi migrasi: 0000–0003 = 8+5+12+1 = **26 statement DDL tanpa guard**; 0004–0013 = semua ber-guard (11, 10, 11, 4, 5, 13, 1, 10, 4, 4 statement). Pola tangan yang sudah dipakai: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, FK dibungkus `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;` (`0008:16-18`, `0011`, `0012`), dan pola NOT NULL aman `ADD COLUMN` nullable → `UPDATE` backfill → `SET NOT NULL` (`0010`). Header komentar "kenapa" ada di 0004–0013, sesuai aturan global §4.
- Tidak ada test penjaga: `grep` di `tests/` untuk `IF NOT EXISTS|_journal|migrations` hanya mengenai test file-health, schema-stats, dan local-pg (bukan validasi isi migrasi).
- ERD memakai enum (`project.md:196`, `task.md:257`); fondasi memakai `text` untuk `user.role` (`server/db/schema.auth.ts`). `pgEnum` + migrator transaksi tunggal = jebakan #3 di atas.

**Versi.** drizzle-kit terpasang 0.31.10 (terbaru 0.31.11), drizzle-orm 0.45.2 (terbaru 0.45.4); jalur 1.0 baru `rc.5` (npm dist-tags, 15 Okt 2026): jangan naik mayor di tengah program. Postgres bervariasi: embedded 18.4.0 (`paths.ts:6`), CI `postgres:18` (`ci.yml`), compose `pgvector:pg16`, Homebrew `postgresql@14` berjalan di mesin ini (`ps`). SQL migrasi harus portabel (ASUMSI batas bawah PG14; hindari `NULLS NOT DISTINCT`, `uuidv7()`).

**Data lama yang harus dimigrasi** (`diskusi/00-role-dan-area.md` §1, §4, §6): (1) `user.role` `'user'`/NULL → `'member'` (kolom `text` tanpa enum; `defaultRole` di `server/auth.ts:38`; `ASSIGNABLE_ROLES` `permissions.ts:18`; `ROLE_RANK` hard-coded 3 role di `scopes.ts:122`); (2) kolom status akun: backfill `approved` agar tak terkunci; (3) `profile` 1:1 untuk user yang ada; (4) kolom demo dari 0013 (`user.is_anonymous`, `app_setting.demo_enabled`, `demo_ttl_hours`) tetap ada walau demo dimatikan.

### 2.2 (b) Rollback hari ini
Tidak ada mekanisme down. `backup` hanya untuk PG lokal dan **dingin**: menolak jalan saat Postgres hidup (`server/cli/backup.ts:51-58`), jadi butuh downtime; PG eksternal: `pg_dump -Fc` manual (`backup.ts:41`). Rollback binary: `install.sh` mendukung pin versi (`SIMPLE_PM_VERSION`). Mode maintenance sudah ada (`app_setting.maintenance_enabled`, migrasi 0009) dan bisa dipakai sebagai jendela migrasi.

### 2.3 (c) Dokumen yang usang / wajib
- **CLAUDE.md** (baris): `7` ("Project ini template… project turunan… role `user`"); `9` (cara daftar rute: berubah bila registrasi di-stub); `12` (`home.tsx` "placeholder"); `13` (larangan fitur produk di `/dashboard` + "user → /app" — bertentangan dengan Pengguna/Pengaturan tim Admin di `/dashboard` dan role `member`/`project_manager`); `42-43` (daftar confirm: tambah setujui/tolak/nonaktifkan akun, hapus proyek/tugas, kosongkan sampah); `110,112` (contoh OG "Fullstack Template"); bagian Test (stub `resolveUserRole` → `'user'`, catatan `super-admin` diturunkan); `348` (22 pemeriksaan statis + aset dinamis ≈ 23: perlu diperbarui bila ditambah); catatan tanggal `timestamptz` (cast `::timestamptz`, bukan `::timestamp`) untuk tabel baru.
- **README.md**: `3` ("Fullstack template", keputusan editorial: *tanya user*), `35` (auth: Google saja), `40` dan `246` ("14 halaman" sedangkan `CONSOLE_PAGE_COUNT = 15` di `server/landing-stats.ts:7` — sudah drift sebelum program ini), `290-298` (tabel role/area), `311-316` ("Template ini dipakai sebagai dasar project lain"), `318-333` (Mode demo), `370` (daftar migrasi 0008–0012; tambah 0013+), `119` (URL install menunjuk `bipprojectbali/makuro-template`). README **dilayani publik** dan dipindai `tests/readme-endpoint.test.ts:54-60` (tanpa secret/DSN).
- **CHANGELOG.md `[Unreleased]`** (`:7-`): berisi 4 butir fitur demo di baris 15–18 (Coba Demo, saklar, banner, aksi diblokir). 0.2.0 dirilis 2026-10-06 dan migrasi 0013 "belum dirilis" → demo **belum pernah sampai ke pengguna**; ASUMSI: hapus butirnya, bukan menambah `Removed`. Entri baru: bahasa Indonesia, sudut pandang user. Rilis: `scripts/release-notes.ts` menolak tag ≠ `v<version>` atau versi tanpa section.
- **Inkonsistensi repo rilis:** `package.json` `repository` dan default `install.sh:16`/`server/pkg.ts:7-9` menunjuk `bipprojectbali/makuro-template`, sedangkan `git remote` origin = `nicoarya20/JP-ATLAS`. `release.yml` menerbitkan ke repo tempat tag di-push, sehingga `upgrade`/`install.sh` bisa mengunduh dari repo yang salah. Di luar cakupan, tapi memblokir rilis biner nyata.
- `.gitignore` hanya mengecualikan biner lama (`/makuro-template`, `/makuro*`); biner baru `./simple-pm` (hasil `smoke:binary`/`smoke:coldboot`) **tidak** diabaikan (risiko ter-commit).

### 2.4 (d) Smoke dan kendala lingkungan
- Aturan CLAUDE.md §Build: sentuh `server/`, `app/entry.server.tsx`, `app/root.tsx`, logger, skrip build → `smoke:prod` **dan** `smoke:binary`; sentuh `local-pg/` atau `cli/` → tambah `smoke:coldboot`. `SMOKE_CHECKS` = 22 entri statis (`scripts/smoke-server.checks.ts:33`, dihitung dengan `bun -e`) + pemeriksaan aset dinamis.
- Pekerjaan program ini hampir semuanya menyentuh `server/` ⇒ `smoke:prod` + `smoke:binary` wajib di hampir tiap irisan. Menambah **migrasi** tidak termasuk pemicu `smoke:coldboot` di aturan sekarang, padahal itu satu-satunya uji migrasi yang tertanam di biner (usul §3.9).
- **Bun:** lokal **1.3.14** (`bun --version`; rilis 2026-05-13), CI/release dan `stack.md:26` **1.4.2** (`ci.yml:17`, `release.yml:14`), terbaru **1.4.3** (2026-10-10); `Dockerfile:2,9` memakai `oven/bun:1` (mengambang). Biner `--compile` membawa runtime Bun yang mengompilasinya (perilaku standar Bun, ASUMSI), jadi `smoke:binary` lokal tidak menguji artefak yang dikirim CI. Catatan rilis GitHub 1.4.0/1.4.2 (hanya saya saring dengan kata kunci: compile, asset, install, test) tidak menunjukkan perubahan relevan yang bisa saya verifikasi; selisih perilaku = ASUMSI.
- **Env:** `.env` hanya berisi satu variabel (`PENPOT_TOKEN`, tak terkait), **tanpa `BETTER_AUTH_SECRET` dan `DATABASE_URL`**. `server/env.ts:19-22` mewajibkan `DATABASE_URL` (URL) dan `BETTER_AUTH_SECRET`; `server/db/index.ts` memuat env ⇒ `bun run test` pun diperkirakan gagal tanpa `BETTER_AUTH_SECRET` (inferensi dari kode; tidak dijalankan). `smoke:prod` (`server/prod.ts`) tidak menyalakan PG lokal (CLAUDE.md §Test; `prod.ts` tidak saya buka), jadi butuh `DATABASE_URL` eksplisit; `smoke:binary` memakai mode lokal tetapi tetap butuh secret. Env proses menang atas `.env` (`scripts/smoke-server.ts:27-31` menimpa `PORT`/`NODE_ENV` lewat env `Bun.spawn`).
- PG milik user di mesin ini = Homebrew `postgresql@14` (PID 972; port 5432 = default, ASUMSI); cluster app tidak berjalan (`/tmp/simple_pm-pg-501` kosong). Runtime cache ada (`~/.cache/simple-pm/{pg,rustfs}`). Jangan `pkill` (CLAUDE.md).
- **Worktree tidak mewarisi `.env`** (di-.gitignore), dan **bentrok sumber daya**: PG lokal default port `54329` dan socket `/tmp/simple_pm-pg-<uid>` bersama (`paths.ts:35-38,58`), RustFS `54330` (`local-s3/paths.ts:7,38`); data dir relatif cwd (`paths.ts:31-33`) sehingga cluster per worktree terpisah tetapi **port/socket sama**; preload test memakai ulang cluster yang terjangkau (`test-db.ts:27`) dan DB `<db>_test` ⇒ dua agent menghapus baris satu sama lain.
- `bun audit` (hari ini): **7 kerentanan: 1 critical** (`proxy-addr` via `@modelcontextprotocol/sdk › express`), **2 high** (`@modelcontextprotocol/sdk` langsung `^1.30.0` <1.31.0; `source-map-js`), 4 moderate. Aturan global §10: wajib dilaporkan ke user; **belum ditindaklanjuti di riset ini**.

### 2.5 (e) CI sekarang
`ci.yml` (satu job): checkout → setup-bun 1.4.2 → `install --frozen-lockfile` → `lint` → `typecheck` → `db:migrate` → `test` terhadap service `postgres:18`. `release.yml`: `verify` (catatan rilis) → `build` (`typecheck`, `react-router build`, kompilasi 4 target; **tanpa test, lint, atau smoke biner**) → `release`. Tidak ada: build di CI PR, deteksi drift schema↔migrasi, smoke, audit dependensi, pemindaian secret, pin Bun terpusat. Di CI mode storage lokal akan mengunduh RustFS (~88 MB) per run (`test-storage.ts`, gagal-lunak).

### 2.6 (f) Seed / data contoh
Satu-satunya seed: `server/demo/seed.ts` (`seedDemo(userId)`, 2 baris `post`) milik demo anonim yang akan dimatikan; kontraknya "FK `user.id` + `onDelete: 'cascade'`" (README `:332`) **tidak cocok** untuk data proyek (menghapus akun tak boleh menghapus proyek tim). Login produksi = Google + undangan, jadi presentasi tak bisa memakai akun fiktif ber-password di prod. Email/password hanya di non-production (keputusan final).

### 2.7 (g) Titik rawan konflik — lihat tabel di §3.7 (bukti per baris).

## 3. Rekomendasi

### 3.1 (a) Migrasi: schema-first, berurutan, satu pemilik
**Keputusan.** Gelombang 0 menulis **semua** tabel MVP dan migrasinya sekaligus, dalam 4 migrasi bernama (`--name`), sebelum irisan fitur paralel:
| Migrasi | Isi |
|---|---|
| `0014_account_lifecycle` | role `user`→`member`, `account_status`, `profile`, `invitation` |
| `0015_project_core` | proyek, anggota, tahapan, milestone, riwayat proyek |
| `0016_task_core` | tugas, jenis, checklist, komentar, lampiran, dependensi, review, aktivitas, tag |
| `0017_workspace` | events, inbox, tim/trash/pengaturan sesuai R-lain (ASUMSI; saya tidak menghitung tabelnya) |

Tabel ditunda ke fase 5 **tidak dibuat**: `project_story_drafts`, `project_templates`, `task_import_jobs` (brief). Dari 22 tabel ERD (`gabungan.md`) + undangan awal tersisa ±20 di 0014–0016, ditambah 13 yang ada ⇒ ±35–40 tabel.
- **Jendela squash:** 0014+ belum pernah diterapkan di prod (ASUMSI: 0013 pun belum dirilis) ⇒ sampai tag rilis pertama, 0014+ boleh dibuang dan digenerate ulang. Setelah tag: append-only.
- Perubahan skema sesudah freeze: lewat "baton" (satu cabang pada satu waktu), additif, nomor berikutnya.
- **Tanpa `pgEnum`**: pakai `text` + union TypeScript (`$type<…>()`) dan konstanta bernama; alasan: migrator satu transaksi (`dialect.js:60`) + `ALTER TYPE ADD VALUE`, `DROP VALUE` tak ada, dan kodebase sudah memakai `text` untuk role. Ejaan `canceled`/`cancelled` (`02-proyek.md:315`) selesai di satu konstanta.
- Gaya skema: id `text` `$defaultFn(() => crypto.randomUUID())` (seperti `post`), `timestamptz` (`{ withTimezone: true }`) untuk tabel baru. Nama tabel singular snake_case mengikuti fondasi (`post`, `audit_log`, `api_key_usage`) — **bertentangan dengan ERD plural** (`projects`, `tasks`); lihat pertanyaan #1.
- Berkas: `schema.<domain>.ts` ≤200 baris tiap file (aturan skema): `schema.account.ts`, `schema.project.ts`, `schema.project-history.ts`, `schema.task.ts`, `schema.task-work.ts`, `schema.workspace.ts`.

**Guard otomatis (3 lapis; keputusan):**
1. **`scripts/db-generate.ts`** (wrapper; `package.json` `db:generate` memanggilnya; ≤200 baris). Menjalankan `drizzle-kit generate --name=<slug>`, menemukan entri journal baru, lalu menulis ulang `.sql` (snapshot tak disentuh):
   | Keluaran drizzle | Hasil |
   |---|---|
   | `CREATE TABLE "x" (` | `CREATE TABLE IF NOT EXISTS "x" (` |
   | `CREATE [UNIQUE] INDEX "i"` | `… INDEX IF NOT EXISTS "i"` |
   | `ADD COLUMN "c"` | `ADD COLUMN IF NOT EXISTS "c"` |
   | `ADD CONSTRAINT … FOREIGN KEY` | dibungkus `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;` (bentuk `0008:16-18`) |
   | `DROP TABLE/COLUMN/INDEX` | `… IF EXISTS` + wajib penanda `-- destructive-ok: <alasan>` |

   Wajib argumen `--why="<alasan ≥20 karakter>"` yang ditulis sebagai komentar baris pertama (aturan §4: *kenapa*, bukan *apa*; tanpa TODO kosong). Langkah data (UPDATE/INSERT) memakai `generate --custom --name=…` lalu diisi tangan.
2. **`tests/db/migrations-guard.test.ts`** (bentuk, tanpa DB): untuk idx ≥ `GUARDED_FROM = 4`: tiap DDL ber-guard; baris pertama komentar; tiap `ALTER COLUMN … SET NOT NULL` didahului `UPDATE` pada tabel yang sama di file yang sama atau kolom baru dengan `DEFAULT`; `DROP` punya `destructive-ok`; journal: idx berurutan tanpa celah, `when` **naik ketat**, setiap tag punya `.sql` + `_snapshot.json`, rantai `prevId`→`id` utuh; idx ≥ 14 punya pasangan `.down.sql` (§3.2) atau `-- no-down: <alasan>`. 0000–0003 dikecualikan lewat konstanta bernama (bukti §2.1).
3. **`tests/db/migrations-idempotent.test.ts`** (bukti nyata): terhadap DB test yang sudah termigrasi oleh preload, jalankan ulang semua statement migrasi idx ≥ 4 dalam satu transaksi lalu rollback; harapannya tidak ada error. Ini membuktikan "aman dijalankan ulang di prod" (aturan §4) tanpa mempercayai regex.

**Ditolak:** (i) *edit tangan saja* — 10/10 migrasi terakhir memang begitu, tetapi ±35 `CREATE TABLE` + puluhan FK/index rawan lupa dan tak ada gerbang; (ii) *tambal `bin.cjs`* atau fork drizzle-kit — rapuh tiap update; (iii) *`drizzle-kit push` di prod* — tanpa riwayat, tanpa guard; (iv) *migrator kustom* — mengganti fondasi tanpa manfaat; (v) *hanya test penjaga tanpa wrapper* — mendeteksi tetapi menyuruh manusia/agent mengedit 35+ statement.

**Data lama (contoh isi `0014`, idempoten):**
```sql
-- Why: role `user` diganti `member` (diskusi/00-role-dan-area.md §1); akun lama dianggap sah (§4).
UPDATE "user" SET "role" = 'member' WHERE "role" IS NULL OR "role" = 'user';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "account_status" text;--> statement-breakpoint
UPDATE "user" SET "account_status" = 'approved' WHERE "account_status" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "account_status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "account_status" SET NOT NULL;
-- profile: INSERT … SELECT id FROM "user" ON CONFLICT DO NOTHING (id via gen_random_uuid()::text, PG13+)
```
Urutan aman (expand/contract): kode baru menormalkan nilai tak dikenal ke role default, sehingga kode lama dengan baris `member` dan kode baru dengan baris `user` sama-sama tidak rusak; jalankan migrasi dalam mode maintenance supaya akun yang daftar di antara migrasi dan deploy tidak berstatus `pending` tanpa halaman tahan. User anonim demo lama: biarkan ke cleanup demo atau tandai `rejected` (pertanyaan #5). **Jangan `DROP` kolom demo** sekarang (destruktif tanpa manfaat); matikan lewat `demo_enabled=false` dan hapus kode di irisan `chore/pm-remove-demo` (4 file test demo, 328 baris).

### 3.2 (b) Rencana rollback (expand/contract + 4 tingkat)
| Tingkat | Situasi | Tindakan |
|---|---|---|
| L0 | migrasi gagal saat deploy | otomatis rollback satu transaksi (`dialect.js:60`); perbaiki, ulangi; `doctor` memeriksa "N pending" |
| L1 | bug aplikasi, skema masih kompatibel | pasang biner sebelumnya (`SIMPLE_PM_VERSION=v<lama>`, README `:120`/`install.sh`); aman karena migrator biner lama tidak punya migrasi pending (`dialect.js:62`) |
| L2 | data rusak | restore backup **pra-deploy**: lokal `systemctl stop … && <bin> backup` (dingin, ada downtime, `backup.ts:51-58`); eksternal `pg_dump -Fc` / `pg_restore` |
| L3 | perlu mundur skema tanpa kehilangan data | `server/db/rollback/NNNN_<nama>.down.sql` (di luar folder `migrations` agar tak ikut embed/journal), idempoten; setelah dijalankan hapus barisnya: `DELETE FROM drizzle.__drizzle_migrations WHERE created_at = <when>` |

Aturan expand/contract: dalam satu rilis hanya langkah *expand* (tabel/kolom baru, nullable atau ber-DEFAULT, index); langkah *contract* (`DROP`, rename, `SET NOT NULL` tanpa default, ubah tipe) minimal satu rilis kemudian, setelah biner lama tak diperlukan. Gerbang pra-deploy: backup berhasil + maintenance ON + `doctor` hijau; dicatat di checklist §3.10 baris 8.
**Ditolak:** "down otomatis ala Drizzle" (tidak ada di 0.45/0.31), dan "restore backup sebagai satu-satunya rollback" (kehilangan data sejak backup).

### 3.3 Prod eksternal: subcommand `migrate` **[FONDASI, kecil]**
`server/cli/migrate.ts` (kontrak `run(argv): Promise<number>`, daftarkan di `server/cli/index.ts`; `--status` menampilkan pending tanpa menerapkan; impor `runMigrations` dari `local-pg/boot` secara dinamis, tanpa `server/env`/`server/db` di top-level, sesuai CLAUDE.md §CLI). Deploy Docker: `server/binary-entry.ts migrate && … start` (urutan di compose/entrypoint). Perbaiki petunjuk `doctor.checks.ts:153`. Biaya ±0,5–1 hari + test seperti `tests/cli/*`. **Ditolak:** auto-migrate saat `start` eksternal (balapan multi-instance; bertentangan dengan komentar `dev-entry.ts:7`) dan memasukkan drizzle-kit + config ke image runtime (membawa devDependencies; esbuild ber-advisory).

### 3.4 (c) Kewajiban dokumen per irisan
| Dokumen | Aturan | Pemilik |
|---|---|---|
| CHANGELOG `[Unreleased]` | tiap irisan menambah butir (ID, sudut user) di commit yang sama; `.gitattributes`: `CHANGELOG.md merge=union` agar append dari dua cabang tak konflik (ASUMSI: perlu uji coba merge pertama); integrator merapikan sebelum rilis | irisan → integrator |
| README (kontrak publik) | hanya bagian kontrak yang berubah (aturan §16). Fase 0 membuat **heading kosong per modul** (mis. "## Proyek (`/app/projects`)") agar hunk tiap irisan terpisah | irisan (bagiannya); Fase 0 (kerangka) |
| README baris editorial (`3`, `35`, `40/246`, `290-298`, `311-316`, `318-333`) | ubah oleh **Fase 0/integrator** setelah user menyetujui narasi; irisan *tidak* menyentuh | integrator |
| CLAUDE.md | daftar baris usang di §2.3; ditulis ulang **sekali** di Fase 0b ("repo ini produk Simple PM, bukan template"), irisan hanya mengusulkan lewat deskripsi PR | Fase 0 |
| Docstring satu baris untuk modul/fungsi publik baru, keputusan non-obvious → komentar atau `docs/decisions/` | per irisan | irisan |
Versi: rilis ini mengubah kontrak (role, Google-only, demo off, API) → usul **0.3.0** (SemVer 0.x minor); bump `package.json` + section CHANGELOG di satu commit, lalu tag `v0.3.0` (CLAUDE.md §CHANGELOG). Tidak ada tag/deploy tanpa perintah eksplisit user.

### 3.5 (d) Aturan smoke dan perbaikan lingkungan
- **Matriks:** irisan menyentuh `server/` atau `app/root.tsx`/`entry.server.tsx` ⇒ `smoke:prod` + `smoke:binary`. **Tambahan usulan:** irisan yang menambah/ubah **file migrasi** ⇒ juga `smoke:coldboot` (cukup di cabang schema 0014–0017 dan tiap migrasi susulan; bukan tiap irisan UI). Murni UI di `app/routes/app/*` ⇒ cukup test + typecheck + lint + `build`, smoke dijalankan di tiap merge ke cabang integrasi oleh integrator.
- Tambah 3 `SMOKE_CHECKS` (nama unik, `tests/smoke-server.test.ts` menjaganya): `/app` anonim → redirect `/login`; `/api/app/projects` anonim → 401 JSON; `/dashboard` anonim → login.
- **Perintah (tanpa menyentuh `.env`):**
  - test: `BETTER_AUTH_SECRET=$(openssl rand -base64 32) bun run test`
  - `smoke:binary`: `BETTER_AUTH_SECRET=… LOCAL_PG_DIR=/tmp/spm-smoke/pg LOCAL_PG_PORT=<bebas> LOCAL_S3_DIR=… LOCAL_S3_PORT=<bebas> bun run smoke:binary` (dir/port terpisah dari dev, CLAUDE.md)
  - `smoke:prod`: tambah `DATABASE_URL=<URL DB test eksternal>`; di mode lokal perlu cluster yang berjalan (mis. `bun run dev` user) dan URL `…/<db>_test?host=<socketDir>` — jangan pernah menunjuk ke dev server user.
- **Bun:** satu sumber kebenaran `.bun-version` = `1.4.2` (CI: `setup-bun` `bun-version-file`; `stack.md`; `Dockerfile` pin `oven/bun:1.4.2`); developer menyamakan Bun lokal dengan 1.4.2 (atau naik ke 1.4.3 di semua tempat sekaligus lewat satu PR `chore(ci)`). Sebelum itu, hasil `smoke:binary` lokal ditandai "Bun 1.3.14" di laporan dan CI jadi gerbang final.
- **Dependensi:** laporkan temuan `bun audit` (1 critical, 2 high) ke user sebelum irisan pertama; usul `bun update` terpisah (`chore(deps)`), jangan dicampur ke irisan fitur.

### 3.6 (e) Tambahan CI (urut prioritas)
1. `ci.yml`: langkah `bun run build`; job **schema-drift**: `bunx drizzle-kit generate --name=drift` (mentah, bukan wrapper; tidak menyentuh DB) lalu gagal bila `git status --porcelain server/db` tidak kosong (memenuhi aturan §4 "bandingkan schema aktif vs migrasi").
2. Test penjaga migrasi (§3.1) otomatis ikut `bun run test`; CI sudah punya `postgres:18` untuk uji idempoten.
3. Job **smoke** setelah test: `bun run smoke:prod` (DB service + secret CI ada) dan `bun run smoke:binary` (ubuntu-24.04).
4. `smoke:coldboot` hanya via filter `paths:` (`server/db/migrations/**`, `server/local-pg/**`, `server/cli/**`, `scripts/build-binary.ts`) atau `workflow_dispatch`/malam (unduh PG ±53 MB + RustFS ±88 MB, butuh `unzip`).
5. `release.yml`: sebelum `gh release create`, smoke biner linux-x64 hasil kompilasi (`bun scripts/smoke-server.ts ./dist/simple-pm-linux-x64`), plus `lint`+`test` di `verify`/`build` (sekarang tidak ada).
6. `bun audit --audit-level=high` sebagai langkah **informatif** dulu (sudah merah hari ini); jadikan gerbang setelah temuan di §2.4 ditangani. Pemindaian secret: awali dengan `grep` seperti §3.10 baris 6; action pihak ketiga (gitleaks) = dependensi baru, butuh persetujuan user.
7. `bun-version-file`, cache `~/.bun/install/cache`, `Dockerfile` pin. Trigger `push` hanya `main`; PR ke `feature/project-management` tetap tercakup oleh `pull_request`.

### 3.7 (g) Titik rawan konflik dan cara menghindarinya
| File bersama | Bukti (kondisi sekarang) | Risiko | Mitigasi / pemilik |
|---|---|---|---|
| `server/db/migrations/*` (`.sql`, `_journal.json`, `meta/NNNN_snapshot.json`) | idx/snapshot bernomor; `when` = `Date.now()` | **Tertinggi**: dua cabang → `0014` ganda, journal tak ter-merge, `when` salah urut ⇒ dilewati (`dialect.js:62`) | schema-first §3.1; satu baton; cabang yang kalah **tidak di-merge tapi digenerate ulang**: `git checkout <integrasi> -- server/db/migrations && bun run db:generate -- --name=… --why=…`; reset DB dev/test lokal (`rm -rf data/pg` atau `DROP DATABASE <db>, <db>_test`) setelah generate ulang. Pemilik: **pemilik skema** |
| `server/db/schema.ts` (barrel, 9 baris) + `drizzle.config.ts:7-12` | 4 `export *` / 4 path eksplisit | baris bersebelahan ⇒ konflik | Fase 0: semua `export * from './schema.<domain>'` + file stub; `drizzle.config.ts` → glob `'./server/db/schema.*.ts'` (tidak mencocokkan `schema.ts`/`schema-*.ts`; ASUMSI glob diterima drizzle-kit 0.31.10, uji dengan `generate` kosong). Pemilik: Fase 0 |
| `app/routes.ts` (34 baris) | rute `/app` ditambah per baris di `layout('routes/app/layout.tsx', [...])` | konflik baris bersebelahan | Fase 0 mendaftarkan **semua** rute MVP (`projects`, `tasks`, `events`, `team`, `inbox`, `trash`, `settings` + `projects/:id`) dengan halaman stub (loader `requireUser`, `meta()`); irisan hanya mengisi isi halaman. `tasks/:id` ditunda sampai R05 memutuskan halaman vs drawer. Alternatif ditolak: array rute per modul — `tests/app-contracts.test.ts:6-13` memindai teks `routes.ts` dengan regex, rute di file lain lolos dari cek `meta()` |
| `app/routes/app/layout.tsx` (`NAV` `:18-21`, `BADGE_COLOR` `:30-34` berkunci role `user`) | array tunggal | konflik + role lama | Fase 0 mengisi 8 menu final + 4 role; badge Inbox (`withBadges`) milik irisan Inbox saja |
| `server/api/app.ts` (36 baris, rantai `.get/.post`) | fitur ditambah ke rantai yang sama | konflik | Fase 0: `.use(appXApi)` untuk tiap modul + file `server/api/app-<modul>.ts` (konvensi saudara `app-avatar.ts`); `index.ts` tak disentuh karena semua di bawah `appApi` |
| `server/api-keys/scopes.ts` (190 baris) + `tests/api-keys/scopes.test.ts` | `/api/app/*` sudah → `app:read/app:write` (`:166`) | rename role mengubah `ROLE_RANK` `:122` dan 4 `minRole: ROLES.USER` | Irisan fitur **tidak perlu** menyentuhnya; hanya Fase 0 (role). Tiap irisan menambah 1 assertion di test scopes *di file test modulnya sendiri*. Catatan file-health: file sudah ±190 baris |
| Rename role `user→member` | ±112 baris cocok (`grep` `'user'`/`ROLES.USER` di `server app tests`, termasuk positif palsu); banyak test men-stub `resolveUserRole → 'user'` | konflik masif di tes lintas irisan | **Merge duluan** (M1) sebelum irisan mana pun bercabang; `normalizeRole` memetakan nilai lama |
| `app/components/landing/landing.content.ts` (284 baris) + `server/landing-stats.ts:7` + `tests/landing-stats.test.ts:21-22` | `CONSOLE_PAGE_COUNT` dihitung dari rute `path` berawalan `dev`; `tables` otomatis dari schema | fitur produk tak mengubahnya; konflik hanya bila ada halaman `/dev` baru (lima tempat, CLAUDE.md §/dev) | Larangan: irisan produk **tidak menambah** halaman `/dev`. Copy landing/`Hero.tsx:151` ("tabel siap pakai") = tugas integrator |
| `CHANGELOG.md` | append di `[Unreleased]` | konflik append | `merge=union` + integrator §3.4 |
| `README.md` / `CLAUDE.md` | satu file panjang | konflik | heading per modul dari Fase 0; bagian editorial hanya integrator |
| `package.json` / `bun.lock` | dependensi baru wajib dilaporkan (aturan §10) | lock tak ter-merge | irisan **tidak** menambah dependensi tanpa persetujuan user; bila ada, integrator yang menjalankan `bun install` setelah merge |
| `app/lib/audit-api.ts` (`ACTION_META`) | satu objek label aksi | konflik adjacent (sedang) | aksi admin (Pengguna) satu irisan; irisan lain memakai blok label terpisah yang dibuat Fase 0 (ASUMSI struktur objek; saya tidak membuka file) |
| Sumber daya runtime | port/socket/DB test bersama (§2.4) | test saling menghapus data | env per worktree (§3.8) |

### 3.8 Cabang, worktree, urutan merge, commit/PR
**Prasyarat P0 (menghalangi semuanya):** `git status` = 100 entri (98 file termodifikasi + 2 untracked; `git diff --shortstat`: +234/−222) berupa rebrand `makuro`→`simple-pm` yang belum di-commit. `git worktree add` bercabang dari commit, **bukan** working tree ⇒ semua worktree memakai nama lama. Commit dulu sebagai commit terpisah per concern (mis. `chore(brand): rename package, env vars and binary to simple-pm`; `docs(project): add decision notes`) oleh user/agen dengan izin eksplisit; jangan push.
**Topologi** (aturan §2: tidak ada commit fitur ke `main`; merge hanya setelah user menyetujui):
```
main
 └─ feature/project-management           ← cabang integrasi (reviewer manusia menyetujui tiap merge)
     ├─ feature/pm-foundation-roles      F0a: role, status akun, undangan, login Google, migrasi 0014
     ├─ feature/pm-foundation-schema     F0b: schema.* + 0015–0017, stub rute/API/README, wrapper+test penjaga, CLAUDE.md
     ├─ feature/pm-projects | pm-tasks | pm-workspace | pm-admin-dashboard   (paralel, dari F0b)
     ├─ chore/pm-remove-demo | chore/pm-ci | chore/pm-seed | chore/pm-docs   (paralel, tak menyentuh migrasi)
     └─ fix/pm-<x>
```
**Urutan merge:** M0 commit rebrand → M1 `foundation-roles` → M2 `foundation-schema` → irisan paralel (urut selesai; yang kedua dst. **rebase** ke integrasi, jalankan ulang test) → M3 integrator: CHANGELOG, README editorial, versi 0.3.0 → PR `feature/project-management`→`main` → (hanya atas perintah user) tag/deploy. Gaya merge repo: `git merge --no-ff` dengan pesan `merge: <deskripsi>` (riwayat: `02f6edc`, `55ede32`).
**Aturan kepemilikan file bersama:** Fase 0 = {`routes.ts`, `layout.tsx` NAV, `app.ts`, barrel, `drizzle.config.ts`, `scopes.ts`, `permissions.ts`, `guard.ts`, CLAUDE.md, kerangka README}; pemilik skema = migrasi; integrator = {landing, CHANGELOG akhir, README editorial, `package.json`/lock, versi}. Irisan hanya mengubah file miliknya (`routes/app/<x>*.tsx`, `server/api/app-<x>*.ts`, `schema.<x>.ts` bila baton, `server/<x>/*`, `tests/**/<x>*`). Edit di luar daftar ⇒ minta lewat pemilik, bukan diam-diam.
**Env per worktree** (worktree tak mewarisi `.env`; nilai contoh, bukan rahasia):
`PORT=31NN LOCAL_PG_PORT=544NN LOCAL_S3_PORT=545NN LOCAL_PG_DB=simple_pm_wtNN LOCAL_PG_SOCKET_DIR=/tmp/spm-wtNN BETTER_AUTH_SECRET=$(openssl rand -base64 32) APP_URL=http://localhost:31NN BETTER_AUTH_URL=http://localhost:31NN`.
Alasannya di §2.4. Instalasi dependensi dilakukan per worktree (`bun install --frozen-lockfile`, cache Bun bersama; ASUMSI cepat).
**Skenario commit** (aturan §9; Inggris, imperative, satu concern): `feat(account): add invitation table and approval status`, `chore(db): add guarded migration generator`, `test(db): assert migrations are idempotent`, `feat(projects): add project list api`, `feat(tasks): add task status transitions`, `refactor(auth): rename user role to member`, `docs(readme): document projects api`, `chore(ci): add schema drift check`. Commit berkala; commit migrasi terpisah dari kode (`feat(db): add project core tables (0015)`).
**Deskripsi PR** (aturan §14) + tambahan: Apa yang berubah · Kenapa · Cara test manual (langkah konkret) · Breaking change (role, Google-only, demo off) · Screenshot/output · **Migrasi** (nomor, guard ya/tidak, ada `.down.sql`, sudah dijalankan ke DB dev **dan** test) · **Smoke** (perintah + hasil + versi Bun) · Dampak dokumen · Hutang teknis (aturan §17/§18).

### 3.9 (f) Seed untuk dev dan presentasi
**Keputusan:** subcommand `seed` **[FONDASI, kecil]** (`server/cli/seed.ts` + `server/seed/*`; impor env/db dinamis) — bukan SQL mentah dan bukan `seedDemo`.
- Idempoten: id tetap berprefiks `seed_` (kolom id `text`) + `ON CONFLICT DO NOTHING`; email `*@example.test` (test-only). `seed --reset` menghapus hanya baris berprefiks itu (tidak ada `DELETE` global, selaras CLAUDE.md §Test).
- Isi: anggota fiktif (tanpa akun login) di 4 role, 3 proyek berbeda kondisi (berjalan, terlambat, selesai), ±25 tugas dengan campuran status, checklist, komentar, 4 acara, kartu Inbox, 1 undangan pending, beberapa item di Sampah. **Tanggal relatif ke "hari ini"** agar label Terlambat/Tertahan tetap benar saat presentasi (`seed --refresh-dates`).
- Presentasi dengan Google-only: `seed --owner=<email Google presenter>` membuat undangan `approved` + menautkan presenter sebagai Pengelola proyek; tidak membuat kredensial.
- Dev lokal: bila email/password aktif (non-production), akun dev dibuat lewat API server Better Auth dengan kata sandi dari `SEED_DEV_PASSWORD` atau acak yang dicetak sekali (tanpa hard-code, aturan §15).
- Pengaman: menolak bila `NODE_ENV=production` kecuali `ALLOW_SEED=1`; menolak bila DB eksternal tak bernama `*_test`/dev tanpa `--force`.
- Test memakai fixture sendiri (pola `spyOn`), bukan seed.
**Ditolak:** `drizzle-seed` (dependensi baru, data acak tak terkurasi), seed di dalam migrasi (mencemari prod), memakai ulang `seedDemo` (terikat user anonim + cascade).

### 3.10 (h) Checklist pra-deploy (aturan §6) → perintah nyata
| # | Item | Perintah / bukti di project ini |
|---|---|---|
| 1 | Test | `BETTER_AUTH_SECRET=… bun run test` (semua hijau; DB test via preload) |
| 2 | Type check | `bun run typecheck` → **nol** error tanpa filter |
| 3 | Lint | `bun run lint` (`biome check .`) |
| 4 | Build | `bun run build`; `bun run smoke:prod`; `bun run smoke:binary`; `bun run smoke:coldboot` bila ada migrasi/`cli/`/`local-pg/`; catat versi Bun |
| 5 | Migrasi tanpa celah | `bunx drizzle-kit generate --name=drift` ⇒ `git status --porcelain server/db` kosong (bila muncul file = ada celah: hapus file itu, buat migrasi sah lewat wrapper); test penjaga hijau; `<bin> doctor` (Migrasi "N diterapkan"); badge `/dev/db-schema`; `<bin> migrate --status` (setelah §3.3) |
| 6 | Secret/credential | `git diff --cached --name-only \| grep -E '(^\|/)\.env(\.\|$)\|\.(pem\|key\|p12\|pfx)$\|credentials\.json'` (kecuali `.env.example`); `git diff origin/main...HEAD \| grep -nEi "(api_key\|secret\|token\|password)[a-z_]*\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{16,}"`; `tests/readme-endpoint.test.ts`; `bun audit --audit-level=high` (**saat ini ❌: 1 critical, 2 high**) |
| 7 | CHANGELOG | `bun scripts/release-notes.ts v<versi>` exit 0; versi `package.json` = tag; `/dev/changelog` tidak kuning |
| 8 | Breaking/rollback | tabel breaking (role→`member`, login Google-only, demo off, prefix/scope bila berubah) + tingkat L0–L3 §3.2, lokasi backup pra-deploy, versi biner sebelumnya |

Laporan pra-push (aturan §18): hutang teknis = `git diff origin/main...HEAD -U0 \| grep -nE "TODO\|FIXME\|@ts-ignore\|eslint-disable\|biome-ignore"`; file health = `tests/file-health` dan `/dev/file-health` (batas: schema ≤200, route ≤150, test ≤400, keras 500 baris/20.000 karakter; migrasi dikecualikan, `server/file-health/file-health.rules.ts:133`).

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Migrasi cabang dilewati diam-diam karena `when` lebih kecil (`dialect.js:62`) | Tinggi bila migrasi dibuat paralel | Tinggi: tabel hilang di DB tertentu, bug misterius | Schema-first + baton; test `when` naik ketat; generate ulang di cabang integrasi; reset DB lokal |
| Guard `IF NOT EXISTS` tak konsisten untuk ±35 tabel | Sedang | Sedang-tinggi: migrasi gagal saat dijalankan ulang di prod | Wrapper + test bentuk + test idempoten (§3.1) |
| Prod Docker/eksternal lupa migrasi → "relation does not exist" | Tinggi (tidak ada langkahnya) | Tinggi | `migrate` + `doctor` pending + urutan di entrypoint; checklist baris 5 |
| Migrasi data role/status mengunci akun yang ada (status `pending`, role asing) | Sedang | Tinggi (semua user terkunci) | Backfill `approved`, uji idempoten, kode menormalkan role tak dikenal, jalankan dalam mode maintenance, backup pra-deploy |
| Worktree paralel saling menimpa PG/RustFS/DB test | Tinggi tanpa env terpisah | Sedang-tinggi: test merah acak, data hilang | Env per worktree §3.8; larangan `pkill`; satu `LOCAL_PG_DB` per worktree |
| Rebrand belum di-commit ⇒ worktree bercabang dari kode lama | Pasti bila P0 dilewati | Tinggi: konflik 98 file di semua cabang | P0 wajib sebelum cabang pertama |
| Selisih Bun lokal 1.3.14 vs CI 1.4.2: smoke lokal lolos, artefak CI gagal (atau sebaliknya) | Sedang | Sedang | `.bun-version` tunggal, smoke biner di `release.yml`, laporkan versi |
| `bun audit` 1 critical + 2 high (MCP SDK/proxy-addr/source-map-js) belum ditangani | Sudah terjadi | Sedang-tinggi (IP spoof di jalur MCP; konteks rate-limit/IP) | Lapor ke user sekarang; `chore(deps)` terpisah; audit gerbang di CI setelah bersih |
| Repo rilis salah (`package.json` → `bipprojectbali/makuro-template`, origin → `nicoarya20/JP-ATLAS`) | Sedang | Tinggi saat rilis biner pertama | Putuskan repo rilis sebelum tag (pertanyaan #3); set `repository` + `SIMPLE_PM_REPO` |
| Rollback gagal karena `contract` dilakukan terlalu dini | Rendah-sedang | Tinggi | Aturan expand/contract + test `destructive-ok` + `.down.sql` |
| Test penjaga/CI memperlambat tiap PR (smoke + RustFS unduh) | Sedang | Rendah | `paths:` filter, cache, `coldboot` terjadwal |
| Perubahan skema setelah freeze memicu migrasi susulan di tengah jalan | Sedang | Sedang | Jendela squash sebelum rilis; baton; additif |

## 5. Estimasi usaha (pekerja AI, hari-orang; belum termasuk reviewer)

| Pekerjaan | Ukuran | AI | Reviewer manusia |
|---|---|---|---|
| P0 commit rebrand + `.gitignore` biner baru + `.bun-version` + Dockerfile pin | S | 0,3–0,5 | 0,25 |
| Wrapper `db-generate` + `migrations-guard` + `migrations-idempotent` | M | 1,5–2,5 | 0,5 |
| Subcommand `migrate` + perbaikan `doctor` + test | S | 0,5–1 | 0,25 |
| F0a: rename role, status akun, undangan, 0014 + penyesuaian ±112 baris test | L | 3–5 | 1 |
| F0b: schema semua domain + 0015–0017 + stub rute/API/README + CLAUDE.md | L | 4–6 | 1 |
| Penambahan CI (drift, build, smoke, audit, release smoke) | M | 1–1,5 | 0,5 |
| Seed CLI + dataset + test | M | 2–3 | 0,5 |
| Dokumen (CHANGELOG, README kontrak, CLAUDE.md) di luar F0 | M | 1,5–2 | 0,5 |
| Runbook worktree/env + skrip bantu + 3 smoke check baru | S | 0,5–1 | 0,25 |
| Rilis 0.3.0 (versi, notes, backup, rollout, verifikasi) | S–M | 1–1,5 | 0,5 |
| **Total bagian ops/rilis** | **L** | **≈ 15–24** | **≈ 5–6** (±8 merge × 0,5 hari tinjau termasuk) |
Ini perkiraan saya (ASUMSI), bukan angka dari sumber; fitur produk itu sendiri tidak termasuk.

## 6. Pertanyaan terbuka untuk user
1. **Penamaan tabel:** ERD memakai plural (`projects`, `tasks`, `profiles`), fondasi singular (`user`, `post`, `audit_log`). Usul: singular (nama tabel + FK + index permanen di migrasi). Setuju?
2. **Squash migrasi sebelum rilis pertama:** setuju 0014+ boleh digenerate ulang sampai tag pertama (dan apakah 0013 benar belum pernah diterapkan di prod)?
3. **Repo rilis:** biner dirilis dari `nicoarya20/JP-ATLAS` (origin) atau `bipprojectbali/makuro-template` (`package.json`, `install.sh`)? Menentukan `repository`/`SIMPLE_PM_REPO`.
4. **Subcommand `migrate` dan `seed` (keduanya [FONDASI] kecil):** disetujui? Alternatif: `drizzle-kit` di image + skrip seed di `scripts/`.
5. **User anonim demo lama saat migrasi:** biarkan ke cleanup demo, hapus di migrasi, atau tandai `rejected`? Dan butir demo di `[Unreleased]`: hapus (belum pernah dirilis) atau tulis `Removed`?
6. **Batas Postgres minimum** (PG14 di mesin dev, pg16 di compose, 18 di embedded/CI): tetapkan PG14 sebagai batas portabilitas migrasi?
7. **Temuan `bun audit` (1 critical, 2 high):** boleh dijadwalkan `chore(deps)` sebelum irisan fitur? Perlu persetujuan karena menyangkut `@modelcontextprotocol/sdk` (dependensi langsung).
8. **Bun:** samakan semua ke 1.4.2 (atau 1.4.3) dan pasang `.bun-version`?
9. **Narasi README/landing** (judul "Fullstack template", teks marketing "tabel siap pakai"): ditulis ulang oleh siapa dan kapan (aturan §16: keputusan editorial milik user)?
10. **CHANGELOG `merge=union`** (`.gitattributes` baru) dan **worktree paralel** dengan cabang `feature/pm-*` seperti §3.8: disetujui?

## 7. Sumber
**Kode/konfigurasi (dibaca 15 Okt 2026):** `package.json`; `drizzle.config.ts:7-12`; `bunfig.toml`; `server/db/{schema.ts,index.ts,schema-introspect.ts,schema-stats.ts,schema.app.ts,schema.auth.ts}`; `server/db/migrations/0000–0013*.sql` + `meta/_journal.json` + `meta/0012,0013_snapshot.json`; `server/local-pg/{boot,paths,test-db,server}.ts`; `server/local-s3/{paths,test-storage}.ts`; `server/dev-entry.ts`; `server/cli/{index,start,init,backup,upgrade,doctor.checks}.ts`; `server/binary-entry.ts`; `server/env.ts`; `server/pkg.ts`; `server/permissions.ts`; `server/roles.ts`; `server/auth.ts`; `server/api/{index,app,openapi}.ts`; `server/api-keys/scopes.ts`; `server/landing-stats.ts`; `server/demo/seed.ts`; `app/routes.ts`; `app/routes/app/layout.tsx`; `app/components/frame/nav.ts`; `app/components/landing/landing.content.ts`; `scripts/{build-binary,smoke-server,smoke-server.checks,smoke-coldboot,release-notes}.ts`; `.github/workflows/{ci,release}.yml`; `Dockerfile`; `docker-compose.yml`; `install.sh`; `CHANGELOG.md`; `README.md`; `CLAUDE.md`; `.env.example`; `.gitignore`; `stack.md`; `tests/{preload,app-routes,app-contracts,landing-stats,seo,readme-endpoint,build-binary}.test.ts`, `tests/api/app.test.ts`, `tests/api-keys/scopes.test.ts`.
**Desain:** `tahapan-proyek/05-implementasi/riset/_BRIEF.md`; `tahapan-proyek/03-desain/erd/diskusi/{00-role-dan-area,02-proyek,07-tim,09-pengaturan}.md`; `tahapan-proyek/03-desain/erd/{gabungan,project,task,user-profile}.md`.
**Pustaka terpasang:** `node_modules/drizzle-orm/pg-core/dialect.js:44-72` dan `migrator.js` (logika migrator); `node_modules/drizzle-kit/bin.cjs` (tanpa literal `IF NOT EXISTS`); `drizzle-kit generate --help` (flag `--name`, `--custom`); `bun audit --help` (`--audit-level`).
**Perintah baca yang dijalankan:** `bun audit` (7 temuan), `bun --version` (1.3.14), `git status/diff --shortstat/log/branch/remote`, `ps` (Postgres), `bun -e` menghitung `SMOKE_CHECKS` (22).
**Web (15 Okt 2026):** registry npm `https://registry.npmjs.org/{bun,drizzle-kit,drizzle-orm}` (dist-tags: bun 1.4.3; drizzle-kit 0.31.11; drizzle-orm 0.45.4; 1.0.0-rc.5 jalur rc); `https://api.github.com/repos/oven-sh/bun/releases` (1.3.14 → 2026-05-13, 1.4.0 → 2026-08-20, 1.4.2 → 2026-09-05, 1.4.3 → 2026-10-10). `WebSearch` tidak tersedia (galat API), sehingga tidak ada rujukan dokumentasi eksternal lain; perilaku `bun-version-file` pada `setup-bun` dan glob `schema` drizzle-kit = ASUMSI.
