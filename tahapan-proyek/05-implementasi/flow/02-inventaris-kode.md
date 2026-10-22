> **Dokumen turunan** (dibangkitkan agen pembaca, 16 Okt 2026). Inventaris perilaku di kode. Dibangun pada commit `caa78f7` (sebelum gelombang G14); status butir yang berubah sejak itu diperbarui di `04-pencocokan.md` terhadap commit `69277e9`.
> Jangan disunting tangan; bila kode, keputusan, atau wireframe berubah, bangkitkan ulang (lihat `README.md` folder ini). Dokumen ini dikecualikan dari batas ukuran berkas karena berupa data turunan.

# Inventaris Alur dan Perilaku Sistem (dari kode)

Sumber: `/tmp/sp-coord` (cabang `feature/project-management`, HEAD `caa78f7`, setelah S0 dan `contract-v1`). Hanya membaca. Jalur berkas relatif ke repo. Kode menang atas komentar; selisih dicatat di bagian 13.

Penanda: `[DIBANGUN]` kode berjalan; `[STUB]` kerangka kosong; `[BEKU-KEBIJAKAN]` fungsi murni ada, belum dipakai layar/API; `[DIMATIKAN]` ada tetapi saklar mati.

**Gambaran jujur:** menu produk (Proyek, Tugas, Anggota, Pengaturan proyek) masih KERANGKA KOSONG. Yang benar-benar berjalan: login Google, persetujuan akun, undangan, peran, ban, impersonasi, profil/keamanan, kunci API, konsol `/dashboard` dan `/dev`. Seluruh aturan proyek/tugas/pemeriksaan ada sebagai fungsi murni yang baru dipakai tes dan satu fungsi kapabilitas (`appCaps`).

---
## 1. Rute halaman (RT)

Alih bila tidak boleh (`server/guard.ts:18-69`): belum login -> `/login` (atau `/login?notice=session` bila cookie sesi ada tetapi sesi mati); akun tertahan pending/rejected -> `/waiting`; banned -> `/banned`; peran salah -> `homeFor(peran)` (member/PM -> `/app`, admin -> `/dashboard`, super-admin -> `/dev`; `server/permissions.ts:55`).

| ID | Path | Area | Guard | Status | Catatan |
|---|---|---|---|---|---|
| RT-01 | `/` | publik | tanpa | DIBANGUN | `app/routes/home.tsx:47`. Halaman landing templat (teks "fullstack template"). Tombol menuju `homeFor(peran)` atau `/login`. Memanggil `resolveUserRole` (bisa menulis peran ke DB, lihat AUTO-03). |
| RT-02 | `/login` | publik | tanpa (tidak mengalihkan yang sudah login) | DIBANGUN | `app/routes/login.tsx:14`. Prod: hanya Google. Form email hanya non-prod DAN `emailAuthEnabled` di DB (`app/lib/login-mode.ts:12`). |
| RT-03 | `/go` | publik (transit) | `redirectToHome` | DIBANGUN | `app/routes/go.tsx:9`, `server/guard.ts:140`. Tidak render; memutuskan tujuan akhir (bagian 10). |
| RT-04 | `/banned` | khusus akun diblokir | baca sesi sendiri (anti-loop) | DIBANGUN | `app/routes/banned.tsx:25`. Tanpa sesi -> `/login`; ban habis & pending/rejected -> `/waiting`; ban habis & approved -> `/go`. Tampil alasan, "permanen" atau tanggal berakhir, tombol Keluar (konfirmasi), tautan dukungan bila `supportUrl`. |
| RT-05 | `/waiting` | akun pending/rejected | baca sesi sendiri | DIBANGUN | `app/routes/waiting.tsx:27`. banned -> `/banned`; approved -> `/go`. Tombol "Cek lagi" (revalidate), Keluar. Rejected menampilkan `approvalReason`. |
| RT-06 | `/app` | /app | `requireUser` | DIBANGUN (placeholder) | `app/routes/app/home.tsx:15`. Hanya "Beranda Anda masih kosong" + tautan ke Proyek/Tugas. |
| RT-07 | `/app/projects` | /app | `requireUser` | STUB(S1) | `app/routes/app/projects.tsx:8`. "Fitur ini sedang disiapkan". |
| RT-08 | `/app/projects/new` | /app | `requireUser` | STUB(S1) | `project-new.tsx:8` |
| RT-09 | `/app/projects/:projectId` (layout) | /app | `requireUser` | STUB(S1) | `project/layout.tsx:5`, hanya `<Outlet/>` tanpa judul/tab |
| RT-10 | `.../:projectId` (indeks ringkasan) | /app | `requireUser` | STUB(S1) | `project/summary.tsx:8` |
| RT-11 | `.../:projectId/tasks` | /app | `requireUser` | STUB(S2) | `project/tasks.tsx:8` |
| RT-12 | `.../:projectId/members` | /app | `requireUser` | STUB(S1) | `project/members.tsx:8` |
| RT-13 | `.../:projectId/settings` | /app | `requireUser` | STUB(S1) | `project/settings.tsx:8` |
| RT-14 | `/app/tasks` | /app | `requireUser` | STUB(S2) | `tasks.tsx:8` |
| RT-15 | `/app/tasks/new` | /app | `requireUser` | STUB(S2) | `task-new.tsx:8` |
| RT-16 | `/app/tasks/:number` | /app | `requireUser` | STUB(S2) | `task-detail.tsx:8` |
| RT-17 | `/app/settings` | /app | `requireUser` | STUB(S1) | `settings.tsx:5`: langsung `redirect('/profile')` (tanpa halaman). |
| RT-18 | `/profile` | /app (di layout app) | `requireUser` | DIBANGUN | `app/routes/app/profile.tsx:29`. Kartu: profil (nama/foto), kata sandi, akun tertaut, sesi/perangkat, kunci API pribadi, riwayat login (8 terakhir), zona bahaya (hapus akun sendiri). Banyak aksi memanggil Better Auth langsung dari browser. |
| RT-19 | `/dashboard` | /dashboard | `requireAnyRole([admin, super-admin])` (layout + halaman) | DIBANGUN | `routes/admin/dashboard.tsx:17`. Satu kartu: jumlah menunggu persetujuan + tombol ke `/dashboard/users?tab=pending`. |
| RT-20 | `/dashboard/users` | /dashboard | idem | DIBANGUN | `routes/admin/users.tsx:34`. Tab: Persetujuan, Semua, Undangan. |
| RT-21..35 | `/dev` + `/dev/{users,sessions,posts,api-keys,db-schema,visits,login-logs,rate-limit-logs,settings,tools,file-health,server-logs,audit,changelog}` | /dev | `requireRole(super-admin)` di layout `super/layout.tsx:163` dan tiap halaman | DIBANGUN | Lihat bagian 9 |


Rute di luar React Router yang dilayani server: `/README.md`, `/llms.txt`, `/llms-full.txt` (publik, isi README; `server/readme.ts`), `/robots.txt`, `/sitemap.xml` (`server/seo.ts`), `/favicon.ico`, `/.well-known/*`, `/apple-touch-icon*` (`server/http-probes.ts`), aset statis `/assets/*`.


---
## 2. Endpoint API (API)

Urutan pemrosesan global (`server/api/index.ts:53-111`): galat seragam -> pembatas laju per IP -> mode pemeliharaan -> plugin kunci API -> mount Better Auth (digerbang) -> router. "Scope" = `requiredScope` di `server/api-keys/scopes.ts:156`; `null` = kunci API DITOLAK 403 "Endpoint ini tidak bisa diakses dengan API key" (`api-keys/plugin.ts:57`). Guard `requireRole` di rute API melempar PENGALIHAN 302 ke `/login` atau home (bukan 401/403), lihat AUTO-30.

### 2a. Auth (Better Auth) `/api/auth/*`
| ID | Rute | Siapa | Kunci API | Catatan |
|---|---|---|---|---|
| API-01 | `/api/auth/*` (Google, session, sign-out, update-user, change-password, sesi, tautan akun, multi-session, delete-user, plugin api-key) | sesuai Better Auth | ditolak (`scopes.ts:161`) | `auth-gate.ts:45-60`: `/admin/*` BA 404 kecuali `impersonate-user` dan `stop-impersonating`; prod: `sign-in/email`, `sign-up/email` 404; `delete-user` 403 `IMPERSONATING` saat menyamar; path dinormalisasi, `%` ganda dan `..` -> 404. |
| API-02 | `GET /api/settings/`, `GET /api/settings` | publik | scope `settings:read` bila pakai kunci | `api/settings.ts:22`; isi: emailAuthEnabled, signupEnabled, peta flag fitur, branding. |

### 2b. Produk `/api/app/*` (gerbang `api/app-context.ts:50`: 401 untuk tamu, 403 `ACCOUNT_PENDING`/`ACCOUNT_REJECTED` untuk tertahan, 429 `RATE_LIMITED` untuk tulis > 60 per 60 dtk per pengguna)
| ID | Metode path | Siapa | Kunci API | Status |
|---|---|---|---|---|
| API-10 | `GET /api/app/whoami` | pengguna masuk apa pun | `app:read` | DIBANGUN (contoh) `app.ts:28` |
| API-11 | `POST /api/app/avatar` (multipart `file`, PNG/JPEG/WEBP/GIF <= 2 MB) | pengguna masuk | DITOLAK (`scopes.pm.ts:10`) | DIBANGUN `app.ts:34`, `app-avatar.ts`. Galat: 400/413/415, 503 `STORAGE_DISABLED`. Tipe dari magic bytes, SVG ditolak. |
| API-12 | `DELETE /api/app/avatar` | pengguna masuk | DITOLAK | DIBANGUN `app.ts:43` |
| API-13 | `/api/app/profile*` (PATCH profil) | - | DITOLAK utk PATCH | STUB(S1) `app-profile.ts:5` (belum ada rute) |
| API-14 | `/api/app/projects*` | - | DELETE ditolak | STUB(S1) `app-projects.ts:5` |
| API-15 | `/api/app/projects/:id/members*` | - | semua metode ditolak | STUB(S1) `app-projects.members.ts:5` |
| API-16 | `/api/app/tasks*` | - | - | STUB(S2) `app-tasks.ts:5` |
| API-17 | `/api/app/tasks/.../(alur kerja)` | - | - | STUB(S2) `app-tasks.workflow.ts:5` |
| API-18 | `/api/app/tasks/.../(detail)` | - | - | STUB(S2) `app-tasks.detail.ts:5` |

Aturan kunci API untuk `/api/app`: GET/HEAD -> `app:read`, selain itu `app:write` (`scopes.ts:185`), kecuali daftar tolak PM (`scopes.pm.ts:6`): `DELETE /api/app/projects/*`, semua metode `/api/app/projects/*/members*`, `PATCH /api/app/profile`, semua `/api/app/avatar`.

### 2c. Pengguna sendiri
| ID | Metode path | Siapa | Kunci | Catatan |
|---|---|---|---|---|
| API-20 | `GET /api/me/logins?limit` | masuk | `me:read` | `me.ts:11` maks 50 |
| API-21 | `GET /api/me` (di `index.ts:109`) | publik (null bila tamu) | scope tidak dipetakan -> kunci ditolak | mengembalikan `{user}` |
| API-22 | `GET/POST /api/me/api-keys`, `GET /:id/usage`, `PUT /:id`, `POST /:id/rotate`, `POST /:id/revoke`, `DELETE /:id` | masuk, BUKAN lewat kunci API (403 "Kunci API tidak bisa mengelola kunci") | DITOLAK | `me-api-keys.ts:52`. Maks 10 kunci aktif (`MAX_PERSONAL_KEYS`), cakupan dibatasi peran pemilik, kedaluwarsa wajib 1-365 hari (tanpa kedaluwarsa hanya pemilik super-admin). Diaudit. |

### 2d. Admin `/api/admin/*` (gerbang `admin-context.ts:37`: 401; 403 `ACCOUNT_*`; 403 `NOT_ADMIN` bila bukan admin/super-admin)
| ID | Metode path | Siapa / aturan | Kunci | Kode galat |
|---|---|---|---|---|
| API-30 | `GET /api/admin/users` | admin+; saring role, status, approval, hari, urut; akun anonim lama disembunyikan (`realUser`) | `users:read` | - |
| API-31 | `GET /api/admin/users/stats` | admin+ | `users:read` | - |
| API-32 | `POST /api/admin/users/:id/role` `{role}` | `canSetUserRole`: admin hanya Member<->PM; `admin` hanya super-admin; super-admin tak bisa diberikan | DITOLAK `null` (`scopes.ts:146`) | VALIDATION, NOT_FOUND, IMPERSONATING, NOT_ADMIN, SELF_TARGET, TARGET_PROTECTED |
| API-33 | `DELETE /api/admin/users/:id` | `canActOnUser` lalu WAJIB super-admin; lewat `auth.api.removeUser` | `users:write` | NOT_FOUND, IMPERSONATING, SELF_TARGET, TARGET_PROTECTED, NOT_APP_ROLE ("Hanya super-admin yang bisa menghapus pengguna.") |
| API-34 | `POST /api/admin/users/:id/ban` `{reason?, expiresIn?}` | `canActOnUser`; ban + cabut semua sesi | `users:write` | idem + 422 validasi |
| API-35 | `POST /api/admin/users/:id/unban` | `canActOnUser` | `users:write` | idem |
| API-36 | `POST /api/admin/users/:id/approve` `{role?}` | `canTransitionAccount` + (bila role diberikan) `canSetUserRole`; atomik | DITOLAK | NOT_FOUND, WRONG_STATE, + kode user.policy |
| API-37 | `POST /api/admin/users/:id/reject` `{reason}` | alasan 3-200 karakter | DITOLAK | REASON_REQUIRED (422), WRONG_STATE, dll |
| API-38 | `GET /api/admin/invitations?status&limit&offset` | admin+ | DITOLAK | VALIDATION |
| API-39 | `POST /api/admin/invitations` `{email, role?}` -> 201 | `canInviteWithRole`; blok bila menyamar | DITOLAK | IMPERSONATING, INVALID_EMAIL (422), DOMAIN_NOT_ALLOWED (422), INVITATION_EXISTS (409), INVITATION_LIMIT (409), TARGET_PROTECTED |
| API-40 | `DELETE /api/admin/invitations/:id` | plafon peran sama dengan membuat | DITOLAK | NOT_FOUND, IMPERSONATING, TARGET_PROTECTED, WRONG_STATE |

### 2e. Super-admin saja (`requireRole(super-admin)`; sesi cookie; scope kunci bila ada)
| ID | Rute | Kunci |
|---|---|---|
| API-50 | `GET /api/analytics/visits`, `/visits/export` (CSV maks 10.000 baris), `/visits/stats`; `DELETE /api/analytics/visits` (massal maks 100), `DELETE /visits/:id` | `analytics:read` / `analytics:write` |
| API-51 | idem untuk `/api/analytics/login-logs*` | idem |
| API-52 | idem untuk `/api/analytics/rate-limit-logs*` | idem |
| API-53 | `DELETE /api/analytics/purge?days=N` (0 = hapus SEMUA, maks 365; tiga tabel log) | `analytics:write` |
| API-54 | `GET /api/audit`, `/stats`, (export) ; baca-saja | `audit:read` (tulis ditolak) |
| API-55 | `GET /api/sessions`, `/stats`; `DELETE /api/sessions/:id`; `DELETE /api/sessions/user/:userId?keep=` | `sessions:read/write` |
| API-56 | `GET /api/logs`, `/stats`, (rincian) | `logs:read` |
| API-57 | `GET /api/file-health`, detail berkas | `file-health:read` |
| API-58 | `GET /api/ops/status`, `/mcp`, `/reset-targets` | `ops:read` |
| API-59 | `POST /api/ops/reset/:target` (limiter, file-health, settings, logs) | DITOLAK (`scopes.ts:181`) |
| API-60 | `GET /api/settings/all`; `PUT /api/settings/` (login email, pendaftaran); `PUT /rate-limit`; `DELETE /rate-limit`; `PUT /retention`; `POST /retention/run`; `PUT /features`; `PUT /branding`; `PUT /maintenance` | `settings:read/write` |
| API-61 | `GET/POST /api/api-keys`, `/stats`, `/scopes`, `/:id`, `/:id/usage`, `PUT /:id`, `POST /:id/rotate`, `/:id/revoke`, `DELETE /:id`; `GET /api/api-keys/usage*` | DITOLAK (`/api/api-keys` null) |
| API-62 | `/api/mcp` (JSON-RPC, 8 alat baca) | scope `mcp`, atau token lama `MCP_ADMIN_TOKEN` (bearer atau `?mcpAdminToken=`) |

### 2f. Lain
| ID | Rute | Siapa | Kunci | Catatan |
|---|---|---|---|---|
| API-70 | `GET /api/posts`, `GET /api/posts/:id` (publik tanpa login); `POST` (masuk, `posts:write`, tak diaudit); `PUT/DELETE /:id` (pemilik atau admin+, 403 selain itu; audit hanya bila bukan pemilik); `GET /stats` (super-admin) | lihat kolom | kunci: baca publik, tulis `posts:write` | konten contoh templat |
| API-75 | `GET /api/openapi.json` | butuh kunci API apa pun (401 `API_KEY_REQUIRED`) | publik-baca lalu ditolak bila tanpa kunci | isi hanya rute yang boleh untuk kunci tsb |

Kode galat kunci API (`api-keys/plugin.ts:51-133`): 401 `INVALID_API_KEY`/`KEY_EXPIRED`/`KEY_DISABLED`/`KEY_REVOKED`/`OWNER_MISSING`; 403 `MISSING_SCOPE`, `IP_NOT_ALLOWED`, `OWNER_BANNED`, `ACCOUNT_PENDING`, `ACCOUNT_REJECTED`, `ROLE_TOO_LOW`; 429 `RATE_LIMITED` (batas kunci: 600/menit bawaan BA).


---
## 3. Mesin status (ST)

Pembacaan kode: HANYA status akun dan undangan yang dijalankan sistem. Status proyek dan tugas ada sebagai tabel/fungsi murni tanpa layar atau API pemakainya `[BEKU-KEBIJAKAN]` (baru dipakai tes dan seed).

### ST-01 Status akun `[DIBANGUN]` (`server/access/account-status.rules.ts:22`, `server/account/approval.service.ts`, `server/account/status.ts:16`)
Nilai tersimpan di tabel `user` (`approval_status`, CHECK pending/approved/rejected; migrasi `0014_account_lifecycle`, akun lama otomatis `approved`). Ban terpisah (`banned`, `banExpires`, `banReason`) dan MENANG atas status persetujuan.

| Dari | Ke | Aksi / pemicu | Siapa | Syarat / penolakan |
|---|---|---|---|---|
| (baru) | pending | sign-up tanpa undangan, atau email belum terverifikasi | otomatis (`decideNewUser`) | - |
| (baru) | approved | email = `SUPER_ADMIN_EMAILS` dan terverifikasi; ATAU ada undangan aktif untuk email itu dan terverifikasi | otomatis | domain harus lolos `ALLOWED_EMAIL_DOMAINS` |
| (baru) | DITOLAK akun tidak dibuat | domain tak diizinkan; atau email+sandi di produksi | otomatis | `signup-gate.ts:94-99` (log "sign-up refused") |
| pending | approved | Setujui (opsional pilih peran Member/PM; admin juga hanya bila super-admin) | admin, super-admin | `canActOnUser` lulus (bukan diri sendiri, bukan super-admin, admin hanya oleh super-admin), tidak menyamar; ditolak `WRONG_STATE` bila status sudah berubah (UPDATE atomik berjaga `approval_status` dan peran lama) |
| pending | rejected | Tolak | idem | alasan 3-200 karakter (setelah trim, hitung karakter Unicode) else `REASON_REQUIRED` |
| rejected | approved | Setujui ulang | idem | idem |
| approved | rejected | TIDAK ADA (sengaja) | - | `WRONG_STATE`; akun disetujui dicabut aksesnya lewat blokir (ban), bukan tolak |
| rejected | pending, approved | pending | tidak ada transisi | `WRONG_STATE` |
| approved | banned | Blokir (alasan opsional; durasi Permanen/1/7/30 hari di UI; API menerima `expiresIn` detik) | idem (`canActOnUser`) | efek: SEMUA sesi dicabut (AUTO-12) |
| banned | (sebelumnya) | Buka blokir, atau masa ban habis sendiri (`isBanActive` membandingkan `banExpires` dengan jam server, tanpa pekerjaan terjadwal) | admin / waktu | - |

Urutan pengecekan (`canTransitionAccount`): izin bertindak -> transisi legal -> alasan. Efek samping approve/reject: ditulis `approval_decided_by/at/reason`, entri audit `user.approve`/`user.reject`. TIDAK ada email/notifikasi: pengguna harus menekan "Cek lagi" (copy `DENY_UI`/gate bicara "kami akan memberi kabar lewat email" tetapi tidak ada kode pengirim email; lihat 13).

### ST-02 Undangan `[DIBANGUN]` (`server/account/invitation.query.ts`, `invitation.admin.query.ts:14`)
Status diturunkan dari kolom waktu, urutan prioritas: `used` (acceptedAt) > `revoked` > `expired` (expiresAt <= now() Postgres) > `active`.

| Dari | Ke | Pemicu | Siapa | Syarat |
|---|---|---|---|---|
| - | active | Buat undangan (email, peran) | admin+ (bukan saat menyamar) | peran tidak melampaui plafon (admin: member/PM; hanya super-admin: admin); email ASCII valid (maks 254); domain lolos allowlist; < 100 undangan aktif (kunci advisory transaksi); belum ada undangan aktif untuk email itu (indeks unik parsial). Berlaku 14 hari. Sebelum menyisip: undangan kedaluwarsa-belum-dicabut utk email sama otomatis dicabut |
| active | used | akun BARU pertama kali dibuat dengan email itu | otomatis (hook `create.before`) | email terverifikasi; atomik (satu UPDATE...RETURNING) |
| active | revoked | Cabut | admin+ (plafon peran sama) | `WRONG_STATE` bila sudah dipakai/dicabut |
| active | expired | lewat 14 hari | waktu | tanpa penjadwal; hanya dihitung saat dibaca |

Catatan: undangan hanya berlaku untuk akun yang BELUM ada. Orang yang sudah mendaftar (pending) lalu diundang TIDAK otomatis disetujui; admin harus menyetujui manual (klaim hanya di `decideNewUser`, `signup-hooks.ts:60`).

### ST-03 Proyek `[BEKU-KEBIJAKAN]`
Enum `draft|active|on_hold|completed|canceled` (`pm/enums.ts:7`, CHECK migrasi 0015). TIDAK ADA tabel transisi, fungsi izin ganti status, API, atau layar untuk mengganti status proyek. Ada hanya `canManageProject`, `canTrashProject`, `canCreateTask` (proyek ditutup tetap boleh dikerjakan, Q12). Sampah = kolom `deleted_at/deleted_by`; tak ada fungsi pulihkan, tak ada layar Sampah, tak ada penghapus otomatis (`TRASH_RETENTION_DAYS=30` tanpa pembaca); `PROJECT_DELETE_UI_ENABLED=true` tidak dibaca siapa pun.

### ST-04 Tugas `[BEKU-KEBIJAKAN]` (`server/access/task-flow.policy.ts:46`, `review.policy.ts`)
Status: `todo`, `in_progress`, `in_review`, `done`, `canceled`. Dua belas transisi (tabel `TASK_TRANSITIONS`); pasangan lain = `WRONG_STATE` (409). Urutan jawaban penolakan: peran (404 jika bukan anggota) -> Sampah -> status -> input.

Aktor: "Admin/Pengelola" = admin, super-admin, atau Pengelola proyek (lolos semua aktor). "Anggota" = hanya bila memenuhi kolom Siapa. Pemantau/PM-bukan-anggota selalu `NOT_MEMBER`.

| # | Dari -> Ke | Aksi | Siapa (selain Admin/Pengelola) | Syarat / penolakan |
|---|---|---|---|---|
| 1 | todo -> in_progress | `start` | Anggota yang jadi pengerja ATAU tugas belum ada pengerja | Efek `BECOMES_ASSIGNEE`: bila belum ada pengerja, pelaku jadi pengerja. Salah pihak: `NOT_OWNER` |
| 2 | in_progress -> todo | `unstart` | idem | - |
| 3 | todo -> done | `complete` | idem | hanya `needsReview=false` (bila true -> `REVIEW_REQUIRED`); aturan T-A4 `T_A4_COMPLETE_FROM_TODO = true` (bila false -> `WRONG_STATE`); belum ada pengerja -> pelaku jadi pengerja |
| 4 | in_progress -> done | `complete` | idem | hanya `needsReview=false`, selain itu `REVIEW_REQUIRED` |
| 5 | in_progress -> in_review | `requestReview` | Anggota hanya jika pengerja (`NOT_OWNER`) | `needsReview=true`; harus ada calon pemeriksa selain pengerja (admin, pengelola aktif), kalau tidak `NO_ELIGIBLE_REVIEWER` 409; status lain `WRONG_STATE` |
| 6 | in_review -> done | `approve` | TIDAK ADA Anggota (hanya Pengelola/Admin; non-pengelola `NOT_MANAGER`) | pelaku bukan pengerja, bahkan Admin/Super-admin: `SELF_REVIEW` (403) |
| 7 | in_review -> in_progress | `return` | idem | catatan 3-200 karakter, else `REASON_REQUIRED` (422); bukan pengerja |
| 8 | done -> in_progress | `reopen` | pembuat atau pengerja | alasan 3-200 karakter `REASON_REQUIRED` |
| 9 | todo -> canceled | `cancel` | hanya PEMBUAT | kategori wajib: duplicate, not_needed, out_of_scope, created_by_mistake, other; kategori `other` wajib catatan (`CANCEL_NOTE_REQUIRED` 422; juga CHECK DB) |
| 10 | in_progress -> canceled | `cancel` | idem | idem |
| 11 | in_review -> canceled | `cancel` | idem | idem |
| 12 | canceled -> todo | `uncancel` | hanya PEMBUAT | - |

Tidak ada: done -> canceled, canceled -> selain todo, todo -> in_review, todo/in_progress tanpa review lewat "approve". `primaryAction` (satu tombol utama per baris): todo -> start; in_progress -> complete (tanpa review) atau requestReview (dengan review); in_review -> approve; done -> reopen; canceled -> uncancel; tugas di Sampah -> tidak ada.
Pengerja pemeriksa: tugas kosong-pengerja diambil siapa pun yang boleh membuat tugas.
Efek samping yang TIDAK ada di kode (service belum ada): penambahan `reopen_count`, `return_count`, `completedAt`, `canceledAt`, `last_activity_at`, entri `task_activity`.

Pengaman level DB (migrasi 0016): `reviewer_id <> assignee_id`; status canceled wajib punya kategori; kategori `other` wajib catatan; due >= start.

### ST-05 Sesi menyamar `[DIBANGUN]` (Better Auth, `auth.ts:36-42,81-114`)
mulai (super-admin, tombol "Masuk sebagai user" di `/dev/users`) -> sesi baru berumur 3600 dtk (`impersonationSessionDuration`) dengan penanda `impersonatedBy`; berakhir lewat tombol "Berhenti menyamar" (`AppFrame.tsx:118`) atau habis waktu. Dicatat ke login_log (metode `impersonation`) dan audit `user.impersonate`.

---
## 4. Aturan izin (PERM)

### 4a. Peran akun (`server/permissions.ts`)
| ID | Peran | Asal peran | Rumah | Boleh |
|---|---|---|---|---|
| PERM-01 | member | default semua akun baru (DB default + `defaultRole`) | `/app` | `/app`, `/profile`; kelola kunci API pribadi |
| PERM-02 | project_manager | diberikan admin/super-admin saat setuju, ubah peran, atau undangan | `/app` | sama + boleh membuat proyek (kebijakan) + membaca semua proyek (P-A1) |
| PERM-03 | admin | hanya diberikan super-admin (ubah peran atau undangan) | `/dashboard` | + `/dashboard`, kelola pengguna, undangan; juga boleh `/app` |
| PERM-04 | super-admin | hanya dari env `SUPER_ADMIN_EMAILS` + email terverifikasi (tidak bisa diberikan lewat UI/API; CHECK undangan melarangnya) | `/dev` | semua area, impersonasi, hapus pengguna, pengaturan |

Peran BA (`permissions.ts:117`): admin `user:[list, ban]`, `session:[list]`; super-admin semua + `impersonate-admins`. Dipakai oleh `auth.api.banUser/unbanUser/removeUser/impersonate`.

### 4b. Aksi akun (`user.policy.ts`; dipakai API admin dan tombol UI yang sama)
| ID | Aksi | super-admin | admin | PM/member | Penolakan |
|---|---|---|---|---|---|
| PERM-10 | Buka /dashboard/users (`canManageUsers`) | ya | ya | tidak | NOT_ADMIN |
| PERM-11 | Bertindak pada akun (blokir, buka blokir, setuju, tolak, hapus) (`canActOnUser`) | atas siapa pun kecuali diri sendiri dan super-admin lain | atas member/PM saja (admin lain dan super-admin dilindungi) | tidak | IMPERSONATING (dicek pertama), NOT_ADMIN, SELF_TARGET, TARGET_PROTECTED |
| PERM-12 | Ubah peran (`canSetUserRole`) | member, PM, admin | member<->PM | tidak | TARGET_PROTECTED bila peran tujuan `admin`/`super-admin`/tak dikenal bagi admin biasa |
| PERM-13 | Undang dengan peran (`canInviteWithRole`) | member, PM, admin | member, PM | tidak | NOT_ADMIN, TARGET_PROTECTED |
| PERM-14 | Hapus pengguna permanen | ya | tidak (NOT_APP_ROLE "Hanya super-admin...") | tidak | `api/admin.ts:71` |
| PERM-15 | Impersonasi | ya (bukan sesama super-admin, bukan diri sendiri, tidak berantai) | tidak | tidak | `user-access.ts:70` + BA |

### 4c. Level proyek (`level.ts`) `[BEKU-KEBIJAKAN]`
Satu "level" per (pengguna, proyek), urutan: admin(5) > manager/Pengelola(4) > member/Anggota(3) > viewer/Pemantau(2) > reader(1) > none(0). Admin & super-admin selalu `admin` (mengalahkan peran proyek, bahkan saat menyamar: impersonasi hanya mengubah apa yang boleh DILAKUKAN, bukan yang boleh DILIHAT). Peran proyek 'manager'/'member'/'viewer' dari `project_member`. Project Manager (akun) yang BUKAN anggota = `reader` bila `P_A1_PM_NON_MEMBER_READS = true` (nilai sekarang true), selain itu `none`. Member akun non-anggota = `none`.

### 4d. Matriks proyek dan tugas `[BEKU-KEBIJAKAN]` (kecuali `canCreateProject` lewat `appCaps`)
Y = boleh. Kolom = level pada proyek tersebut. "-" = ditolak; kode penolakan di kolom akhir. Hasil `none` selalu 404 (`NOT_VISIBLE`/`NOT_FOUND`, tidak membocorkan keberadaan).

| ID | Aksi (fungsi) | Admin/SA | Pengelola | Anggota | Pemantau | PM bukan anggota (reader) | Bukan anggota | Penolakan |
|---|---|---|---|---|---|---|---|---|
| PERM-20 | Lihat proyek `canViewProject` | Y | Y | Y | Y | Y (read-only) | 404 | NOT_VISIBLE |
| PERM-21 | Buat proyek `canCreateProject` | Y | - | - | - | Y (peran akun PM) | member: - | NOT_APP_ROLE (akun)|
| PERM-22 | Kelola proyek (detail, status, setup, anggota) `canManageProject` | Y | Y | - | - | - | 404 | NOT_MANAGER; PROJECT_IN_TRASH bila di Sampah |
| PERM-23 | Pindah ke Sampah `canTrashProject` | Y | Y hanya jika peran AKUN PM/admin (Member-pengelola: tidak, flag `MEMBER_MANAGER_CAN_TRASH_PROJECT=false`) | - | - | - | 404 | IMPERSONATING (dicek pertama), NOT_MANAGER, ROLE_CANNOT_TRASH, PROJECT_IN_TRASH |
| PERM-24 | Daftar proyek `projectListScope` | semua | hanya keanggotaan (kecuali akun PM = semua) | hanya keanggotaan | idem | semua | - | permintaan `scope=all` oleh Member dipersempit diam-diam jadi `mine`, tanpa galat (`clampListScope`) |
| PERM-25 | Ubah daftar anggota/peran `canChangeManagerSet` | Y | Y | - | - | - | 404 | NOT_MANAGER; LAST_MANAGER (tak boleh kosong pengelola, juga mengikat Admin); IS_LEAD (tak boleh mencabut peran Pengelola dari Penanggung jawab utama) |
| PERM-26 | Tetapkan Penanggung jawab utama `canSetLead` | Y | Y | - | - | - | 404 | NOT_MANAGER; `LEAD_MUST_BE_MANAGER` (422) |
| PERM-27 | Lihat tugas `canViewTask` | Y | Y | Y | Y | Y | 404 | NOT_FOUND |
| PERM-28 | Buat tugas `canCreateTask` | Y | Y | Y | - (NOT_MEMBER) | - (NOT_MEMBER) | 404 | PROJECT_IN_TRASH; WRONG_STATE bila proyek ditutup DAN flag Q12 mati (sekarang `PROJECT_CLOSED_ALLOWS_TASK_WRITES=true`, tugas tetap boleh di proyek Ditunda/Selesai/Batal) |
| PERM-29 | Ubah isi/checklist/pengerja `canEditTask` | Y | Y | hanya tugas buatannya atau miliknya (`T_A2_MEMBER_EDIT_SCOPE='own'`; bila 'all' semua tugas) | - NOT_MEMBER | - NOT_MEMBER | 404 | NOT_OWNER; PROJECT_IN_TRASH; WRONG_STATE (tugas di Sampah) |
| PERM-30 | Komentar `canComment` | Y | Y | Y | Y | - bila `P_A1B_PM_NON_MEMBER_COMMENTS=false` (sekarang false) | 404 | NOT_MEMBER; PROJECT_IN_TRASH |
| PERM-31 | Kelola jenis tugas `canManageKinds` | Y | Y | - | - | - | 404 | NOT_MANAGER; PROJECT_IN_TRASH |
| PERM-32 | Hidupkan "perlu diperiksa" `canToggleNeedsReview(true)` | Y | Y | ikut cakupan ubah (T-A5 `T_A5_MEMBER_ENABLES_REVIEW=true`) | - | - | 404 | NOT_OWNER/NOT_MEMBER; LOCKED_BY_STATUS bila status in_review, done, canceled |
| PERM-33 | Matikan "perlu diperiksa" `canToggleNeedsReview(false)` | Y | Y | - | - | - | 404 | NOT_MANAGER; LOCKED_BY_STATUS |
| PERM-34 | Ubah pemeriksa `canChangeReviewer` | Y | Y | hanya PEMBUAT tugas | - | - | - NOT_MEMBER | NOT_OWNER; LOCKED_BY_STATUS (done/canceled); SELF_REVIEW (pemeriksa = pengerja); NO_ELIGIBLE_REVIEWER |
| PERM-35 | Aksi alur kerja (start, ... uncancel) | lihat ST-04 | | | | | | |

`resolveNeedsReviewOnCreate` (`task.policy.ts:194`): saat tugas dibuat, "perlu diperiksa" = pilihan pembuat, kalau tidak ada = bawaan proyek (`tasksNeedReviewDefault`); Anggota tidak bisa mematikan bawaan proyek yang menyala (diam-diam tetap menyala, `ignored=true`); BILA `TASK_REVIEW_UI_ENABLED=false` (sekarang false) SEMUA nilai true dibuang jadi false.

`taskCaps`/`projectCaps` (`capabilities.ts`): menyusun peta `can{}` untuk UI: `true` = tombol aktif; kode penolakan = tampil nonaktif dengan tooltip `DENY_UI`; kunci absen = tombol disembunyikan (ditentukan `DENY_UI.ui`). Cek lihat selalu dahulu agar proyek tersembunyi tidak bocor (aturan urutan di komentar, tidak ditegakkan kompiler).


### 4f. Pemilih pemeriksa `pickReviewer` `[BEKU-KEBIJAKAN]` (`review.policy.ts:51`)
Urutan: (1) pembuat bila pengelola aktif dan bukan pengerja; (2) Penanggung jawab utama (aktif, bukan pengerja); (3) pengelola lain terlama bergabung (seri: id terkecil); (4) "kolam admin": tanpa pemeriksa tersimpan, menyarankan pengelola kedua. Pengerja tak pernah dipilih; aktif = approved dan tidak banned.

---
## 5. Penolakan (DEN)

Sumber: `server/pm/errors.ts` (`PM_ERRORS`), `server/access/decision.ts:22` (`DENY_UI`). Bentuk jawaban API: `{ error, code, status, requestId }` (`api-error.ts`). Dua pesan per kode: pesan API (`PM_ERRORS`) dan pesan tooltip UI (`DENY_UI`, lebih ramah, menyuruh tindakan). `ui`: hide = kontrol disembunyikan; disable = tampil nonaktif + alasan.

| ID | Kode | HTTP | UI | Pesan pengguna (ringkas) | Di mana terjadi |
|---|---|---|---|---|---|
| DEN-01 | NOT_MANAGER | 403 | hide | Hanya pengelola proyek ini | `project.policy`, `task.policy`, `review.policy`, `members.policy` (belum dipakai layar) |
| DEN-02 | NOT_MEMBER | 403 | hide | Kamu belum menjadi anggota proyek | idem (pemantau/PM-bukan-anggota/non-anggota di aksi review) |
| DEN-03 | NOT_OWNER | 403 | hide | Hanya pembuat atau pengerja tugas | `task.policy.authorizeTask`, review, flow |
| DEN-04 | NOT_ADMIN | 403 | hide | Hanya Admin yang bisa mengelola akun | `user.policy` ; gerbang `admin-context.ts:49` (jadi SEMUA `/api/admin/*` untuk non-admin) |
| DEN-05 | NOT_APP_ROLE | 403 | hide | Peran akunmu belum cukup | `canCreateProject`; `DELETE /api/admin/users/:id` untuk admin non-super (pesan khusus) |
| DEN-06 | SELF_REVIEW | 403 | disable | Tidak bisa memeriksa pekerjaan sendiri | `review.policy` approve/return/changeReviewer (berlaku untuk Admin dan Super-admin juga) |
| DEN-07 | SELF_TARGET | 403 | disable | Tidak bisa mengubah akunmu sendiri | `user.policy.canActOnUser` |
| DEN-08 | TARGET_PROTECTED | 403 | disable | Akun/peran dilindungi | super-admin (selalu), admin oleh admin, memberi peran admin/super-admin oleh admin biasa, peran tak dikenal |
| DEN-09 | IMPERSONATING | 403 | disable | Dinonaktifkan selama menyamar | semua `canActOnUser`, `canTrashProject`, buat/cabut undangan (`admin-invitations.ts:54,83`), `delete-user` BA di gerbang `auth-gate.ts:101` |
| DEN-10 | WRONG_STATE | 409 | hide | Status data sudah berubah | transisi tak legal; sudah diputuskan bersamaan; tugas di Sampah; invitasi sudah dipakai |
| DEN-11 | LOCKED_BY_STATUS | 409 | disable | Terkunci saat tugas diperiksa/selesai/batal | `canToggleNeedsReview`, `canChangeReviewer` |
| DEN-12 | REVIEW_REQUIRED | 409 | disable | Perlu diperiksa dulu | `complete` pada tugas ber-review |
| DEN-13 | LAST_MANAGER | 409 | disable | Proyek harus punya minimal satu pengelola | `canChangeManagerSet` |
| DEN-14 | IS_LEAD | 409 | disable | Dia masih penanggung jawab utama | `canChangeManagerSet` |
| DEN-15 | PROJECT_IN_TRASH | 409 | disable | Proyeknya ada di Sampah | kelola/buat tugas/komentar/alur kerja pada proyek di Sampah |
| DEN-17 | REASON_REQUIRED | 422 | disable | Tuliskan alasan 3-200 karakter | tolak akun; return; reopen. DENY_UI menyebut "alasan penolakan" walau juga dipakai untuk catatan pengembalian/buka lagi (selisih teks) |
| DEN-18 | CANCEL_NOTE_REQUIRED | 422 | disable | 'Lainnya' perlu catatan | `canCancelTask` |
| DEN-19 | ROLE_CANNOT_TRASH | 403 | disable | Hanya Admin/PM yang boleh menghapus proyek | `canTrashProject` |
| DEN-20 | VALIDATION | 422 | - | Isian belum sesuai | skema Elysia/handler (peran tak dikenal, status undangan tak dikenal) |
| DEN-21 | NOT_FOUND | 404 | - | Data tidak ditemukan atau tak punya akses | pengguna/undangan tak ada; rekaman tersembunyi (sengaja sama dengan tidak ada); rute API tak dikenal |
| DEN-24 | LEAD_MUST_BE_MANAGER | 422 | - | Penanggung jawab utama harus Pengelola | `members.policy.canSetLead` (belum dipakai) |
| DEN-25 | KIND_LIMIT | 409 | - | Jenis tugas aktif sudah batas | KODE ADA; konstanta batas `TASK_KINDS_MAX_ACTIVE`=6, tidak dibaca kode |
| DEN-27 | NO_ELIGIBLE_REVIEWER | 409 | disable (via `capOf`) | Belum ada pemeriksa yang bisa dipilih | `review.policy.canRequestReview`, `canChangeReviewer` |
| DEN-28 | RATE_LIMITED | 429 | - | Terlalu banyak perubahan | limiter tulis `/api/app` (60/60 dtk per pengguna, pesan memakai kata "perubahan"); limiter IP memakai pesan "Terlalu banyak request" |
| DEN-29 | STORAGE_DISABLED | 503 | - | Penyimpanan file belum aktif | avatar upload/baca bila S3 tidak aktif |
| DEN-30 | ACCOUNT_PENDING | 403 | - | Akun menunggu persetujuan | `account/gate.ts`; gerbang `/api/app`, `/api/admin`, plugin kunci API |
| DEN-31 | ACCOUNT_REJECTED | 403 | - | Pendaftaran ditolak | idem |
| DEN-32 | UNAUTHORIZED | 401 | - | Silakan masuk | tamu; akun banned dijawab seperti tamu (tidak punya kode sendiri, X3 M18) |
| DEN-33 | INVALID_EMAIL / DOMAIN_NOT_ALLOWED / INVITATION_EXISTS / INVITATION_LIMIT | 422/422/409/409 | - | lihat ST-02 | `invitation.query.ts:30` |

---
## 6. Aturan otomatis dan perilaku tersirat (AUTO)

Format: pemicu -> efek; pelaku; lokasi. Status default `[DIBANGUN]` bila tidak ditulis lain.

### 6a. Peran, akun, dan masuk
| ID | Perilaku | Lokasi |
|---|---|---|
| AUTO-01 | **Super-admin hanya dari env.** Email ada di `SUPER_ADMIN_EMAILS` DAN `emailVerified=true` -> `super-admin`. Peran super-admin tersimpan tetapi emailnya hilang dari env / tidak terverifikasi -> otomatis DITURUNKAN jadi `member` pada permintaan berikutnya. Peran lain dibiarkan. Pelaku: sistem. | `permissions.ts:74` `reconcileRole`; `roles.ts:19` |
| AUTO-02 | `resolveUserRole` menulis ke DB hanya bila peran berubah, dipanggil di SETIAP permintaan terautentikasi (guard `resolveActor`, plugin kunci API, gerbang pemeliharaan, halaman `/`). Efek: peran bisa berubah tanpa ada yang menekan tombol; berlaku juga saat melihat halaman utama. | `guard.ts:130`, `plugin.ts:118`, `settings-maintenance.ts:106`, `home.tsx:53` |
| AUTO-03 | **Penentuan akun baru** (hook Better Auth `user.create.before`). Urutan: (1) domain email di luar `ALLOWED_EMAIL_DOMAINS` -> akun DITOLAK dibuat (juga bila diundang atau super-admin; allowlist kosong = semua domain); (2) email+sandi di produksi -> ditolak; (3) email belum terverifikasi -> `pending` selalu; (4) email di `SUPER_ADMIN_EMAILS` -> `approved` + `super-admin`; (5) ada undangan aktif -> `approved` + peran undangan (super-admin dipaksa jadi member; `approvalDecidedBy` = pengundang); (6) selain itu `pending`/`member`. Galat apa pun saat memutuskan -> `pending`/`member` (gagal-tertutup). Pelaku: sistem. | `server/account/signup-gate.ts:89`, `signup-hooks.ts:54`, `auth.ts:79` |
| AUTO-04 | Jembatan undangan: id undangan yang diklaim disimpan sementara di memori proses (kunci email, 5 menit) lalu ditautkan ke akun + audit `invitation.use` setelah akun jadi; bila proses restart di antaranya, undangan terpakai tetapi tak tertaut. Profil (ukuran teks) dibuat otomatis; langkah ini lunak (gagal tidak menggagalkan masuk). Akun Google tak pernah digabung otomatis ke akun beremail sama. | `signup-hooks.ts:35-127`, `auth.ts:130` |
| AUTO-06 | **Akun tertahan diblokir di sesi.** Better Auth hanya memblokir sesi BARU untuk banned dan mengabaikan persetujuan, jadi setiap permintaan memeriksa ulang status (tanpa cache): banned/pending/rejected -> `resolveActor` mengembalikan null. Halaman -> alih `/banned` atau `/waiting`; API -> 403 `ACCOUNT_*` (banned dijawab 401 seperti tamu). Status selain persis `approved`/`rejected` (termasuk kosong) dianggap `pending`. | `guard.ts:100-134`, `account/status.ts:16`, `api/app-context.ts:30` |
| AUTO-07 | Kunci API milik akun tertahan langsung mati: banned -> 403 `OWNER_BANNED`; pending/rejected -> 403 `ACCOUNT_*`. Ban yang sudah habis tidak dihitung, kunci hidup lagi tanpa langkah pemulihan. Kunci juga tidak bisa melebihi peran pemilik (cek `ROLE_TOO_LOW` tiap panggilan; bila peran pemilik turun, cakupan lama tetap tersimpan tetapi ditolak). | `api-keys/plugin.ts:111-123` |
| AUTO-08 | **Login email+sandi hanya non-produksi.** Prod: `emailAndPassword.enabled=false`, gerbang 404 untuk `sign-in/email` dan `sign-up/email`, form login tak menampilkannya apa pun isi Pengaturan, dan hook menolak sign-up email. Dev: akun email otomatis ditandai terverifikasi (agar super-admin dev tetap lolos AUTO-01). | `account/auth-policy.ts:9`, `auth-gate.ts:55`, `signup-gate.ts:97-105`, `login-mode.ts:12` |
| AUTO-11 | **Impersonasi.** Hanya super-admin; sesi menyamar berumur 1 jam; peran/halaman utama mengikuti akun yang disamar; selama menyamar: ubah peran, blokir, setuju/tolak, hapus, pindah proyek ke Sampah, buat/cabut undangan ditolak (IMPERSONATING), `delete-user` mandiri di BA ditolak (403). Tidak ditolak: aksi lain (profil, kunci API pribadi, posting, ganti sandi BA, dll). Tidak bisa menyamar sesama super-admin atau diri sendiri (target dilindungi); admin-lain bisa disamar oleh super-admin. Menyamar tidak membatasi apa yang dilihat di proyek (Q9). | `access/user.policy.ts:32`, `auth-gate.ts:57`, `level.ts:27`, `user-access.ts:70` |
| AUTO-12 | **Ban mencabut sesi.** Setelah `banUser`, SEMUA sesi akun dihapus (hitungannya masuk audit). Ban otomatis habis sesuai `banExpires` (dibandingkan saat dibaca). Masuk Google saat banned ditolak oleh Better Auth; pengguna jatuh kembali ke `/login?error=...` (kode galat milik BA). | `api/admin-moderation.ts:30-51`, `ban.ts:21` |
| AUTO-16 | Akun anonim lama (demo) dihapus otomatis 20 detik setelah boot, sekali, per 500 baris, hanya `is_anonymous=true`. Daftar pengguna dan hitungan menyembunyikan akun anonim (`realUser`). Ditandai TODO untuk dihapus (S0A-13). | `demo/cleanup.ts:45`, `api/index.ts:46` |

### 6b. Pembatas laju, pemeliharaan, jaringan
| ID | Perilaku | Lokasi |
|---|---|---|
| AUTO-23 | IP klien: server menimpa header `x-simple-pm-client-ip` di tiap permintaan; `X-Forwarded-For`/`X-Real-IP` dipercaya hanya bila peer soket ada di `TRUSTED_PROXIES` (entri `/0` = peringatan boot). Setiap sesi baru (masuk, ganti akun, menyamar) menulis `login_log`. | `middleware/client-ip.ts`, `auth.ts:81` |
| AUTO-20 | **Pembatas laju per IP** (jendela geser, memori proses, hilang saat restart): bawaan 100 permintaan / 60.000 ms (`RATE_LIMIT_MAX/WINDOW_MS` atau override DB). IPv6 dihitung per blok /64. Hanya `/api/*`; dikecualikan `/api/auth/` dan `/api/mcp`. Setiap jawaban memuat `X-RateLimit-*`; ditolak -> 429 + `Retry-After`. Episode pertama blokir (maks 1 per IP per jendela) ditulis ke `rate_limit_log`. Klien tanpa IP berbagi satu keranjang "unknown". Maks 10.000 kunci (10% LRU terbuang). Halaman SSR (non-API) TIDAK dibatasi. | `rate-limit.ts`, `middleware/rate-limiter.ts:67`, `settings.ts:120` |
| AUTO-21 | **Pembatas laju per pengguna untuk tulis**: `POST/PUT/PATCH/DELETE` di `/api/app` -> 60 per 60 dtk per id pengguna (kunci API memakai jatah pemiliknya). Ditolak 429 `RATE_LIMITED` + `retryAfterSeconds`; episode dicatat di `rate_limit_log` dengan `userId`. Konstanta kode, tidak bisa diubah dari UI. | `api/app-context.ts:23,58`, `pm/limits.ts:19` |
| AUTO-24 | **Mode pemeliharaan** (setelan DB, cache 5 dtk): bila aktif, SEMUA (halaman & API) selain peran yang diizinkan (bawaan hanya super-admin) menerima 503 + Retry-After 300. Dikecualikan: `/login`, `/go`, `/api/auth/`, `/api/settings`, aset, `/README.md`, `/llms*`, robots, sitemap, `*.data`. Halaman `/waiting`, `/banned`, `/app` TIDAK dikecualikan. Peran dibaca dari sesi (gagal baca -> dianggap tamu). Pengecualian: pemeliharaan diperiksa sebelum rekam kunjungan. | `settings-maintenance.ts:28-126`, `middleware/maintenance.ts`, `dev.ts:90`, `prod.ts:82` |
| AUTO-25 | **Pencatatan kunjungan**: tiap navigasi halaman SSR (bukan `/api/`, aset, probe, `.data`) menulis `visit_log` tanpa menunggu: IP, path, UA (512), bot (`isbot` + klasifikasi), `userId` bila ada sesi (juga akun tertahan), referer, negara/kota dari header proxy, peramban, OS, perangkat, bahasa. Galat ditelan. Dilewati saat pemeliharaan. | `middleware/visitor.ts:44-120` |

### 6c. Penjadwal dan pekerjaan latar belakang (SEMUA)
| ID | Pekerjaan | Jadwal | Efek | Lokasi |
|---|---|---|---|---|
| AUTO-40 | Retensi log | cek tiap 1 jam (+15 dtk setelah boot), jalan paling banyak 1x/24 jam bila ada minimal satu masa simpan diatur | hapus baris lebih tua dari N hari (1-3650) di visit/login/rate-limit/audit/api-usage; tabel dengan NULL = simpan selamanya; audit `logs.retention` (aktor kosong) bila ada yang terhapus. Bawaan: TIDAK ADA masa simpan (semua NULL) = tidak menghapus apa pun (badge `/dev/settings` memperingatkan). Ikut mati bila `NODE_ENV=test`. | `settings-retention.ts:101` |
| AUTO-41 | Rollup pemakaian kunci API harian | tiap 1 jam | upsert agregat 3 hari terakhir ke `api_key_usage_daily` (hanya naik, `GREATEST`), agar grafik tidak menyusut setelah retensi | `api-keys/rollup.ts` (dimulai di `index.ts:45`) |
| AUTO-42 | Pembersihan akun demo lama | sekali, 20 dtk setelah boot | AUTO-16 | `demo/cleanup.ts` |
| AUTO-46 | Penghapusan Sampah proyek otomatis setelah 30 hari | TIDAK ADA pekerjaan | `TRASH_RETENTION_DAYS=30` hanya konfigurasi tanpa pembaca | `metrics/config.ts:9`, `pm/metrics-env.ts` `[BEKU-KEBIJAKAN]` |


### 6d. Perhitungan (metrik) `[BEKU-KEBIJAKAN]` (`server/metrics/*`, `server/pm/metrics-env.ts`)
Dipakai oleh: pustaka label/ikon UI (`app/lib/pm-labels.ts`, `ProgressBar`, `TaskLabelChip`, `DateText`) dan data seed Atlas. Tidak ada layar/API yang menghitungnya untuk pengguna nyata (`getMetrics()` tidak punya pemanggil). Nilai `METRICS` (`config.ts:5`):
| ID | Aturan | Nilai / rumus |
|---|---|---|
| AUTO-50 | Zona waktu "hari ini" untuk semua orang | `Asia/Jakarta` (override env `APP_TIME_ZONE`; nilai salah diabaikan + peringatan log). Tanggal = hari kalender zona itu, bukan irisan UTC |
| AUTO-51 | Progres proyek | tugas selesai / tugas terhitung (tidak menghitung batal dan Sampah; `in_review` belum selesai); dibulatkan; TIDAK pernah 100% sebelum semua terhitung selesai (batas atas 99, `PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE`); tanpa tugas terhitung = `null` ("Belum ada tugas", bukan 0%) |
| AUTO-52 | Waktu berjalan | (hari sejak mulai) / (rentang mulai-tenggat), 0-100; `overrun` bila hari ini > tenggat; null tanpa dua tanggal atau rentang <= 0 |
| AUTO-53 | Tugas aktif | status todo, in_progress, in_review dan tidak di Sampah |
| AUTO-54 | Terlambat | aktif dan tenggat < hari ini (jatuh tempo hari ini belum terlambat; tanpa tenggat tidak pernah) |
| AUTO-55 | Mandek | in_progress dan tanpa aktivitas > 3 hari penuh (>72 jam; tepat 72 jam belum) (`TASK_STALE_DAYS`, env 1-3650) |
| AUTO-57 | Label tugas (urutan prioritas, label utama = pertama) | terlambat > menunggu pemeriksaan saya > terblokir > mandek > dibuka ulang. "terblokir" bergantung masukan pemanggil (pengecekan dependensi baru S4); `awaitingMe` dari pemanggil |
| AUTO-58 | Kondisi proyek (hanya status `active`; selain itu `null`) | LEWAT TENGGAT (`off_track`): tenggat < hari ini (alasan tunggal, sisanya tidak dihitung). Selain itu `at_risk` bila: ada tugas prioritas high/critical terlambat; ATAU ada milestone terlewat; ATAU terlambat/aktif > 0,2 (ketat, tepat 20% masih aman; env `PROJECT_AT_RISK_OVERDUE_RATIO` 0..1). Kalau tidak ada: `on_track`. Penimpaan manual oleh pengelola (terbaru yang belum dicabut/kedaluwarsa menang) menggantikan hasil hitung. Milestone dan penimpaan belum ada tabelnya; S1 mengirim `[]` |

### 6e. Ukuran teks, sidebar, profil
| ID | Perilaku | Lokasi |
|---|---|---|
| AUTO-70 | Ukuran huruf: cookie `mk-text-size` (`normal`/`besar`/`sangat_besar`, 1/1.25/1.5) menang; tanpa cookie dan ada cookie sesi -> baca `profile.text_size`; tamu -> `normal`. Gagal baca -> `normal` (dicatat). Dibaca di root loader SSR (skala tema). PENULIS COOKIE BELUM ADA: `textSizeCookie()` tidak dipanggil siapa pun (rute `PATCH /api/app/profile` masih STUB) sehingga pengguna belum bisa mengubahnya `[STUB]`. | `text-size.ts`, `text-size.loader.ts`, `root.tsx:29` |

### 6f. Audit, MCP, kunci API, CLI
| ID | Perilaku | Lokasi |
|---|---|---|
| AUTO-80 | `audit()` ditulis SETELAH aksi, tidak menunggu (`void`), gagal hanya dicatat (aksi tetap jalan). FK aktor hilang -> disimpan dengan aktor kosong + snapshot email. Email di jejak persetujuan/undangan disamarkan (`b***@kantor.id`). | `audit.ts:74` |
| AUTO-81 | MCP debug `/api/mcp`: kunci scope `mcp` atau token bersama `MCP_ADMIN_TOKEN`; 8 alat baca (status, log, DB, daftar pengguna, sesi, post, file health); token env lama memicu badge oranye. Dikecualikan dari limiter IP. | `mcp/*` |
| AUTO-82 | Kunci API: ter-hash, awalan `sp_live_`; cakupan dibatasi peran pemilik; tanpa kedaluwarsa hanya pemilik super-admin (lain 1-365 hari); daftar IP opsional; kunci tak bisa mengelola kunci; rute tanpa pemetaan scope otomatis DITOLAK untuk kunci. | `api-keys/*` |
| AUTO-84 | CLI `server/cli/index.ts`: `start` (Postgres/RustFS lokal bila mode lokal + migrasi + server), `init`, `doctor`, `migrate [--status]`, `backup`, `upgrade`, `version`. Seed: `SEED_ALLOW=1 bun scripts/seed-dev.ts atlas|reset` (ditolak di produksi; hanya menghapus id berawalan `seed-`; bukan subperintah binary). | `cli/*`, `scripts/*` |
| AUTO-85 | `requireRole` di rute API: bukan peran yang diminta -> 302 (alih) ke home peran / `/login`, BUKAN 401/403 JSON; berlaku untuk `/api/analytics`, `/audit`, `/sessions`, `/logs`, `/file-health`, `/ops`, `/settings` (tulis), `/posts/stats`. Gerbang `/api/app` dan `/api/admin` menjawab JSON 401/403. | `guard.ts:26-30` |
| AUTO-86 | Pengaturan DB `signupEnabled` dan `emailAuthEnabled` HANYA memengaruhi tampilan layar masuk (dan peringatan badge) di non-produksi; server tidak menolak sign-up berdasarkan `signupEnabled`. Di produksi keduanya tidak berefek. | `login-mode.ts`, `sidebar-badges.ts:143` (tidak ada pembaca lain) |

---
## 7. Audit (AUD)

Semua nilai `AUDIT_ACTIONS` (`server/audit.ts:11`); label di `app/lib/audit-api.ts:87`. Tampil di `/dev/audit` (super-admin).

| ID | Aksi | Label | Pemicu | Dipanggil di |
|---|---|---|---|---|
| AUD-01 | user.role.set | Ubah role | admin/SA ubah peran | `api/admin.ts:51` |
| AUD-02 | user.ban | Ban user | blokir | `admin-moderation.ts:42` |
| AUD-03 | user.unban | Buka ban | buka blokir | `admin-moderation.ts:75` |
| AUD-04 | user.delete | Hapus user | SA hapus | `api/admin.ts:79` |
| AUD-05 | user.impersonate | Impersonasi | sesi menyamar dibuat (hook sesi) | `auth.ts:103` |
| AUD-06 | user.approve | Setujui user | setujui | `approval.service.ts:134` |
| AUD-07 | user.reject | Tolak user | tolak | `approval.service.ts:161` |
| AUD-08 | invitation.create | Buat undangan | undang | `admin-invitations.ts:68` |
| AUD-09 | invitation.revoke | Cabut undangan | cabut | `admin-invitations.ts:93` |
| AUD-10 | invitation.use | Undangan dipakai | akun pertama dibuat dari undangan | `signup-hooks.ts:121` |
| AUD-11 | session.revoke | Cabut sesi | SA cabut satu/semua sesi pengguna | `sessions.ts:35,52` |
| AUD-12 | settings.auth.update | Settings auth | ubah toggle login email/daftar | `settings.ts:46` |
| AUD-15 | logs.purge | Purge log | purge massal | `analytics.ts:54` |
| AUD-16 | logs.delete | Hapus log | hapus baris log | `analytics-visits/-logins/-ratelimits` |
| AUD-17 | logs.retention | Retensi otomatis | retensi (aktor kosong bila terjadwal; SA bila manual) | `settings-retention.ts:92`, `settings-ops.ts:52` |
| AUD-19 | settings.maintenance.update | Settings maintenance | aktif/nonaktif pemeliharaan | `settings-access.ts:27` |
| AUD-20 | settings.features.update | Feature flags | ubah flag | `settings-ops.ts:68` |
| AUD-22 | settings.demo.update | Settings demo | TIDAK ADA PEMANGGIL `[DIMATIKAN]` (sisa sandbox demo) | - |
| AUD-23 | ops.reset | Reset cache | reset limiter/file-health/settings/logs | `ops.ts:105` |
| AUD-24 | post.update | Edit post | admin ubah post orang lain (pemilik sendiri tidak diaudit) | `posts.ts:71` |
| AUD-25 | post.delete | Hapus post | idem | `posts.ts:92` |
| AUD-26..30 | apikey.create / update / rotate / revoke / delete | Buat/Ubah/Rotasi/Cabut/Hapus API key | oleh SA (`/api/api-keys`) atau pemilik (`/api/me/api-keys`) | `api-keys.ts`, `me-api-keys.ts` |

Tidak diaudit (perlu diketahui): pembuatan post, pembuatan akun, masuk/keluar (ada di `login_log` terpisah), unduh/ekspor CSV, perubahan profil/foto, setiap aksi proyek/tugas (belum ada), penghapusan akun sendiri, buka blokir otomatis karena waktu, penurunan peran otomatis super-admin (AUTO-01), pencatatan pemakaian kunci API (tabel `api_key_usage`).

---
## 8. Konfigurasi yang mengubah perilaku (ENV)

### 8a. Variabel lingkungan (`server/env.ts`, `.env.example`)
| ID | Nama | Bawaan | Efek | Catatan |
|---|---|---|---|---|
| ENV-01 | NODE_ENV | development | `production` mematikan email+sandi, menyalakan limiter BA, sembunyikan pesan galat; `test` mematikan penjadwal | `env.ts:18`, `index.ts:43` |
| ENV-04 | BETTER_AUTH_SECRET (wajib) | - | boot GAGAL bila lemah di produksi (<32 karakter atau awalan "change-me") | `env-secret.ts` |
| ENV-05 | GOOGLE_CLIENT_ID/SECRET | kosong | keduanya wajib agar tombol Google aktif; tanpa itu dan tanpa email -> "tidak ada cara masuk" (badge) | `hasGoogleAuth` |
| ENV-06 | SUPER_ADMIN_EMAILS | kosong | sumber kebenaran super-admin (AUTO-01/03); berlaku saat masuk berikutnya | |
| ENV-07 | ALLOWED_EMAIL_DOMAINS | kosong = semua | domain lain ditolak saat DAFTAR (undangan dan super-admin pun); tidak memengaruhi akun yang sudah ada | `signup-gate.ts:94` |
| ENV-08 | MCP_ADMIN_TOKEN | kosong | menyalakan token MCP lama (min 32 karakter) | |
| ENV-09 | RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS | 100 / 60000 | bawaan limiter IP (dapat ditimpa di DB) | |
| ENV-10 | TRUSTED_PROXIES | kosong | IP/CIDR proxy yang header-nya dipercaya; entri tak valid menggagalkan boot | |
| ENV-11 | APP_TIME_ZONE, PROJECT_AT_RISK_OVERDUE_RATIO, TASK_STALE_DAYS, TRASH_RETENTION_DAYS | Asia/Jakarta, 0.2, 3, 30 | menimpa `METRICS`; nilai tak valid diabaikan + peringatan | `pm/metrics-env.ts` `[BEKU-KEBIJAKAN]` (tak ada pemanggil) |

### 8b. Saklar kode (berubah = rilis baru; bukan env)
| ID | Saklar | Nilai | Efek | Status |
|---|---|---|---|---|
| ENV-20 | `TASK_REVIEW_UI_ENABLED` (`pm/limits.ts:26`) | false | `resolveNeedsReviewOnCreate` membuang semua "perlu diperiksa" | `[DIMATIKAN]` |
| ENV-21 | `PROJECT_DELETE_UI_ENABLED` (`pm/limits.ts:32`) | true | tidak dibaca siapa pun | menyala tetapi TANPA PEMAKAI |
| ENV-22 | `P_A1_PM_NON_MEMBER_READS` (`access/rules.ts:29`) | true | PM non-anggota bisa membaca semua proyek (read-only); false = 404 | `[BEKU-KEBIJAKAN]` |

### 8c. Setelan di basis data (`app_setting` satu baris, UI `/dev/settings`, super-admin)
| ID | Setelan | Efek nyata |
|---|---|---|
| ENV-40 | `emailAuthEnabled` (bawaan false), `signupEnabled` (bawaan true) | hanya tampilan layar masuk di non-produksi (AUTO-86) |
| ENV-41 | Rate limit: aktif/nonaktif, maks, jendela, prefiks dikecualikan | diterapkan SEGERA ke limiter yang berjalan; bawaan = env; daftar kecualian bawaan `/api/auth/`, `/api/mcp` |
| ENV-42 | Retensi (5 tabel, hari/NULL) + jalankan manual | AUTO-40 |
| ENV-43 | Mode pemeliharaan: aktif, pesan (maks 500), peran yang diizinkan (maks 3 dari 4; bawaan super-admin saja) | AUTO-24 |
| ENV-45 | Branding: nama (<=60), tagline (<=140), URL dukungan (<=300) | dipakai judul halaman, layar masuk, /waiting, /banned, 503 pemeliharaan; bawaan "Simple PM" / "Fullstack Template" |

---
## 9. Konsol operasional

Bukan bagian wireframe produk, tetapi nyata. Tiap halaman memanggil guard sendiri.

### 9a. `/dashboard` (admin dan super-admin)
| ID | Halaman | Fungsi | Aksi berbahaya |
|---|---|---|---|
| CON-01 | `/dashboard` | kartu jumlah pendaftar menunggu + tombol "Tinjau sekarang" | - |
| CON-02 | `/dashboard/users` tab Persetujuan | antrean `pending` terlama dulu; Setujui (pilih peran), Tolak (alasan 3-200) dengan konfirmasi | setuju memberi akses; tolak tidak mengirim kabar |
| CON-03 | tab Semua | direktori pengguna: cari, saring peran/status/approval/hari; ubah peran, blokir (alasan + Permanen/1/7/30 hari), buka blokir, setujui/tolak; drawer detail | blokir mencabut semua sesi; (hapus dan menyamar hanya muncul untuk super-admin) |
| CON-04 | tab Undangan | daftar status active/used/expired/revoked, undang email+peran (maks 100 aktif, 14 hari), cabut | undangan = persetujuan otomatis saat orang itu pertama masuk |
Badge oranye jumlah pending di menu Pengguna (tidak di-cache).

### 9b. `/dev` (super-admin)
| ID | Halaman | Fungsi | Aksi berbahaya |
|---|---|---|---|
| CON-10 | `/dev` Overview | ringkasan kondisi, pintasan | - |
| CON-11 | `/dev/users` | direktori sama dengan CON-03, plus Hapus permanen dan "Masuk sebagai user" | hapus akun permanen; menyamar |
| CON-12 | `/dev/sessions` | sesi aktif lintas pengguna; cabut satu/semua sesi pengguna | cabut sesi memaksa keluar |
| CON-13 | `/dev/posts` | konten contoh: buat/ubah/hapus, moderasi | hapus post orang lain |
| CON-14 | `/dev/api-keys` | buat/ubah/putar/cabut/hapus kunci untuk pemilik mana pun; pemakaian, anomali | kunci bocor = akses; kunci tanpa kedaluwarsa hanya super-admin |
| CON-16 | `/dev/visits`, `/dev/login-logs`, `/dev/rate-limit-logs` | daftar, statistik, ekspor CSV (maks 10.000), hapus baris (maks 100 sekali) | hapus log, "Purge" semua tabel (hari=0 hapus SEMUA) |
| CON-18 | `/dev/audit` | jejak aksi istimewa (baca saja; tak ada hapus manual, tetapi retensi dapat menghapus) | - |
| CON-20 | `/dev/settings` | kartu: Autentikasi, Rate limit, Retensi (jalankan sekarang), Pemeliharaan, Feature flags, Branding, Info runtime | mode pemeliharaan menutup situs untuk non-super-admin; rate limit nonaktif; retensi menghapus log permanen |
| CON-21 | `/dev/tools` | akses MCP, status proses, reset cache (limiter, file-health, settings, buffer log) | reset limiter membuka kuota semua IP |

---
## 10. Alur autentikasi ujung ke ujung

Langkah: klik "Lanjutkan dengan Google" (`LoginForm.tsx:93`, callback `/go`, kegagalan kembali ke `/login`) -> Better Auth -> (akun baru: AUTO-03 memutuskan status) -> sesi dibuat + `login_log` -> `/go` -> `redirectToHome` (`guard.ts:140`) -> tujuan.

| # | Keadaan akun | Tujuan setelah `/go` | Bila membuka langsung halaman lain |
|---|---|---|---|
| 1 | Belum login | `/login` | `/app*`, `/profile`, `/dashboard*`, `/dev*` -> `/login` (cookie sesi basi -> `/login?notice=session`) |
| 2 | approved, member / project_manager | `/app` | `/dashboard`, `/dev` -> `/app` |
| 3 | approved, admin | `/dashboard` | `/dev` -> `/dashboard`; `/app`, `/profile` terbuka |
| 4 | approved, super-admin | `/dev` | `/dashboard`, `/app` terbuka |
| 5 | pending (baru, tanpa undangan, email belum diverifikasi, atau domain bukan kasus) | `/waiting` ("Akun Anda menunggu persetujuan", tombol Cek lagi, Keluar) | semua area berperan -> `/waiting`. Admin setuju -> "Cek lagi" -> `/go` -> home peran |
| 6 | rejected | `/waiting` (judul "Pendaftaran Anda ditolak" + alasan admin) | idem; admin masih bisa menyetujui ulang; tidak ada tombol "daftar lagi" |
| 7 | banned (permanen atau sementara, aktif) | `/banned` (alasan, "permanen"/tanggal selesai, Keluar, Ke beranda); bila baru mencoba masuk Google, BA menolak dan kembali ke `/login?error=...` | semua area -> `/banned`; ban habis -> `/banned` mengalihkan ke `/go` atau `/waiting` |
| 8 | banned DAN pending | `/banned` (ban menang) | idem |
| 9 | Sesi menyamar (super-admin jadi X) | `/go` memakai peran X: member/PM -> `/app`; admin -> `/dashboard` | spanduk "menyamar" + tombol berhenti; bila X tertahan -> `/waiting`/`/banned` |
| 10 | Pemeliharaan aktif, non-super-admin | `/login`, `/go` tetap hidup (dikecualikan) tetapi tujuan (`/app`, ...) 503 HTML | pengguna terjebak di halaman 503 |
| 11 | Sudah login membuka `/login` | `/login` tetap tampil (tidak ada alih otomatis) | |
| 12 | API: tamu | 401 `UNAUTHORIZED` | `requireRole`: 302 |
| 13 | API: pending/rejected | 403 `ACCOUNT_PENDING`/`ACCOUNT_REJECTED` (banned: 401) | |
Pintu lain: ganti akun (multiSession maks 5; sesi baru dicatat `switch`), keluar, daftar/masuk email+sandi hanya non-produksi.

---
## 11. Direncanakan tetapi belum ada

**STUB literal (`STUB(`):** 17 penanda: 6 modul API (`app-profile`, `app-projects`, `app-projects.members`, `app-tasks`, `app-tasks.workflow`, `app-tasks.detail`; label S1/S2) + 11 halaman (RT-07..17). Dijaga `tests/app-stubs.test.ts` (dihapus dari daftar saat diisi).

**Kebijakan beku** (fungsi murni lulus tes, tanpa layar/API): `project.policy` (kecuali `canCreateProject` di `appCaps`), `members.policy`, `task.policy`, `task-flow.policy`, `review.policy`, `taskCaps/projectCaps`, `server/metrics/*`, `pm/metrics-env.ts`, `project/membership.query.ts`, `pm/keyset.ts`, `pm/soft-delete.ts`.

**Saklar/kode tanpa pemakai:** lihat 8b; plus `isFeatureEnabled`, audit `settings.demo.update`, kode `NO_PROJECT/STATE_CONFLICT/STALE_VERSION/KIND_LIMIT/KIND_IN_USE`, `textSizeCookie`, `caps.createProject`.

**Disebut komentar/CHANGELOG tetapi belum ada kodenya:** layar Sampah/pulihkan proyek (S6), lampiran (S5), tabel dan UI pemeriksaan `task_review` (S4), dependensi/terblokir (S4), milestone dan penimpaan kondisi (S5), pengubah status proyek, impor CSV, email/notifikasi, undo 10 dtk, Beranda berisi pekerjaan (S3), halaman Pengaturan (S1), PATCH profil, keluar proyek, penghapusan Sampah 30 hari.

---
## 12. Kandidat "magic" (peringkat; kalimat awam)

1. Peran bisa berubah sendiri: super-admin dicabut diam-diam jika emailnya dihapus dari konfigurasi server, dan itu terjadi hanya dengan membuka halaman (AUTO-01/02).
2. Pendaftar yang emailnya sudah diundang langsung disetujui tanpa admin melihatnya, dan undangan hanya berlaku untuk akun yang belum ada (AUTO-03, ST-02).
3. Orang yang ditolak atau menunggu tidak diberi tahu apa pun (tidak ada email); mereka harus menekan "Cek lagi" (ST-01).
4. Admin yang disetujui/ditolak/diblokir tidak bisa menyentuh sesama admin dan super-admin; "tolak" tidak berlaku untuk akun yang sudah disetujui (harus diblokir) (PERM-11, ST-01).
5. Memblokir seseorang langsung mengeluarkannya dari semua perangkat dan mematikan kunci API-nya, dan blokir sementara hilang sendiri tanpa ada yang menekan tombol (AUTO-06/07/12).
6. Memilih "tolak" tanpa alasan 3-200 huruf tidak diizinkan; hal serupa untuk "kembalikan tugas" dan "buka lagi tugas" (aturan tersembunyi di balik tombol nonaktif) (DEN-17).
7. Super-admin tidak bisa memeriksa tugas sendiri; Admin pun dilarang menyetujui pekerjaan yang ia kerjakan (SELF_REVIEW) (ST-04).
8. Anggota yang mulai mengerjakan tugas tanpa pengerja otomatis menjadi pengerjanya (BECOMES_ASSIGNEE); tombol "pemeriksa" dipilih otomatis: pembuat, lalu penanggung jawab utama, lalu pengelola paling senior, lalu "kolam admin" (ST-04, pickReviewer).
9. Mode pemeliharaan menutup SEMUA orang selain peran yang dipilih, termasuk halaman `/waiting` dan `/banned`; hanya `/login` dan `/go` yang tetap terbuka (AUTO-24).
10. Pembatas laju: lebih dari 100 permintaan/menit per IP ditolak; tulis ke `/api/app` dibatasi 60/menit per orang; hilang saat server restart; satu kantor berbagi IP berbagi jatah (AUTO-20/21).
11. Hasil pencarian proyek orang lain tidak pernah menjawab "dilarang", selalu "tidak ditemukan", supaya keberadaannya tak bocor (404 vs 403) (DEN-21, level.ts).
12. Setelan layar "pendaftaran dibuka/ditutup" tidak sungguh mencegah pendaftaran, dan di produksi hanya Google yang berlaku apa pun isinya (AUTO-86).
13. Meminta "semua proyek" sebagai Anggota diam-diam diberi "proyek saya" tanpa pesan (PERM-24); log disimpan selamanya sampai super-admin mengatur masa simpan (AUTO-40).

---
## 13. Hal yang tidak bisa dipastikan dari kode

- Perilaku internal Better Auth (tidak dibaca): umur/masa pembaruan sesi bawaan, isi kode galat saat masuk Google untuk akun banned, apakah `/api/auth/api-key/*` (plugin) atau `/update-user` mengizinkan pending/rejected menjalankan aksi (gerbang `auth-gate.ts` meloloskan semua selain `/admin/*`; guard `resolveActor` tak melindungi rute BA). Perlu uji runtime.
- Apakah tombol UI `/profile` (ubah nama, foto lewat BA) dapat dipakai akun pending (kemungkinan hanya lewat `/waiting`, yang tidak menampilkannya).
- Komentar `DENY_UI`/gerbang menyebut "kami akan memberi kabar lewat email", tetapi tidak ada kode email di repo; kode menang: tidak ada email.
- Isi layar yang dibangun lewat komponen (kartu profil, tabel pengguna) tidak dibaca per piksel; teks tombol hanya dari sampel.
- Penegakan "cek lihat sebelum aksi" (aturan urutan `capabilities.ts`) hanya berupa komentar; belum ada service yang menegakkannya.
- Apakah ada logika tersimpan di migrasi `0001-0013` (trigger, view): hanya migrasi 0014-0016 diperiksa untuk CHECK/indeks; tidak ditemukan trigger di ketiganya.
