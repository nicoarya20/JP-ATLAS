# Permintaan tinjauan kedua keamanan — S0A-05 sampai S0A-10

> 16 Oktober 2026 · gerbang akhir S0.a (S0A-15). Keputusan Q10 (`../KEPUTUSAN-MVP-INTI.md`) menerima saran peninjau kedua untuk keamanan. Peninjau: **Peninjau-2 (dummy)**, diganti nama sungguhan sebelum tinjauan dimulai (KEPUTUSAN §5.2). Penulis kode sudah menguji sendiri; tujuan dokumen ini adalah mata kedua yang **mencoba menembus**, bukan membaca ulang dengan keyakinan penulis.
>
> Cara kerja yang diminta: baca kode di daftar berkas, jalankan tes di bawah, lalu coba setiap klaim dari sudut penyerang. Tulis temuan di bagian akhir (berkas ini boleh diisi langsung). Tanpa Playwright; cukup `curl`, `bun test`, dan membaca kode.

## 1. Ruang lingkup

| Tugas | Isi | Commit | Berkas inti |
|---|---|---|---|
| S0A-05 | Field persetujuan di Better Auth, email+sandi tutup di produksi, linking implisit mati | `ee17e54` | `server/auth.ts`, `server/account/auth-policy.ts` |
| S0A-06 | Hook sign-up: `pending`, klaim undangan, profil, audit | `f95fae3` (+ `f3f8e44` tipe hasil undangan; basis keputusan: `90302ca`) | `server/account/signup-hooks.ts`, `server/account/signup-gate.ts`, `server/account/invitation.query.ts` |
| S0A-07 | Guard menahan akun `pending`/`rejected`/suspend, juga lewat API key | `622bfaa`, `e946024` | `server/guard.ts`, `server/account/status.ts`, `server/account/gate.ts`, `server/api-keys/plugin.ts`, `server/api/app.ts` |
| S0A-08 | Gerbang `/api/auth/*` | `fc9448e` | `server/api/auth-gate.ts`, `server/api/index.ts` |
| S0A-09 | Pecah admin API dan matriks role | `36d31de`, `7462eee` (dasar aturan: `8932bec`) | `server/api/admin*.ts`, `server/access/user.policy.ts`, `server/access/account-status.rules.ts`, `server/permissions.ts` |
| S0A-10 | Setujui/tolak dan undangan | `4d2d933`, `f015c49` | `server/account/approval.service.ts`, `server/api/admin-moderation.ts`, `server/api/admin-invitations.ts`, `server/api-keys/scopes.ts` |

Latar belakang keputusan: `docs/decisions/0001-account-status-on-user.md`. Ancaman dan kontrol yang menjadi acuan: `riset/R12-keamanan-privasi.md` (T06–T10, T16, T17, T21; C-AUTH-1..9, C-INV-1..5, C-KEY-1..2, C-IMP-1) dan rancangan `rencana/P1-s0a-akun-akses.md` §2.1–§2.5.

Melihat perubahan per tugas: `git show <commit>` (daftar di tabel). Melihat keadaan akhir semua berkas inti sekaligus: baca langsung di cabang ini; riwayat per berkas: `git log --oneline -- server/auth.ts server/guard.ts server/api/auth-gate.ts`.

## 2. Cara menjalankan tes yang relevan

Gunakan direktori dan port sendiri supaya tidak menabrak dev server atau Postgres milik orang lain (jangan 5432, 54329, 54330):

```sh
BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
LOCAL_PG_DIR=/tmp/review-pg LOCAL_PG_PORT=54781 \
LOCAL_S3_DIR=/tmp/review-s3 LOCAL_S3_PORT=54782 \
bun test tests/auth-config.test.ts tests/auth-flow.test.ts tests/guard.test.ts \
  tests/account tests/api/auth-gate.test.ts tests/api/admin-gate.test.ts \
  tests/api/admin-approval.test.ts tests/api/invitations.test.ts tests/api/admin.test.ts \
  tests/api-keys/scopes.test.ts tests/db/account-migration.test.ts
```

Bersihkan `/tmp/review-*` sesudahnya. Rahasia hanya di baris perintah.

## 3. Klaim keamanan yang perlu diuji

Setiap baris: klaim → di mana ditegakkan → cara mencoba menembus → tes yang sudah ada.

### 3.1 Pendaftaran dan status akun (S0A-05, S0A-06)

| # | Klaim | Ditegakkan di | Coba tembus dengan | Tes ada |
|---|---|---|---|---|
| K1 | Pengguna tidak bisa mengubah status persetujuannya sendiri | `auth.ts` `additionalFields` `input: false` | `POST /api/auth/update-user` dengan `approvalStatus`, `approvalDecidedBy`, `approvalReason`, `role`; juga lewat `sign-up/email` di dev dengan field itu di body | `tests/auth-config.test.ts` (C-AUTH-6) |
| K2 | Akun baru selalu `pending`, kecuali super-admin env terverifikasi atau undangan aktif dan email terverifikasi | `signup-gate.ts` `decideNewUser` | Email di `SUPER_ADMIN_EMAILS` tetapi `emailVerified=false`; undangan cocok tetapi tidak terverifikasi; huruf besar/spasi di email; email dengan karakter Unicode yang `lower()` PG dan JS menilainya beda | `tests/account/signup-gate.test.ts`, `signup-hooks.test.ts` |
| K3 | Kegagalan apa pun di hook menghasilkan `pending`, bukan `approved` | `signup-hooks.ts` `beforeCreateUser` (catch) | Matikan DB di tengah klaim; lempar galat dari `claimInvitation`; periksa log tidak memuat email | `tests/account/signup-hooks.test.ts` |
| K4 | Satu undangan hanya terpakai sekali, meski dua login serentak | `invitation.query.ts` klaim `UPDATE … RETURNING` | Dua login Google serentak dengan email sama; undangan kedaluwarsa tepat saat klaim; undangan dicabut sesaat sebelum klaim | `tests/account/invitation.test.ts` |
| K5 | Akun Google tidak tergabung diam-diam ke akun lain beremail sama | `auth.ts` `disableImplicitLinking: true` | Akun email+sandi di dev lalu login Google beremail sama | `tests/auth-config.test.ts` (C-AUTH-5) |
| K6 | Sign-up email ditolak di produksi di tiga lapis | `emailPasswordEnabled`, `auth-gate.ts`, `beforeCreateUser` | Path varian: `/API/auth/Sign-Up/Email`, `/sign-up/email/`, `%2e`/`%2f`, `//`, query string, metode `OPTIONS`/`PUT` | `tests/account/auth-policy.test.ts`, `tests/api/auth-gate.test.ts` |
| K7 | Handoff undangan `before → after` di memori tidak bisa dipakai untuk menyambung undangan ke akun lain | `signup-hooks.ts` `parkInvitation`/`takeInvitation` (kunci = email ternormalisasi, TTL 5 menit) | Dua pendaftaran dengan email sama bergantian; pendaftaran gagal di tengah lalu pendaftar lain mengambil entri | `tests/account/signup-hooks.test.ts` |

### 3.2 Penegakan di semua pintu (S0A-07)

| # | Klaim | Ditegakkan di | Coba tembus dengan | Tes ada |
|---|---|---|---|---|
| K8 | Akun `pending`/`rejected`/suspend tidak punya akses API atau halaman | `guard.ts` `resolveActor` mengembalikan `null` untuk akun tertahan; `heldKindOf` | Sesi lama yang dibuat sebelum akun ditolak/diblokir; `GET /api/app/whoami`; rute `/api/*` lain yang memakai `resolveActor` vs yang tidak; loader halaman yang tidak memanggil guard | `tests/guard.test.ts`, `tests/api/app.test.ts`, `tests/app-routes.test.ts` |
| K9 | Status dibaca segar tiap request (tanpa `cookieCache`) | `auth.ts` tidak mengaktifkan `cookieCache` | Setujui/tolak lalu pakai sesi yang sama langsung | `tests/guard.test.ts` |
| K10 | Nilai status yang tidak dikenal atau kosong dianggap `pending` | `status.ts` `heldKindOf` | Baris/sesi tanpa field status; nilai `Approved` (huruf besar), `''`, `null` | `tests/account/status.test.ts` |
| K11 | Kunci API milik akun tertahan ditolak; blokir kedaluwarsa tidak menahan | `api-keys/plugin.ts`, `status.ts` `isBanActive` | Kunci milik akun `pending`; kunci milik akun yang ban-nya baru lewat | `tests/api-keys/api-keys.test.ts` |
| K12 | Tidak ada loop pengalihan antara `/waiting`, `/banned`, `/login`, `/go` | loader `/waiting` dan `/banned` membaca sesi sendiri | Akun banned-kedaluwarsa + pending; sesi hilang | `tests/account/hold-redirects.test.ts` |

### 3.3 Gerbang `/api/auth/*` (S0A-08)

| # | Klaim | Ditegakkan di | Coba tembus dengan | Tes ada |
|---|---|---|---|---|
| K13 | Seluruh `/api/auth/admin/*` menjawab 404 kecuali `impersonate-user` dan `stop-impersonating` | `auth-gate.ts` allowlist + `normalizeAuthPath` | `/api/auth/admin/list-users`, `/ban-user`, `/set-role`, `/create-user`, `/remove-user`, `/set-user-password`, `/list-user-sessions`, `/revoke-user-session`; varian: `%41dmin`, `admin%2flist-users`, `Admin/`, `admin//list-users`, `admin/impersonate-user/../ban-user`, double-encoding `%252f`, metode HTTP lain | `tests/api/auth-gate.test.ts` |
| K14 | `/api/auth/delete-user` ditolak 403 `IMPERSONATING` selama sesi menyamar | `auth-gate.ts` | Sesi menyamar nyata; sesi tanpa `impersonatedBy` tetap boleh | `tests/api/auth-gate.test.ts`, `tests/account/impersonation-session.test.ts` |
| K15 | Urutan hook: gerbang berjalan sebelum rute lain dan `.mount(auth.handler)` hanya meneruskan `/api/auth/*` | `server/api/index.ts` | Path `/api/auth` tanpa slash akhir; `/api/authx`; `/api//auth/...` | `tests/api/auth-gate.test.ts` |

### 3.4 Matriks wewenang dan admin API (S0A-09, S0A-10)

| # | Klaim | Ditegakkan di | Coba tembus dengan | Tes ada |
|---|---|---|---|---|
| K16 | Admin tidak bisa memengaruhi Admin lain, Super-admin, atau dirinya sendiri; hanya Super-admin memberi role `admin`; `super-admin` tidak pernah bisa diberikan | `user.policy.ts` `canActOnUser`, `canSetUserRole`, `canInviteWithRole` | Tabel aktor × target × aksi; `role` berisi `super-admin`, `user`, `ADMIN`, spasi, nilai asing; ubah role sendiri | `tests/api/admin-gate.test.ts`, `tests/api/admin-users.test.ts` |
| K17 | Setiap rute di `adminApi` terjaga walau plugin disarangkan (hook Elysia tidak diwarisi) | `admin-context.ts` + sapuan rute | Tambahkan rute baru tanpa guard dan lihat apakah tes sapuan gagal; panggil tanpa sesi, dengan Member, dengan Admin | `tests/api/admin-gate.test.ts` |
| K18 | Transisi status sah saja: `pending→approved`, `pending→rejected`, `rejected→approved`; `approved→rejected` tidak ada; alasan 3–200 karakter | `account-status.rules.ts`, `approval.service.ts` | Setujui akun yang sudah `approved`; tolak akun `approved`; alasan 2/201 karakter; alasan berisi HTML atau karakter kontrol | `tests/account/approval.service.test.ts`, `tests/api/admin-approval.test.ts` |
| K19 | Dua keputusan serentak untuk satu akun diterima satu kali | `approval.service.ts` `UPDATE … WHERE approval_status = $from AND role IS NOT DISTINCT FROM $role` | Kirim setujui dan tolak bersamaan (dua proses); setujui dengan dua role berbeda | `tests/account/approval.service.test.ts` |
| K20 | Setujui/tolak/ubah role/hapus/undang diblokir selama menyamar | `user.policy.ts` (`IMPERSONATING`), `admin-invitations.ts` | Sesi menyamar nyata memanggil tiap rute | `tests/api/admin-approval.test.ts`, `tests/api/invitations.test.ts` |
| K21 | Undangan: email dinormalisasi dan unik untuk yang aktif; kedaluwarsa dibersihkan; batas aktif; domain dibatasi; role ≤ wewenang pembuat | `invitation.query.ts`, `invitation.admin.query.ts`, `limits.ts` | Email dengan huruf besar/spasi/`+tag`; email Unicode; undangan ganda serentak; melebihi `INVITATION_MAX_ACTIVE`; Admin membuat role `admin` | `tests/account/invitation.test.ts`, `tests/api/invitations.test.ts` |
| K22 | Log audit memuat email dalam bentuk dimasker, bukan email utuh | `approval.service.ts`, `mask-email.ts` | Baca isi `audit_log` setelah setujui/tolak/undang | `tests/account/approval.service.test.ts` |

### 3.5 Kunci API (S0A-10, rantai dari S0A-01)

| # | Klaim | Ditegakkan di | Coba tembus dengan | Tes ada |
|---|---|---|---|---|
| K23 | Kunci API tidak bisa menyetujui, menolak, mengubah role, atau mengelola undangan | `scopes.ts` `requiredScope` → `null` (regex `ACCOUNT_GRANT_ROUTE`), plugin menjawab 403 | Varian path: `/api/admin/users/x/approve/`, `/API/admin/...`, `%2f`, `users//approve`, `users/a/b/reject`, metode apa pun; kunci dengan scope `users:write` dan pemilik Admin/Super-admin | `tests/api-keys/scopes.test.ts` |
| K24 | Kunci tidak pernah melebihi role pemiliknya | `scopes.ts` `roleAllowsScope`, `ROLE_RANK` | Turunkan role pemilik setelah kunci dibuat | `tests/api-keys/scopes.test.ts` |

## 4. Pertanyaan terbuka (butuh keputusan atau penelaahan)

1. **Blokir dan hapus lewat kunci API.** Hanya setujui/tolak/role/undangan yang ditutup untuk kunci (K-7). `ban`, `unban`, dan `DELETE /api/admin/users/:id` tetap `users:write`. Apakah kunci milik Admin yang bocor boleh memblokir atau menghapus orang? Penghapusan terbatas Super-admin oleh kebijakan, tetapi kunci milik Super-admin dengan `users:write` bisa menghapus.
2. **Kepercayaan pada `email_verified` Google.** Klaim undangan bergantung pada `emailVerified` dari Google. `hd` (domain Workspace) tidak diperiksa; domain yang didaur ulang bisa mengklaim undangan lama. Cukupkah `ALLOWED_EMAIL_DOMAINS` + masa berlaku 14 hari?
3. **Jalan pintas dev `emailVerified: true`** untuk sign-up email di non-produksi (K-2 di rencana). Bagaimana bila instans yang terbuka ke internet berjalan dengan `NODE_ENV` bukan `production`? Apakah perlu pengaman tambahan (mis. menolak mode non-produksi bila `BETTER_AUTH_URL` bukan localhost)?
4. **Klaim undangan di luar transaksi INSERT.** Klaim `UPDATE` terjadi di `create.before`; bila INSERT user gagal sesudahnya, undangan tertinggal "terpakai tanpa akun". Dampaknya hanya pada ketersediaan (Admin menyetujui manual), tetapi apakah ada skenario yang bisa dipaksakan penyerang untuk menghabiskan undangan orang lain? (Mereka perlu email yang sama dan terverifikasi.)
5. **Peta handoff di memori proses.** Bekerja selama `before` dan `after` berjalan di proses yang sama. Pada penyebaran multi-instans atau setelah restart di tengah request, `accepted_user_id` dan audit `invitation.use` bisa hilang (login tetap sukses). Diterima?
6. **Pendaftaran tanpa batas laju khusus.** Siapa pun dengan akun Google bisa membuat baris `pending`. Rate limit umum `/api/auth/*` berlaku, tetapi tidak ada batas jumlah akun `pending` atau pembersihan akun `rejected`/`pending` lama. Apakah antrean bisa dipakai untuk membanjiri Admin atau memenuhi basis data?
7. **Siapa boleh menyamar.** `impersonate-user` dan `stop-impersonating` diteruskan ke Better Auth. Pastikan hanya peran yang diizinkan plugin admin (dan bukan Admin biasa) yang lolos, dan target Super-admin tidak bisa disamarkan. Cek `ac`/`roles` di `server/auth.ts` dan jalankan percobaan nyata.
8. **Sesi lama setelah penolakan.** Menolak akun `pending` tidak mencabut sesinya (sesi itu sudah tertahan oleh guard). Apakah sebaiknya sesi dicabut juga supaya tidak ada jalur lain (mis. rute yang membaca sesi Better Auth langsung tanpa `resolveActor`)? Periksa semua pemanggil `auth.api.getSession` di luar `guard.ts`.
9. **Cakupan `requiredScope` untuk rute baru.** Rute di luar daftar menjawab `null` (ditolak) — bagus — tetapi regex `ACCOUNT_GRANT_ROUTE` sengaja longgar. Adakah rute admin lain, kini atau di S0.b, yang menaikkan hak akun tetapi tidak cocok pola itu?
10. **Pesan galat dan enumerasi akun.** Apakah ada respons yang membedakan "email terdaftar" dari "tidak terdaftar" (undangan 409, setujui 404 vs 403) bagi Admin yang berniat buruk? Admin memang berwenang, tetapi periksa jalur yang terbuka untuk non-Admin.

## 5. Yang tidak termasuk ruang lingkup

Fitur proyek dan tugas (S0.b ke atas), akses data lintas proyek (IDOR) dan lampiran, retensi/PII saat akun dihapus, serta pengerasan infrastruktur (TLS, header proxy). Semuanya ditinjau terpisah.

## 6. Lembar temuan (diisi peninjau)

| # | Klaim (K#) / pertanyaan (Q#) | Temuan | Tingkat (Kritis/Tinggi/Sedang/Rendah/Info) | Bukti (perintah / berkas:baris) | Usulan perbaikan |
|---|---|---|---|---|---|
| | | | | | |

| Butir | Isi |
|---|---|
| Peninjau dan tanggal | |
| Commit yang ditinjau | |
| Kesimpulan | ☐ Tidak ada temuan yang menghalangi merge ☐ Ada temuan yang harus diperbaiki sebelum M1 |
