# P6 — Rencana eksekusi S7 (Menu Event)

> 18 Okt 2026 · tahap rencana · BELUM ada kode. Basis: cabang `feature/project-management` (MVP Inti S0-S2, 91/93). Mengikat: `../KEPUTUSAN-MVP-INTI.md`. Sumber utama: R08 §3.1, R07 §3.5/§3.7/W6, R10 §3.1/§3.3 (S7), R11. **Fondasi kode menang atas riset**; hal yang tidak bisa diverifikasi di kode ditandai **[ASUMSI]**. Migrasi diusulkan sebagai **0018**; nomor final diklaim pemegang baton, bukan worker.

## 1. Ringkasan
- **16 tugas** `E-01..E-16`: **13 Should** (E-01..E-12 + E-15 QA) ≈ **13,5 hari-orang AI**; **Could** (E-13 Tugas dari rapat, E-14 Kalender Bulan/Minggu, E-16 Acara berulang = 3 tugas) ≈ **+7 hari** dan **bisa dipotong tanpa menyentuh Should** (migrasi Could terpisah, lihat §5). Tambah reviewer ≈ 3-4 hari. R10 memberi S7 9-13 hari termasuk Could; rencana ini lebih tinggi di sisi Should karena memuat Sampah-acara, pagar izin, dan QA yang R10 hitung di tempat lain.
- **Should (R10 E1, E2, E3, H3):** daftar Akan datang/Sudah lewat, form 2 tahap (≤4 isian di layar awal), detail + peserta, pengingat T-1 hari dan T-30 menit lewat tick idempoten (`now` disuntik), notulensi ketik, hapus ke Sampah dengan **Urungkan**, widget **Agenda** di Beranda (H3) dan kartu pengingat di **Inbox**.
- **Aturan produk yang diuji:** Pemantau (viewer) tidak bisa membuat acara di proyeknya; Daftar ≤ 3 query; tick ulang tidak menggandakan notifikasi; tiap rute baru dipetakan scope + tes.
- **Ketergantungan keras di luar S7:** `notify()` + tabel `notifications` (S3a, R07; **belum ada di kode**), halaman Beranda produk (S3, untuk H3), infrastruktur Sampah multi-jenis (S6; di kode baru proyek). Tanpa S3a/S6 selesai, S7 tetap bisa dimulai dengan jalur fallback (§8 R-E1, R-E2) tetapi tidak boleh digabung sebelum keduanya ada.
- **Perubahan kontrak:** `contract-v1` beku 13 URL `/app` (`tests/contract-v1.test.ts:146-148`). Menu Event menambah **3 URL** (`/app/events`, `/app/events/new`, `/app/events/:id`) ⇒ butuh Permintaan Perubahan Kontrak/ADR (E-01).
- **Jalur:** E-01 → (E-02 ∥ E-03) → E-04 → E-05 ∥ E-06 ∥ E-07 → E-08 → UI (E-09 ∥ E-10 ∥ E-11) → E-12 → E-15. Gelombang kalender ≈ 9-12 hari kerja dengan 2-3 pekerja (S7 punya kelonggaran, R10 §3.4).

## 2. Keadaan sekarang (dibaca di worktree)
| Fakta | Bukti | Akibat untuk S7 |
|---|---|---|
| Menu `/app` hanya Beranda, Proyek, Tugas, Sampah, Pengaturan; belum ada Event/Inbox/Tim | `app/routes/app/layout.tsx:18-52` (`NAV`) | Tambah item **Event** di `NAV`; `matchPrefix: true` |
| Beranda masih stub "Beranda Anda masih kosong" dengan 2 tombol | `app/routes/app/home.tsx:14-45` | H3 butuh Beranda produk (S3); S7 hanya menyediakan API + komponen `AgendaWidget` |
| `appApi` merakit modul via `.use(...)`; `appContext` pertama; belum ada `app-events` | `server/api/app.ts:19-33` | Tambah `eventsApi` (+ `eventNotesApi`) di sini (berkas L-C, pemilik tunggal integrator) |
| Hapus lunak = kolom `deletedAt`+`deletedBy` via `softDelete()`, predikat `isLive()` wajib di tiap kueri daftar | `server/db/schema.columns.ts:28-33`, `server/pm/soft-delete.ts:7-9` | Tabel `event` memakai helper yang sama; tidak ada pola baru |
| Helper kolom: `pk()` (uuid teks), `createdAt/updatedAt` (timestamptz), `oneOf()` CHECK dari tuple enum | `server/db/schema.columns.ts:9-50` | Enum acara (`EVENT_KINDS`, dst.) ditambah di `server/pm/enums.ts` (dependency-free, dipakai browser) |
| Proyek: `project`, `projectMember` (peran `manager|member|viewer`, indeks `project_member_user_id_idx`) | `server/db/schema.project.ts:23`, `:59-79` | FK `event.project_id` → `project` (SET NULL); visibilitas acara memakai `projectMember` |
| Kebijakan akses ber-`Principal`, `Membership`, `levelOf/atLeast`; `canCreateTask` menolak viewer (`NOT_MEMBER`) dan proyek di Sampah (`PROJECT_IN_TRASH`) | `server/access/types.ts:12-18`, `server/access/task.policy.ts:105-117` | `canCreateEvent` meniru bentuk ini; Pemantau ditolak dengan kode yang sama |
| Peta kemampuan UI: `buildCaps`, `projectCaps`, `appCaps` | `server/access/capabilities.ts:98-165` | Tambah `EVENT_CAP_KEYS` + `eventCaps()`; UI tidak membandingkan role (X3 M29) |
| Sampah: `/api/app/trash` berbentuk `:kind`, kini hanya `project` (list + restore); `trashProject` menandai tugas dengan `deletedWithProjectId` | `server/api/app-trash.ts:1-50`, `server/project/project-trash.service.ts:47-89`, `server/access/trash.policy.ts:17-66` | Event mengikuti pola sama (`deleted_with_project_id`); kerangka S6 belum ada ⇒ E-07 |
| Penjadwal berpola `setInterval(...).unref()` dan daftar mulai di `server/api/index.ts` | `server/settings-retention.ts:102-116`, `server/api-keys/rollup.ts:97-105` | `startEventReminderScheduler()` mengikuti pola; dilewati saat `NODE_ENV=test` |
| Pemetaan scope: semua `/api/app/*` ⇒ `app:read`/`app:write` otomatis; rute destruktif masuk `PM_KEY_DENY` | `server/api-keys/scopes.ts:185`, `server/api-keys/scopes.pm.ts:6-41` | `DELETE /events/:id` dan pembatalan: **dipertimbangkan** masuk `PM_KEY_DENY` (Q-E4) |
| Migrasi terakhir **0016_task_core**; 0017 diasumsikan milik Inbox/`notifications` (S3a) | `server/db/migrations/meta/_journal.json` (idx 16) | **[ASUMSI]** 0017 = notifications; E-01 mengusulkan **0018**, urutan final oleh baton |
| `notify()`, `notifications`, `event`/`events` | pencarian `grep` di `server/` dan `app/`: tidak ada | Semua dari R07/R08, belum berkode |

## 3. Lingkup & non-lingkup
| Butir (R10) | Kelas | Isi di S7 | Tugas |
|---|---|---|---|
| E1 Daftar + form 2 tahap + detail (+ peserta) | **Should** | Tab Akan datang/Sudah lewat, cari, saring jenis/proyek; form 2 tahap; detail; peserta; Batalkan (alasan) | E-02..E-06, E-08..E-10 |
| E2 Pengingat in-app 1 hari + 30 menit | **Should** | Tick idempoten → kartu Inbox `event_reminder`; juga `event_invited/changed/canceled` | E-04 |
| E3 Notulensi ketik | **Should** | Teks, Draf/Dikonfirmasi, kunci optimis 409 | E-05, E-10 |
| H3 Beranda: Agenda | **Should** | `GET /events/agenda` + `AgendaWidget` (maks 4, hari ini + besok) | E-11 |
| Hapus ke Sampah + Urungkan (X1-Q1) | **Should** (syarat gerbang S7) | Hapus tanpa dialog, toast Urungkan ±10 dtk, entri di Sampah, ikut proyek yang dihapus | E-07 |
| E4 Tugas dari rapat (manual) | Could | `event_outcomes`, "Buat N tugas" | E-13 |
| E5 Kalender Bulan/Minggu | Could | Grid `SimpleGrid cols={7}`, Minggu = daftar harian | E-14 |
| E6 Acara berulang | Could | `event_series`, materialisasi 90 hari | E-16 |

**Non-lingkup (disembunyikan, bukan tombol mati — P3 §2):** foto/suara/AI notulensi, Google Calendar, email/push, jam tenang, ubah seluruh rangkaian, tanggal akhir pengulangan, "Siap/Belum siap" (R07 D6), kartu "Hasil rapat menunggu konfirmasi" (R07 D3), pilih zona waktu per pengguna (Q1: semua WIB lewat `APP_TIME_ZONE`).

## 4. Layar & perilaku
| Layar (rute) | Perilaku utama | Empty state / mobile / teks |
|---|---|---|
| **Daftar** `/app/events` (`app/routes/app/events.tsx`) | Judul + tombol utama tunggal **+ Acara baru** (muncul bila `caps.createEvent`). Tab **Akan datang** (default) / **Sudah lewat**; kelompok Hari ini / Besok / Minggu ini / Nanti (dihitung di klien dari jam SSR yang sama, `useTimeFormat`); cari; saring Jenis, Proyek; "Tampilkan lebih banyak" (keyset). Baris: jam-jam, judul, tempat, jenis (ikon+teks), lencana notulensi (Belum ada/Draf/Dikonfirmasi) | Kosong: "Belum ada acara. Tambahkan rapat atau pengingat pertama Anda." [+ Acara baru]; tanpa hak: teks saja. Mobile (<`sm`): kartu `Stack`, bukan tabel; `Group wrap="wrap"` di header; ikon `1.25em`; breakpoint lewat prop `visibleFrom` |
| **Form 2 tahap** `/app/events/new` (`event-new.tsx`) | **Tahap 1 (layar awal, 4 isian):** Judul*, Tanggal*, Jam mulai*, Jam selesai* (atau Durasi). Tombol **Lanjut** lalu **Simpan acara**. **Tahap 2 ("Tambahkan rincian", boleh dilewati):** Jenis (bawaan Rapat), Proyek, Peserta, Tempat/Tautan rapat, Agenda. Simpan setelah tahap 1 sudah valid dan lengkap (tahap 2 opsional). Tanggal pakai `DateInput`, jam pakai `TimeInput` Mantine (`@mantine/dates`) | Pilihan proyek hanya proyek tempat saya Anggota/Pengelola; Pemantau tidak terdaftar (server 403 `NOT_MEMBER` bila dipaksa). Galat bidang: "Jam selesai harus setelah jam mulai." Tombol `loading`, sukses lewat `notify`, label "Simpan acara" bukan "Submit". `inputMode` sesuai; font input ≥16px |
| **Detail** `/app/events/:id` (`event-detail.tsx`) | ← Kembali; judul, jenis, waktu (WIB), tempat/tautan (tombol **Buka tautan rapat**), agenda, **Peserta** (nama+jabatan saja, Q8; **Tambah peserta**/hapus bila `can.manageParticipants`), **Notulensi** (kotak ketik besar, **Simpan notulensi**, Draf→**Tandai final**), menu ⋯ **Ubah acara**, **Batalkan acara** (modal alasan wajib), **Hapus** (T1: langsung + Urungkan). Acara dibatalkan: banner + tombol notulensi disembunyikan | Mobile: satu kolom, menu ⋯ ber-`ActionIcon` default tema (44 px, jangan tulis `size`). Konflik: "Notulensi ini baru diubah orang lain. [Muat versi terbaru]" tanpa kehilangan ketikan |
| **Agenda Beranda** (`AgendaWidget`, dipasang S3) | Maks 4 acara hari ini + besok yang saya ikuti: jam, judul, tempat, **Lihat**. Tanpa badge Siap/Belum siap | Kosong: "Tidak ada acara hari ini atau besok." + tautan **Lihat semua acara**; `AgendaWidget` berdiri sendiri sehingga S3 tinggal menempelkan |
| **Inbox** (S3) | Kartu `event_reminder` ("Rapat 'X' mulai 30 menit lagi" / "…besok pukul 09.00") dengan tautan ke detail; `event_invited`, `event_changed`, `event_canceled` | Kategori preferensi `event_reminder` dapat dimatikan; kartu hilang bila acara dibatalkan (`resolveNotifications`) |
| **Sampah** `/app/trash` | Entri jenis "Acara" (judul, dihapus oleh, tanggal) dengan **Pulihkan**; acara yang proyeknya di Sampah tidak bisa dipulihkan sendiri (pesan: "Pulihkan proyeknya dulu.") | Memakai `TrashList` yang ada; pemulihan aman bila hapus-lunak ganda |
Wajib semua layar: Mantine saja; loader memanggil `await requireUser(request)` sebagai pernyataan pertama; `meta()` `'Acara — Simple PM'`; tanpa `window.confirm`; teks 1/1,25/1,5 tidak memecah tata letak (baris tinggi menyesuaikan, tanpa lebar piksel tetap); bahasa awam ("Acara", "Peserta", "Notulensi", "Batalkan acara"). Layar-awal form: **tepat 4 isian terlihat** (uji komponen menghitung `input` terlihat).

## 5. Data & API
**Migrasi 0018 (usulan, aditif, idempoten, comment alasan)** — berkas `server/db/schema.events.ts` (≤200 baris) + re-export di `schema.ts`; tuple enum di `server/pm/enums.ts`:
| Tabel | Kolom penting | Indeks / aturan |
|---|---|---|
| `event` | `id` pk · `project_id` null FK `project` SET NULL · `title` ≤150 · `kind` text=`meeting` CHECK `meeting|review|important|team|other` · `starts_at`,`ends_at` timestamptz · `location_type` `offline|online` · `location_text` ≤200 · `meeting_url` · `agenda` text · `reminders_minutes` int[] DEFAULT `{1440,30}` · `canceled_at`,`cancel_reason`,`canceled_by` · `created_by` SET NULL · `softDelete()` + `deleted_with_project_id` · `created_at`,`updated_at` | CHECK `ends_at > starts_at`; `(starts_at) WHERE deleted_at IS NULL AND canceled_at IS NULL`; `(project_id, starts_at)`; `(created_by)` |
| `event_participant` | PK `(event_id, user_id)` CASCADE kedua sisi · `added_by` · `added_at` | `(user_id, event_id)` untuk Agenda/visibilitas (R07 W6) |
| `event_note` | `event_id` UNIQUE CASCADE · `body` text · `status` `draft|confirmed` · `written_by` SET NULL · `updated_at` | kunci optimis `baseUpdatedAt` → 409 `NOTE_CONFLICT` |
| `event_reminder` | PK `(event_id, offset_minutes)` · `claimed_at` | pemenang `INSERT … ON CONFLICT DO NOTHING RETURNING` yang berhak `notify()` |
Migrasi **Could terpisah, nomor menyusul baton (usul 0019)**: `event_series` + kolom `series_id`/`original_starts_at`/`is_exception` + UNIQUE `(series_id, original_starts_at)` (E-16), `event_outcome` (E-13). Agar Should tidak bergantung pada Could, 0018 **tidak** memuatnya. Diganti nama tabel tunggal (`event`) mengikuti konvensi kode (`project`, `task`), beda dari R08 (`events`) — **[ASUMSI] lihat §9 K-E1**. Migrasi dijalankan ke DB dev **dan** `DATABASE_URL_TEST`.

**Endpoint** (`server/api/app-events.ts` ≤150 + `app-events.notes.ts`, prefix `/api/app/events`; `.use(appContext)`; `app:read` untuk GET, `app:write` selainnya otomatis):
| Metode · Path | Fungsi | Izin (server mengirim `can{}`) |
|---|---|---|
| GET `/` `?tab&kind&projectId&q&cursor&limit` | daftar (keyset `(starts_at,id)`, limit 30, maks 100) | `visibleEventsWhere(actor)` |
| GET `/agenda` | maks 4 acara saya, hari ini + besok (`now` server) | peserta/pembuat |
| GET `/people?q` | kandidat peserta (nama+jabatan) — memakai `team.picker` yang ada | semua |
| GET `/:id` | detail + peserta + catatan + `can{}` | `canViewEvent` |
| POST `/` | buat; pembuat otomatis peserta; undang peserta | `canCreateEvent`: semua role bertipe pengguna; bila `projectId` ⇒ level ≥ `member` (viewer 403 `NOT_MEMBER`, proyek di Sampah 422) |
| PATCH `/:id` | ubah (ubah `starts_at` ⇒ hapus `event_reminder` acara itu) | Admin, pembuat, Pengelola proyek |
| POST `/:id/cancel` `{reason}` | batalkan + beri tahu peserta | idem |
| DELETE `/:id` | ke Sampah → `{trash:{kind:'event',id,label}}` untuk toast Urungkan | idem |
| POST/DELETE `/:id/participants` | tambah/hapus peserta | idem |
| PUT `/:id/note` `{body,status,baseUpdatedAt}` | simpan notulensi | peserta, pembuat, Pengelola, Admin |
| POST `/api/app/trash/event/:id/restore` | pulihkan (Urungkan) | idem + `canRestoreEvent` |
Kode galat seragam `{error,code,status,requestId}`; pesan Indonesia. **Visibilitas satu kueri (tanpa N+1):** `Admin OR created_by=me OR EXISTS(peserta=me) OR project_id IN (proyek saya)`; PM tambahan semua acara ber-proyek (selaras Q7). **Kontrak tersentuh:** +3 URL halaman (perubahan terdaftar), +endpoint `/api/app/events*` (kompatibel mundur), `/api/app/trash` memperluas `:kind`. Fungsi murni waktu menerima `now` (`runReminderTick(now)`, `selectDueReminders(now)`), konstanta bernama `EVENT_REMINDER_OFFSETS_MIN=[1440,30]`, `EVENT_REMINDER_GRACE_MS=900_000`, `EVENT_REMINDER_TICK_MS=60_000`.

## 6. DAFTAR TUGAS (kontrak spesifikasi, siap `worker-start --spec`)
**Konvensi (berlaku semua tugas):** cabang `feature/s7-<lajur>` dari `contract-v1` + hasil S3a/S6; satu tugas = satu commit `<type>(<scope>): <english imperative>` + baris `Co-Authored-By`; tiap tugas menambah poin `CHANGELOG.md [Unreleased]` (Indonesia, sudut pandang pengguna). **DoD umum:** `bun run test` hijau, `bun run typecheck` nol error, `bun run lint` bersih; menyentuh `server/` ⇒ `smoke:prod` + `smoke:binary`; rute baru dipetakan scope + tes (`tests/api-keys/scopes.test.ts`); berkas ≤ batas (route 150, service 300, query 250, schema 200, test 400); tanpa TODO tanpa konteks; auth tes via `spyOn(auth.api,'getSession')` + `spyOn(rolesMod,'resolveUserRole')`. **UI-DoD:** Mantine, `requireUser` di loader, `meta()`, `loading`, notify, empty state, mobile 375px, ikon `1.25em`. Lajur: **LE-D** data, **LE-S** servis/API, **LE-U** UI, **LE-Q** QA. Titik sinkron: **SP-E1** (E-01 merge), **SP-E2** (E-06 merge), **SP-E3** (E-12 merge).

### E-01 · Skema acara + migrasi 0018 + Permintaan Perubahan Kontrak — LE-D · S7 · M · 1,5 hari · tanpa dependensi · ★ baton
- **Target:** BARU `server/db/schema.events.ts`; UBAH `server/db/schema.ts` (re-export), `server/pm/enums.ts` (`EVENT_KINDS`, `EVENT_LOCATION_TYPES`, `EVENT_NOTE_STATUSES`, `EVENT_REMINDER_OFFSETS_MIN`); BARU `server/db/migrations/0018_<nama>.sql` (+ journal/snapshot hasil `drizzle-kit`); BARU ADR/PCC di folder kontrak yang sama dengan `0002-contract-v1.md` (path persis dicek worker, **[ASUMSI]** `docs/decisions/`).
- **Change:** tabel `event`, `event_participant`, `event_note`, `event_reminder` sesuai §5; semua `IF NOT EXISTS`, komentar *kenapa*; `reminders_minutes` DEFAULT `{1440,30}`; PCC **mencatat** penambahan 3 URL ke daftar kontrak; pemutakhiran `APP_URLS`/hitungan di `tests/contract-v1.test.ts` menjadi 16 dilakukan E-09..E-11, bukan E-01 (lihat KOREKSI di Acceptance).
- **Constraints:** nomor 0018 hanya setelah baton mengonfirmasi 0017 (S3a); tidak ada `pgEnum`; jalankan migrasi ke dev dan test sebelum lanjut; jangan sentuh `schema.project.ts`/`schema.task.ts`.
- **Ownership:** berkas di Target; `tests/contract-v1.test.ts` hanya baris URL.
- **Acceptance:** `tests/db/events-schema.test.ts` (CHECK `ends_at > starts_at` menolak; kind tak dikenal ditolak; hapus proyek ⇒ `project_id` NULL; hapus pengguna ⇒ peserta ikut; `reminders_minutes` default); tes migrasi idempoten (dua kali jalan); `typecheck` nol; `contract-v1` hijau **dengan 13 URL — hitungan TIDAK naik di sini**. KOREKSI 18 Okt (E-01): tes menurunkan daftar URL dari `app/routes.ts`, jadi `APP_URLS` dan `toHaveLength` baru naik 13 → 16 di tugas yang mendaftarkan ketiga rute halaman Event (E-09..E-11). E-01 hanya menulis PCC-nya (`docs/decisions/0003-contract-v1-event-urls.md`).
- **Commit:** `feat(events): add event schema and migration 0018`

### E-02 · Kebijakan akses & kemampuan acara — LE-S · S7 · M · 1,25 hari · dep E-01 · PARALEL dgn E-03
- **Target:** BARU `server/access/event.policy.ts`; UBAH `server/access/capabilities.ts` (+`EVENT_CAP_KEYS`, `eventCaps`, `AppCaps.createEvent`), `server/access/types.ts` (`EventSubject`); BARU `server/event/events.access.ts` (`visibleEventsWhere(principal)`).
- **Change:** `canCreateEvent(p, project|null, m)`, `canViewEvent`, `canManageEvent` (Admin/pembuat/Pengelola), `canWriteNote`, `canRestoreEvent`; bentuk meniru `task.policy.ts:105-117` (viewer ⇒ `deny('NOT_MEMBER')`, proyek Sampah ⇒ `PROJECT_IN_TRASH`, super-admin menyamar ⇒ aksi merusak ditolak, Q9).
- **Constraints:** tanpa DB/env di policy (browser membacanya); `capabilities.ts` milik pemilik tunggal L-C — ubah hanya tambahan.
- **Acceptance:** `tests/access/event.policy.test.ts` matriks role (member/PM/admin/super-admin) × status keanggotaan (manager/member/viewer/non-anggota) × aksi; kasus kunci "Pemantau tidak bisa membuat acara di proyeknya".
- **Commit:** `feat(events): add event access policy and capabilities`

### E-03 · Servis & kueri acara (CRUD, peserta, batal) — LE-S · S7 · L · 2 hari · dep E-01 · PARALEL dgn E-02 (impor policy via tipe, sinkron di E-04)
- **Target:** BARU `server/event/events.query.ts` (≤250), `events.service.ts` (≤300), `events.participants.ts`, `events.dto.ts`.
- **Change:** `listEvents(principal,{tab,kind,projectId,q,cursor,limit,now})` dalam **≤3 query** (daftar + agregat peserta + total/cursor); `getEvent`; `createEvent` (transaksi: acara + peserta termasuk pembuat); `updateEvent` (ubah `starts_at` menghapus `event_reminder`); `cancelEvent`; `addParticipants/removeParticipant`; `agendaFor(principal, now)`. Keyset memakai `server/pm/keyset.ts`; validasi proyek aktif (422 `PROJECT_IN_TRASH`).
- **Constraints:** semua daftar memakai `isLive`; tanpa N+1; waktu lewat parameter `now`, bukan `new Date()` di dalam; tanggal di `sql` mentah dikirim string ISO `::timestamptz`.
- **Acceptance:** `tests/event/events.service.test.ts` + `events.query.test.ts` (daftar dihitung tepat 3 query lewat penghitung query; tab Akan datang/Sudah lewat batas `now`; pencarian; peserta tidak memuat email/HP; visibilitas non-anggota tak bocor).
- **Commit:** `feat(events): add event service and list queries`

### E-04 · Pengingat T-1 hari & T-30 menit + kait notifikasi — LE-S · S7 · M · 1,5 hari · dep E-03, S3a (`notify`)
- **Target:** BARU `server/event/events.reminders.ts` (≤250), `server/notifications/emit/emit.event.ts` (bila S3a belum membuat), UBAH `server/api/index.ts` (daftar scheduler, lewati `NODE_ENV=test`).
- **Change:** `runReminderTick(now, deps)` murni: pilih acara tidak dibatalkan/dihapus dengan `starts_at ∈ [now, now+1440 mnt]`, untuk tiap offset jatuh tempo klaim `event_reminder` (`ON CONFLICT DO NOTHING RETURNING`); bila terklaim dan `now − (starts_at − offset) ≤ EVENT_REMINDER_GRACE_MS` ⇒ `notify(event_reminder)` ke peserta (kecuali yang mematikan kategori); lewat grace ⇒ terklaim tanpa kirim. `startEventReminderScheduler()` memanggilnya tiap 60 dtk. Emit `event_invited/changed/canceled` dari E-03 (via kait, bukan impor melingkar).
- **Constraints:** kunci dedupe `eventId:startsAt:offset` (mengikuti R07 §3.5); idempoten terhadap tick ulang dan restart; **bila `notify()` belum ada, dilarang membuat tabel notifikasi sendiri** — eskalasi (R-E1).
- **Acceptance:** `tests/event/events.reminders.test.ts` dengan `now` disuntik: (a) now = T-1440 ⇒ 1 notifikasi per peserta; (b) tick kedua pada `now` sama ⇒ tetap 1 (tidak menggandakan); (c) now = T-30 ⇒ notifikasi kedua; (d) acara dibatalkan/dihapus ⇒ 0; (e) ubah jam ⇒ klaim direset dan dikirim ulang sesuai jam baru; (f) lewat grace ⇒ 0 kiriman; (g) peserta yang mematikan kategori ⇒ dilewati.
- **Commit:** `feat(events): add idempotent reminder tick`

### E-05 · Notulensi ketik dengan kunci optimis — LE-S · S7 · S · 0,75 hari · dep E-03 · PARALEL dgn E-06/E-07
- **Target:** BARU `server/event/events.notes.ts`.
- **Change:** `saveNote(principal,{eventId,body,status,baseUpdatedAt})`; `UPDATE … WHERE updated_at = base` ⇒ 0 baris ⇒ 409 `NOTE_CONFLICT` + isi terbaru; hanya peserta/pembuat/Pengelola/Admin; acara dibatalkan ⇒ 409 `EVENT_CANCELED`; badge dihitung (Belum ada/Draf/Dikonfirmasi).
- **Constraints:** `body` ≤ 20.000 karakter; tidak dilog (bisa berisi PII).
- **Acceptance:** `tests/event/events.notes.test.ts` (simpan, konflik dua penulis, non-peserta 403, batas panjang, status final).
- **Commit:** `feat(events): add typed meeting notes`

### E-06 · Rute API acara + pemetaan scope — LE-S · S7 · M · 1,25 hari · dep E-02, E-03, E-05 · ★ titik sinkron SP-E2
- **Target:** BARU `server/api/app-events.ts` (≤150), `app-events.notes.ts`, `app-events.schema.ts`; UBAH `server/api/app.ts` (`.use`), `server/api-keys/scopes.pm.ts` (keputusan Q-E4), `tests/api-keys/scopes.test.ts`, `scopes.pm.test.ts`.
- **Change:** semua endpoint §5 (kecuali trash → E-07), `.use(appContext)`, `status(4xx,{error,code})`, `can{}` di respons.
- **Constraints:** tidak `throw status()` di `derive`; berkas `app.ts` hanya perakit; DELETE/cancel mengikuti keputusan `PM_KEY_DENY`.
- **Acceptance:** `tests/api/app-events.test.ts` (401 tanpa sesi; 403 viewer; 422 proyek Sampah; 404 `NOT_VISIBLE` untuk acara tak terlihat; 409 `NOTE_CONFLICT`), `tests/api-keys/scopes.*.test.ts`, `smoke:prod`+`smoke:binary`.
- **Commit:** `feat(events): add events api routes`

### E-07 · Hapus ke Sampah + Urungkan + ikut hapus proyek — LE-S · S7 · M · 1,5 hari · dep E-03, S1-18 (Sampah proyek); sinkron dgn S6
- **Target:** BARU `server/event/events.trash.ts`; UBAH `server/api/app-trash.ts` (jenis `event`: list + restore), `server/access/trash.policy.ts`, `server/project/project-trash.service.ts` (cascade `deleted_with_project_id` untuk acara, dan pemulihannya).
- **Change:** `trashEvent` mengisi `deletedAt/By`, mengembalikan `{kind:'event',id,label}`; `restoreEvent` (409 bila proyeknya di Sampah); list Sampah ikut memuat acara; audit `EVENT_TRASH/RESTORE`; **koordinasi S6**: bila S6 sudah memperkenalkan registri jenis Sampah, pakai registri itu, bukan cabang `if`.
- **Constraints:** pembersihan 30 hari & hapus permanen milik S6, bukan S7; T1 (tanpa dialog) ⇒ wajib Sampah di belakangnya.
- **Acceptance:** `tests/event/events.trash.test.ts` (hapus ⇒ hilang dari Daftar/Agenda, muncul di Sampah; restore ⇒ kembali lengkap dengan peserta+notulensi; hapus proyek ⇒ acara ber-proyek ikut, restore proyek ⇒ ikut pulih; acara yang dihapus manual tidak ikut pulih), `tests/api/app-trash.test.ts` diperluas.
- **Commit:** `feat(events): move deleted events to trash with restore`

### E-08 · Klien, kunci kueri, dan komponen bersama acara — LE-U · S7 · M · 1 hari · dep E-06
- **Target:** BARU `app/lib/events-api.ts`, `app/lib/events-format.ts` (waktu/kelompok, memakai `useTimeFormat`), `app/components/events/{EventRow,EventKindBadge,NoteBadge,ParticipantList}.tsx`; UBAH `app/routes.ts` (3 rute di bawah `layout('routes/app/layout.tsx')`), `app/routes/app/layout.tsx` (`NAV` + item **Event**, ikon, deskripsi).
- **Change:** Eden `client.api.app.events…`; lencana jenis = ikon+teks; kelompok waktu murni (menerima `now` dari SSR, tanpa `dayjs()` di klien).
- **Constraints:** `NAV` dan `routes.ts` milik integrator tunggal (edit hanya tambahan); ikon `1.25em`.
- **Acceptance:** `tests/app-routes.test.ts` hijau (guard `requireUser` di tiap loader baru); tes unit `events-format` (batas hari WIB).
- **Commit:** `feat(events): add events client helpers and nav entry`

### E-09 · Halaman Daftar Acara — LE-U · S7 · M · 1,25 hari · dep E-08 · PARALEL dgn E-10/E-11
- **Target:** BARU `app/routes/app/events.tsx` (≤150) + `app/components/events/EventList.tsx`.
- **Change:** loader SSR + `toJson` + react-query `initialData`; tab, kelompok, cari, saring, "Tampilkan lebih banyak"; empty state §4; kartu mobile.
- **Acceptance:** `tests/app/events-list.test.tsx` (render tab, kosong, grup, tombol hanya bila `caps.createEvent`), cek 375px (tanpa overflow horizontal).
- **Commit:** `feat(events): add events list page`

### E-10 · Form 2 tahap — LE-U · S7 · M · 1,5 hari · dep E-08 · PARALEL
- **Target:** BARU `app/routes/app/event-new.tsx`, `app/components/events/EventForm.tsx` (+ `EventFormDetails.tsx`), `app/components/events/ParticipantPicker.tsx`.
- **Change:** tahap 1 = persis 4 isian; "Tambahkan rincian" membuka tahap 2; validasi klien + galat server; setelah simpan ⇒ ke detail.
- **Acceptance:** `tests/app/event-form.test.tsx`: layar awal memuat tepat 4 isian; Pemantau tak melihat proyek di pilihan; jam selesai ≤ mulai ditolak dengan pesan; tombol `loading`.
- **Commit:** `feat(events): add two-stage event form`

### E-11 · Detail acara, peserta, notulensi, Agenda Beranda — LE-U · S7 · L · 2 hari · dep E-08 · PARALEL (H3 pasang di Beranda setelah S3)
- **Target:** BARU `app/routes/app/event-detail.tsx`, `app/components/events/{EventNotes,CancelEventModal,AgendaWidget}.tsx`, `useEventActions.tsx`; UBAH `app/routes/app/home.tsx` **hanya** oleh integrator S3.
- **Change:** detail §4; hapus = T1 (toast "Urungkan" ±10 dtk memanggil restore E-07); batalkan = modal alasan; `AgendaWidget` berdiri sendiri (maks 4).
- **Acceptance:** `tests/app/event-detail.test.tsx` (Urungkan memulihkan; konflik notulensi tak menghapus ketikan; peserta tak melihat tombol ubah), `tests/app/agenda-widget.test.tsx` (kosong/4 teratas).
- **Commit:** `feat(events): add event detail, notes and agenda widget`

### E-12 · Integrasi, README kontrak, CHANGELOG — Integrator · S7 · S · 0,75 hari · dep E-06..E-11 · ★ SP-E3
- **Target:** `README.md` (bagian kontrak API saja), `CHANGELOG.md`, `app/routes/app/home.tsx` (bila S3 sudah ada).
- **Change:** dokumentasi endpoint baru; poin `Added` per fitur; tidak menulis ulang narasi README (aturan global §16).
- **Acceptance:** `tests/readme-endpoint.test.ts` hijau (tanpa rahasia); `bun scripts/release-notes.ts` tidak rusak.
- **Commit:** `docs(events): document events api and changelog`

### E-15 · QA, smoke, uji gerbang S7 — LE-Q · S7 · M · 1,25 hari · dep E-12
- **Target:** `scripts/smoke-server.checks.ts`, `tests/smoke-server.test.ts`, BARU `tests/e2e-flow/events-gate.test.ts`.
- **Change:** pemeriksaan smoke `/app/events` (401 tanpa sesi), skenario gerbang §7 secara otomatis.
- **Acceptance:** `smoke:prod` + `smoke:binary` hijau; semua kriteria §7 punya tes bernama.
- **Commit:** `test(events): add events smoke and gate checks`

### Could (hanya setelah gerbang S7 Should hijau; migrasi terpisah)
- **E-13 Tugas dari rapat** — LE-S/LE-U · M · 2 hari · dep E-10, S2: tabel `event_outcome` (migrasi Could), `PUT /:id/outcomes`, `POST /:id/outcomes/confirm` (transaksi, `UPDATE … WHERE status='draft' RETURNING` mencegah ganda; penerima anggota non-Pemantau; gagal sebagian ⇒ tak ada tugas dibuat) memakai `server/task` yang ada. Tes: ganda klik, baris tak valid, viewer.
- **E-14 Kalender Bulan/Minggu** — LE-U · M · 2 hari · dep E-09: `GET /calendar?from&to` (maks 42 hari, 300 baris, `truncated`), grid `SimpleGrid cols={7}`, maks 3 chip + "N lagi"; Minggu = tujuh bagian daftar. Tes: batas bulan WIB, truncated.
- **E-16 Acara berulang** — LE-S · L · 3 hari · dep E-03: `event_series`, `topUpSeries(now)` 90 hari (jangkar, clamp tanggal 29-31), "Hanya yang ini/Semua"; tes top-up idempoten, tick tidak menggandakan.

## 7. Gerbang & kriteria demo (dapat diuji)
| # | Kriteria (R10 S7) | Bukti |
|---|---|---|
| G1 | Member membuat acara lewat form dua tahap; **layar awal ≤ 4 isian** | `tests/app/event-form.test.tsx`; demo manual |
| G2 | Peserta menerima pengingat **T-1 hari** dan **T-30 menit** di Inbox | `events.reminders.test.ts` (a)(c) dengan `now` disuntik |
| G3 | **Tick ulang tidak menggandakan** | `events.reminders.test.ts` (b) |
| G4 | **Pemantau tidak bisa membuat acara** di proyeknya | `event.policy.test.ts`, `app-events.test.ts` (403 `NOT_MEMBER`) |
| G5 | Notulensi diketik, disimpan, konflik tertangani | `events.notes.test.ts`, `event-detail.test.tsx` |
| G6 | Hapus acara ⇒ Sampah + **Urungkan** memulihkan | `events.trash.test.ts`, `event-detail.test.tsx` |
| G7 | Beranda menampilkan **Agenda** | `agenda-widget.test.tsx` (setelah S3) |
| G8 | **Daftar ≤ 3 query** | penghitung query di `events.query.test.ts` |
| G9 | Tiap rute `/api/app/events*` terpetakan scope; `smoke:prod`/`smoke:binary`/`typecheck`/`lint` hijau | `scopes.test.ts`, skrip smoke |
| G10 | Mobile 375px tanpa overflow; ukuran teks 1,5 tidak merusak | cek komponen + uji pengguna ringan (UP-2 **[ASUMSI]**) |
**Belum diverifikasi:** biaya tick (<1 ms, R07 asumsi); jam dinding WIB pada pengingat bila server di zona lain; kinerja `visibleEventsWhere` pada ribuan acara.

## 8. Risiko & mitigasi
| ID | Risiko | Kemungkinan / dampak | Mitigasi |
|---|---|---|---|
| R-E1 | `notify()`/`notifications` (S3a) belum ada saat S7 mulai | Sedang / Tinggi (E-04 terblokir) | Urutkan E-04 setelah S3a; E-01..E-03, E-05..E-11 jalan lebih dulu; dilarang membuat tabel sendiri; eskalasi ke baton |
| R-E2 | Sampah multi-jenis (S6) belum ada, E-07 menyentuh berkas yang sama | Sedang / Sedang | Ikuti pola `:kind` yang ada; pakai registri S6 bila sudah ada; satu pemilik `app-trash.ts` per waktu |
| R-E3 | Penambahan 3 URL melanggar kontrak beku | Pasti / Sedang | PCC/ADR di E-01 sebelum kode; jangan ubah daftar URL diam-diam |
| R-E4 | Pengingat ganda/hilang (restart, tick tumpang tindih, ubah jam) | Sedang / Tinggi | Klaim `ON CONFLICT` + kunci dedupe + grace; tes (a)-(g) |
| R-E5 | Kebocoran visibilitas (peserta mengintip acara proyek lain / email) | Rendah / Tinggi | `visibleEventsWhere` tunggal; DTO tanpa email/HP; tes "tak terlihat ⇒ 404" |
| R-E6 | Zona waktu keliru (WIB vs browser) | Sedang / Sedang | Semua penyimpanan UTC; "hari ini/besok" dari server (`APP_TIME_ZONE`); tidak ada `dayjs()` klien |
| R-E7 | Form 2 tahap terlalu berat untuk lansia | Sedang / Sedang | Tahap 1 ≤4 isian, tahap 2 opsional, uji pengguna ringan |
| R-E8 | Penumpukan tabrakan migrasi 0018 | Sedang / Tinggi | Satu pemegang baton; migrasi Could terpisah; tak ada nomor diklaim worker |

## 9. Kontradiksi baru & Dampak ke dokumen lain
| ID | Temuan | Default konservatif yang dipakai |
|---|---|---|
| K-E1 | R08 menamai tabel jamak (`events`, `event_participants`…) sedangkan kode `project`, `project_member`, `task` tunggal (`schema.project.ts:23,59`) | Pakai **tunggal** mengikuti kode (fondasi menang); R07 memakai `events(starts_at)`/`event_participants` — samakan lewat catatan di E-01 |
| K-E2 | R10 mencantumkan E1-E3 sebagai Should tetapi gerbang S7 menuntut "hapus acara masuk Sampah"; Sampah penuh baru S6 | E-07 menyiapkan jenis `event` sendiri bila S6 belum ada; tidak mengerjakan purge 30 hari |
| K-E3 | R08 membuat pembuat acara otomatis menjadi peserta **[ASUMSI]**; R07 Agenda hanya acara yang "saya ikuti" | Pembuat otomatis peserta (tanpa itu acara pembuat tak muncul di Agenda-nya) |
| K-E4 | R08 menyebut `notify()` per-event "event_changed" tanpa batas laju | Satu notifikasi per perubahan, digabung per jam lewat dedupe R07 |
| K-E5 | Q7 (PM bukan anggota hanya melihat) vs R08 (PM melihat semua acara ber-proyek) | PM melihat saja; tanpa hak ubah/notulensi kecuali Pengelola |
**Dampak ke dokumen lain (tidak diedit di sini):** `README.md` (bagian kontrak API) dan `CHANGELOG.md` oleh integrator (E-12); daftar kontrak/ADR `contract-v1` +3 URL; `KEPUTUSAN-MVP-INTI` — catat bahwa Event masuk setelah gerbang S2; `PROGRES.md` — tambah baris S7; `R10 §3.3` — kelonggaran S7 menurun bila E-04 menunggu S3a; `03-desain/erd/diskusi/05-events.md` — selisih nama tabel (K-E1).

## 10. Pertanyaan untuk user
| # | Pertanyaan | Saran |
|---|---|---|
| Q-E1 | Boleh S7 (Should) dikerjakan **sebelum** S6 selesai dengan E-07 menyiapkan Sampah-acara minimal? | **Ya**, seperti pola S1-18; purge 30 hari tetap S6 |
| Q-E2 | Boleh menambah 3 URL `/app/events*` ke `contract-v1` lewat PCC (16 URL)? | **Ya**; tanpa itu menu Event tak bisa dibuat |
| Q-E3 | Apakah acara tanpa proyek ("pribadi/tim") boleh dibuat semua role termasuk Member tanpa proyek? | **Ya**, tetapi hanya terlihat oleh pembuat + peserta |
| Q-E4 | Hapus/batalkan acara lewat API key dilarang (`PM_KEY_DENY`)? | **Ya** untuk hapus, **boleh** untuk batalkan; selaras X1-Q9 |
| Q-E5 | Apakah Could (E-13..E-16) dikerjakan di S7 atau digeser ke fase berikut? | **Geser**; mulai hanya jika Should lulus dan waktu tersisa |

## 11. Sumber
`../KEPUTUSAN-MVP-INTI.md` (§2 Q7/Q8/Q9, §3 X1-Q1/Q9) · `riset/R08-events-tim-sampah-pengaturan.md` (§3.0, §3.1, §3.5) · `riset/R07-beranda-inbox.md` (§3.5, §3.7, W6, katalog `event_*`) · `riset/R10-mvp-scope-roadmap.md` (§3.1 E1-E6/H3; §3.3 S7) · `riset/R11` (bahasa & lansia) · `rencana/P3-s1-s2-proyek-tugas.md` (konvensi tugas) · kode: `app/routes/app/layout.tsx:18-52`, `app/routes/app/home.tsx:14-45`, `server/api/app.ts:19-33`, `server/db/schema.columns.ts:9-50`, `server/db/schema.project.ts:23-79`, `server/access/{types,task.policy,capabilities,trash.policy}.ts`, `server/api/app-trash.ts`, `server/project/project-trash.service.ts:47-89`, `server/api-keys/{scopes,scopes.pm}.ts`, `server/settings-retention.ts:102-116`, `tests/contract-v1.test.ts:70-148`.
