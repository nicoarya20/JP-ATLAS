# P5 — Rencana eksekusi S3 (menu Inbox): `notify()`, lonceng, halaman Inbox

> 18 Okt 2026 · tahap rencana · BELUM ada kode. Mengikat: `../KEPUTUSAN-MVP-INTI.md` (menang atas R/X). Sumber utama: R07 §3.3-§3.8, R03, R12, R10 §3.1/§3.3, `03-desain/erd/diskusi/06-inbox.md`. **Fondasi kode menang atas desain**; selisihnya ada di §9. Cakupan berkas ini = Inbox saja; Beranda (H1/H2) dikerjakan rencana lain dan hanya memakai `inboxActionCount()` (§5.4).

## 1. Ringkasan
- **14 tugas** (I01-I14) + 2 tugas S4 sketsa (I20-I21). Total S3 Inbox ≈ **26,5 hari-orang AI** (+ reviewer manusia ≈ 6-7 hari). Lebih besar dari R07 §5 (P1+P2+P4+P5 = 9-14) karena S2 sudah dipecah jadi banyak berkas kecil (kait I05-I07 per berkas), QA lintas-jalur (I12), klien/bingkai terpisah (I08-I09), dan layar Kabar terbaru; Must saja (I01-I10, tanpa I11/I14) ≈ 22.
- **Lajur** (tanpa berbagi berkas): **N1** skema+inti (`server/notification/*`, `server/db/schema.notification.ts`), **N2** API+kait server, **N3** UI (`app/components/inbox/*`, `app/routes/app/inbox.tsx`), **N4** bingkai bersama (satu pemilik: `AppFrame.tsx`, `app/routes/app/layout.tsx`, `app/routes.ts`, `tests/contract-v1.test.ts`). Maks 3 pekerja aktif, peluncuran 2 per batch (memori `worker-token-quota-limit`).
- **S3a boleh mulai paling awal** = I01-I04 (skema, inti `notify()`, API baca, pengecualian rate limit): semuanya berkas BARU atau penambahan satu baris di berkas bersama, tidak menyentuh service S2. Syarat §6.0: migrasi 0017 diklaim pemegang baton dan user mengizinkan S3a sebelum gerbang S2-17 (pertanyaan P-1).
- **Kait ke modul Tugas (I05-I07) dan seluruh UI (I08-I10) menunggu gerbang S2-17**, karena S2-16 dapat mengubah `task.service.ts` (sudah 290 dari 300 baris, `server/task/task.service.ts`) dan alur halaman tugas.
- **Isi nyata Perlu Anda tanggapi di S3 tipis**: hanya `task_assigned` (+ `user_pending` bila I14 diambil). Kartu Periksa/Dikembalikan/Mention (`task_review_*`, `task_returned`, `mention`) bergantung fitur Periksa dan komentar-bermention yang baru S4 (`TASK_REVIEW_UI_ENABLED=false`, `server/pm/limits.ts:26`). Katalog tetap mencadangkan kind-nya agar S4 tidak mengubah skema/kontrak (§9 K-1).
- **Tiga keputusan user paling penting**: P-1 (S3a sebelum gerbang?), P-2 (lonceng di sidebar, bukan top bar), P-3 (retensi 30 hari vs R12 90 hari).
- Kalender: S3a ≈ 5-6 hari kerja; sisanya ≈ 8-10 hari setelah gerbang S2; total ≈ 13-16 hari kerja dengan 2-3 pekerja.

## 2. Keadaan sekarang (kode di worktree, dibaca 18 Okt)
| # | Fakta | Bukti | Dampak |
|---|---|---|---|
| K1 | Tidak ada kode/tabel notifikasi sama sekali; kata "inbox" hanya muncul di UI `notify` toast | `grep -ri inbox server app` = hanya `app/components/ui/notify.ts` dkk (toast) | Semua baru. Nama toast `notify` di klien **bentrok kosakata** dengan `notify()` server: nama berkas server `notification.*`, bukan `notify.*` |
| K2 | Migrasi terakhir **0016_task_core.sql**; berkas diawali komentar `-- Why:` dan `IF NOT EXISTS`; tabel baru PM singular (`task`, `task_activity`, `project_member`), id `pk()` (`randomUUID`), waktu `tz()` | `server/db/migrations/0016_task_core.sql:1`; `server/db/schema.columns.ts:7-16`; `server/db/schema.task-detail.ts:50` | Usulan **0017 `notification`** (singular; R07 memakai plural `notifications`, §9 K-2). Events 0018 oleh pemegang baton |
| K3 | `inTx(fn)` + `Executor`/`Tx` sudah ada; service menerima `tx`, tanpa `db` di dalam callback | `server/pm/tx.ts:4-15` | `notify(exec: Executor, …)` memakai savepoint `exec.transaction` |
| K4 | Setiap mutasi tugas SUDAH menulis `task_activity` di transaksi yang sama: buat (`task.service.ts:181`), ubah penugasan (`:267`, `:276`), transisi (`task-workflow.service.ts:171`), komentar (`task-comment.service.ts:62-71`, belum menulis aktivitas), hapus komentar (`:134`) | berkas:baris tersebut | Titik kait persis di §5.5. Insert aktivitas belum `.returning({ id })` → I05/I06 menambahkannya (untuk `dedupe_key`) |
| K5 | Anggota proyek: `addMember` (`logActivity … 'member_added'`, `member.service.ts:~118`), `changeMemberRole` (`:~139`), `removeMember` (`:144`); hapus proyek `trashProject` (`project-trash.service.ts:47`) | berkas tersebut | Kait I07. Tidak ada hapus tugas (S6): kait `target_closed` untuk tugas dicatat tetapi belum bisa diuji |
| K6 | Tidak ada MCP tool tugas (`server/mcp/tools/` hanya `app-status, db, file-health, logs`); "jalur mana pun" nyata saat ini = sesi (UI) dan **API key** `app:write` | `ls server/mcp/tools`; `server/api-keys/scopes.ts:185` | Uji lintas-jalur (I12) = sesi vs API key; MCP menyusul otomatis karena resolve ada di service |
| K7 | `/api/app/*` otomatis `401` (`appContext`) dan terpetakan `app:read`/`app:write` (`scopes.ts:185`); `app.ts` hanya merakit modul (`server/api/app.ts:19-31`) | berkas tersebut | Rute baru `app-inbox.ts`, `.use(inboxApi)` 1 baris di `app.ts` |
| K8 | Rate limit global: `DEFAULT_EXCLUDE_PREFIXES = ['/api/auth/', '/api/mcp']` | `server/rate-limit.ts:33`, dipakai `:103` | Tambah `/api/app/inbox/count`; tak berlaku bila Admin menyimpan daftar kustom (`settings.ts`, R07 F7) |
| K9 | Shell `/app`: header AppShell hanya mobile (`height: {base:52, sm:0}`, `hiddenFrom="sm"`), sidebar `BrandHeader extra={<ThemeToggle collapsed />}`; `navBadges` sudah ada di tipe tetapi `/app` tidak mengirimnya | `app/components/AppFrame.tsx:62,121,134,167`; `app/routes/app/layout.tsx:18-63` | Lonceng di slot `extra` + header mobile; prop opsional baru `bell` (N4). `AppFrame` dipakai juga `/dev`,`/dashboard` → tidak boleh berubah perilakunya |
| K10 | NAV `/app` dan daftar 13 URL dibekukan `contract-v1`: menambah entri = baris baru di snapshot dan ADR 0002 | `tests/contract-v1.test.ts:70-76,153-157` | Inbox = penambahan (bukan perubahan) → Permintaan Perubahan Kontrak aditif, §9 K-4 |
| K11 | Klien query default `staleTime 30_000`, `refetchOnWindowFocus:false` | `app/lib/query.tsx:5-12` | Query hitungan menimpa opsi itu sendiri |
| K12 | Akun: `user.approvalStatus` (`pending/approved/rejected`), `user.banned`; persetujuan lewat `approveUser` | `server/db/schema.auth.ts:24,33`; `server/account/approval.service.ts:110` | Filter penerima; kait `user_pending` (I14) |
| K13 | Pemeriksa: kolom `task.reviewer_id` ada, alur Periksa belum (S4) | `server/db/schema.task.ts:81` | Kind Periksa dicadangkan saja |
| K14 | Scheduler pola `setInterval(...).unref()`, didaftarkan di `server/api/index.ts:40-48`, dilewati saat `NODE_ENV=test` | berkas tersebut | I11 |

## 3. Lingkup & non-lingkup (R10 §3.1)
| Butir R10 | Prio | Masuk S3? | Tugas |
|---|---|---|---|
| **I1** `notify()` + Inbox tab Perlu Anda tanggapi + lonceng + badge + polling 60 dtk + kartu hilang otomatis | Must | **Ya** | I01-I12 |
| **I2** tab **Kabar terbaru** (dibundel per jam, Tandai semua dibaca, retensi) | Should | **Ya** (S3b) | I03 (bundel), I04 (read-all), I10, I11 |
| `user_pending` (Admin: "N pengguna baru") | Should | Ya, opsional | I14 |
| **T14** Mention `@nama` → kartu Balas | Could | **S4** | I20 (sketsa) |
| **T16** Kartu "Terlambat" 3 tombol | Could | **S4** | I21 (sketsa) |
| Kartu Periksa/Dikembalikan | (S4 Periksa) | Katalog saja, tidak dikirim | – |
| Pengingat acara, undangan acara | S7 | Katalog saja | – |
| Cuti, hasil rapat AI, `task_assigned_bulk` | Won't/ditunda | Tidak | – |
| SSE, push PWA, email, digest, jam tenang, filter per proyek | Won't | Tidak | – |
| Layar preferensi notifikasi | Could | Tabel `notification_pref` dibuat, **tanpa UI** | I01 |
| Pengikut manual (Ikuti/Berhenti) | Won't | Pengikut implisit (R07 §3.4) | I02 |

## 4. Layar & perilaku
**Rute baru**: `/app/inbox` (`app/routes/app/inbox.tsx`, child `layout('routes/app/layout.tsx')` di `app/routes.ts`, tab lewat `?tab=kabar`, bawaan `?tab=tanggapi`). NAV: sisipkan **Inbox** tepat setelah Beranda (urutan menu `06-inbox.md` §3) dengan `FiInbox`, `description: 'Kabar dan hal yang perlu Anda tanggapi.'`. `meta()` = `'Inbox — Simple PM'`. Loader: `await requireUser(request)` lalu data awal lewat `toJson` + react-query `initialData` (pola `app/routes/super/audit.tsx`).

| Elemen | Perilaku |
|---|---|
| Judul | "Inbox" + subjudul "Kabar untuk Anda" (R11 D8) |
| Tab 1 **Perlu Anda tanggapi (N)** | Kartu terbuka (`lane=action`, `resolved_at IS NULL`), terbaru dulu, tanpa bundel. Kartu: inisial pelaku (Avatar), kalimat tebal ("Dodi menunjuk Anda mengerjakan #14"), judul tugas (dipotong `truncate`), "Nama proyek · 5 menit lalu", **satu tombol** "Lihat tugas" → `/app/tasks/:number`. Tidak ada tombol tutup/hapus (kartu hilang karena status berubah, §5.3) |
| Tab 2 **Kabar terbaru** | Kelompok **Hari ini · Kemarin · Lebih lama** (kelompok ditentukan SERVER dari `APP_TIME_ZONE`, bukan `dayjs()` klien, CLAUDE.md). Titik hitam = belum dibaca (`aria-label="Belum dibaca"`, bukan hanya warna). Kartu dibundel: "5 perubahan di tugas #12". Tombol "Lihat" (outline). **Tandai semua dibaca** (loading, lalu notifikasi "Semua kabar sudah ditandai dibaca") hanya di tab ini |
| Buka tab Kabar terbaru | **Tidak** otomatis menandai dibaca (menghindari kehilangan penanda tanpa disengaja); dibaca satu per satu saat tombol "Lihat" diklik (`POST /inbox/:id/read` fire-and-forget) atau lewat Tandai semua |
| Kosong tab 1 | Ikon + "Semua beres" + "Tidak ada yang perlu Anda tanggapi saat ini." + tombol "Lihat Kabar terbaru" |
| Kosong tab 2 | "Belum ada kabar" + "Kabar tentang tugas dan proyek Anda akan muncul di sini." |
| Gagal muat | Kartu "Inbox belum bisa dimuat. Coba lagi." + tombol "Muat ulang" (bukan blank) |
| Lonceng | `NotificationBell`: ikon `FiBell size="1.25em"` + angka (`99+` batas), `aria-label="Inbox, {n} hal perlu Anda tanggapi"`, target sentuh `ActionIcon` default tema (44 px). Slot `extra` BrandHeader (sebelah ThemeToggle; saat sidebar ringkas hanya ikon + titik angka) **dan** header mobile. Tautan ke `/app/inbox` (bukan panel). Angka = badge menu = `inboxActionCount()` (satu sumber) |
| Badge menu | `navBadges['/app/inbox']` `{ value, color:'red', tone:'alert', tooltip:'N hal perlu Anda tanggapi' }`; nilai 0 disembunyikan oleh `withBadges` (`nav.ts:39-50`) |
| Judul tab browser | Awalan `(N)` bila N>0 (1 baris di `inbox.tsx` dan layout) |
| Mobile 375 px | Daftar = tumpukan `Paper` (bukan tabel); tombol kartu lebar penuh di bawah teks bila sempit (`Group wrap="wrap"`); header "Tandai semua dibaca" `wrap="wrap"` |
| Ukuran teks 1/1,25/1,5 | Semua ukuran lewat `theme`; ikon `1.25em`; uji 3 skala di 768/1024/1280 (UI-DoD P3) |
| Polling | `useInboxCount`: `refetchInterval: 60_000`, `refetchIntervalInBackground:false`, `refetchOnWindowFocus:true`, `staleTime:0`, `retry:false` pada 401 (hentikan polling, guard halaman yang mengarahkan ke login). Halaman Inbox terbuka: daftar `refetchInterval: 30_000`. Aksi sendiri (mulai/selesai/ubah penugasan lewat `useTaskActions`) → `invalidateQueries(['inbox'])` |

## 5. Data & API
### 5.1 Tabel (migrasi **usulan 0017**, nomor diklaim pemegang baton; Events 0018 sesudahnya)
`server/db/schema.notification.ts` (≤200 baris), diekspor lewat `schema.ts`. Pola `pk()`/`tz()`/`createdAt()` dari `schema.columns.ts`. Enum sebagai `text` + CHECK (repo tanpa `pgEnum`).

| Kolom `notification` | Tipe | Catatan |
|---|---|---|
| `id` | text pk | `pk()` |
| `recipient_id` | text NOT NULL → `user.id` ON DELETE CASCADE | pemilik kartu |
| `actor_id` | text → `user.id` ON DELETE SET NULL | null = sistem |
| `project_id` | text → `project.id` ON DELETE CASCADE | null untuk kartu akun |
| `lane` | text NOT NULL CHECK `IN ('action','info')` | |
| `kind` | text NOT NULL | dari `NOTIFICATION_KINDS` |
| `ref_type`, `ref_id` | text NOT NULL | `'task'|'project'|'user'|'event'|'comment'` |
| `dedupe_key` | text NOT NULL | UNIQUE bersama `recipient_id` |
| `bundle_count` | integer NOT NULL default 1 | |
| `payload` | jsonb NOT NULL default `{}` | `{title, number?, projectName?, excerpt≤140}` TANPA email/HP |
| `created_at`,`updated_at` | timestamptz | `updated_at` naik saat dibundel |
| `read_at`,`resolved_at` | timestamptz null | |
| `resolved_reason` | text null | `acted|elsewhere|target_closed|superseded|expired` |

Indeks: UNIQUE `(recipient_id, dedupe_key)`; parsial `(recipient_id, created_at DESC) WHERE lane='action' AND resolved_at IS NULL` (badge + tab 1); parsial `(recipient_id, updated_at DESC) WHERE lane='info'` (tab 2); parsial `(ref_type, ref_id) WHERE resolved_at IS NULL` (resolve massal); `(created_at)` (purge). `notification_pref(user_id, category, in_app, updated_at)` PK `(user_id, category)`, `category IN ('event_reminder','news')` — dibuat sekarang, dipakai `notify()` bila ada baris, **UI menyusul**. Migrasi: `IF NOT EXISTS`, komentar `-- Why:`, dijalankan ke DB dev DAN test; `drizzle-kit generate` setelahnya = tidak ada perubahan.

### 5.2 Katalog yang dikirim di S3
| Kind | Lane | Penerima | Tombol | `dedupe_key` | Resolve otomatis saat |
|---|---|---|---|---|---|
| `task_assigned` | action | assignee baru (bukan pelaku) | Lihat tugas | `task_assigned:task:<taskId>:<activityId>` | status keluar dari `todo`; `done`/`canceled`; assignee diganti; `complete` oleh siapa pun |
| `user_pending` (I14) | action | semua Admin + super-admin | Buka Pengguna | `user_pending:user:<userId>` | status akun berubah (approve/reject/ban), untuk SEMUA penerima |
| `task_done` | info | pembuat + assignee (bukan pelaku) | Lihat | `task_done:task:<taskId>:<activityId>` | – |
| `task_commented` | info | pengikut implisit (bukan pelaku) | Lihat | `task_commented:task:<id>:<jam>` (bundel) | – |
| `task_changed` | info | pengikut implisit | Lihat | `task_changed:task:<id>:<jam>` (bundel) | – |
| `task_unassigned` | info | assignee lama | Lihat | `…:<activityId>` | – |
| `project_member_added`, `project_role_changed` | info | yang bersangkutan | Lihat | `…:project:<id>:<activityId>` | – |
Dicadangkan (tidak dikirim S3): `task_review_requested`, `task_review_fallback`, `task_returned`, `mention` (S4); `event_*` (S7). `jam = floor(epoch_ms/3_600_000)` (**ASUMSI** offset zona bulat, R07 §3.5). Pengikut implisit = `{created_by, assignee_id, reviewer_id} ∪ penulis komentar (task_comment.author_id, live)`, satu query.

### 5.3 Kontrak `notify()` / `resolveNotifications()` (`server/notification/`)
```ts
notify(exec: Executor, i: { kind; recipients: string[]; actorId?: string|null; projectId?: string|null;
  ref: { type; id }; sub?: string; payload; at?: Date }): Promise<{ inserted; bundled; skipped }>  // TIDAK PERNAH melempar
resolveNotifications(exec: Executor, q: { ref; kinds?; recipientId?; reason; by? }): Promise<number>  // idempoten
dropForUserInProject(exec: Executor, userId: string, projectId: string): Promise<number>
inboxActionCount(exec: Executor, userId: string): Promise<number>
```
1. **Savepoint + tidak melempar**: seluruh isi `notify` dalam `exec.transaction(...)` (savepoint) + `try/catch` → `logger.warn({ err, kind }, 'notification skipped')` (tanpa PII, tanpa judul) dan return `{skipped: n}`. Kegagalan memutar balik hanya bagiannya; transaksi domain tetap commit. Maks **3 query** per panggilan (akses+status akun digabung; preferensi hanya `info`).
2. **Idempoten**: `INSERT … ON CONFLICT (recipient_id, dedupe_key)`: `action` → `DO NOTHING`; `info` → `DO UPDATE SET bundle_count = bundle_count+1, updated_at = now(), read_at = NULL, payload = excluded.payload`.
3. **Filter penerima di `notify()`** (bukan di pemanggil): bukan pelaku; `approval_status='approved'` dan tidak `banned`; masih punya akses ke `project_id` (anggota, atau level Admin+ lewat `server/access/level.ts`); preferensi `news` mati → lewati kartu `info`.
4. **Resolve di SERVICE, bukan controller**: `resolveNotifications` dipanggil di fungsi service yang mengubah status/penugasan, dalam `tx` yang sama. Controller Inbox hanya menulis `read_at`. Karena itu sesi UI, API key, dan MCP kelak otomatis menutup kartu.
5. **Isi aman**: snapshot judul ≤ batas judul tugas, kutipan ≤140 karakter, tanpa isi komentar penuh di log; nama pelaku di-join saat baca.

### 5.4 Endpoint `/api/app/inbox` (berkas `server/api/app-inbox.ts` ≤150, `.use(inboxApi)` di `app.ts`)
| Rute | Scope | Izin | Isi |
|---|---|---|---|
| `GET /inbox?lane=action|info&limit&cursor` | `app:read` | login; **hanya milik pemanggil** (`recipient_id = actor.user.id`, `userId` di query diabaikan, R12 C-INB-1) | keyset `(created_at|updated_at, id)` (`server/pm/keyset.ts`), `limit` default `PAGE_LIMIT_DEFAULT`, maks `PAGE_LIMIT_MAX`; item `{id, kind, lane, actor{id,name,image}, ref{type,id,number}, payload, bundleCount, read, group:'today'|'yesterday'|'older', createdAt, updatedAt, href}`; saring defensif akses proyek saat baca; kursor rusak → 400 `VALIDATION` |
| `GET /inbox/count` | `app:read`, **dikecualikan rate limit** | login | `{ action: n, infoUnread: n }` — dua `count(*)` index-only, tanpa cache |
| `POST /inbox/:id/read` | `app:write` | pemilik kartu; kartu orang lain → 404 identik | set `read_at` (idempoten) |
| `POST /inbox/read-all` | `app:write` | login | `UPDATE … WHERE recipient_id=:me AND lane='info' AND read_at IS NULL` → `{ updated }` |
Tidak ada rute buat/hapus kartu dari klien. Tidak masuk `PM_KEY_DENY` (tidak merusak). Pemanggil API key membaca/menandai milik pemilik kunci saja. Kode error mengikuti bentuk `{error, code, status, requestId}`. Kontrak `contract-v1` (13 URL halaman + ekspor beku) **tidak berubah**, hanya bertambah (K10).

### 5.5 Titik kait (nama fungsi nyata → `emit.*` di `server/notification/emit.task.ts`, `emit.project.ts`, `emit.account.ts`)
| Fungsi | Berkas:baris | notify | resolve |
|---|---|---|---|
| `createTask` | `task.service.ts:181` (setelah insert aktivitas, `.returning({id})`) | `task_assigned` bila `assigneeId` ≠ pembuat | – |
| `updateTask` (penugasan berubah) | `task.service.ts:253-283` | `task_assigned` baru; `task_unassigned` (info) ke lama | `task_assigned` assignee lama |
| `applyTransition` start | `task-workflow.service.ts:171` | – | `task_assigned` |
| `applyTransition` complete | idem | `task_done` ke pembuat + assignee | `task_assigned` |
| `applyTransition` cancel / reopen / uncancel | idem | `task_changed` (bundel) | `cancel`: semua `action` pada `ref=tugas` (`target_closed`) |
| `addComment` | `task-comment.service.ts:62-71` | `task_commented` (bundel jam) | – (resolve `mention` milik penulis: S4) |
| `addMember`/`changeMemberRole` | `member.service.ts:~118,~139` | `project_member_added`/`_role_changed` | – |
| `removeMember` | `member.service.ts:144` | – | `dropForUserInProject` |
| `trashProject` | `project-trash.service.ts:47` | – | semua `action` dengan `project_id` (`target_closed`); `restoreProject` tidak membuat ulang |
| `approveUser`/`rejectUser`/ban | `account/approval.service.ts:110` | `user_pending` dibuat saat pendaftaran (`signup-hooks.ts`) | semua `user_pending` untuk user itu |
| Hapus tugas ke Sampah (S6) | belum ada | – | wajib `resolve target_closed` (dicatat di §9 untuk rencana S6) |

## 6. DAFTAR TUGAS
**Konvensi** (berlaku semua tugas, tidak diulang; sama dengan P3 "Konvensi tugas" + "DoD umum" + "UI-DoD"): cabang `feature/s3-<lajur>` dari `main` terbaru, commit per tugas `<type>(<scope>): <english imperative>` + `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; tiap tugas menambah poin `CHANGELOG.md [Unreleased]` (Indonesia, sudut pandang user); `bun run test`, `bun run typecheck` (nol error), `bun run lint`; menyentuh `server/` → `smoke:prod` + `smoke:binary`; rute baru → petakan scope + tes; test DB lewat `DATABASE_URL_TEST` + `createCleaner`, auth lewat `installAuthSpies` (bukan `mock.module`); file ≤ batas (route 150, service 300, query 250, test 400). Migrasi: jalankan ke dev DAN test sebelum tes. B = berkas baru. Berkas S2 yang diedit hanya **≤10 baris kohesif per berkas** (aturan global §8; `task.service.ts` sudah 290/300); bila tak muat, hentikan dan minta tugas pemecahan lebih dulu, jangan paksa.

**§6.0 Peta paralel**: `I01 → I02 → I03 → I04` (N1/N2, **S3a**, dapat mulai sebelum gerbang S2 bila P-1 disetujui) ‖ `I08` (klien, dep I04). **Titik sinkron SYNC-G2** = gerbang S2-17 lulus. Setelah itu: `I05 ‖ I07 ‖ I14` (kait, berkas berbeda) → `I06` (setelah I05 karena `emit.task.ts` bersama) ; `I09 (N4) ‖ I10 (N3)` setelah I08; `I11` bebas setelah I03; `I12` terakhir; `I13` gerbang. Maks 3 aktif.

### I01 · Skema `notification`, `notification_pref`, migrasi 0017
**N1 · Dep: baton (nomor 0017) · S (1,5)** · **Target**: B `server/db/schema.notification.ts`, `server/db/schema.ts` (+1 ekspor), B `server/db/migrations/0017_<nama>.sql` (+ `meta/` hasil generate), B `tests/db/notification-schema.test.ts`. **Change**: tabel, CHECK, indeks (§5.1); komentar `-- Why:` (kartu Inbox butuh identitas kejadian agar `notify()` idempoten dan resolve massal murah); guard `IF NOT EXISTS`. **Constraints**: `timestamptz` via `tz()`; tidak ada `pgEnum`; tidak menyentuh `schema.task*.ts`. **Ownership**: hanya berkas di Target. **Acceptance**: migrasi jalan di dev dan test; `tests/db/notification-schema.test.ts`: UNIQUE `(recipient, dedupe_key)` menolak ganda, CHECK menolak lane asing, hapus user menghapus kartunya (cascade), hapus proyek menghapus kartu proyek, indeks parsial ada di `pg_indexes`; `drizzle-kit generate` = tanpa perubahan; `tests/db-schema-format.test.ts` hijau. **Commit**: `feat(db): add notification and notification_pref tables`.

### I02 · Katalog, tipe, penerima
**N1 · Dep: I01 · S (1,5)** · **Target**: B `server/notification/notification.catalog.ts` (≤200: `NOTIFICATION_KINDS` kind→`{lane, category, ttlDays?, shipped}`, `RESOLVE_REASONS`, salinan kalimat Indonesia per kind), B `server/notification/notification.types.ts` (`NotificationPayload` per kind), B `server/notification/notification.recipients.ts` (≤200: `followersOf(exec, taskId)`, `admins(exec)`, `filterRecipients(exec, {ids, actorId, projectId, lane})`), B `tests/notification/catalog.test.ts`, `tests/notification/recipients.test.ts`. **Change**: §5.2; `filterRecipients` = satu query join `user` + `project_member`/level. Kalimat tidak memakai jargon (glosarium P3: "yang mengerjakan", bukan assignee). **Acceptance**: tiap kind punya lane/kategori/salinan; `followersOf` memuat pembuat+assignee+penulis komentar tanpa duplikat; filter membuang pelaku, `pending`/`rejected`/`banned`, bukan-anggota, dan Admin tetap lolos; ≤1 query. **Commit**: `feat(notification): add kind catalog and recipient filter`.

### I03 · Inti `notify()`, `resolveNotifications()`, `dropForUserInProject()`
**N1 · Dep: I02 · M (3)** · **Target**: B `server/notification/notification.notify.ts` (≤300), B `server/notification/notification.resolve.ts` (≤200), B `tests/notification/notify.test.ts`, `tests/notification/resolve.test.ts`. **Change**: §5.3 butir 1-5. **Constraints**: tanpa `console.log`; `logger.warn` hanya `{err, kind}`; tidak ada `catch {}` kosong; tidak ada panggilan jaringan. **Acceptance** (`test.each` bila perlu): panggil dua kali kejadian `action` yang sama → 1 baris; `info` 3 kali dalam jam yang sama → 1 baris `bundle_count=3`, `read_at` kembali NULL; jam berbeda → 2 baris; **notify gagal (recipient tidak ada → FK, atau spy melempar) di dalam `inTx` yang juga menulis baris domain → baris domain TETAP commit**, hasil `skipped>0`; pelaku tidak menerima; preferensi `news=false` melewati `info` tetapi tidak `action`; `resolve` dua kali = 1 lalu 0 (idempoten); `resolve` memakai `reason`; `dropForUserInProject` hanya menghapus milik user+proyek itu; ≤3 query (penghitung). **Commit**: `feat(notification): add idempotent notify and resolve services`.

### I04 · Query + API baca/tandai + pengecualian rate limit (**penutup S3a**)
**N2 · Dep: I03 · M (2,5)** · **Target**: B `server/notification/notification.query.ts` (≤250: `listInbox`, `inboxCounts`, `inboxActionCount`, `markRead`, `markAllRead`), B `server/api/app-inbox.ts` (≤150), `server/api/app.ts` (+import +`.use(inboxApi)`), `server/rate-limit.ts` (+1 entri `DEFAULT_EXCLUDE_PREFIXES`), B `tests/api/inbox.test.ts`, B `tests/notification/inbox-query.test.ts`, `tests/api-keys/scopes.test.ts` (+assertion), `tests/rate-limit*.test.ts` (+kasus pengecualian). **Change**: §5.4; `group` hari ini/kemarin dihitung server dengan `METRICS.TIME_ZONE`. **Constraints**: filter `recipient_id` DI SQL; defensif akses proyek saat baca; `count` tanpa cache global (belajar dari `sidebar-badges.ts` cache satu promise). **Acceptance**: anonim → 401 (bukan 422); user A tidak melihat/menandai kartu user B (404 identik); `limit` dijepit; kursor rusak 400; 3 halaman keyset tanpa duplikat; `count` = jumlah `lane=action` terbuka (test kontrak badge = list); anggota yang dikeluarkan tidak melihat kartu proyek itu; **ratusan permintaan `/api/app/inbox/count` dari satu IP tidak kena 429** sedangkan `/api/app/tasks` tetap 429 pada batas; kunci API `app:read`/`app:write` terpetakan; 20 kartu → ≤3 query. **Commit**: `feat(inbox): add inbox read api and exempt count from rate limit`.

### I05 · Kait penugasan tugas (buat, ubah penugasan)
**N2 · Dep: I03, SYNC-G2 · M (2,5)** · **Target**: B `server/notification/emit.task.ts` (≤250: `emitTaskAssigned`, `emitTaskUnassigned`, `emitTaskDone`, `emitTaskChanged`, `emitTaskCommented`), `server/task/task.service.ts` (hanya `.returning({ id })` pada insert aktivitas + panggilan `emit*` ≤10 baris total di `createTask` dan `updateTask`), B `tests/notification/emit-task-assign.test.ts`. **Change**: §5.5 dua baris pertama; `sub` = id baris `task_activity`. Pemanggilan **di dalam `tx`** setelah insert aktivitas. **Constraints**: `task.service.ts` ≤300 baris — bila >300, ekstrak dulu (laporkan, jangan paksa); jangan mengubah kontrak respons/tanda tangan; tidak mengimpor `emit.*` dari controller. **Acceptance**: buat tugas dengan assignee lain → 1 kartu `task_assigned` untuk assignee, 0 untuk pembuat bila ia assignee; ubah assignee A→B: kartu A ter-resolve (`superseded`), B menerima, A menerima `task_unassigned`; tugas dibuat tanpa assignee → 0 kartu; **notify dipaksa gagal tetap menghasilkan tugas tersimpan**; tes lama S2 tetap hijau. **Commit**: `feat(task): notify assignee on task assignment`.

### I06 · Kait transisi status dan komentar
**N2 · Dep: I05 · M (2,5)** · **Target**: `server/task/task-workflow.service.ts` (≤10 baris: panggilan setelah insert aktivitas `:171`), `server/task/task-comment.service.ts` (≤10 baris di `addComment`), `server/notification/emit.task.ts` (lengkapi), B `tests/notification/emit-task-flow.test.ts`, B `tests/notification/resolve-any-path.test.ts`. **Change**: §5.5 baris transisi + komentar. **Acceptance — "hilang lewat jalur mana pun"**: untuk kartu `task_assigned`, aksi `start`, `complete`, `cancel`, ganti assignee masing-masing menutup kartu, dites lewat **(a) rute sesi** dan **(b) kunci API `app:write`** (`setApiKeyIdentity`); `complete` mengirim `task_done` ke pembuat+assignee (bukan pelaku); lima komentar dalam satu jam → 1 kartu `task_commented` `bundle_count=5` bagi pengikut, 0 bagi penulis; `reopen` tidak membuat ulang kartu `task_assigned` lama; kegagalan notifikasi tidak menggagalkan transisi (409 `STATE_CONFLICT` tetap hanya dari UPDATE bersyarat). **Commit**: `feat(task): notify and resolve inbox cards on status changes and comments`.

### I07 · Kait proyek dan anggota
**N2 · Dep: I03, SYNC-G2 · S (1,5)** · **Target**: B `server/notification/emit.project.ts`, `server/project/member.service.ts` (≤10 baris), `server/project/project-trash.service.ts` (≤10 baris), B `tests/notification/emit-project.test.ts`. **Change**: §5.5 baris proyek. **Acceptance**: tambah anggota → kartu `info` bagi dia; ubah peran → `project_role_changed`; keluarkan anggota → kartu `action`/`info` proyek itu bagi dia terhapus (`dropForUserInProject`) dan list-nya tidak memuat kartu itu; pindah proyek ke Sampah → semua `action` proyek itu `resolved` (`target_closed`), badge turun; pulihkan tidak menghidupkan ulang. **Commit**: `feat(project): notify members and clear cards on removal and trash`.

### I08 · Klien Inbox: API, kunci query, hook hitungan
**N3 · Dep: I04 · S (1,5)** · **Target**: B `app/lib/inbox-api.ts` (Eden `client.api.app.inbox`), B `app/components/inbox/useInboxCount.ts`, B `app/components/inbox/useInboxActions.tsx` (tandai dibaca, baca semua), B `app/components/inbox/inbox.copy.ts` (konstanta teks), B `tests/inbox-api.test.ts`. **Change**: kunci `inboxKeys = { count, list(lane) }`; opsi polling §4 baris "Polling"; pesan error dari `code`. **Constraints**: tanpa `window.alert/confirm`; teks di `inbox.copy.ts` ≤200 baris. **Acceptance**: tes pemetaan error dan opsi query (`refetchInterval:60000`, `refetchOnWindowFocus:true`, `retry` false pada 401). **Commit**: `feat(inbox-ui): add inbox api client and count polling hook`.

### I09 · Lonceng, badge menu, NAV, rute (pemilik tunggal berkas bingkai)
**N4 · Dep: I08, SYNC-G2 · M (2)** · **Target**: B `app/components/inbox/NotificationBell.tsx`, `app/components/AppFrame.tsx` (prop opsional `bell?: ReactNode`, dirender di slot `extra` dan header mobile; area lain tidak mengirimnya → perilaku `/dev`/`/dashboard` tak berubah), `app/routes/app/layout.tsx` (NAV Inbox setelah Beranda; loader menambah `inboxCount` via `inboxActionCount`; `navBadges`), `app/routes.ts` (`route('app/inbox', 'routes/app/inbox.tsx')`), `tests/contract-v1.test.ts` (+baris `/app/inbox`, urutan NAV; PCC aditif), `tests/app-nav.test.ts`, `tests/frame-nav.test.ts`, B `tests/inbox-bell.test.tsx` bila ada pola tes komponen. **Acceptance**: angka lonceng = badge menu = hitungan server pada render pertama (tanpa kedip); klien memperbarui lewat hook; `aria-label` benar; Burger tetap di `AppShell.Header` (tanpa elemen fixed); `bun run test` hijau termasuk `contract-v1` setelah baris snapshot ditambah; smoke SSR tidak hydration-mismatch (`smoke:prod`). **Commit**: `feat(inbox-ui): add notification bell, menu badge and inbox route`.

### I10 · Halaman Inbox
**N3 · Dep: I08, I09 (rute) · M (3)** · **Target**: B `app/routes/app/inbox.tsx` (≤150), B `app/components/inbox/InboxCard.tsx` (≤150), B `app/components/inbox/InboxList.tsx`, B `app/components/inbox/InboxEmpty.tsx`, `app/components/tasks/useTaskActions.tsx` (+1 baris `invalidateQueries(inboxKeys.all)` pada sukses aksi; **satu-satunya** sentuhan berkas L3), B `tests/app-routes.test.ts` (kasus loader `requireUser` Inbox, bila belum otomatis), B `tests/inbox-page.test.ts`. **Change**: §4 seluruh tabel. Kelompok hari dari `group` server. **Constraints**: Mantine saja; tidak ada `role ===`; ikon `1.25em`; loading/gagal/kosong semua ada; tombol kartu satu per kartu. **Acceptance**: loader memanggil `requireUser` sebagai pernyataan pertama (tes pemindai rute); keadaan kosong kedua tab; tab lewat URL; "Tandai semua dibaca" `loading` lalu notifikasi dan titik hilang; kartu `action` yang sudah ter-resolve hilang di pembaruan berikutnya; QA tangan 3 ukuran teks × 375/768/1280 px dicatat di `uji-pengguna/qa-s3-inbox.md` (B). **Commit**: `feat(inbox-ui): add inbox page with action and news tabs`.

### I11 · Scheduler pembersih
**N1 · Dep: I03 · S (1)** · **Target**: B `server/notification/notification.scheduler.ts` (≤120), `server/api/index.ts` (+1 baris dalam blok `NODE_ENV !== 'test'`), `server/env.ts`/konstanta `NOTIF_RETENTION_DAYS=30` di `server/notification/notification.catalog.ts` (jangan masuk skema `env.ts`), B `tests/notification/scheduler.test.ts`. **Change**: tick harian (pola `settings-retention.ts`), hapus kartu `info` dan `action` ber-`resolved_at` lebih tua dari retensi, batch 500 (pola `server/demo/cleanup.ts`), `logger.info` jumlah saja. **Acceptance**: tes dengan jam disuntik: kartu 31 hari terhapus, 29 hari tetap, `action` terbuka tak pernah dihapus; tick ganda aman; tidak dipasang saat `NODE_ENV=test`. **Commit**: `feat(notification): purge old inbox cards on a daily schedule`.

### I12 · Kontrak lintas-jalur, keamanan, kinerja, smoke, dokumen
**N2 · Dep: I06, I07, I10 · M (2,5)** · **Target**: B `tests/notification/contract-paths.test.ts`, B `tests/notification/inbox-security.test.ts`, B `tests/perf/pm-load.inbox.test.ts`, `scripts/smoke-server.checks.ts` (+entri `/api/app/inbox/count` → 401 tanpa sesi), `README.md` (hanya bagian kontrak API: tambah 4 rute Inbox), `CHANGELOG.md`. **Change**: (a) tes kontrak "tiap kind `action` yang `shipped` punya ≥1 jalur resolve yang dites" membaca katalog; (b) IDOR: user A ke kartu/hitungan B; `userId` liar di query; mass-assignment tidak ada; (c) log: spy `logger` tidak memuat judul/kutipan/email; (d) kinerja: `count` ≤2 query dan `list` ≤3 query untuk n=50 dan n=500; `EXPLAIN` memakai indeks parsial (laporan, bukan gerbang CI); (e) 30 pengguna serentak mem-poll `/count` tidak membuat 429. **Acceptance**: semua hijau, `smoke:prod` dan `smoke:binary` hijau; `tests/readme-endpoint.test.ts` hijau. **Commit**: `test(inbox): add cross-path, security and load guards`.

### I13 · Integrasi dan gerbang demo S3-Inbox
**N2 · Dep: I12 · S (1)** · **Target**: B `tahapan-proyek/05-implementasi/uji-pengguna/demo-s3-inbox.md`, `PROGRES.md` (hanya oleh koordinator). **Change**: peta kriteria §7 → bukti mesin/tangan. **Acceptance**: setiap kriteria §7 punya baris bukti; sisa = demo user. **Commit**: `docs(inbox): add S3 inbox demo gate checklist`.

### I14 · (Opsional, Should) Kartu "Pengguna baru menunggu persetujuan"
**N2 · Dep: I03, SYNC-G2 · S (1)** · **Target**: B `server/notification/emit.account.ts`, `server/account/signup-hooks.ts` (≤10 baris), `server/account/approval.service.ts` (≤10 baris di approve/reject), B `tests/notification/emit-account.test.ts`. **Change**: pendaftaran baru berstatus `pending` → `user_pending` ke semua Admin+super-admin; `approveUser`/`rejectUser`/ban → resolve untuk SEMUA penerima. Tombol "Buka Pengguna" → `/dashboard/users`. **Constraints**: Admin tak punya proyek → `project_id` NULL; berkas `server/auth.ts`/`guard.ts`/`permissions.ts` TIDAK disentuh (aturan merge per tugas). **Acceptance**: dua Admin, satu menyetujui → kartu kedua Admin ikut hilang; ban/reject juga; pendaftaran ulang email sama tidak menggandakan. **Commit**: `feat(account): notify admins of pending sign-ups`.

### Sketsa S4 (belum siap tempel; dipertajam setelah S4 diputuskan)
- **I20 · Mention (T14)** — Dep: komposer komentar mengirim **id user** (R07 D2), tabel `task_comment_mention`, I06. Kartu `mention` "Balas", TTL `NOTIF_MENTION_TTL_DAYS=14`, resolve saat penerima membalas. Pertanyaan R07 §6.3 ("Tidak perlu dibalas") dibawa.
- **I21 · Kartu Terlambat 3 tombol (T16)** — Dep: S4 Periksa + `tenggat`. Satu-satunya kartu >1 tombol di S3-S4; butuh keputusan UX R11.

## 7. Gerbang & kriteria demo (dapat diuji)
| # | Kriteria (R10 §3.3 S3, Inbox saja) | Bukti |
|---|---|---|
| G-1 | PM menugaskan Dodi → lonceng Dodi berubah ≤ 70 dtk di tab lain; Dodi membuka kartu "Lihat tugas" | `tests/notification/emit-task-assign.test.ts` + demo tangan (dua sesi) |
| G-2 | Dodi memulai/menyelesaikan tugas → kartu hilang sendiri, lewat UI **dan** lewat API key | `resolve-any-path.test.ts` |
| G-3 | Badge menu = lonceng = jumlah kartu `action` terbuka (test kontrak) | `inbox.test.ts` (count = list) |
| G-4 | `notify()` idempoten (`dedupe_key` sama → 1 baris) dan tidak pernah menggagalkan transaksi domain | `notify.test.ts` |
| G-5 | Endpoint hitungan dikecualikan dari rate limit; endpoint lain tetap dibatasi | I04 + I12 |
| G-6 | Kabar terbaru: komentar berulang dibundel per jam; Tandai semua dibaca menghapus titik | `emit-task-flow.test.ts`, `inbox-page.test.ts` |
| G-7 | Keluarkan anggota/Sampah proyek → kartunya hilang; tak ada kebocoran judul | `emit-project.test.ts`, `inbox-security.test.ts` |
| G-8 | Pengguna A tidak bisa membaca/menandai kartu B; log bebas PII | `inbox-security.test.ts` |
| G-9 | 3 ukuran teks × 375 px: tidak ada overflow horizontal, lonceng bisa ditekan | `qa-s3-inbox.md` (tangan) |
| G-10 | `typecheck` nol, `bun run test` hijau, `smoke:prod`+`smoke:binary` hijau, `contract-v1` hijau dengan baris Inbox | CI lokal |

## 8. Risiko & mitigasi
| # | Risiko | K / D | Mitigasi |
|---|---|---|---|
| R-1 | Kait menambah baris ke `task.service.ts` (290/300) → melanggar file health | Tinggi / Sedang | Batas ≤10 baris + `emit.task.ts` menampung logika; bila tak muat, tugas ekstraksi `task.patch.ts` dahulu (diminta ke pemilik L2), bukan menimpa |
| R-2 | Kait dibangun sebelum S2-16 selesai dan bentrok dengan perbaikan temuan uji pengguna | Sedang / Sedang | I05-I07 menunggu SYNC-G2; S3a tidak menyentuh S2 |
| R-3 | Kartu `task_assigned` menumpuk (tugas tak pernah dimulai) → lansia mengabaikan lonceng | Sedang / Tinggi | Resolve saat mulai/selesai/batal/ganti penugasan; pantau jumlah kartu terbuka per user di tes beban; keputusan kebijakan (TTL/“tandai sudah dilihat”) dibawa ke P-4 |
| R-4 | Polling memakan kuota rate limit satu IP kantor | Sedang / Sedang | Prefix dikecualikan + interval 60 dtk + berhenti saat tab tersembunyi; bila Admin menyimpan daftar kustom, pengecualian hilang → catatan di README kontrak dan fallback 120 dtk (konstanta) |
| R-5 | `notify()` di dalam transaksi memperlambat/mengunci aksi domain | Rendah / Sedang | Savepoint, ≤3 query ringan, indeks, tanpa jaringan; tes penghitung query |
| R-6 | Penerima bocor (judul tugas proyek yang akses dicabut) | Rendah / Tinggi | Filter akses saat kirim + `dropForUserInProject` + filter defensif saat baca; G-7 |
| R-7 | Pool DB 5 koneksi antre bila banyak pengguna poll bersamaan dengan aksi | Sedang / Rendah | `count` = 2 `count(*)` index-only dan `getSession`; tidak ada cache global; ukur di I12 |
| R-8 | Migrasi 0017 bentrok nomor dengan Events 0018 / pemilik lain | Sedang / Sedang | Nomor diklaim pemegang baton sebelum I01; hanya satu migrasi untuk Inbox |
| R-9 | Nama `notify` bentrok antara toast klien (`app/components/ui/notify.ts`) dan service server | Rendah / Rendah | Berkas server `notification.*`, fungsi `notify` hanya di `server/notification/`; tidak diimpor ke `app/` (Vite memuat dua salinan modul, lihat CLAUDE.md "Bundle SSR") |
| R-10 | Perubahan `AppFrame.tsx` (dipakai semua area) mengubah `/dev`/`/dashboard` | Rendah / Sedang | Prop opsional; tes `frame-nav`/`app-nav`; satu pemilik (N4) |
| R-11 | Hitungan hari "Hari ini/Kemarin" bergeser di tepi 00.00 WIB | Sedang / Rendah | Dihitung server dari `TIME_ZONE`; tes pukul 23.30 dan 00.30 WIB |

## 9. Kontradiksi baru & Dampak ke dokumen lain
| # | Kontradiksi / keputusan baru | Default konservatif yang dipakai |
|---|---|---|
| K-1 | R10 I1 menuntut kartu "hilang otomatis" tetapi di S3 hanya `task_assigned` yang punya kartu `action` (Periksa dan Mention S4) | Bangun mesin lengkap; kirim hanya kind S3; katalog mencadangkan sisanya (tidak menutup pilihan) |
| K-2 | R07 menamai tabel plural (`notifications`, `tasks.reviewer_id`); kode memakai **singular** (`task`, `task_activity`, `project_member`; `schema.task.ts`) | Singular: `notification`, `notification_pref` (fondasi kode menang) |
| K-3 | R12 (`R12 §retensi`, baris 228) menulis Inbox dihapus 90 hari **setelah dibaca**; R07/`06-inbox.md` pertanyaan 2 mengusulkan 30 hari | `NOTIF_RETENTION_DAYS=30` (lebih ketat bagi privasi), konstanta bernama; P-3 |
| K-4 | `06-inbox.md` #1 "lonceng di top bar", padahal `/app` tak punya top bar desktop (`AppFrame.tsx:121`) | Lonceng di sidebar + header mobile (R07 §3.8); P-2 |
| K-5 | Menambah rute `/app/inbox` dan entri NAV mengubah snapshot `contract-v1` (13 URL, urutan NAV) | Penambahan aditif lewat Permintaan Perubahan Kontrak di I09: baris snapshot + catatan di `docs/decisions/0002-contract-v1.md` |
| K-6 | R07 menyebut jam bundel dari offset zona bulat; `APP_TIME_ZONE` kini tunggal WIB (KEPUTUSAN Q1) | Gunakan jam UTC (setara jam dinding WIB); kontradiksi hilang |
| K-7 | R07 §3.5 butir 1 menyebut `server/notification/emit/*.ts` subfolder; konvensi repo berkas datar `modul.bagian.ts` | Berkas datar: `emit.task.ts`, `emit.project.ts`, `emit.account.ts` |

**Dampak ke dokumen lain (READ-ONLY di sini, ditulis untuk pemilik)**: (1) `tests/contract-v1.test.ts` + ADR `docs/decisions/0002-contract-v1.md`: tambah Inbox (K-5). (2) `PROGRES.md`: tambah blok S3-Inbox I01-I14 setelah user menyetujui. (3) `R10 §3.3 S3`: kalimat "migrasi 0017" mengikat I01. (4) `CLAUDE.md` project: tambah kalimat konvensi "`notify()` dipanggil dari service dalam `tx`, bukan controller" dan "menambah endpoint polling = daftarkan pengecualian rate limit". (5) Rencana S6 (Sampah): hapus tugas wajib memanggil `resolveNotifications(target_closed)`. (6) Rencana Beranda: gunakan `inboxActionCount()` untuk W9 dan jangan menghitung ulang. (7) Rencana Events (S7): pakai `notify()`, kind `event_*`, migrasi 0018.

## 10. Pertanyaan untuk user
| # | Pertanyaan | Saran |
|---|---|---|
| **P-1** | Boleh S3a (I01-I04: tabel, `notify()`, API baca) dimulai **sebelum** gerbang S2-17 lulus (penguji nyata belum ada), selama tidak menyentuh berkas S2? Atau tunggu penuh? | **Boleh** — murni berkas baru, tidak mengubah perilaku yang sudah ada; kait dan UI tetap menunggu gerbang |
| **P-2** | Lonceng di sidebar (sebelah tombol tema) + header mobile, atau perlu top bar desktop baru? | Sidebar + header mobile; top bar baru mengubah shell semua area |
| **P-3** | Retensi kartu 30 hari (R07/desain) atau 90 hari setelah dibaca (R12)? | 30 hari |
| P-4 | Kartu "Ditugaskan" yang tak pernah ditindaklanjuti: boleh hilang sendiri setelah 14 hari (seperti Mention) dan/atau ada tautan "Sudah saya lihat"? Desain: satu tombol per kartu | Tanpa tombol tambahan di S3; pantau jumlah kartu terbuka, putuskan setelah uji; TTL 14 hari lewat `ttlDays` katalog bila perlu |
| P-5 | `user_pending` (I14) masuk S3 atau cukup badge "Pengguna" di `/dashboard`? | Masuk sebagai Should; tidak menghambat gerbang |
| P-6 | Tabel `notification_pref` dibuat sekarang tanpa UI — setuju? | Setuju (murah, mencegah migrasi tambahan) |

## 11. Sumber
Riset: `riset/R07-beranda-inbox.md` §3.3-§3.8, §4, §5; `R10-mvp-scope-roadmap.md` §3.1 (I1, I2, T14, T16), §3.3 (S3), baris 232/259/294; `R12-keamanan-privasi.md` C-INB-1 (baris 148), retensi (baris 228), C-ACC-6; `R11-ux-awam-lansia.md` D8, glosarium; `R03` (hitungan/akses). Desain: `03-desain/erd/diskusi/06-inbox.md` §1-§4. Rencana: `rencana/P3-s1-s2-proyek-tugas.md` (konvensi tugas, DoD, UI-DoD, §5 S2-04/05/06), `_BRIEF-TAHAP2.md`, `KEPUTUSAN-MVP-INTI.md` §2-§6, `PROGRES.md` (G19-G20). Kode (dibaca di worktree): `server/pm/tx.ts:4-15`, `server/pm/limits.ts:15-32`, `server/pm/keyset.ts`, `server/db/schema.columns.ts:7-16`, `schema.task.ts:35-98`, `schema.task-detail.ts:50-64`, `schema.auth.ts:24-36`, `migrations/0016_task_core.sql:1`, `server/task/task.service.ts:118-290`, `task-workflow.service.ts:120-205`, `task-comment.service.ts:53-144`, `server/project/member.service.ts`, `project-trash.service.ts:47`, `server/account/approval.service.ts:110`, `server/api/app.ts`, `server/rate-limit.ts:33,103`, `server/api-keys/scopes.ts:185`, `server/api/index.ts:40-48`, `app/components/AppFrame.tsx:62,121,134,167`, `app/routes/app/layout.tsx`, `app/routes.ts:14-32`, `app/components/frame/nav.ts`, `app/lib/query.tsx`, `tests/contract-v1.test.ts:70-76,153`, `ls server/mcp/tools`. **Bukti belum diverifikasi**: (1) `getSession` memakan ±1 query/poll (R07 ASUMSI, `cookieCache` tak ditemukan di `server/auth.ts`); (2) biaya `count` index-only <5 ms; (3) nomor baris `member.service.ts` yang bertanda `~`; (4) bahwa `matchesProjectScope`/`levelOf` cukup untuk filter akses defensif (worker I04 memeriksa).
