# P9 — Rencana Pengaturan lanjutan (S6: G2, A7, A8 + rapikan kartu "Lanjutan")

> 18 Okt 2026 · tahap rencana · BELUM ada kode. Yang mengikat: `../KEPUTUSAN-MVP-INTI.md`. Sumber: R08 §3.4/§6, R10 §3.1/§3.3, R01, R12, R11, kode nyata di worktree (path:baris di §2). Fondasi kode menang atas desain/riset. Konvensi tugas, DoD umum, UI-DoD, glosarium: sama dengan `P3-s1-s2-proyek-tugas.md` §1 "Konvensi tugas" (tidak diulang; dirujuk sebagai **K-P3**). Prefiks ID: **G**.

## 1. Ringkasan
- **9 tugas** (G-01..G-09), total ≈ **9,5 hari-orang AI** + reviewer ≈ 2-3 hari. R08 menghitung "prefs + hapus akun" 1-2 hari; angka di sini lebih besar karena memuat pra-cek, hook server-side, halaman `/dashboard/settings`, QA tiga ukuran teks, dan merapikan Lanjutan.
- Tiga butir roadmap: **G2** (2 saklar Pemberitahuan, S), **A7** (hapus akun + pra-cek pengelola tunggal, S, T3), **A8** (pengingat acara bawaan tim, C). Ditambah rapikan: kartu Lanjutan (sesi, riwayat login, kunci API), tema/ukuran teks yang sudah jalan.
- **Urutan terbaik**: G-01 (rapikan) dan G-02 (pra-cek hapus akun, backend) bisa mulai **segera setelah gerbang S2**, tanpa menunggu menu lain. G-03/G-04 (hapus akun UI + hook server) menyusul. **G2 dan A8 hanya bisa selesai setelah Inbox (S3a, tabel notifikasi) dan Events (S4)** ada; sebelum itu hanya bisa dibangun "tidur" (data tersimpan, belum berefek). Lihat §3 dan §6 peta.
- **Batas wilayah**: `/app/settings` = semua yang menyangkut **diri sendiri** (profil, tampilan, pemberitahuan, keamanan, hapus akun). `/dashboard/*` = **tim/lembaga** (pengguna, pengaturan tim). Kartu Pengaturan tim di `/app/settings` hanya **tautan** untuk Admin (R08 §3.4).
- **Tiga kontradiksi dengan keputusan lama** (§9): KB-P9-1 hapus akun hanya Super-admin di kode vs A7 untuk semua; KB-P9-2 `/dashboard/settings` belum ada rutenya; KB-P9-3 `text_size` R08 vs kode.
- Pertanyaan terpenting (§10): siapa boleh hapus akun sendiri; nilai bawaan pengingat acara; apakah saklar G2 dibangun "tidur" sebelum Inbox ada.

## 2. Keadaan sekarang (kode nyata)
| Hal | Fakta | Sumber |
|---|---|---|
| Halaman Pengaturan | Sudah ada: Akun (`AccountCard`), Tampilan (`AppearanceCard`), tombol Keluar, akordeon Lanjutan | `app/routes/app/settings.tsx:46-85` |
| Loader & izin | `requireUser` pertama; bendera `emailAuthEnabled`, `googleEnabled`, `canDeleteAccount` dihitung server | `settings.tsx:31-44` |
| Hapus akun | **Super-admin saja**, tidak saat impersonasi: `canAccessDev(role) && !impersonatedBy`; kartu `DangerZoneCard` | `settings.tsx:41`, `AdvancedSettings.tsx:96`, `app/components/profile/DangerZoneCard.tsx:71-100` |
| Alur T3 yang ada | Ketik email (+ sandi bila ada akun sandi) → `authClient.deleteUser` → `/login`. Tanpa pra-cek apa pun | `DangerZoneCard.tsx:20-60` |
| Jalur server hapus | Better Auth `deleteUser: { enabled: true }`; gerbang jalur `/delete-user` memeriksa impersonasi | `server/auth.ts:152`, `server/api/auth-gate.ts:15,63-72` |
| Hook setelah hapus | hanya `deleteAvatarObject`; tidak ada hook **sebelum** hapus | `server/auth.ts:75-77` |
| Pengelola proyek | `project.lead_id` nullable, `ON DELETE SET NULL` (proyek tidak pernah ikut terhapus); peran anggota `manager|member|viewer` | `server/db/schema.project.ts:31-32,69`; `server/pm/enums.ts:13` |
| Ukuran teks | Sudah jadi: `TEXT_SIZES = normal|besar|sangat_besar`, cookie `mk-text-size`, `patchMyProfile` | `server/pm/enums.ts:35`; `AppearanceCard.tsx:1-20`; `server/api/app-profile.ts:1-30` |
| Lanjutan | Akordeon tertutup; isi: Sandi + Akun tertaut (bila `emailAuthEnabled`), `SessionsCard`, `LoginHistoryCard`, `ApiKeysCard`, `DangerZoneCard` bila diizinkan | `app/components/account/AdvancedSettings.tsx:34-99` |
| Pengaturan tim | **Belum ada.** `/dashboard` hanya `dashboard` dan `dashboard/users`; NAV admin tidak punya pengaturan | `app/routes.ts:35-36`; `app/routes/admin/layout.tsx:18-23` |
| Penyimpanan pengaturan global | Singleton `app_setting` (`readSettingsRow`/`upsertSettingsRow`, cache + invalidasi); pola modul `settings-*.ts` | `server/settings.core.ts:10-32`; `server/settings-features.ts` |
| Scope API key | `PATCH profile` dan `* avatar` sudah ditolak untuk key (`PM_KEY_DENY`) | `server/api-keys/scopes.pm.ts:11-12,33-34` |
| Migrasi terakhir | `0016_task_core.sql`; **0017 dicadangkan untuk S3a notifikasi** (R10 §3.3 L4) | `server/db/migrations/` |
| Tes yang menjaga | `tests/ui/settings-page.test.tsx` (hanya Super-admin boleh hapus akun) — akan berubah di G-03 | `tests/ui/settings-page.test.tsx:2,79-98` |

**Belum ada (ASUMSI, diverifikasi saat tugas dimulai):** tabel `notification_preferences` (rancangan Inbox, R08 §3.4/R07), tabel event dan penjadwal pengingat, `profiles`-style kolom pengaturan tim.

## 3. Lingkup & non-lingkup
| Butir | R10 | Masuk P9? | Catatan |
|---|---|---|---|
| G2 Pemberitahuan: 2 saklar (`event_reminder`, `inbox_news`) | S/Should (S6) | **Ya**, bergantung Inbox/Events | Kartu "Perlu Anda tanggapi" tetap tidak bisa dimatikan (R08 §3.4) |
| A7 Hapus akun + pra-cek pengelola tunggal | S (S6) | **Ya** | T3; diblok bila pengguna pengelola tunggal proyek aktif |
| A8 Pengingat acara bawaan tim (1 kolom) | C/Could (S6) | **Ya, paling akhir, boleh digeser** | Bergantung Events (form event membaca bawaan) |
| Rapikan kartu Lanjutan (sesi, riwayat, kunci API) | – | **Ya** | Susunan, label awam, tanpa mengubah perilaku |
| Tema/ukuran teks yang ada | – | **Hanya regresi + QA** | Tidak ditulis ulang; tes tiga ukuran tetap hijau |
| Ketersediaan/Cuti, Mode Pendamping, Peran dan izin (baca), AI & Data, Lama simpan rekaman | Won't | **Tidak** | R08 §3.4 "Ditunda" |
| Saklar Fitur AI di pengaturan tim | Won't | **Tidak** | Stub tanpa efek dilarang (aturan 17); `X1-Q7`: kolom `ai_enabled` dibuat bersama fitur AI |
| Email/push untuk pemberitahuan | Won't | **Tidak** | Saklar G2 hanya mengendalikan Inbox; kunci tabel dibiarkan terbuka untuk kanal nanti |
| Hapus akun oleh Admin untuk orang lain | – | **Tidak** (sudah di `/dashboard/users`) | Pra-cek G-02 dibuat sebagai fungsi bersama supaya jalur itu bisa memakainya (§10 P-3) |

## 4. Layar & perilaku
**Rute tetap `app/settings`** (`app/routes.ts:31`), satu halaman, urutan kartu:
| Urut | Kartu | Perilaku | Mobile / ukuran teks |
|---|---|---|---|
| 1 | Akun saya | Sudah ada | – |
| 2 | Tampilan | Sudah ada (tiga tombol besar + contoh) | Tidak diubah |
| 3 | **Pemberitahuan** (baru, G-05) | Dua `Switch` besar: "Ingatkan saya sebelum acara" dan "Tampilkan kabar terbaru di Kotak masuk". Perubahan tersimpan **langsung per saklar** (optimistik, `loading` pada saklar, gagal → kembali + `notify`). Teks kecil: "Tugas yang perlu Anda tanggapi selalu tampil." | Satu kolom; label di atas saklar; target 44 px dari tema |
| 4 | **Pengaturan tim** (baru, G-07; hanya Admin/super-admin, ditentukan `flags.canManageTeam` dari server) | Kartu tautan "Atur pengingat acara untuk tim" → `/dashboard/settings` | `Button` penuh lebar < `sm` |
| 5 | Keluar | Tombol + konfirmasi (sudah ada) | – |
| 6 | **Keamanan dan perangkat** (akordeon "Lanjutan" diganti nama, G-01) | Isi berurutan: Sandi + Akun tertaut (bila `emailAuthEnabled`), **Perangkat yang sedang masuk** (sesi; tombol "Keluarkan perangkat ini"), Riwayat masuk, **Kunci API** (hanya bila boleh; sudah menurut `role`), lalu **Hapus akun** | Tiap kartu satu kolom; tabel riwayat ≥4 kolom memakai kartu < `sm` |
| 7 | **Hapus akun** (di dasar Lanjutan, G-03) | Lihat alur di bawah | Dialog penuh lebar di mobile |

**Alur hapus akun (A7, T3).** (1) Tombol "Hapus akun saya…" memanggil `GET /api/app/account/delete-check` **saat dibuka**, bukan saat halaman dimuat (hemat, data segar). (2) **Bila ada penghalang**: dialog tidak menampilkan kolom ketik; menampilkan daftar "Proyek ini hanya Anda pengelolanya: <nama proyek> (tautan) …" + kalimat "Tunjuk pengelola lain dulu, lalu kembali ke sini." dan satu tombol "Mengerti". (3) **Bila bersih**: dampak nyata ("Anda tidak lagi bisa masuk. Tugas yang Anda kerjakan menjadi tanpa penanggung jawab. Komentar Anda tetap, bertanda 'Pengguna dihapus'") + ketik email (+ sandi bila ada) → tombol merah `loading` "Hapus akun saya". (4) Berhasil → `/login` dengan pesan "Akun sudah dihapus". Gagal → `notify` "Gagal menghapus akun. Coba lagi." (5) Server **menegakkan ulang** pra-cek (G-04), jadi UI bukan satu-satunya penjaga. Dilarang saat impersonasi (tetap).

**Empty/disabled:** saklar Pemberitahuan dinonaktifkan dengan tooltip bila fitur penerimanya belum aktif (lihat G-05, `flags`); tidak boleh saklar yang tampak berfungsi tapi tanpa efek. `/dashboard/settings` kosong tidak ada: selalu ada nilai bawaan.

**`/dashboard/settings` (A8, G-07):** `routes/admin/settings.tsx`, guard `requireAnyRole(request, ['admin','super-admin'])`, daftarkan di `app/routes.ts` + `NAV` `admin/layout.tsx`. Satu kartu "Pengingat acara bawaan": `Checkbox.Group` pilihan tetap (Tepat waktu, 10 menit, 30 menit, 1 jam, 1 hari sebelum), tombol "Simpan pengingat", catatan "Tidak mengubah acara yang sudah dibuat" (R08 kasus tepi).

## 5. Data & API
**Batas wilayah (keputusan P9):** halaman yang mengubah data **milik satu orang** → `/app`; yang mengubah **berlaku untuk semua** → `/dashboard`, dengan guard role di loader **dan** di handler. `/dev` tidak tersentuh.

| Perubahan | Rancangan | Catatan |
|---|---|---|
| `notification_preferences` | `(user_id FK CASCADE, key text CHECK in ('event_reminder','inbox_news'), enabled bool NOT NULL, updated_at timestamptz, PK(user_id,key))`; **tanpa baris = menyala** | **Milik S3a (baton 0017).** P9 hanya memakai; bila S3a berubah bentuk, G-05 mengikuti. Usulan nomor: tidak ada migrasi P9 untuk ini |
| `app_setting.event_default_reminders` | `text` NULL = bawaan `[1440,30]`; daftar menit per baris (`parseLines`, `settings.core.ts:37`) | **Migrasi usulan** `00NN_team_reminder_default.sql`: `ALTER TABLE app_setting ADD COLUMN IF NOT EXISTS event_default_reminders text;` — komentar: *kenapa* (bawaan tim dibaca form Event). Nomor diminta ke pemegang baton |
| Modul server | `server/settings-workspace.ts` (~40 baris: `WORKSPACE_DEFAULTS`, `parseWorkspace`, `getWorkspace`, `upsertWorkspace`), meniru `settings-features.ts` | R08 §3.4 keputusan: pakai ulang `app_setting`, bukan tabel baru |
| Pra-cek | `server/account/delete-precheck.ts`: `getDeleteBlockers(userId): { projects: {id,name}[] }` | Lihat aturan di bawah |

**Aturan pra-cek (A7).** Penghalang = proyek **tidak di Sampah** (`deleted_at IS NULL`) dan status bukan `completed`/`canceled` ⚑, di mana pengguna adalah `lead_id` **atau** anggota `role='manager'`, dan **tidak ada pengelola lain** (`manager` lain di `project_member`, atau `lead_id` orang lain yang masih ada). Satu query agregat, bukan per proyek (aturan N+1). ⚑ Proyek selesai/dibatalkan tidak memblok (konservatif lain: blok semua; dipilih yang tidak memaksa orang mengurus proyek mati; §10 P-2).

| Endpoint (`server/api/app-account.ts`, baru, dirakit `app.ts`) | Fungsi | Izin | Scope key |
|---|---|---|---|
| GET `/api/app/account/delete-check` | `{ canDelete, projects[] }` | semua sesi (401 tanpa sesi), 403 `IMPERSONATING` | `null` (key tidak boleh) |
| GET/PUT `/api/app/notification-prefs` | `{ eventReminder, inboxNews }` | semua; PUT idempoten per kunci | GET `app:read`; PUT `null` (pengaturan pribadi, selaras `PATCH profile`) |
| GET `/api/app/team-settings` | `{ eventDefaultReminders, isDefault }` | semua (form Event membaca) | `app:read` |
| PUT `/api/app/team-settings` | ubah | **Admin/super-admin saja**, 403 `FORBIDDEN` selain itu; `audit()` aksi baru `settings.team.update` + label di `ACTION_META` (`app/lib/audit-api.ts`) | `null`; tambah ke `PM_KEY_DENY` |
| (penjaga) hook `databaseHooks.user.delete.before` di `server/auth.ts:75` | menolak hapus bila `getDeleteBlockers` tidak kosong, **untuk jalur apa pun** (self-delete dan admin `removeUser`) — melempar `APIError` kode `SOLE_MANAGER` | – | – |

**Kontrak tersentuh:** `contract-v1` (13 URL /app) **tidak berubah**; rute di atas adalah tambahan di luar daftar beku. Ada **dua titik** yang perlu catatan: (a) `Principal`/izin tidak diubah; (b) bila `can{}` perlu `can.manageTeam`, itu tambahan opsional (ADR ringan, §9 KB-P9-4). Tiap rute baru wajib baris di `scopes.pm.ts` + `tests/api-keys/scopes.pm.test.ts` + sapuan rute↔scope↔401.

## 6. Daftar tugas
Aturan umum: **K-P3**. Lajur **L4b** (pengaturan/akun). Ukuran: S ≤ 1, M ≈ 1,5-2, L ≥ 3 hari AI. Berkas test ≤ 400 baris.

### Peta paralel & titik sinkron
```
Gerbang S2 ──┬─ G-01 rapikan Lanjutan ───────────────┐ (PARALEL)
             ├─ G-02 pra-cek (server) ─ G-03 UI hapus akun ─ G-04 hook before-delete
             │        └──────────────────────────────┘ ← SINKRON: G-03 & G-04 satu PR dgn G-02
S3a Inbox ───┴─ G-05 saklar Pemberitahuan (UI+API) ─ G-06 efek ke Inbox (titik sinkron dgn S3a)
S4 Events ───── G-07 /dashboard/settings (A8) ─ G-08 form Event membaca bawaan (titik sinkron dgn S4)
Akhir ───────── G-09 QA tiga ukuran teks, smoke, dokumen, gerbang
```
Maks 2 pekerja paralel (G-01 ∥ G-02). Berkas bersama yang disentuh: `settings.tsx` dan `AdvancedSettings.tsx` — **pemilik tunggal L4b**, tugas diurutkan agar tidak bentrok (G-01 → G-03 → G-05 → G-07).

### G-01 · Rapikan Lanjutan → "Keamanan dan perangkat"
**L4b · Dep: gerbang S2 · S (0,75)** · **Target**: `app/components/account/AdvancedSettings.tsx`, `app/components/account/account.copy.ts` (`ADVANCED_COPY`), `app/components/profile/{SessionsCard,LoginHistoryCard,ApiKeysCard}.tsx` (hanya label/urutan). **Change**: ganti judul "Lanjutan" → "Keamanan dan perangkat" dengan deskripsi awam (R11); urutan sesuai §4; label tombol imperatif ("Keluarkan perangkat ini"); empty state tiap kartu; `LoginHistoryCard` ≥4 kolom → kartu < `sm`; ikon `1.25em`; Kunci API tetap hanya bila `ApiKeysCard` mengizinkan menurut `role` (tidak menambah `role ===` baru di route; izin tetap dari loader). **Constraints**: tidak mengubah perilaku/endpoint; `AdvancedSettings.tsx` tetap ≤ 150; tanpa `px` tetap. **Ownership**: berkas di Target. **Acceptance**: `tests/ui/settings-page.test.tsx` (tetap hijau, tambah: judul baru, urutan kartu, kartu Kunci API hilang untuk role tanpa hak) + `typecheck`. **Commit**: `refactor(account): regroup advanced settings as security and devices`.

### G-02 · Pra-cek penghalang hapus akun (server)
**L4b · Dep: gerbang S2 · M (1,25)** · **Target**: B `server/account/delete-precheck.ts` (≤120), B `server/api/app-account.ts` (GET `/account/delete-check`), `server/api/app.ts` (+1 `.use`; pemilik L-C, edit satu baris), `server/api-keys/scopes.pm.ts` (+`PM_KEY_DENY`). **Change**: `getDeleteBlockers(userId)` sesuai §5, satu query agregat; rute mengembalikan `{canDelete, projects:[{id,name}]}` (maks 20 + `total`); 403 `IMPERSONATING` bila `impersonatedBy`. **Constraints**: tanpa Drizzle di `app-*.ts`; pesan error Indonesia actionable; tidak membocorkan proyek yang tak boleh dilihat pengguna (pengguna adalah pengelolanya, jadi aman; uji). **Acceptance**: `tests/account/delete-precheck.test.ts` (bukan pengelola → kosong; lead tunggal → 1; lead + manager lain → kosong; dua manager, keluar satu → kosong; proyek Sampah/completed/canceled tidak memblok; ≤2 query untuk 1 dan 25 proyek) + `tests/api/app-account.test.ts` (401, 200, impersonasi 403) + `tests/api-keys/scopes.pm.test.ts` (key ditolak). **Commit**: `feat(account): add delete-account blocker check for sole managers`.

### G-03 · UI hapus akun (T3) untuk pengguna sesuai keputusan
**L4b · Dep: G-02 · M (1,5)** · **Target**: `app/routes/app/settings.tsx` (loader: `canDeleteAccount` = `!impersonatedBy` per keputusan §10 P-1), `app/components/profile/DangerZoneCard.tsx` (pindah ke `app/components/account/DeleteAccountCard.tsx`, B; hapus berkas lama bila tak dipakai di tempat lain), `app/lib/account-api.ts` (B, klien Eden `delete-check`), `account.copy.ts`. **Change**: alur §4 (penghalang vs T3); kopi tampak dampak nyata; `loading`; `notify` gagal. **Constraints**: **default konservatif sampai user menjawab P-1**: `canDeleteAccount` tetap Super-admin saja (perilaku sekarang) dan tugas ini hanya membangun jalur lengkap di balik bendera; membuka ke semua = satu baris loader + ubah tes. **Acceptance**: `tests/ui/settings-page.test.tsx` diperbarui (bendera mengikuti keputusan), `tests/ui/delete-account-card.test.tsx` (penghalang → daftar proyek + tanpa kolom ketik; bersih → tombol nonaktif sampai email cocok; sandi hanya bila akun sandi; gagal → pesan). **Commit**: `feat(account): block account deletion while sole project manager`.

### G-04 · Hook server `before delete` (penegakan semua jalur)
**L4b · Dep: G-02 · S (0,75)** · **Target**: `server/auth.ts` (`databaseHooks.user.delete.before`, ±8 baris, impor `getDeleteBlockers`). **Change**: menolak (`APIError` 409 `SOLE_MANAGER`, pesan "Tunjuk pengelola lain untuk proyek <n> dulu.") untuk self-delete **dan** `removeUser` Admin; `audit()` tidak mencatat nama proyek. **Constraints**: `server/auth.ts` rawan konflik (pemilik P1/L-C): perubahan minimal; error tidak di-swallow (aturan 11); jangan impor `env` di top-level CLI. **Acceptance**: `tests/account/delete-hook.test.ts` (jalur self-delete ditolak; jalur admin ditolak; pengguna bersih terhapus; avatar tetap dibersihkan) + `smoke:prod`/`smoke:binary`. **Commit**: `feat(auth): enforce sole-manager check before user deletion`.

### G-05 · Saklar Pemberitahuan (API + kartu)
**L4b · Dep: S3a (tabel `notification_preferences`), G-01 · M (1,5)** · **Target**: B `server/notify/prefs.service.ts` (≤120; baca/tulis dua kunci, tanpa baris = menyala), `server/api/app-account.ts` (GET/PUT `/notification-prefs`), B `app/components/account/NotificationsCard.tsx` (≤120), `app/lib/account-api.ts`, `settings.tsx` (kartu ke-3, loader menyertakan nilai awal untuk SSR), `account.copy.ts`. **Change**: sesuai §4/§5; PUT hanya menerima dua kunci (kunci lain → 422); idempoten. **Constraints**: **bila S3a belum merge**, tugas ini tidak dimulai (jangan membuat tabel sendiri; nomor migrasi milik baton). Opsi "tidur": lihat §10 P-3. **Acceptance**: `tests/notify/prefs.service.test.ts` (default menyala; matikan lalu nyalakan; kunci asing ditolak; isolasi antar user) + `tests/api/notification-prefs.test.ts` (401, GET/PUT, key ditolak untuk PUT) + `tests/ui/notifications-card.test.tsx` (optimistik, gagal kembali, `loading`). **Commit**: `feat(settings): add notification preference switches`.

### G-06 · Efek saklar di Inbox & pengingat (titik sinkron S3a/S4)
**L4b + pemilik Inbox · Dep: G-05, S4 penjadwal · S (0,75)** · **Target**: hanya satu fungsi di `server/notify/` (mis. `shouldNotify(userId, kind)`) dipakai oleh pembuat notifikasi Inbox dan penjadwal pengingat; berkas bersama milik lajur Inbox/Events — **diubah oleh pemiliknya**, tugas ini menyediakan fungsi + kontrak. **Change**: `kind='event_reminder'|'inbox_news'` → cek `notification_preferences`; jenis "perlu ditanggapi" **tidak pernah** disaring (uji). **Acceptance**: `tests/notify/should-notify.test.ts` (3 kasus: matikan pengingat tidak mematikan "perlu ditanggapi"; matikan kabar; default). **Commit**: `feat(notify): honor user notification preferences`.

### G-07 · Pengaturan tim: pengingat acara bawaan (A8)
**L4b · Dep: gerbang S2 (kolom/`/dashboard`), efek penuh setelah S4 · M (1,5)** · **Target**: migrasi B (§5; nomor dari baton), `server/db/schema.ts`/`schema.app.ts` (+kolom), B `server/settings-workspace.ts`, `server/api/app-account.ts` (GET/PUT `/team-settings`), `server/api-keys/scopes.pm.ts`, `app/lib/audit-api.ts` (`ACTION_META`), B `app/routes/admin/settings.tsx`, `app/routes.ts`, `app/routes/admin/layout.tsx` (NAV), `app/routes/app/settings.tsx` + B kartu tautan (hanya bila `flags.canManageTeam`). **Change**: sesuai §4/§5; validasi daftar menit (set tetap, urut, tanpa duplikat, maks 5); `audit()`. **Constraints**: **jalankan migrasi lokal dulu** ke DB dev **dan** test (aturan 4); `IF NOT EXISTS`; tanpa fitur AI; Member → 403 di handler (loader layout tidak cukup). **Acceptance**: `tests/api/team-settings.test.ts` (Member 403, PM 403, Admin 200, audit tercatat, key ditolak, nilai tidak valid 422) + `tests/settings-workspace.test.ts` (NULL → `[1440,30]`) + `tests/app-routes.test.ts` (loader memanggil guard) + `tests/ui/team-settings-page.test.tsx`. **Commit**: `feat(settings): add team default event reminders`.

### G-08 · Form Event membaca bawaan tim (titik sinkron S4)
**Pemilik Events · Dep: G-07, S4 form Event · S (0,5)** · **Target**: form Event (berkas milik S4) memanggil `GET /team-settings` untuk mengisi awal; `reminders_minutes` **disalin** ke event saat dibuat. **Acceptance**: `tests/events/event-reminders-default.test.ts` (bawaan dipakai; ubah bawaan tidak mengubah event lama). **Commit**: `feat(events): prefill reminders from team default`.

### G-09 · QA, smoke, dokumen, gerbang
**L10 · Dep: G-01..G-07 yang sudah merge · M (1,5)** · **Target**: B `docs/qa/pengaturan-lanjutan.md`; `README.md` (hanya bagian kontrak: rute `/api/app/account/*`, `notification-prefs`, `team-settings`); `CHANGELOG.md [Unreleased]`. **Change**: periksa halaman pada skala 1/1,25/1,5 di 375, 768, 1024; perangkat sentuh; alur hapus akun end-to-end dengan dua proyek (satu pengelola tunggal); jalankan `smoke:prod` + `smoke:binary`. **Acceptance**: `bun run test`, `typecheck`, `lint` hijau; daftar kriteria §7 centang. **Commit**: `docs(settings): add advanced settings QA and changelog`.

**Ringkasan hari-orang:** G-01 0,75 · G-02 1,25 · G-03 1,5 · G-04 0,75 · G-05 1,5 · G-06 0,75 · G-07 1,5 · G-08 0,5 · G-09 1,5 = **9,75** (≈ 9,5-10).

## 7. Gerbang & kriteria demo
| # | Kriteria (dapat diuji) | Tes |
|---|---|---|
| 1 | Pengguna pengelola tunggal proyek aktif tidak bisa menghapus akun lewat UI **maupun** API/`removeUser`; pesan menyebut nama proyek | G-02, G-03, G-04 |
| 2 | Setelah menunjuk pengelola lain, hapus akun berhasil, sesi berakhir, proyek tetap ada (`lead_id` NULL bila perlu) | G-03/G-04 |
| 3 | Akun dihapus: tugas tetap, penanggung jawab kosong, komentar tetap (KB-P9-5 bila ternyata berbeda) | G-04 + tes integrasi |
| 4 | Dua saklar tersimpan, bertahan setelah muat ulang; tanpa baris = menyala; "perlu ditanggapi" tidak bisa dimatikan | G-05, G-06 |
| 5 | Member/PM mendapat 403 di `PUT /team-settings`; kunci API ditolak; Admin berhasil dan tercatat di audit | G-07 |
| 6 | Mengubah bawaan tim tidak mengubah acara yang sudah ada | G-08 |
| 7 | Halaman Pengaturan utuh pada skala 1,5 di 375 px: tanpa overflow horizontal, semua tombol ≥ 44 px | G-09 (manual) |
| 8 | Semua berkas ≤ batas; `typecheck` nol; `smoke:prod` + `smoke:binary` lulus | G-09 |

## 8. Risiko & mitigasi
| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | G2/A8 dibangun sebelum Inbox/Events ada → saklar tanpa efek (melanggar aturan 17) | Tinggi | G-05/G-06/G-08 tidak dimulai sebelum S3a/S4; atau dibangun "tidur" hanya dengan persetujuan P-3 dan tanda eksplisit |
| R2 | Pra-cek hanya di UI, jalur lain (admin `removeUser`, API Better Auth) lolos | Tinggi | G-04 hook server sisi `before`; tes dua jalur |
| R3 | Hook `before delete` membuat hapus gagal setengah jalan (avatar, sesi) | Sedang | Hook murni pemeriksaan, melempar sebelum ada efek samping; tes urutan |
| R4 | Proyek berstatus aneh (draft/on_hold) salah dihitung | Sedang | Aturan eksplisit §5; uji tiap status; default konservatif: hanya completed/canceled/Sampah yang tidak memblok |
| R5 | Berkas bersama `settings.tsx`/`auth.ts`/`app.ts`/`routes.ts` bentrok dengan lajur lain | Sedang | Pemilik tunggal L4b, urutan G-01→G-03→G-05→G-07; perubahan `auth.ts`/`app.ts` minimal satu blok |
| R6 | Orang lansia salah menghapus akun | Tinggi | T3 (ketik email), dampak nyata, tanpa tombol "OK"; penghalang menampilkan jalan keluar, bukan pesan kosong |
| R7 | Admin tidak bisa menemukan pengaturan tim (halaman baru di `/dashboard`) | Rendah | Kartu tautan di `/app/settings` + NAV admin |
| R8 | Nomor migrasi 0017 bentrok dengan S3a | Sedang | P9 hanya satu migrasi kecil, nomor diminta ke baton; G-07 tidak jalan sebelum nomor ada |
| R9 | Saklar menggandakan sumber kebenaran (cookie/DB) | Rendah | Saklar hanya di tabel; tidak ada cookie |

## 9. Kontradiksi baru & dampak ke dokumen lain
| ID | Temuan | Default konservatif |
|---|---|---|
| **KB-P9-1** | Kode sekarang: hapus akun **Super-admin saja** (`settings.tsx:41`, tes `settings-page.test.tsx:79-98`, label "Q4/N03"). R10 A7 menulis "Hapus akun + pra-cek" tanpa menyebut siapa; R08 §6 Q6 mengusulkan **menyembunyikan** kartu dari pengguna biasa. Tiga arah berbeda | Tidak membuka ke semua; G-03 membangun jalur lengkap di balik bendera, tetap Super-admin sampai user menjawab P-1 |
| **KB-P9-2** | R08 §3.4 menyebut `/dashboard/settings`, tetapi `app/routes.ts:35-36` dan CLAUDE.md ("pengaturan tim menyusul") tidak memilikinya | Dibuat di G-07 sebagai satu halaman kecil di area `/dashboard` (sesuai CLAUDE.md "khusus manajemen akun dan tim") |
| **KB-P9-3** | R08 §3.4 menulis `text_size` `normal|large|xlarge` dan cookie `pm-text-size`; kode memakai `normal|besar|sangat_besar` dan `mk-text-size` | **Kode menang**; tidak ada perubahan |
| KB-P9-4 | `can{}` mungkin perlu bendera `manageTeam`; `contract-v1` beku | Tidak ubah kontrak: bendera dihitung di loader (`flags.canManageTeam`), bukan di `can{}` |
| KB-P9-5 | Perilaku data setelah hapus akun (`created_by`, penanggung jawab, komentar) belum diputuskan di KEPUTUSAN | Skema sudah `SET NULL` (`schema.project.ts:31,42`); UI memakai "Pengguna dihapus"; uji di G-09 sebelum membuka ke non-Super-admin |

**Dampak ke dokumen lain (tidak diedit di sini):** `P3` S1-14/S1-15 (halaman Pengaturan): G-01 mengganti nama akordeon; `KEPUTUSAN-MVP-INTI.md`: tambah jawaban P-1; `R08 §3.4` baris Hapus akun (Q7) perlu disesuaikan; rencana Inbox (S3a) harus memuat `notification_preferences` dan fungsi `shouldNotify` (G-06); rencana Events harus membaca `team-settings` (G-08); `tests/ui/settings-page.test.tsx` diubah di G-03.

## 10. Pertanyaan untuk user
| # | Pertanyaan | Usulan |
|---|---|---|
| P-1 | Siapa boleh menghapus **akunnya sendiri**: semua pengguna, hanya Admin/Super-admin, atau tetap Super-admin saja? | Tetap Super-admin saja sampai uji pengguna; buka ke semua lewat satu baris loader setelah KB-P9-5 teruji. Menghapus akun orang lain tetap lewat Admin |
| P-2 | Apakah proyek **selesai/dibatalkan** ikut memblok hapus akun? | Tidak memblok (hanya proyek aktif, ditunda, draft) |
| P-3 | Boleh saklar Pemberitahuan dibangun sebelum Inbox ada (data tersimpan, tanpa efek, tombol dinonaktifkan dengan keterangan)? | Tidak; tunggu S3a. Aturan "tidak ada stub tanpa efek" lebih penting daripada beberapa hari lebih awal |
| P-4 | Nilai bawaan pengingat acara tim | 1 hari dan 30 menit sebelum (`[1440,30]`, R08) |
| P-5 | Bila Admin menghapus pengguna pengelola tunggal lewat Pengguna: ditolak (usulan) atau otomatis dialihkan ke Admin itu? | Ditolak dengan pesan; pengalihan otomatis menyembunyikan keputusan |

## 11. Sumber
Kode: `app/routes/app/settings.tsx`, `app/components/account/{AdvancedSettings,AppearanceCard}.tsx`, `app/components/profile/DangerZoneCard.tsx`, `server/auth.ts`, `server/api/{auth-gate,app-profile}.ts`, `server/db/schema.project.ts`, `server/pm/enums.ts`, `server/settings*.ts`, `server/api-keys/scopes.pm.ts`, `app/routes.ts`, `app/routes/admin/layout.tsx`, `tests/ui/settings-page.test.tsx`. Dokumen: `riset/R08` §3.4 + §6, `riset/R10` §3.1 (A7/A8/G2) + §3.3 (L4, baton 0017) + S6, `riset/R01`, `riset/R11`, `riset/R12` (log tanpa PII), `rencana/P3-s1-s2-proyek-tugas.md` §1, `rencana/_BRIEF-TAHAP2.md`, `KEPUTUSAN-MVP-INTI.md` (X1-Q7). **Belum diverifikasi:** bentuk tabel `notification_preferences` (R07/S3a), ada tidaknya jalur `removeUser` Admin yang memakai `internalAdapter.deleteUser` (komentar `auth.ts:75` menyatakan ya, dibaca bukan dijalankan), nama status proyek yang dianggap "aktif".
