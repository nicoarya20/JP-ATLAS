# R01 — Fondasi role & siklus akun (Fase 0)

> Tanggal: 15 Oktober 2026. Status: DRAFT bertahap (bagian diisi berurutan).

## 1. Ringkasan eksekutif
TODO

## 2. Temuan (dengan bukti)
### 2.1 Better Auth 1.7.3 (terpasang) — bukti untuk keputusan (b) dan (c)
- Versi terpasang `better-auth` 1.7.3 dan `@better-auth/api-key` 1.7.3 (`package.json:31,49`; `node_modules/better-auth/package.json`).
- `user.additionalFields` didukung inti: tipe `additionalFields?: { [Key in Exclude<string,Keys|"id">]: DBFieldAttribute }` di `node_modules/@better-auth/core/dist/types/init-options.d.mts:195` (dipakai oleh `BetterAuthDBOptions<"user",...>`, `init-options.d.mts:817`). Field tambahan ikut di `session.user` (tipe `InferFieldsOutput`, `better-auth/dist/db/field.d.mts:4`).
- `databaseHooks.user.create.before(user, ctx)` boleh mengembalikan `false` (batal) atau `{ data }` yang di-merge ke baris yang dibuat (`init-options.d.mts:1248-1256`; implementasi `better-auth/dist/db/with-hooks.mjs:6-22`). `create.after` diantre sampai transaksi selesai (`with-hooks.mjs:27-35`).
- **Urutan hook**: hook plugin dijalankan lebih dulu, hook `databaseHooks` milik app terakhir (`context/helpers.mjs:14-45`, source `"user"` di-push paling akhir). Plugin admin menyuntik `role = defaultRole` lewat hook-nya sendiri (`plugins/admin/admin.mjs:24-31`), jadi hook app BISA menimpa `role` karena `{...actualData, ...result.data}` memberi prioritas ke hook yang jalan belakangan.
- `validateUserInfo` (`init-options.d.mts:817-842`) adalah gerbang resmi baru 1.7 yang dipanggil sebelum `create-user`/`link-account`/`sign-in` untuk semua metode (menerima `source.method` dan `source.oauth.providerId`); mengembalikan `{ error }` menolak. Tidak dipakai di app sekarang. Cocok untuk menolak `method === 'email-password'` sign-up dan `anonymous` di server (temuan R12), TETAPI tidak cocok untuk menetapkan status `pending` (hanya menolak/mengizinkan).
- Opsi sosial `disableSignUp` / `disableImplicitSignUp` ada (`@better-auth/core/dist/oauth2/oauth-provider.d.mts:228-232`) tetapi MENOLAK akun baru; kita justru butuh akun baru dibuat berstatus `pending`, jadi JANGAN dipakai (alternatif ditolak di 3.2).
- Admin plugin: `adminRoles` wajib subset kunci `roles` (`admin.mjs:18-21`, melempar `BetterAuthError`); `impersonateUser` menolak target yang rolenya ada di `adminRoles` kecuali aktor punya `user:['impersonate-admins']` (`routes.mjs:585-592`); `has-permission.mjs:6` jatuh ke `defaultRole ?? "user"` bila `role` kosong.

### 2.2 Modul izin, guard, admin API, API key (kode fondasi)
- `server/permissions.ts:9-23`: `ROLES = {USER, ADMIN, SUPER_ADMIN}`; `ASSIGNABLE_ROLES = [USER, ADMIN]` (`:23`); `normalizeRole` (`:29-31`) jatuh ke `USER` untuk nilai tak dikenal/null. **Efek samping penting**: setelah `user` diganti `member`, baris DB lama berisi `'user'` akan dinormalisasi ke `member` hanya bila `isRole` mengenali string itu; jika `'user'` dihapus dari `isRole`, `normalizeRole('user')` tetap menghasilkan fallback `member` (aman), tetapi `WHERE role = 'user'` di SQL tidak ikut berubah, maka migrasi data wajib.
- `homeFor` (`:44-49`): super-admin→`/dev`, admin→`/dashboard`, selain itu→`/app`. Keputusan final minta `/app` untuk semua role dan `/dashboard` Admin+super-admin; sekarang isolasi ketat (admin tidak boleh ke `/app`, `requireUser` memakai `Object.values(ROLES)` di `guard.ts:34-36` tapi layout area memakai `requireRole`). Pertentangan dengan keputusan final ditandai di 3.4.
- `reconcileRole` (`:67-77`): email di env → super-admin; super-admin yang email-nya hilang dari env → `USER`. Harus diubah ke `MEMBER`. `canSetRole`/`canImpersonate` (`:80-92`) = hanya super-admin; `canActOnTarget` (`:85-90`) = admin hanya boleh bertindak pada non-admin.
- `ac`/`roles` (`:102-110`): `USER: newRole({})`, `ADMIN: {user:['list','ban'], session:['list']}`, `SUPER_ADMIN: adminAc.statements + 'impersonate-admins'`. Kunci `roles` WAJIB memuat setiap string role yang dipakai `adminRoles` dan `setRole` (`plugins/admin/admin.mjs:18-21`, `routes.mjs:70-74`).
- `server/roles.ts:11-19` `resolveUserRole` menulis ulang `user.role` bila beda dari `reconcileRole` (dipanggil dari `guard.ts:92`, `api-keys/plugin.ts:107`, `settings-maintenance.ts:106`).
- `server/guard.ts`: `requireAnyRole` (`:26-31`) → tanpa aktor redirect `signedOutTarget`, role salah redirect `homeFor`. Pola banned: `resolveActor` mengembalikan `null` untuk ban aktif tetapi menyimpan `session.user` di `WeakMap bannedRequests` (`:44-48,84-87`); `signedOutTarget` (`:54-57`) → `/banned` bila ada, `/login?notice=session` bila cookie sesi ada tapi sesi hilang (`hadSessionCookie`, `:38-42`), selain itu `/login`. `redirectToHome` (`:102-106`) dipakai `/go`.
- `server/auth.ts`: `admin({ac, roles, adminRoles:[ADMIN,SUPER_ADMIN], defaultRole: USER, impersonationSessionDuration})` (`:34-40`); `anonymous(...)` aktif (`:45`); `emailAndPassword.enabled: true` tanpa `disableSignUp` (`:121-123`); `socialProviders.google` hanya bila `hasGoogleAuth` (`:129-136`); `databaseHooks.user` hanya `delete.after` (`:76`) dan `session.create.after` (log login, `:77-110`) → **belum ada `user.create` hook**, ruang kosong untuk undangan/pending.
- `server/db/schema.auth.ts:5-30`: tabel `user` TANPA kolom status; `role text` nullable tanpa default (`:22`); `banned/banReason/banExpires` (`:23-25`); `isAnonymous` + index `user_is_anonymous_created_at_idx` (`:27,29`). Timestamp di tabel auth memakai `timestamp` tanpa zona (bukan `timestamptz`) — kolom baru di tabel `user` mengikuti konvensi tabel itu atau `timestamptz` (lihat 3.1).
- `server/api/admin.ts`: gerbang `isAdminRole` (`:40-42`); `POST /users/:id/role` hanya `canSetRole` = super-admin (`:47-49`), memakai `isAssignableRole`, memanggil `auth.api.setRole({headers,...})` (`:56`). **Masalah**: `setRole` BA mensyaratkan sesi aktor punya `user:['set-role']` (`routes.mjs:64-69`) dan `requireHeaders: true` (`:46`); role `admin` app hanya punya `list`,`ban` (`permissions.ts:104`), jadi memberi Admin hak ubah Member↔PM lewat jalur ini GAGAL 403 kecuali izin BA diperlebar. `ban` (`:70-107`) memakai `canActOnTarget`, mencabut sesi (`revokeUserSessions`), meng-audit; `DELETE /users/:id` hanya super-admin (`:128-149`). Semua pesan error berbahasa Inggris (`'Forbidden'`, `'Invalid role'`), padahal CLAUDE.md meminta bahasa Indonesia actionable.
- `server/api/admin-users.query.ts`: `UserListQuery` (`:9-21`) dengan filter `role`, `status: active|banned`; `role === ROLES.USER` memakai `or(eq,isNull)` (`:55-56`); `realUser` mengecualikan anonim (`:27`).
- `server/api/index.ts:50-63`: `/api/auth/*` diteruskan penuh ke Better Auth kecuali `/sign-in/anonymous`; urutan hook `apiErrorPlugin → rateLimit → maintenance → apiKey → demoRestrict → mount` adalah kontrak. `/api/app` (`server/api/app.ts:10-15`) menolak hanya `actor === null` dengan 401.
- API key: `api-keys/plugin.ts:93-120` memuat pemilik, menolak `owner.banned` (bukan `isBanActive`, jadi ban kedaluwarsa tetap memblokir — bug kecil terpisah), memanggil `resolveUserRole`, lalu `roleAllowsScope`. `scopes.ts:122` `ROLE_RANK: {user:0, admin:1, 'super-admin':2}`; `minRole` memakai `ROLES.USER` (3 scope `me`/`app:*`, baris 52,100,106,112), `ADMIN` (28,34), `SUPER_ADMIN` sisanya. `service.ts:25-38 clampScopes` memotong scope sesuai role pemilik. **Tidak ada pengecekan status akun** — pemilik `pending/rejected` dengan key lama masih lolos.
- `settings-maintenance.ts:23` default `allowRoles = [SUPER_ADMIN]`; `:50` memetakan teks tersimpan lewat `normalizeRole` (jadi nilai tersimpan `'user'` → `member`, aman); `:103-110` menentukan role dari sesi via `resolveUserRole`. Role `project_manager` otomatis dikenali begitu masuk `isRole`.

## 3. Rekomendasi
TODO

## 4. Risiko dan mitigasi
TODO

## 5. Estimasi usaha
TODO

## 6. Pertanyaan terbuka untuk user
TODO

## 7. Sumber
TODO
