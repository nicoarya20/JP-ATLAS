# R12 · Model ancaman, kontrol, audit, dan privasi data fitur PM (Simple PM)

> Tanggal: 15 Oktober 2026. Riset gelombang 1, hanya baca: tidak ada kode, dokumen, atau konfigurasi yang diubah, dan tidak ada test/server/migrasi yang dijalankan.
> Semua `path:baris` dibaca dari **working tree** branch `feature/project-management` (banyak file berstatus `M`, termasuk `server/auth.ts`), bukan dari commit terakhir. Temuan F1–F4 dibaca dari kode dan **belum direproduksi** (dilarang menjalankan server di riset ini). Yang tidak diverifikasi ditandai **ASUMSI**.
> Konteks: `riset/_BRIEF.md`; keputusan final di `tahapan-proyek/03-desain/erd/diskusi/00-role-dan-area.md`. Bila desain bentrok dengan kode yang berjalan, kode menang dan usulan perubahan fondasi ditandai **[FONDASI]** dengan biayanya.

## 1. Ringkasan eksekutif

1. Fondasi sudah punya pola aman yang bisa dipakai ulang: unggah avatar (magic bytes, nama acak, tanpa SVG, prefix per user), bentuk error seragam, `audit()`, rate limit per IP, pemetaan scope API key yang fail-closed. Yang **belum ada**: otorisasi per-resource (konsep anggota proyek) dan penegakan keputusan "Google saja" di sisi server.
2. Tiga celah di fondasi harus ditutup **sebelum** fitur PM (P0): **F1** sign-up email/password masih terbuka di produksi (toggle `signupEnabled`/`emailAuthEnabled` hanya mengatur tampilan); **F2** role super-admin ditentukan dari string email tanpa cek verifikasi, sehingga bersama F1 email super-admin bisa diklaim orang lain sebelum pemiliknya login pertama; **F3** endpoint admin Better Auth bisa dipanggil langsung lewat HTTP dan melewati matriks izin kita (Admin bisa memblokir Admin lain/super-admin, tanpa audit).
3. Tabel ancaman memuat **23 baris** (§2.2). Kontrol wajib dirinci **67 butir di 14 modul** (§3.2); tiap butir memuat uji yang bisa langsung ditulis sebagai test bun.
4. Daftar audit: **25 aksi baru** + 5 aksi lama yang dipakai ulang, beserta label dan warna `ACTION_META` (§3.3). Rutin kerja (geser status tugas, komentar) tetap di `task_activities`/`project_activities`, bukan `audit_log`.
5. Kebijakan privasi (§3.4): tabel data, siapa melihat, berapa lama disimpan, dan nasib data saat akun dihapus, plus draf teks bahasa polos. Semua angka retensi selain "Sampah 30 hari" dan "rekaman mentah 30 hari" adalah **usulan** yang perlu keputusan user.
6. Keputusan yang perlu user (§6): batas domain email, nasib konten saat akun dihapus, angka retensi log, fitur AI/rekaman default mati atau hidup, dan siapa boleh melihat nomor HP.
7. Estimasi (§5): **±25–38 hari-orang AI** (MVP tanpa fase 5: ±20–30) **+ ±4.5–6 hari reviewer manusia**, sebagian besar menyatu dengan pekerjaan modul lain; paket fondasi P0 saja ±4–6 hari.

## 2. Temuan

### 2.1 Temuan di kode yang berjalan

| ID | Temuan | Bukti | Tingkat |
|---|---|---|---|
| F1 | Sign-up/sign-in email-password hidup di server. Toggle `emailAuthEnabled`/`signupEnabled` hanya dibaca loader halaman login; tidak ada hook Better Auth yang menegakkannya. Test sign-up menunjukkan endpoint berfungsi dan konfigurasinya tidak bergantung pada `isProd`. Keputusan "Google saja" belum tegak. | `server/auth.ts:121-123` (`emailAndPassword: { enabled: true }`, tanpa `hooks`/`requireEmailVerification`); toggle hanya di `app/routes/login.tsx:15-21`, `server/settings.ts:51`; `tests/auth-flow.test.ts:35` | Tinggi |
| F2 | Super-admin = email ada di `SUPER_ADMIN_EMAILS`, dicocokkan sebagai string; `emailVerified` tidak dicek. Dengan F1, penyerang yang tahu email super-admin dapat `POST /api/auth/sign-up/email` (sesi otomatis) sebelum pemilik pernah login, lalu `resolveUserRole` menaikkannya jadi super-admin. Syarat: akun email itu belum ada (UNIQUE). Jendela: deployment baru atau email baru ditambahkan ke env. | `server/permissions.ts:51-53,62-71`; `server/roles.ts:14-19`; `server/guard.ts:92`; auto-login saat sign-up: `node_modules/better-auth/dist/api/routes/sign-up.mjs:162-163` | Tinggi |
| F3 | `/api/auth/*` diteruskan utuh ke Better Auth kecuali `sign-in/anonymous`. Endpoint `POST /api/auth/admin/ban-user` hanya mengecek izin `user:ban` (Admin punya) dan "bukan diri sendiri", **tanpa cek role target** dan tanpa `audit()`. Admin bisa memblokir Admin lain atau super-admin langsung, melewati `canActOnTarget`. Endpoint baca (`list-users`, `list-user-sessions`) juga terbuka sesuai izin `user:list`/`session:list`; apakah objek sesi yang dikembalikan memuat token mentah **ASUMSI** belum diperiksa (cookie bertanda tangan, jadi token saja kemungkinan tidak cukup). Klien hanya memakai `impersonateUser` dan `stopImpersonating`. | `server/api/index.ts:50-63,85-87`; `node_modules/better-auth/dist/plugins/admin/routes.mjs:506-540`; `server/permissions.ts:104`; `app/components/users/useUserActions.tsx:150`, `app/components/AppFrame.tsx:114` | Tinggi |
| F4 | Aturan baru "Admin boleh ubah Member↔PM" tidak bisa dipenuhi dengan kode sekarang: `admin.ts:56` meneruskan header pemanggil ke `auth.api.setRole`, dan Better Auth meminta izin `user:set-role` yang tidak dimiliki Admin. Godaan memberi `set-role` ke Admin akan membuka `/api/auth/admin/set-role` langsung untuk **role apa saja**, melewati matriks. | `server/api/admin.ts:48,56`; `node_modules/better-auth/dist/plugins/admin/routes.mjs:43-68`; `server/permissions.ts:102-109` | Tinggi |
| F5 | Guard `/api/app` hanya mengecek "sudah login"; tidak ada konsep keanggotaan proyek. Pola per-handler (`own`/`isAdminRole` di tiap endpoint) mudah terlewat di endpoint ke-30. `resolveActor` belum tahu status `pending/rejected`; jalur API key memeriksa `owner.banned` tanpa memperhatikan `banExpires` (beda dengan `isBanActive`) dan tidak memeriksa status. | `server/api/app.ts:10-15`; `server/api/posts.ts:58-62`; `server/guard.ts:67-96`; `server/api-keys/plugin.ts:105-107` vs `server/ban.ts:21-25` | Sedang |
| F6 | Rate limit: satu limiter **per IP** untuk seluruh `/api`, bawaan 100 request/60 dtk, di memori satu proses; pengecualian `/api/auth/` dan `/api/mcp`; berjalan di `onRequest` (sebelum identitas diketahui); tidak membedakan baca/tulis/unggah. Kantor satu IP berbagi satu bucket (IPv4 apa adanya). Rute SSR (`.data`, loader) tidak melewati `/api`, jadi tidak dibatasi. | `server/env.ts:32-33`; `server/rate-limit.ts:2-4,33,35,48-63`; `server/middleware/rate-limiter.ts:72-73`; `server/prod.ts:53-56` | Sedang |
| F7 | Storage: pola avatar aman dan bisa dipakai ulang, tetapi (a) baca **publik tanpa auth** dengan `cache-control: public, immutable` (tidak boleh dipakai untuk bukti/rekaman), (b) hanya 4 tipe gambar, (c) batas 2 MB dicek **setelah** body masuk memori, dan `Bun.serve` tidak mengatur `maxRequestBodySize` (bawaan Bun 128 MB). | `server/api/app-avatar.ts:11-17,26-34,82,90-91`; `server/api/storage-files.ts:9-24`; `server/api-keys/scopes.ts:175-180`; `server/prod.ts:47`; `node_modules/bun-types/serve.d.ts:762` | Sedang |
| F8 | Tidak ada header keamanan di respons SSR/API selain `nosniff` pada beberapa respons: tidak ditemukan CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, HSTS di `server/` maupun `app/`. **ASUMSI**: bisa saja diatur reverse proxy; `Dockerfile`/`docker-compose.yml` tidak memuatnya. Dampak naik begitu ada konten buatan user (komentar, catatan). | `app/entry.server.tsx:57` (hanya `Content-Type`); `server/api/storage-files.ts:22`; `server/seo.ts:61` | Sedang |
| F9 | Audit: `audit()` best-effort (tidak pernah melempar) dan umumnya dipanggil `void`. `AuditTargetType` hanya 6 nilai, `TARGET_LABELS` hanya 4. Impersonasi tercatat saat sesi dibuat, tetapi `Actor` tidak membawa `impersonatedBy` (kolomnya ada di `session`), jadi tulisan PM saat menyamar tampak berasal dari user yang ditiru. Hapus akun sendiri (`deleteUser`) tidak diaudit. | `server/audit.ts:40,62-89`; `app/lib/audit-api.ts:119-124`; `server/auth.ts:76,94-104,124-128`; `server/guard.ts:61`; `server/db/schema.auth.ts:43-45` | Sedang |
| F10 | Penghapusan akun: tabel log memakai `set null` (visit/rate-limit/audit), `login_log` dan `post` `cascade`; audit tetap menyimpan `actor_email` (snapshot) dan `summary` yang bisa memuat email. Retensi log bawaan NULL (selamanya). Tabel PM di ERD memakai `author_id/uploaded_by/actor_id` NOT NULL: menghapus user akan gagal atau menghapus bukti. | `server/db/schema.logs.ts:17,51,96,114-115`; `server/db/schema.app.ts:14`; `server/settings-retention.ts:34-44`; `server/api/posts.ts:74`; `task.md` (tabel `task_comments`, `task_attachments`) | Sedang |
| F11 | Klaim Google di Better Auth 1.7.3: `emailVerified` diambil dari `email_verified`; pembatasan `hd` hanya aktif bila opsi `hd` diisi (belum diisi); `getUserInfo` hanya `decodeJwt` dari id_token hasil pertukaran kode. Implicit link ke akun lokal butuh `emailVerified` Google dan akun lokal terverifikasi (`requireLocalEmailVerified` bawaan true). `disableImplicitLinking` belum dipakai: email Workspace yang didaur ulang (sub baru, email sama) akan **tertaut ke akun lama**. | `node_modules/@better-auth/core/dist/social-providers/google.mjs:114-130`; `node_modules/better-auth/dist/oauth2/link-account.mjs:76-79`; `node_modules/@better-auth/core/dist/types/init-options.d.mts:1065,1084`; `server/auth.ts:129-136` | Sedang |
| F12 | API key: `/api/app/*` memakai satu pasang scope (`app:read`/`app:write`) untuk semua data PM; kunci bertindak sebagai pemilik, jadi matriks izin ikut berlaku (baik). `ROLE_RANK` hanya memuat 3 role: role `project_manager` akan bernilai `undefined` dan **gagal tertutup** (kunci PM tidak jalan sampai diperbarui). Path tak dikenal otomatis `null` (aman). | `server/api-keys/scopes.ts:122,141-169`; `server/guard.ts:67-79` | Rendah |
| F13 | Logger tanpa `redact`; ring buffer log terbaca super-admin (`/dev/server-logs`) dan API key scope `mcp`. Pemanggilan log yang ada hanya memuat id/path, bukan body (baik); `api-error` menyembunyikan pesan 500 di produksi. | `server/logger.ts:13-58`; `server/api-error.ts:1-12` | Rendah |
| F14 | Mode maintenance mengecualikan semua path berakhiran `.data` (data loader React Router): saat maintenance, user non-allowed masih bisa membaca data halaman yang loader-nya lolos `requireUser`; hanya `/api` yang diblokir. | `server/settings-maintenance.ts:71-73` | Rendah |

### 2.2 Tabel ancaman (23 baris)

Fase: **P0** = MVP, **P1** = segera setelah MVP, **F5** = fase 5 (ditunda). Kolom "Kontrol" merujuk checklist §3.2.

| ID | Ancaman dan skenario | Kondisi sekarang | Kontrol | Fase |
|---|---|---|---|---|
| T01 | **IDOR proyek**: Member membuka/ubah `/api/app/projects/:id` proyek yang bukan miliknya dengan menebak id. | Belum ada API proyek; guard hanya "login" (F5). | C-ACC-1,2 | P0 |
| T02 | **IDOR anak resource**: `taskId`/`commentId`/`attachmentId`/`eventId` milik proyek B dipakai lewat path proyek A. | Belum ada. | C-ACC-3 | P0 |
| T03 | **Peran proyek dilanggar**: Pemantau menulis, Anggota menyetujui/mematikan "Perlu diperiksa", Anggota mengubah tugas orang lain, loncat status lewat PATCH. | Matriks hanya di dokumen (`task.md:56-70`). | C-ACC-4, C-TSK-6 | P0 |
| T04 | **PM bukan anggota** dianggap pengelola (tombol tersembunyi tetapi API terbuka); Admin vs PM tertukar. | Belum ada; `canActOnTarget` hanya mengenal admin/super. | C-ACC-5 | P0 |
| T05 | **Mass assignment**: body memuat `role`, `status`, `projectId`, `createdBy`, `leadId`, `deletedAt`, `approvedBy`. | Pola aman: field dipilih eksplisit (`posts.ts:47,65`); perilaku properti ekstra di Elysia **ASUMSI** belum diuji. | C-ACC-8, C-AUTH-6 | P0 |
| T06 | **Eskalasi role akun lewat endpoint Better Auth langsung** (ban/set-role/create-user/update-user). | Terbuka (F3, F4). | C-AUTH-3,4 | P0 |
| T07 | **Pra-klaim email** super-admin/undangan lewat sign-up email tanpa verifikasi. | Terbuka (F1, F2). | C-AUTH-1,2 | P0 |
| T08 | **Klaim email Google**: `email_verified=false`; domain Workspace didaur ulang; `hd` tidak dicek; mengandalkan akhiran email sebagai bukti domain. | `hd` tidak diisi; implicit linking aktif (F11). | C-AUTH-5,8,9 | P0 |
| T09 | **Penyalahgunaan undangan awal**: salah ketik email, role di atas wewenang pembuat, undangan tanpa kedaluwarsa, dipakai dua kali (balapan), tetap hidup setelah dicabut. | Belum ada tabel undangan. | C-INV-1..5 | P0 |
| T10 | **Enumerasi akun/undangan/anggota**: respons berbeda untuk "email terdaftar", peringatan impor CSV, pencarian anggota/mention, direktori Tim lintas proyek. | Belum ada. | C-INV-1, C-TSK-5, C-TIM-1 | P0 |
| T11 | **XSS tersimpan**: komentar, catatan, deskripsi, judul, nama tag/jenis, nama file, `meeting_url`/URL bukti `javascript:`, `@mention`. | React meng-escape secara bawaan; tidak ada pustaka Markdown/HTML di `package.json`; satu `dangerouslySetInnerHTML` statis (`app/root.tsx:71`); tanpa CSP (F8). | C-TSK-1..3, C-WEB-1 | P0 |
| T12 | **CSV injection**: ekspor memuat sel `=HYPERLINK(...)`, `+`, `-`, `@`, TAB/CR/LF; impor memuat formula, file raksasa, kolom `created_by`. | Fase 5, belum ada. | C-CSV-1,2 | F5 |
| T13 | **Unggah bukti berbahaya**: SVG/HTML menyamar PNG, ekstensi ganda, MIME palsu, nama berisi `../` atau CRLF, file sangat besar (memori), jumlah lampiran tak terbatas. | Avatar aman, tapi tipe terbatas dan body tidak dibatasi (F7). | C-UPL-1..3 | P0 |
| T14 | **Akses file tanpa otorisasi**: URL bukti/rekaman ditebak atau dibagikan; cache publik immutable; file dilayani inline sebagai HTML. | Rute storage publik hanya `avatars/` (F7). | C-UPL-4,5 | P0 |
| T15 | **Flood tulis/unggah** oleh satu akun atau satu kantor (NAT) yang menghabiskan bucket IP semua rekan. | Limiter per IP, 100/mnt, tanpa identitas (F6). | C-RL-1..3 | P0 |
| T16 | **Impersonasi super-admin** tanpa jejak aksi, melakukan aksi destruktif/sensitif atas nama user. | Sesi 1 jam, awal impersonasi diaudit; aksi saat menyamar tidak dibedakan (F9). | C-IMP-1 | P0 |
| T17 | **API key dan data PM**: scope terlalu lebar, kunci mengunduh file/ekspor/purge, kunci pemilik `pending`/`suspended`/ban kedaluwarsa. | F12, F5. | C-KEY-1..3 | P0 |
| T18 | **Kebocoran PII di log**: email/HP/isi komentar masuk log aplikasi, ring buffer MCP, `summary` audit. | Belum ada fitur PM; `summary` post memuat email (`posts.ts:74`); tanpa `redact` (F13). | C-LOG-1,2 | P0 |
| T19 | **Retensi saat user dihapus/ditolak**: PII audit bertahan, bukti dan rekaman yatim, FK NOT NULL memblokir atau menghapus riwayat, pengelola tunggal pergi. | F10. | C-AUTH-10, C-PRV-1,2 | P0 |
| T20 | **Rekaman suara/foto rapat**: tanpa consent, peserta eksternal, akses audio oleh orang tak berhak, data ke penyedia AI tanpa DPA, **prompt injection** lewat transkrip/foto membuat tugas atau menghapus data. | Fase 5; desain sudah mensyaratkan consent dan konfirmasi manusia (`05-events.md` #7-8, #16). | C-REC-1..7 | F5 |
| T21 | **Akun `pending/rejected/suspended`** tetap memakai `/api/app` atau API key. | `resolveActor` belum mengenal status (F5). | C-AUTH-7 | P0 |
| T22 | **Sampah**: pemulihan/purge lintas wewenang; item terhapus masih terbaca lewat id; purge permanen tak tercatat. | Belum ada. | C-TRASH-1..3 | P0 |
| T23 | **Clickjacking / tidak ada CSP** pada halaman yang menampilkan konten buatan user; maintenance tidak menutup `.data`. | F8, F14. | C-WEB-1,2 | P0 |

## 3. Rekomendasi

### 3.1 Keputusan, alternatif yang ditolak, biaya

| # | Keputusan | Alternatif ditolak dan alasan | Biaya / fondasi |
|---|---|---|---|
| R1 | **Satu pintu akses**: `server/pm/access.ts` berisi `loadProjectAccess(actor, projectId)` (mengembalikan `{ project, projectRole \| null }` dari DB) dan fungsi murni `can(action, access, resource)` yang mengkodekan matriks `project.md:22-32`, `task.md:56-70`, `05-events`, `08-sampah`. Resource tak terlihat → **404 seragam** (tidak 403). Test kontrak memindai rute PM agar semuanya memakai pintu ini (pola `tests/app-routes.test.ts`). | Cek manual per handler (pola `posts.ts`): terbukti rawan lupa. Row-Level Security Postgres: tidak cocok dengan pool Drizzle dan menyulitkan test. Guard prefix generik: tidak tahu peran per resource. | M. Tidak mengubah fondasi. |
| R2 | **Tegakkan "Google saja" di server** **[FONDASI]**: `emailAndPassword.enabled: !isProd` (sesuai `00-role-dan-area.md` §4) dan `reconcileRole` memberi super-admin hanya jika `emailVerified === true` (sumber: Google `email_verified`). Tambah pemeriksaan di `scripts/smoke-server.checks.ts`: `POST /api/auth/sign-up/email` di prod harus ditolak. | Mengandalkan toggle DB `signupEnabled` (sudah terbukti hanya UI). Menghapus kode email-password (dev lokal membutuhkannya). | S. Ubah `auth.ts`, `permissions.ts`/`roles.ts`, ±4 test. |
| R3 | **Tutup endpoint mutasi admin Better Auth di tepi HTTP** **[FONDASI]**: tolak **seluruh** prefix `/api/auth/admin/` di `isAuthPath` (`api/index.ts:54-63`) kecuali `impersonate-user` dan `stop-impersonating` (allowlist, bukan daftar hitam: endpoint baru di versi Better Auth berikutnya otomatis tertutup). Daftar endpoint 1.7.3 (`routes.mjs`): ban-user, unban-user, set-role, remove-user, create-user, update-user, set-user-password, revoke-user-session(s), list-users, get-user, list-user-sessions, has-permission. Wrapper kita memanggil `auth.api.*` **in-process**, jadi tidak terpengaruh. Ubah role dengan tulis DB setelah cek matriks; **jangan** beri `set-role` ke Admin di `ac`. | Memberi Admin izin BA lebih rinci: `ac` bersifat per-role, bukan per-target, jadi tidak bisa menyatakan "tidak boleh pada Admin lain". Hook `databaseHooks.user.update.before`: berguna sebagai lapis kedua, bukan pengganti. | S. Klien hanya memakai impersonate/stop (diverifikasi grep). |
| R4 | **Identitas Google**: kunci = `account(provider='google').accountId` (sub), bukan email (Google: jangan pakai email sebagai pengenal unik; pakai `sub`). Set `account.accountLinking.disableImplicitLinking: true`. Undangan hanya dikonsumsi bila `emailVerified`. Bila user memutuskan batas domain: isi opsi `hd` Google **dan** env `ALLOWED_EMAIL_DOMAINS` (hook `user.create.before`), tetapi domain cocok **tidak** menggantikan persetujuan Admin; hanya undangan yang melewati `pending`. | Domain allowlist saja: akhiran email bukan bukti keanggotaan Workspace (Google menyuruh memakai `hd`), domain bisa didaur ulang. `hd` saja: tidak ada untuk Gmail biasa dan tidak mencegah daur ulang domain. Email sebagai kunci (`user-profile.md` memakai kolom `google_sub`; fondasi memakai tabel `account`, jadi fondasi menang). | S. |
| R5 | **Status akun di satu tempat**: `resolveActor` menolak `pending/rejected/suspended` (sesi dan API key) dengan kode `ACCOUNT_PENDING/REJECTED/SUSPENDED`; halaman tahan memakai pembaca terpisah seperti `getBannedUser`. Plugin API key memakai `isBanActive`. | Cek status di tiap guard/rute: duplikasi dan mudah lupa. | S. |
| R6 | **Rate limit tulis per-user**: instance `RateLimiter` kedua di `onBeforeHandle` `appApi` (identitas sudah ada), kunci `u:<userId>`; konstanta bernama `PM_WRITE_LIMIT` (usulan 60/mnt), `PM_UPLOAD_LIMIT` (usulan 10/mnt), `PM_EXPORT_LIMIT` (usulan 5/jam), semua bisa di-override env. Limiter IP tetap sebagai lapis luar; pertimbangkan menaikkan bawaan 100/mnt karena NAT kantor. | Redis/shared store: belum perlu (satu proses, `rate-limit.ts:35` sudah mencatat batasnya). Dekorator per endpoint: sulit diaudit. | S. Angka = usulan, bukan dari sumber. |
| R7 | **Bukti/file**: rute baru `GET /api/app/files/:attachmentId` (auth + `loadProjectAccess` + lampiran belum dihapus), `Cache-Control: private, no-store`, `nosniff`, `Content-Security-Policy: sandbox`, `Content-Disposition: attachment` kecuali gambar. Kunci objek `app/attachments/<uploaderId>/<uuid>.<ext>` (CLAUDE.md: prefix `<area>/<userId>/`, nama acak). DB menyimpan **key**, bukan URL. Tipe MVP: PNG/JPEG/WEBP/GIF (pakai ulang `sniffImage`) + PDF (magic `%PDF-`); docx/xlsx (zip, bisa bermakro) ditunda. Cek `Content-Length` > `ATTACHMENT_MAX_BYTES` sebelum membaca, dan set `maxRequestBodySize` eksplisit di `Bun.serve` **[FONDASI, 1 baris di prod.ts/dev.ts/binary]**. Allowlist `storage-files.ts` tetap hanya `avatars/`. | Presigned URL langsung ke browser: melompati audit dan otorisasi, tidak bisa dicabut seketika, hostname RustFS lokal tidak publik. ClamAV/antivirus: beban ops, tunda (P2). Izinkan SVG: dilarang CLAUDE.md. | M. |
| R8 | **XSS**: komentar/catatan/deskripsi dirender sebagai **teks** (`white-space: pre-wrap`), tanpa Markdown/HTML di MVP. Tautan otomatis hanya `http(s)`. Bila Markdown dipilih kelak: pustaka dengan sanitizer + test payload. Tambah `server/security-headers.ts` (CSP mulai `Content-Security-Policy-Report-Only`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS bila HTTPS) dan pasang di `prod.ts`, `dev.ts`, `binary-entry.ts`. | Menyerahkan semua ke reverse proxy: tidak terjamin pada binary/self-host. CSP langsung enforce: berisiko merusak Mantine/hidrasi SSR (inline style/script, **ASUMSI** perlu nonce), jadi Report-Only dulu. | M. |
| R9 | **Undangan awal**: tabel `user_invitation` (`id`, `email_normalized`, `role`, `invited_by`, `expires_at`, `used_by`, `used_at`, `revoked_at`); unik parsial untuk undangan aktif; kedaluwarsa `INVITATION_TTL_DAYS` (usulan 14); konsumsi **atomik** (`UPDATE … WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING`) di dalam `user.create.before`; role ≤ wewenang pembuat (Admin: Member/PM; Admin/super-admin hanya oleh super-admin); email di audit dimasker. | Tautan undangan bertoken yang dikirim lewat email: di luar keputusan final ("Admin isi email + role", tanpa email keluar, **ASUMSI**). | M (bersama modul akun). |
| R10 | **Impersonasi**: tambah `impersonatedBy` ke `Actor`; ikut di `meta` semua `audit()` dan baris aktivitas. Blokir aksi sensitif saat menyamar (hapus akun, ubah role, API key, ekspor, purge, unggah rekaman) dengan pola `DEMO_BLOCKED`. | Menghapus fitur: tim dukungan membutuhkannya. Mode baca-saja total: terlalu membatasi untuk reproduksi bug. | S. |
| R11 | **API key**: pertahankan satu pasang `app:read/app:write` (fondasi menang); izin = izin pemilik. Rute unduh-file, ekspor, purge, dan admin PM dipetakan `requiredScope → null`. Perbarui `ROLE_RANK` untuk 4 role dan `minRole` scope. | Scope per proyek: kompleksitas besar, blob izin Better Auth tidak cocok. | S. |
| R12 | **Log/PII**: konvensi log hanya `{ userId, projectId, taskId, requestId }`; `summary` audit tanpa email/HP (nama + id); tambah `redact` pino (`req.headers.cookie`, `*.email`, `*.phone`, `*.body`) sebagai lapis kedua; test statis memindai `server/pm`. | Menyaring di sisi pembaca log: data sudah tersimpan di ring buffer. | S. |
| R13 | **Hapus akun = hapus data pribadi, pertahankan konten kerja**: FK `created_by/author_id/uploaded_by/actor_id` dibuat **nullable + `ON DELETE SET NULL`** dan UI menampilkan "Mantan anggota"; profil, avatar, sesi, API key, preferensi, cuti dihapus; hook `deleteUser.beforeDelete` (ada di Better Auth, `init-options.d.mts:894`) menolak bila ia pengelola tunggal proyek aktif; `afterDelete` mengaudit `user.self_delete`. | Hapus berantai konten: bukti dan riwayat pemeriksaan hilang (bertentangan dengan `08-sampah.md` #13). Hanya menonaktifkan akun: tidak memenuhi permintaan hapus. | M. Perlu review legal (§6 Q2). |
| R14 | **Rekaman/AI (fase 5)**: tabel `recording_consent` terpisah (siapa, kapan, daftar peserta, versi teks; `consent_confirmed` di `event_note_sources` tidak cukup); audio mentah hanya notulis, pembuat, Pengelola (`workflow.md:650`) dan setiap akses diaudit; endpoint AI mengembalikan 403 `AI_DISABLED` bila `ai_enabled` mati; **usulan `ai_enabled` bawaan MATI** sampai Admin menyalakannya (dokumen `09-pengaturan.md:60` menulis bawaan hidup; D3 meminta review legal dulu); output AI hanya draf, tanpa tool-call, tugas hanya dari klik Konfirmasi. | Bawaan hidup: rekaman bisa terjadi sebelum DPA/legal selesai. Redaksi PII otomatis wajib: tidak diwajibkan sumber, tetap opsi (A4). | M–L (fase 5). |

### 3.2 Checklist kontrol wajib per modul (setiap butir = satu test)

Format kolom Uji: `kasus → ekspektasi`. Test memakai `spyOn(auth.api,'getSession')` dan `spyOn(rolesMod,'resolveUserRole')` seperti `tests/api/app.test.ts:9-16`, bukan `mock.module('../server/guard')` (aturan CLAUDE.md).

| ID | Kontrol | Uji |
|---|---|---|
| **AUTH · akun dan login** | | |
| C-AUTH-1 | Di produksi sign-up/sign-in email ditolak | `NODE_ENV=production`, `POST /api/auth/sign-up/email` → 404/403, tidak ada baris `user` baru |
| C-AUTH-2 | Super-admin dari env butuh email terverifikasi | user `emailVerified=false` dengan email di `SUPER_ADMIN_EMAILS` → `resolveUserRole` ≠ `super-admin` |
| C-AUTH-3 | `/api/auth/admin/*` tak bisa lewat HTTP, kecuali impersonate/stop | sesi Admin `POST /api/auth/admin/ban-user` dan `list-user-sessions` → 404/403; `impersonate-user` oleh super-admin tetap 200 |
| C-AUTH-4 | Matriks role akun sesuai `00-role-dan-area.md` §3 | table-driven: aktor {admin, super-admin} × target {member, PM, admin, super-admin} × {ubah role, suspend, setujui}; Admin ke Admin/super → 403 |
| C-AUTH-5 | Linking implisit mati; kunci = sub | `auth.options.account.accountLinking.disableImplicitLinking === true`; callback sub baru + email lama → `account not linked` |
| C-AUTH-6 | Kolom sensitif tak bisa diisi klien | `POST /api/auth/update-user` dengan `status`, `role`, `approvedBy`, `textSize` salah → diabaikan/400; `additionalFields` `input:false` (**ASUMSI** perilaku BA) |
| C-AUTH-7 | Status akun ditegakkan di API dan API key | `pending/rejected/suspended` → `GET /api/app/whoami` 403 dengan kode; kunci milik mereka 403; loader halaman tahan 200 |
| C-AUTH-8 | `email_verified=false` tak pernah auto-approve | undangan cocok + `emailVerified=false` → akun `pending`, undangan tidak terpakai |
| C-AUTH-9 | Batas domain (bila diputuskan) ditegakkan di server | email di luar `ALLOWED_EMAIL_DOMAINS` → akun tidak dibuat; domain cocok tanpa undangan → tetap `pending` |
| C-AUTH-10 | Hapus akun mengikuti R13 | pengelola tunggal → ditolak; selain itu profil/avatar/sesi hilang, konten tetap "Mantan anggota", `audit_log` `user.self_delete` ada |
| **INV · undangan awal** | | |
| C-INV-1 | Email dinormalisasi dan unik untuk undangan aktif | `' Budi@Kantor.ID '` lalu `budi@kantor.id` → 409 kedua |
| C-INV-2 | Role undangan ≤ wewenang pembuat | Admin buat role `admin` → 403; super-admin → 201 |
| C-INV-3 | Sekali pakai, kedaluwarsa, atomik | dua login Google serentak memakai undangan sama → tepat satu `approved`, satu `pending`; undangan kedaluwarsa/terpakai/dicabut → `pending` |
| C-INV-4 | Pencabutan berlaku seketika dan teraudit | cabut lalu login → `pending`; baris `invitation.revoke` ada |
| C-INV-5 | Batas undangan aktif | lebih dari `INVITATION_MAX_ACTIVE` (konstanta) → 409/429 |
| **ACC · akses data PM (semua modul)** | | |
| C-ACC-1 | Semua rute PM memakai `loadProjectAccess` | test kontrak memindai `server/api/pm-*.ts` dan `app/routes/app/*` (loader memanggil `requireUser`/pintu akses) |
| C-ACC-2 | Non-anggota mendapat 404 identik dengan id acak | Member GET/PATCH/DELETE proyek dan tugas non-anggota → 404 dengan body sama persis dengan id yang tak ada |
| C-ACC-3 | `projectId` path tak dipercaya | `/projects/A/tasks/<taskDiB>` → 404; anak selalu dimuat lewat join `project_id` |
| C-ACC-4 | Matriks `can()` lengkap | tabel uji untuk seluruh sel di `task.md:56-70`, `project.md:22-32`, `05-events` Hak akses, `08-sampah` §2 |
| C-ACC-5 | PM bukan Pengelola hanya-baca; Admin/super-admin penuh | PM non-anggota: GET 200, PATCH 403; PM Pengelola: PATCH 200; Admin non-anggota: PATCH 200 + audit `project.admin_override` |
| C-ACC-6 | Daftar, pencarian, hitungan, mention, dasbor, Inbox ikut memfilter | Member punya 1 dari 3 proyek → semua endpoint list/count/search hanya memuat 1 |
| C-ACC-7 | Pengelola terakhir tak bisa pergi | hapus/turunkan pengelola tunggal → 409 `LAST_MANAGER`; juga saat akun ditangguhkan/dihapus |
| C-ACC-8 | Anti mass assignment | kirim `{projectId, createdBy, status:'done', deletedAt, leadId, role, approvedBy}` ke tiap POST/PATCH → 422/diabaikan, baris DB tak berubah (`additionalProperties:false` + field dipilih eksplisit) |
| **TSK · tugas, komentar, catatan** | | |
| C-TSK-1 | Teks pengguna selalu dirender sebagai teks | `renderToString` komentar `<img src=x onerror=alert(1)>` → ter-escape; pemindaian statis: `dangerouslySetInnerHTML` hanya di allowlist (`app/root.tsx`) |
| C-TSK-2 | Semua teks punya batas panjang (konstanta) | judul/komentar/catatan melebihi batas → 422 |
| C-TSK-3 | URL tautan hanya `http(s)` | `javascript:`, `data:`, `file:`, `//evil` di bukti/`meeting_url` → 422; tautan render `rel="noopener noreferrer"` |
| C-TSK-4 | Komentar: ubah hanya oleh penulis; hapus oleh penulis, Pengelola, atau Admin (usulan, `task.md` tidak merinci) | Anggota lain PATCH/DELETE komentar orang → 403; hapus oleh bukan penulis menulis `comment.delete` |
| C-TSK-5 | `@mention` hanya anggota proyek itu | mention nama user non-anggota → tak ada notifikasi, teks tetap polos |
| C-TSK-6 | Transisi status hanya lewat fungsi service | Anggota PATCH `status:'done'`/Setujui → 403; Pemantau tulis apa pun → 403 |
| **UPL · bukti dan file** | | |
| C-UPL-1 | Tipe dari magic bytes, allowlist | file `a.png` isi `<svg>`/HTML, `a.pdf.html`, content-type palsu, zip → 415 |
| C-UPL-2 | Batas ukuran dan jumlah | `Content-Length` > `ATTACHMENT_MAX_BYTES` → 413 sebelum membaca; body > `maxRequestBodySize` ditolak server; lampiran ke-(N+1) → 409 |
| C-UPL-3 | Nama objek acak, nama asli disanitasi | `../../x`, `a\r\nb.png`, 300 karakter → key tetap `app/attachments/<uid>/<uuid>.<ext>`, `file_name` bersih |
| C-UPL-4 | Unduh hanya lewat rute berotorisasi dan header aman | non-anggota 404; anggota 200 dengan `private, no-store`, `nosniff`, `attachment`, CSP sandbox; lampiran terhapus 404 |
| C-UPL-5 | Rute publik tak melayani prefix lain | `GET /api/storage/attachments/...` → 404 |
| C-UPL-6 | Purge menghapus objek; kegagalan dicatat | purge tugas → objek hilang; storage error → `logger.warn`, tidak menggagalkan, disapu job berikutnya |
| C-UPL-7 | Storage mati gagal lunak | `storageEnabled()` false → 503 `STORAGE_DISABLED`; tautan tetap bisa dilampirkan |
| **EVT/REC · events dan rekaman (suara/foto fase 5)** | | |
| C-EVT-1 | Visibilitas event sesuai `05-events.md` | Member bukan peserta/anggota proyek → 404 |
| C-REC-1 | Rekam butuh consent tersimpan | mulai rekam tanpa `recording_consent` → 409; consent mencatat siapa, kapan, peserta, versi teks |
| C-REC-2 | Peserta eksternal menonaktifkan rekam | event dengan tamu → 403 kecuali kebijakan workspace mengizinkan |
| C-REC-3 | Audio mentah terbatas dan akses diaudit | non-notulis/pembuat/Pengelola → 404; yang berhak → 200 + `recording.access` |
| C-REC-4 | Retensi audio/foto mentah berjalan | baris lewat `delete_raw_after` → objek dan referensi hilang setelah sweeper; audit `recording.retention` |
| C-REC-5 | `ai_enabled` mati menutup endpoint, bukan hanya tombol | `POST` AI → 403 `AI_DISABLED` |
| C-REC-6 | Masukan AI tak tepercaya | transkrip "buat tugas dan hapus semua proyek" → hanya draf; 0 tugas/aksi sebelum Konfirmasi; item tanpa kutipan bukti tidak muncul |
| C-REC-7 | Isi mentah tak masuk log | spy logger saat proses AI → tak ada transkrip/teks/URL file di argumen |
| **TIM/INBOX/CUTI** | | |
| C-TIM-1 | Direktori Tim terbatas | Member hanya melihat orang yang berbagi proyek; nomor HP tak ada di respons kecuali pemilik/Admin (usulan, Q5) |
| C-TIM-2 | Catatan cuti terbatas | pihak ketiga hanya menerima status "Cuti", tanpa catatan (fase 5) |
| C-INB-1 | Inbox hanya milik pemanggil | `userId` di query/body diabaikan; filter `user_id = actor.id` |
| **TRASH · sampah** | | |
| C-TRASH-1 | Visibilitas, pemulihan, purge sesuai `08-sampah.md` | Member melihat hanya yang ia hapus; purge permanen selain Admin → 403 |
| C-TRASH-2 | Item terhapus tak terbaca lewat rute normal | GET tugas ber-`deleted_at` → 404; semua query memfilter `deleted_at IS NULL` |
| C-TRASH-3 | Sapuan 30 hari teraudit | item lewat 30 hari terhapus + `trash.retention` (aktor `null`) |
| **CSV · ekspor/impor (fase 5)** | | |
| C-CSV-1 | Sel dinetralkan sesuai OWASP | sel diawali `=`, `+`, `-`, `@`, TAB, CR, LF, `＝＋－＠` → diberi awalan aman (OWASP: tab di dalam field berkutip untuk Excel); data hanya yang boleh dilihat peminta; audit `export.csv` |
| C-CSV-2 | Impor terbatas | file > `CSV_MAX_BYTES`, baris > `CSV_MAX_ROWS`, header asing, BOM, kolom `created_by`/`id` → galat atau diabaikan; pesan peringatan email **seragam** (tak membedakan "tidak ada akun" vs "bukan anggota") |
| **KEY · API key** | | |
| C-KEY-1 | Rute berisiko tak bisa lewat key | key ke `/api/app/files/*`, ekspor, purge → 403 `tidak bisa diakses dengan API key`; tambah assertion di `tests/api-keys/scopes.test.ts` |
| C-KEY-2 | `ROLE_RANK` 4 role dan status pemilik | key milik PM punya `app:*`; pemilik `pending/suspended`/temp-ban aktif → 403; temp-ban kedaluwarsa dinilai dengan `isBanActive` |
| C-KEY-3 | Matriks IDOR berlaku untuk key | ulangi C-ACC-2 dengan `X-API-Key` → hasil sama |
| **RL · rate limit** | | |
| C-RL-1 | Limiter tulis per-user | user A melewati `PM_WRITE_LIMIT` → 429 `RATE_LIMITED` (format seragam); user B di IP yang sama tidak terdampak |
| C-RL-2 | Pemakaian normal tak kena 429 | 10 user satu IP, beban wajar 1 menit → 0 respons 429 |
| C-RL-3 | Semua endpoint list berpaginasi dan di-clamp | `limit=100000` → dipotong ke maksimum |
| **LOG/AUD/IMP** | | |
| C-LOG-1 | Tak ada PII/isi di log | spy `logger` sepanjang alur PM: tanpa email, HP, komentar, body; pemindaian statis `server/pm` |
| C-LOG-2 | `summary`/`meta` audit tanpa PII | aksi undangan: email dimasker (`bu***@kantor.id`) |
| C-LOG-3 | Setiap aksi §3.3 menulis audit; kamus lengkap | iterasi `AUDIT_ACTIONS`: tiap nilai punya `ACTION_META` dan `TARGET_LABELS`; tiap endpoint di §3.3 menghasilkan 1 baris |
| C-IMP-1 | Jejak impersonasi | sesi `impersonatedBy` → `Actor.impersonatedBy` terisi, tercatat di `meta`; hapus akun/ubah role/purge → 403 `IMPERSONATION_RESTRICTED` |
| **WEB · header dan maintenance** | | |
| C-WEB-1 | Header keamanan ada | respons halaman SSR dan API memuat CSP (atau Report-Only), `frame-ancestors`, `nosniff`, `Referrer-Policy`; tambah sebagai entri `SMOKE_CHECKS` |
| C-WEB-2 | Maintenance menutup baca data | non-allowed role meminta `*.data` saat maintenance → 503 (atau keputusan eksplisit menerima, Q8) |
| **PRV · privasi** | | |
| C-PRV-1 | Sapuan retensi menjalankan semua kebijakan §3.4 | data lewat umur → terhapus; satu baris `privacy.retention` berisi jumlah per tabel |
| C-PRV-2 | FK dan S3 sesuai R13 | hapus user → `created_by` jadi `NULL`, objek `avatars/` hilang, `login_log` hilang |
| C-PRV-3 | Halaman Kebijakan Privasi tersedia dari login | `GET /privacy` (nama rute **ASUMSI**) 200 dengan `meta()` |

Berkas test yang diusulkan (mirror `server/`, maks 400 baris per berkas): `tests/pm/access-matrix.test.ts`, `tests/pm/idor.test.ts`, `tests/pm/mass-assignment.test.ts`, `tests/pm/upload-security.test.ts`, `tests/api/auth-hardening.test.ts`, `tests/api/invitations.test.ts`, `tests/pm/rate-limit-write.test.ts`, `tests/pm/csv-safe.test.ts` (F5), `tests/pm/privacy-sweep.test.ts`, `tests/pm/logging-pii.test.ts`, `tests/audit-pm-coverage.test.ts`.

### 3.3 Aksi yang wajib masuk `audit()` dan entri `ACTION_META`

Aturan: (1) aksi yang menghapus permanen, mengekspor, atau mengubah akses memakai `await audit(...)` (aman, `audit()` tidak pernah melempar: `audit.ts:62-89`); aksi rutin boleh `void`. (2) Tulis audit **sebelum** penghapusan permanen. (3) Aktor sistem (sweeper) = `actor: null`. (4) Tambahkan nilai ke `AUDIT_ACTIONS` (`audit.ts:11`) **dan** `ACTION_META` (`audit-api.ts:87`) di commit yang sama; `C-LOG-3` menjaganya. Tambah ke `AuditTargetType` (`audit.ts:40`): `'invitation' | 'project' | 'task' | 'attachment' | 'comment' | 'recording' | 'export'`, dan ke `TARGET_LABELS` (`audit-api.ts:119`): semua tipe baru **plus** `post` dan `apikey` yang saat ini belum berlabel.

| Konstanta | String | Target | Kapan | Meta wajib | Label | Warna | Fase |
|---|---|---|---|---|---|---|---|
| `USER_APPROVE` | `user.approve` | user | Admin menyetujui `pending` | `{role}` | Setujui user | teal | P0 |
| `USER_REJECT` | `user.reject` | user | Admin menolak | `{reason}` | Tolak user | red | P0 |
| `USER_SELF_DELETE` | `user.self_delete` | user | User menghapus akunnya (hook `deleteUser`) | `{role}` | Hapus akun sendiri | red | P0 |
| `USER_ANONYMIZE` | `user.anonymize` | user | Pembersihan data pribadi setelah hapus akun (sistem) | `{tables}` | Anonimkan data | gray | P0 |
| `INVITATION_CREATE` | `invitation.create` | invitation | Admin membuat undangan | `{role, expiresAt}` (email dimasker) | Buat undangan | indigo | P0 |
| `INVITATION_REVOKE` | `invitation.revoke` | invitation | Admin mencabut | `{role}` | Cabut undangan | orange | P0 |
| `INVITATION_USE` | `invitation.use` | invitation | Login Google pertama memakai undangan (aktor = user baru) | `{role}` | Undangan dipakai | teal | P0 |
| `SETTINGS_TEAM_UPDATE` | `settings.team.update` | settings | Admin ubah Pengaturan tim (AI, lama simpan rekaman, cuti, pengingat) | `{before, after}` | Pengaturan tim | indigo | P0 |
| `PROJECT_DELETE` | `project.delete` | project | Proyek ke Sampah | `{tasks, events}` | Hapus proyek | orange | P0 |
| `PROJECT_RESTORE` | `project.restore` | project | Pulihkan proyek | `{tasks, events}` | Pulihkan proyek | teal | P0 |
| `PROJECT_PURGE` | `project.purge` | project | Hapus permanen (Admin) | `{tasks, events, files}` | Hapus permanen proyek | red | P0 |
| `PROJECT_MEMBER` | `project.member` | project | Tambah/keluarkan anggota atau ubah peran proyek | `{op, userId, from, to}` | Anggota proyek | blue | P0 |
| `PROJECT_ADMIN_OVERRIDE` | `project.admin_override` | project | Admin/super-admin mengubah proyek/tugas yang ia bukan anggotanya | `{action, targetType, targetId}` | Admin masuk proyek | grape | P0 |
| `TASK_PURGE` | `task.purge` | task | Hapus permanen tugas (Admin) | `{projectId}` | Hapus permanen tugas | red | P0 |
| `COMMENT_DELETE` | `comment.delete` | comment | Komentar dihapus oleh bukan penulisnya | `{taskId}` | Hapus komentar | orange | P0 |
| `ATTACHMENT_DELETE` | `attachment.delete` | attachment | Bukti dihapus (bukti dipakai untuk pemeriksaan) | `{taskId, byUploader}` | Hapus bukti | red | P0 |
| `TRASH_RETENTION` | `trash.retention` | project | Sapuan Sampah 30 hari (sistem) | `{projects, tasks, events}` | Sampah otomatis | gray | P0 |
| `PRIVACY_RETENTION` | `privacy.retention` | settings | Sapuan retensi harian (sistem) | `{deleted: {tabel: n}}` | Retensi privasi | gray | P0 |
| `EXPORT_CSV` | `export.csv` | export | Ekspor CSV | `{scope, rows}` | Ekspor CSV | indigo | F5 |
| `IMPORT_CSV` | `import.csv` | export | Impor CSV dikonfirmasi (Anggota boleh) | `{jobId, rowsOk, rowsError}` | Impor CSV | indigo | F5 |
| `RECORDING_CONSENT` | `recording.consent` | recording | Consent rekam dicatat | `{eventId, participants, method}` | Izin rekam | teal | F5 |
| `RECORDING_ACCESS` | `recording.access` | recording | Putar/unduh audio atau foto mentah | `{eventId, kind}` | Akses rekaman | yellow | F5 |
| `RECORDING_DELETE` | `recording.delete` | recording | Hapus manual rekaman | `{eventId, kind}` | Hapus rekaman | red | F5 |
| `RECORDING_RETENTION` | `recording.retention` | recording | Sapuan audio/foto mentah (sistem; dipakai C-REC-4) | `{deleted}` | Rekaman otomatis | gray | F5 |
| `AI_PROCESS` | `ai.process` | recording | Data dikirim ke penyedia AI | `{provider, feature, inputKind, bytes}` (tanpa isi) | Proses AI | grape | F5 |

Dipakai ulang tanpa perubahan konstanta tetapi meta harus lengkap: `user.role.set` (`{from,to}`; kini juga oleh Admin untuk Member↔PM), `user.ban`/`user.unban` (dipakai untuk **suspend**, sesuai `00-role-dan-area.md` §4; `{reason, expiresIn}`), `user.delete`, `user.impersonate`. Tidak masuk `audit_log` (cukup `project_activities`/`task_activities`): geser status, komentar baru, edit tugas, setujui/kembalikan, pulihkan tugas tunggal.

### 3.4 Kebijakan privasi data (sederhana)

Prinsip: kumpulkan seperlunya, tampilkan hanya ke yang perlu, hapus sesuai jadwal, dan jangan menyimpan rahasia di tempat yang tidak perlu. Retensi bawaan di bawah memakai pengaturan yang sudah ada (`settings-retention.ts`, 1–3650 hari, NULL = selamanya) dan disimpan sebagai konstanta bernama `PRIVACY_DEFAULTS`. **Tanda ◆ = usulan saya, bukan dari sumber; butuh keputusan user.**

| Data | Siapa melihat | Disimpan | Saat akun dihapus |
|---|---|---|---|
| Akun: email, nama, foto Google (`user`, `account`) | Pemilik; Admin; email terlihat sesama proyek (`07-tim.md`) | Selama akun aktif | Dihapus (sesi/akun cascade, `schema.auth.ts:42,53`) |
| Token OAuth Google (`account.access_token/refresh_token/id_token`) | Tidak ada (rahasia sistem) | Selama akun; scope hanya `openid email profile` (`google.mjs`) | Dihapus; jangan pernah di-log atau diekspor |
| Profil: HP, jabatan, divisi, ukuran teks | Pemilik; Admin; HP ◆ hanya pemilik + Admin | Selama akun aktif | Dihapus |
| Foto profil (S3 `avatars/`) | Publik berurl acak (sudah ada) | Selama akun aktif | Objek dihapus (`auth.ts:76`, `app-avatar.ts:67-70`) |
| `visit_log` (IP, UA, path, kota) | Super-admin | ◆ 90 hari | `user_id` jadi NULL |
| `login_log` (IP, UA) | Super-admin; pemilik (10 terakhir) | ◆ 180 hari | Dihapus (cascade) |
| `rate_limit_log`, `api_key_usage` | Super-admin | ◆ 30 hari, ◆ 90 hari | `user_id` NULL; pemakaian ikut kunci |
| `audit_log` (email aktor snapshot, IP, ringkasan) | Super-admin | ◆ 730 hari | Tetap sampai batas retensi (alasan keamanan); `actor_id` NULL. Anonimisasi email aktor: Q3 |
| Konten kerja: proyek, tugas, komentar, bukti (DB + S3) | Anggota proyek; Admin; PM sesuai matriks | Selama proyek ada; hapus → Sampah **30 hari** (final, `08-sampah.md` #2), lalu permanen | **Dipertahankan** atas nama "Mantan anggota" ◆ (R13) |
| Inbox / notifikasi | Pemilik | ◆ 90 hari setelah dibaca | Dihapus |
| Event dan notulensi teks | Peserta, Pembuat, Pengelola | Selama event ada; Sampah 30 hari | Dipertahankan, aktor "Mantan anggota" |
| Audio/foto mentah rapat (F5) | Notulis, Pembuat, Pengelola proyek (`workflow.md:650`) | **30 hari setelah notulensi dikonfirmasi**; opsi "Hapus segera"; maks 45 hari bila tak dikonfirmasi (ASUMSI A-12, `workflow.md:651`); `raw_audio_retention_days` bawaan 30 (`09-pengaturan.md:60`) | Dihapus segera |
| Transkrip / hasil OCR (F5) | Peserta internal, PM/Lead (`workflow.md:650`) | Mengikuti event (◆); "ikut retensi workspace" belum didefinisikan sumber | Dipertahankan, aktor "Mantan anggota" |
| Catatan consent rekaman (F5) | Admin, Pengelola | ◆ selama event ada + 1 tahun (bukti persetujuan) | Dipertahankan |
| Cuti: tanggal/status; **catatan** (bisa memuat info kesehatan) (F5) | Status: sesuai `09-pengaturan.md` #11; catatan: hanya pemohon dan penyetuju | Tanggal selama akun; catatan ◆ 90 hari setelah cuti berakhir | Dihapus |
| Data yang dikirim ke penyedia AI (F5) | Penyedia dengan zero-retention + no-training + DPA (D3) | Tidak disimpan penyedia; isi tidak di-log, hanya metadata di audit | n/a |
| Berkas ekspor CSV (F5) | Peminta | Tidak disimpan di server (stream langsung) | n/a |

Catatan privasi lain: (a) foto Google dimuat browser dari server Google, jadi Google melihat IP pemirsa; pertimbangkan menyalin ke `avatars/` saat login pertama (opsional). (b) Ukuran teks dan preferensi bukan data sensitif. (c) Suara, transkrip, dan foto rapat adalah data pribadi; desain analisis mensyaratkan review legal (UU PDP No. 27/2022, DPIA) sebelum rilis fitur AI (`DECISIONS.md` D3). Ini bukan nasihat hukum.

> **Draf teks "Kebijakan Privasi" (bahasa polos, perlu review legal):** *Yang kami simpan:* nama, email, dan foto dari akun Google Anda; data kerja yang Anda tulis (proyek, tugas, komentar, lampiran); catatan kapan dan dari mana Anda masuk. *Siapa yang bisa melihat:* anggota proyek yang sama, dan Admin tim Anda. Nomor HP hanya terlihat oleh Anda dan Admin. *Berapa lama:* hal yang Anda hapus disimpan di Sampah selama 30 hari lalu hilang selamanya. Rekaman rapat (bila fitur dinyalakan Admin) dihapus 30 hari setelah catatan rapat dikonfirmasi. Catatan masuk dan aktivitas teknis disimpan sementara sesuai pengaturan Admin. *Rekaman rapat:* hanya direkam bila semua peserta sudah diberi tahu dan setuju. *Hak Anda:* minta Admin menghapus akun Anda. Data pribadi Anda dihapus; pekerjaan yang sudah Anda tulis tetap ada atas nama "Mantan anggota" agar riwayat proyek tidak rusak.

### 3.5 Usulan test keamanan konkret (payload kunci)

Selain butir di §3.2, empat paket payload harus ada sebagai fixture bersama (`tests/pm/_payloads.ts`, tandai `// test-only`):

| Paket | Isi | Ekspektasi |
|---|---|---|
| IDOR | Dua proyek A (user U1 Pengelola) dan B (user U2); pemanggil U3 Member non-anggota; PM P1 non-Pengelola; Admin; Pemantau V | Setiap metode (GET/POST/PATCH/DELETE) × resource (proyek, tugas, komentar, bukti, event, catatan) × aktor → tabel status yang sama persis dengan hasil `can()`; semua penolakan "tak terlihat" = 404 |
| Unggah | PNG valid; JPEG valid; PDF valid; SVG berisi `<script>`; HTML; `a.png` ber-isi SVG; GIF polyglot dengan akhiran HTML; `a.pdf.html`; zip; file 0 byte; nama `../../etc/passwd`, `x\r\nSet-Cookie:a=b`, 300 karakter | Hanya 3 yang valid lolos; sisanya 415/400/413; key objek tidak pernah memuat nama asli |
| Teks/URL | `<img src=x onerror=alert(1)>`, `"><script>`, `javascript:alert(1)`, `data:text/html,…`, `//evil.test`, 10.000 karakter, null byte `\u0000`, emoji/RTL override | Dirender sebagai teks; URL berbahaya 422; panjang berlebih 422; null byte 422 |
| CSV (F5) | `=HYPERLINK("http://evil.test","x")`, `+1+1`, `-2+3`, `@SUM(1)`, `\t=1`, `\r=1`, `＝1`, `-5 hari`, sel berkutip berisi koma dan newline | Semua sel yang diawali karakter pemicu dinetralkan; sel biasa tidak berubah; CSV tetap dapat di-parse kembali |

Catatan teknis: test yang butuh Google asli (C-AUTH-5, C-AUTH-8) memakai stub `getUserInfo` pada provider uji, bukan jaringan; bila tidak memungkinkan, jaga sebagai test konfigurasi (`auth.options`) + QA manual satu kali (ASUMSI). Smoke (`scripts/smoke-server.checks.ts`) menambah: sign-up email → ditolak, header keamanan ada, `/api/auth/admin/ban-user` → ditolak.

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Satu endpoint PM lolos tanpa pintu akses | Sedang | Tinggi (kebocoran lintas proyek) | `loadProjectAccess` wajib + test kontrak pemindai rute + matriks IDOR (C-ACC-1..3) di CI |
| CSP merusak Mantine/hidrasi SSR | Tinggi | Sedang (halaman putih) | Mulai `Report-Only`, perketat setelah laporan bersih; nonce lewat `entry.server.tsx` (ASUMSI perlu uji) |
| Memblokir endpoint admin Better Auth memutus fitur tak terlihat | Rendah | Sedang | Grep klien: hanya impersonate/stop dipakai; test C-AUTH-3 + smoke; rollback satu daftar |
| Kebijakan "hapus akun, konten tetap" bertentangan dengan kewajiban hukum/permintaan hapus | Sedang | Tinggi | Review legal sebelum rilis; opsi bawaan = anonimisasi; konten dapat dihapus Admin per permintaan |
| Rate limit per-user menghambat awam/lansia (klik berulang, polling) | Sedang | Sedang | Batas longgar, tombol `loading` mencegah dobel klik, pesan 429 Indonesia yang actionable, log episode untuk menyetel angka |
| Unggah besar menghabiskan memori (body 128 MB bawaan Bun) | Sedang | Sedang–Tinggi | `maxRequestBodySize` eksplisit + cek `Content-Length` + `PM_UPLOAD_LIMIT` |
| Batas domain menolak user sah (konsultan pakai Gmail) | Sedang | Sedang | Keputusan user (Q1); jalur undangan sebagai pengecualian ber-audit |
| Penyedia AI menyimpan/melatih dari data rapat (F5) | Sedang | Tinggi | DPA zero-retention/no-training (D3), `ai_enabled` bawaan mati (R14), tanpa log isi, tanpa tool-call |
| `audit()` best-effort kehilangan entri penting | Rendah | Sedang | `await` + audit sebelum hapus permanen; kegagalan sudah `logger.warn`; alarm pada lonjakan warn (ASUMSI) |
| Konfigurasi salah menyalakan email-password di produksi | Rendah | Tinggi | `enabled: !isProd` + smoke check (R2) |

## 5. Estimasi usaha

Satuan hari-orang pekerja AI; reviewer manusia dihitung terpisah. Sebagian besar bergabung dengan pekerjaan modul lain (akun, proyek, tugas, file); angka di sini hanya porsi keamanan/privasi.

| Paket | Isi | Ukuran | AI (hari) | Reviewer (hari) |
|---|---|---|---|---|
| A. Fondasi P0 | R2, R3, R4, R5, header dasar, `maxRequestBodySize`, `ROLE_RANK`, smoke check | M | 4–6 | 0.5–1 |
| B. Pintu akses | R1: `access.ts`, `can()`, test kontrak, matriks IDOR | M | 4–6 | 1 |
| C. Undangan dan siklus akun | R9, status akun, audit terkait | M | 3–5 | 0.5–1 |
| D. File/bukti | R7, rute unduh, uji unggah | M | 3–4 | 0.5 |
| E. Rate limit dan audit | R6, R10, daftar §3.3 (P0), `ACTION_META`, test cakupan | S–M | 3–4 | 0.5 |
| F. Privasi | R12, R13, sapuan retensi, halaman kebijakan, `redact` | M | 3–5 | 0.5–1 |
| G. Fase 5 | CSV aman, consent rekaman, kontrol AI, retensi rekaman | M–L | 5–8 | 1 |
| **Total** | | | **±25–38** (MVP tanpa G: **±20–30**) | **±4.5–6** |

## 6. Pertanyaan terbuka untuk user

1. **Batas domain email** (`00-role-dan-area.md` §8 #2): hanya domain organisasi (Workspace, pakai `hd`), atau Gmail juga? Rekomendasi: isi `hd`/allowlist hanya jika semua anggota memakai Workspace; tamu lewat undangan.
2. **Nasib konten saat akun dihapus**: dipertahankan atas nama "Mantan anggota" (rekomendasi) atau ikut dihapus? Perlu review legal.
3. **Angka retensi log** (◆ visit 90, login 180, rate-limit 30, API 90, audit 730 hari) dan apakah email aktor di audit dianonimkan setelah akun dihapus?
4. **Fitur AI/rekaman bawaan mati** sampai Admin menyalakan (usulan R14) padahal `09-pengaturan.md:60` menulis bawaan hidup?
5. **Siapa boleh melihat nomor HP dan email** (`07-tim.md` pertanyaan 2 belum dijawab)? Rekomendasi: email sesama proyek, HP hanya pemilik + Admin.
6. **Format unggahan MVP**: gambar + PDF saja (rekomendasi), docx/xlsx menyusul? Batas ukuran (`ATTACHMENT_MAX_BYTES`) dan jumlah lampiran per tugas?
7. **Impersonasi**: aksi sensitif diblokir saat menyamar (rekomendasi), atau penuh seperti sekarang?
8. **Maintenance**: apakah pembacaan data halaman (`.data`) boleh tetap terbuka saat maintenance (F14)?
9. Siapa yang melakukan review legal UU PDP/DPA penyedia AI, dan kapan (syarat rilis fitur AI)?

## 7. Sumber

**Kode (working tree, dibaca):** `server/auth.ts`, `server/guard.ts`, `server/permissions.ts`, `server/roles.ts`, `server/audit.ts`, `server/ban.ts`, `server/rate-limit.ts`, `server/logger.ts`, `server/env.ts`, `server/settings.ts`, `server/settings-maintenance.ts`, `server/settings-retention.ts`, `server/prod.ts`, `server/api-error.ts`, `server/api/{index,app,app-avatar,storage-files,admin,posts,me,sessions}.ts`, `server/api-keys/{scopes,plugin}.ts`, `server/middleware/{rate-limiter,client-ip,maintenance}.ts`, `server/demo/restrict.ts`, `server/db/{schema.auth,schema.app,schema.logs}.ts`, `app/lib/audit-api.ts`, `app/entry.server.tsx`, `app/root.tsx`, `app/routes/login.tsx`, `app/components/users/useUserActions.tsx`, `app/components/AppFrame.tsx`, `tests/api/app.test.ts`, `tests/guard.test.ts`, `tests/auth-flow.test.ts`, `CLAUDE.md` (upload, API, audit, test).
**Pustaka terpasang (versi dari `node_modules`):** `better-auth` 1.7.3: `plugins/admin/routes.mjs`, `oauth2/link-account.mjs`; `@better-auth/core`: `social-providers/google.mjs`, `types/init-options.d.mts`; `bun-types/serve.d.ts:762`.
**Desain:** `tahapan-proyek/03-desain/erd/{user-profile,project,task,gabungan}.md`; `diskusi/{00,01,05,07,08,09}-*.md`; `tahapan-proyek/02-analisis/hasil-orchestrasi/{analysis/A1,A3,A4,orchestration/DECISIONS.md (D3),deliverables/workflow.md (baris 584-651)}`.
**Eksternal (diakses 15 Oktober 2026):** OWASP, "CSV Injection" (https://owasp.org/www-community/attacks/CSV_Injection): karakter pemicu `= + - @ TAB CR LF` dan varian lebar penuh; mitigasi Excel = awalan TAB di dalam field berkutip; tidak ada strategi universal. Google, "OpenID Connect" (https://developers.google.com/identity/openid-connect/openid-connect): `sub` sebagai pengenal unik, jangan `email`; domain `email` tidak dapat dipakai mengenali pengguna Workspace, pakai `hd`; `email_verified`.
