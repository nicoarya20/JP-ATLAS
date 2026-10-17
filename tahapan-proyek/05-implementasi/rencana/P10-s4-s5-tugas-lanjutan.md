# P10 — Menu Tugas lanjutan: S4 (Periksa, dependensi, tag, Papan) dan S5 (Tahapan, tenggat, bukti, jenis tugas)

> 18 Okt 2026. Hanya RENCANA, tanpa kode. Prefiks ID `L`. Basis: cabang `nicoarya20/pm-plan-tugas` (HEAD `8ee795e`, S2 terintegrasi). Lanjutan `P3-s1-s2-proyek-tugas.md` §5. Fondasi kode menang atas riset; klaim yang tidak saya baca di kode ditandai **ASUMSI**. Tugas yang membutuhkan migrasi diberi tanda **[MIG]**; tugas yang butuh persetujuan satu-per-satu (menyentuh `server/db/migrations/*`, `server/guard.ts`, `permissions.ts`) diberi `*`.

## 1. Ringkasan
- **S4** (T7-T11, T14, T16): 15 tugas, ±27-33 hari-orang AI. **S5** (P6-P9, T12, T13): 14 tugas, ±24-30 hari-orang AI. **Total 29 tugas, ±51-63 hari-orang AI** (belum termasuk tinjauan manusia ≥ 4 hari/minggu, Q10).
- Dua migrasi (satu per irisan) memegang semua tabel baru. Tabel `task_review`, `task_dependency`, `tag`, `task_tag`, `project_phase`, `project_milestone`, `task_attachment`, `project_deadline_extension`, `project_condition_override` **belum ada** di 0015/0016 (hanya 8 tabel; lihat §2). Nomor yang diusulkan **0019 (S4)** dan **0020 (S5)**; 0017 = `notification` (S3a) dan 0018 = events (S7) menurut R10 — pemegang baton menentukan nomor akhir.
- Kebijakan sudah ada di kode: pemeriksa tidak boleh menyetujui tugasnya sendiri (`SELF_REVIEW`, K2) dan mesin status 12 transisi. S4 terutama **mengaktifkan** (flag, service, rute, UI), bukan merancang ulang.
- Tombol hapus tugas/lampiran **bukan** di sini: itu domain rencana Sampah (P8). S5 memasang hapus bukti hanya di belakang flag sampai P8 mendarat.
- Tanpa pustaka baru: Papan = daftar kolom + menu "Pindahkan ke…"; mention = `Combobox` Mantine; unggah = `Bun.S3Client` yang ada. Diff `package.json` harus kosong.
- CSV: tidak ada butir CSV di S4/S5 (T15 = Won't, R10). Tidak ada tugas CSV.
- Ketergantungan lintas rencana: **SP-NOTIF** (`notify()` + tabel `notification` + Inbox, S3a/S3b) dibutuhkan "Giliran Anda", kartu Periksa, mention, kartu Terlambat. **SP-GATE-S2** (uji pengguna nyata) harus lulus sebelum tugas pertama dimulai (KEPUTUSAN §5).
- Tiga keputusan manusia terpenting: §10 Q1 (K2 final), Q2 (letak Tahapan tanpa URL baru), Q3 (bukti: gambar saja atau + PDF).

## 2. Keadaan sekarang (dibaca di worktree)
| Hal | Fakta | Bukti |
|---|---|---|
| Tabel tugas | Migrasi 0016 hanya membuat `task`, `task_kind`, `task_checklist_item`, `task_comment`, `task_activity`; 0015: `project`, `project_member`, `project_activity` | `server/db/migrations/0015_project_core.sql`, `0016_task_core.sql` |
| `phase_id` belum ada di `task` | Komentar: kolom ditambah kemudian, nullable, expand-only | `server/db/schema.task.ts:3-5` |
| Kolom review sudah ada | `needs_review`, `reviewer_id`, `return_count`, `reopen_count`, `review_requested_at`, CHECK reviewer≠assignee | `schema.task.ts:~70-120` |
| Mesin status 12 transisi, 9 aksi (`requestReview/approve/return` sudah ada sebagai data) | `TASK_TRANSITIONS` | `server/access/task-flow.policy.ts:46` |
| K2 sudah diputuskan di policy | pengerja tak boleh Setujui/Kembalikan, termasuk Admin | `server/access/review.policy.ts:94,165`, `decision.ts:49` |
| Pemilih pemeriksa & `ReviewerPool` murni | `pickReviewer`, `validateReviewerChoice`; tanpa storage | `review.policy.ts:12-60` |
| Aksi S2 diaktifkan; aksi Periksa diparkir | `ENABLED_TASK_ACTIONS` (6) dan `S4_ACTIONS` (3) | `server/task/task.limits.ts:54,65` |
| Flag UI Periksa mati | `TASK_REVIEW_UI_ENABLED = false`; `needsReview` dari klien → 422 | `server/pm/limits.ts:26`, `server/task/task.service.ts:153` |
| Batalkan/Buka lagi/Pulihkan **sudah selesai** (T10) | rute `start/unstart/complete/reopen/cancel/uncancel` | `server/api/app-tasks.workflow.ts:43-76` |
| Kondisi proyek sudah menerima milestone & override | `computeCondition` (4 alasan; milestone & override lewat parameter, S1 kirim `[]`); `milestoneState` | `server/metrics/condition.ts:68`, `project.metrics.ts:59` |
| Konfigurasi | `TASK_KINDS_MAX_ACTIVE: 6`, `AT_RISK_OVERDUE_RATIO: 0.2`, `UNDO_WINDOW_SECONDS: 10` | `server/metrics/config.ts:5-13` |
| Jenis tugas bawaan 3 (Tugas/Bug/Ide), diarsipkan bukan dihapus | `DEFAULT_TASK_KINDS`, `archived_at` | `server/pm/limits.ts:8`, `schema.task.ts:35-55` |
| Storage | `storageEnabled()`, `storage()` (Bun S3), `ensureBucket()`; belum ada kode unggah | `server/storage/index.ts:12,17`, `bucket.ts` |
| API key | `PM_KEY_DENY` + `PM_DENY_OWNER`; semua `/api/app` → `app:read|write` | `server/api-keys/scopes.pm.ts:6`, `scopes.ts:185` |
| Rute tugas terpecah per berkas ≤ 150 baris | `app-tasks.ts`, `.write`, `.workflow`, `.detail`, `.schema` | `server/api/app-tasks*.ts` |
| Kontrak beku 13 URL `/app`; tidak ada `/app/board`, `/app/tags`, tahapan | | `tests/contract-v1.test.ts:70-76` |
| UI tugas | komponen di `app/components/tasks/*` (TaskRow, NextStepButton, NextStepBar, TaskTimeline, CommentBox…); halaman `tasks.tsx` 103 baris, `task-detail.tsx` 93 baris | `app/routes/app/`, `app/components/tasks/` |

## 3. Lingkup dan non-lingkup
| ID | Fitur | MoSCoW (R10 §3.1) | Irisan | Catatan |
|---|---|:-:|:-:|---|
| T7 | Minta diperiksa → Setujui/Kembalikan, default mati per proyek | S | S4 | mesin sederhana (F2): pemeriksa = Pengelola/Admin; rantai cadangan = `pickReviewer` yang sudah ada |
| T8 | Dependensi + label Tertahan + notifikasi "Giliran Anda" | S | S4 | USP-2; tanpa siklus |
| T9 | Tag per proyek (buat/pasang/saring) | S | S4 | ganti nama/gabung tag = Could, **tidak** diambil |
| T10 | Batalkan + Buka lagi | S | S4 | **sudah selesai di S2**; S4 hanya menambah tes regresi |
| T11 | Papan (kolom status, "Pindahkan ke…") | S | S4 | tanpa drag-and-drop |
| T14 | Mention `@nama` | C | S4 | |
| T16 | Kartu Inbox "Terlambat" 3 tombol | C | S4 | bergantung SP-NOTIF |
| P6 | Tahapan (fase + milestone) | S | S5 | |
| P7 | Perpanjang tenggat + alasan + riwayat + badge | S | S5 | |
| P8 | Ganti kondisi manual (override) | C | S5 | ikut karena tabelnya satu migrasi |
| P9 | Aktivitas proyek | C | S5 | tabel `project_activity` sudah ada; hanya menambah jenis aksi, tanpa halaman baru |
| T12 | Bukti/lampiran foto | S | S5 | butuh `storageEnabled()` |
| T13 | Kelola jenis tugas (maks 6) | C | S5 | |

**Non-lingkup:** hapus tugas/lampiran → Sampah (P8); Inbox/Beranda (P-NOTIF); Tim; Events; CSV; AI; rantai pemeriksa berlapis; kalender; tag: ganti nama/gabung; drag-and-drop; Mode Pendamping; push/email.

## 4. Layar dan perilaku
Semua di area `/app`, Mantine, guard `requireUser` di loader. **Tidak ada URL baru** (kontrak `contract-v1` beku); bila ada kebutuhan URL, jadikan Permintaan Perubahan Kontrak (§9).
| Layar | Perubahan | Kosong / mobile / ukuran teks |
|---|---|---|
| Detail tugas `/app/tasks/:number` | Tombol langkah ikut `primary`: **Minta diperiksa**, **Setujui**; **Kembalikan** (modal alasan 3-200 karakter); kotak "Menunggu Bu Sari memeriksa" bila `in_review`; bagian **Tertahan oleh** (pilih tugas, label + tautan), **Tag** (chip + pemilih), **Tahapan** (isian "Lebih banyak"), **Bukti** (daftar + Tambah foto); `@` di kotak komentar membuka daftar anggota | Bukti kosong: "Belum ada foto. Foto struk atau hasil kerja bisa ditaruh di sini." Tombol `lg`, ikon `1.25em`; daftar bukti jadi kartu < `sm`; pratinjau foto `maw="100%"` |
| Daftar `/app/tasks` | Sakelar tampilan **Daftar / Papan** lewat query `?tampilan=papan` (bukan rute baru, **ASUMSI** kontrak mengizinkan query); chip **Tertahan** dan **Terlambat**; filter Tag | Papan: 5 kolom status; < `sm` kolom jadi satu daftar bertab status (tanpa scroll horizontal). Kartu menampilkan judul, pengerja, tenggat, label; **Pindahkan ke…** = `Menu` hanya berisi tujuan sah dari `can` (bukan percabangan role). Pindah ke "Diperiksa"/"Selesai" dari kartu memakai aksi yang sama dengan tombol langkah |
| Form tugas | Toggle **Perlu diperiksa** (hanya bila proyek mengizinkan; Member hanya menyalakan, T-A5), pemilih pemeriksa (default dari `pickReviewer`), pemilih Tag | Isian jenis disembunyikan bila hanya satu jenis aktif (F3) |
| Pengaturan proyek | Saklar **Tugas perlu diperiksa secara bawaan** (kolom `tasks_need_review_default` sudah ada, **ASUMSI** terbaca di `task.service.ts:141`); **Kelola jenis tugas** (maks 6 aktif, arsip bukan hapus); **Kelola tag** (buat saja) | Arsip jenis memakai T2 (dialog) bila ada tugas aktif memakai jenis itu |
| Ringkasan proyek | Bagian **Tahapan**: fase berurut (nama, rentang tanggal), milestone (judul, tenggat, tombol **Tandai tercapai**), status `Tercapai/Terlewat/Menunggu` dengan ikon+teks; **Perpanjang tenggat** (modal: tanggal baru, kategori, alasan), badge **Diperpanjang ×N** pada tenggat; chip kondisi memuat satu kalimat alasan yang sudah ada (`formatConditionReason`), ditambah "milestone terlewat" | Tanpa fase: "Belum ada tahapan. Bagi proyek jadi beberapa tahap agar mudah dipantau." Urutkan fase dengan tombol Naik/Turun (bukan seret) |
| Kartu Inbox "Terlambat" | Tiga tombol: **Sudah selesai** (`complete`), **Geser tenggat** (modal tanggal + alasan), **Minta bantu** (komentar + notifikasi ke pengelola) | Kartu hilang otomatis saat tugas selesai/tenggat bergeser (aturan SP-NOTIF) |
Teks UI baru: bahasa awam ("Minta diperiksa", "Giliran Anda", "Tertahan oleh…"); status selalu ikon + teks, bukan warna saja.

## 5. Data dan API
**Migrasi (append-only, ber-guard `IF NOT EXISTS`, kolom `timestamptz`, FK sesuai R02 §3.4; masing-masing + file `.down.sql` di `server/db/rollback`, + dijalankan ke DB dev **dan** test):**
| Migrasi | Isi | Catatan |
|---|---|---|
| **N4 = 0019 [MIG]*** | `task_review` (id, task_id CAS, requested_by, reviewer_id, decision CHECK `approved|returned`, decided_by + `decided_by_name`, note, requested_at, decided_at; indeks `(task_id, requested_at)`); `task_dependency` (PK `task_id, blocked_by_task_id`, CHECK ≠, indeks `blocked_by_task_id`); `tag` (id, project_id CAS, name, color?; UNIQUE `(project_id, lower(name))`); `task_tag` (PK `task_id, tag_id`) | semua tabel baru, tanpa mengubah tabel lama; `schema.task.ts` 200 baris → tabel baru di `schema.task-review.ts` / `schema.task-links.ts` (file health) |
| **N5 = 0020 [MIG]*** | `project_phase` (UNIQUE tidak dipakai; indeks `(project_id, position)`, R02 baris 164), `project_milestone`, `project_deadline_extension`, `project_condition_override`, `task_attachment`; `ALTER TABLE task ADD COLUMN IF NOT EXISTS phase_id text NULL REFERENCES project_phase ON DELETE SET NULL` | kolom nullable = expand-only; `task_attachment` wajib `storage_key` + `mime_type` + `size_bytes` (R02 baris 168); komentar migrasi: *kenapa* |

**Endpoint baru** (semua di `/api/app`, `.use(appContext)`, galat seragam `{error,code,status,requestId}`; peta scope `app:read` untuk GET, `app:write` untuk lainnya; `PM_KEY_DENY`: hapus tag/jenis/fase/bukti, **approve/return** dan penandaan milestone? — lihat Q6):
| Rute | Izin (cek di handler lewat policy) | Kode galat baru / dipakai |
|---|---|---|
| `POST /tasks/:ref/request-review`, `/approve`, `/return` (body `{note}`) | `canRequestReview`, `canApproveTask`, `canReturnTask`; `S4_ACTIONS` pindah ke `ENABLED_TASK_ACTIONS` | `SELF_REVIEW`, `NO_ELIGIBLE_REVIEWER` (409), `REASON_REQUIRED`, `STATE_CONFLICT` |
| `PUT /tasks/:ref/reviewer` | `canReassignReviewer` (`review.policy.ts:165`) | |
| `GET/POST /tasks/:ref/blockers`, `DELETE /tasks/:ref/blockers/:blockerRef` | `canEditTask`; kedua tugas satu proyek | `DEPENDENCY_CYCLE` 409, `DEPENDENCY_SELF` 422, `CROSS_PROJECT` 422 |
| `GET/POST /projects/:id/tags`, `PUT /tasks/:ref/tags` (set penuh) | tulis: Pengelola/Anggota; baca: yang boleh lihat proyek | `TAG_EXISTS` 409, `TAG_LIMIT` 422 |
| `GET /projects/:id/members/mentionable` atau pakai pemilih anggota yang ada (`app-team.picker.ts`, **ASUMSI** cukup) | anggota proyek | |
| `GET/POST/PATCH /projects/:id/phases`, `POST /projects/:id/phases/reorder` | Pengelola/Admin | |
| `POST/PATCH /projects/:id/milestones`, `POST /milestones/:id/reach`, `/unreach` | Pengelola/Admin | |
| `POST /projects/:id/extend-deadline` (`{newDueDate, category, reason}`) | Pengelola/Admin; tenggat baru > lama | `NOT_LATER` 422 |
| `PUT/DELETE /projects/:id/condition-override` | Pengelola/Admin | |
| `POST /tasks/:ref/attachments` (multipart), `GET .../attachments`, `GET .../attachments/:id/file`, `DELETE ...` | tambah: Anggota/Pengelola; lihat: yang boleh lihat tugas | `STORAGE_DISABLED` 503, `FILE_TYPE` 415, `FILE_TOO_LARGE` 413 |
| `GET/POST/PATCH /projects/:id/kinds`, `POST /kinds/:id/archive` | Pengelola/Admin; maks `TASK_KINDS_MAX_ACTIVE` aktif | `KIND_LIMIT` 422 |
**Kontrak tersentuh:** `contract-v1` URL: tidak berubah. Bentuk DTO tugas bertambah (`blockedBy[]`, `isBlocked`, `tags[]`, `reviewer`, `phase`, `attachmentCount`) — penambahan field opsional, kompatibel. Hasil `GET /tasks` ≤ 6 query: tag, penghalang, dan jumlah bukti dimuat **batch** (satu `IN (...)` per relasi, tanpa N+1).
**Unggahan (T12):** tipe dari magic bytes (JPEG `FFD8FF`, PNG, WebP `RIFF…WEBP`; PDF `%PDF` bila Q3 setuju); SVG/HTML/`Content-Type` klien diabaikan; batas 10 MB (Q15-Q22); key `task-files/<userId>/<acak>`; **tidak** dilayani publik — unduh lewat rute berotorisasi dengan `Content-Disposition: attachment` untuk PDF, `X-Content-Type-Options: nosniff`.

## 6. Daftar tugas
Format kontrak spesifikasi tugas (`_BRIEF-TAHAP2.md`); setiap blok bisa ditempel ke `worker-start --spec`. Umum untuk semua: aturan global (branch `feature/…`, test bersamaan, commit `<type>(<scope>): <english imperative>`), bahasa UI Indonesia, `bun run typecheck` nol, smoke `smoke:prod` + `smoke:binary` bila menyentuh `server/`; berkas ≤ batas ukuran; `CHANGELOG.md` `[Unreleased]` hanya diedit oleh tugas penutup irisan. **Ukuran** = S ≤ 1,5 · M 2-3 · L ≥ 4 hari-orang AI. **B** = berkas baru.

### Peta gelombang
| Gelombang | Isi | Paralel? |
|---|---|---|
| S4-G0 (prasyarat) | SP-GATE-S2 lulus; SP-NOTIF tersedia (atau adaptor `notifyStub` di L4-04/05/13/14 dengan tes kontrak) | titik sinkron |
| S4-G1 | **L4-01** [MIG]* · L4-02 · L4-03 | L4-02, L4-03 murni, paralel dengan L4-01 |
| S4-G2 | L4-04 · L4-05 · L4-06 | paralel (tiga berkas service + tiga berkas rute berbeda) |
| S4-G3 | **L4-07** (SP-S4a, titik sinkron: perakitan rute + scope) → L4-08 | berurutan |
| S4-G4 | L4-09 · L4-10 · L4-11 · L4-12 · L4-13 | paralel (komponen berbeda); `TaskRow.tsx`/`task-detail.tsx` diedit **hanya** oleh L4-10 (pemilik tunggal slot), lainnya lewat berkas komponen sendiri |
| S4-G5 | L4-14 (butuh Inbox) · **L4-15** gerbang S4 | berurutan |
| S5-G0 | SP-S4 lulus; baton menetapkan nomor 0020 | titik sinkron |
| S5-G1 | **L5-01** [MIG]* · L5-02 · L5-06 | L5-02, L5-06 murni, paralel |
| S5-G2 | L5-03 · L5-04 · L5-05 · L5-07 | paralel |
| S5-G3 | **L5-08** (SP-S5a) → L5-09 | berurutan |
| S5-G4 | L5-10 · L5-11 · L5-12 · L5-13 | paralel |
| S5-G5 | **L5-14** gerbang S5 | |

## S4

### L4-01 · Migrasi 0019: Periksa, dependensi, tag [MIG]*
**Lajur DB · Dep: SP-GATE-S2, nomor dari baton · M (2,5)** · **Target**: B `server/db/migrations/0019_task_links_review.sql` (nomor **usulan**), B `server/db/rollback/0019_….down.sql`, B `server/db/schema.task-review.ts`, B `server/db/schema.task-links.ts`, `server/db/schema.ts` (+re-export), B `tests/db/task-links-migration.test.ts`. **Change**: tabel §5 N4 dengan `IF NOT EXISTS`, CHECK `task_id<>blocked_by_task_id`, UNIQUE `(project_id, lower(name))`; komentar *kenapa*; generator `db:generate` lewat wrapper berguard. **Constraints**: jangan ubah 0000-0016; jangan sentuh `schema.task.ts` selain re-export. **Ownership**: berkas di atas (pemegang baton menyetujui). **Acceptance**: migrasi dua kali jalan di dev **dan** `DATABASE_URL_TEST`; `drizzle-kit generate` kosong (tanpa drift); tes menolak dependensi ke diri sendiri dan tag kembar beda huruf; `/dev/db-schema` memuat tabel baru. **Commit**: `feat(db): add review, dependency and tag tables`.

### L4-02 · Aturan dependensi murni
**Lajur Server · Dep: — · S (1,5)** · **Target**: B `server/task/task-dependency.rules.ts` (≤150), B `tests/task/task-dependency.rules.test.ts`. **Change**: `wouldCreateCycle(edges, taskId, blockerId) → boolean` (DFS dengan batas kedalaman `DEPENDENCY_MAX_DEPTH`, bernama), `isBlocked(task, blockers) → boolean` (tertahan bila ada penghalang berstatus bukan `done`/`canceled`), `unblockedBy(completedId, edges, statusOf) → string[]` (tugas yang kini bebas seluruhnya, untuk "Giliran Anda"). **Constraints**: murni, tanpa DB/jam. **Acceptance**: `test.each` ≥ 12 (diri sendiri, siklus 2 dan 3 simpul, rantai panjang, penghalang batal tidak menahan, dua penghalang: hanya bebas bila keduanya selesai, duplikat). **Commit**: `feat(task): add dependency cycle and blocked rules`.

### L4-03 · Pengurai mention murni
**Lajur Server · Dep: — · S (1)** · **Target**: B `server/task/task-mention.rules.ts` (≤100), B `tests/task/task-mention.rules.test.ts`. **Change**: `extractMentions(body, members) → { userIds: string[] }` — cocok `@nama` terhadap nama anggota proyek (tanpa beda huruf, nama dengan spasi memakai nama terpanjang yang cocok, `@` di tengah email diabaikan), maks `MENTION_MAX_PER_COMMENT`. **Acceptance**: ≥ 10 kasus (dua nama sama awalan, email, `@@`, non-anggota diabaikan, teks `<script>` tidak berpengaruh). **Commit**: `feat(task): add mention parser`.

### L4-04 · Service dan rute dependensi + "Giliran Anda"
**Lajur Server · Dep: L4-01, L4-02 · M (3)** · **Target**: B `server/task/task-dependency.service.ts` (≤250), B `server/task/task-blockers.query.ts` (≤150; batch untuk daftar), B `server/api/app-tasks.blockers.ts` (≤120), `server/task/task-workflow.service.ts` (hook setelah `complete`/`cancel`; ±12 baris, **pemilik: L4-04**), B `tests/api/tasks-blockers.test.ts`. **Change**: `addBlocker/removeBlocker` dalam satu `inTx` (cek siklus, satu proyek, `canEditTask`, aktivitas `blocker.add|remove`); setelah transisi selesai, panggil `notify('your_turn', penerus yang bebas)` dengan `dedupe_key` `your_turn:<taskId>:<blockerId>`; kegagalan `notify` **tidak** menggagalkan transaksi. **Constraints**: tidak ada `db.` di dalam callback `inTx` (aturan `tx-discipline`); tidak memblokir *memulai* tugas tertahan (hanya label; ASUMSI konservatif, lihat Q4). **Acceptance**: siklus → 409; lintas proyek → 422; penerus mendapat tepat 1 notifikasi saat penghalang terakhir selesai (tick ulang tidak menggandakan); Pemantau/PM-X → 403/404. **Commit**: `feat(task): add task blockers and your-turn notice`.

### L4-05 · Service dan rute Periksa (aktivasi T7)
**Lajur Server · Dep: L4-01 · L (4)** · **Target**: B `server/task/task-review.service.ts` (≤300), B `server/task/task-review.query.ts` (≤150; `ReviewerPool`), `server/task/task.limits.ts` (`S4_ACTIONS` → `ENABLED_TASK_ACTIONS`; **pemilik L4-05**), `server/pm/limits.ts` (`TASK_REVIEW_UI_ENABLED = true`), `server/task/task.service.ts` (hapus penolakan `needsReview:true`, panggil `resolveNeedsReviewOnCreate`), B `server/api/app-tasks.review.ts` (≤150), B `tests/api/tasks-review.test.ts`, B `tests/task/task-review.service.test.ts`. **Change**: `requestReview` (todo/in_progress → in_review, baris `task_review`, pemeriksa dari `pickReviewer`, `review_requested_at`), `approve` (→ done), `return` (note 3-200, `return_count+1`, → in_progress), `setReviewer`; semua lewat `UPDATE … WHERE status=:dari` (409 `STATE_CONFLICT`); pemeriksa dihitung ulang pada tiga pemicu (R03 baris 220); `notify('review_requested')` ke pemeriksa, `notify('review_returned')`/`('review_approved')` ke pengerja; tanpa pemeriksa lain → 409 `NO_ELIGIBLE_REVIEWER` dengan pesan "Belum ada orang lain yang bisa memeriksa. Tambahkan pengelola lain dulu." **Constraints**: K2: pengerja yang juga Admin tetap `SELF_REVIEW`; menyalakan `TASK_REVIEW_UI_ENABLED` hanya di commit yang sama dengan UI-nya masuk (L4-09) — di L4-05 tetap `false`, flag dibalik oleh L4-09. **Acceptance**: `test.each` 3 transisi Periksa × (sah, status salah, bukan pemeriksa, pengerja sendiri, Admin pengerja) ; semua putaran tercatat di `task_review` (tes riwayat 2 putaran); pemeriksa dihitung ulang saat pengerja diganti jadi pemeriksa; rute sebelum flag → 404 dipertahankan oleh tes. **Commit**: `feat(task): add review request, approve and return`.

### L4-06 · Service dan rute tag
**Lajur Server · Dep: L4-01 · M (2)** · **Target**: B `server/task/task-tag.service.ts` (≤200), B `server/api/app-projects.tags.ts` (≤120), B `server/api/app-tasks.tags.ts` (≤80), B `tests/api/tags.test.ts`. **Change**: buat tag (nama 1-30 karakter dipangkas, unik per proyek tanpa beda huruf → 409 `TAG_EXISTS`), `PUT /tasks/:ref/tags` mengganti set (maks `TAGS_PER_TASK`), filter `tag=` di `listTasks` (**edit `task.query.ts`/`task.sql.ts` hanya L4-06**, ±15 baris). **Constraints**: tag milik satu proyek; tag proyek lain pada tugas → 422. **Acceptance**: nama unik tanpa beda huruf; IDOR tag lintas proyek → 404; `GET /tasks?tag=` ≤ 6 query. **Commit**: `feat(task): add project tags`.

### L4-07 · Perakitan rute S4 + scope + penjaga (SP-S4a)
**Lajur Server · Dep: L4-04, L4-05, L4-06 · S (2)** · **Target**: `server/api/app-tasks.ts` & `server/api/app.ts` (hanya `.use(...)` baru), `server/api-keys/scopes.pm.ts` (+deny, **pemilik: L4-07**), `tests/api-keys/scopes.test.ts`, `tests/api-keys/scopes.pm.test.ts`, B `tests/api/tasks-security.s4.test.ts`. **Change**: daftarkan semua rute S4; `PM_KEY_DENY`: hapus tag dan **approve/return** (keputusan Q6); matriks IDOR 8 persona untuk tiap rute baru; mass assignment. **Acceptance**: semua rute baru punya pemetaan scope + tes; `grep` tidak ada rute tanpa pemetaan; anonim → 401. **Commit**: `feat(api): wire S4 task routes with scopes`.

### L4-08 · Klien API S4
**Lajur UI · Dep: L4-07 · S (1,5)** · **Target**: B `app/lib/task-review-api.ts`, B `app/lib/task-links-api.ts`, `app/components/tasks/useTaskActions.tsx` (+3 aksi), `app/components/tasks/tasks.copy.ts` (+teks), B `tests/task-links-api.test.ts`. **Change**: Eden `client.api.app.…`; pesan galat dari `code` (`SELF_REVIEW` → "Kamu tidak bisa memeriksa pekerjaanmu sendiri."; `DEPENDENCY_CYCLE` → "Tugas ini sudah menunggu tugas itu. Pilih tugas lain."). **Acceptance**: tes pemetaan kode → pesan (semua kode baru ada). **Commit**: `feat(tasks-ui): add S4 task api client`.

### L4-09 · UI Periksa
**Lajur UI · Dep: L4-08 · M (3)** · **Target**: `app/components/tasks/NextStepButton.tsx`, `NextStepBar.tsx`, B `ReviewPanel.tsx`, B `ReturnReasonModal.tsx`, B `ReviewerSelect.tsx`, `TaskForm.tsx`/`TaskFormMore.tsx` (toggle), `app/routes/app/project/settings.tsx` (saklar bawaan; **hanya satu baris slot**), B `tests/ui/task-review.test.tsx`. **Change**: `primary ∈ {requestReview, approve}` dirender (S2-09 menyembunyikannya); `ReviewPanel` "Menunggu {nama} memeriksa", riwayat putaran; modal Kembalikan dengan penghitung karakter dan `loading`; **tanpa percabangan `role ===`** (semua dari `can`). **Acceptance**: tombol tampil sesuai `can`; Kembalikan butuh alasan; pengerja tidak melihat Setujui; mode proyek tanpa Periksa tidak menampilkan toggle; ukuran teks 1,5 tidak memotong tombol. **Commit**: `feat(tasks-ui): add review actions and panel`.

### L4-10 · UI Tertahan dan dependensi
**Lajur UI · Dep: L4-08 · M (2,5)** · **Target**: `app/components/tasks/TaskRow.tsx`, `TaskCard.tsx` (label), B `BlockerSection.tsx`, B `BlockerPicker.tsx`, `app/routes/app/task-detail.tsx` (**pemilik tunggal slot S4: L4-10** menyisipkan `<BlockerSection/>`, `<TagSection/>`, `<ReviewPanel/>`, `<MentionBox/>`, `<AttachmentSection/>` sebagai slot), B `tests/ui/task-blockers.test.tsx`. **Change**: label ikon+teks "Tertahan"; bagian "Tertahan oleh" dengan pemilih (cari judul/nomor, satu proyek); tombol "Lepas"; banner di tugas yang menahan: "Ada {n} tugas menunggu ini." **Acceptance**: label tampil hanya bila `isBlocked`; galat siklus tampil; kosong informatif. **Commit**: `feat(tasks-ui): add blocked label and blocker picker`.

### L4-11 · UI Tag
**Lajur UI · Dep: L4-08 · S (1,5)** · **Target**: B `app/components/tasks/TagChips.tsx`, B `TagPicker.tsx` (`MultiSelect` + buat baru), `TaskFilters.tsx` (+filter), B `tests/ui/task-tags.test.tsx`. **Change**: pemilih dengan "Buat tag '…'" ; chip di baris/kartu maks 2 + "+n"; filter URL `tag=`. **Acceptance**: huruf besar/kecil kembar ditolak dengan pesan; tanpa tag → empty state. **Commit**: `feat(tasks-ui): add tag picker and filter`.

### L4-12 · Papan
**Lajur UI · Dep: L4-08, L4-05 · M (3)** · **Target**: B `app/components/tasks/board/{TaskBoard,BoardColumn,BoardCard,MoveMenu}.tsx` (≤180 masing-masing), B `app/lib/tasks-board.ts` (pengelompokan murni), `app/routes/app/tasks.tsx` (sakelar tampilan; pemilik: L4-12), B `tests/ui/task-board.test.tsx`, B `tests/tasks-board.test.ts`. **Change**: kolom Belum dimulai / Dikerjakan / Diperiksa (disembunyikan bila proyek tanpa Periksa) / Selesai / Dibatalkan; `MoveMenu` hanya memuat tujuan yang sah dari `can` dan memanggil aksi yang sama dengan tombol langkah; kolom memuat 25 kartu + "Muat lagi" (keyset, tanpa memuat seluruh tabel); mobile: tab status. **Constraints**: **nol dependensi baru** (`package.json` tanpa diff), semua dapat dipakai dengan ketukan/keyboard. **Acceptance**: tujuan ilegal tidak muncul; pindah memicu 409 → muat ulang halus; kolom kosong "Belum ada tugas di sini"; 375 px tanpa scroll horizontal halaman. **Commit**: `feat(tasks-ui): add status board with move menu`.

### L4-13 · Mention di komentar
**Lajur UI+Server · Dep: L4-03, L4-08 · M (2)** · **Target**: `server/task/task-comment.service.ts` (panggil `extractMentions` + `notify('mention')`; **pemilik: L4-13**), B `app/components/tasks/MentionBox.tsx`, `CommentBox.tsx`, `TimelineText.tsx` (tebalkan `@nama`; teks tetap polos), B `tests/api/task-mentions.test.ts`, B `tests/ui/mention-box.test.tsx`. **Change**: ketik `@` membuka `Combobox` anggota; yang disebut non-anggota tidak diberi notifikasi; satu komentar → paling banyak satu notifikasi per orang. **Constraints**: tidak ada Markdown/HTML (R12 R8). **Acceptance**: `<img onerror>` tetap ter-escape; edit komentar tidak menggandakan notifikasi. **Commit**: `feat(task): add comment mentions`.

### L4-14 · Kartu Inbox "Terlambat" (T16)
**Lajur UI+Server · Dep: SP-NOTIF (kartu & registri aksi Inbox), L4-08 · M (2,5)** · **Target**: B `server/task/task-overdue-card.service.ts` (≤150), B `app/components/inbox/OverdueCard.tsx`, B `tests/api/overdue-card.test.ts`, B `tests/ui/overdue-card.test.tsx`. **Change**: daftarkan jenis kartu `task_overdue` (muncul sekali per tugas per hari lewat `dedupe_key`); tiga tombol: Sudah selesai → `complete`, Geser tenggat → `PATCH` tenggat + alasan (di S5 menjadi Perpanjang), Minta bantu → komentar otomatis + `notify` ke Pengelola. **Constraints**: berkas Inbox milik rencana SP-NOTIF — tugas ini hanya menambah berkas baru + 1 baris registri. **Acceptance**: kartu hilang saat tugas selesai lewat jalur API apa pun; tombol `loading`; tiga skala teks. **Commit**: `feat(inbox): add overdue task card with three actions`.

### L4-15 · Smoke, QA, dokumen, gerbang S4
**Integrator · Dep: L4-09..L4-14 · S (2)** · **Target**: `scripts/smoke-server.checks.ts` (+`/api/app/tasks/x/blockers` anonim → 401), `CHANGELOG.md`, `README.md` (hanya bagian kontrak API tugas), B `tahapan-proyek/05-implementasi/uji-pengguna/qa-s4.md`, `tests/readme-endpoint.test.ts`. **Acceptance**: gerbang §7 S4; `bun run test`, `typecheck`, `lint`, tiga smoke hijau; `package.json` diff kosong. **Commit**: `docs(task): document S4 review, blocker and board contract`.

## S5

### L5-01 · Migrasi 0020: Tahapan, tenggat, bukti [MIG]*
**Lajur DB · Dep: S4 lulus, nomor dari baton · M (2,5)** · **Target**: B `server/db/migrations/0020_project_plan_attachments.sql` (nomor **usulan**), B `.down.sql`, B `server/db/schema.project-plan.ts` (`project_phase`, `project_milestone`), `server/db/schema.project-history.ts` (+`project_deadline_extension`, `project_condition_override`), B `server/db/schema.task-attachment.ts`, `server/db/schema.task.ts` (+`phase_id`, **hanya 1 kolom**), B `tests/db/project-plan-migration.test.ts`. **Change**: tabel §5 N5; `ADD COLUMN IF NOT EXISTS phase_id … NULL`; CHECK `task_attachment` salah satu `url|storage_key`, `size_bytes>0`; backfill tidak diperlukan (kolom nullable). **Acceptance**: dua kali jalan di dev dan test; tanpa drift; tugas lama tetap terbaca. **Commit**: `feat(db): add project phases, milestones, extensions and attachments`.

### L5-02 · Kondisi proyek: ≥ 12 kasus tabel
**Lajur Server · Dep: — · S (1,5)** · **Target**: `server/metrics/condition.ts` (hanya bila tes menemukan celah), B `tests/metrics/condition.s5.test.ts`, `server/project/project-condition.query.ts` (**ASUMSI** berkas ini ada; kirim milestone & override sungguhan, bukan `[]`). **Change**: `test.each` ≥ 12: (1) tenggat lewat → Terlambat saja, (2) milestone terlewat → Perlu perhatian, (3) milestone tepat hari ini → menunggu, (4) milestone tercapai terlambat tidak menandai, (5) tugas penting terlambat + milestone terlewat → dua alasan berurut, (6) rasio tepat 20% → lancar, (7) 21% → perhatian, (8) override aktif menimpa, (9) override kedaluwarsa tepat `now` diabaikan, (10) override dihapus (`cleared_at`) diabaikan, (11) proyek bukan `active` → `null`, (12) dua override → yang terbaru, (13) tanpa tugas dan tanpa milestone → lancar. **Acceptance**: hijau; `formatConditionReason` memuat satu kalimat per alasan. **Commit**: `test(metrics): cover project condition with milestones and overrides`.

### L5-03 · Tahapan dan milestone (service + rute)
**Lajur Server · Dep: L5-01 · M (3)** · **Target**: B `server/project/project-phase.service.ts` (≤250), B `server/project/project-milestone.service.ts` (≤200), B `server/api/app-projects.plan.ts` (≤150), B `tests/api/project-plan.test.ts`. **Change**: CRUD fase (nama ≤ 80, maks `PHASES_PER_PROJECT`), `reorder` dalam satu `inTx` (tanpa UNIQUE, R02 baris 164), milestone (`reach` mencatat `reached_at`, `unreach`), tugas `phase_id` hanya fase proyek yang sama (`PATCH /tasks/:ref` ditambah `phaseId`, **edit `task.service.ts` ≤10 baris oleh L5-03**); aktivitas `phase.*`, `milestone.*` di `project_activity` (P9). **Constraints**: hapus fase → tugas `phase_id` NULL (bukan hapus tugas) dengan dialog T2 di UI. **Acceptance**: pengelola saja; Anggota → 403; fase proyek lain → 404; urutan tersimpan. **Commit**: `feat(project): add phases and milestones`.

### L5-04 · Perpanjang tenggat dan override kondisi
**Lajur Server · Dep: L5-01 · M (2,5)** · **Target**: B `server/project/project-deadline.service.ts` (≤200), B `server/api/app-projects.deadline.ts` (≤120), B `tests/api/project-deadline.test.ts`. **Change**: `extendDeadline` satu `inTx`: validasi tenggat baru **lebih lambat** (`NOT_LATER`), tulis baris `project_deadline_extension` + ubah `project.due_date` + aktivitas; `count` untuk badge **Diperpanjang ×N**; `setOverride/clearOverride` (kondisi, alasan wajib, `expires_at?`). Kategori alasan: `SCOPE_CHANGE|DEPENDENCY|RESOURCE|OTHER` (**ASUMSI**, nilai bernama di `server/pm/enums.ts`, **pemilik L5-04**). **Acceptance**: tenggat sama/lebih awal → 422; N perpanjangan → badge N; Anggota → 403. **Commit**: `feat(project): add deadline extension and condition override`.

### L5-05 · Kelola jenis tugas
**Lajur Server · Dep: — (tabel `task_kind` sudah ada) · S (2)** · **Target**: B `server/task/task-kind.service.ts` (≤180), B `server/api/app-projects.kinds.ts` (≤100), B `tests/api/task-kinds.test.ts`. **Change**: tambah/ubah nama jenis (unik tanpa beda huruf, indeks sudah ada), arsipkan (`archived_at`), pulihkan; aktif ≤ `TASK_KINDS_MAX_ACTIVE`; jenis bawaan "Tugas" tidak boleh diarsipkan bila itu satu-satunya aktif; mengarsipkan jenis yang dipakai tugas aktif → boleh (tugas tetap valid, `kind_id` tidak diubah). **Acceptance**: batas 6 → 422 `KIND_LIMIT`; nama kembar → 409; Anggota → 403. **Commit**: `feat(task): add task kind management`.

### L5-06 · Pengenal tipe berkas (magic bytes) murni
**Lajur Server · Dep: — · S (1,5)** · **Target**: B `server/storage/file-sniff.ts` (≤100), B `tests/storage/file-sniff.test.ts`, B `tests/fixtures/files/` (biner kecil, `// test-only`). **Change**: `sniffFile(bytes) → { mime, ext } | null` untuk JPEG/PNG/WebP (+PDF bila Q3); `ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024`. **Acceptance**: SVG, HTML, `.exe`, berkas kosong, JPEG terpotong → `null`; nama `foto.jpg` berisi PNG → mime `image/png`; `Content-Type` palsu diabaikan (≥ 10 kasus). **Commit**: `feat(storage): add magic-byte file type detection`.

### L5-07 · Bukti: unggah, daftar, unduh
**Lajur Server · Dep: L5-01, L5-06 · L (4)** · **Target**: B `server/task/task-attachment.service.ts` (≤280), B `server/task/task-attachment.query.ts` (≤120), B `server/api/app-tasks.attachments.ts` (≤150), B `tests/api/task-attachments.test.ts`. **Change**: `storageEnabled()` salah → 503 `STORAGE_DISABLED` sebelum membaca badan; ukuran > batas → 413; sniff gagal → 415; key `task-files/<userId>/<acak>` (**bukan** nama asli; nama asli dibersihkan masuk `file_name`); tulis objek lalu baris dalam urutan "objek dulu, baris kedua; gagal baris → hapus objek"; unduh: otorisasi seperti `canViewTask`, `nosniff`, `Content-Disposition`, stream; `DELETE` = soft delete (`deleted_at`), **ditandai flag `ATTACHMENT_DELETE_UI_ENABLED=false`** sampai P8 (Sampah) mendarat — rute tetap ada untuk API, UI tidak. **Constraints**: pengujian dengan stub storage (`spyOn`), bukan RustFS. **Acceptance**: SVG berlabel `image/jpeg` ditolak; non-anggota unduh → 404; Pemantau tidak bisa unggah; storage mati → 503 dan UI menyembunyikan tombol; batas jumlah `ATTACHMENTS_PER_TASK`. **Commit**: `feat(task): add task attachment upload and download`.

### L5-08 · Perakitan rute S5 + scope + penjaga (SP-S5a)
**Lajur Server · Dep: L5-03, L5-04, L5-05, L5-07 · S (2)** · **Target**: `server/api/app-projects.ts`, `app-tasks.ts`, `app.ts` (hanya `.use`), `server/api-keys/scopes.pm.ts` (+deny: hapus fase/milestone/jenis/bukti, override; **pemilik L5-08**), `tests/api-keys/scopes.pm.test.ts`, B `tests/api/security.s5.test.ts`. **Change**: IDOR 8 persona tiap rute; mass assignment; `audit()` untuk aksi berhak istimewa baru (+label `ACTION_META` di `app/lib/audit-api.ts`). **Acceptance**: semua rute baru terpetakan + tes. **Commit**: `feat(api): wire S5 project and attachment routes with scopes`.

### L5-09 · Klien API S5
**Lajur UI · Dep: L5-08 · S (1,5)** · **Target**: B `app/lib/project-plan-api.ts`, B `app/lib/task-attachments-api.ts`, `tasks.copy.ts`, B `tests/project-plan-api.test.ts`. **Change**: Eden; unggah dengan `FormData`, kemajuan lewat `XMLHttpRequest` tidak dipakai (cukup `loading`); pesan galat per kode (`FILE_TYPE` → "Hanya foto (JPG, PNG, WebP) yang bisa ditambahkan."). **Commit**: `feat(projects-ui): add S5 api client`.

### L5-10 · UI Tahapan dan milestone
**Lajur UI · Dep: L5-09 · M (3)** · **Target**: B `app/components/projects/plan/{PhaseList,PhaseForm,MilestoneList,MilestoneForm}.tsx`, `app/routes/app/project/index.tsx` atau berkas Ringkasan (**ASUMSI** nama; satu baris slot), `TaskFormMore.tsx` (pemilih Tahapan), B `tests/ui/project-plan.test.tsx`. **Change**: sesuai §4; Naik/Turun; hapus fase = T2; kosong informatif. **Constraints**: tanpa URL baru (Q2). **Acceptance**: Anggota/Pemantau tidak melihat tombol ubah; 375 px aman. **Commit**: `feat(projects-ui): add phases and milestones section`.

### L5-11 · UI Perpanjang tenggat dan kondisi
**Lajur UI · Dep: L5-09, L5-02 · M (2,5)** · **Target**: B `ExtendDeadlineModal.tsx`, B `DeadlineBadge.tsx`, B `ConditionOverrideModal.tsx`, `app/components/projects/ConditionChip.tsx` (tampilkan alasan), B `tests/ui/extend-deadline.test.tsx`. **Change**: tanggal baru `DateInput`, kategori `Select`, alasan wajib; badge "Diperpanjang ×N" dengan riwayat di popover; chip kondisi + satu kalimat; Geser tenggat (L4-14) dialihkan ke modal ini. **Acceptance**: tombol **Perpanjang tenggat** mati dengan alasan bila tenggat baru tidak dipilih; sukses → `notifications.show`. **Commit**: `feat(projects-ui): add deadline extension and condition reasons`.

### L5-12 · UI Bukti
**Lajur UI · Dep: L5-09 · M (3)** · **Target**: B `app/components/tasks/AttachmentSection.tsx`, B `AttachmentUploader.tsx` (`FileButton`, `accept` gambar), B `AttachmentCard.tsx`, B `tests/ui/task-attachments.test.tsx`. **Change**: tombol **Tambah foto** (kamera di ponsel lewat `capture`); pratinjau; ukuran > 10 MB ditolak di klien dengan pesan; `storageEnabled` mati → bagian tersembunyi dengan keterangan; tombol hapus hanya bila `ATTACHMENT_DELETE_UI_ENABLED` (P8). **Acceptance**: galat 415/413/503 tampil jelas; `loading`; gambar `alt` terisi; tidak ada `<a>` ke URL storage langsung. **Commit**: `feat(tasks-ui): add task attachment section`.

### L5-13 · UI kelola jenis tugas
**Lajur UI · Dep: L5-09, L5-05 · S (1,5)** · **Target**: B `app/components/projects/KindManager.tsx`, `app/routes/app/project/settings.tsx` (satu slot), B `tests/ui/kind-manager.test.tsx`. **Change**: daftar jenis aktif/arsip, tambah, ubah nama, arsipkan (T2 bila dipakai), batas "Maksimal 6 jenis"; bantuan "Cukup 3 jenis bawaan untuk kebanyakan tim." **Commit**: `feat(projects-ui): add task kind manager`.

### L5-14 · Smoke, QA, dokumen, gerbang S5
**Integrator · Dep: L5-10..L5-13 · S (2)** · **Target**: `scripts/smoke-server.checks.ts`, `CHANGELOG.md`, `README.md` (bagian kontrak saja), B `uji-pengguna/qa-s5.md`, `tests/readme-endpoint.test.ts`. **Acceptance**: gerbang §7 S5; `smoke:coldboot` hijau (storage lokal ikut); tidak ada TODO tanpa konteks. **Commit**: `docs(project): document S5 plan, deadline and attachment contract`.

## 7. Gerbang dan kriteria demo
| Gerbang | Demo (non-developer) | Selesai bila (dapat diuji) |
|---|---|---|
| **S4** | Dodi meminta diperiksa → Sari menerima kartu → Kembalikan (alasan) → Dodi memperbaiki → Setujui → Selesai; menyelesaikan penghalang → penerus mendapat "Giliran Anda"; Papan memindahkan kartu lewat "Pindahkan ke…" | semua putaran tercatat (`task_review`); pengerja Admin tetap `SELF_REVIEW`; siklus ditolak; nama tag unik tanpa beda huruf; `package.json` diff **kosong**; Papan hanya memuat tujuan sah; `GET /tasks` ≤ 6 query dengan tag dan penghalang; mention tidak menggandakan notifikasi; `bun run test`, `typecheck`, `lint`, `smoke:prod`/`binary` hijau |
| **S5** | PM membuat 3 fase + 2 milestone, satu terlewat → "Perlu perhatian" dengan satu kalimat; Perpanjang tenggat → badge "Diperpanjang ×1"; Member mengunggah JPEG | kondisi ≥ 12 kasus tabel; tenggat baru lebih lambat; SVG/HTML berlabel `image/jpeg` ditolak; non-anggota unduh → 404; `storageEnabled()=false` → 503 + tombol tersembunyi; kolom `phase_id` nullable, migrasi 0020 dua kali jalan di dev dan test, tanpa drift; `smoke:coldboot` hijau |

## 8. Risiko dan mitigasi
| Risiko | Peluang | Dampak | Mitigasi |
|---|:-:|:-:|---|
| Nomor migrasi bentrok (0017 notifikasi, 0018 events, 0019/0020 usulan) | Tinggi | Sedang | satu pemegang baton; L4-01/L5-01 menunggu nomor; tes drift |
| SP-NOTIF belum ada saat S4 mulai | Sedang | Tinggi | adaptor `notifyStub` dengan tes kontrak yang sama; tugas L4-14 ditunda, bukan dipotong |
| Menyalakan Periksa mengunci tugas yang tak bisa disetujui (M25) | Sedang | Tinggi | flag dibalik hanya di commit UI (L4-09); `NO_ELIGIBLE_REVIEWER` dengan pesan jelas; tes Pengelola tunggal |
| Unggah: SVG/HTML/XSS, penyimpanan penuh, objek yatim | Sedang | Tinggi | magic bytes, bucket tidak publik, unduh berotorisasi + `nosniff`, hapus objek bila baris gagal, batas 10 MB dan jumlah |
| Hapus bukti tanpa Sampah melanggar T1 | Sedang | Sedang | tombol di belakang `ATTACHMENT_DELETE_UI_ENABLED=false` sampai P8 |
| Tahapan memaksa URL baru → melanggar `contract-v1` | Sedang | Sedang | default: bagian di Ringkasan; tab/URL baru = Permintaan Perubahan Kontrak (Q2) |
| N+1 pada daftar (tag, penghalang, bukti) | Sedang | Sedang | query batch `IN (…)`; tes hitung query ≤ 6 |
| Konflik edit `TaskRow`/`task-detail.tsx`/`task.query.ts` antar paralel | Tinggi | Sedang | pemilik tunggal per berkas bersama (L4-10, L4-06, L4-12, L4-05) |
| Papan di ponsel membingungkan lansia | Sedang | Sedang | default tetap Daftar; Papan tersembunyi di balik sakelar; uji pengguna menyertakan Papan |
| `schema.task.ts` melewati 200 baris | Rendah | Rendah | tabel baru di berkas terpisah (L4-01, L5-01) |

## 9. Kontradiksi baru dan dampak ke dokumen lain
| # | Temuan | Default konservatif yang dipakai |
|---|---|---|
| K-1 | R03 K2 (pemeriksa menyetujui sendiri) vs KEPUTUSAN Q6 / R10 §3.3 ("ditetapkan user") — di kode sudah `SELF_REVIEW` (`review.policy.ts:94`) | pakai kode (dilarang) sampai user menjawab Q1 |
| K-2 | R02 baris 241 menyatakan 0016 memuat 10 tabel tugas; migrasi nyata hanya 5 (+3 proyek) | tabel yang hilang dibuat di N4/N5; **R02 §4/§241 perlu diperbarui** |
| K-3 | R10 §3.3: S5 mengisi milestone ke kondisi, sedangkan `computeCondition` sudah menerimanya | tidak ada perubahan kontrak fungsi; hanya tes + data nyata (L5-02) |
| K-4 | R10 T10 "Batalkan + Buka lagi" ada di S4, tetapi sudah dikerjakan di S2 | dicoret dari S4; catat di `PROGRES.md` |
| K-5 | Tugas "Geser tenggat" (T16, S4) vs "Perpanjang" (P7, S5) memakai alasan berbeda | S4 hanya mengubah tenggat tugas + komentar; S5 mengarahkan ke modal Perpanjang |
| K-6 | `contract-v1` hanya 13 URL; Papan/Tahapan/Tag tidak punya URL | semua lewat query/seksi; jika ditolak → PPK/ADR |
**Dampak ke dokumen lain (READ-ONLY, hanya dilaporkan):** `PROGRES.md` (tambah S4/S5 dari P10, coret T10); `rencana/P3` §5 (S4_ACTIONS aktif di S4); `riset/R02` (§4 tabel 0016 dan tanggal migrasi); `CLAUDE.md` (bagian Konvensi bila nama berkas rute baru berpola `app-<modul>.<bagian>`); `README.md` kontrak API (ditambah L4-15/L5-14); `riset/R03` §3.8 (≥12 kasus kondisi).

## 10. Pertanyaan untuk user
| # | Pertanyaan | Saran |
|---|---|---|
| Q1 | Pemeriksa boleh menyetujui tugasnya sendiri (K2)? | **Tidak** (sesuai kode dan Q6). Pesan "Belum ada orang lain yang bisa memeriksa" bila tak ada pemeriksa lain |
| Q2 | Tahapan dan Papan memakai URL baru atau seksi/query tanpa mengubah kontrak? | Seksi di Ringkasan + `?tampilan=papan` (tanpa Permintaan Perubahan Kontrak) |
| Q3 | Bukti: gambar saja atau juga PDF (Q15-Q22 menyebut gambar+PDF 10 MB)? | JPEG/PNG/WebP + PDF, 10 MB; PDF diunduh sebagai lampiran, tidak ditampilkan inline |
| Q4 | Tugas "Tertahan" boleh dimulai/diselesaikan? | Boleh (hanya label + peringatan lembut); memblokir bisa ditambah kemudian |
| Q5 | "Perpanjang tenggat" hanya untuk proyek, atau juga tugas (badge per tugas)? | Proyek saja; tugas cukup riwayat aktivitas `due_date_changed` yang sudah ada |
| Q6 | Approve/Return dan penandaan milestone boleh lewat API key? | Approve/Return **ditolak** untuk API key (keputusan manusia); milestone dan tag boleh |
| Q7 | Lampiran tugas: siapa yang boleh menghapus nanti (P8)? | Pengunggah, Pengelola, Admin |

## 11. Sumber
Kode: `server/access/{task-flow,review}.policy.ts`, `server/task/{task.limits,task.service,task-workflow.service}.ts`, `server/pm/{limits,enums}.ts`, `server/db/schema.task.ts`, `schema.task-detail.ts`, `schema.project-history.ts`, `server/db/migrations/0015-0016`, `server/metrics/{condition,config,project.metrics}.ts`, `server/storage/index.ts`, `server/api/app-tasks*.ts`, `server/api-keys/scopes.pm.ts`, `tests/contract-v1.test.ts`, `app/components/tasks/*`, `app/routes/app/*`. Dokumen: `KEPUTUSAN-MVP-INTI.md` (§2 Q6/Q12/Q15-22, §3), `_BRIEF-TAHAP2.md`, `rencana/P3-s1-s2-proyek-tugas.md` §5, `riset/R10` §3.1/§3.3, `R03` (K2, §3.8), `R02` (baris 81-114, 164-168, 241), `R05`, `R11`, `CLAUDE.md` (UX T1/T2/T3, Storage, Konvensi Server). **Bukti yang belum diverifikasi:** nama berkas Ringkasan proyek dan `project-condition.query.ts`, keberadaan `tasks_need_review_default` di `schema.project.ts`, bentuk registri kartu Inbox (milik SP-NOTIF), dan apakah query `?tampilan=` lolos `tests/contract-v1.test.ts`.
