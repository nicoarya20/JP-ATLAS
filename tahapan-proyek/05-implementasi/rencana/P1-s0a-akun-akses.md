# P1 — Rencana eksekusi S0.0 (prasyarat ops) dan S0.a (akun dan akses)

> 15 Okt 2026 · tahap 2 (rencana, belum ada kode). Mengikat: `../KEPUTUSAN-MVP-INTI.md`. Kontrak tugas di §4-§5 bisa ditempel ke `orca orchestration worker-start --spec`. Dokumen ini **menggantikan R01 §1 dan §3-§7** (bagian itu kosong); R01 §2 (bukti Better Auth 1.7.3 + kode fondasi) tetap berlaku.

## 1. Ringkasan
1. **23 tugas**: 9 di S0.0 (`S0.0-01..09`, ±5,8 hari-orang AI) dan 15 di S0.a (`S0A-01..15`, ±21 hari-orang AI); kalender S0.a ±10-12 hari kerja (jalur kritis ≈10-12 hari-orang) dengan maks 3 pekerja serentak (batas kuota, memori `worker-token-quota-limit`). Angka di atas R10 §5 (3-5 dan 11-16) karena S0.a di sini sudah memuat pencabutan demo, halaman tahan, dan halaman Pengguna secara penuh (§2.9).
2. **Urutan commit**: tugas pertama `S0.0-01` hanya meng-commit rebrand (98 berkas termodifikasi + 5 berkas catatan belum terlacak) dalam dua commit; **semua tugas lain bergantung padanya** karena worktree lahir dari commit, bukan dari working tree (R14 §3.8). `orca-office` (biner 63 MB, belum terlacak, tidak di-ignore) dan `.mcp.json` (entri Penpot milik user) TIDAK ikut. Tanpa push.
3. Status akun = **kolom `user.approval_status`** (+3 kolom keputusan) sebagai `additionalFields` Better Auth, bukan tabel 1:1 (§2.1). Undangan = tabel `user_invitation` dikonsumsi atomik di `databaseHooks.user.create.before`; sign-up email ditolak di tiga lapis server (§2.2).
4. Halaman tahan **`/waiting`** (satu rute, dua keadaan pending/rejected) di samping `/banned`; `resolveActor` tetap mengembalikan `null` untuk akun tertahan dan menyimpan alasannya di `WeakMap`, sehingga tidak ada guard yang bisa lolos karena lupa cek (§2.3).
5. Migrasi **0014 `account_lifecycle`** ditulis berguard dan idempoten, backfill `approved` SEBELUM default `pending` dipasang (§2.4). Jebakan: SQL bawaan drizzle-kit akan mengunci semua akun lama; karena itu 0014 wajib disunting tangan sebelum pernah dijalankan.
6. Empat role (`member`, `project_manager`, `admin`, `super-admin`), matriks X2 §2E1 sebagai fungsi murni `server/access/user.policy.ts`, penutupan `/api/auth/admin/*` dan sign-up email, `emailVerified` wajib untuk super-admin (§2.5).
7. Sembilan kontradiksi baru ada di §8 (a.l. kepemilikan `server/access/*`, `routes.ts`, `app.ts` oleh S0.b; dev email vs `emailVerified`; nama kode galat impersonasi; scope API key untuk aksi akun).
## 2. Menggantikan R01 §3-§7
Peta: R01 §1 → §1 file ini · §3 Rekomendasi → 2.1-2.7 · §4 Risiko → 2.8 · §5 Estimasi → 2.9 · §6 Pertanyaan → 2.10 · §7 Sumber → §9. Nama kanonik mengikuti X1 D6 dan X3 M5/M18: kolom `approval_status`, tabel `user_invitation`, kode `ACCOUNT_PENDING`/`ACCOUNT_REJECTED`. Nama R14 (`account_status`, `invitation`, `schema.account.ts`) ditinggalkan.

### 2.1 (a) Penyimpanan status akun — kolom di `user` + `additionalFields`
| Opsi | Putusan | Dasar |
|---|---|---|
| **A. `user.approval_status` + `approval_decided_by/_at/_reason`, dideklarasikan di `user.additionalFields`** | **DIPAKAI** | `additionalFields` didukung inti 1.7.3 (R01 §2.1, `init-options.d.mts:195`) dan ikut di `session.user` (`field.d.mts:4`) ⇒ guard membaca status dari sesi tanpa query tambahan; tanpa `cookieCache` (R04 F3) nilainya segar tiap request, jadi persetujuan Admin berlaku seketika. `create.before` menggabung `{data}` ke INSERT yang sama (`with-hooks.mjs:6-22`) ⇒ status ditulis atomik bersama baris user, tak ada jendela "user tanpa status". Disepakati R02 §3.2, X1 D6, X3 M5. |
| B. tabel 1:1 `account_status` | ditolak | +1 query per request di `resolveActor`; `session.user` tidak membawanya; isinya baru ditulis di `create.after` yang diantre sampai transaksi selesai (`with-hooks.mjs:27-35`) ⇒ ada jendela fail-open atau fail-closed. |
| C. status sebagai nilai `role` (`pending`) | ditolak | mencampur dua sumbu; kunci `roles` wajib subset `adminRoles` (`admin.mjs:18-21`) dan `ac` ikut berantakan. |
| D. pending = `banned` | ditolak | `banned` berarti suspend (00 §4) dan punya halaman `/banned` sendiri; alasan dan tombol berbeda. |

Bukti tambahan (dibaca sesi ini, `node_modules/better-auth/dist/db/schema.mjs:60-80`): field `input:false` + `defaultValue` ⇒ saat create nilai klien diganti default; saat update dengan nilai ⇒ `400 FIELD_NOT_ALLOWED`. Jadi `POST /api/auth/update-user {approvalStatus}` ditolak tanpa kode tambahan (menutup C-AUTH-6; tetap diuji, §6).
Deklarasi (`server/auth.ts` blok `user`): `approvalStatus {type:'string', required:false, defaultValue:'pending', input:false}`, `approvalDecidedBy {string}`, `approvalDecidedAt {type:'date'}`, `approvalReason {string}`, semuanya `input:false`. Kolom Drizzle di `schema.auth.ts` ditulis tangan: skrip `auth:generate` menulis ke `server/db/auth.schema.ts` (`package.json:28`), bukan ke `schema.auth.ts`, jadi tidak menimpa. `suspended` tetap memakai `banned` yang ada (R02 §3.2). Nullability `user.role` TIDAK diubah (NULL sudah dinormalkan ke `member` oleh `normalizeRole`), untuk memperkecil blast radius.

### 2.2 (b) Undangan awal, titik kait login pertama, penolakan sign-up email
**Tabel `user_invitation`** (kanonik X3 M5; berkas `schema.profile.ts`, modul akun): `id text PK` · `email text NOT NULL` (CHECK `email = lower(btrim(email))`) · `role text NOT NULL DEFAULT 'member'` (CHECK `member|project_manager|admin`) · `invited_by →user SET NULL` · `expires_at timestamptz NOT NULL` · `accepted_user_id →user SET NULL` · `accepted_at tz?` · `revoked_at tz?` · `created_at tz`. Unik parsial `(email) WHERE accepted_at IS NULL AND revoked_at IS NULL`. Konstanta bernama (usulan, `server/account/limits.ts`): `INVITATION_TTL_DAYS = 14`, `INVITATION_MAX_ACTIVE = 100`. Karena indeks parsial tidak bisa memakai `now()`, `createInvitation` lebih dulu mencabut undangan kedaluwarsa untuk email yang sama dalam transaksi yang sama (`UPDATE … SET revoked_at = now() WHERE … expires_at <= now()`), kalau tidak email itu terkunci selamanya.

**Titik kait**: `databaseHooks.user.create.before(user, ctx)` di `server/auth.ts`, logikanya di `server/account/signup-hooks.ts` (+ keputusan murni `decideNewUser` di `signup-gate.ts`). Urutan (hook plugin admin jalan lebih dulu, hook app terakhir, jadi `role` bisa ditimpa: R01 §2.1):
1. `email = user.email.trim().toLowerCase()`; bila `ALLOWED_EMAIL_DOMAINS` (env baru, CSV, kosong = semua, Q2) tidak kosong dan domain tak cocok ⇒ `return false` (BA mengarahkan ke `?error=unable_to_create_user`, sudah dipetakan di `app/lib/auth-errors.ts`). Berlaku juga untuk email yang diundang; `createInvitation` menolak domain itu lebih awal (422 `DOMAIN_NOT_ALLOWED`).
2. Produksi + `ctx.path` berawalan `/sign-up/email` ⇒ `return false` (lapis ke-3 dari tiga lapis di bawah).
3. Email di `SUPER_ADMIN_EMAILS` **dan** `emailVerified === true` ⇒ `{ data: { approvalStatus:'approved', role:'super-admin', approvalDecidedAt } }` (tanpa ini super-admin pertama terkunci di halaman tahan).
4. `emailVerified === true` dan undangan aktif ⇒ klaim atomik `UPDATE user_invitation SET accepted_at=now() WHERE email=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING id, role, invited_by`; berhasil ⇒ `{ data: { approvalStatus:'approved', role, approvalDecidedBy: invited_by, approvalDecidedAt } }`. `UNIQUE(user.email)` menyerialkan pendaftar dengan email sama; satu-satunya efek samping balapan ganda-klik ialah undangan "terpakai tanpa akun" (`accepted_at` terisi, `accepted_user_id` NULL), terlihat di daftar undangan dan diselesaikan Admin lewat setujui manual.
5. Selain itu ⇒ `{ data: { approvalStatus:'pending', role:'member' } }`. `emailVerified=false` TIDAK pernah menyetujui otomatis (C-AUTH-8).
6. `create.after`: `INSERT INTO profile … ON CONFLICT (user_id) DO NOTHING`; isi `accepted_user_id`; `audit(INVITATION_USE)` bila undangan dipakai. Kegagalan di sini dicatat `logger.warn` dengan `userId` (bukan email) dan tidak membatalkan login.
**Penolakan sign-up email di server, tiga lapis** (R12 F1): (i) `emailAndPassword.enabled = emailPasswordEnabled(isProd)` (`!isProd`; fungsi murni di `server/account/auth-policy.ts`); (ii) gerbang HTTP `server/api/auth-gate.ts` menolak `/api/auth/sign-up/email` dan `/sign-in/email` di produksi (404 seragam); (iii) cek `ctx.path` di hook di atas. **Ditolak:** `validateUserInfo` (`internal-adapter.mjs:147-165`: gagal-tertutup bila tak ada endpoint context, jadi membuat semua jalur seed/skrip 403; juga tak bisa menetapkan `pending`) dan `disableSignUp`/`disableImplicitSignUp` Google (menolak akun baru, padahal kita butuh akun `pending`; R01 §2.1). `account.accountLinking.disableImplicitLinking: true` (R12 R4, C-AUTH-5).

### 2.3 (c) Halaman tahan pending/rejected dan pencegahan loop redirect
- **`/waiting`** (`app/routes/waiting.tsx`, kontrak seperti `banned.tsx`: tanpa guard role, `noindex`, masuk `server/seo.ts:14`). Satu rute dua keadaan (X2 D9): *menunggu* ("Akun Anda menunggu persetujuan Admin", tombol "Cek lagi" = revalidate loader, "Keluar" dengan `modals.openConfirmModal`) dan *ditolak* (menampilkan `approval_reason`, tautan dukungan dari `getBranding().supportUrl`). `/banned` tetap untuk suspend; kerangka visual dipakai bersama (`app/components/account/HoldShell.tsx`).
- **`guard.ts`**: `bannedRequests` digeneralisasi menjadi `heldRequests: WeakMap<Request, HeldAccount>`, `HeldAccount = { user, kind: 'banned'|'pending'|'rejected' }`; `heldKindOf(user)` murni di `server/account/status.ts` (banned aktif lebih dulu, lalu status). `resolveActor` mengembalikan `null` untuk akun tertahan (sesi **dan** API key) ⇒ tak satu guard pun bisa lolos karena lupa cek. `getHeldAccount(request)` diekspor; `getBannedUser` dipertahankan sebagai pembungkus. `signedOutTarget`: banned → `/banned`; pending/rejected → `/waiting`; sesi hilang → `/login?notice=session`; selain itu `/login`.
- **Aturan anti-loop** (diuji tabel di `tests/account/hold-redirects.test.ts`): (1) loader `/waiting` dan `/banned` membaca sesi sendiri (`auth.api.getSession`), TIDAK lewat `resolveActor`/guard; (2) keadaan → tujuan: tanpa sesi → `/login`; banned aktif → `/banned`; pending/rejected → `/waiting`; approved → `/go` (bukan `/app`, supaya home per role diputuskan di satu tempat); (3) `/go` → `redirectToHome` → bila `resolveActor` null ⇒ `signedOutTarget` (tidak pernah kembali ke `/go`); (4) `/waiting`, `/banned`, `/login`, `/go` berada di luar layout terjaga; (5) tes menjalankan loader sungguhan untuk matriks {approved, pending, rejected, banned, banned-kedaluwarsa+pending, tanpa sesi} × {`/app`, `/dashboard`, `/dev`, `/go`, `/waiting`, `/banned`} dan mengikuti redirect maks 3 lompatan; hasil harus berakhir di render atau `/login`.
- **API**: `getHeldAccount` + `accountGateResponse(held)` (`server/account/gate.ts`) menghasilkan 403 `ACCOUNT_PENDING`/`ACCOUNT_REJECTED`/`ACCOUNT_SUSPENDED`; dipakai `server/api/app.ts` sekarang (6 baris, K-5) dan `appContext` S0.b nanti (M18). Plugin API key menolak pemilik tertahan dengan kode yang sama dan memakai `isBanActive` (bukan `owner.banned`, R01 §2.2).
### 2.4 (d) SQL migrasi `0014_account_lifecycle` (idempoten, berguard)
Dibuat oleh `bun run db:generate -- --name=account_lifecycle --why="…"` (wrapper S0.0-06) lalu **disunting tangan sebelum pernah dijalankan** (migrator tidak membandingkan hash, R14 §2.1). Perubahan skema Drizzle menghasilkan `ADD COLUMN approval_status … DEFAULT 'pending' NOT NULL`, yang akan menandai SEMUA akun lama `pending` dan mengunci semua orang; urutan di bawah (backfill `approved` dulu, default `pending` sesudahnya) adalah isi yang wajib. Snapshot tetap mencerminkan skema akhir, jadi `drizzle-kit generate` sesudahnya harus "No schema changes". Urutan ini sama dengan R02 §3.9 butir 4. Berkas `0014` bertanda `-- no-down: backfill role dan status tidak dapat dibalik` (R14 §3.2).
```sql
-- Why: akun lama harus tetap bisa masuk saat persetujuan akun diwajibkan (KEPUTUSAN §2 Q2/Q4, X1 D6):
-- role `user` -> `member`, semua akun yang ada -> approved, akun demo anonim -> rejected, akun baru -> pending.
UPDATE "user" SET "role" = 'member' WHERE "role" IS NULL OR "role" = 'user';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_decided_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_reason" text;--> statement-breakpoint
UPDATE "user" SET "approval_status" = 'rejected', "approval_reason" = 'Demo dimatikan', "approval_decided_at" = now()
  WHERE "is_anonymous" IS TRUE AND "approval_status" = 'approved' AND "approval_decided_at" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "approval_status" SET DEFAULT 'pending';--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT "user_approval_status_check"
  CHECK ("approval_status" IN ('pending','approved','rejected')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT "user_approval_decided_by_user_id_fk" FOREIGN KEY ("approval_decided_by")
  REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_approval_status_idx" ON "user" ("approval_status") WHERE "approval_status" <> 'approved';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
  "id" text PRIMARY KEY NOT NULL, "user_id" text NOT NULL, "display_name" text, "phone" text, "job_title" text, "department" text,
  "text_size" text DEFAULT 'normal' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "profile_user_id_unique" UNIQUE("user_id"),
  CONSTRAINT "profile_text_size_check" CHECK ("text_size" IN ('normal','besar','sangat_besar')));--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id")
  REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
INSERT INTO "profile" ("id", "user_id") SELECT gen_random_uuid()::text, u."id" FROM "user" u
  WHERE u."is_anonymous" IS NOT TRUE ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_invitation" (
  "id" text PRIMARY KEY NOT NULL, "email" text NOT NULL, "role" text DEFAULT 'member' NOT NULL, "invited_by" text,
  "expires_at" timestamp with time zone NOT NULL, "accepted_user_id" text, "accepted_at" timestamp with time zone,
  "revoked_at" timestamp with time zone, "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_invitation_email_normalized_check" CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "user_invitation_role_check" CHECK ("role" IN ('member','project_manager','admin')));--> statement-breakpoint
-- dua FK (invited_by, accepted_user_id -> user.id ON DELETE set null), masing-masing dibungkus DO $$ ... duplicate_object ... $$
CREATE UNIQUE INDEX IF NOT EXISTS "user_invitation_active_email_uq" ON "user_invitation" ("email")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
```
Idempotensi: jalan ulang tidak mengubah apa pun (kolom sudah ada ⇒ `IF NOT EXISTS` melewati default `approved`; UPDATE anonim hanya menyentuh baris yang masih `approved` dan belum punya `approval_decided_at`). `gen_random_uuid()` inti PostgreSQL ≥13 (PG 14 Homebrew, 16 compose, 18 embedded/CI: portabel). Dibuktikan oleh `tests/db/account-migration.test.ts` (§6) yang membuat keadaan pra-0014 di dalam transaksi lalu rollback.

### 2.5 (e) Izin, guard, role, penutupan `/api/auth/admin/*`
| Aturan (X2 §2E1, X3 M17/M18) | Tempat | Kode galat |
|---|---|---|
| Hanya Admin/SA bertindak atas akun; aksi atas diri sendiri ❌ untuk semua | `canActOnUser` | `NOT_ADMIN`, `SELF_TARGET` |
| Target super-admin ❌ untuk semua (termasuk SA); Admin atas Admin ❌; Admin atas Member/PM ✅; SA atas Admin ✅ | `canActOnUser` | `TARGET_PROTECTED` |
| Ubah role: Admin hanya Member↔PM; role `admin` hanya oleh SA; role `super-admin` tak bisa diberi siapa pun (env saja) | `canSetUserRole(p, target, next)` | `TARGET_PROTECTED` |
| Undang: Admin hanya `member`/`project_manager`; `admin` hanya SA; `super-admin` ❌ | `canInviteWithRole` | `NOT_ADMIN`, `TARGET_PROTECTED` |
| Transisi status: `pending→approved`, `pending→rejected` (alasan 3-200 karakter), `rejected→approved`; `approved→rejected` ❌ (pakai suspend) | `canTransitionAccount` (`account-status.rules.ts`) | `WRONG_STATE` |
| Menyamar: hapus user, ubah role, setujui/tolak/suspend, `/api/auth/delete-user` diblokir (Q9) | handler + `auth-gate` | `IMPERSONATING` (K-3) |
Perubahan kode: `permissions.ts` `ROLES = {MEMBER, PROJECT_MANAGER, ADMIN, SUPER_ADMIN}`, `ASSIGNABLE_ROLES` tiga nilai, `normalizeRole` memetakan `user`/null/asing → `member` (alias lama hanya dibaca, tidak ditulis; aman terhadap urutan deploy), `homeFor`: member/PM → `/app`, admin → `/dashboard`, SA → `/dev` (tidak berubah), `canAccessDev` = SA saja (X2 E1; sekarang `isAdminRole`). `reconcileRole(email, current, set, emailVerified)`: SA hanya bila `emailVerified === true` (R12 F2/C-AUTH-2); SA yang emailnya hilang → `member`. `ac`/`roles` memuat empat kunci; Admin tetap `user:['list','ban']`+`session:['list']` dan **tidak** diberi `set-role` (F4). Ubah role tidak lagi lewat `auth.api.setRole`: wrapper menulis DB setelah `canSetUserRole` lolos (R12 R3), jadi izin BA tak perlu dilebarkan. `ROLE_RANK` di `scopes.ts` = member 0 · PM 1 · admin 2 · SA 3. `Actor` kehilangan `isDemo` dan mendapat `impersonatedBy` (dari `session.session.impersonatedBy`, kolom ada di `schema.auth.ts:44`). `/api/auth/admin/*` ditolak seluruhnya di `auth-gate` kecuali `impersonate-user` dan `stop-impersonating` (allowlist; klien hanya memakai dua itu: `AppFrame.tsx:114`, `useUserActions.tsx:150`). Pembanding path: huruf kecil, `decodeURIComponent`, kompres `//`, buang `/` akhir. Semua pesan error admin API diubah ke bahasa Indonesia dengan `code`.

### 2.6 (f) Mematikan demo anonim dan login Google-only
- Dihapus: `server/demo/{restrict,seed}.ts`, `server/api/demo.ts`, `server/settings-demo.ts` (+ bagian `demo` di `settings.ts`, endpoint `PUT /settings/demo` di `settings-access.ts`), plugin `anonymous()` dan `anonymousClient()`, `demoRestrictPlugin`/`demoApi` di `api/index.ts`, `isDemo`/`isDemoExpired` di `guard.ts`, `DemoBanner`, `DemoStartButton`, `DemoProfileNotice`, `DemoCard`, `demo-api.ts`, tombol Coba Demo di `Hero.tsx`, `tests/demo-{cleanup,foundation,restrict,ui}.test.ts` + `tests/api/demo.test.ts`, bagian "Mode demo" README. Dipertahankan: kolom `user.is_anonymous`, `app_setting.demo_enabled/demo_ttl_hours` (expand/contract: DROP baru di rilis sesudah tag pertama, R14 §3.1), konstanta audit `settings.demo.update` dan labelnya (baris audit lama tetap terbaca).
- **Pembersih sisa** (Q4: "pembersih demo yang ada menghapusnya"): `server/demo/cleanup.ts` diubah menjadi `purgeLegacyDemoUsers()` (hapus semua `is_anonymous = true`, per batch 500, tanpa TTL; sengaja tidak bergantung pada kolom 0014 supaya S0A-13 tidak menunggu S0A-02) dan scheduler tetap jalan; ditandai `// TODO(demo): hapus berkas ini setelah rilis pertama dan satu sapuan melaporkan 0 — dicatat di CHANGELOG` (aturan global §17).
- Login: tombol Google jadi aksi utama; form email+sandi hanya bila `!isProd && emailAuthEnabled` (Q3); `signupEnabled` ikut dikunci `!isProd`; `AuthSettingsCard` diberi catatan "hanya berlaku di non-produksi". Sesudah login Google → `/go` → pending ⇒ `/waiting`.

### 2.7 (g) Halaman `/dashboard/users` ("Pengguna")
Katalog (X3 M17; semua di `/api/admin`, guard Admin+SA, error `{error, code}` bahasa Indonesia): `GET /users?approval=&role=&status=&search=` (perluas yang ada; tambah `approval`, kolom `approvalStatus`) · `GET /users/stats` (+`pending`) · `POST /users/:id/approve {role?}` · `POST /users/:id/reject {reason}` · `POST /users/:id/role` (Admin: Member↔PM) · `POST /users/:id/ban|unban` (= suspend; tidak diganti namanya) · `DELETE /users/:id` (SA) · `GET|POST /invitations`, `DELETE /invitations/:id`. `admin.ts` (153 baris, di atas batas 150) dipecah: `admin-context.ts` (derive + guard), `admin.ts` (list/stats/role/delete), `admin-moderation.ts` (ban/unban/approve/reject), `admin-invitations.ts`. Halaman memakai ulang `app/components/users/*` dan `admin-users-api.ts`; tiga tab dengan `?tab=`: **Menunggu persetujuan** (daftar + Setujui [pilih Member/PM] / Tolak [alasan]), **Semua pengguna** (kelola peran, suspend; tabel desktop + kartu mobile yang sudah ada), **Undangan awal** (form email+role, daftar aktif/terpakai/kedaluwarsa/dicabut, Cabut). Semua aksi: `modals.openConfirmModal`, `loading`, `notifications`, empty state (CLAUDE.md UX). `/dev/users` tetap untuk SA dan ikut memakai komponen yang sama.

### 2.8 Risiko dan mitigasi (menggantikan R01 §4)
| # | Risiko | Peluang/Dampak | Mitigasi |
|---|---|---|---|
| 1 | SQL bawaan drizzle-kit mengunci semua akun lama (`DEFAULT 'pending'` saat backfill) | Tinggi/Sangat tinggi | Sunting 0014 sebelum dijalankan (§2.4) + `account-migration.test.ts` menegaskan urutan + peninjau memeriksa SQL, bukan hanya diff skema |
| 2 | 22 berkas test menyisipkan `user` langsung; default DB jadi `pending` ⇒ test API key/guard gagal | Tinggi/Sedang | Helper `tests/support/accounts.ts` (`testUser()` berstatus approved) dan konversi di S0A-07 (penegak status), bukan di S0A-02 |
| 3 | Admin menyetujui akun lewat jalur HTTP Better Auth langsung (lolos matriks) | Sedang/Tinggi | Allowlist `auth-gate` + `input:false` + tes sapuan: tiap `/api/auth/admin/*` selain dua pengecualian → 404 |
| 4 | Pendaftar tanpa undangan membanjiri antrean `pending` | Sedang/Rendah | Rate limit BA produksi sudah aktif (`auth.ts:120`); `ALLOWED_EMAIL_DOMAINS` opsional; Admin menolak dengan alasan |
| 5 | Email undangan tak cocok dengan email Google (titik/plus Gmail, huruf Unicode, CHECK `lower(btrim)` PG vs JS) | Sedang/Rendah | Gagal aman: jatuh ke `pending`, Admin setujui manual; email divalidasi ASCII, `23514` dipetakan 422 `INVALID_EMAIL` |
| 6 | Super-admin dev (email+sandi tak terverifikasi) kehilangan `/dev` setelah F2 ditutup | Tinggi di dev/Rendah di prod | Di non-produksi hook menandai sign-up email `emailVerified:true` (K-2); produksi tertutup |
| 7 | Loop redirect `/waiting` ↔ `/banned` ↔ `/go` | Sedang/Sedang | Aturan §2.3 + tes loop |
| 8 | Hook `create.before` melempar ⇒ login Google gagal total | Rendah/Tinggi | `decideNewUser` murni dan terbungkus: kegagalan DB ⇒ `pending` (gagal-tertutup, bukan approved) + `logger.error` ber-`requestId` |
| 9 | `bun update` menggeser banyak paket / `overrides` tak didukung | Sedang/Sedang | Hanya nama paket yang disebut, cek `git diff bun.lock`, commit terpisah (S0.0-05) |
| 10 | Migrasi 0014 dijalankan pada produksi sungguhan yang ternyata sudah berisi data lama | Rendah/Tinggi | X1-Q5 (asumsi belum dikonfirmasi): `S0A-02` berhenti dan bertanya sebelum menyentuh migrasi bila ada tanda DB non-dev |

### 2.9 Estimasi (menggantikan R01 §5)
S0.0 ±5,8 hari-orang AI (R10 §5: 3-5; selisih: pin Mantine+dates, perbaikan audit, `.env`/secret, hygiene test, kini terhitung) · S0.a ±21 (R10: 11-16; selisih: pencabutan demo penuh 1,5, halaman tahan 1,2, halaman Pengguna 2,5, konversi 22 berkas test 0,5) · reviewer manusia ±2-3 hari (R10) plus peninjau kedua keamanan untuk S0A-05..10 (Q10, orang belum disebut). Kalender: S0.0 ±3 hari (jalur 01→02→04→05 ≈ 1,9 hari-orang; generator 06 paralel), S0.a ±10-12 hari kerja (jalur kritis di §3; R10 memperkirakan 6-9 hari kalender, selisih karena rantai berkas bersama memaksa `auth.ts`/`guard.ts`/`admin*.ts` berurutan dan batas 3 pekerja). Total S0.0+S0.a ±13-15 hari kerja.

### 2.10 Pertanyaan terbuka (menggantikan R01 §6) — jawaban yang disarankan
| # | Pertanyaan | Saran |
|---|---|---|
| 1 | Kredensial Google OAuth (klien uji + akun uji) untuk UAT S0.a: siapa menyediakan? Agent tidak bisa | User menyediakan `GOOGLE_CLIENT_ID/SECRET` di `.env` lokal; tanpanya UAT dijalankan dengan sign-up email dev |
| 2 | X1-Q5: benar migrasi 0000-0013 belum pernah jalan di produksi sungguhan? | Konfirmasi sebelum `S0A-02`; bila salah, 0014 tetap aman (backfill) tetapi squash dilarang |
| 3 | Izin meng-commit rebrand (`S0.0-01`) dan nasib `.mcp.json` + `orca-office` | Ya untuk rebrand dan catatan; `.mcp.json` dan `orca-office` di luar commit (tambah `orca-office` ke `.gitignore` bila user setuju) |
| 4 | `INVITATION_TTL_DAYS=14`, `INVITATION_MAX_ACTIVE=100`, rank scope PM=1 | Setuju sebagai konstanta bernama (mudah diubah) |
| 5 | Nama peninjau kedua keamanan | Dibutuhkan sebelum merge M1 (SP0) |
| 6 | `ALLOWED_EMAIL_DOMAINS` bawaan | Kosong (Q2) |

## 3. Peta tugas, ketergantungan, paralel
Ukuran: S ≤0,5 · M 0,5-1,5 · L 1,5-3 hari-orang AI. Angka pendek di kolom "Bergantung pada" = ID dalam grup yang sama (S0.0 atau S0A). Gelombang = tugas dalam satu gelombang boleh berjalan serentak (maks 3 pekerja per peluncuran).
| ID | Judul singkat | Uk. | Bergantung pada | Gel. |
|---|---|---|---|---|
| S0.0-01 | Commit rebrand + catatan (M0) | S | – | 1 |
| S0.0-02 | Pin Bun 1.4.2, `.gitattributes` CHANGELOG union | S | 01 | 2 |
| S0.0-03 | `BETTER_AUTH_SECRET`: `.env.example`, `env.ts`, preload test | S | 01 | 2 |
| S0.0-06 | Generator migrasi berguard + dua test penjaga | L | 01 | 2 |
| S0.0-08 | Subcommand `migrate` + Docker + doctor | M | 01 | 2 |
| S0.0-04 | Pin Mantine 9.6.3 + `@mantine/dates` + `dayjs` | M | 02 | 3 |
| S0.0-07 | Stub skema + barrel + `drizzle.config.ts` + CI drift | S | 02, 06 | 3 |
| S0.0-09 | `tests/test-hygiene.test.ts` (ratchet `mock.module`) | S | 03 | 3 |
| S0.0-05 | Perbaikan `bun audit` (proxy-addr, MCP SDK, source-map-js) | M | 04 | 4 |
| **SP-0.0** | Worktree baru menjalankan `bun run test` hijau; `bun audit` nol high/critical; laporan ke user | | 01-09 | |
| S0A-01 | Rename role → 4 role, `emailVerified` super-admin | M | SP-0.0 | A |
| S0A-02 | Skema akun + migrasi 0014 (pemegang baton) | L | SP-0.0 | A |
| S0A-03 | Kebijakan akun murni (`server/access`) | M | 01 | B |
| S0A-05 | `auth.ts`: field persetujuan, kebijakan email, linking | M | 02 | B |
| S0A-04 | Undangan + keputusan sign-up | M | 01, 02, 03 | C |
| S0A-07 | Guard menahan pending/rejected + API key | L | 05 | C |
| S0A-12 | Layar login Google-only | S | 05 | C |
| S0A-06 | Hook sign-up: pending, undangan, profil, audit | M | 04, 05 | D |
| S0A-08 | Gerbang `/api/auth/*` (admin, email prod) | M | 05 | D |
| S0A-09 | Pecah admin API + matriks role baru | L | 03, 07 | D |
| S0A-10 | Endpoint setujui/tolak + undangan | L | 04, 06, 09 | E |
| S0A-11 | Halaman tahan `/waiting` | M | 07 | E |
| S0A-13 | Cabut demo anonim | M | 06, 07, 08, 12 | E |
| S0A-14 | Halaman `/dashboard/users` | L | 10, 11 (UI lunak sejak 09) | F |
| S0A-15 | Gerbang akhir S0.a, ADR, UAT, permintaan review | S | semua | G |
**Jalur kritis S0.a** ≈11,7 hari-orang (≈10 bila UI 14 mulai lunak sejak 09): `02 → 05 → 07 → 09 → 10 → 14 → 15`; jalur kedua `01 → 03 → 04 → 06 → 10`. Pencabutan demo (13) sengaja di akhir rantai berkas bersama supaya tidak menahan jalur kritis; konsekuensinya baris demo bertahan di `auth.ts`/`guard.ts`/`LoginForm.tsx` sampai S0A-13 dan tidak boleh disentuh tugas lain.
**Rantai berkas bersama (wajib berurutan, bukan paralel):** `server/auth.ts` 05→06→13 · `server/guard.ts` 07→13 · `server/api/index.ts` 08→13 · `server/api/auth-gate.ts` 08→13 · `server/api/admin*.ts` 09→10 · `app/routes.ts` 11→14 · `app/components/login/LoginForm.tsx` + `routes/login.tsx` 12→13 · `server/audit.ts` + `app/lib/audit-api.ts` 06 saja · `server/api-keys/scopes.ts` 01→10→13 · `app/components/users/*` 01→14 · `tests/guard.test.ts` 01→07→13 · `bun.lock`/`package.json` 02→04→05 (S0.0; hanya pemilik S0.0 menjalankan `bun install`, X1 D1) · `server/db/migrations/*` hanya S0A-02 (baton, X1 D6) · `CHANGELOG.md` semua tugas (`merge=union`). **Titik sinkron:** SP-0.0 (sebelum S0.a mulai), **SP0 = merge M1** (S0.a selesai + peninjau kedua; S0.b boleh merge sesudahnya, di-rebase di atas M1, X3 §2d). Tugas S0.a yang menyentuh `server/` memicu `smoke:prod` + `smoke:binary`; yang menyentuh migrasi/`local-pg`/`cli` juga `smoke:coldboot`.
**Tidak boleh diubah oleh tugas mana pun di sini:** `server/pm/*`, `server/project/*`, `server/task/*`, skema proyek/tugas (S0.b); `app/root.tsx` selain S0.0-04 (L4); README baris editorial (3, 40/246, 311-316, X1-Q8).

## 4. Tugas S0.0
Aturan semua tugas: branch `chore/pm-s00-<nama>` dari `feature/project-management`; commit berkala; jangan push/tag/deploy; laporkan ringkasan + hasil tes + nama branch dan tunggu konfirmasi sebelum merge (global §2). `bun run typecheck` nol error tanpa filter, `bun run lint` bersih. Berkas baru ≤ batas ukuran global. **Ownership** = berkas pada baris Target tiap tugas; berkas lain terlarang. CHANGELOG `[Unreleased]` ditambah bila ada dampak ke operator/pengguna (02-05, 08).

#### S0.0-01 · Commit rebrand dan catatan (M0) · L10 · S (0,2) · dep –
- **Target**: hanya operasi git. Commit 1 `chore(brand): rename package, env vars and binary to simple-pm` = 92 berkas termodifikasi di luar `tahapan-proyek/` (98 total − 5 catatan − `.mcp.json`). Commit 2 `docs(project): add decision notes and research reports` = lima berkas `tahapan-proyek/` termodifikasi + yang belum terlacak (`03-desain/erd/diskusi/00-role-dan-area.md`, `05-implementasi/{KEPUTUSAN-MVP-INTI.md,rencana/,riset/,tinjauan/}`).
- **Change**: rebrand (nama paket/biner/env `MAKURO_*`→`SIMPLE_PM_*`, prefix key `sp_live_`) **sudah selesai di working tree**; tugas ini hanya mengabadikannya. Sebelum staging: `git diff --stat` harus ≈ +234/−222 berisi rebrand saja; pindai rahasia (global §7: `.env*` tak di-stage; `git diff --cached | grep -iE 'secret|token|password|private_key'` hanya boleh mengenai nama variabel/placeholder).
- **Constraints**: JANGAN stage `orca-office` (biner 63 MB, belum terlacak, tidak di-ignore) dan `.mcp.json` (entri Penpot pribadi); keduanya ditanyakan ke user (§2.10 #3). Tanpa push. Butuh persetujuan eksplisit user lewat koordinator (X3 M0).
- **Acceptance**: `git status --short` hanya menyisakan `orca-office` dan `.mcp.json`; `bun run typecheck` dan `bun run lint` nol sebelum commit; dua commit tampil di `git log`; sebut hasil dalam laporan bahwa semua worktree berikutnya dibuat dari commit ini (`git worktree add`).
- **Commit**: dua pesan di atas. Branch: tetap `feature/project-management`.

#### S0.0-02 · Pin Bun 1.4.2 dan `.gitattributes` · L10 · S (0,3) · dep 01
- **Target**: `.bun-version` (baru, isi `1.4.2`); `.github/workflows/ci.yml` dan `release.yml` (ganti `env.BUN_VERSION` dengan `bun-version-file: .bun-version`); `Dockerfile` (`ARG BUN_VERSION=1.4.2`, `FROM oven/bun:${BUN_VERSION}` di dua tahap, baris 2 dan 9 sekarang `oven/bun:1`); `stack.md`; `.gitattributes` (baru: `CHANGELOG.md merge=union`); `tests/bun-version-sync.test.ts` (baru).
- **Change**: satu sumber kebenaran versi Bun (R06 §2.2, R14 §3.5). Penyelarasan Bun **lokal** (1.3.14 → 1.4.2) adalah tindakan user: agent tidak menjalankan installer; laporan menyebut `bun --version` aktual dan menandai hasil `smoke:binary` lokal "Bun 1.3.14" sampai selaras (CI jadi gerbang final).
- **Acceptance**: tes memastikan isi `.bun-version` = default ARG Dockerfile dan kedua workflow memakai `bun-version-file`; uji coba merge CHANGELOG dua cabang sementara (dibuang, hasil dilaporkan, ASUMSI R14 baris 137); lint bersih.
- **Commit**: `chore(ci): pin bun version from a single file`.

#### S0.0-03 · `BETTER_AUTH_SECRET` untuk `.env.example`, env, dan test · L10 · S (0,3) · dep 01
- **Target**: `.env.example` (nilai `change-me-…` diganti kosong + komentar `openssl rand -base64 32`); `server/env-secret.ts` (baru ≤30 baris, `assertSecretStrength(secret, isProd)`); `server/env.ts` (memanggil; produksi menolak awalan `change-me` atau <32 karakter dengan pesan Indonesia); `tests/preload.ts` (`process.env.BETTER_AUTH_SECRET ??= '…' // test-only`); `tests/env-secret.test.ts` (baru).
- **Change**: lokal tanpa rahasia valid tidak lagi gagal di test (R14 §2.4: `.env` hanya berisi satu variabel tak terkait); `server/cli/init.ts:40` sudah membuat rahasia acak, `doctor.checks.ts:88` sudah memeriksanya. Agent TIDAK membaca atau mengubah `.env` user.
- **Constraints**: `tests/preload.ts` milik L-C (X3 §2d); ini perubahan satu baris yang sah karena S0.0 mendahului lajur itu. `server/env.ts` tidak mengimpor logger/db.
- **Acceptance**: `bun run test` hijau di worktree bersih tanpa `.env` rahasia; kasus tes: produksi + `change-me-x` ditolak, produksi + 32 karakter acak lolos, non-produksi + 1 karakter lolos; `smoke:prod` + `smoke:binary` (menyentuh `server/`).
- **Commit**: `chore(env): reject placeholder auth secret in production`.

#### S0.0-06 · Generator migrasi berguard + dua test penjaga · L10 · L (2) · dep 01
- **Target**: `scripts/db-generate.ts` (baru ≤200, pembungkus), `scripts/db-generate.rewrite.ts` (baru, fungsi murni `rewriteMigrationSql`), `package.json` (`db:generate` → `bun scripts/db-generate.ts`), `tests/db/migrations-guard.test.ts`, `tests/db/migrations-idempotent.test.ts`, `tests/db/db-generate-rewrite.test.ts` (semua baru).
- **Change**: ikuti R14 §3.1 dan **perluasan X1 D6**: argumen wajib `--name=<slug>` dan `--why="<≥20 karakter>"` (jadi komentar baris pertama); `--custom` meneruskan ke drizzle untuk migrasi data. Penulisan ulang: `CREATE TABLE/INDEX` → `IF NOT EXISTS`; `ADD COLUMN` → `IF NOT EXISTS`; **semua** `ADD CONSTRAINT` (FK, CHECK, UNIQUE) dibungkus `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`; `DROP` → `IF EXISTS` + wajib `-- destructive-ok: <alasan>`. Tes penjaga: konstanta `GUARDED_FROM = 4`, `DOWN_REQUIRED_FROM = 14`; bentuk (guard, komentar kepala, `SET NOT NULL` didahului `UPDATE` atau kolom ber-DEFAULT, `destructive-ok`), journal (idx berurutan tanpa celah, `when` naik ketat, tiap tag punya `.sql` + `_snapshot.json`, rantai `prevId`), idx ≥14 punya `server/db/rollback/NNNN_<nama>.down.sql` atau `-- no-down: <alasan>`. Tes idempoten: jalankan ulang semua statement idx ≥4 pada DB test dalam satu transaksi lalu rollback; bila ada migrasi lama yang ternyata tidak idempoten, catat pengecualian bernama dengan alasan, jangan dilewati diam-diam.
- **Constraints**: jangan menambal `bin.cjs`; snapshot tidak disentuh; 0000-0003 dikecualikan lewat konstanta bernama (26 statement tanpa guard, R14 §2.1). Tidak ada migrasi baru di tugas ini.
- **Acceptance**: pada skema uji sementara (dibuang) wrapper menghasilkan SQL ber-guard; ketiga tes hijau; `bun run db:generate` tanpa argumen gagal dengan pesan yang jelas.
- **Commit**: `chore(db): add guarded migration generator`; `test(db): assert migrations are guarded and idempotent`.

#### S0.0-08 · Subcommand `migrate` untuk Postgres eksternal · L10 · M (0,8) · dep 01
- **Target**: `server/cli/migrate.ts` (baru, `run(argv): Promise<number>`, `--status` = daftar pending tanpa menerapkan), `server/cli/index.ts` (daftarkan), `Dockerfile` (`CMD` menjalankan `migrate` lalu `start`) dan `docker-compose.yml`, `server/cli/doctor.checks.ts:153` (petunjuk "dijalankan otomatis saat start" salah untuk mode eksternal), `README.md` (hanya bagian deploy/CLI), `tests/cli/migrate.test.ts` (baru).
- **Change**: R14 §3.3. Impor `runMigrations` dari `../local-pg/boot` **secara dinamis**; tanpa impor `server/env`/`server/db` di level atas (CLAUDE.md "CLI & Postgres Lokal"). `DATABASE_URL` dibaca dari `process.env`. Kode keluar 0 sukses · 1 gagal · 2 argumen salah. Ditolak: auto-migrate saat `start` eksternal (balapan multi-instance) dan membawa drizzle-kit ke image runtime.
- **Acceptance**: tes: `--status` pada DB test mencetak 0 pending dan kode 0; URL salah ⇒ kode 1 dengan pesan berkonteks; `help` memuat perintah baru. `smoke:coldboot`, `smoke:prod`, `smoke:binary`.
- **Commit**: `feat(cli): add migrate command for external postgres`.

#### S0.0-04 · Pin Mantine 9.6.3 + `@mantine/dates` + `dayjs` · L10 · M (0,7) · dep 02
- **Target**: `package.json` (`core|hooks|form|modals|notifications|nprogress` → `"9.6.3"` tanpa caret; tambah `@mantine/dates` `"9.6.3"`, `dayjs` `"1.11.23"`), `bun.lock` (hanya lewat `bun install` oleh tugas ini), `app/root.tsx` (impor `@mantine/dates/styles.css` setelah `@mantine/core/styles.css`, `dayjs/locale/id`, `DatesProvider` dengan locale `id` dan hari pertama dari konstanta bernama di `app/lib/date-config.ts` baru), `tests/mantine-version-sync.test.ts` (baru), `CLAUDE.md` (bagian UI Framework: `@mantine/dates` dan aturan satu versi; D9 butir 10).
- **Change**: X1 D1 (bukan 9.7.2 usulan R06; naik ke 9.7.x = PR terpisah sesudah S2). Laporan dependensi (global §10): paket, alasan (input tanggal S1/S2), alternatif ditolak (`<input type="date">`, `react-aria`, picker buatan sendiri). Peer persis yang kini terlanggar (`modals`/`notifications` 9.6.1 vs `core` 9.6.0) hilang.
- **Acceptance**: tes memeriksa semua `@mantine/*` bernilai satu versi persis tanpa `^`/`~`; `bun install --frozen-lockfile` bersih; `typecheck` nol; `test` hijau; `smoke:prod` + `smoke:binary` (root.tsx). Pemeriksaan visual oleh user (tanpa Playwright kecuali diminta).
- **Commit**: `chore(deps): pin mantine to 9.6.3 and add dates picker`.

#### S0.0-07 · Stub skema, barrel, `drizzle.config.ts`, drift CI · L10 · S (0,3) · dep 02, 06
- **Target**: `server/db/schema.profile.ts`, `schema.project.ts`, `schema.project-history.ts`, `schema.task.ts`, `schema.task-detail.ts` (baru, masing-masing `export {};` + komentar pemilik), `server/db/schema.ts` (+5 `export *`), `drizzle.config.ts` (`schema: './server/db/schema.*.ts'`, X3 M7), `tests/db/schema-wiring.test.ts` (baru), `.github/workflows/ci.yml` (langkah `bun run build` + job drift: `bunx drizzle-kit generate --name=drift` lalu gagal bila `git status --porcelain server/db` tak kosong, R14 §3.6).
- **Change**: X1 D6 "commit 0,5": setelah ini **tidak ada tugas yang menyentuh `drizzle.config.ts`/barrel**. `schema.columns.ts` (S0.b) tidak didaftarkan (tanpa tabel).
- **Acceptance**: drizzle-kit melaporkan "No schema changes"; tes wiring: tiap `schema.*.ts` ber-tabel diekspor barrel; `typecheck` nol; `schema-introspect` tetap hijau.
- **Commit**: `chore(db): register empty schema modules for project work`; `chore(ci): add build and schema drift steps`.

#### S0.0-09 · Ratchet kebersihan test (D8b) · L10 · S (0,5) · dep 03
- **Target**: `tests/test-hygiene.test.ts` (baru).
- **Change**: X1 D8b: jumlah berkas ber-`mock.module` tidak boleh naik (daftar putih nama berkas = keadaan saat ini, dihitung dengan `grep -rl "mock.module" tests`); larang `db.delete(x)` tanpa `.where(` di berkas test baru; larang `Bun.sleep(>100)` di berkas baru (pelanggar lama masuk daftar putih bernama). Spike 30 menit: jalankan `bun test tests/api/audit.test.ts tests/api/app.test.ts` dalam satu proses, lalu urutan dibalik; tulis hasilnya (bocor atau tidak) di laporan. `installAuthSpies` (8c) dan konversi 13 berkas (8d) di luar berkas ini; **tes S0.a memakai pola `spyOn` langsung** (rujukan `tests/api/posts.test.ts`) sehingga tidak menunggu 8c.
- **Acceptance**: tes hijau dan merah bila satu berkas `mock.module` baru ditambahkan (kasus negatif memakai fixture string, bukan berkas nyata).
- **Commit**: `test(hygiene): add ratchet for mock.module and unsafe deletes`.

#### S0.0-05 · Perbaikan `bun audit` dengan cara aman · L10 · M (0,7) · dep 04
- **Target**: `package.json`, `bun.lock`; bila perlu `docs/decisions/dependency-overrides.md` (baru, alasan tiap override).
- **Change**: R06 §2.3. (1) Rekam `bun audit` dasar dengan versi Bun yang dipakai. (2) `bun update @modelcontextprotocol/sdk vite` (hanya nama itu; `^1.30.0` sudah mengizinkan 1.31.0+ yang menutup `GHSA-6qxp-vccf-f47h`; `postcss` 8.5.30 memakai `source-map-js ^1.2.2`). (3) Bila `proxy-addr` (<2.0.8, critical), `fast-uri`, `ip-address` tidak bergerak: `"overrides": { "proxy-addr": "^2.0.8", "fast-uri": "^3.1.8", "source-map-js": "^1.2.2" }` (ASUMSI Bun mendukung; verifikasi dulu). (4) `git diff bun.lock` hanya memuat paket yang disebut + turunannya. Tidak membahas `Dockerfile:15` (menyalin devDependencies): dilaporkan saja.
- **Acceptance**: `bun audit` nol critical/high (sisa moderate dicantumkan di laporan); `tests/mcp/*` hijau; `typecheck`, `test`, `smoke:prod`, `smoke:binary` (menyentuh `server/mcp`); CHANGELOG `Fixed`: "Dependensi dengan celah keamanan diperbarui".
- **Commit**: `chore(deps): patch critical and high audit advisories`.
- **Sinkron SP-0.0**: laporan ke user memuat hasil audit (aturan global §10: temuan high/critical wajib dilaporkan).

## 5. Tugas S0.a
Aturan semua tugas S0.a: satu cabang `feature/pm-foundation-roles` (R14 §3.8) dari `feature/project-management` setelah SP-0.0; worktree sendiri dengan port/DB terpisah (`PORT=31NN LOCAL_PG_PORT=544NN LOCAL_PG_DB=simple_pm_wtNN LOCAL_PG_SOCKET_DIR=/tmp/spm-wtNN LOCAL_S3_PORT=545NN`, R14 §3.8; jangan hentikan Postgres/RustFS milik user di 5432/9000). Komentar kode, nama, dan error mengikuti §2; **tidak ada** fungsi/modul publik tanpa docstring satu baris (global §16), TODO selalu berkonteks (§17), tanpa `catch {}` kosong (§11), tanpa email/token di log (§12). Setiap tugas menambah butir CHANGELOG `[Unreleased]` (Indonesia, sudut pengguna) di commit yang sama. Migrasi baru hanya di S0A-02. **Ownership** = berkas pada baris Target tiap tugas; berkas lain terlarang, dan berkas bersama hanya diubah sesuai rantai di §3. Batas ukuran (global §8): handler ≤150, service ≤300, query ≤250, skema ≤200, util ≤200, test ≤400; pecah dulu bila sebuah berkas ≥80% batas. **Dokumen per tugas**: CHANGELOG `[Unreleased]` di 01, 05-08, 10-14; README (hanya bagian kontrak) di 01 (tabel role), 13 (hapus "Mode demo"), 14 (alur undangan/persetujuan + endpoint admin); CLAUDE.md di 01 dan 14 (X1 D9 butir 1 dan 3); `docs/decisions/` di 15. Playwright/browser TIDAK dipakai kecuali user memintanya (global §1).


#### S0A-01 · Rename role ke empat role, `emailVerified` super-admin · L-A · M (1,5) · dep SP-0.0
- **Target**: `server/permissions.ts`, `server/roles.ts`, `server/api-keys/scopes.ts` (`ROLE_RANK` empat role; `ROLES.USER` di baris 52/100/106/112 → `MEMBER`), `server/api-keys/plugin.ts` (select `emailVerified`, teruskan ke `resolveUserRole`), `server/api/settings-access.ts` (union role empat literal), `server/api/admin-users.query.ts` (filter `ROLES.MEMBER`), `server/auth.ts` (hanya `defaultRole: ROLES.MEMBER`), `app/components/users/{UserFilters,UserDetailDrawer,UserActionsMenu,UserCells}.tsx`, `app/routes/app/layout.tsx` (`BADGE_COLOR` kunci `member`/`project_manager`), ±25 berkas test yang menyebut role `'user'` (daftar: `grep -rlE "'user'" tests`), `README.md` (tabel role ≈baris 290-298), `CLAUDE.md` (D9 butir 1, baris 7/13: `member`, area), `CHANGELOG.md`.
- **Change**: §2.5. `reconcileRole(email, current, set, emailVerified)` dan `resolveUserRole({id,email,role,emailVerified})`; `canAccessDev` = SA saja. `canSetRole`/`canActOnTarget`/`canImpersonate` **dibiarkan** (semantik berubah di S0A-09) agar commit ini murni rename + F2. `normalizeRole` memetakan `'user'`, `null`, asing → `member`.
- **Constraints**: `permissions.ts` tetap murni (tanpa `env`/`db`; klien mengimpornya, `tests/client-server-imports.test.ts`). Tidak menyentuh `routes.ts` atau berkas S0.b.
- **Acceptance**: `grep -rn "ROLES\.USER" server app` = 0; `tests/permissions.test.ts` (A1 ≈45: legacy→member, null, asing, `homeFor`×4, `isAdminRole`, `canAccessDev`, `reconcileRole` env/demosi/`emailVerified=false` ⇒ bukan SA), `tests/roles.test.ts` (+3: PM tersimpan, SA terverifikasi, tulis DB hanya bila berubah), `tests/api-keys/scopes.test.ts` (A7 `test.each` 4 role × semua scope); `typecheck`, `lint`, `test`, `smoke:prod`, `smoke:binary`.
- **Commit**: `refactor(auth): rename user role to member and add project manager`.

#### S0A-02 · Skema akun dan migrasi 0014 (pemegang baton) · L-A · L (2) · dep SP-0.0
- **Target**: `server/db/schema.auth.ts` (4 kolom `approval_*` timestamptz via `{ withTimezone: true }`, indeks parsial, `check()`, FK diri `approvalDecidedBy`), `server/db/schema.profile.ts` (tabel `profile` dan `userInvitation`, ≤200), `server/db/migrations/0014_account_lifecycle.sql` + `meta/*` (dibangkitkan wrapper lalu disunting persis §2.4), `tests/db/account-migration.test.ts` (baru), `tests/support/accounts.ts` (baru: `testUser(overrides)` mengembalikan baris `user` ber-`approvalStatus:'approved'`), fixture `tests/db/schema-introspect.test.ts` bila menyebut daftar tabel.
- **Change**: §2.4; `-- no-down: backfill role dan status tidak dapat dibalik`. Jalankan `bun run db:migrate` (dev) **dan** `DATABASE_URL=$DATABASE_URL_TEST bun run db:migrate` (test), lalu `bunx drizzle-kit generate` harus "No schema changes". `timestamptz`/CHECK `text_size` ditulis inline dengan komentar rujukan X3 M12 (S0.b memindahkannya ke `schema.columns.ts`/`TEXT_SIZES`, SQL identik; K-4).
- **Constraints**: **HENTIKAN dan tanya** bila `DATABASE_URL` menunjuk database non-lokal/non-embedded atau ada tanda produksi nyata (X1-Q5, §2.10 #2). Hanya satu migrasi; tidak ada DROP kolom demo; tidak menyentuh `drizzle.config.ts`/barrel.
- **Acceptance**: `tests/db/account-migration.test.ts` membuat keadaan pra-0014 DI DALAM transaksi (drop kolom/tabel/constraint/indeks baru), menyisipkan user lama (role `'user'`, role NULL, anonim), menjalankan statement 0014 (pisah `--> statement-breakpoint`) dua kali, memeriksa: role → `member`; user biasa `approved`; anonim `rejected` + alasan "Demo dimatikan"; `profile` = jumlah user non-anonim; insert tanpa status ⇒ `pending`; CHECK menolak `'x'`; indeks unik parsial menolak email aktif ganda tetapi mengizinkannya setelah `revoked_at` terisi; lalu rollback. Tes penjaga S0.0-06 (guard + idempoten) hijau untuk 0014. `smoke:coldboot`, `smoke:prod`, `smoke:binary`; `/dev/db-schema` memuat `profile` dan `user_invitation`.
- **Commit**: `feat(db): add account approval status, profile and invitation tables`.

#### S0A-03 · Kebijakan akun murni · L-A · M (1) · dep S0A-01
- **Target** (baru): `server/access/decision.ts` (`Decision`, `DenyCode` ⊇ `NOT_ADMIN|SELF_TARGET|TARGET_PROTECTED|WRONG_STATE|IMPERSONATING|REASON_REQUIRED`, `DENY_UI` pesan Indonesia + http 403/409/422), `server/access/user.policy.ts` (≤200: `Principal = {id, appRole, impersonatedBy?}`, `canActOnUser`, `canSetUserRole`, `canInviteWithRole`, `canManageUsers`), `server/access/account-status.rules.ts` (`APPROVAL_STATUSES`, `canTransitionAccount(from, to, {actor, target, reason?})`), `tests/access/user.policy.test.ts`, `tests/access/account-status.rules.test.ts`, `package.json` (script `test:pm` = `NODE_ENV=test bun test tests/access tests/account`, D8b).
- **Change**: tabel §2.5; tanda tangan mengikuti R03 §3.3 (`canActOnUser(p, target)`, `canSetUserRole(p, target, next)`, `canInviteWithRole(p, role)`) dan kasus C36-C38 (Ayu=Admin, Boss=SA). Selama `p.impersonatedBy` terisi, aksi merusak mengembalikan `IMPERSONATING` (Q9).
- **Constraints**: murni, tanpa `../env`/`../db` (diimpor klien). Berkas ini **diserahkan ke pemilik S0.b (L-C)** setelah merge; mereka hanya boleh menambah `DenyCode` secara aditif (K-1).
- **Acceptance**: `test.each` aktor {member, PM, admin, SA} × target {member, PM, admin, SA, diri sendiri} × {act, setRole→member/PM/admin/SA, invite role}; transisi: tiga yang sah, selebihnya `WRONG_STATE`, `reject` tanpa alasan 3-200 karakter ⇒ `REASON_REQUIRED`; `typecheck`, `lint`, `test`.
- **Commit**: `feat(access): add pure account policy and status rules`.

#### S0A-04 · Undangan dan keputusan sign-up · L-A · M (1,2) · dep S0A-01, 02, 03
- **Target** (baru): `server/account/limits.ts`, `invitation.query.ts` (≤250), `signup-gate.ts`; ubah `server/env.ts` (`ALLOWED_EMAIL_DOMAINS` opsional → `allowedEmailDomains: ReadonlySet<string>`) dan `.env.example`; tes `tests/account/signup-gate.test.ts`, `tests/account/invitation.test.ts`.
- **Change**: §2.2. Tanda tangan: `decideNewUser(input:{email, emailVerified, viaEmailSignUp}, deps:{isProd, superAdminEmails, allowedDomains, claimInvitation}) → Promise<{allow:false, reason:'DOMAIN_NOT_ALLOWED'|'EMAIL_SIGNUP_CLOSED'} | {allow:true, data:{approvalStatus, role, approvalDecidedBy?, approvalDecidedAt?, emailVerified?}, invitationId?}>`; `createInvitation({actor: Principal, email, role}) → Result` (normalisasi, validasi domain, cabut kedaluwarsa, batas `INVITATION_MAX_ACTIVE`, 409 ganda, memakai `canInviteWithRole`); `claimInvitation(emailNorm)` = satu `UPDATE … RETURNING`; `viaEmailSignUp && isProd` ⇒ `EMAIL_SIGNUP_CLOSED` (jalur HTTP/`emailPasswordEnabled` ada di S0A-05, pemasangan hook di S0A-06). Kegagalan DB di `decideNewUser` ⇒ `pending` (gagal-tertutup), bukan approved.
- **Constraints**: `server/account/*` tidak mengimpor `server/auth` (hindari siklus). Tanpa email di log: pakai `userId`/`invitationId`.
- **Acceptance** (R09 A5 tingkat fungsi): domain di luar daftar ⇒ ditolak; terverifikasi+undangan ⇒ approved+role undangan; `emailVerified=false`+undangan ⇒ pending, undangan tak terpakai; kedaluwarsa/dicabut/terpakai ⇒ pending; email SA env terverifikasi ⇒ approved SA; dua `claimInvitation` serentak (`Promise.all`) ⇒ tepat satu non-null; `' Budi@Kantor.ID '` lalu `budi@kantor.id` ⇒ 409; batas aktif; Admin undang `admin` ⇒ ditolak, SA ⇒ ok; email non-ASCII ⇒ 422 bukan 500.
- **Commit**: `feat(account): add invitation queries and sign-up decision`.

#### S0A-05 · `auth.ts`: field persetujuan, kebijakan email, linking · L-A · M (1) · dep S0A-02
- **Target**: `server/auth.ts`, `server/account/auth-policy.ts` (baru, murni: `emailPasswordEnabled(isProd)`, `isEmailSignUpPath(path)`), `tests/auth-config.test.ts` (baru), `tests/account/auth-policy.test.ts` (baru), `tests/auth-flow.test.ts` (ubah).
- **Change**: §2.1 `user.additionalFields` (empat field, semua `input:false`); `emailAndPassword.enabled: emailPasswordEnabled(isProd)`; `account.accountLinking.disableImplicitLinking: true`. **Tanpa hook** (S0A-06): sebelum hook terpasang, akun baru memakai default aman `pending`/`member`. `anonymous()` dan `deleteUser` tidak disentuh (S0A-13).
- **Constraints**: `auth.ts` hanya L-A; rantai `05→06→13`. `auth-policy.ts` murni (tanpa `env`/`db`; `isProd` selalu parameter).
- **Acceptance**: `tests/auth-config.test.ts`: semua `additionalFields` `input:false`, `disableImplicitLinking === true`, `emailAndPassword.enabled === !isProd`; C-AUTH-6: `POST /api/auth/update-user {approvalStatus:'approved'}` dengan sesi sungguhan (sign-up email di env test) ⇒ 400 `FIELD_NOT_ALLOWED` (bila Better Auth ternyata tidak menolak: tambahkan penolakan field di `auth-gate` S0A-08 dan catat); `tests/auth-flow.test.ts`: akun email baru berstatus `pending`; `typecheck` menunjukkan `session.user.approvalStatus` bertipe; `smoke:prod`, `smoke:binary`, `smoke:coldboot`.
- **Commit**: `feat(auth): add approval fields and close email auth in production`.

#### S0A-06 · Hook sign-up: pending, undangan, profil, audit · L-A · M (1) · dep S0A-04, 05
- **Target**: `server/account/signup-hooks.ts` (baru ≤150), `server/auth.ts` (`databaseHooks.user.create.{before,after}`), `server/audit.ts` (+`USER_APPROVE`, `USER_REJECT`, `INVITATION_CREATE|REVOKE|USE`, `AuditTargetType` +`'invitation'`), `app/lib/audit-api.ts` (`ACTION_META` untuk kelima aksi, label/warna R12 §3.3, **commit yang sama** agar C-LOG-3 hijau), `tests/account/signup-hooks.test.ts` (baru).
- **Change**: §2.2 langkah 1-6; `viaEmailSignUp = isEmailSignUpPath(ctx?.path)`. Di non-produksi hook menandai sign-up email `emailVerified:true` (K-2; produksi tertutup). `create.after`: baris `profile` (`ON CONFLICT DO NOTHING`), `accepted_user_id`, `audit(INVITATION_USE)` dengan actor = user baru; gagal ⇒ `logger.warn({ userId })` tanpa email.
- **Constraints**: tanpa `validateUserInfo`/`disableSignUp` (§2.2).
- **Acceptance**: integrasi lewat `(await auth.$context).internalAdapter.createUser(...)` (menjalankan hook asli): terverifikasi+undangan ⇒ `approved` + role undangan + `profile` + `accepted_user_id`; tanpa undangan ⇒ `pending`/`member`; SA env terverifikasi ⇒ `approved`/`super-admin`; domain terlarang ⇒ tidak ada baris; DB gagal ⇒ `pending`; tiap `AUDIT_ACTIONS` punya `ACTION_META`; `smoke:prod`, `smoke:binary`, `smoke:coldboot`.
- **Commit**: `feat(auth): hold new sign-ups as pending and approve invited users`.

#### S0A-07 · Guard menahan pending/rejected, API key, impersonasi · L-A · L (1,7) · dep S0A-05
- **Target**: `server/guard.ts` (≤150), `server/account/status.ts` (baru, murni: `heldKindOf`), `server/account/gate.ts` (baru: `accountGateResponse`), `server/api-keys/plugin.ts` (pemilik: `isBanActive`, kode `ACCOUNT_PENDING|ACCOUNT_REJECTED|OWNER_BANNED`), `server/api/app.ts` (cabang 401 → 403 bila `getHeldAccount`; ≤8 baris, K-5), konversi ±22 berkas test yang menyisipkan `user` langsung ke `testUser()` (`grep -rln "insert(user" tests`), tes `tests/guard.test.ts`, `tests/account/status.test.ts`, `tests/api/app.test.ts`, `tests/api-keys/api-keys.test.ts`.
- **Change**: §2.3 dan §2.5 (baris demo `isDemo`/`isDemoExpired` TIDAK disentuh; dibuang S0A-13): `Actor = {user, role, viaApiKey, impersonatedBy}`; `heldRequests` WeakMap; `getHeldAccount`; `signedOutTarget` dan `redirectToHome` per §2.3; sesi dan API key sama-sama `null` bagi akun tertahan.
- **Acceptance** (R09 A3 +12, R12 C-AUTH-7, C-KEY-2): pending ⇒ `/waiting`, rejected ⇒ `/waiting`, approved lolos, banned ⇒ `/banned`, ban kedaluwarsa+approved lolos, SA env terverifikasi lolos, `requireUser` empat role, PM/Member ke `/dashboard` ⇒ `/app`; `GET /api/app/whoami` pending ⇒ 403 `ACCOUNT_PENDING`, rejected ⇒ 403 `ACCOUNT_REJECTED`, anonim ⇒ 401; API key pemilik pending/rejected/ban aktif ⇒ 403, ban kedaluwarsa ⇒ lolos; `Actor.impersonatedBy` terisi dari sesi menyamar; `typecheck`, `test`, `smoke:prod`, `smoke:binary`.
- **Commit**: `feat(guard): hold pending and rejected accounts in guards and api keys`.

#### S0A-08 · Gerbang `/api/auth/*` · L-A · M (1) · dep S0A-05
- **Target**: `server/api/auth-gate.ts` (baru ≤120: `evaluateAuthPath(pathname, method, {isProd})`, `authMount(request)`), `server/api/index.ts` (ganti `isAuthPath`/`BLOCKED_AUTH_PATHS` dengan `authMount`; urutan hook TETAP kontrak CLAUDE.md; ≤150 baris), `scripts/smoke-server.checks.ts` (+`auth-signup-closed`: `POST /api/auth/sign-up/email` bukan 2xx; `auth-admin-closed`: `POST /api/auth/admin/ban-user` dan `GET /api/auth/admin/list-users` ⇒ 404), `tests/api/auth-gate.test.ts` (baru), `tests/smoke-server.test.ts`.
- **Change**: §2.2/§2.5. Memakai `isEmailSignUpPath` dari S0A-05; `/sign-in/anonymous` tetap ditolak sampai S0A-13 membuang pluginnya. Allowlist `admin/impersonate-user` dan `admin/stop-impersonating`; produksi menolak `/sign-up/email` dan `/sign-in/email` (404 seragam via `notFoundResponse`); `/delete-user` selama sesi `impersonatedBy` ⇒ 403 `IMPERSONATING`. Normalisasi path huruf kecil + `decodeURIComponent` + kompres `//` + buang `/` akhir; gagal decode ⇒ 404.
- **Acceptance**: payload sapuan R12 §3.5: `/api/auth/Admin/ban-user`, `//admin//ban-user`, `/admin/ban-user/`, `/%61dmin/ban-user`, `/admin%2Fban-user`, GET/POST ⇒ semuanya 404; dua pengecualian lolos; non-produksi mengizinkan sign-up email (dev); sesi Admin `POST /api/auth/admin/ban-user` ⇒ 404 dan target TIDAK terblokir; `smoke:prod` + `smoke:binary` memuat dua cek baru.
- **Commit**: `feat(auth): close admin and email endpoints of better auth`.

#### S0A-09 · Pecah admin API dan matriks role baru · L-A · L (2) · dep S0A-03, 07
- **Target**: `server/api/admin.ts` (tulis ulang ≤150), `server/api/admin-context.ts` (baru: derive `Actor` + gerbang Admin/SA), `server/api/admin-moderation.ts` (baru: ban/unban), `server/api/admin-users.query.ts` (+`approvalStatus`, `approvalReason`, filter `approval`, stats `pending`), `app/lib/admin-users-api.ts` (tipe), `tests/api/admin.test.ts` (tulis ulang dengan `spyOn`, tanpa `mock.module`), `tests/api/admin-users.test.ts`.
- **Change**: §2.5/§2.7. Role diubah dengan menulis DB setelah `canSetUserRole` (bukan `auth.api.setRole`); ban/unban tetap `auth.api.banUser/unbanUser` (Admin masih punya `user:['ban']`) setelah `canActOnUser`, lalu `revokeUserSessions`; hapus user = SA, target bukan SA/diri. Semua error `{error, code}` bahasa Indonesia; `actor.impersonatedBy` ⇒ 403 `IMPERSONATING` untuk role/ban/unban/delete. Pola sarang plugin mengikuti `settings-ops.ts`/`settings-access.ts`.
- **Constraints**: urutan hook `index.ts` tidak berubah; `admin*.ts` hanya L-A.
- **Acceptance**: `test.each` matriks aktor×target×aksi (Admin→Admin 403 `TARGET_PROTECTED`; Admin Member→PM 200 + audit `user.role.set` `{from,to}`; Admin set `admin` 403; Admin/SA→SA 403; diri sendiri 403 `SELF_TARGET`; SA→Admin 200; menyamar 403 `IMPERSONATING`); sapuan: semua `adminApi.routes` untuk anonim ⇒ 401/403 dan non-admin ⇒ 403 (menangkap hook yang tak diwarisi plugin sarang); bentuk error seragam; `smoke:prod`, `smoke:binary`.
- **Commit**: `refactor(admin): split admin api and enforce account role matrix`.

#### S0A-10 · Endpoint setujui/tolak dan undangan · L-A · L (2) · dep S0A-04, 06, 09
- **Target**: `server/account/approval.service.ts` (baru ≤200: `approveUser`, `rejectUser` — `UPDATE … WHERE id=$1 AND approval_status=$from RETURNING`, lalu `audit`), `server/api/admin-moderation.ts` (+`POST /users/:id/approve|reject`; pecah ke `admin-approval.ts` bila >150), `server/api/admin-invitations.ts` (baru), `server/api-keys/scopes.ts` (`requiredScope` = `null` untuk `/api/admin/users/:id/(approve|reject|role)` dan `/api/admin/invitations*`: kunci API tak boleh menyetujui/menaikkan akun; K-7), `tests/api/invitations.test.ts`, `tests/account/approval.service.test.ts`, `tests/api/admin-users.test.ts`, `tests/api-keys/scopes.test.ts`.
- **Change**: §2.7. Galat: 400 `INVALID_EMAIL`, 403 kode kebijakan, 404 `NOT_FOUND`, 409 `INVITATION_EXISTS|INVITATION_LIMIT|WRONG_STATE`, 422 `DOMAIN_NOT_ALLOWED|REASON_REQUIRED`. Audit pakai nama + id, email dimasker (`b***@kantor.id`). Aksi saat menyamar ⇒ `IMPERSONATING`.
- **Acceptance** (R09 A5/A6): buat undangan (201), email ganda case-insensitive (409), Admin undang `admin` (403), cabut lalu login ⇒ `pending` + baris `invitation.revoke`, setujui/tolak per matriks, dua setujui serentak ⇒ satu 200 dan satu 409, Admin→Admin 403, key API ke rute-rute itu ⇒ 403; tiap aksi punya `ACTION_META`; `smoke:prod`, `smoke:binary`.
- **Commit**: `feat(admin): add approve, reject and invitation endpoints`.

#### S0A-11 · Halaman tahan `/waiting` · L-A · M (1,2) · dep S0A-07
- **Target**: `app/routes/waiting.tsx` (baru ≤150), `app/components/account/HoldShell.tsx` (baru ≤120), `app/routes/banned.tsx` (pakai `HoldShell`; loader: approved ⇒ `/go`, pending/rejected ⇒ `/waiting`), `app/routes.ts` (+`route('waiting', 'routes/waiting.tsx')`; berkas milik L-C, K-5), `server/seo.ts` (+`/waiting` noindex), `scripts/smoke-server.checks.ts` (+`waiting-anon-redirect`), `tests/account/hold-redirects.test.ts`, `tests/seo.test.ts`.
- **Change**: §2.3. **Keputusan user 15 Okt (KEPUTUSAN §6): halaman ini TIDAK memuat form profil** (layar ③ wireframe dipangkas; profil diisi setelah disetujui, S1). Copy polos: *menunggu* ("Akun Anda menunggu persetujuan" + penjelasan + "Cek lagi" ber-`loading` + "Keluar" dengan `modals.openConfirmModal`), *ditolak* (alasan Admin, tautan dukungan). `meta()` `'Menunggu persetujuan — Simple PM'`; mobile 375px.
- **Acceptance**: matriks anti-loop §2.3 (6 keadaan × 6 halaman, maks 3 lompatan, tanpa siklus); `tests/app-contracts.test.ts` hijau; `smoke:prod`, `smoke:binary`.
- **Commit**: `feat(account): add waiting page for pending and rejected accounts`.

#### S0A-12 · Layar login Google-only · L-A · S (0,8) · dep S0A-05
- **Target**: `app/routes/login.tsx` (loader memakai `emailPasswordEnabled(isProd)` dari `server/account/auth-policy.ts`), `app/components/login/LoginForm.tsx` (tombol Google utama; form email hanya bila `!isProd && emailAuthEnabled`; tanpa tab Daftar di produksi), `app/lib/login-mode.ts`, `app/lib/auth-errors.ts` (`unable_to_create_user`: "Email ini tidak diizinkan masuk. Hubungi Admin."; `account_not_linked`: "Email ini sudah punya akun lain. Hubungi Admin."), `app/components/settings/AuthSettingsCard.tsx` (catatan "hanya berlaku di non-produksi"), `tests/login-page.test.ts`, `tests/auth-errors.test.ts`.
- **Change**: §2.6 login (prop dan tombol demo masih ada di berkas yang sama sampai S0A-13). Sesudah Google → `/go`; `errorCallbackURL: '/login'` tetap. Mantine, mobile 375px, `meta()` tetap.
- **Acceptance**: tes pure: produksi ⇒ email/signup `false` apa pun isi setelan; non-produksi mengikuti setelan; dua kode galat baru terpetakan; `typecheck`, `lint`, `test`.
- **Commit**: `feat(login): make google the primary sign-in`.

#### S0A-13 · Cabut demo anonim · L-A · M (1,5) · dep S0A-06, 07, 08, 12
- **Target**: hapus/ubah semua berkas di §2.6 — server: `server/demo/{restrict,seed}.ts`, `server/api/demo.ts`, `server/settings-demo.ts`; ubah `server/demo/cleanup.ts` (→ `purgeLegacyDemoUsers`), `server/auth.ts` (buang `anonymous()`), `server/api/index.ts` (buang `demoRestrictPlugin`/`demoApi`/jadwal pembersih lama; jangan ubah urutan hook lain), `server/guard.ts` (buang `isDemo`/`isDemoExpired`), `server/settings.ts`, `server/api/settings-access.ts`, `server/api-keys/scopes.ts` (`isPublicRead` tanpa `/api/demo`), `server/sidebar-badges.ts` (hitungan demo), `server/db/schema.app.ts` (komentar kolom dipertahankan). Klien: `app/components/{frame/DemoBanner,login/DemoStartButton,profile/DemoProfileNotice,settings/DemoCard}.tsx`, `app/lib/{demo-api,settings-api,auth-client}.ts`, `app/components/{login/LoginForm,profile/ProfileForm,landing/Hero}.tsx`, `app/routes/{login,app/layout,app/profile,super/settings}.tsx`. Tes: hapus `tests/demo-{cleanup,foundation,restrict,ui}.test.ts`, `tests/api/demo.test.ts`; ubah `tests/{guard,permissions,roles,sidebar-badges,settings-api}.test.ts`, `tests/api-keys/{api-keys,scopes}.test.ts`, `tests/mcp/db-tools.test.ts`; tambah `tests/legacy-demo-purge.test.ts`. Dokumen: README (hapus "Mode demo"), CHANGELOG (hapus butir `Added`/`Changed` Coba Demo yang belum pernah dirilis dan tambah satu butir `Removed`).
- **Change**: §2.6. Layar login sudah Google-only (S0A-12); di sini hanya prop/komponen demo dibuang. Buang juga entri `/sign-in/anonymous` di `server/api/auth-gate.ts`. Tugas ini sengaja di AKHIR rantai berkas bersama (`auth.ts`, `guard.ts`, `index.ts`, `LoginForm.tsx`) supaya tidak menahan jalur kritis.
- **Constraints**: kolom `is_anonymous`, `demo_enabled`, `demo_ttl_hours` tetap; `AUDIT_ACTIONS.SETTINGS_DEMO_UPDATE` dan labelnya tetap; `TODO(demo)` berkonteks pada `cleanup.ts`.
- **Acceptance**: `grep -rniE "demo" server app tests` hanya mengenai: konstanta/label audit lama, komentar skema, `cleanup.ts` + testnya; tes baru: anonim lama terhapus, user biasa utuh, batch >500; `typecheck`, `lint`, `test`, `smoke:prod`, `smoke:binary`.
- **Commit**: `chore(demo): remove demo sandbox and anonymous sign-in`.

#### S0A-14 · Halaman `/dashboard/users` · L-A · L (2,5) · dep S0A-10, 11 (lunak: UI mulai setelah S0A-09 memakai katalog §2.7)
- **Target**: `app/routes/admin/users.tsx` (baru ≤150; loader `requireAnyRole(request, [ADMIN, SUPER_ADMIN])` + SSR `initialData` seperti `super/users.tsx`), `app/routes.ts` (+`route('dashboard/users', …)`), `app/routes/admin/layout.tsx` (NAV "Pengguna", label Indonesia), `app/routes/admin/dashboard.tsx` (kartu "N menunggu persetujuan"), baru: `app/components/users/{PendingApprovalList,InvitationPanel,InviteForm,RejectReasonForm,useApprovalActions,useInvitationActions}.tsx`, `app/lib/invitations-api.ts`; ubah: `UserActionsMenu`, `UserDetailDrawer`, `UserFilters`, `UserStatsCards`, `UserTable`, `UserCardList`, `useUserActions`, `app/lib/admin-users-api.ts`, `app/routes/super/users.tsx` (izin dari `canActOnUser`/`canSetUserRole`, bukan `canSetRole`); `tests/admin-routes.test.ts` (baru, kontrak guard halaman `routes/admin/*`), `tests/users-view.test.ts`; `README.md` (bagian Auth & roles: empat role, alur undangan/persetujuan, endpoint admin), `CLAUDE.md` (D9 butir 3), `CHANGELOG.md`.
- **Change**: §2.7. UX production-ready (CLAUDE.md): setujui (pilih Member/PM) dan tolak (alasan wajib), ubah role, suspend/aktifkan, cabut undangan ⇒ `modals.openConfirmModal`; semua tombol async ber-`loading`; hasil lewat `notifications`; empty state ("Tidak ada yang menunggu persetujuan"); aksi mati dengan alasan (mis. "Hanya super-admin yang dapat mengubah Admin"; Tooltip tidak membungkus `Menu.Target`); tabel desktop + kartu mobile, header `wrap="wrap"`, uji bayangan 375px; `meta()` `'Pengguna — Simple PM'`; Admin tidak melihat tombol yang pasti 403.
- **Acceptance**: `tests/admin-routes.test.ts` hijau (tiap halaman berloader memanggil guard); `users-view.test.ts` (label status, `invitationState(inv, now)` = aktif/terpakai/kedaluwarsa/dicabut); `app-contracts` hijau; `typecheck`, `lint`, `test`, `smoke:prod`, `smoke:binary`.
- **Commit**: `feat(dashboard): add users page for approvals, roles and invitations`.

#### S0A-16 · Penanda antrean persetujuan di menu samping · L-A · S (0,5) · dep S0A-14
- **Target**: `server/sidebar-badges.ts` (hitungan `pending` ditambahkan ke agregat user yang sudah ada; badge `/dev/users` menjadi `alert` "N akun menunggu persetujuan" bila ada, sebelum cek diblokir; fungsi `adminSidebarBadges()` untuk `/dashboard/users`, gagal lunak), `app/routes/admin/layout.tsx` (loader memuat badge Admin dan meneruskannya ke `AppFrame`), `app/routes/super/layout.tsx` (tautan "Antrean persetujuan" ke `/dashboard/users` di bagian area lain, dengan badge yang sama), `tests/sidebar-badges.test.ts` (diperluas), tes kontrak layout bila ada.
- **Change**: ditambahkan 16 Okt 2026 atas temuan user: super-admin tidak punya penanda akun yang menunggu dan tidak punya tautan langsung ke antrean. Satu query agregat murah, tanpa query baru per badge; label Indonesia; Admin non-super-admin tidak memanggil query khusus `/dev`.
- **Acceptance**: pending > 0 ⇒ badge `alert` dengan angka di `/dev/users` dan `/dashboard/users`; pending = 0 ⇒ perilaku lama; sumber gagal ⇒ badge jatuh ke nilai aman tanpa melempar; `typecheck`, `lint`, `test`, `smoke:binary`.
- **Commit**: `feat(dashboard): flag pending approvals in the sidebar`.

#### S0A-15 · Gerbang akhir S0.a · L-A · S (0,5) · dep semua
- **Target**: `docs/decisions/0001-account-status-on-user.md` (baru: alasan kolom di `user`, klaim undangan di `before`, dev `emailVerified`, `/waiting` terpisah dari `/banned`, kunci API tak boleh menyetujui), `CHANGELOG.md` (rapikan duplikat), README (pindai klaim kontrak; `tests/readme-endpoint.test.ts` bersih).
- **Change/Acceptance**: `bun run lint`, `typecheck` (nol), `test`, `smoke:prod`, `smoke:binary`, `smoke:coldboot` hijau; `grep -rn "ROLES\.USER" server app` = 0; `bun audit` nol high/critical; urutan commit rapi. **UAT manual oleh manusia** (R10 demo, tanpa Playwright): Admin mengundang Bu Ani (email+role) → Bu Ani login Google → `/app` sebagai Member; orang tanpa undangan → `/waiting`; Admin menyetujui di `/dashboard/users` → "Cek lagi" → `/app`; penolakan menampilkan alasan; Member membuka `/dashboard` → `/app`; Admin mencoba memblokir Admin → ditolak; prod: `POST /api/auth/sign-up/email` ditolak, `/api/auth/admin/list-users` 404. Minta peninjau kedua keamanan untuk S0A-05..10. Laporkan ringkasan + hasil tes + nama branch dan **tunggu konfirmasi sebelum merge (M1)**; tanpa push/deploy.
- **Commit**: `docs(account): record account lifecycle decisions`.

## 6. Tes, titik rawan regresi, review
**Berkas test per tugas** (B = baru, U = diubah, H = dihapus; kasus utama ada di blok tugas masing-masing, §4-§5). Semua memakai pola `spyOn(auth.api,'getSession')` + `spyOn(rolesMod,'resolveUserRole')` (rujukan `tests/api/posts.test.ts`), **tanpa `mock.module`** (CLAUDE.md Test; ratchet S0.0-09).
| Tugas | Test |
|---|---|
| S0.0-02/03/04 | B `bun-version-sync`, `env-secret`, `mantine-version-sync` |
| S0.0-06/07/08/09 | B `db/migrations-guard`, `db/migrations-idempotent`, `db/db-generate-rewrite`, `db/schema-wiring`, `cli/migrate`, `test-hygiene` |
| S0A-01 | U `permissions`, `roles`, `api-keys/scopes` + rename role di ±22 berkas lain |
| S0A-02 | B `db/account-migration`; helper B `support/accounts.ts`; U `db/schema-introspect` bila perlu |
| S0A-03 | B `access/user.policy`, `access/account-status.rules` |
| S0A-04 | B `account/signup-gate`, `account/invitation` |
| S0A-05 | B `auth-config`, `account/auth-policy`; U `auth-flow` |
| S0A-06 | B `account/signup-hooks`; U `audit-api` |
| S0A-07 | U `guard`, `api/app`, `api-keys/api-keys` + konversi ±22 berkas penyisip user; B `account/status` |
| S0A-08 | B `api/auth-gate`; U `smoke-server` |
| S0A-09 | U (tulis ulang) `api/admin`, U `api/admin-users` |
| S0A-10 | B `api/invitations`, `account/approval.service`; U `api/admin-users`, `api-keys/scopes` |
| S0A-11 | B `account/hold-redirects`; U `seo` |
| S0A-12 | U `login-page`, `auth-errors` |
| S0A-13 | H `demo-cleanup`, `demo-foundation`, `demo-restrict`, `demo-ui`, `api/demo`; B `legacy-demo-purge`; U `guard`, `permissions`, `roles`, `sidebar-badges`, `settings-api`, `api-keys/{api-keys,scopes}`, `mcp/db-tools` |
| S0A-14 | B `admin-routes`, `users-view` |

**Titik rawan regresi** (diperiksa tiap tugas; peninjau menjalankan `bun run test` penuh, bukan hanya berkas baru):
| # | Titik | Mengapa | Penjaga |
|---|---|---|---|
| 1 | 22 berkas test menyisipkan `user` langsung | default DB `pending` setelah 0014 ⇒ guard/API key menahan pemiliknya | `testUser()` (S0A-02), konversi di S0A-07 |
| 2 | `guard.test.ts`, `permissions.test.ts`, `roles.test.ts` disentuh tiga tugas (01, 07, 13) | konflik dan perilaku bergeser | urutan 01→07→13 (§3); tiap tugas menjalankan seluruh berkas |
| 3 | Hook Elysia tidak diwarisi plugin sarang setelah `admin.ts` dipecah | rute admin tanpa guard | sapuan semua `adminApi.routes` (S0A-09) |
| 4 | Spec OpenAPI dan daftar rute | rute `/api/demo*` hilang, rute `/api/admin/*` baru | `tests/api/openapi.test.ts` dijalankan di S0A-10/13 |
| 5 | Bentuk payload settings publik | bagian `demo` hilang dari `GET /api/settings` | `settings-api`, `api/settings` tests (S0A-13) |
| 6 | Klien mengimpor `@server/access/*` dan `permissions.ts` | `env`/`db` bocor ke bundel browser | `tests/client-server-imports.test.ts` (S0A-03, 01) |
| 7 | Jumlah `SMOKE_CHECKS` | CLAUDE.md menulis "23 pemeriksaan"; nama harus unik | `tests/smoke-server.test.ts`; ubah kalimat CLAUDE.md jadi "lihat `SMOKE_CHECKS`" bila angka berubah |
| 8 | Dev server `--hot` tidak memuat plugin/hook Elysia baru | uji manual tampak "tidak berubah" | minta user restart `bun run dev` setelah S0A-08/09 (CLAUDE.md) |
| 9 | Dev memakai akun email+sandi sebagai super-admin | F2 + `emailVerified` | hook menandai verified di non-produksi (K-2) |
| 10 | `auth.ts` mendekati batas ukuran | 139 baris sekarang | logika hook di `server/account/*`; pecah bila ≥160 (global §8) |

**Review dan gerbang**: tiap tugas = satu commit/concern; lapor ringkasan + hasil tes + nama branch, tunggu konfirmasi sebelum merge. Peninjau manusia ≥4 hari/minggu (Q10); **peninjau kedua keamanan wajib** untuk S0A-05..10 sebelum M1 (nama belum ada, KEPUTUSAN §5.2). Perintah wajib per tugas ada di blok tugas; `smoke:*` dijalankan dengan `BETTER_AUTH_SECRET` acak dan port/dir terpisah dari dev server user (R14 §3.5), jangan menunjuk ke port dev user, jangan `pkill` proses user.

## 7. Bukti yang belum diverifikasi
| # | Klaim | Dasar | Cara menutup |
|---|---|---|---|
| 1 | Field `additionalFields` bertipe `'date'` dipetakan ke kolom `timestamptz`; `defaultValue` terpakai pada jalur sosial (callback Google) | hanya jalur endpoint yang dibaca (`schema.mjs:60-80`); R12 C-AUTH-6 menandainya ASUMSI | S0A-05/06: tes `internalAdapter.createUser` dan baca baris |
| 2 | `create.before` mengembalikan `data` untuk field `input:false` tetap ditulis ke INSERT | `with-hooks.mjs:6-22` membaca penggabungan; belum dijalankan | S0A-06 integrasi (idem) |
| 3 | Pengalihan `?error=unable_to_create_user` saat `create.before` mengembalikan `false` pada callback Google | pemetaan sudah ada di `auth-errors.ts`; alur BA tidak dijalankan | UAT manual dengan klien Google uji (§2.10 #1) |
| 4 | `session.session.impersonatedBy` tersedia dari `auth.api.getSession` | kolom ada di `schema.auth.ts:44`, plugin admin menulisnya | S0A-07: tes dengan sesi menyamar nyata |
| 5 | `overrides` di `package.json` didukung Bun 1.4.2 | R06 §2.3 (ASUMSI) | S0.0-05: coba di cabang, bila gagal pakai `bun update` pada induk |
| 6 | Semua 0004-0013 idempoten bila dijalankan ulang | R14 menyatakan, tidak diuji | S0.0-06 tes idempoten; pengecualian dicatat bernama |
| 7 | `drizzle-kit generate` menerima FK diri + `check()` + indeks parsial dan modul skema kosong | pengetahuan drizzle-kit 0.31 | S0.0-07 dan S0A-02 (`drizzle-kit generate` = "No schema changes") |
| 8 | Hook Elysia dari `admin-context.ts` berlaku untuk plugin sarang | pola `settings-ops.ts`/`settings-access.ts` ada, perilaku tidak diuji | sapuan rute S0A-09 |
| 9 | Transaksi DDL + rollback aman untuk tes migrasi pada DB test bersama | PostgreSQL mengizinkan DDL transaksional; bun menjalankan berkas test berurutan | S0A-02; bila terjadi kunci, pakai skema sementara |
| 10 | Postgres Homebrew 14 di mesin user menjalankan `gen_random_uuid()`/`IF NOT EXISTS` | inti PG ≥13 | `smoke:coldboot` memakai PG 18 tertanam |
| 11 | Klaim jumlah berkas (98 termodifikasi, 22 penyisip user, 16 berkas `mock.module`) | dihitung 15 Okt 2026 di working tree | hitung ulang saat tugas mulai (angka bisa bergeser) |

## 8. Kontradiksi baru
Default dipilih paling konservatif dan tidak menutup pilihan; tidak ada yang diputuskan diam-diam.
| # | Kontradiksi | Default dalam rencana ini | Perlu keputusan siapa |
|---|---|---|---|
| K-1 | X3 §2d: `server/access/*` milik L-C (S0.b), tetapi S0.a butuh `user.policy`/`account-status.rules` sebelum SP0 (R03 §3.3 menaruhnya di `server/access/`) | S0A-03 membuat tiga berkas minimal itu; kepemilikan pindah ke S0.b setelah merge, S0.b hanya menambah `DenyCode` secara aditif | koordinator |
| K-2 | R12 R2/F2 (super-admin wajib `emailVerified`) vs KEPUTUSAN Q3 (email+sandi tetap ada di dev lokal): akun email dev tidak terverifikasi ⇒ kehilangan `/dev` | hook menandai sign-up email `emailVerified:true` hanya bila `!isProd`; produksi tertutup | user (bila ingin dev selalu lewat Google) |
| K-3 | Nama kode galat menyamar: R12 C-IMP-1 `IMPERSONATION_RESTRICTED` vs X2 §2E1 `IMPERSONATING` | `IMPERSONATING` (X2 lebih baru, memuat Q9) | S0.b (katalog `PM_ERRORS`, X3 M8) |
| K-4 | X3 M12/X1 D7 menaruh `schema.columns.ts` dan `TEXT_SIZES` di S0.b, padahal tabel `profile`/`user_invitation` di 0014 membutuhkan tipe waktu dan CHECK ukuran teks | S0A-02 menulis `timestamptz` dan literal `normal\|besar\|sangat_besar` inline berkomentar; S0.b boleh merefaktor (SQL identik, dijaga `drizzle-kit generate` kosong) | S0.b |
| K-5 | X3 §2d: `app/routes.ts`, `server/api/app.ts`, `tests/preload.ts` milik L-C, tetapi S0.a menambah `route('waiting')`/`route('dashboard/users')`, mengubah cabang 401 `app.ts` menjadi 403 untuk akun tertahan (≤8 baris), dan S0.0-03 mengubah satu baris preload | edit minimal; S0.b di-rebase di atas M1 dan WAJIB mempertahankan perilaku "akun tertahan ⇒ 403 `ACCOUNT_PENDING\|REJECTED`" saat memindahkan gerbang ke `appContext` (M18) | koordinator |
| K-6 | X1 D9 meminta butir `Removed` di CHANGELOG, tetapi butir Coba Demo di `[Unreleased]` belum pernah dirilis (bukan perilaku yang berubah bagi pengguna) | hapus butir `Added`/`Changed` yang kini salah dan tambah satu butir `Removed`; bagian rilis lama tidak disentuh | user |
| K-7 | R12 R11 menyatakan "izin kunci = izin pemilik" dan `scopes.ts:158` memetakan seluruh `/api/admin/users*` ke `users:write`; berarti kunci milik Admin bisa menyetujui akun atau mengubah role | `requiredScope` = `null` untuk `approve\|reject\|role` dan `/api/admin/invitations*` (kunci API tak boleh menaikkan/menyetujui akun); ban/unban tetap `users:write` | user |
| K-8 | R10 §5 memperkirakan S0.a 11-16 hari-orang dan 6-9 hari kalender; rencana ini ±21 dan 10-12 hari kerja karena demo/halaman tahan/halaman Pengguna dihitung penuh dan rantai berkas bersama | angka rencana ini dipakai; R10 §5 perlu dikoreksi | koordinator |
| K-9 | X2 §2E1 menulis `/dev` "Sama dengan `dev.*` R03", padahal kode `canAccessDev` memberi Admin akses (`permissions.ts:35`, `isAdminRole`); layout `/dev` sendiri memakai `requireRole(SUPER_ADMIN)` sehingga fungsi itu tak dipakai di tempat lain | `canAccessDev` dibuat SA saja (S0A-01) | – |
Bukan kontradiksi baru (sudah diselesaikan X3): `account_status` vs `approval_status` (M5), `ACCOUNT_NOT_APPROVED` vs `ACCOUNT_PENDING/REJECTED` (M18), penomoran migrasi (M1), nama penjaga migrasi (M6), Mantine 9.7.2 vs 9.6.3 (X1 D1).

## 9. Sumber
Dokumen: `../rencana/_BRIEF-TAHAP2.md`, `../KEPUTUSAN-MVP-INTI.md`, `../riset/{_BRIEF.md, R01 §2, R02 §3.2/§3.9, R03 §2.2/§3.3, R06 §2.2-§2.3/§3.1, R09 A1-A7, R10 A1-A6/S0.0/S0.a, R12 F1-F5/R1-R14/C-AUTH/C-INV/C-KEY/C-IMP, R14 §2.1/§3.1-§3.8}`, `../tinjauan/{_BRIEF-GELOMBANG2.md, X1 D1/D4-D9, X2 §2A D9/§2E1, X3 M1-M32/§2d}`.
Kode yang dibaca (15 Okt 2026, working tree): `server/{permissions,roles,guard,auth,ban,env,audit,settings-demo,settings-maintenance,seo}.ts`, `server/db/{schema.auth,schema.app,schema}.ts`, `server/api/{admin,admin-users.query,app,index}.ts`, `server/api-keys/{scopes,plugin}.ts`, `server/demo/{restrict,cleanup}.ts`, `server/cli/{index,doctor.checks}.ts`, `app/routes/{login,banned,go}.tsx`, `app/routes/{app,admin,super}/layout.tsx`, `app/routes/admin/dashboard.tsx`, `app/routes/super/users.tsx`, `app/components/login/LoginForm.tsx`, `app/components/users/*`, `app/lib/{auth-client,auth-errors}.ts`, `app/routes.ts`, `drizzle.config.ts`, `package.json`, `.env.example`, `.github/workflows/ci.yml`, `tests/{app-routes,client-server-imports,preload}.ts`, `CHANGELOG.md`, `README.md`. Better Auth 1.7.3: `dist/db/{with-hooks,schema,internal-adapter}.mjs`, `dist/utils/validate-user-info.mjs`. `git status` / `git diff --shortstat` (98 berkas, +234/−222).
