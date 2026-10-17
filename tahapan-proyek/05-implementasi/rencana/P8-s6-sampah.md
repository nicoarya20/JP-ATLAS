# P8 — Rencana eksekusi S6: Menu Sampah (lengkap)

> 18 Okt 2026 · tahap 2 · BELUM ada kode. Cabang rencana `plan/p8-sampah`. Mengikat: `../KEPUTUSAN-MVP-INTI.md` (X1-Q1 hapus tanpa dialog + Urungkan; baris 15 Okt "Hapus proyek pilihan B/pilihan 2"). Sumber: R08 §3.3, R10 §3.1/§3.3 (Z1, Z2, S6), R12 (T22, C-TRASH-1..3, audit), R14. Fondasi kode menang atas desain; kutipan `path:baris` adalah yang dibaca di worktree ini. Tanda ASUMSI = belum diverifikasi.

## 1. Ringkasan
- Melengkapkan Sampah yang sekarang **hanya proyek** (S1-18): menambah entri **Tugas** (dan titik sambung untuk **Event**, S7), **pulihkan berantai** (tugas yang dihapus lebih dulu tidak ikut pulih), **hapus permanen khusus Admin** (dialog T3, ketik nama; PM → 403), **purge otomatis 30 hari** (objek S3 dihapus dulu, idempoten), dan **mengaktifkan hapus tugas** (T1 + Urungkan) yang sengaja belum dipasang di S2.
- **8 tugas, Z-01..Z-08**, total ≈ **12-14 hari-orang AI** (R08 Sampah 4-6 + hapus tugas + proyek-purge; R10 menaksir S6 Sampah ±4-6) + reviewer ≈ 3 hari (fokus: cascade, purge, visibilitas, T3).
- **Tanpa migrasi baru** untuk Proyek+Tugas: `task.deleted_at/by/deleted_with_project_id` dan indeks parsialnya sudah ada (`server/db/schema.task.ts:101,139-143`). Kolom Event (`deleted_*`, `event_series`) milik migrasi 0018 S7, bukan tugas ini.
- **Tiga batas lunak**: Event (S7) dan Lampiran (S5) belum ada → Sampah dibuat dengan **registri jenis** (`TrashKind`) dan **kaitan berkas** (`TaskFileCleaner`); S5/S7 tinggal mendaftar. Sampai itu, jenis Event tidak muncul dan pembersih berkas no-op.
- **Janji "30 hari" di UI hanya muncul bila purge aktif** (R10 Z2): API mengembalikan `retention.autoPurge`; bila `false`, teks hanya berbunyi "Bisa dipulihkan sampai <tanggal>" tanpa janji dihapus otomatis.
- Pertanyaan terpenting: siapa boleh menghapus tugas (§10 Q1), apakah kunci API boleh menghapus tugas (Q2), perilaku purge saat penyimpanan mati (Q3).

## 2. Keadaan sekarang (dibaca di kode)
| Hal | Fakta | Path:baris |
|---|---|---|
| Halaman | Hanya daftar proyek; loader `requireUser` lalu `listTrashProjects`; tombol Pulihkan lewat `useTrashActions`; `useInfiniteQuery` page/limit | `app/routes/app/trash.tsx:21-79` |
| Salinan | Teks sengaja jujur: "belum ada hapus permanen/pembersihan otomatis" | `app/components/trash/trash.copy.ts:1-5` |
| API | `GET /trash` (`{items,total,page,limit}`) dan `POST /trash/project/:id/restore`; audit `PROJECT_RESTORE` dengan email dimask | `server/api/app-trash.ts:19-52` |
| Servis proyek | `trashProject` menandai tugas **hidup saja** `deleted_with_project_id`; `restoreProject` memulihkan hanya `deleted_with_project_id = P`. Satu `inTx` + `lockProject FOR UPDATE`. Komentar: "tidak ada hapus permanen/purge: milik S6" | `server/project/project-trash.service.ts:1-100` |
| Kebijakan | `canViewTrashItem`, `trashItemCaps` (kunci `restore`; "S6 menambah `purge`"), `trashListScope` (`all` / `deletedByOrManaged`) | `server/access/trash.policy.ts:15-17,52-75` |
| Retensi | `TRASH_RETENTION_DAYS: 30`; `trashDaysLeft/isRestorable` hitung **hari kalender zona tim** (hari hapus = hari 1); `lastRestorableDate` | `server/metrics/config.ts:9`, `server/metrics/trash.metrics.ts:7-26` |
| Tugas | Tidak ada rute hapus ("Sampah tugas dikirim di S6, X1-Q1"); `createTask/updateTask` saja | `server/api/app-tasks.write.ts:1-39` |
| Komentar | `task_comments.deleted_at` ada tapi **tidak masuk Sampah** (R02 §3.5); kunci API dilarang menghapus komentar/langkah | `server/db/schema.task-detail.ts:29-43`, `server/api-keys/scopes.pm.ts:19-28` |
| Tolak tulis | Kode `PROJECT_IN_TRASH` (409) dan `ROLE_CANNOT_TRASH` sudah ada; **belum ada** kode "hanya Admin yang boleh hapus permanen" | `server/access/decision.ts:95,116`, `server/pm/errors.ts:47,51,138` |
| Kunci API | `POST trash/*` sudah di `PM_KEY_DENY` (+ `PM_DENY_OWNER` → `app-trash.ts`); `DELETE trash/*` dan `DELETE tasks/:id` **belum** | `server/api-keys/scopes.pm.ts:15-17,34` |
| Audit | `PROJECT_TRASH/RESTORE`; `AuditTargetType` tanpa `task`/`trash`; label di `ACTION_META` | `server/audit.ts:42-55`, `app/lib/audit-api.ts:118-119` |
| Penjadwal | Pola: `setInterval(...).unref?.()` + `setTimeout` awal, gagal-lunak; belum ada penjadwal Sampah | `server/settings-retention.ts:100-117`, `server/demo/cleanup.ts:36-44` |
| Penyimpanan | `storageEnabled()`, `storage()` (`Bun.S3Client`); **belum ada tabel lampiran** (S5) | `server/storage/index.ts:12-17` |
| Tes ada | `tests/project/project-trash.service.test.ts`, `tests/project/trash-visibility.test.ts`, `tests/api-keys/scopes.pm.test.ts:71-83` (sudah mencantumkan `POST /trash/task/t1/restore`) | – |

## 3. Lingkup & non-lingkup
| # | Butir | R10 | Masuk? |
|---|---|---|---|
| Z1a | Sampah memuat **Proyek + Tugas**, penyaring Semua/Proyek/Tugas + jumlah, "termasuk N tugas" | Z1 Must | **Ya** |
| Z1b | Hapus tugas ke Sampah (tanpa dialog, Urungkan ±10 dtk) dari detail & daftar tugas | Z1/X1-Q1 Must | **Ya** |
| Z1c | Pulihkan berantai + tolak 409 `PROJECT_IN_TRASH` untuk tugas yang proyeknya di Sampah | Z1 Must | **Ya** |
| Z1d | Hapus permanen proyek/tugas, **Admin saja**, T3 | Z1 Must | **Ya** |
| Z2 | Purge otomatis 30 hari, objek S3 dulu, idempoten, tick terlewat aman | Z2 Should | **Ya** |
| Z3 | Entri **Event** & rangkaian berulang di Sampah | R08 | **Kaitan saja** (isi oleh S7) |
| Z4 | Pembersihan objek lampiran | R08 | **Kaitan saja** (isi oleh S5) |
| – | Urungkan komentar/bukti di detail tugas; pulihkan massal; hapus massal | R08 "ditunda" | Tidak |
| – | Mengubah masa simpan (setelan Admin) | – | Tidak (konstanta `TRASH_RETENTION_DAYS`) |

## 4. Layar & perilaku
**Rute**: tetap `/app/trash` (`app/routes/app/trash.tsx`, sudah di `NAV` dan `routes.ts`; `meta()` "Sampah — Simple PM" sudah ada). Tidak ada rute baru. Loader tetap `await requireUser(request)` pertama (dijaga `tests/app-routes.test.ts`).

| Elemen | Perilaku |
|---|---|
| Penyaring | `SegmentedControl` Mantine: **Semua · Proyek · Tugas** + jumlah per jenis dari satu kueri hitung; "Event" muncul hanya bila jenis terdaftar (S7). Pilihan diingat di query-string `?jenis=` |
| Baris Proyek | Nama, "termasuk N tugas", dihapus oleh/tanggal, "Bisa dipulihkan sampai <tgl>" (atau "Tinggal N hari" bila `autoPurge`), **Pulihkan**, **Hapus permanen** (hanya bila `can.purge`) |
| Baris Tugas | Judul, "#nomor · Proyek X", dihapus oleh/tanggal. Bila proyeknya di Sampah: tombol Pulihkan **nonaktif** dengan label "Pulihkan proyeknya dulu" + tautan "Lihat proyeknya" (filter ke baris proyek) |
| Tugas ikut proyek | Tugas ber-`deleted_with_project_id` **tidak** jadi baris sendiri (ada di hitungan proyek). Tugas yang dihapus **sebelum** proyeknya tetap baris sendiri (R08 kasus 5) |
| Hapus tugas (T1) | Menu ⋯ tugas (`TaskMenu.tsx`) dan baris daftar: "Hapus tugas" → **langsung**, toast Mantine "Tugas dipindah ke Sampah" + **Urungkan** (±10 dtk, `autoClose` 10000) → `POST restore`. Tanpa `confirm`. Tombol `loading`; gagal → toast jelas |
| Hapus permanen (T3) | `modals.open` dengan teks dampak ("Proyek X beserta 12 tugas dan 3 berkas akan dihapus selamanya dan tidak bisa dipulihkan") + `TextInput` ketik **nama persis**; tombol merah "Hapus selamanya" nonaktif sampai cocok. Dialog tidak ada di bundel peran non-Admin (`can.purge` dari server, bukan `role ===`) |
| Kosong | Sampah kosong: "Sampah kosong. Proyek dan tugas yang dihapus muncul di sini." Per-penyaring: "Tidak ada tugas di Sampah." |
| Janji 30 hari | Teks "dihapus otomatis setelah 30 hari" **hanya** bila `retention.autoPurge === true`; kalau tidak, hanya tanggal batas pulihkan (salinan jujur S1 dipertahankan sebagai cabang) |
| Mobile (375 px) | Tabel desktop `visibleFrom="sm"`, kartu `hiddenFrom="sm"` (pola `TrashProjectList.tsx`); aksi `ActionIcon`/tombol ukuran bawaan area `/app` (44-50 px), `gap="xs"`; header `wrap="wrap"`; ikon `size="1.25em"`; tanpa lebar piksel tetap; skala teks 1/1,25/1,5 ikut tema |
| Bahasa | "Pulihkan", "Hapus selamanya", "Urungkan"; galat: "Gagal memulihkan. Coba lagi."; 410: "Sudah lewat 30 hari, tidak bisa dipulihkan lagi."; 409: "Proyeknya masih di Sampah. Pulihkan proyeknya dulu." |

## 5. Data & API
**Skema**: tidak ada migrasi untuk Proyek+Tugas. **Usulan indeks (hanya bila `EXPLAIN` perlu):** `task_deleted_by_idx (deleted_by) WHERE deleted_at IS NOT NULL` — jika dibuat, nomor migrasi diminta ke pemegang baton (0017 = S3a notifikasi; Sampah usulkan nomor berikutnya yang kosong, jangan klaim). Kolom Event/rangkaian: S7.

**Endpoint** (`/api/app/trash`, tetap di `app-trash.ts`; bila >150 baris dipecah `app-trash.write.ts`):
| Metode · Path | Fungsi | Izin | Scope kunci |
|---|---|---|---|
| `GET /` `?kind=all\|project\|task&page&limit` | `{items[], counts{project,task}, retention{days,autoPurge}, total, page, limit}`; item = gabungan terdiskriminasi `kind`; `can{restore,purge}`, `daysLeft`, `blockedBy?{projectId,name}` | Admin semua; PM/Member: `deleted_by = saya` ATAU proyek yang saya kelola | `app:read` |
| `POST /task/:id/restore` | 200 `{id}` · 403 · 404 · 409 `PROJECT_IN_TRASH` · 410 `EXPIRED` | Admin, Pengelola proyek, atau yang menghapus | session saja (`PM_KEY_DENY` sudah mencakup `POST trash/*`) |
| `DELETE /:kind/:id` (`project`\|`task`) | 200 `{id, files}` · 403 `ROLE_CANNOT_PURGE` · 404 (idempoten kedua) · 409 `NOT_IN_TRASH` · terblokir saat menyamar | **Admin & Super-admin saja** | **ditolak kunci** (tambah `DELETE trash/*`) |
| `DELETE /tasks/:id` (di `app-tasks.write.ts`) | 200 `{trash:{kind:'task',id,label}}`; 409 `PROJECT_IN_TRASH` bila proyek sudah di Sampah | lihat Q1 | **ditolak kunci** bila Q2=ya (tambah `DELETE tasks/:id`) |
Rute baru wajib di `scopes.ts` (`requiredScope`) + assertion `tests/api-keys/scopes.test.ts` dan `scopes.pm.test.ts`; owner di `PM_DENY_OWNER`. **Kontrak**: `contract-v1` beku (13 URL `/app`). Menambah `kind` pada item & `counts/retention` pada `GET /trash` bersifat **aditif**, dan rute baru di bawah `/trash` serta `DELETE /tasks/:id` adalah penambahan: dicatat sebagai **Permintaan Perubahan Kontrak minor** (§9) — bukan ubahan bentuk lama (`items,total,page,limit` tetap).

**Kode galat baru** (berkas bersama `server/pm/errors.ts` + `server/access/decision.ts`, satu pemilik, Z-01): `ROLE_CANNOT_PURGE` (403, "Hanya admin yang boleh menghapus selamanya."), `NOT_IN_TRASH` (409). Memakai ulang `PROJECT_IN_TRASH`, `EXPIRED`, `IMPERSONATING`.

**Kebijakan** (`server/access/trash.policy.ts`, murni): `canTrashTask` (Q1), `canRestoreTask` (Admin/Pengelola/penghapus; lewat 30 hari → `EXPIRED`; proyek di Sampah → `PROJECT_IN_TRASH`), `canPurge` (`isAdminRole`; menyamar → `IMPERSONATING`); `TrashItemCapKey = 'restore'|'purge'`.

**Registri jenis** (`server/trash/trash.kinds.ts`): `TrashKind = { kind, list(scope,now,page), restore, purge, fileKeys }`; Proyek dan Tugas terdaftar di sini; S7 menambah `event`. **Kaitan berkas**: `registerTaskFileCleaner((taskIds, tx) => string[])` mengembalikan kunci objek; S5 mendaftar, sampai itu no-op.

**Daftar**: dua `SELECT` ringan ber-`UNION ALL` (`kind,id,deleted_at`) diurut `deleted_at DESC, kind, id` dengan `LIMIT/OFFSET` (bentuk page/limit lama dipertahankan; kursor R08 ditunda karena fondasi menang), lalu hidrasi per jenis dengan `inArray` (tanpa N+1). Hanya `deleted_at` dalam jendela retensi (`isRestorable`). Jumlah per jenis: `count(*) FILTER`. Tugas `deleted_with_project_id IS NULL` saja.

**Purge** (`server/trash/trash.purge.ts` ≤250, `trash.scheduler.ts` ≤60): `purgeBefore(now)` di `trash.metrics.ts` = awal hari kalender (zona tim) `today − (RETENTION−1)`; item purgeable ⇔ `deleted_at < purgeBefore` ⇔ `!isRestorable` (satu definisi, tes paritas). Per batch ≤500: kunci `pg_try_advisory_xact_lock` → pilih tugas kedaluwarsa (dulu) → kumpulkan kunci objek → `storage().delete` (gagal → **lewati item**, `logger.warn` tanpa PII, coba lagi tick berikutnya) → hapus baris tugas (anak: langkah/komentar lewat FK CASCADE, ASUMSI) → lalu proyek kedaluwarsa **bila tak punya tugas tersisa** (tugas ikutan ikut dihapus bersamanya) → `audit()` sistem `trash.retention {projects,tasks,files}`. Tick per jam (`setInterval(...).unref()`), tanpa kolom `lastRun`, ditambah `setTimeout` awal 30 dtk; didaftarkan dari `server/api/index.ts` bersama penjadwal lain; set `globalThis.__trashPurge = {active:true}` (pola singleton `globalThis`: bundel SSR ≠ proses Bun) dibaca `retention.autoPurge`. Kasus tepi: tick terlewat → tick berikut mengejar karena kriteria berbasis waktu, bukan penghitung; balapan pulihkan vs purge → `UPDATE … WHERE deleted_at >= purgeBefore RETURNING`, 0 baris → 410.

**Audit** (`server/audit.ts` + `app/lib/audit-api.ts`, satu pemilik Z-01): aksi `task.trash` (orange), `task.restore` (teal), `trash.purge` (red, `meta {kind,tasks,files}`), `trash.retention` (gray, aktor sistem); `AuditTargetType` += `'task' | 'trash'`. Semua `audit()` memakai email dimask (`maskEmail`) seperti `app-trash.ts:30`.

## 6. DAFTAR TUGAS
Konvensi umum (cabang `feature/s6-z-<n>` dari HEAD gelombang, commit per tugas, CHANGELOG `[Unreleased]` Indonesia sudut pandang user, DoD & UI-DoD) mengikuti **P3 "Konvensi tugas"** dan tidak diulang. Semua tugas: `bun run typecheck` nol, `bun run lint` bersih, `bun run test` hijau, berkas ≤ batas global, dan **dilarang menyentuh berkas di luar Ownership**. Menyentuh `server/` → `smoke:prod` + `smoke:binary`; Z-05 juga `smoke:coldboot`.

**Peta**: Z-01 → {Z-02, Z-03, Z-04 **PARALEL**} → Z-05 (butuh Z-04 untuk kaitan hapus) → Z-06 (butuh Z-03) ∥ Z-07 (butuh Z-02) → **Z-08 titik sinkron**. Maks 3 worker serentak.

### Z-01 · Kebijakan, kode galat, audit, penolakan kunci API · Dep: – · S (1)
**Lajur** L-Sampah-A · **Irisan** S6. **Target**: M `server/access/trash.policy.ts`; M `server/access/decision.ts` + `server/pm/errors.ts` (kode `ROLE_CANNOT_PURGE`, `NOT_IN_TRASH`); M `server/metrics/trash.metrics.ts` (`purgeBefore`); M `server/audit.ts` + `app/lib/audit-api.ts` (aksi & label §5); M `server/api-keys/scopes.pm.ts` (`DELETE trash/*` → `app-trash.ts`; `DELETE tasks/:id` bila Q2=ya → `app-tasks.write.ts`); B `tests/access/trash.policy.test.ts`.
**Change**: `canTrashTask(p, task, m)`, `canRestoreTask(p, task, m, now, rules, metrics)`, `canPurge(p)`; `TrashItemCapKey` += `'purge'`; `purgeBefore(now, c)`; `PM_KEY_DENY` entri dengan regex longgar `.+`. **Constraints**: murni (tanpa DB), pola `buildCaps`; pemilik tunggal berkas bersama; jangan ubah kode galat lama. **Acceptance**: tes: PM/Member/Pemantau → `canPurge` ditolak `ROLE_CANNOT_PURGE`; Admin/Super-admin ok; menyamar → `IMPERSONATING`; `purgeBefore` paritas dengan `isRestorable` pada hari ke-29/30/31 dan batas tengah malam WIB; `isPmKeyDenied('DELETE','/api/app/trash/project/p1')` true, `GET /api/app/trash` false; `tests/api-keys/scopes.pm.test.ts` diperluas. **Commit**: `feat(trash): add purge policy, error codes and key denials`.

### Z-02 · Hapus tugas ke Sampah (backend) · Dep: Z-01 · M (1,5) · PARALEL dgn Z-03, Z-04
**Target**: B `server/task/task-trash.service.ts` (≤200); M `server/api/app-tasks.write.ts` (+ `DELETE /:ref`, ≤150); B `tests/task/task-trash.service.test.ts`; M `tests/api/tasks.test.ts` (kasus DELETE).
**Change**: `trashTask(p, ref, now)` satu `inTx` dengan kunci baris tugas: set `deleted_at/by` (status tidak diubah, `number` tetap, R08 #8); `canTrashTask`; proyek di Sampah → 409 `PROJECT_IN_TRASH`; tugas sudah di Sampah → 404 (idempoten); `logActivity`; `audit task.trash`; balasan `{trash:{kind,id,label}}`. Semua kueri tugas tetap `isLive` (tugas terhapus 404 di detail/daftar/dependensi). **Constraints**: jangan ubah `task.service.ts` selain impor (≤300 baris, saat ini 290); menyamar → `IMPERSONATING`. **Acceptance**: tes: Pembuat/Pengelola/Admin ok, Pemantau & non-anggota 403/404, kunci API 403 `PM_KEY_DENY` (bila Q2), tugas terhapus 404 di `GET /tasks/:ref`, tidak muncul di daftar, hapus dua kali → 404, tugas ikut-proyek tak bisa dihapus lagi. **Commit**: `feat(task): add soft delete to trash`.

### Z-03 · Daftar Sampah gabungan + pulihkan tugas · Dep: Z-01 · L (2) · PARALEL
**Target**: B `server/trash/trash.kinds.ts` (registri, ≤120), `server/trash/trash.list.query.ts` (≤250), `server/trash/task-trash.query.ts` (≤200), `server/task/task-restore.service.ts` (≤150); M `server/api/app-trash.ts` (`GET` baru + `POST /task/:id/restore`); M `server/project/project-trash.query.ts` (diekspor ulang ke registri, tanpa ubah perilaku); B `tests/trash/trash-list.test.ts`, `tests/trash/task-restore.test.ts`; M `tests/api/trash.test.ts`.
**Change**: bentuk §5. `restoreTask`: kunci tugas, `canRestoreTask`, `UPDATE … WHERE deleted_at >= purgeBefore RETURNING` (0 baris → 410), proyek di Sampah → 409 `PROJECT_IN_TRASH` + `{projectId,name}`; audit `task.restore`. **Constraints**: tidak ada N+1 (≤ 4 statement per halaman, uji hitung); pagination wajib; `restoreProject` tidak diubah. **Acceptance**: tiga skenario berantai: (a) tugas dihapus sendiri hari 0, proyek hari 10 → pulihkan proyek: tugas sendiri **tetap di Sampah**; (b) hanya proyek → semua tugas ikutan pulih; (c) tugas dipulihkan saat proyek di Sampah → 409. Visibilitas per peran (Admin semua; PM penghapus/Pengelola; Member hanya miliknya; Pemantau tak punya `restore`). Hari ke-31 → 410 dan tersaring dari daftar. **Commit**: `feat(trash): list tasks and restore tasks from trash`.

### Z-04 · Hapus permanen (Admin) · Dep: Z-01 · M (1,5) · PARALEL
**Target**: B `server/trash/trash.purge-item.service.ts` (≤250), `server/trash/trash.files.ts` (`registerTaskFileCleaner`, ≤60); M `server/api/app-trash.ts` (`DELETE /:kind/:id`); B `tests/trash/purge-item.test.ts`.
**Change**: `purgeItem(p, kind, id)`: `canPurge` dulu (PM → 403 `ROLE_CANNOT_PURGE`, sebelum membuka transaksi), item harus sudah di Sampah (409 `NOT_IN_TRASH`), kumpulkan kunci objek → hapus objek → hapus baris eksplisit anak→induk (tugas ikutan lalu proyek; tanpa mengandalkan FK) dalam `inTx`; objek gagal terhapus → 502-ringan `STORAGE_FAILED` dan baris **tidak** dihapus (dapat diulang); kedua kali → 404. `audit trash.purge` dengan `meta {kind,tasks,files}`, tanpa PII. **Constraints**: jangan hapus berkas ketika `storageEnabled()` false bila ada kunci (lihat Q3). **Acceptance**: PM-Pengelola → 403; Member → 403; Admin/Super-admin ok; menyamar → 403; kunci API → 403 `PM_KEY_DENY`; objek fake dihapus **sebelum** baris (urutan diasersi lewat fake storage); storage gagal → baris utuh; dua Admin serentak → satu 200, satu 404; item hidup → 409. **Commit**: `feat(trash): add admin-only permanent delete`.

### Z-05 · Purge otomatis 30 hari · Dep: Z-04 · M (1,5)
**Target**: B `server/trash/trash.purge.ts`, `server/trash/trash.scheduler.ts`; M `server/api/index.ts` (satu baris daftar penjadwal); M `server/trash/trash.list.query.ts` (`retention.autoPurge`, ≤ +10 baris); B `tests/trash/purge.test.ts`; M `scripts/smoke-server.checks.ts` (bila perlu, entri `SMOKE_CHECKS`). 
**Change**: §5 "Purge". `runTrashPurge(now, deps)` murni-injeksi (`now`, `storage`, `batch`); `startTrashPurgeScheduler()`; `globalThis.__trashPurge`. **Constraints**: tidak mengimpor `server/env.ts` di top-level modul CLI; gagal-lunak (`try/catch` + `logger.warn({err})`); tanpa PII; satu salinan penjadwal (singleton `globalThis`). **Acceptance**: tes dengan `now` disuntik: item hari 29 tetap, hari 30 hilang; tick dijalankan dua kali dan **dua tick paralel** → hasil sama (idempoten); tick terlewat 5 hari → satu tick mengejar; objek dihapus sebelum baris (urutan); objek gagal → item dilewati & dicoba lagi tick berikutnya; proyek dengan tugas mandiri yang belum kedaluwarsa tidak dihapus sebelum tugasnya (kasus 5 R08: tugas hari 0, proyek hari 10 → tugas hilang hari 30, proyek hari 40); batch >500; `autoPurge` true hanya setelah scheduler start. `smoke:coldboot` + `smoke:prod` + `smoke:binary` hijau. **Commit**: `feat(trash): purge expired items after 30 days`.

### Z-06 · UI halaman Sampah (daftar, penyaring, pulihkan, hapus permanen) · Dep: Z-03 (kontrak API), Z-04 untuk tombol · L (2,5)
**Target**: M `app/routes/app/trash.tsx` (≤150); B `app/components/trash/TrashList.tsx`, `TrashFilter.tsx`, `TrashTaskItem.tsx`, `PurgeDialog.tsx`, `useTrashPurge.ts`; M `app/components/trash/{TrashProjectList,useTrashActions,trash.copy}.ts(x)`; M `app/lib/trash-api.ts` (`TrashItem` terdiskriminasi, `purgeItem`); B `tests/trash/trash-ui.test.ts` (salinan & logika murni).
**Change**: §4. `can.purge`/`can.restore` dari server (tanpa `role ===`). `trash.copy.ts`: cabang `autoPurge`. **Constraints**: Mantine saja; `window.confirm` dilarang; `modals.open` T3 dengan `TextInput`; berkas ≤ batas (pecah bila `TrashList` >200). **Acceptance**: tes salinan: janji "30 hari" **tidak** ada saat `autoPurge=false`; tombol Hapus selamanya nonaktif sampai nama cocok persis; baris tugas terblokir menampilkan "Pulihkan proyeknya dulu"; kosong/loading/galat; `tests/app-routes.test.ts` hijau. **Commit**: `feat(trash): show tasks, filters and admin purge in trash page`.

### Z-07 · UI hapus tugas dengan Urungkan (T1) · Dep: Z-02, Z-03 (endpoint restore) · M (1,5) · PARALEL dgn Z-06
**Target**: M `app/components/tasks/TaskMenu.tsx`, `app/components/tasks/useTaskActions.tsx`, `app/components/tasks/task-caps.ts`, `app/components/tasks/tasks.copy.ts`, `app/lib/tasks-api.ts`; B `tests/tasks/task-delete-ui.test.ts`; M `README.md` hanya bagian "Sampah" (kontrak publik; bukan narasi).
**Change**: "Hapus tugas" di menu ⋯ (detail & baris); eksekusi langsung; `notifications.show({autoClose:10000, message, "Urungkan" → POST restore})`; sesudah sukses kembali ke daftar & refresh; `can.trash` dari server; tombol `loading`. **Constraints**: **tanpa dialog konfirmasi** (X1-Q1); T1 hanya sah karena Sampah ada di belakangnya (CLAUDE.md "T1 tanpa Urungkan dilarang"). **Acceptance**: tes: toast memuat tombol Urungkan; klik Urungkan memanggil restore dengan id tugas; 409/410 menampilkan pesan §4; `can.trash=false` menyembunyikan menu. **Commit**: `feat(task): add delete with undo from task menu`.

### Z-08 · Gerbang S6-Sampah: uji lintas, dokumen, demo · Dep: Z-05, Z-06, Z-07 · S (1) · titik sinkron
**Target**: B `tests/trash/trash-cascade.e2e.test.ts` (skenario demo R10: proyek 5 tugas → hapus → pulihkan → semua kembali; Admin hapus permanen; PM → 403); M `scripts/smoke-server.checks.ts` (`GET /api/app/trash` 401 tanpa sesi); M `CHANGELOG.md`; M `tahapan-proyek/05-implementasi/PROGRES.md` (baris tugas, oleh koordinator); B `tahapan-proyek/06-uji/` tidak disentuh. **Acceptance**: `bun run test`, `typecheck`, `lint`, `smoke:prod`, `smoke:binary`, `smoke:coldboot` hijau; `bun run db:migrate` ke dev **dan** DB test (bila ada migrasi indeks). **Commit**: `test(trash): add cascade scenarios and close S6 trash gate`.

## 7. Gerbang & kriteria demo
| Gerbang | Kriteria (dapat diuji) |
|---|---|
| SP-S6a | Hapus proyek berisi 5 tugas → Pulihkan di Sampah → kelimanya kembali (tes Z-08) |
| SP-S6b | Tugas yang dihapus **lebih dulu** tidak ikut pulih saat proyek dipulihkan (Z-03) |
| SP-S6c | Hapus permanen oleh PM → **403**; oleh Admin → 200 + baris & objek hilang (Z-04) |
| SP-S6d | Purge idempoten: tick ganda/paralel/terlewat sama hasilnya; **objek dihapus sebelum baris** (Z-05) |
| SP-S6e | Teks "30 hari" tidak tampil bila `autoPurge=false` (Z-06) |
| SP-S6f | Hapus tugas: tanpa dialog, toast Urungkan ±10 dtk memulihkan (Z-07); kunci API tak bisa hapus/pulihkan/purge |
| Umum | `tests/api-keys/scopes*.test.ts` memetakan semua rute baru; smoke 3 jenis hijau; bukti yang belum diverifikasi di §8 ditutup atau dicatat |

**Bukti yang belum diverifikasi** (jangan dipercaya sebelum dibuktikan di Z-03/Z-05): FK `task_comment`/`task_checklist_item` → `task` memang CASCADE; FK `task.project_id` tidak menghalangi hapus proyek setelah tugasnya dihapus; `Bun.S3Client.delete` pada objek tidak ada tidak melempar; `isoDateIn` dengan zona tim menghitung tengah malam WIB benar di batas DST (WIB tanpa DST).

## 8. Risiko & mitigasi
| Risiko | Peluang | Dampak | Mitigasi |
|---|---|---|---|
| Pulihkan berantai salah (tugas hapus-sendiri ikut pulih / proyek tanpa isi) | Rendah | Tinggi | Penanda `deleted_with_project_id` sudah ada; tiga skenario di Z-03 + Z-08 |
| Objek S3 yatim atau baris hilang dengan objek tersisa | Sedang | Sedang-Tinggi | Hapus objek dulu, lewati item bila gagal, tes urutan dengan fake storage, `logger.warn` tanpa PII |
| Hapus permanen salah klik / akses salah peran | Rendah | Tinggi | T3 ketik nama; `canPurge` diperiksa **sebelum** transaksi; kunci API dan menyamar ditolak; audit `trash.purge` |
| Purge dan pulihkan balapan, atau dua instance | Sedang | Sedang | `UPDATE … RETURNING` (410), advisory lock, kriteria berbasis waktu (idempoten), tes tick paralel |
| Batas hari kalender berbeda antara daftar dan purge (hari ke-30) | Sedang | Sedang | Satu definisi `purgeBefore` di `trash.metrics.ts` + tes paritas dengan `isRestorable` |
| Janji "30 hari" tampil padahal purge mati | Sedang | Sedang (kepercayaan) | `retention.autoPurge` dari singleton; tes salinan Z-06 |
| Event (S7) / lampiran (S5) datang belakangan dan mengubah kontrak | Sedang | Sedang | Registri `TrashKind` + `registerTaskFileCleaner`; kontrak diuji dengan fake; S5/S7 wajib mendaftar (§9) |
| Kebocoran lintas peran lewat daftar (Member melihat milik orang lain) | Sedang | Tinggi | Penyaring di SQL **dan** `canViewTrashItem`, tes paritas SQL↔memori seperti `trash-visibility.test.ts` |
| `app-trash.ts`/`task.service.ts` melampaui batas ukuran | Sedang | Rendah | Servis baru di berkas sendiri; `app-trash.write.ts` bila >150 |

## 9. Kontradiksi baru & Dampak ke dokumen lain
**Kontradiksi (default konservatif dipakai):**
1. **Purge tanpa penyimpanan.** R08 §3.3: "tanpa `storageEnabled()` objek dilewati" (baris tetap dihapus) vs R12 C-UPL-6 (kegagalan hapus objek menunda). Default: bila item punya kunci objek dan penyimpanan mati, **item dilewati** (tidak ada objek yatim). Tidak terjadi sebelum S5. → Q3.
2. **Kursor vs page/limit.** R08 menulis kursor `(deleted_at DESC, kind, id)`; kode S1-18 memakai `page/limit/total`. Default: **page/limit** (fondasi menang, kontrak beku).
3. **Kunci API menghapus tugas.** X1-Q9 "kunci boleh membuat dan mengubah tugas" tidak menyebut hapus; R12 C-KEY-1 memetakan purge ke `null`. Default: `DELETE tasks/:id` **ditolak** untuk kunci (konservatif, bisa dilonggarkan). → Q2.
4. **Nama kode galat.** R12 memakai `IMPERSONATION_RESTRICTED`; kode nyata `IMPERSONATING` (`decision.ts`). Default: kode nyata.
5. **Label audit.** R12 §audit menamai `project.delete`/`project.purge`; kode nyata `project.trash`. Default: kode nyata; aksi baru mengikuti pola nyata (`task.trash`, `trash.purge`).

**Dampak ke dokumen lain (tidak diedit di sini):** `CLAUDE.md` UX §1 — T1 kini benar-benar berlaku untuk tugas (hapus catatan "S2 tidak memasang hapus tugas"); `rencana/P3` S2 (tidak ada rute DELETE) tetap benar untuk S2, S6 menambahnya; `PROGRES.md` — daftar Z-01..Z-08 + gelombang; **Permintaan Perubahan Kontrak minor** untuk `contract-v1` (item `kind`, `counts/retention`, rute `/trash/task/:id/restore`, `DELETE /trash/:kind/:id`, `DELETE /tasks/:id`); rencana **S5** wajib memanggil `registerTaskFileCleaner`; rencana **S7** wajib mendaftarkan `TrashKind 'event'` dan kolom `deleted_with_series_id`; `README.md` bagian Sampah (kontrak publik) diubah di Z-07 saja; `tahapan-proyek/03-desain/erd/diskusi/08-sampah.md` #4/#14 tetap sesuai.

## 10. Pertanyaan untuk user
| # | Pertanyaan | Saran |
|---|---|---|
| Q1 | Siapa boleh **menghapus tugas**: Pembuat + Pengelola proyek + Admin (Pemantau tidak), atau hanya Pengelola/Admin? | Pembuat + Pengelola + Admin; Member yang hanya ditugaskan tidak. Dapat dipulihkan siapa pun yang menghapus |
| Q2 | Boleh kunci API **menghapus tugas** (ke Sampah, tidak permanen)? | **Tidak** (konsisten dengan restore dilarang untuk kunci) |
| Q3 | Bila penyimpanan mati dan item punya berkas, purge **melewati** item (sisa di Sampah) atau menghapus baris saja (objek yatim)? | Lewati; baru terjadi sesudah S5 |
| Q4 | Perlu setelan Admin "nonaktifkan hapus otomatis" (env/switch) selain konstanta 30 hari? | Tidak untuk MVP; `autoPurge` hanya mencerminkan penjadwal berjalan |
| Q5 | Pesan hapus permanen proyek menyebut jumlah tugas **dan berkas**; cukup? | Ya |

## 11. Sumber
`../KEPUTUSAN-MVP-INTI.md` §3 (X1-Q1, Q9), §6; `riset/R08-events-tim-sampah-pengaturan.md` §3.3, §4, §5; `riset/R10-mvp-scope-roadmap.md` §3.1 (Z1, Z2), §3.3 (S6); `riset/R12-keamanan-privasi.md` (T22, C-TRASH-1, C-KEY-1, C-UPL-6, C-IMP-1, audit); `riset/R14-migrasi-rilis-ops.md` §3.8; `rencana/P3-s1-s2-proyek-tugas.md` (S1-05, S1-18, konvensi); `rencana/_BRIEF-TAHAP2.md`; kode: `server/project/project-trash.service.ts`, `server/access/trash.policy.ts`, `server/metrics/trash.metrics.ts`, `server/api/app-trash.ts`, `server/api/app-tasks.write.ts`, `server/api-keys/scopes.pm.ts`, `server/db/schema.task.ts`, `server/settings-retention.ts`, `server/demo/cleanup.ts`, `app/routes/app/trash.tsx`, `app/components/trash/*`, `CLAUDE.md` (UX §1, Server, Storage).
