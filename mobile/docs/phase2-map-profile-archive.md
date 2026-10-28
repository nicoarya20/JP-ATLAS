# Fase 2 — Peta layar ↔ endpoint: Profil, Pengaturan, My calendar, Arsip (Sampah), Users

Rujukan W3. Dokumen analisis, **bukan implementasi** (2026-10-28, `feature/mobile-api-wiring` @ `fc0ab4e`).
Aturan lintas modul (galat seragam, K5, rate limit, `href` web) ada di kepala
`phase2-map-home-inbox-team.md` dan tidak diulang.

- **Sumber yang diverifikasi:** `server/api/app-{profile,profile.notifications,profile.delete-check,trash,whoami}.ts`,
  rute `/avatar` di `server/api/app.ts`, `server/profile/profile.service.ts` (`ProfileView`),
  `server/trash/*`, `server/access/trash.policy.ts`, `server/api/app-events.ts` +
  `server/event/events.{dto,range}.ts` (untuk My calendar), `server/api/admin{,-moderation}.ts`
  (Users), dan `mobile/src/data/{profile,profile.store,settings,archive,archive.store,users}.ts` +
  `mobile/src/screens/{profile,settings,archive}/*`.
- **Acuan lama:** §1.6–1.8 `git show 2a985b7^:mobile/docs/phase2-map-home-inbox-team.md`. Yang berubah
  sejak itu: **hapus permanen dari Sampah kini ada** (`DELETE /api/app/trash/:kind/:id`, S6 Z-04)
  sehingga A-24 lama tertutup; **`GET /events?from=&to=`** kini ada sehingga My calendar bisa meminta
  rentang; `whoami.caps` ada; cuti hilang dari `/app` (hanya `/api/admin/users/:id/leave`).

---

## 0. Endpoint modul ini

| Endpoint | Berkas | Balasan / catatan |
|---|---|---|
| `GET /api/app/profile` | `app-profile.ts` | `ProfileView { userId, name, email, displayName, nickname, phone, jobTitle, department, textSize }` |
| `PATCH /api/app/profile` | `app-profile.ts` | Body parsial: `displayName, nickname, phone, jobTitle, department` (string\|null; kosong = hapus) + `textSize`. Balasan `ProfileView`. Telepon salah format → **422 `VALIDATION`** (pesan `PHONE_FORMAT_ERROR`) |
| `GET /api/app/profile/notifications` | `app-profile.notifications.ts` | `{ eventReminder, inboxNews }` |
| `PUT /api/app/profile/notifications` | sama | Body parsial dua boolean; kartu lajur `action` tidak bisa dibisukan |
| `GET /api/app/profile/delete-check` | `app-profile.delete-check.ts` | `{ canDelete, projects, total }`; saat menyamar → `IMPERSONATING` |
| `POST /api/app/avatar` | `app.ts` | multipart `file` (PNG/JPEG/WEBP/GIF ≤ 2 MB, dicek dari magic bytes) → `{ image }`; galat 400 `FILE_REQUIRED`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_TYPE`, 503 `STORAGE_DISABLED` |
| `DELETE /api/app/avatar` | `app.ts` | `{ image: null }` |
| `GET /api/app/whoami` | `app-whoami.ts` | `role` + `caps` (baris peran di profil) |
| `GET /api/app/inbox/count` | `app-inbox.ts` | `action` (baris Inbox di profil) |
| `GET /api/app/events?from&to&cursor&limit` | `app-events.ts` | `{ items: EventListItem[], nextCursor, caps }`; rentang **inklusif**, ≤ **92 hari**, `YYYY-MM-DD` zona tim; salah → 422 `VALIDATION` (pesan Indonesia) |
| `GET /api/app/trash?kind&page&limit` | `app-trash.ts` | `{ items: TrashItem[], total, page, limit, counts }` |
| `POST /api/app/trash/{project\|task\|event}/:id/restore` | `app-trash.ts` | `{ id, tasks }` / `{ id, number }` / `{ id }`; diaudit; sesi saja (`PM_KEY_DENY`) |
| `DELETE /api/app/trash/:kind/:id` | `app-trash.ts` | `{ kind, id, purged: { projects, tasks, events } }`; Admin/Super-admin; diaudit; sesi saja; `kind` salah → 422 |
| `GET /api/admin/users?approval=pending…` | `admin.ts` | Di luar `/api/app` (gerbang `adminContext`) |
| `POST /api/admin/users/:id/{approve,reject}` · `PUT /api/admin/users/:id/role` | `admin-moderation.ts`, `admin.ts` | Body `approve {role?}`, `reject {reason?}` |

---

## 1. Profil (modal `profile/index`)

Layar `app/profile/index.tsx` → `screens/profile/{profile.screen,profile-hero,profile-note}.tsx`;
titik tukar `getProfile(role, decided)` (`data/profile.ts`), state lokal `profile.store.ts`
(`ProfileState { note, online, muted }`).

### 1a. Layar/aksi → endpoint

| Bagian | Endpoint |
|---|---|
| Hero (nama, jabatan · divisi, foto) | `GET /profile` + `whoami.role` |
| Baris "My calendar" | Buka §3 |
| Baris "Inbox" + angka | `GET /inbox/count` → `action` |
| Switch "Mute notifications" | `PUT /profile/notifications` (lihat GAP P-3) |
| Baris "Settings" | Buka §2 |
| Catatan status (`note`) + presence (`online`) | **Tidak ada endpoint** (GAP P-1, P-2) |
| Sign out (T2) | Sudah tersambung W1-B (`signOutEverywhere`) |

### 1b. Pemetaan bidang

| Mobile (`ProfileData`, `PersonInfo`) | Server | Status |
|---|---|---|
| `me.key` | `userId` | ✓ |
| `me.full` | `displayName ?? name` | ✓ |
| `me.name` (sapaan) | `nickname` (aturan jatuh-balik `profile.greeting.ts` tidak dikirim) | Port aturan atau minta server (H-0 di peta Beranda) |
| `me.title`, `me.division`, `me.email` | `jobTitle`, `department`, `email` | ✓ (`null` → sembunyikan potongan, jangan tulis "null") |
| `me.role` (label) | `whoami.role` | Label Inggris disusun klien |
| `line` `'<title> · <division>' + ' · Admin'` | `jobTitle`, `department`, `whoami.role` | Disusun klien |
| foto / inisial | `whoami`/`get-session` `user.image` (ProfileView **tidak** memuat `image`) | Ambil dari sesi Better Auth; perbarui setelah unggah |
| `inbox` (`respondCards().length`) | `inbox/count.action` | ✓ |
| `ProfileState.note` (≤ 60) | — | **GAP P-1** |
| `ProfileState.online` | — | **GAP P-2** |
| `ProfileState.muted` (satu switch) | `{ eventReminder, inboxNews }` (dua switch) | **GAP P-3** |

### 1c. Kalimat server

Tidak ada di layar ini selain pesan galat.

### 1d. Aksi tulis

| Aksi | Endpoint | Pengaman |
|---|---|---|
| Sign out | Better Auth | **T2** (sudah: `SignOutDialog`) |
| Mute (bila dipertahankan) | `PUT /profile/notifications` | Tidak perlu; optimistis + kembalikan bila gagal |

---

## 2. Pengaturan + Edit profile

Layar `app/(tabs)/more/settings/{index,profile}.tsx` → `screens/settings/{settings.screen,team-settings,profile-edit.screen}.tsx`;
titik tukar `getSettings(role)`, `getProfileEdit(role)` (`data/settings.ts`).

### 2a. Layar/aksi → endpoint

| Bagian | Endpoint |
|---|---|
| Baris akun (`line`) | `GET /profile` + `whoami.role` |
| Switch "Event reminders" | `GET/PUT /profile/notifications` → `eventReminder` |
| Switch "Inbox updates" | sama → `inboxNews` |
| Grup "Team settings (Admin only)": AI features, Recording retention, Default event reminder, Roles and permissions | **Tidak ada di `/api/app`** (GAP S-1) |
| Edit profile: muat | `GET /profile` |
| Edit profile: simpan | `PATCH /profile` |
| Change photo | `POST /avatar` (multipart) / `DELETE /avatar` |

### 2b. Pemetaan bidang Edit profile

| Bidang form | Server | Status |
|---|---|---|
| Full name | `displayName` | ✓ (kosong → `null`, server jatuh ke `name`); validasi klien "Enter your full name." tetap |
| Nickname (for greetings) | `nickname` | ✓ |
| Job title | `jobTitle` | ✓ |
| Division | `department` | ✓ |
| Role (read-only) | `whoami.role` | ✓ (server mengabaikan `role` di body) |
| Email (read-only) | `email` | ✓ |
| — | `phone` | **GAP P-4**: ada di server, tak ada di form |
| — | `textSize` | Sengaja tidak dipakai (keputusan wireframe: tanpa pengaturan ukuran huruf) |
| Batas panjang | `PROFILE_*_MAX` di `server/profile/profile.rules.ts` | Samakan `maxLength` di form |
| Grup "Team settings" tampil bila `role === 'admin'` | `whoami.caps.dashboard` | Pakai caps, bukan role |

### 2c. Kalimat server

Pesan galat simpan (`PHONE_FORMAT_ERROR`, galat validasi) dan galat avatar ("Ukuran foto maksimal 2 MB…",
"Format foto harus PNG, JPEG, WEBP, atau GIF.", "Penyimpanan file belum aktif. Hubungi admin.") tampil apa adanya.

### 2d. Aksi tulis

| Aksi | Endpoint | Pengaman |
|---|---|---|
| Simpan profil | `PATCH /profile` | Tidak perlu; loading di tombol Save, notice sukses/gagal |
| Switch notifikasi | `PUT /profile/notifications` | Tidak perlu; optimistis + rollback |
| Ganti foto | `POST /avatar` | Tidak perlu; butuh pemilih gambar (GAP P-5) |
| Hapus foto | `DELETE /avatar` | **T2** ("Remove your photo?") — tidak masuk Sampah |
| Hapus akun | Better Auth `/delete-user` + `GET /profile/delete-check` | Hanya Super-admin; **tidak ada di mobile** — biarkan di web |

---

## 3. My calendar (modal `profile/calendar`)

Layar `app/profile/calendar.tsx` → `screens/profile/{calendar.screen,week-strip,day-grid}.tsx`;
titik tukar `getMyCalendar(role, day, events)` + `weekDays` (`data/profile.ts`),
`profile.calendar.dates.ts` (`eventsFor`, `itemsOn`, `weekOf`), `profile.calendar.swipe.ts`.

### 3a. Layar/aksi → endpoint

| Bagian | Endpoint |
|---|---|
| Strip pekan (titik "marked") + grid satu hari | `GET /api/app/events?from=<Minggu>&to=<Sabtu>&limit=100` — satu panggilan per pekan, ikuti `nextCursor` bila ada |
| Geser pekan | Panggilan baru untuk pekan itu (cache per pekan) |
| Garis "sekarang", "today" | Jam server (W2), bukan `NOW_MIN` |
| Ketuk blok | Detail event (`/events/:id`, peta Events) |

Server tidak mengenal "my events": daftar berisi semua event yang **boleh dilihat** pemanggil.
"Kalender saya" = saring klien `participants.isParticipant` (atau pembuat). Ini menggantikan
`eventsFor(events, me(role).name)` yang mencocokkan nama (lihat GAP C-1).

### 3b. Pemetaan bidang (`CalendarBlock` ← `EventListItem`)

| Mobile | Server | Status |
|---|---|---|
| `id`, `title` | `id`, `title` | ✓ |
| `start`, `end` (menit dalam hari) | `startsAt`, `endsAt` (instan ISO) → menit di **zona tim** | Event lintas hari dipotong di batas hari |
| `meta` "2:00–3:00 PM · In person · Meeting Room 2" | `startsAt/endsAt` + `locationType` (`offline\|online`) + `locationText` | ✓ (lokasi kini ada di daftar) |
| `tone` dari `type` (`Meeting`…) | `kind` `meeting\|review\|important\|team\|other` | Petakan enum, bukan label |
| `href` | `id` → rute Expo event | ✓ |
| — | `canceledAt` | Event batal masih terkirim → tampilkan tercoret/redup, jangan hilang |
| `marked` per hari | Turunan dari item pekan | ✓ |
| Pengulangan (`occursOn`, "every N weeks") | Tidak ada di server (`recurrence` = 422 "Could") | **GAP C-2** |

### 3c. Kalimat server

Hanya pesan galat rentang (Indonesia) — mestinya tak pernah muncul bila klien selalu mengirim 7 hari.

### 3d. Aksi tulis

Tidak ada.

---

## 4. Arsip → Sampah

Layar `app/(tabs)/more/archive/{index,[key]/delete}.tsx` → `screens/archive/{archive.screen,archive-card,delete.screen}.tsx`;
titik tukar `getArchive(role, entries, filter)`, `getArchiveDelete(key)`, `deleteForever(key)` (`data/archive.ts`),
entri lokal `archive.store.ts` (diisi modul lain saat "archive").

**Beda konsep (harus disepakati):** "Archive" mobile = disimpan sampai dipulihkan. Server = **Sampah 30 hari**
(`restorableUntil`, `daysLeft`; penyapuan otomatis `trash.purge.ts`). Hapus permanen manual kini ada.

### 4a. Layar/aksi → endpoint

| Layar/aksi | Endpoint |
|---|---|
| Daftar + chip jenis | `GET /trash?kind=all\|project\|task\|event&page&limit` |
| Angka chip "All 5", "Projects 2" | `counts` (tidak ikut filter) + jumlahnya untuk All |
| "5 items" | `total` (ikut filter) |
| Load more | `page` + `limit` (default 25, maks 100) |
| Restore | `POST /trash/{kind}/:id/restore` |
| Delete forever (sheet) | `DELETE /trash/:kind/:id` |

### 4b. Pemetaan bidang (`ArchiveCard` ← `TrashItem`)

| Mobile | Server | Status |
|---|---|---|
| `key` `'task-12'` (param rute `[key]`) | `kind` + `id` (uuid) | Param rute jadi `kind` + `id` |
| `kind` `PROJECT\|TASK\|EVENT` | `kind` `project\|task\|event` | ✓ |
| `title` | proyek `name`; tugas `#number title`; event `title` | ✓ |
| `meta` "<where> · Archived by <by> · Oct 6" | tugas `project.name`; event `project?.name` / "No project"; `deletedBy?.name` (null = akun hilang); `deletedAt` (instan) | Format tanggal di zona tim |
| `includes` "8 tasks and 2 events" | proyek `cascade { tasks, events }` | ✓ |
| `canDelete = role === 'admin'` | `item.can.purge` (`true`/`IMPERSONATING`; kunci absen untuk non-Admin) | Per item, bukan per role |
| Restore selalu aktif | `item.can.restore`: `true`, kode (`EXPIRED`, `PROJECT_IN_TRASH`, `IMPERSONATING`) = tampil disabled + alasan, absen = sembunyikan | ✓ |
| — | `daysLeft`, `restorableUntil` | **Wajib tampil** ("Deleted for good in 12 days") |
| — | tugas/event `blockedBy {projectId,name,visible}`, `projectInTrash` | "Restore the project first" + tautan bila `visible` |
| — | event `eventKind`, `startsAt` | Opsional di `meta` |
| `getArchiveDelete().message` | Disusun klien dari `kind`, `title`, `cascade` | ✓ |

### 4c. Kalimat server

Pesan galat restore/purge (`PROJECT_IN_TRASH`, `EXPIRED`, `NOT_IN_TRASH`, `NOT_FOUND`) (Indonesia). Alasan tombol disabled hanya berupa kode
(`EXPIRED`, `PROJECT_IN_TRASH`, `IMPERSONATING`) → katalog mobile (GAP E-6 peta Events). Ringkasan audit (Indonesia) tidak dikirim ke klien.

### 4d. Aksi tulis

| Aksi | Endpoint | Pengaman |
|---|---|---|
| Restore | `POST /trash/{kind}/:id/restore` | Tidak perlu (membatalkan hapus); loading per kartu, notice sukses; proyek → "Restored with N tasks" |
| Delete forever | `DELETE /trash/:kind/:id` | **T3** (sheet + ketik nama; `TypeToConfirm` sudah ada) — sebut `cascade` untuk proyek |

Setelah tulis: `invalidate` Sampah + modul asal (Projects/Tasks/Events/Home). `addEntry`/`removeEntry`
lokal di `archive.store.ts` dan `forgetArchived*` di store modul lain **dihapus**: Sampah dibaca dari server.

---

## 5. Users (Admin) — di luar `/api/app`

Layar `app/(tabs)/more/users.tsx`; titik tukar `decide`, `getApproval`, `getRoles`, `waitingUsers` (`data/users.ts`).
Endpoint `/api/admin/*` (gerbang `adminContext`, sesi Admin). Tile More dan badge membaca `whoami.caps.dashboard`.

| Aksi | Endpoint | Pengaman |
|---|---|---|
| Tab Approval | `GET /api/admin/users?approval=pending` | — |
| Approve (+ role) | `POST /api/admin/users/:id/approve {role}` | **T2** |
| Reject (+ alasan) | `POST /api/admin/users/:id/reject {reason}` | **T2** |
| Tab Roles / ubah role | `GET /api/admin/users?approval=approved` · `POST /api/admin/users/:id/role {role}` (bukan `PUT`; diperiksa W3) | **T2** |

Bentuk balasan `/api/admin/users` **belum dipetakan rinci** di sini (GAP U-1). `waitingUsers` yang dipakai
More/Inbox/Beranda diganti hitungan kartu `user_pending` di Inbox (H-5 di peta Beranda).


### 5a. Bentuk balasan (GAP U-1, dipetakan W3 28 Okt dari `server/api/admin-users*.ts`, `server/access/user.policy.ts`)

| Rute | Balasan / badan | Catatan |
|---|---|---|
| `GET /api/admin/users?page&limit&search&role&status&approval&days&sort` | `{ users: [{ id, name, email, emailVerified, image, role, banned, banReason, banExpires, approvalStatus, approvalReason, createdAt, lastLoginAt, loginCount, activeSessions, providers }], total, page, limit }` | Halaman bawaan 25, maks 100. Mobile: Approval `approval=pending&sort=oldest`, Roles `approval=approved&sort=name`; `search` dikirim setelah ketikan jeda 300 ms. Tanpa `can{}` per baris (GAP U-4) |
| `GET /api/admin/users/stats` | `{ total, admins, superAdmins, banned, pending, verified, new7d, active24h }` | Tanpa approved/rejected (GAP U-2). `pending` = badge tile Users |
| `POST /users/:id/approve {role?}` | `{ ok, user }` | T2 |
| `POST /users/:id/reject {reason?}` | `{ ok }` | T2; mobile mewajibkan alasan (dikirim ter-trim) |
| `POST /users/:id/role {role}` | `{ ok }` | T2; Admin hanya memberi `member`/`project_manager`, Super-admin juga `admin` |
| `POST /users/:id/ban {reason?, expiresIn?}` | `{ ok, revokedSessions }` | T2 "Deactivate"; mobile mengirim `{}` (permanen) |
| `POST /users/:id/unban` | `{ ok }` | T2 "Reactivate" |
| `DELETE /users/:id` | — | Khusus Super-admin (`NOT_APP_ROLE`); **tidak ditawarkan** di ponsel |

Tolakan kebijakan: `TARGET_PROTECTED` (Super-admin, atau Admin bila pemanggil bukan Super-admin),
`SELF_TARGET`, `IMPERSONATING`, peran di luar yang boleh diberikan. Semua `{ error, code }` berbahasa
Indonesia; mobile menampilkannya apa adanya di dialog T2 (`src/screens/users/users.confirm.tsx` `serverSaid`).
Implementasi: `src/data/users.admin.{wire,api,view,write}.ts` (kepala berkas menjelaskan kenapa `/api/admin`).

---

## 6. Usulan pembagian 2 worker (berkas disjoint)

| Worker | Berkas milik | Isi |
|---|---|---|
| **A — Profil + Pengaturan + Users** | `data/profile.ts` (bagian `getProfile`), `profile.store.ts`, `data/settings.ts`, `data/users.ts`, `data/sample/users.ts`, `screens/profile/{profile.screen,profile-hero,profile-note,profile.tiles,profile.strings}.tsx`, `screens/settings/**`, `app/(tabs)/more/users.tsx`, `screens/users/**` (bila ada), tes terkait | `GET/PATCH /profile`, notifikasi, avatar, Users admin |
| **B — My calendar + Sampah** | `data/profile.calendar.*.ts`, `data/archive*.ts`, `screens/profile/{calendar.screen,week-strip,day-grid,day-grid.slop}.tsx`, `screens/archive/**`, `app/(tabs)/more/archive/**`, `app/profile/calendar.tsx`, tes terkait | Rentang pekan dari `/events`, Sampah + restore + purge |

`getMyCalendar`/`weekDays` saat ini tinggal di `data/profile.ts` milik A. Usul: B **memindahkan** keduanya ke
`data/profile.calendar.ts` di langkah pertama, A hanya menghapus re-export. Hapus `forgetArchived*` di
`events.store.ts`/`projects.store.ts`/`tasks.store.ts` dilakukan pemilik modul itu (peta lain), bukan B.

## 7. GAP

| # | Layar | Masalah | Usulan | Butuh keputusan |
|---|---|---|---|---|
| P-1 | Profil | Catatan status (`note`) tak ada di server | Hilangkan, atau server tambah kolom + bidang `ProfileView`/`ProfileBody` | **User/Nico** |
| P-2 | Profil | Presence (`online`) tak ada | Hilangkan; jangan klaim dilihat rekan | **User/Nico** |
| P-3 | Profil | Satu switch Mute vs dua switch server | Hapus switch Mute di profil; dua switch di Settings sudah cocok | **User** |
| P-4 | Edit profile | `phone` ada di server, tak ada di form | Tambah bidang Phone (`inputMode="tel"`) | User |
| P-5 | Edit profile | Unggah foto butuh pemilih gambar; mobile belum punya `expo-image-picker` | Tambah dependensi (Rule 10) atau tunda | **User** |
| P-6 | Profil | `ProfileView` tak memuat `image` | Pakai `user.image` sesi; atau server menambah | — |
| S-1 | Settings (Admin) | AI features, retensi rekaman, default reminder, Roles and permissions tak ada di `/api/app` | Sembunyikan grup Team settings di Fase 2 (fitur AI/rekaman belum ada) | **User** |
| C-1 | My calendar | "Kalender saya" tidak ada di server | Saring `participants.isParticipant` di klien | — |
| C-2 | My calendar | Pengulangan event tak ada di server | Hapus logika `occursOn` berulang; tampilkan event tunggal saja | — |
| A-1 | Arsip | Nama "Archive" vs Sampah 30 hari | Ganti copy ke "Trash" + tampilkan `daysLeft`, atau pertahankan nama tapi wajib sebut batas 30 hari | **User** |
| U-1 | Users | Bentuk `/api/admin/users` belum dipetakan | **Dipetakan** §5a (W3, 28 Okt) | — |
| U-2 | Users | `/users/stats` tak membawa jumlah approved/rejected | Chip dua itu dihapus; tersisa Pending + Deactivated | Server bila chip-nya diinginkan |
| U-3 | Users | Daftar admin tak membawa jabatan/divisi pendaftar | Kartu tanpa jabatan/divisi | — |
| U-4 | Users | Daftar admin tak mengirim `can{}` per baris | Klien mencerminkan `user.policy.ts`; server tetap memutuskan, 403 ditampilkan apa adanya | Server bila ingin satu sumber |

## 8. Status W3 (28 Okt 2026)

| § | Status | Berkas |
|---|---|---|
| 1 Profil | **disambung**: hero dari `GET /profile` + whoami + foto sesi; Inbox dari `/inbox/count`. P-1/P-2 disembunyikan, P-3 diganti (switch Mute dicabut, dua switch di Settings) | `src/data/profile{,.api,.write}.ts`, `src/screens/profile/*` |
| 2 Pengaturan + Edit profile | **disambung**: dua switch `GET/PUT /profile/notifications`, Edit profile `PATCH /profile` (tanpa foto, P-5 ditunda; P-4 Phone belum dipakai). S-1 disembunyikan | `src/screens/settings/*` |
| 3 My calendar | **disambung**: satu jendela `GET /events?from=<Minggu>&to=<Sabtu>` per pekan (cache jendela Events, 8 jendela dibagi dengan tab Events); C-1 `isParticipant`, C-2 dihapus, garis "now" disembunyikan, acara batal tampil dicoret | `src/data/profile.calendar{,.dates}.ts`, `src/screens/profile/{calendar.screen,day-grid,week-strip}.tsx` |
| 4 Sampah | **disambung**: daftar + filter jenis + Load more, sisa hari, pulihkan, Hapus permanen T3 (hanya `can.purge === true`). A-1: nama "Trash"; rute tetap `/more/archive` | `src/data/trash.*.ts`, `src/screens/trash/*` |
| 5 Users | **disambung** ke `/api/admin/users*`: Approval/Roles, setujui/tolak/ubah peran/nonaktifkan/aktifkan (semua T2), tile + badge dari `caps.dashboard` + `/users/stats`. Hapus akun disembunyikan | `src/data/users.admin.*.ts`, `src/screens/users/*` |
