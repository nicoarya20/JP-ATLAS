# R07 — Beranda (3 versi per role), Inbox, dan layanan `notify()`

> Tanggal: 15 Oktober 2026. Riset/perencanaan saja: tidak ada kode, migrasi, atau dokumen lain yang diubah. Konteks: `_BRIEF.md`.
> Bukti kode ditulis `path:baris` dari file yang benar-benar dibaca. Yang tidak diverifikasi ditandai **ASUMSI**. Tidak ada benchmark yang dijalankan, jadi semua angka kinerja adalah **anggaran target**, bukan hasil ukur.
> Nama tabel `users` di dokumen desain = tabel Better Auth `user` di kode (fondasi menang). Id memakai `text` + `crypto.randomUUID()` (`server/db/schema.app.ts:7-9`).

## 1. Ringkasan eksekutif

1. **Beranda MVP = 7 widget non-AI** (Sapaan, Sekilas, Ringkasan hari ini deterministik, Fokus saya, Agenda, Proyek saya, Selesai minggu ini) + 1 baris "Perlu Anda tanggapi" yang hanya menghitung. **Briefing AI dan Ask Data ditunda** (fase 5); Briefing diganti 3 kalimat bertemplat dari angka yang sudah dihitung, Ask Data diganti 3 pintasan siap-klik (bersyarat).
2. **Satu endpoint komposit** `GET /api/app/home` + loader SSR memanggil fungsi yang sama. Tiap widget gagal-lunak sendiri-sendiri. Maksimal 5-6 query paralel per role; pool DB hanya `max: 5` (`server/db/index.ts:21`), jadi query digabung dengan `FILTER`, bukan dipecah.
3. **`notify()` = satu tabel `notifications` + satu fungsi**, dipanggil **di dalam transaksi** service domain (savepoint, tidak pernah melempar ke pemanggil, kontrak sama dengan `audit()` di `server/audit.ts:62`). Idempotensi lewat `UNIQUE (recipient_id, dedupe_key)`; bundling Kabar terbaru lewat kunci `dedupe_key` per item per jam dengan `ON CONFLICT DO UPDATE`.
4. **"Selesai otomatis di mana pun"** terpenuhi dengan satu aturan: `resolveNotifications({ref, kinds})` dipanggil di service yang mengubah status (bukan di controller/Inbox), sehingga API, Beranda, Inbox, dan MCP otomatis menutup kartu.
5. **Pengiriman MVP = polling hitungan 60 detik** (hanya saat tab terlihat) + refetch saat fokus + invalidasi setelah aksi sendiri; **SSE ditunda** ke fase berikutnya sebagai "colekan" kecil di atas mekanisme yang sama. Catatan penting: polling memakan kuota rate-limit per IP (100/menit, `server/env.ts:32`), jadi endpoint hitungan perlu dikecualikan (1 baris di `DEFAULT_EXCLUDE_PREFIXES`, `server/rate-limit.ts:33`).
6. **Temuan yang memengaruhi desain:** shell `/app` tidak punya top bar desktop (`AppFrame.tsx:120`, header hanya mobile), jadi lonceng harus ditaruh di slot `BrandHeader extra` (`AppFrame.tsx:162`) dan header mobile; "pengikut tugas" belum didefinisikan (diusulkan: turunan implisit tanpa tabel); kartu Hasil rapat dan Cuti bergantung fitur yang ditunda, jadi **keluar dari MVP**.
7. **Estimasi MVP: 14-21 hari-orang AI + 3-4 hari reviewer manusia** (bagian 5). 8 pertanyaan terbuka di bagian 6; yang paling berpengaruh: posisi lonceng, zona waktu tim, dan tombol "tidak perlu dibalas" untuk kartu mention.

## 2. Temuan (dengan bukti)

### 2.1 Fondasi kode yang relevan

| # | Temuan | Bukti | Dampak ke desain |
|---|---|---|---|
| F1 | Badge sidebar `/dev` dihitung di loader layout tiap navigasi, **tanpa polling klien**; cache 15 dtk adalah **satu promise global**, bukan per user | `server/sidebar-badges.ts:28`, `:204-212`; `app/routes/super/layout.tsx:158` | Pola dipakai ulang untuk badge Inbox, tetapi cache harus per-user atau dibuang. Hitungan Inbox murah, jadi **tanpa cache** (cache akan membuat badge basi setelah kartu selesai) |
| F2 | `safe()` menelan error **tanpa log** (`catch {}` + komentar "log nothing") | `server/sidebar-badges.ts:47-54` | Jangan disalin apa adanya ke Beranda: aturan global melarang catch kosong. Versi Beranda wajib `logger.warn({err, widget})` lalu fallback |
| F3 | `audit()` = best-effort, tidak pernah melempar, ada retry saat FK error | `server/audit.ts:1-5`, `:62-86` | Kontrak model untuk `notify()`: kegagalan notifikasi tidak boleh membatalkan aksi domain |
| F4 | Scheduler = `setInterval(...).unref()` + `setTimeout` awal, dipasang sekali di `server/api/index.ts`, dilewati saat `NODE_ENV=test` | `server/settings-retention.ts:101-118`; `server/api/index.ts:44-48` | Pola untuk scheduler pengingat acara + purge Inbox. State terakhir-jalan disimpan di DB hanya bila perlu; yang idempoten (pakai `dedupe_key`) tidak perlu state |
| F5 | SSE **sudah ada** tetapi hanya untuk log super-admin: `ReadableStream` + heartbeat 20 dtk + `cancel()` cleanup + `X-Accel-Buffering: no`; klien `EventSource` | `server/api/logs.ts:18`, `:31-61`; `app/components/server-logs/useLiveServerLogs.ts:49`; `server/prod.ts:49` (`idleTimeout: 60`) | SSE mungkin dilakukan, tapi pola itu **broadcast satu buffer global**, bukan fan-out per user. Perlu registry subscriber per user (state dalam-proses) |
| F6 | Polling react-query dipakai di `/dev/tools` (`refetchInterval: 15_000`). Default klien: `staleTime 30_000`, `refetchOnWindowFocus: false` | `app/routes/super/tools.tsx:23`; `app/lib/query.tsx:8-9` | Query hitungan Inbox harus menimpa `refetchOnWindowFocus: true` dan `refetchInterval` sendiri |
| F7 | Rate limit per IP, 100 req/60 dtk, berlaku untuk semua `/api/*` kecuali prefix `['/api/auth/','/api/mcp']`; daftar bisa diganti penuh lewat `app_setting.rateLimitExcludePrefixes` | `server/env.ts:32-33`; `server/rate-limit.ts:33`; `server/middleware/rate-limiter.ts:72-78`; `server/settings.ts:56,75` | Polling dari satu kantor (satu IP publik) memakan kuota yang sama dengan semua aksi. Pengecualian default tidak berlaku bila admin sudah menyimpan daftar sendiri |
| F8 | Pool DB `max: 5` per proses | `server/db/index.ts:21` | Beranda dengan >5 query paralel akan mengantre; minimalkan jumlah statement |
| F9 | Shell: header AppShell **hanya mobile** (`height: {base: 52, sm: 0}`, `hiddenFrom="sm"`); sidebar punya slot `extra` di `BrandHeader` (kini `ThemeToggle`); `/app` layout belum mengirim `navBadges` dan `NAV` masih placeholder | `app/components/AppFrame.tsx:120,129,162`; `app/routes/app/layout.tsx:18-21,43,55` | Wireframe "lonceng di top bar" tidak punya rumah di desktop. Usulan: lonceng di slot `extra` + header mobile (tanpa top bar baru) |
| F10 | `NavBadge {value,color,tooltip,tone}` + `withBadges()` mengisi badge per rute; nilai 0 disembunyikan; tampil `999+` | `app/components/frame/nav.ts:4-10,39-50`; `NavList.tsx:19` | Badge menu Inbox cukup `navBadges['/app/inbox']` |
| F11 | Pola halaman data: loader SSR → `toJson` → react-query `initialData` | `app/routes/super/audit.tsx:55-66`; `app/lib/loader-json.ts` | Beranda memakai pola yang sama |
| F12 | `/api/app/*` otomatis `401` tanpa sesi dan otomatis terpetakan `app:read`/`app:write`; `actor` tersedia | `server/api/app.ts:10-15`; `server/api-keys/scopes.ts:166` | Endpoint Inbox/Beranda di `server/api/app.*.ts`, tetap tambah assertion di `tests/api-keys/scopes.test.ts` |
| F13 | Singleton proses wajib di `globalThis` (SSR bundle = salinan kedua modul) | `server/mcp/log-buffer.ts:137-139`; `CLAUDE.md` › "Bundle SSR ≠ proses Bun" | Registry SSE (fase 2) dan rate-limit exempt harus mengikuti pola ini |
| F14 | Tabel existing memakai `timestamp` **tanpa zona** (`schema.app.ts:15`, `schema.auth.ts:15`, `schema.logs.ts:33`); BRIEF meminta `timestamptz` untuk tabel baru. Drizzle 0.45.2 mendukung indeks parsial (`.where()`, `node_modules/drizzle-orm/pg-core/indexes.d.ts:24,67`); belum ada indeks parsial di repo | `schema.app.ts:15`, `schema.auth.ts:15`, `schema.logs.ts:33` | Tabel baru `withTimezone: true`. Bandingkan kolom campuran dengan cast eksplisit. Fragmen `sql` mentah: kirim `${d.toISOString()}::timestamptz` (aturan CLAUDE.md) |
| F15 | Tidak ada zona waktu tim di server: `requestClock` memakai cookie `tz` per browser | `app/lib/time-format.ts:8-30` | Batas "hari ini" untuk `due_date` (tipe `date`) butuh satu zona tim. Usulan konstanta `APP_TIMEZONE` (env opsional, bawaan `Asia/Jakarta` — **ASUMSI** tim di Indonesia) |

### 2.2 Celah dan konflik di dokumen desain

| # | Celah/konflik | Sumber | Penyelesaian di laporan ini |
|---|---|---|---|
| D1 | "Pengikut tugas" dipakai (Kabar terbaru, `06-inbox.md` §2) tetapi tidak ada tabel/definisi (`01-beranda-poin.md` "Inbox": aturan belum didefinisikan) | `06-inbox.md`, `01-beranda-poin.md` | Pengikut = **turunan implisit**: pembuat, yang mengerjakan, pemeriksa, penulis komentar, yang di-mention. Tanpa tabel di MVP (lihat "Pengikut implisit" di 3.4) |
| D2 | Mention ditulis `@nama` dan "diproses jadi notifikasi", padahal nama tidak unik | `task.md:355` | Composer komentar harus mengirim **id user** hasil picker (kolom/tabel `task_comment_mentions`), bukan mem-parse nama. Dependensi ke modul Tugas |
| D3 | Kartu **Hasil rapat menunggu konfirmasi** bergantung pada AI pemilah notulensi; **Cuti** bergantung fitur cuti. Keduanya ditunda ke fase 5 (BRIEF) | `05-events.md` #8; `06-inbox.md` #13; BRIEF | Kind dicadangkan di katalog, **tidak dikirim** di MVP |
| D4 | Beranda per role (`04-wireframe-per-role.md`, 8 Okt) masih punya "Completed / Activity"; keputusan Inbox (12 Okt) menyatakan "Beranda tidak punya feed aktivitas sendiri" | `04-…`, `06-inbox.md` #1 | "Selesai minggu ini" tetap (daftar penyelesaian, bukan feed notifikasi); feed aktivitas tidak ada |
| D5 | Urutan label tugas bentrok: Beranda `Telat > Penting > Menunggu saya > Segera > Mandek` vs Tugas `Terlambat > Menunggu diperiksa saya > Tertahan > Mandek`. "Penting" tanpa pemilik | `01-beranda-poin.md`; `task.md:478` | Ikuti `task.md` (lebih baru, keputusan modul); "Penting" = `priority ∈ {high, critical}`, bukan label terpisah |
| D6 | "Siap/Belum siap" pada agenda: aturan dan sumber "bahan" tidak ada, dummy kontradiktif | `01-beranda-poin.md` Zona D | **Dibuang dari MVP** |
| D7 | Zona A/B/Inbox menampilkan pekerjaan yang sama (dobel) | `01-beranda-poin.md` "Benang merah" | Briefing deterministik hanya merujuk *jumlah + 1 contoh*; Inbox di Beranda hanya hitungan (W9) |
| D8 | Prototype memakai label Inggris (Daily Briefing, My Focus, Ask Data); UI wajib bahasa Indonesia polos | `01-beranda-gabungan.html` | Label di 3.1 sudah diindonesiakan |
| D9 | Batas kewenangan Admin: menyetujui user ada di `/dashboard`, bukan di shell `/app` | `00-role-dan-area.md` §2 | Baris "Setujui N pengguna baru" di Beranda Admin menaut ke `/dashboard/users` |

## 3. Rekomendasi

### 3.1 Tabel widget Beranda

Label menu/URL: `/app` (home). Semua teks UI Indonesia. **MVP** = masuk rilis pertama; **Tunda** = fase berikutnya.

| Kode | Widget | Isi | Sumber data (tabel.kolom) | Variasi per role | Status |
|---|---|---|---|---|---|
| W1 | Sapaan | "Selamat pagi, {panggilan}" + tanggal panjang | `profiles.display_name` (fallback `user.name`), jam di `APP_TIMEZONE` | sama | MVP |
| W2 | Sekilas | 3-4 angka besar yang bisa diklik ke daftar terfilter | `tasks.status/due_date/assignee_id/project_id/deleted_at`, `projects.status`, `user.status` | **Member**: Aktif saya · Terlambat · Selesai 7 hari. **PM**: Aktif di proyek kelola · Terlambat · Menunggu saya periksa · Tanpa penanggung jawab. **Admin**: Proyek berjalan · Tugas terlambat (semua) · Menunggu persetujuan | MVP |
| W3 | Ringkasan hari ini (pengganti Briefing AI) | Maks. 3 kalimat bertemplat + tombol **Bacakan** (`speechSynthesis`, klien) | Tidak ada query: dirakit dari hasil W2/W4/W6/W7 di `home.summary.ts` | Member: milik sendiri; PM: + proyek kelola; Admin: + "N pengguna menunggu" | MVP (versi deterministik) |
| W3-AI | Briefing harian/mingguan oleh LLM | | | | **Tunda (fase 5)** |
| W4 | Fokus saya | Maks. 5 tugas, 1 tombol besar per baris (**Selesai** atau **Minta diperiksa** sesuai `needs_review`), 1 label berikon+teks, "Lihat semua (N)" | `tasks` (assignee=saya, status `todo/in_progress`), `projects.name`, `task_dependencies` (Tertahan) | **Member**: tugas saya. **PM**: tugas saya + baris **Periksa** (maks. 3, `status=in_review` dan saya pemeriksa/Pengelola). **Admin**: tugas saya + baris **Setujui N pengguna baru** di atas + baris Periksa bila `reviewer_id` kosong | MVP |
| W5 | Pintasan pertanyaan (pengganti Ask Data) | 3 chip → tautan daftar terfilter: "Proyek mana yang tertinggal?" · "Tugas apa yang paling lama tertunda?" · "Siapa paling banyak tugas?" | Tanpa query (hanya tautan) | Chip ke-3 hanya PM/Admin (`04-…` tabel Beranda) dan hanya bila anggota ≥2 (catatan prototype) | MVP **bersyarat**: hanya bila halaman tujuan sudah menerima parameter URL (dependensi Proyek/Tugas/Tim); jika tidak, sembunyikan |
| W5-AI | Tanya data bahasa bebas | | | | **Tunda (fase 5)** |
| W6 | Agenda hari ini & besok | Maks. 4 acara: jam, judul, tempat, tombol **Lihat** | `events.starts_at/ends_at/canceled_at/deleted_at`, `event_participants.user_id` | sama (acara yang saya ikuti); Admin tidak melihat seluruh sistem (itu halaman Events) | MVP (tanpa badge Siap/Belum siap, D6) |
| W7 | Proyek saya | Maks. 5 proyek: nama, kondisi (Lancar/Perlu perhatian/Terlambat + alasan 1 kalimat), progres "4 dari 10 tugas", tenggat | `projects`, `project_members`, agregat `tasks`, `project_milestones.reached_at`, `project_condition_overrides` | **Member**: proyek yang diikuti. **PM**: yang dikelola dulu, lalu diikuti. **Admin**: semua `active`, urut kondisi terburuk | MVP |
| W8 | Selesai minggu ini | Maks. 5 tugas selesai sejak awal minggu | `tasks.completed_at`, `status='done'` | Member: milik sendiri · PM: proyek yang dikelola · Admin: seluruh sistem | MVP (prioritas rendah; potong dulu bila waktu mepet) |
| W9 | Perlu Anda tanggapi | Satu baris: "Ada N hal yang perlu Anda tanggapi" → `/app/inbox`; hilang bila 0 | `notifications` (hitungan sama dengan lonceng; **tidak** query tambahan, diambil dari loader layout) | sama | MVP |
| W10 | Beban tim / kapasitas | | `07-tim.md` #4 menunda kapasitas | | Tunda (P1) |
| W11 | Briefing mingguan, Retro, tren Δ KPI | | A1 R6/R9: dihapus atau diganti Briefing | | Tunda |
| — | Keadaan kosong | Member tanpa proyek: kartu "Anda belum tergabung di proyek mana pun…" (selaras Tim ③); W4 kosong: "Tidak ada tugas hari ini. Semua beres." | | | MVP |

**Aturan label W4** (urutan `task.md:478`, ambang konfigurasi bernama): `TASK_STALE_DAYS=3` (`task.md:471`), `HOME_DUE_SOON_DAYS=2` (usulan A1 "≤ +2 hari kerja"; **ASUMSI** hari kalender di MVP). Urutan: tenggat paling awal dulu (terlambat otomatis di atas), `priority` turun sebagai pemecah seri, tanpa tenggat di bawah; UI mengelompokkan 5 baris itu menjadi Terlambat · Hari ini · Minggu ini. Skor berbobot A1 §4.1 Zona B (`prioritas × urgensi + bobot …`) ditunda: urutan sederhana ini mudah dijelaskan ke pengguna awam. LLM tidak terlibat.

**Pengganti AI yang deterministik (W3).** Prioritas kalimat (maks. 3, berhenti bila sudah 3): ① `{n} tugas terlambat — paling lama "{judul}" ({d} hari).` ② `Ada {m} hal yang menunggu Anda periksa/tanggapi.` ③ `Hari ini ada {t} tugas dan {e} acara.` ④ `Proyek "{nama}" perlu perhatian: {alasan}.` ⑤ bila semuanya nol: `Tidak ada yang mendesak hari ini.` Template di `server/home/home.copy.ts` (konstanta, bukan hardcode di komponen). Alasan menolak LLM ringan: fitur AI ditunda ke fase 5 oleh keputusan final (BRIEF), sehingga belum ada penyedia/anggaran token yang bisa dipakai; dan "AI hanya menceritakan data yang sudah dihitung" (`01-beranda-detail.md` Q1) berarti kalimat bertemplat sudah memberi 90% nilainya.

### 3.2 Query agregat ringkas dan indeks

Semua query: `deleted_at IS NULL`; `:today` dan batas hari dihitung di TypeScript dalam `APP_TIMEZONE` lalu dikirim `${iso}::date` / `${iso}::timestamptz`. Kolom `tasks.*` mengikuti `task.md` (belum ada di kode).

```sql
-- W2 Member (1 statement; scope = tugas saya)
SELECT count(*) FILTER (WHERE status IN ('todo','in_progress','in_review'))                 AS aktif,
       count(*) FILTER (WHERE status IN ('todo','in_progress','in_review') AND due_date < :today) AS terlambat,
       count(*) FILTER (WHERE status = 'done' AND completed_at >= :week_start)               AS selesai_7h
FROM tasks WHERE assignee_id = :me AND deleted_at IS NULL;          -- idx tasks(assignee_id,status,due_date)
-- W2 PM: sama, WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id=:me AND role='manager')
-- W2 Admin: tanpa filter assignee; butuh indeks parsial tasks(due_date) WHERE status IN (...) AND deleted_at IS NULL

-- W4 Fokus: ambil 5 dulu, baru hitung label mahal (Tertahan) hanya untuk 5 baris
WITH top AS (
  SELECT t.id,t.number,t.title,t.status,t.priority,t.due_date,t.needs_review,t.last_activity_at,p.name AS project
  FROM tasks t JOIN projects p ON p.id=t.project_id AND p.deleted_at IS NULL
  WHERE t.assignee_id=:me AND t.status IN ('todo','in_progress') AND t.deleted_at IS NULL
  ORDER BY t.due_date NULLS LAST, t.priority DESC
  LIMIT 5)
SELECT top.*, EXISTS (SELECT 1 FROM task_dependencies d JOIN tasks b ON b.id=d.blocked_by_task_id
                      WHERE d.task_id=top.id AND b.status IN ('todo','in_progress','in_review') AND b.deleted_at IS NULL) AS tertahan
FROM top;
-- enum Postgres diurutkan menurut urutan deklarasi (low<medium<high<critical), jadi `priority DESC` benar; tenggat paling awal (terlambat) otomatis di atas.

-- W4 baris Periksa (PM/Admin): idx tasks(reviewer_id,status) + project_members
SELECT t.id,t.number,t.title,t.review_requested_at FROM tasks t
WHERE t.status='in_review' AND t.deleted_at IS NULL
  AND (t.reviewer_id=:me OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id=:me AND role='manager')
       OR (:is_admin AND t.reviewer_id IS NULL))
ORDER BY t.review_requested_at LIMIT 3;                                -- count total lewat count(*) OVER ()

-- W7 Proyek: satu GROUP BY untuk semua proyek relevan (<= puluhan), kondisi dihitung di TS
SELECT p.id,p.name,p.due_date,
  count(t.id) FILTER (WHERE t.status <> 'canceled')                                   AS total,
  count(t.id) FILTER (WHERE t.status = 'done')                                        AS selesai,
  count(t.id) FILTER (WHERE t.status IN ('todo','in_progress','in_review') AND t.due_date < :today) AS terlambat,
  count(t.id) FILTER (WHERE t.status IN ('todo','in_progress','in_review') AND t.due_date < :today
                      AND t.priority IN ('high','critical'))                          AS terlambat_penting,
  EXISTS (SELECT 1 FROM project_milestones m WHERE m.project_id=p.id AND m.reached_at IS NULL AND m.due_date < :today) AS milestone_lewat
FROM projects p LEFT JOIN tasks t ON t.project_id=p.id AND t.deleted_at IS NULL
WHERE p.status='active' AND p.deleted_at IS NULL AND p.id IN (:ids) GROUP BY p.id;   -- idx tasks(project_id,status)
```

| Indeks | Untuk | Status |
|---|---|---|
| `tasks(assignee_id, status, due_date)` | W2 Member, W4 | Sudah di desain (`task.md:484`) |
| `tasks(reviewer_id, status)`, `tasks(project_id, status)` | W4 Periksa, W2 PM, W7 | Sudah di desain |
| `tasks(due_date) WHERE status IN ('todo','in_progress','in_review') AND deleted_at IS NULL` | W2 Admin | **Baru** (parsial) |
| `tasks(completed_at DESC) WHERE status='done' AND deleted_at IS NULL` | W2 (7 hari), W8 | **Baru** (parsial) |
| `events(starts_at) WHERE canceled_at IS NULL AND deleted_at IS NULL` | W6, scheduler pengingat | **Baru** |
| `event_participants(user_id, event_id)` | W6 (PK desain `(event_id,user_id)` tidak melayani arah ini) | **Baru** |
| `"user"(status) WHERE status='pending'` | W2/W4 Admin, kartu `user_pending` | **Baru** (kolom status = Fase 0) |
| Indeks `tasks(deleted_at)` di desain (`task.md:488`) hampir selalu NULL → tak berguna untuk Beranda | | Saran: ganti parsial `WHERE deleted_at IS NOT NULL` (untuk Sampah) |

**Kondisi proyek** harus memanggil **satu fungsi bersama** `projectCondition()` (milik modul Proyek, rumus `project.md:377`, ambang `PROJECT_AT_RISK_OVERDUE_RATIO=0.2`). Beranda tidak boleh menulis ulang rumus (risiko dua definisi "Perlu perhatian"). Bila modul Proyek belum selesai, kerjakan fungsi itu lebih dulu sebagai dependensi W7.

### 3.3 Skema `notifications` dan `notification_preferences`

Turunan usulan `06-inbox.md` §4, disesuaikan ke fondasi: id `text`, FK ke `user.id`, `timestamptz`, `dedupe_key` ditambah (idempotensi), `lane` sebagai `text` + CHECK (repo tidak memakai `pgEnum` sama sekali: `grep pgEnum server/db/schema*.ts` = 0 hasil), `read_at`/`resolved_at` dipisah, `updated_at` untuk urutan kartu dibundel. File: `server/db/schema.notifications.ts` (≤200 baris), diekspor lewat `schema.ts`.

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipientId: text('recipient_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }), // null = sistem
  projectId: text('project_id'),            // FK ke projects.id (on delete cascade) setelah tabel proyek ada
  lane: text('lane').notNull(),             // 'action' | 'info'   CHECK
  kind: text('kind').notNull(),             // NOTIFICATION_KINDS (katalog)
  refType: text('ref_type').notNull(),      // 'task' | 'event' | 'project' | 'user' | 'comment'
  refId: text('ref_id').notNull(),
  dedupeKey: text('dedupe_key').notNull(),  // kunci identitas kejadian; untuk info = kunci bundel (item+jam)
  bundleCount: integer('bundle_count').notNull().default(1),
  payload: jsonb('payload').notNull().default({}), // {title, number?, excerpt<=140, projectName?, extra} TANPA PII
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), // naik saat dibundel
  readAt: timestamp('read_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedReason: text('resolved_reason'),  // 'acted' | 'elsewhere' | 'target_closed' | 'superseded' | 'expired' | 'dismissed'
}, (t) => [
  uniqueIndex('notifications_recipient_dedupe_uq').on(t.recipientId, t.dedupeKey),
  index('notifications_action_open_idx').on(t.recipientId, t.createdAt.desc()).where(sql`lane = 'action' AND resolved_at IS NULL`), // badge + tab 1
  index('notifications_info_feed_idx').on(t.recipientId, t.updatedAt.desc()).where(sql`lane = 'info' AND resolved_at IS NULL`),    // tab 2
  index('notifications_ref_open_idx').on(t.refType, t.refId).where(sql`resolved_at IS NULL`),                                       // resolve massal
  index('notifications_created_idx').on(t.createdAt),                                                                               // purge
]);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),     // 'event_reminder' | 'news'  (kartu aksi tidak bisa dimatikan)
  inApp: boolean('in_app').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.category] })]);
```

Keputusan skema: **(a)** `category` menggantikan `kind` di preferensi (`06-inbox.md` §4 memakai `kind`): layar Pengaturan hanya punya dua saklar (`09-pengaturan.md` #4), jadi per-kind menambah baris tanpa guna; tidak ada baris = hidup. **(b)** `resolved_at` tetap dipakai untuk kartu `info` yang digantikan/ref-nya hilang (disembunyikan). **(c)** Hitungan badge **dihitung** (tidak disimpan), sesuai `06-inbox.md` §4. **(d)** Migrasi: file migrasi baru dengan `IF NOT EXISTS` (aturan global §4) dan komentar *kenapa*; dijalankan ke DB dev **dan** test (`CLAUDE.md` › Test).

### 3.4 Katalog jenis notifikasi dan penerima

Penerima selalu disaring: bukan pelaku (`06-inbox.md` #7), akun `approved` & tidak `banned`, masih punya akses ke proyek (anggota atau Admin/super-admin), dan (khusus `info`) preferensi tidak mati. Kunci `dedupe_key`: `{kind}:{refType}:{refId}[:{sub}]`. `sub` untuk kind `action` = id kejadian pemicu (id `task_reviews`, id `task_activities`, id komentar) supaya kejadian ulang pada tugas yang sama tidak tertahan baris lama yang sudah selesai (baris lama memang tidak dihapus sampai purge). Kind `info` tanpa kolom kunci bundel memakai `sub` = epoch detik kejadian.

**Lane `action` (tab "Perlu Anda tanggapi", dihitung di lonceng, tidak dibundel)**

| Kind | Penerima | Tombol | `sub` pada dedupe | Otomatis selesai saat | Fase |
|---|---|---|---|---|---|
| `task_review_requested` | `tasks.reviewer_id` (bila terisi) | Periksa | id baris `task_reviews` | keputusan Setujui/Kembalikan **oleh siapa pun**; tugas dibatalkan/dihapus/dipindah ke Sampah; pemeriksa diganti (kartu pemeriksa lama) | MVP |
| `task_review_fallback` | semua Admin+super-admin (saat `reviewer_id` kosong, `task.md:96`) | Periksa | id `task_reviews` | sama; kartu dibuat sekali per permintaan periksa | MVP |
| `task_returned` | yang mengerjakan | Lihat tugas | id `task_reviews` | tugas masuk `in_review` lagi / `done` / `canceled`; `assignee` diganti; dihapus | MVP |
| `task_assigned` | assignee baru | Lihat tugas | id baris `task_activities` (`assigned`) | status keluar dari `todo` (mulai), `done`, `canceled`; assignee diganti lagi; dihapus | MVP |
| `mention` | user dalam daftar mention komentar | Balas | id komentar | si penerima **berkomentar** di tugas yang sama setelahnya; tugas `done/canceled/dihapus`; komentar dihapus; **TTL `NOTIF_MENTION_TTL_DAYS=14`** (`expired`) | MVP |
| `user_pending` | semua Admin+super-admin | Buka Pengguna | – (ref = user id) | status akun berubah (`approved/rejected/banned`) oleh Admin mana pun → hilang bagi **semua** (`06-inbox.md` pertanyaan 3, `00-role-dan-area.md` §3) | MVP (butuh status akun Fase 0) |
| `meeting_confirm` | pembuat event/Pengelola/Admin | Periksa hasil | id `event_outcomes` batch | dikonfirmasi/dibuang | **Tunda** (butuh AI notulensi) |
| `leave_request` | Pengelola pemohon / Admin | Setujui · Tolak (dua tombol) | id `leave_requests` | diputuskan/dibatalkan pemohon | **Tunda** (cuti ke fase 5) |
| `task_assigned_bulk` | penerima penugasan massal | Lihat daftar | id `import_job`/batch | sama seperti `task_assigned` | Tunda (CSV/story/template ditunda; cegah 40 kartu sekaligus) |

**Lane `info` (tab "Kabar terbaru", dibundel, titik hitam = belum dibaca, tidak dihitung di lonceng)**

| Kind | Penerima | Kunci bundel (`sub`) | Catatan | Fase |
|---|---|---|---|---|
| `task_done` (disetujui/selesai) | yang mengerjakan + pembuat | – (per kejadian) | `task.md` A1 | MVP |
| `task_commented` | pengikut implisit (lihat "Pengikut implisit" di 3.4), kecuali pelaku & yang sudah dapat `mention` untuk komentar yang sama | `jam` (dibundel "3 komentar baru di #14") | | MVP |
| `task_changed` | pengikut implisit | `jam` ("5 perubahan di #12") | dari aksi: `field_changed`, `checklist_done`, `attachment_added`, `dependency_*`, `reviewer_changed` | MVP |
| `task_unassigned` | assignee lama | – | "Tugas #12 dialihkan ke Rina" (saran tambahan, tidak ada di `06`) | MVP (murah) |
| `event_invited` | peserta baru | – | | MVP |
| `event_changed` / `event_canceled` | peserta | `jam` / – | `canceled` juga me-resolve `event_reminder` | MVP |
| `event_reminder` | peserta (acara tidak batal) | `startsAt` epoch + offset menit | 1 hari & 30 menit (bawaan `09-pengaturan.md` #6, konfigurasi); kategori preferensi `event_reminder` | MVP |
| `project_member_added` / `project_role_changed` | yang bersangkutan | – | | MVP |
| `project_deadline_extended` | anggota proyek | – | | MVP |
| `leave_decided` | pemohon | – | | Tunda |

**Pengikut implisit** (tanpa tabel): `{created_by, assignee_id, reviewer_id} ∪ penulis komentar ∪ di-mention`, dihitung satu query saat `notify`. Ditolak: tabel `task_followers` + tombol Ikuti/Berhenti — menambah layar dan konsep yang tidak diminta untuk awam/lansia; dapat ditambahkan bila ada keluhan "terlalu bising" (preferensi per-tugas).

### 3.5 Mekanisme `notify()`

File (patuh batas ukuran): `server/notifications/` → `notifications.catalog.ts` (kind→lane/kategori/ttl/salinan, ≤200), `notifications.notify.ts` (inti, ≤300), `notifications.resolve.ts`, `notifications.query.ts` (list/hitungan/mark-read, ≤250), `notifications.recipients.ts` (pengikut, semua Admin, filter akses), `notifications.scheduler.ts` (pengingat + purge), `emit/*.ts` (pembangun per modul: `emit.task.ts`, `emit.event.ts`, `emit.project.ts`, `emit.account.ts`).

```ts
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function notify(exec: Executor, input: {
  kind: NotificationKind; recipients: string[]; actorId?: string | null; projectId?: string | null;
  ref: { type: RefType; id: string }; sub?: string; payload: NotificationPayload; at?: Date;
}): Promise<{ inserted: number; bundled: number; skipped: number }>;   // tidak pernah melempar
export async function resolveNotifications(exec: Executor, q: {
  ref: { type: RefType; id: string }; kinds?: NotificationKind[]; recipientId?: string;
  reason: ResolveReason; by?: string | null;
}): Promise<number>;                                                    // idempoten
export async function dropForUserInProject(exec: Executor, userId: string, projectId: string): Promise<number>;
```

1. **Transaksi.** `notify(tx, …)` dijalankan **di transaksi yang sama** dengan perubahan domain, dibungkus savepoint (`tx.transaction`) + `try/catch` + `logger.warn({err, kind})`. Alasan: kartu "Periksa" yang hilang membuat tugas macet, jadi tidak boleh best-effort *setelah* commit seperti `audit()`; tetapi kegagalan notifikasi juga tidak boleh menggagalkan aksi (savepoint hanya me-rollback bagiannya). Ditolak: fire-and-forget setelah commit (kartu bisa hilang saat proses mati); outbox + worker (infrastruktur baru, melanggar syarat "tanpa infrastruktur baru").
2. **Dedupe/idempotensi.** `INSERT … ON CONFLICT (recipient_id, dedupe_key)`: lane `action` → `DO NOTHING`; lane `info` → `DO UPDATE SET bundle_count = bundle_count+1, updated_at = now(), read_at = NULL, payload = excluded.payload`. Pemanggilan ulang kejadian aksi yang sama = no-op; scheduler boleh jalan berulang/ganda (multi-proses aman). Kekurangan yang diterima: retry manual pada kejadian *info* yang sama menambah `bundle_count` +1 (tidak ada retry otomatis, jadi diabaikan).
3. **Bundling.** Hanya `info`. Kunci = `{group}:{refType}:{refId}:{jam}` dengan `jam = floor(epoch_ms / 3_600_000)`; zona Indonesia punya offset jam bulat, jadi jam UTC = jam dinding (**ASUMSI**; di zona dengan offset :30 batas bundel bergeser setengah jam, tidak berbahaya). Alternatif ditolak: jendela geser (butuh SELECT lalu UPDATE, rawan balapan tanpa lock). Kartu `action` **tidak pernah dibundel** (`06-inbox.md` #6); lonjakan penugasan massal ditangani `task_assigned_bulk` (fase berikutnya).
4. **Selesai otomatis di mana pun.** Panggilan `resolveNotifications` ada di **fungsi service** yang mengubah status (`approveTask`, `returnTask`, `startTask`, `cancelTask`, `deleteTask`, `changeAssignee`, `addComment`, `setUserStatus`, …), tidak di controller/Inbox. Controller Inbox hanya mengubah `read_at`. Karena Beranda, Tugas, Inbox, MCP, dan API key semua melewati service itu, "di mana pun" otomatis. Uji kontrak: untuk tiap kind `action` ada test "aksi lewat jalur A menutup kartu".
5. **Penerima.** Pembangun `emit.*` yang menyusun daftar kandidat dari fakta (mis. `task`, `review`, `project_members`); `notify()` yang menerapkan filter bersama (pelaku, status akun, akses proyek, preferensi) dengan **maksimal 3 query** per panggilan (akses+status digabung, preferensi hanya untuk `info`).
6. **Isi aman.** `payload` memuat judul tugas/acara (snapshot), kutipan ≤140 karakter, nama proyek; **tanpa** email/HP (aturan log/PII global). Nama pelaku diambil lewat join `user` saat baca. Konsekuensi: judul di kartu lama tidak ikut berubah bila tugas diganti nama (diterima; kartu `action` berumur pendek).
7. **Akses dicabut.** `removeMember` memanggil `dropForUserInProject` (hapus kartu user itu untuk proyek itu); query list tetap menyaring defensif `project_id IS NULL OR EXISTS(membership) OR admin`.
8. **Retensi.** Kartu `info` + `action` yang sudah selesai dihapus setelah `NOTIF_RETENTION_DAYS=30` (usulan `06-inbox.md` pertanyaan 2) oleh tick harian (`DELETE … WHERE created_at < …`, ber-batch 500 seperti `server/demo/cleanup.ts:12-30`). Kartu `action` terbuka tidak dihapus kecuali TTL kind (`mention` 14 hari → `expired`).
9. **Scheduler pengingat acara.** `startNotificationScheduler()` (pola F4), tick tiap 60 dtk: untuk tiap offset `o` ambil acara `starts_at BETWEEN now() AND now()+o` yang `events.created_at <= starts_at - o`, lalu `notify(event_reminder, sub = startsAt:o)`. Karena `dedupe_key` unik, tick yang terlewat (restart) otomatis menyusul tanpa duplikat; acara diubah jamnya → kunci baru. Biaya: 2 range-scan per menit pada indeks parsial `events(starts_at)` (**ASUMSI** <1 ms; belum diukur). Didaftarkan di `server/api/index.ts` bersama scheduler lain, dilewati saat `NODE_ENV=test`.
10. **Pengujian** (bun:test, DB test): katalog lengkap (tiap kind punya lane/kategori/salinan); filter pelaku & akses; idempotensi dua kali panggil; bundling hitungan & `read_at` kembali NULL; resolve lintas jalur; preferensi mati → tidak masuk; purge; scheduler menyusul tick terlewat; assertion `scopes.ts`; `tests/app-routes.test.ts` (loader `requireUser`).

### 3.6 Mekanisme pengiriman tanpa infrastruktur baru

| Opsi | Cara kerja | Biaya per pengguna (anggaran, **ASUMSI**, belum diukur) | Cocok | Keputusan |
|---|---|---|---|---|
| **A. Polling hitungan** (react-query) | `GET /api/app/inbox/count` tiap 60 dtk saat tab terlihat (`refetchIntervalInBackground` bawaan false → tab tersembunyi berhenti), + `refetchOnWindowFocus: true` + invalidasi setelah aksi sendiri | 1 req/menit/tab. Server: baca sesi (±1 query, **ASUMSI**: `auth.ts` tak menyalakan `cookieCache`, jadi `getSession` ke DB) + 1 index-only scan hitungan ⇒ ≈2 query kecil. Rate limit: 30 pengguna serentak di satu IP = 30 req/mnt = 30% kuota 100/mnt | MVP | **Dipilih** |
| **B. SSE "colekan"** | `GET /api/app/inbox/stream` mengirim `{type:'inbox'}` bila ada kartu baru untuk user itu; klien lalu `invalidateQueries` (logika klien identik dengan A) | 1 koneksi panjang/tab, nol query saat diam, heartbeat 20 dtk (F5). Perlu registry `Map<userId, Set<controller>>` di `globalThis` (F13); **hanya 1 proses** (sama seperti rate limiter) | Fase berikutnya bila "kurang instan" dikeluhkan | Ditunda |
| C. SSE membawa data kartu | Payload penuh lewat stream | Sama dengan B + risiko kebocoran bila akses dicabut saat stream hidup | – | Ditolak |
| D. WebSocket | – | Tidak ada pola di repo; jembatan dev `http-bridge.ts` ditulis untuk request/response | – | Ditolak |
| E. Push PWA / email | – | Ditunda oleh `06-inbox.md` #11 | – | Ditolak (di luar cakupan) |
| F. Revalidasi loader React Router berkala | `useRevalidator` tiap 60 dtk | Menjalankan ulang **semua loader** halaman (termasuk agregat Beranda) tiap menit; sangat boros | – | Ditolak |

Rincian A:
- Halaman `/app/inbox`: daftar memakai `refetchInterval: 30_000` hanya saat halaman terbuka; hitungan lonceng tetap 60 dtk.
- **Mitigasi rate limit**: tambah `'/api/app/inbox/count'` ke `DEFAULT_EXCLUDE_PREFIXES` (`server/rate-limit.ts:33`) + test. Kelemahan: pengecualian hilang bila Admin pernah menyimpan daftar kustom (F7). Alternatif ditolak: menaikkan `RATE_LIMIT_MAX` global (melemahkan perlindungan semua endpoint). Bila pengecualian ditolak, pakai interval 120 dtk (15% kuota untuk 30 pengguna).
- Gagal 401 (sesi habis): `retry: false`, hentikan polling, biarkan guard halaman mengarahkan ke login.
- Keterlambatan terburuk lonceng ≈ 60 dtk (+ latensi). Cukup untuk "pemberitahuan di aplikasi saja" (`06-inbox.md` #11); aksi sendiri langsung segar lewat invalidasi.
- Biaya SSE untuk perbandingan: di 30 pengguna ≈ 30-40 koneksi terbuka; Bun menangani ini, tetapi `idleTimeout: 60` dan proxy balik (heartbeat 20 dtk sudah memenuhi) harus diuji di `smoke:prod`/`smoke:binary` — alasan lain menunda.

### 3.7 Titik kait `notify()` / `resolveNotifications()` (agar tidak perlu retrofit)

**Kontrak untuk modul Tugas/Proyek/Events** (masukkan ke brief implementasi mereka): (1) setiap mutasi lewat **satu fungsi service** yang berjalan dalam transaksi dan sudah menulis `task_activities`/`project_activities`; (2) tepat setelah baris aktivitas ditulis, service memanggil pembangun `emit.*` dengan `tx`; (3) controller tidak pernah memanggil `notify` langsung. Ditolak: bus event generik (belum ada pelanggan kedua; menambah indirection dan tak transaksional), trigger database (logika tersembunyi, melewati aturan service, sulit diuji), dan menurunkan notifikasi dari tabel aktivitas lewat polling (tidak semua kartu punya baris aktivitas: pengingat, `user_pending`).

| Modul | Fungsi service (nama usulan) | Pemicu (`action` di aktivitas) | `notify` | `resolve` |
|---|---|---|---|---|
| Tugas | `createTask` | `created` | `task_assigned` ke assignee | – |
| Tugas | `changeAssignee` | `assigned` | `task_assigned` baru; `task_unassigned` (info) ke lama | kartu `task_assigned`/`task_returned`/`task_review_*` milik assignee/pemeriksa lama |
| Tugas | `requestReview` | `review_requested` | `task_review_requested` ke `reviewer_id`, atau `task_review_fallback` ke Admin bila kosong | `task_returned` |
| Tugas | `setReviewer` / toggle `needs_review` | `reviewer_changed`, `review_required_changed` | kartu baru ke pemeriksa baru bila status `in_review` | kartu pemeriksa lama |
| Tugas | `approveTask` | `approved` | `task_done` (info) ke assignee+pembuat | `task_review_*` semua penerima; `task_assigned`; `task_returned` |
| Tugas | `returnTask` | `returned` | `task_returned` ke assignee | `task_review_*` semua penerima |
| Tugas | `startTask` | `status_changed` | – | `task_assigned` |
| Tugas | `completeTask` (tanpa periksa) | `status_changed` | `task_done` ke pembuat | `task_assigned`, `task_returned`, `mention` di tugas itu |
| Tugas | `cancelTask`, `deleteTask` (Sampah), `reopenTask` | `canceled`, `deleted`, `reopened` | `task_changed` (info) | semua kartu `action` dengan `ref=tugas` (`target_closed`); `restoreTask` tidak membuat ulang |
| Tugas | `addComment` | (komentar) | `mention` per id user terpilih; `task_commented` ke pengikut | `mention` milik **penulis** di tugas itu (membalas) |
| Tugas | `editComment`/`deleteComment` | – | – | `mention` yang tidak lagi tercantum (butuh `task_comment_mentions`, D2) |
| Tugas | `updateTaskFields`, checklist, lampiran, dependensi | `field_changed`, `checklist_done`, `attachment_added`, `dependency_*` | `task_changed` (dibundel per jam) | – |
| Proyek | `addMember`, `changeMemberRole` | `member_added`, `role_changed` | `project_member_added` / `project_role_changed` | – |
| Proyek | `removeMember` | `member_removed` | – | `dropForUserInProject` |
| Proyek | `extendDeadline` | `deadline_extended` | `project_deadline_extended` | – |
| Proyek | `deleteProject`/`cancelProject` | `status_changed` | – | semua kartu `action` dengan `project_id` (`target_closed`) |
| Events | `createEvent`, `addParticipants` | – | `event_invited` | – |
| Events | `updateEvent` (waktu/tempat), `cancelEvent`, `removeParticipant`, `deleteEvent` | – | `event_changed` / `event_canceled` | `event_reminder` lama (`superseded`); hapus kartu peserta yang dikeluarkan |
| Akun (Fase 0) | `registerFirstLogin` (pending) | – | `user_pending` ke semua Admin | – |
| Akun (Fase 0) | `setUserStatus` (approve/reject/ban/unban) | `audit()` yang sudah ada | – | `user_pending` untuk semua penerima |
| Scheduler | `startNotificationScheduler` | jam | `event_reminder` | purge harian; `mention` kedaluwarsa |

Hal yang dikunci *sekarang* walau modulnya belum ada: nama-nama fungsi `emit.*`, tipe `NotificationPayload` per kind, dan daftar `ResolveReason`. Modul lain tinggal memanggil.

### 3.8 Badge sidebar dan lonceng

- **Definisi** (`06-inbox.md` #3): `count(*)` kartu `lane='action' AND resolved_at IS NULL` milik user. Satu fungsi `inboxActionCount(exec, userId)` (index-only scan pada `notifications_action_open_idx`), dipakai oleh: loader layout `/app` (nilai awal), endpoint `GET /api/app/inbox/count`, W9 di Beranda, dan ringkasan W3. Tidak di-cache (cache global ala F1 akan menampilkan angka basi setelah kartu selesai).
- **Sidebar:** loader `app/routes/app/layout.tsx` menambahkan `navBadges: { '/app/inbox': { value, color: 'red', tone: 'alert', tooltip: 'N hal perlu Anda tanggapi' } }` (bentuk F10). Nilai hidup datang dari hook `useInboxCount()` (react-query kunci `['inbox','count']`, `initialData` dari loader, `initialDataUpdatedAt` = waktu loader) yang menimpa `navBadges` di klien.
- **Lonceng:** komponen `NotificationBell` (ikon + angka, `aria-label="Inbox, {n} hal perlu ditanggapi"`, target sentuh ≥44px) menaut ke `/app/inbox`, ditaruh di slot `extra` `BrandHeader` (`AppFrame.tsx:162`, sebelah `ThemeToggle`) **dan** di header mobile (`AppFrame.tsx:129`). Tampilan angka dibatasi `99+`. Menambah top bar desktop ditolak: perubahan shell untuk semua area (`/dev`, `/dashboard`) di luar cakupan; lihat pertanyaan 1.
- Angka lonceng = angka badge menu (satu sumber), judul tab browser memakai awalan `(n)` bila n>0 (opsional, 1 baris).
- **Admin:** menu Pengguna di `/dashboard` mendapat badge `user.status='pending'` lewat pola loader yang sama (bukan dari tabel `notifications`; sumber kebenaran = status akun).
- Kartu `info`: titik hitam belum dibaca, ditandai dibaca saat tab Kabar terbaru dibuka lalu **Tandai semua dibaca** (`UPDATE … WHERE lane='info' AND read_at IS NULL`); tidak memengaruhi angka.

### 3.9 Risiko kinerja Beranda dan mitigasi

1. **Banyak agregat, pool 5 (F8).** Rancang ≤6 statement per role: W2 satu `FILTER`, W4 `LIMIT 5` dulu baru `EXISTS`, W7 satu `GROUP BY`. Jalankan `Promise.all`; bila uji beban menunjukkan antrean, naikkan pool lewat env (`DB_POOL_MAX`, perubahan fondasi kecil di `server/db/index.ts:21`) — **ditandai usulan fondasi**, biaya migrasi nol (default tetap 5).
2. **Gagal-lunak per widget.** Setiap widget `{ok:true,data}|{ok:false}`; kesalahan di-`logger.warn({err, widget})` (bukan `catch {}`, F2). UI: kartu "Bagian ini belum bisa dimuat. Coba lagi." + tombol; satu query lambat tidak merusak halaman.
3. **Cache.** Data pribadi (W2 Member, W4, W6) **tanpa cache server**: klik **Selesai** harus langsung mengubah angka (prototype: "Coba klik Selesai: In Progress turun, Completed naik") lewat invalidasi `['home']`. Agregat lintas-proyek (W2 Admin, W7 Admin) boleh cache promise 20 dtk berkunci per-scope (`'admin'`, `'pm:{userId}'`), pola `sidebar-badges.ts:204-212` tetapi berkunci dan dibatasi ukurannya (maks. 200 kunci).
4. **Satu jalur data.** Loader SSR dan `GET /api/app/home` memanggil `getHome(actor)` yang sama (F11); respons dipakai sebagai `initialData`, tidak ada fetch kedua saat hidrasi (aturan `query.tsx:16-21`).
5. **Zona waktu & hari.** Seluruh batas hari dihitung di TypeScript dari `APP_TIMEZONE` (F15) sehingga "Hari ini" tidak bergeser 7 jam.
6. **Anggaran target (belum terukur):** server ≤150 ms p95 untuk 2.000 tugas / 30 proyek / 20 pengguna di mesin dev; ≤2 round-trip DB berurutan. **Cara verifikasi:** skrip seed di `tests/` (DB test) + `EXPLAIN (ANALYZE, BUFFERS)` untuk W2/W4/W7 sebelum merge; gagal bila ada `Seq Scan` pada `tasks` untuk jalur Member.
7. **Skala tak terduga.** `Sekilas` Admin atas seluruh `tasks`: bila >100 ribu baris (di luar target tim kecil), ganti dengan tabel ringkasan harian — tidak dirancang sekarang (YAGNI).

### 3.10 MVP vs fase berikutnya

| Area | MVP | Fase berikutnya |
|---|---|---|
| Beranda | W1, W2, W3 (deterministik), W4, W6, W7, W8, W9, keadaan kosong; 3 varian role dari satu kode (`role` memilih blok, bukan 3 halaman) | W5 bila tujuan filter belum siap (jadikan MVP+); Briefing AI, Ask Data, mingguan, kapasitas tim, "Siap/Belum siap", kustomisasi widget |
| Inbox | 2 tab + kosong, kartu 1 tombol, Tandai semua dibaca, 5 kind `action` + 9 kind `info`, retensi 30 hari, preferensi 2 saklar (bila Pengaturan ikut MVP; jika tidak, tabel dibuat saja) | `meeting_confirm`, `leave_request`/`leave_decided`, `task_assigned_bulk`, filter per proyek, digest, jam tenang, "kenapa saya melihat ini" |
| Pengiriman | Polling 60 dtk + fokus + invalidasi | SSE colekan; push PWA; email |
| Infrastruktur | Skema + `notify`/`resolve` + scheduler pengingat/purge | Registry SSE; tabel pengikut manual |

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Modul Tugas/Proyek/Events dibangun tanpa memanggil `emit.*` → Inbox kosong atau kartu tak pernah selesai (retrofit mahal) | Tinggi | Tinggi | Tulis `emit.*` + tipe + kontrak 3.7 **sebelum** modul lain; tambah checklist PR "aksi X memanggil notify/resolve"; test kontrak per kind `action` |
| Badge membengkak karena kartu `action` tak pernah selesai (mention, assigned) → lansia mengabaikan lonceng | Sedang | Tinggi | Resolve di service; TTL 14 hari untuk `mention`; pertanyaan 3 (tombol "tidak perlu dibalas"); audit mingguan jumlah kartu terbuka per user di uji beban |
| Polling menghabiskan kuota rate-limit satu IP kantor → pengguna kena 429 | Sedang | Sedang | Kecualikan endpoint hitungan; interval 60-120 dtk; hentikan saat tab tersembunyi; test untuk daftar pengecualian |
| Pool DB 5 koneksi mengantre saat Beranda + polling + aksi bersamaan | Sedang | Sedang | ≤6 statement/role, gabung dengan `FILTER`; uji beban; opsi `DB_POOL_MAX` |
| Dua definisi "Perlu perhatian/Terlambat" (Beranda vs Proyek/Tugas) | Sedang | Sedang | Satu fungsi `projectCondition()`/`taskLabels()` milik modul domain; Beranda hanya memanggil |
| `notify()` di dalam transaksi memperlambat/mengunci aksi domain | Rendah | Sedang | Savepoint + ≤3 query ringan; indeks pada `notifications`; tidak ada panggilan jaringan |
| Penerima bocor: kartu berisi judul tugas proyek yang aksesnya sudah dicabut | Rendah | Tinggi | Filter akses saat kirim + `dropForUserInProject` + filter defensif saat baca; test |
| Mention memakai nama (bukan id) → salah orang diberi notifikasi | Sedang | Sedang | Composer mengirim id dari picker (D2); tanpa parsing nama |
| Scheduler ganda/restart → pengingat ganda atau terlewat | Rendah | Rendah | `dedupe_key` unik + kueri "menyusul" (3.5 butir 9) |
| Rumus label Beranda/Briefing salah di tepi zona waktu (`due_date` tipe `date`) | Sedang | Sedang | `APP_TIMEZONE` tunggal, test pada pukul 23.30 dan 00.30 WIB |
| Pengecualian rate-limit tidak berlaku bila Admin menyimpan daftar kustom (F7) | Rendah | Rendah | Dokumentasikan di README (kontrak publik) dan tampilkan di /dev settings catatan; fallback interval 120 dtk |
| SSE nanti memutus koneksi di balik proxy/biner | Sedang | Rendah | Ditunda; wajib uji `smoke:prod` + `smoke:binary` sebelum diaktifkan |

## 5. Estimasi usaha

Satuan hari-orang untuk **pekerja AI**, di luar waktu **1 reviewer manusia** (≈25% dari total untuk telaah PR, uji manual tampilan awam/lansia). Dengan asumsi modul Tugas/Proyek/Events menyediakan tabelnya (dependensi).

| Paket | Isi | Ukuran | Hari-orang AI |
|---|---|---|---|
| P1 Skema & inti notifikasi | `schema.notifications.ts`, migrasi (dev+test), katalog, `notify`/`resolve`/`dropFor…`, penerima & filter, tes | M | 3-4 |
| P2 API & UI Inbox | `server/api/app.inbox.ts` (list/count/read/read-all), halaman `/app/inbox` (2 tab, kartu, kosong), `NotificationBell`, `useInboxCount`, badge sidebar, tes + assertion scope + pengecualian rate-limit | M | 3-5 |
| P3 Beranda 3 role | `server/home/*` (service per widget, summary deterministik, copy), endpoint komposit, halaman, varian role, keadaan kosong/gagal-lunak, tes, seed uji beban + `EXPLAIN` | L | 5-7 |
| P4 Scheduler | pengingat acara + purge + kedaluwarsa mention, tes tick terlewat | S | 1-2 |
| P5 Kait di modul lain | `emit.*` + pemanggilan di service Tugas/Proyek/Events/Akun (dihitung di sini, dikerjakan bersama modul masing-masing) | M | 2-3 |
| **Total MVP** | | **L** | **14-21** (+ 3-4 hari reviewer) |
| P6 SSE colekan (fase berikut) | endpoint, registry `globalThis`, hook klien, smoke | S-M | 2-3 |
| P7 Widget W5 + preferensi UI | tergantung halaman lain | S | 1-2 |

Urutan: P1 → (P2 ‖ P4) → P5 bersama modul → P3 (W7 menunggu `projectCondition()`).

## 6. Pertanyaan terbuka untuk user

1. **Posisi lonceng**: kerangka `/app` tidak punya top bar di desktop. Setuju lonceng di sidebar (sebelah tombol tema) + header mobile, atau perlu top bar desktop baru (mengubah shell semua area)?
2. **Zona waktu tim**: setuju satu zona tetap `Asia/Jakarta` (konfigurasi `APP_TIMEZONE`), atau tim tersebar di WIB/WITA/WIT?
3. **Kartu mention**: boleh ada tautan kecil **"Tidak perlu dibalas"** (kartu selesai), padahal keputusan menyebut satu tombol per kartu? Tanpa itu kartu hanya hilang saat dibalas/tugas ditutup/14 hari.
4. **Pemeriksa**: kartu "Periksa" hanya ke pemeriksa yang ditunjuk (Pengelola lain melihatnya di Tugas › Menunggu diperiksa saya), atau ke **semua Pengelola** proyek? Laporan ini memilih pemeriksa saja agar tidak bising.
5. **Retensi** kartu: 30 hari untuk Kabar terbaru dan kartu selesai (usulan `06-inbox.md`) — setuju? Mention 14 hari — setuju?
6. **Ambang label**: "Segera jatuh tempo" 2 hari (kalender atau hari kerja?) dan "Mandek" 3 hari (`TASK_STALE_DAYS`, asumsi A8) — dikonfirmasi?
7. **Pengingat acara 30 menit**: tetap di Kabar terbaru (dipilih; Beranda "Agenda" sudah menampilkan acara hari ini) atau kartu khusus di Perlu Anda tanggapi? (`06-inbox.md` pertanyaan 4)
8. **Pintasan pertanyaan (W5)**: boleh dirilis hanya jika halaman Proyek/Tugas/Tim sudah menerima filter lewat URL, jika tidak disembunyikan sampai fase 5?

## 7. Sumber

Desain (`tahapan-proyek/`): `note.md` (Menu Ringkasan); `03-desain/erd/diskusi/01-login-registrasi-beranda.md`, `04-wireframe-per-role.md`, `05-events.md` (#7-8, #12, #18, ERD events), `06-inbox.md` (§1-§5), `07-tim.md` (#4-5), `09-pengaturan.md` (#4, #6, #9, tabel data), `00-role-dan-area.md`; `03-desain/erd/task.md` (alur, aturan pemeriksa `:89-99`, nilai dihitung `:464-478`, indeks `:480-495` (daftar di `:484-488`), `task_comments` `:355`, aksi aktivitas `:410`), `project.md` (kondisi `:373-381`, indeks); `04-prototype/prototype/01-beranda-gabungan.html`, `diskusi/01-beranda-detail.md`, `01-beranda-poin.md`; `02-analisis/hasil-orchestrasi/analysis/A1-dashboard-tim-events.md` (R1-R14, §4.1 Zona A-D, N5), `A4-ai-landscape-crosscutting.md` §3.6, `deliverables/workflow.md` W-8 (diagram routing, jenis notifikasi), `orchestration/DECISIONS.md` E1.

Kode (`/Users/lukman/orca/makuro-template`): `server/sidebar-badges.ts`; `server/audit.ts`; `server/settings-retention.ts`; `server/demo/cleanup.ts`; `server/api/index.ts`; `server/api/app.ts`; `server/api/logs.ts`; `server/api-keys/scopes.ts`; `server/rate-limit.ts`; `server/middleware/rate-limiter.ts`; `server/settings.ts`; `server/env.ts`; `server/db/index.ts`; `server/db/schema.{app,auth,logs}.ts`; `server/prod.ts`; `server/guard.ts`; `server/mcp/log-buffer.ts`; `app/components/AppFrame.tsx`; `app/components/frame/{nav.ts,NavList.tsx}`; `app/routes/app/layout.tsx`; `app/routes/super/{layout,audit,tools}.tsx`; `app/components/server-logs/useLiveServerLogs.ts`; `app/lib/{query.tsx,time-format.ts,loader-json.ts}`; `tests/app-routes.test.ts`; `node_modules/drizzle-orm/pg-core/indexes.d.ts`; `CLAUDE.md` (konvensi Elysia, test, bundle SSR, globalThis).

Tidak diverifikasi (ASUMSI): perilaku `getSession` Better Auth tanpa `cookieCache`; kinerja query dan biaya koneksi SSE (tidak ada benchmark); dukungan `speechSynthesis` bahasa Indonesia di perangkat pengguna; bentuk akhir modul Tugas/Proyek/Events (hanya dokumen desain yang dibaca).
