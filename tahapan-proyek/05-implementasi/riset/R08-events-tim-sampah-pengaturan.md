# R08 — Events, Tim, Sampah, Pengaturan (modul penutup MVP)

> 15 Oktober 2026 · branch `feature/project-management` · riset saja, tidak ada kode yang diubah.
> Acuan: `tahapan-proyek/03-desain/erd/diskusi/{05,07,08,09}`, `erd/{user-profile,project,task}.md`, `00-role-dan-area.md`. Bila bentrok dengan kode yang berjalan, kode menang.
> Penanda: **[ASUMSI]** = belum diverifikasi; **[UBAH]** = usulan menyimpang dari desain yang ada.

## 1. Ringkasan eksekutif

1. **Pengaturan tim memakai `app_setting` yang ada**, bukan tabel `workspace_settings` baru. Tambah modul `server/settings-workspace.ts` dengan pola `settings-demo.ts`. Hanya 1 kolom yang perlu di MVP: `event_default_reminders`.
2. **Events** (paling besar): 5 tabel MVP (`events`, `event_series`, `event_participants`, `event_notes`, `event_reminders`) plus `event_outcomes` untuk "tugas dari rapat" manual. Foto/suara/AI dan Google Calendar ditunda, tetapi kolom pintunya sudah disiapkan.
3. **Pengulangan: baris dibuat nyata** (materialisasi) dengan horizon bergulir 90 hari, bukan dihitung saat baca. Semua pembaca (Daftar, Kalender, Tim, pengingat) tetap kueri rentang biasa.
4. **Pengingat** lewat timer di proses (pola `startRetentionScheduler`), tanpa antrean baru. Idempoten antar-instance dengan `INSERT ... ON CONFLICT DO NOTHING` pada `event_reminders`.
5. **Tim** tanpa tabel baru: 4 kueri agregat tetap per halaman (tanpa N+1). Visibilitas beban (D10) ditegakkan di SQL lewat himpunan "proyek yang saya kelola", bukan di UI. Cuti ditunda, dengan satu titik sambung (`team.availability.ts`) agar tidak rusak.
6. **Sampah**: satu daftar `UNION ALL` proyek/tugas/event, pulihkan berantai lewat `deleted_with_project_id` (dan `deleted_with_series_id` untuk event berulang), purge 30 hari per jam (pola `demo/cleanup.ts`) dan objek S3 dihapus dulu. Hapus permanen khusus Admin.
7. **Pengaturan** meleburkan `/profile`: tabel baru `profiles` (PK = `user_id`, tanpa `full_name`/`avatar_url` karena sudah ada di `user.name`/`user.image`). `/profile` tetap hidup sebagai redirect ke `/app/settings`. Ukuran teks via `--mantine-scale` di `<html>`, bukan di pembungkus (jebakan token, §3.4).
8. **Peringatan di luar lingkup**: `bun audit` melaporkan 1 critical (`proxy-addr`) dan 2 high; perlu disampaikan ke user sesuai aturan audit dependensi (§2.3).
9. Estimasi total **22–33 hari-orang AI** + 4–7 hari reviewer; 9 pertanyaan terbuka (§6).

## 2. Temuan

### 2.1 Fondasi kode yang dibaca

| # | Temuan | Bukti |
|---|---|---|
| F1 | `app_setting` = baris tunggal `id='singleton'`, cache 5 dtk, ditulis lewat `upsertSettingsRow`. Setiap domain (demo, retensi, branding, maintenance, fitur) punya modul `settings-*.ts` sendiri yang membaca baris yang sama | `server/settings.core.ts:10-34`, `server/settings-demo.ts:1-29`, `server/db/schema.app.ts:32-72` |
| F2 | Kolom `app_setting` memakai `NULL = pakai bawaan` untuk nilai opsional (pola yang cocok untuk `event_default_reminders`) | `schema.app.ts:38-44` |
| F3 | Feature flag disimpan sebagai satu array jsonb dan ditulis dengan baca-ubah-tulis seluruh array, rawan balapan bila dipakai untuk saklar Admin | `server/settings-features.ts:47-60` |
| F4 | Pola scheduler: `setInterval(tick, 1 jam).unref()` + `setTimeout(tick, 15-20 dtk)`, `try/catch` + `logger.warn`, dimulai hanya bila `NODE_ENV !== 'test'`. Hapus massal per `BATCH=500` | `server/settings-retention.ts:101-118`, `server/demo/cleanup.ts:8-44`, `server/api/index.ts:43-48` |
| F5 | `runRetention(trigger, now)` menerima `now` → scheduler bisa diuji tanpa menunggu waktu | `settings-retention.ts:70-73`, `tests/settings-retention-scheduler.test.ts` |
| F6 | `/api/app` sudah punya `derive actor` + 401; file baru 36 baris. Batas handler 150 baris → tiap fitur harus jadi plugin Elysia sendiri | `server/api/app.ts:10-36`; pola plugin bersarang `server/api/settings-ops.ts:18-19` |
| F7 | Scope API key untuk `/api/app/*` sudah otomatis (`app:read`/`app:write`); rute di luar itu butuh pemetaan. `ROLE_RANK` masih 3 role | `server/api-keys/scopes.ts:166`, `:122` |
| F8 | Halaman `/profile` sudah ada: nama (via `authClient.updateUser`), foto (`/api/app/avatar`), kartu sandi/akun tertaut/sesi/API key/riwayat login/hapus akun. Tidak ada tabel `profile` | `app/routes/app/profile.tsx:38-93`, `app/components/profile/ProfileForm.tsx:36`, `server/db/schema*.ts` (grep `profile` kosong) |
| F9 | Foto diunggah langsung ke `user.image` (`db.update(user)`); `user.name` = nama lengkap | `server/api/app-avatar.ts:93,104`, `schema.auth.ts:8-14` |
| F10 | Rujukan `/profile` ada di: 3 NAV (`app/routes/app/layout.tsx:20`, `admin/layout.tsx:19`, `super/layout.tsx:152`), `LinkedAccountsCard.tsx:44` (callbackURL), `server/seo.ts:16`, `tests/seo.test.ts:12`, `tests/settings-domains.test.ts:74-78` | grep |
| F11 | Kontrak test: setiap file anak `routes/app/` wajib memanggil `requireUser/requireAnyRole/requireRole(request` di loader — termasuk file yang hanya redirect | `tests/app-routes.test.ts:36-39` |
| F12 | Mantine: semua ukuran dipakai sebagai `calc(x * var(--mantine-scale))`; `theme.scale` tersedia | `node_modules/@mantine/core/styles.css` (ratusan pemakaian, termasuk token `--mantine-font-size-md: calc(1rem * var(--mantine-scale))`), `esm/core/MantineProvider/MantineCssVariables/default-css-variables-resolver.mjs:22` (`--mantine-scale` ← `theme.scale`), `theme.types.d.ts:10-13`; `app/lib/theme.ts:8` kosong; provider `app/root.tsx:101` |
| F13 | Pola cookie preferensi terbaca SSR sudah ada (sidebar) dan zona waktu klien lewat cookie `tz`; `/go` adalah resolver pasca-login | `server/sidebar.ts:1-12`, `app/lib/time-format.ts:13-31`, `app/routes/go.tsx:9-11`, `server/guard.ts:102-106` |
| F14 | Tidak ada paket tanggal: `@mantine/dates`, `dayjs` tidak ada di `package.json`. Registry: `@mantine/dates` 9.7.2, MIT, peer **`@mantine/core` 9.7.2** persis; terpasang `@mantine/core` 9.6.0 | `package.json` (grep), `curl registry.npmjs.org/@mantine/dates/latest`, `node_modules/@mantine/core/package.json` |
| F15 | `/dashboard` baru placeholder 1 komponen; `AuditTargetType` adalah union tertutup | `app/routes/admin/dashboard.tsx:9-21`, `server/audit.ts:40` |
| F16 | Tabel template bernama tunggal (`post`, `login_log`, `app_setting`); ERD desain bernama jamak (`events`, `tasks`). Semua id `text`, kolom waktu lama `timestamp` tanpa zona | `schema.app.ts:6,32`, `schema.logs.ts` |

### 2.2 Selisih desain vs fondasi (kode menang)

| Desain | Fondasi | Tindakan |
|---|---|---|
| `profiles.full_name`, `avatar_url` (`user-profile.md`) | `user.name`, `user.image` sudah ada dan dipakai upload foto (F9) | **[UBAH]** buang dua kolom itu dari `profiles`; tidak ada biaya migrasi (tabel belum ada) |
| `profiles.id uuid` + `user_id` unik | id `text` (brief) | PK = `user_id` (1:1) |
| `workspace_settings` (09 §4) | `app_setting` + modul `settings-*` (F1) | **[UBAH]** pakai ulang (§3.4) |
| Pengaturan tim ada di halaman Pengaturan Admin (09 #1,#6) | `00-role-dan-area.md` §2: Pengaturan tim di `/dashboard` | `00` menang: kartu tautan di `/app/settings`, formulir di `/dashboard/settings` |
| `uuid` untuk id | `text` + `crypto.randomUUID()` | ikuti brief |
| Event berulang: 05 #19 "ini dan seterusnya" vs 08 #12 "seluruh rangkaian" | — | bertentangan di dokumen; pilih "ini dan seterusnya" (Q1) |
| Nama tabel jamak (ERD) vs tunggal (F16) | — | dokumen ini ikut ERD (jamak); aturan final milik riset skema lintas modul |

### 2.3 Di luar lingkup tetapi wajib dilaporkan

`bun audit` hari ini: **7 kerentanan (1 critical, 2 high, 4 moderate)**: critical `proxy-addr` IP spoofing (GHSA-jqcg-44mw-7w3h), high `source-map-js` (GHSA-68fv-2mgg-jv7q), high MCP TypeScript SDK (GHSA-6qxp-vccf-f47h). Belum diperiksa apakah `proxy-addr` dipakai jalur `server/middleware/client-ip.ts` **[ASUMSI: belum dibaca]**; ini memengaruhi rate limit/log IP, bukan modul R08.

## 3. Rekomendasi

### 3.0 Keputusan lintas modul

| Keputusan | Alasan | Ditolak |
|---|---|---|
| Kolom enum baru = `text` + konstanta TS + `CHECK`, bukan `pgEnum` | `user.role` sudah `text`; menambah nilai `pgEnum` lewat migrasi drizzle repot dan nilai AI mendatang (`decision`, `voice`) perlu ditambah | `pgEnum` |
| Zona waktu server `APP_TIMEZONE` (env, bawaan `Asia/Jakarta`) hanya untuk: jam dinding pengulangan, "hari ini" untuk `due_date`, batas hari Kalender. Tampilan tetap zona browser (F13) **[ASUMSI]** | Indonesia tanpa DST → aritmetika jam dinding aman; satu aturan | zona per pengguna |
| Kolom hapus lunak mengikuti 08 #11 apa adanya, plus `deleted_with_series_id` | cukup, tidak mengubah yang sudah disetujui | `deleted_batch_id` tunggal (lebih ringkas, tetapi menyimpang dari yang disetujui user 13 Okt) |
| Tanggal: pakai `@mantine/dates` (lintas modul, bukan hanya R08) | `<input type=date>` native dilarang `CLAUDE.md` (Mantine wajib) | menulis picker sendiri |

Catatan F14: menambah `@mantine/dates@9.7.2` memaksa `@mantine/core`/`hooks` naik ke 9.7.2 (peer persis) dan menarik `dayjs`. Putusan paket milik riset UI/lintas modul; R08 hanya mensyaratkannya. Lisensi MIT.

### 3.1 Events

**Potongan MVP vs ditunda**

| MVP | Ditunda (kolom/pintu sudah disiapkan) |
|---|---|
| CRUD event, form dua tahap (05 #13), peserta, jenis (5 nilai tetap), proyek opsional, lokasi/tautan | Foto ✦ dan Suara ✦ (tabel `event_note_sources`, izin rekam, penyimpanan 30 detik, upload mp3/m4a/wav) |
| Daftar (Akan datang/Sudah lewat, cari, Filter) + Kalender Bulan | Kalender Minggu berbasis grid jam (MVP: tombol Minggu = 7 bagian harian berupa daftar) |
| Batalkan (alasan) dan Hapus ke Sampah, termasuk berulang (Hanya yang ini / Ini dan seterusnya) | Ubah **seluruh rangkaian** (MVP: Ubah = hanya kejadian ini, ditandai `is_exception`); sinkron Google Calendar |
| Ulangi: Tidak/Mingguan/2 mingguan/Bulanan, tanpa tanggal akhir, horizon bergulir | Tanggal akhir pengulangan, pola kustom |
| Pengingat in-app 1 hari + 30 menit (bawaan dari `app_setting`) | Email/push, jam tenang |
| Notulensi **Ketik** (teks), badge Belum ada/Draf/Dikonfirmasi (N tugas) | Pilah AI → keputusan/informasi/pertanyaan (nilai `kind` disiapkan, UI hanya `task`), `evidence_quote`, `is_note_taker` |
| "Tugas dari rapat" **manual** (⑥): tambah baris tugas → **Buat N tugas** (butuh proyek) | Batch urungkan 24 jam untuk hasil AI (workflow F15) |

Alasan memasukkan ⑥ manual: itu satu-satunya keluaran rapat yang punya efek lanjutan (nilai "rapat → eksekusi", A1 E13); tabel `event_outcomes` yang sama kelak diisi AI sebagai `status='draft'`, `source='ai'`, jadi layar ⑥ tidak ditulis ulang.

**Tabel** (id `text` PK default `crypto.randomUUID()`; waktu `timestamptz`; FK `users` = `user.id`)

| Tabel | Kolom penting | Indeks / aturan |
|---|---|---|
| `events` | `project_id` null FK `projects` SET NULL · `series_id` null FK · `original_starts_at` null · `is_exception` bool=false · `title` ≤150 · `kind` text=`meeting` (`meeting\|review\|important\|team\|other`) · `starts_at`,`ends_at` · `location_type` (`offline\|online`) · `location_text` ≤200 · `meeting_url` · `agenda` · `reminders_minutes int[]` · `canceled_at`,`cancel_reason`,`canceled_by` · `created_by` (SET NULL) · `deleted_at`,`deleted_by`,`deleted_with_project_id`,`deleted_with_series_id` · `created_at`,`updated_at` | CHECK `ends_at > starts_at`; `(starts_at) WHERE deleted_at IS NULL`; `(project_id, starts_at)`; `(created_by)`; UNIQUE `(series_id, original_starts_at)` (cegah ganda saat top-up); parsial `(deleted_at) WHERE deleted_at IS NOT NULL` |
| `event_series` | `rule` (`weekly\|biweekly\|monthly`) · `anchor_starts_at` · `generated_until` · `stopped_at` · `created_by` · `deleted_at`,`deleted_by` | satu baris per rangkaian; bukan templat (templat = kejadian terbaru ber-`is_exception=false`) |
| `event_participants` | PK `(event_id, user_id)` · `added_at` | indeks `(user_id, event_id)`; pembuat otomatis jadi peserta **[ASUMSI]** |
| `event_notes` | `event_id` UNIQUE · `body` text · `status` (`draft\|confirmed`, nilai `waiting_confirm` dicadangkan AI) · `written_by` · `updated_at` | kunci optimis lewat `baseUpdatedAt` (409 `NOTE_CONFLICT` + isi terbaru) |
| `event_outcomes` | `event_id` · `kind`=`task` · `text` · `assignee_id` · `due_date` date · `status` (`draft\|confirmed\|discarded`) · `source`=`manual` (`manual\|ai`) · `task_id` · `confirmed_by`,`confirmed_at` · `created_by` | indeks `(event_id)`; `task_id` unik bila terisi |
| `event_reminders` | PK `(event_id, offset_minutes)` · `claimed_at` · `delivered_count` | pemenang `INSERT ... ON CONFLICT DO NOTHING RETURNING` yang membuat notifikasi |

Nilai dihitung, bukan disimpan: status Akan datang/Berlangsung/Selesai/Dibatalkan, badge notulensi, grup Hari ini/Besok/Minggu ini/Nanti (dikelompokkan di klien dengan jam SSR yang sama, `useTimeFormat`, `time-format.ts:60+`).

**Pengulangan: hasilkan baris vs hitung saat baca → baris nyata**

| | Baris nyata (dipilih) | Hitung saat baca |
|---|---|---|
| Notulensi/peserta/hasil per kejadian | `event_id` biasa | harus "materialisasi saat disentuh" |
| Daftar, Kalender, Tim "Sedang rapat", pengingat | satu kueri rentang berindeks | semua pembaca menggabung baris nyata + virtual, kursor halaman rumit |
| Biaya | top-up berkala + risiko ganda | kompleksitas tersebar di tiap pembaca |

Aturan: saat dibuat → 13 (mingguan) / 7 (2 mingguan) / 3 (bulanan) kejadian pertama sekaligus. `topUpSeries()` (tick per jam) mengisi sampai `now + EVENT_SERIES_HORIZON_DAYS` (90, konstanta bernama). Kejadian ke-k dihitung dari **jangkar** (`anchor + k × interval`), bukan dari kejadian sebelumnya, supaya tidak melenceng; bulanan tanggal 29-31 di-clamp ke hari terakhir bulan. Salinan bidang dari kejadian terbaru yang bukan pengecualian (judul, lokasi, peserta, pengingat).

**Pengingat tanpa antrean baru**: `startEventReminderScheduler()` di `server/events/events.reminders.ts`, tick `EVENT_REMINDER_TICK_MS=60_000`, dimulai di `server/api/index.ts` di samping 3 scheduler lain. Per tick: ambil event (`deleted_at IS NULL`, `canceled_at IS NULL`, `starts_at` dalam `now … now + max(offset)`), untuk tiap offset yang jatuh tempo → klaim di `event_reminders`; bila terklaim dan `now − (starts_at − offset) ≤ REMINDER_GRACE_MS` (15 mnt) → `notify()` ke peserta yang tidak mematikan `event_reminder` (satu kueri preferensi massal). Lewat grace = terklaim tanpa kirim (cegah "1 hari sebelum" muncul 5 menit sebelum mulai setelah server mati). Fungsi murni menerima `now` (seperti F5) agar uji deterministik.

**Daftar dan Kalender**: Daftar = kursor `(starts_at,id)`, `limit` bawaan 30, maks 100; tab Akan datang `ends_at >= now` asc, Sudah lewat desc. Kalender = rentang `from`/`to` maksimum 42 hari, batas 300 baris, `truncated:true` bila terpotong; grid bulan dari primitif Mantine (`SimpleGrid cols={7}`), tiap sel maks 3 chip + "N lagi". Satu warna abu-abu (05 #15). Library kalender (FullCalendar, react-big-calendar) ditolak: berat dan gayanya tidak dipaksa mengikuti Mantine.

**Notulensi dan pintu AI**: `PUT /events/:id/note` hanya menulis teks. Pintu AI = (a) `event_outcomes.status='draft'|source='ai'`, (b) `event_notes.status='waiting_confirm'`, (c) tabel `event_note_sources` ditambah nanti lewat migrasi aditif, (d) saklar `ai` lewat feature flag/kolom nanti, (e) nama rute dicadangkan `POST /events/:id/note/transcribe` (belum ada; tidak boleh 501 kosong). Tidak ada audio, jadi tidak ada PII rekaman di MVP (D3 tidak terpicu).

**Endpoint** (plugin `server/api/app-events.ts`, prefix `/api/app/events`; scope otomatis `app:*`)

| Metode · Path | Fungsi | Izin (server menghitung `can{}` untuk UI) |
|---|---|---|
| GET `/` `?tab&projectId&kind&q&cursor&limit` | daftar | visibilitas §kasus tepi |
| GET `/calendar` `?from&to&projectId&kind` | kalender | idem |
| GET `/people` `?q&projectId` | kandidat peserta (nama+jabatan saja) | semua |
| GET `/:id` | detail + peserta + catatan + hasil + info rangkaian + `can{}` | lihat |
| POST `/` | buat (+rangkaian bila `recurrence`) | semua role; proyek hanya Anggota/Pengelola |
| PATCH `/:id` | ubah (hanya kejadian ini) | Admin; pembuat; Pengelola proyek |
| POST `/:id/cancel` `{reason, scope}` | batalkan + beri tahu peserta | idem |
| DELETE `/:id` `?scope=this\|onward` | ke Sampah, mengembalikan `{trash:{kind,id,label}}` untuk toast Urungkan | idem |
| PUT `/:id/note` `{body, baseUpdatedAt}` | simpan notulensi | peserta, pembuat, Pengelola, Admin |
| PUT `/:id/outcomes` | simpan draf baris tugas | pembuat, Pengelola, Admin |
| POST `/:id/outcomes/confirm` | **Buat N tugas** (transaksi, `UPDATE … WHERE status='draft' RETURNING` mencegah ganda) | pembuat, Pengelola proyek, Admin; wajib `project_id` |

**Kasus tepi Events**
1. Visibilitas satu kueri (tanpa N+1): `Admin OR created_by=me OR EXISTS(peserta=me) OR project_id IN (proyek yang saya ikuti)`; PM: ditambah semua event ber-proyek. Bantu `visibleEventsWhere(actor)` dipakai Daftar, Kalender, Detail.
2. Pilihan proyek di form: hanya proyek tempat saya Anggota/Pengelola (bukan Pemantau); proyek di Sampah tidak muncul dan ditolak server (422).
3. Event di proyek yang dihapus ikut ke Sampah (cascade); event yang proyeknya di Sampah tidak bisa dipulihkan sendiri (§3.3).
4. Event lewat tengah malam, peserta dihapus dari tim, dan `ends_at` sebelum `starts_at` → CHECK + 422 dengan pesan Indonesia.
5. Membatalkan tidak menghapus pengulangan lain; "Batalkan semua" mengisi `canceled_at` untuk kejadian ≥ ini dan menghentikan top-up (`stopped_at`).
6. Mengubah jam "hanya yang ini" menjaga `original_starts_at` (kunci unik tetap) dan `is_exception=true`.
7. Dua orang menulis notulensi bersamaan → 409 `NOTE_CONFLICT`, UI menawarkan "Muat versi terbaru" tanpa kehilangan ketikan.
8. Tugas dari rapat: penerima harus anggota non-Pemantau proyek; baris gagal divalidasi → daftar baris bermasalah, tak ada tugas dibuat sebagian.
9. Rapat berlangsung tanpa notulensi → badge "Belum ada"; event dibatalkan menyembunyikan tombol notulensi.
10. Pengingat untuk event yang diubah waktunya: `event_reminders` untuk event itu dihapus saat `starts_at` berubah agar dihitung ulang.

### 3.2 Tim

**MVP vs ditunda**: MVP = daftar orang, ringkasan satu baris, filter proyek, cari nama, urut (Nama / Terlambat terbanyak), detail orang, ketersediaan **Tersedia / Sedang rapat**, layar kosong Member. Ditunda: Cuti (`leave_requests`, kartu Inbox 06 #13, saklar "Cuti perlu persetujuan"), kapasitas tertimbang, heatmap, saran rebalancing (07 #4).

**Tabel**: tidak ada. Kebutuhan indeks pada modul lain (usulan ke pemilik Tugas/Proyek): `tasks(project_id, assignee_id) WHERE deleted_at IS NULL AND status IN ('todo','in_progress','in_review')`, `project_members(user_id)`, `project_members(project_id, role)`.

**Kueri (4 per halaman, tidak bergantung jumlah orang)**
1. Orang (berhalaman, `limit` 50, offset karena tim kecil dan batas jelas): Admin → semua pengguna disetujui dan tidak diblokir; lainnya → `DISTINCT pm2.user_id` dari proyek yang saya ikuti (proyek tak di Sampah).
2. Peran per proyek bersama: satu kueri `project_members JOIN projects` untuk `pageIds`, digabung di memori.
3. Beban (D10 ditegakkan di sini, bukan di UI):
```sql
WITH mgr AS (SELECT project_id FROM project_members WHERE user_id=$me AND role='manager')
SELECT t.assignee_id,
  count(*) FILTER (WHERE $isAdmin OR t.project_id IN (SELECT project_id FROM mgr))                       AS active,
  count(*) FILTER (WHERE ($isAdmin OR t.project_id IN (SELECT project_id FROM mgr)) AND t.due_date<$today) AS overdue,
  bool_or(NOT $isAdmin AND t.project_id NOT IN (SELECT project_id FROM mgr))                              AS also_elsewhere
FROM tasks t JOIN projects p ON p.id=t.project_id AND p.deleted_at IS NULL
WHERE t.assignee_id = ANY($pageIds) AND t.deleted_at IS NULL AND t.status IN ('todo','in_progress','in_review')
GROUP BY t.assignee_id
```
   Member biasa: `pageIds` diganti `[me]` untuk beban. Super-admin = Admin. Peran akun PM **tidak** menambah hak (D10 mengikuti peran di proyek).
4. Ketersediaan: `event_participants JOIN events` dengan `starts_at <= now <= ends_at`, tidak dibatalkan/dihapus, untuk `pageIds`; ditambah sumber cuti (kosong di MVP).

Ringkasan: jumlah orang, tugas aktif, terlambat dari proyek yang dipilih; bagi Member = agregat proyek (bukan per orang). Respons **tidak memuat** `active/overdue/alsoElsewhere` untuk baris yang tak boleh dilihat (bukan disembunyikan CSS) → uji kontrak per peran.

**Endpoint** (`server/api/app-team.ts`, `/api/app/team`)

| Metode · Path | Isi |
|---|---|
| GET `/` `?projectId&q&sort=name\|overdue&offset&limit` | `{summary, people[{id,name,jobTitle,roles[],availability,load?}], total}` |
| GET `/:userId` | profil publik (nama, jabatan, divisi, email), proyek bersama + peran, `tasks[]` (maks 20, terlambat dulu) **hanya** bila berhak; selain itu `tasksHidden:true` |

Ketersediaan `'available' \| 'in_meeting' \| 'on_leave'`; `on_leave` ada di tipe tetapi belum pernah dihasilkan.

**Jejak cuti agar tidak rusak**: (1) `server/team/team.availability.ts` punya `resolveAvailability(ids, now)` dengan antarmuka `leaveSource` yang di MVP mengembalikan peta kosong, berkomentar `TODO(cuti): sumber leave_requests belum ada — fase 5, lihat 09-pengaturan #9-12`; (2) lencana UI sudah menangani `on_leave` dan teks "Pengajuan cuti …"; (3) **tidak** menambah `profiles.away_until` (sudah digantikan `leave_requests`, 09 §4); (4) Pengaturan MVP tidak menampilkan kartu Ketersediaan; (5) uji kontrak memastikan tipe respons memuat `on_leave`.

**Kasus tepi**: orang tanpa tugas → `load` 0 (LEFT JOIN, bukan hilang); tugas di proyek Sampah tidak dihitung; pengguna `banned`/belum disetujui tidak tampil **[ASUMSI: kolom status akun dari riset auth]**; assignee non-anggota (keluar dari proyek) tetap dihitung di proyek itu untuk Pengelola; Pengelola di proyek A dan Anggota di B melihat beban hanya dari A + tanda "juga di proyek lain"; `due_date` dibandingkan dengan tanggal `APP_TIMEZONE`; PM yang bukan anggota proyek (A1) tidak muncul di Tim proyek itu.

### 3.3 Sampah

**MVP**: daftar lintas entitas, penyaring Semua/Proyek/Tugas/Event + jumlah, Pulihkan, Urungkan (toast), Hapus permanen (Admin), purge otomatis 30 hari. **Ditunda**: pesan Urungkan untuk komentar/bukti di layar detail tugas (08 §5 masih terbuka; kolom `deleted_at` di `task_comments/task_attachments` sudah ada), pulihkan massal.

**Kolom pada tabel modul lain** (disetujui 08 #11; ditulis ke ERD saat digambar): `projects.deleted_by`; `tasks.deleted_by`, `tasks.deleted_with_project_id`; `events.deleted_by`, `events.deleted_with_project_id`, `events.deleted_with_series_id`; `event_series.deleted_at/by`. Indeks parsial `(deleted_at) WHERE deleted_at IS NOT NULL` dan `(deleted_with_project_id) WHERE ... IS NOT NULL` per tabel.

**Aturan berantai**
| Aksi | Efek (satu transaksi) |
|---|---|
| Hapus proyek P | `projects`: `deleted_at=T, deleted_by`; `UPDATE tasks/events SET deleted_at=T, deleted_by, deleted_with_project_id=P WHERE project_id=P AND deleted_at IS NULL` |
| Pulihkan proyek P | kosongkan 3 kolom pada proyek, lalu `tasks/events WHERE deleted_with_project_id=P` → kosongkan. Tugas/event yang dihapus sendiri sebelumnya **tidak** ikut (08 #4) |
| Pulihkan tugas/event yang proyeknya di Sampah | ditolak 409 `PROJECT_IN_TRASH` + `{projectId,name}` untuk tautan "Lihat proyeknya" (08 #14); tombol nonaktif di UI |
| Hapus event berulang "ini dan seterusnya" | kejadian `starts_at >= ini` → `deleted_at=T, deleted_with_series_id=S`; `event_series.deleted_at=T`, `stopped_at=T`. Kejadian lampau tetap hidup (notulensinya aman). Tampil di Sampah **satu baris** "Sprint review Atlas (tiap 2 minggu)" |
| Pulihkan rangkaian | kejadian dengan `deleted_with_series_id=S` kembali; `stopped_at`/`deleted_at` dikosongkan; top-up lanjut. Kejadian yang waktunya sudah lewat muncul di "Sudah lewat" |
| Urungkan (toast) | sama dengan Pulihkan item itu (endpoint yang sama) |

Pulihkan mengembalikan data apa adanya (status tugas tidak diubah saat dihapus, 08 #8); `number` tugas tetap.

**Visibilitas** (satu kueri `UNION ALL`, kursor `(deleted_at DESC, kind, id)`, `limit` 30): Admin semua; PM `deleted_by=me OR project_id IN (proyek yang saya kelola)` (proyek: `id IN kelola`); Member `deleted_by=me`. Daftar hanya memuat `deleted_at > now − TRASH_RETENTION_DAYS`. Jumlah per jenis dari satu kueri `count(*) FILTER`. "Termasuk N tugas dan M event" = subkueri berindeks pada ≤30 baris halaman. Pulihkan: Admin semua; Pengelola di proyeknya; Anggota hanya yang ia hapus; Pemantau tidak (08 #7).

**Purge** (`server/trash/trash.purge.ts`, pola `demo/cleanup.ts`): tick per jam, `TRASH_RETENTION_DAYS=30` (konstanta; asumsi A2). Urutan per batch ≤500: pilih item kedaluwarsa → hapus objek S3 terkait (lampiran tugas, kelak audio) → bila objek gagal terhapus, **lewati item itu** dan coba lagi tick berikutnya → hapus baris eksplisit anak→induk (tasks, events, lalu proyek) tanpa mengandalkan FK. Tanpa `storageEnabled()` objek dilewati. Bebas-state (tanpa kolom `lastRun`), idempoten antar-instance. Komentar/lampiran lunak-terhapus ikut dibersihkan dengan job yang sama (kebutuhan untuk pemilik modul Tugas).

**Endpoint** (`server/api/app-trash.ts`, `/api/app/trash`)

| Metode · Path | Fungsi |
|---|---|
| GET `/` `?kind=all\|project\|task\|event&cursor&limit` | `{items[{kind,id,label,projectName,deletedBy,deletedAt,daysLeft,counts?,canRestore,blockedBy?,canPurge}], counts, nextCursor}` |
| POST `/:kind/:id/restore` | 200 / 403 / 404 / 409 `PROJECT_IN_TRASH` / 410 `EXPIRED` |
| DELETE `/:kind/:id` | Admin saja (403 untuk lainnya), permanen; di-`audit()` sebagai `trash.purge` (perlu `'trash'` pada `AuditTargetType`, `audit.ts:40`, dan label di `ACTION_META`) |
Rute hapus lunak tetap milik modul masing-masing dan mengembalikan `{trash:{kind,id,label}}`. Fungsi bersama `moveToTrash/restoreFromTrash` ada di `server/trash/trash.cascade.ts`.

**Kasus tepi**: (1) `daysLeft = max(0, ceil((deleted_at + 30 hari − now)/hari))`; item kedaluwarsa disaring dari daftar **dan** ditolak pulihkan (410) walau scheduler mati; (2) balapan pulihkan vs purge → `UPDATE … WHERE deleted_at > cutoff RETURNING`, 0 baris = 410; (3) dua Admin memicu hapus permanen sama → idempoten (404 kedua); (4) tulis ke proyek di Sampah (tab basi, API key) ditolak 409 di service tugas/event; (5) tugas dihapus sendiri hari ke-0, proyek dihapus hari ke-10 → tugas hilang hari ke-30 sementara proyek hari ke-40; (6) pemulih tidak perlu jadi anggota bila Admin; (7) pesan hapus permanen memakai jumlah dari item; (8) `lead_id` proyek yang penggunanya sudah dihapus → pulihkan gagal 409 `LEAD_MISSING` **[ASUMSI: FK akan dibuat RESTRICT oleh modul Proyek]**.

### 3.4 Pengaturan

**Peleburan `/profile`**: halaman baru `app/routes/app/settings.tsx` (rute `app/settings`, `meta` "Pengaturan — Simple PM", loader `requireUser`). `profile.tsx` diubah menjadi redirect yang **tetap memanggil `requireUser(request)`** (F11) sehingga tautan lama hidup. Ganti 3 NAV (F10) dan `callbackURL`. Komponen dipakai ulang, tidak ditulis ulang: `AvatarField`, `SettingsCard`, `SessionsCard`, `LoginHistoryCard`, `ApiKeysCard`.

| Bagian halaman | Isi MVP |
|---|---|
| Akun saya | foto (reuse), nama lengkap (`user.name`), nama panggilan, jabatan, divisi, HP, email (hanya baca) |
| Tampilan | 3 tombol besar Normal/Besar/Sangat besar + contoh tulisan |
| Pemberitahuan | saklar Pengingat acara, Kabar terbaru di Inbox; kartu "Perlu Anda tanggapi" tidak bisa dimatikan |
| Pengaturan tim | **hanya Admin/super-admin**: kartu tautan ke `/dashboard/settings` |
| Keamanan dan perangkat (lipat) | sesi, riwayat login, API key; Sandi dan Akun tertaut hanya bila `emailAuthEnabled`; kartu Hapus akun disembunyikan (Q7) |
| Keluar | tombol + `modals.openConfirmModal` (wajib UX) |

Ditunda: Ketersediaan/Cuti, Mode Pendamping (09 #8), Peran dan izin (hanya baca) — alasan: matriks belum stabil (asumsi A1–A10 modul lain belum dikonfirmasi) sehingga tabel statis akan basi; AI & Data, Lama simpan rekaman.

**Tabel `profiles`** (lazy: tidak ada baris = bawaan; dibuat saat simpan pertama dengan `INSERT … ON CONFLICT (user_id) DO UPDATE`; tidak perlu hook Better Auth maupun backfill)

| Kolom | Tipe | Catatan |
|---|---|---|
| `user_id` | text PK, FK `user.id` ON DELETE CASCADE | 1:1 |
| `display_name` | varchar(50) null | panggilan; kosong → kata pertama `user.name` |
| `phone` | varchar(20) null | regex `^[0-9+()\-\s]{6,20}$`, `inputMode="tel"`; **tidak** masuk log, `audit.meta`, maupun respons Tim |
| `job_title`, `department` | varchar(100) null | tampil di Tim |
| `text_size` | text NOT NULL default `normal` | `normal\|large\|xlarge` **[UBAH ringan]**: ERD menulis `besar/sangat_besar`; Inggris agar sejajar enum lain; CHECK |
| `created_at`,`updated_at` | timestamptz | |

Ditolak: `additionalFields` Better Auth pada `user` (menyentuh skema yang dibuat `auth:generate`, `schema.auth.ts:1-2`) dan tabel `profiles` dengan `id` terpisah.

**Ukuran teks**: faktor `TEXT_SIZE_SCALE = { normal:1, large:1.125, xlarge:1.25 }` **[ASUMSI: nilai perlu uji ke 2–3 pengguna, 09 Q3]**. **Jebakan** (token terverifikasi di F12, perilaku CSS-nya analisis): token seperti `--mantine-font-size-md: calc(1rem * var(--mantine-scale))` dideklarasikan di `:root`, jadi nilainya sudah dihitung di sana. Menimpa `--mantine-scale` pada `div` pembungkus **tidak** mengubah token turunan, dan portal (modal, notifikasi, popover) berada di luar pembungkus. Pakai `theme.scale` di `MantineProvider` (`root.tsx:101`) lewat `createTheme({scale})`, dengan sumber nilai cookie `pm-text-size` (pola `sidebar.ts`) yang dibaca loader root; `/go` (resolver pasca-login) menulis cookie dari `profiles` supaya perangkat baru tidak berkedip; menyimpan di Pengaturan menulis cookie + memperbarui DB. Verifikasi dengan spike 0,5 hari sebelum UI dibangun (token, `AppShell`, portal).

**Peleburan: pemisahan sumber**: `user.name`/`image` tetap dikelola seperti sekarang; satu endpoint `PATCH /api/app/profile` menulis `user.name` (transaksi) + `profiles`, sehingga formulir tidak perlu dua panggilan. Setelah tersimpan, `refetchSession()` (pola `ProfileForm.tsx`).

**Preferensi notifikasi**: pakai tabel `notification_preferences` rancangan Inbox (06 §4; milik riset Inbox), hanya dua kunci `event_reminder` dan `inbox_news`; **tidak ada baris = menyala** (tanpa backfill). Bila riset Inbox mengubah bentuknya, ubah di sini mengikuti. Ditolak: dua kolom boolean di `profiles` (murah sekarang, tetapi push/email/per-jenis nanti memaksa migrasi data).

**Keputusan `workspace_settings`**: **pakai ulang `app_setting`**. Alasan: (1) mekanisme singleton, cache, invalidasi, audit sudah ada (F1) dan memisahkan tabel menambah cache kedua; (2) perbedaan hak (super-admin vs Admin) ada di lapisan endpoint, seperti `settings-access.ts:15,45`, bukan di tabel; (3) kolom NULL=bawaan sudah jadi pola (F2). Feature flag jsonb ditolak sebagai tempat saklar Admin karena baca-ubah-tulis seluruh array (F3). Implementasi: `server/settings-workspace.ts` (~35 baris: `WORKSPACE_DEFAULTS`, `parseWorkspace`, `getWorkspace`, `upsertWorkspace`; tiru `settings-demo.ts`), 1 kolom `event_default_reminders text` (daftar menit dipisah baris, NULL = `[1440,30]`, pola `parseLines`).

| Saklar 09 #6 | MVP? | Alasan |
|---|---|---|
| Pengingat acara bawaan | **Ya** | dipakai form Event & scheduler |
| Fitur AI ✦ | Tidak | tak ada fitur AI; saklar tanpa efek = stub (aturan 17). Tambah kolom `ai_enabled` bersama fitur AI |
| Lama simpan rekaman | Tidak | tak ada rekaman |
| Cuti perlu persetujuan | Tidak | cuti ditunda |
| Peran dan izin (baca) | Tidak | lihat di atas |

**Endpoint** (`server/api/app-settings.ts`)

| Metode · Path | Fungsi | Izin |
|---|---|---|
| GET/PATCH `/api/app/profile` | profil sendiri (+`textSize`) | semua |
| GET/PUT `/api/app/notification-prefs` | `{eventReminder, inboxNews}` | semua |
| GET `/api/app/team-settings` | `{eventDefaultReminders}` (+bawaan) | semua |
| PUT `/api/app/team-settings` | ubah | Admin/super-admin (403 selain itu); `audit()` aksi baru `settings.team.update`; di `scopes.ts` ditambah baris sebelum `:166` agar tulis = `null` (kunci API tidak boleh mengubah pengaturan tim) + assertion di `tests/api-keys/scopes.test.ts` |
Foto tetap `POST/DELETE /api/app/avatar` (`app.ts:22-36`). Validasi: `name` 1–80 (sama dengan `ProfileForm.tsx:10`), kosong → `null`, `trim`.

**Kasus tepi**: baris `profiles` belum ada → GET mengembalikan bawaan; nama kosong ditolak; foto >2 MB/format salah memakai pesan yang ada; storage mati → 503 `STORAGE_DISABLED` (sudah ada); cookie dan DB berbeda → DB menang pada `/go`; HP tak pernah dikirim ke klien lain; Admin mengubah bawaan pengingat tidak mengubah event lama (`reminders_minutes` disalin saat event dibuat); `display_name` kosong tidak boleh membuat sapaan "Selamat pagi, ".

### 3.5 Struktur berkas dan uji (batas ukuran dijaga)

| Area | Berkas (tiap ≤ batas) |
|---|---|
| Skema | `server/db/schema.events.ts` (≤200), `schema.profile.ts`; re-export di `schema.ts`; migrasi dijalankan ke DB dev **dan** test |
| Events | `server/events/{events.access,events.query,events.service,events.series,events.reminders,events.notes}.ts`, `server/api/app-events.ts` (≤150) |
| Tim | `server/team/{team.query,team.access,team.availability}.ts`, `server/api/app-team.ts` |
| Sampah | `server/trash/{trash.query,trash.cascade,trash.purge,trash.access}.ts`, `server/api/app-trash.ts` |
| Pengaturan | `server/settings-workspace.ts`, `server/profile/profile.service.ts`, `server/api/app-settings.ts` |
| Rute | `app/routes/app/{events,event-detail,team,trash,settings}.tsx`, `app/routes/admin/settings.tsx`; semua `meta()` + guard di loader (F11) |
| Uji | `tests/events/*`, `tests/team/*`, `tests/trash/*`, `tests/api/app-{events,team,trash,settings}.test.ts` memakai `spyOn(auth.api,'getSession')` + `spyOn(rolesMod,'resolveUserRole')` (bukan `mock.module` guard, CLAUDE.md); matriks peran × aksi tiap modul; uji scheduler dengan `now` disuntik; uji kontrak "baris tak berhak tidak memuat angka beban" |
`app.ts` menjadi perakit saja: `.use(appEvents).use(appTeam)…` dengan plugin aktor bersama `app-actor.ts` **[ASUMSI: struktur ini diputuskan riset infrastruktur; R08 hanya butuh pola plugin per fitur]**. Menyentuh `server/` → `smoke:prod` + `smoke:binary` sebelum lapor selesai; migrasi ter-embed di binary (CLAUDE.md).

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Pengingat ganda saat >1 instance atau tick tumpang tindih | Sedang | Sedang (spam Inbox) | `event_reminders` PK + `ON CONFLICT DO NOTHING RETURNING`; uji dua tick paralel |
| Top-up rangkaian membuat kejadian ganda atau melenceng (akhir bulan) | Sedang | Tinggi (data ganda, notulensi terpecah) | UNIQUE `(series_id, original_starts_at)`, hitung dari jangkar, clamp; uji tanggal 29–31 dan lintas tahun |
| Purge menghapus baris tetapi objek S3 yatim (atau sebaliknya) | Sedang | Sedang (biaya, kebocoran data) | hapus objek dulu, lewati item bila gagal, baris dihapus eksplisit; log tanpa PII |
| Pulihkan berantai salah (item hapus-sendiri ikut pulih / proyek pulih tanpa isi) | Rendah | Tinggi | `deleted_with_project_id` + uji tiga skenario (hapus sendiri dulu, proyek dulu, keduanya) |
| Kebocoran beban kerja (D10) lewat respons API atau cache | Sedang | Tinggi (privasi) | tegakkan di SQL + hapus bidang di server; uji kontrak per peran; jangan cache lintas pengguna |
| Ukuran teks tidak menskala token/portal atau berkedip | Sedang | Sedang (lansia = target utama) | spike 0,5 hari, `theme.scale` + cookie SSR, `/go` menulis cookie |
| `@mantine/dates` memaksa naik `@mantine/core` 9.7.2 (peer persis) | Tinggi | Sedang | naikkan serempak core/hooks/modals/notifications, jalankan `typecheck` + smoke; putusan di riset UI |
| Ketergantungan pada modul yang belum ada (layanan tugas, `notify()`, status akun, tabel preferensi) | Tinggi | Sedang | definisikan antarmuka tipis (`createTasksFromOutcomes`, `notify`) dan kerjakan Events paling akhir; kontrak diuji dengan fake |
| Handler >150 baris / berkas >500 baris (Events cenderung membengkak) | Sedang | Rendah | peta berkas §3.5; pantau `file-health` |
| Dua penulis notulensi saling menimpa | Sedang | Sedang | kunci optimis `baseUpdatedAt`, 409 + muat ulang |
| Kerentanan `proxy-addr` (critical) memengaruhi IP rate limit/log | Sedang | Sedang | lapor ke user (§2.3); periksa `client-ip.ts` di luar R08 |
| Pengguna lansia gagal memahami "ini dan seterusnya" | Sedang | Sedang | dua radio besar berbahasa polos (05 #19), sertakan jumlah kejadian terdampak di dialog |

## 5. Estimasi usaha

Satuan hari-orang pekerja AI termasuk uji; 1 reviewer manusia dihitung terpisah.

| Modul | Ukuran | AI | Rincian utama |
|---|---|---|---|
| Events | **L** | 11–16 | skema+migrasi 1; akses/CRUD 2–3; rangkaian+top-up 1,5–2; pengingat 1–1,5; Daftar/Filter 1,5; Kalender 1,5–2; form 2 tahap 1–1,5; detail+notulensi+tugas dari rapat 2–2,5 |
| Tim | **M** | 3–5 | kueri+akses 1,5; UI daftar/detail 1,5–2; uji kontrak peran 0,5–1 |
| Sampah | **M** | 4–6 | skema kolom+cascade 1,5; kueri+UI 1,5–2; purge+S3 1–1,5; uji 0,5–1 |
| Pengaturan | **M** | 4–6 | `profiles`+API 1; UI peleburan 1,5–2; ukuran teks (spike 0,5 + implementasi 0,5–1); preferensi 0,5; Pengaturan tim Admin 0,5–1 |
| **Total** | | **22–33** | |
| Reviewer manusia | | 4–7 | 20% dari AI; fokus: aturan visibilitas, cascade/purge, migrasi |

Urutan: Pengaturan (profil/ukuran teks) → Sampah (kolom hapus lunak perlu ada sebelum modul lain selesai) → Tim → Events. Events bergantung pada tugas, proyek, dan Inbox (`notify`).

## 6. Pertanyaan terbuka untuk user

1. Hapus/Batalkan berulang: "Semua yang berulang" = **kejadian ini dan seterusnya** (05 #19, usulan di sini) atau **seluruh rangkaian termasuk yang lampau** (08 #12)? Lampau menghapus notulensi lama.
2. Ubah event berulang di MVP hanya "kejadian ini"; "Ubah semua" ditunda. Cukup? Cara lain bila salah isi: hapus rangkaian lalu buat ulang.
3. Setuju "Tugas dari rapat" manual masuk MVP (butuh +2–2,5 hari) walau AI belum ada?
4. Member boleh mengundang **semua** pengguna disetujui (nama+jabatan saja) atau hanya anggota proyeknya (05 Q4)?
5. Zona waktu tim `Asia/Jakarta` (bisa diubah lewat env)? Ada tim di WITA/WIT?
6. Kartu **Hapus akun** disembunyikan dari pengguna biasa di MVP (hanya Admin lewat Pengguna), karena penghapusan memengaruhi `created_by`/penugasan?
7. **Peran dan izin** (tabel baca-saja) ditunda sampai asumsi A1–A10 dikonfirmasi — setuju?
8. Ukuran teks: bawaan tetap Normal, atau Besar untuk akun baru (segmen lansia)? Nilai skala 1,125/1,25 perlu uji pengguna.
9. Kejadian yang dipulihkan dari Sampah setelah waktunya lewat: tampil di "Sudah lewat" (usulan) atau dibuang saat pulihkan?

## 7. Sumber

- Desain: `tahapan-proyek/03-desain/erd/diskusi/{05-events,07-tim,08-sampah,09-pengaturan,06-inbox,00-role-dan-area}.md`; `erd/{user-profile,project,task}.md`; `02-analisis/hasil-orchestrasi/orchestration/DECISIONS.md` (D3, D10); `analysis/A1-dashboard-tim-events.md` (E4, E9, E12, E13, N18); `deliverables/workflow.md` (Sampah, Undo F15).
- Kode (dibaca): `server/settings.core.ts`, `settings-demo.ts`, `settings-retention.ts`, `settings-features.ts`, `settings.ts`, `server/db/schema.{app,auth}.ts`, `server/demo/cleanup.ts`, `server/api/{app,app-avatar,index,settings-access,settings-ops,me}.ts`, `server/api-keys/{scopes,rollup}.ts`, `server/{guard,permissions,roles,auth,audit,sidebar,sidebar-badges}.ts`, `app/routes.ts`, `app/routes/app/{layout,profile}.tsx`, `app/routes/{go,admin/dashboard}.tsx`, `app/root.tsx`, `app/lib/{theme,time-format}.ts`, `app/components/profile/ProfileForm.tsx`, `tests/app-routes.test.ts`, `tests/settings-retention-scheduler.test.ts`.
- Eksternal: npm registry `@mantine/dates` (versi 9.7.2, MIT, peer `@mantine/core` 9.7.2 — `curl https://registry.npmjs.org/@mantine/dates/latest`, 15 Okt 2026); `bun audit` (15 Okt 2026) untuk §2.3.
- Tidak diverifikasi: wireframe Penpot; `server/middleware/client-ip.ts`; perilaku `--mantine-scale` pada `AppShell`/portal di browser (butuh spike); bentuk `notify()`/`notifications` (milik riset Inbox).
