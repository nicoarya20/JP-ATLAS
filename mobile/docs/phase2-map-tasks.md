# Fase 2 — Peta layar ↔ endpoint: Tugas

Rujukan W3. Dokumen analisis, **bukan implementasi** (2026-10-28, `feature/mobile-api-wiring` @ `fc0ab4e`).
Aturan lintas modul (galat seragam, K5, rate limit, `href` web, `can{}`) di kepala `phase2-map-home-inbox-team.md`.

- **Sumber yang diverifikasi:** `server/api/app-tasks{,.write,.workflow,.detail,.delete,.draft,.schema}.ts`,
  `server/task/{task.dto,task.limits,task-form.query,task-timeline.query,task.query}.ts`,
  `server/access/{capabilities,task-flow.policy,project.policy}.ts`, `server/pm/{enums,limits}.ts`, dan
  `mobile/src/data/tasks*.ts` + `mobile/src/screens/tasks/**` saat ini.
- **Acuan lama:** `git show 2a985b7^:mobile/docs/phase2-map-tasks.md` (26 Okt; A1..A16, B1..B13, lengkap dengan
  nomor baris, urutan kerja 10 langkah, dan analisis zona waktu §4 yang tetap berlaku). Yang berubah sejak itu:
  **`GET /api/app/tasks/form-options[?projectId=]`** ada (A12 tertutup), `TaskListItem` kini membawa **`phase`**.
  Yang **belum** berubah: review (S4) belum dirutekan, `TASK_REVIEW_UI_ENABLED = false`; `tags`/`estimateHours`
  tetap 422; `kind` tetap hanya di detail; satu pengerja.
- Fondasi W2 yang dipakai: jam server (`now.today`/`timeZone`), helper instan (`data/instant.ts`), `resource()`.
  Analisis "tanggal aman UTC vs instan wajib zona tim" di §4 dokumen lama tetap benar.

Enum: status `todo|in_progress|in_review|done|canceled`; priority `low|medium|high|critical`; grup jadwal
`overdue|today|tomorrow|week|later|none` (hanya tugas terbuka); label `overdue|awaiting_my_review|blocked|stale|reopened`;
kategori batal `duplicate|not_needed|out_of_scope|created_by_mistake|other`; sort `due|priority|updated|created`.

---

## 0. Endpoint modul ini

| Endpoint | Balasan / catatan |
|---|---|
| `GET /tasks?scope=mine\|project\|all&projectId&status(berulang)&assigneeId&priority(berulang)&q&due&sort&limit&cursor` | `{ items: TaskListItem[], nextCursor, caps: { createTask? } }`. `status` kosong = **semua** (termasuk done/canceled). `scope=project` tanpa `projectId` → 422 "Pilih proyeknya dulu.". Kursor rusak/beda sort → 400 `BAD_CURSOR`. Member dengan `scope=all` = tugas di proyek yang ia ikuti |
| `GET /tasks/counts` | `{ mine: Record<ScheduleGroup, n>, byStatus: Record<TaskStatus, n> }` |
| `GET /tasks/form-options[?projectId=]` | `{ projects: [{ id, name, kinds: [{id,name,baseKind}], phases: [{id,name}] }] }`; dengan `projectId` tersembunyi → 404 |
| `GET /tasks/:ref` | `TaskDetail` (`:ref` angka = nomor global, selain itu id); Sampah/tersembunyi = 404 |
| `POST /tasks` | `{ projectId, title, assigneeId?, dueDate?, startDate?, priority?, kindId?, phaseId?, description?, checklist?: string[] (≤20), needsReview?: false }` → 201 `TaskDetail`. `tags`, `estimateHours` → 422 |
| `PATCH /tasks/:ref` | Bidang yang berubah saja (`needsReview` → 422); kosong → 422 "Tidak ada yang diubah." |
| `POST /tasks/:ref/{start,unstart,complete,reopen,cancel,uncancel}` | `{ task, can }`. `reopen {reason}` (3–200, **wajib**). `cancel {category, note?}` (`note` wajib bila `other`). `complete` dengan `needsReview` → 409 `REVIEW_REQUIRED` |
| `POST /tasks/:ref/{request-review,approve,return}` | **404 — belum dirutekan (S4)** |
| `DELETE /tasks/:ref` | Ke Sampah → `{ trash: { kind:'task', id, number, label } }` |
| `POST /trash/task/:id/restore` | Urungkan; butuh **id**, bukan nomor → `{ id, number }`; 409 bila proyek di Sampah |
| `POST /tasks/:ref/checklist` · `PATCH/DELETE …/:itemId` | `{ item, checklist }` |
| `POST /tasks/:ref/comments` · `PATCH/DELETE …/:commentId` | komentar / `{ id }` |
| `GET /tasks/:ref/timeline?limit&cursor` | `{ items: TimelineEntry[], nextCursor }`; `comment {author, body, editedAt}` atau `activity {author, action, payload}` |
| `POST /tasks/draft` | `{ projectId, text (≤2000) }` → `{ drafts[], question }`; 503 `AI_DISABLED`, 502 `AI_UNAVAILABLE`, 429 + `retry-after` |
| `GET /team/picker?projectId&q` | ~~Opsi Assignee~~ — picker **mengecualikan** anggota proyek (untuk Add member), jadi Assignee memakai `GET /projects/:id/members` (Manager + Member; Viewer bukan pengerja) |

---

## 1. Layar/aksi → endpoint

| Layar (rute → berkas) | Titik tukar | Endpoint |
|---|---|---|
| My tasks `(tabs)/tasks/index` (list) → `list/tasks.screen.tsx` | `getTasksList` → `myGroups` (`tasks.groups.ts`) | Satu daftar **per grup jadwal**: `scope=mine&due=<grup>&status=todo&status=in_progress&status=in_review`; grup Done/Canceled: `status=done` / `status=canceled`; judul + kosong dari `GET /tasks/counts` |
| All tasks (list) | sama | `scope=all&projectId?&status…&sort` |
| Kanban (board) → `board/**` | `boardColumns`, `moveCards` (`list/tasks-body.tsx`), `tasks.radial.ts` | **Satu kursor per kolom** (`status=todo\|in_progress\|in_review\|done`); geser = `POST /:ref/<aksi>` per tugas |
| Filter `(tabs)/tasks/filter` | `tasks.query.ts`, `tasks.query-state.ts` | Menulis `status`, `projectId`, `assigneeId`, `priority`, `sort`; cari → `q` |
| Detail `[id]/index` → `detail/**` | `getTaskDetail` → `buildTaskDetail` | `GET /tasks/:ref` + `GET /:ref/timeline` |
| Tombol detail | `runTaskAction` (`tasks.actions.ts`) | `start`/`complete`/`reopen`/`uncancel`; `primary` server menentukan tombol utama |
| Return `[id]/return` | `returnTask`, `nextReturnCount` | **404 (S4)** — GAP T-1 |
| Cancel `[id]/cancel` | `cancelTask`, `cancelReason` | `POST /:ref/cancel {category, note}` |
| ⋯ Move to Archive + Undo | `archiveFromDetail`, `undoArchive`, `archiveTask` | `DELETE /tasks/:ref` → `POST /trash/task/:id/restore` |
| Edit `[id]/edit` → `edit/**` | ✓ `editFormOf`, `editChanges` (`tasks.form.ts`), `updateTask` (`tasks.form.write.ts`) | `GET /:ref` (`can.update`) + `form-options?projectId` (404 → "This project is no longer here") + `projects/:id/members` → `PATCH /:ref` hanya bidang berubah; langkah tetap di detail (checklist) |
| Fill form `tasks/new/form` | ✓ `newTaskForm`, `pickFormProject`, `createBody`, `createTask` | `form-options` (semua proyek, dimuat ulang tiap buka) + `projects/:id/members` → `POST /tasks` → `/tasks/<number>` |
| Just write ✦ `tasks/new/index` → `new/write.screen.tsx` | ✓ `draftTasks`, `draftRows`, `answerQuestion`, `draftBody` (`tasks.draft.ts`), `createTasks` (`tasks.form.write.ts`); `getQuickWrite`/`tasks.write.ts` dihapus (`09c01dd0`) | `POST /tasks/draft` → `POST /tasks` per draf |
| Import CSV `tasks/csv` → `csv/**` | `getCsvImport` | **Tak ada endpoint** — GAP T-6 |
| Project settings `projects/[id]/settings` → `settings/**` | `getTaskSettings` | Baca kinds dari `form-options`; switch review, CRUD kinds, tag **tak ada** — GAP T-7 |
| Tab Tasks proyek + `task-filter` | ✓ `useTasksList` / `useTasksBoard` (scope `project:<id>`) + `moveCards`; `cardStep` (`tasks.card.ts`) memilih tombol kartu | `scope=project&projectId` (+ `assigneeId=<akun>` untuk Assignee Me); `getTasksList`/`taskCard`/`applyQuery`/`searchTasks`/`moveOnBoard`/`editTask` dihapus |

---

## 2. Pemetaan bidang

### 2a. Kartu (`TaskCard` ← `TaskListItem`)

| Mobile | Server | Status |
|---|---|---|
| `no`, `title`, `status`, `priority` | `number`, `title`, `status`, `priority` | Enum → label Inggris di klien |
| (kunci internal) | `id` | **Simpan**: Urungkan Sampah butuh id |
| `project` (nama) | `project {id,name,status}` | ✓ |
| `due` / `late` / `lateBy` / `lateOnBoard` | `dueDate` + `now.today` (atau label `overdue`) | Klien, jam server |
| `people[]`, `whoLabel` "Nico Pratama +1" | `assignee: {id,name}\|null` (satu) | **GAP T-2** |
| `type` (`#no · type`) | — (hanya di detail) | **GAP T-3** |
| — | `phase {id,name}\|null` | Baru; bisa di meta kartu |
| `note` ("Waiting for review…") | `status` + `labels` | Klien |
| `steps` "2/3" | `checklist {done,total}` | ✓ |
| `mayChange` | `can.*` per kartu | **Hapus** aturan klien |
| — | `primary` | Tombol langkah-berikutnya |
| — | `labels` (`stale`, `reopened`, `blocked`) | Badge baru (opsional) |
| grup Overdue/Today/Tomorrow/This week/Later | `due=` + `counts.mine` | Grup `none` ("No date") perlu tempat |
| grup "Waiting for my review" | label `awaiting_my_review` | Selalu kosong sampai S4 |

### 2b. Filter & sort

| Mobile | Server | Status |
|---|---|---|
| Status "All active" | 3 status terbuka **eksplisit** | Jangan kirim kosong (= semua) |
| Project, Assignee Anyone/Me, Priority | `projectId`, `assigneeId`, `priority` | ✓ (`critical` belum ditawarkan mobile) |
| Sort Due / Priority / Recently updated | `due` / `priority` / `updated` | ✓ |
| Sort "Title (A–Z)" | — | **GAP T-4** |
| Cari judul + awalan nomor + tag | `q` = judul ILIKE **atau nomor persis** | **GAP T-5** |
| Ganti filter/sort | — | **Buang kursor** + muat dari awal |
| Daftar proyek di filter | `GET /projects?scope=all&sort=name&limit=100` | ✓ |

### 2c. Detail (`TaskDetailView` ← `TaskDetail`)

| Mobile | Server | Status |
|---|---|---|
| `meta` "#12 · Atlas · Bug · Development" | `number`, `project.name`, `kind.name`, `phase.name` | ✓ |
| `actions[]` (`actionsOf`) | `primary` + `can{}` | **Hapus** aturan klien |
| `menu` edit/cancel/archive | `can.update` / `can.cancel` / `can.trash` | ✓ |
| fact Assignee (banyak) | `assignee` (satu) | T-2 |
| fact Type | `kind {name, baseKind}` | ✓ |
| fact Needs review + Reviewer (bertag peran) | `needsReview`, `reviewer {id,name}` | Tampil baca-saja; tag peran tak ada (T-1) |
| fact Tag | — | **GAP T-8** |
| fact Created by | `creator` + `createdAt` (instan → zona tim) | ✓ |
| `stateNote` canceled "Canceled by X: reason" | `cancel {category, note}` + pelaku dari timeline (`action` batal) | Label kategori Inggris di klien |
| `stateNote` archived | Tugas di Sampah = 404 | Catatan "in Archive" hilang; tampilkan "not found" |
| `stateNote` notYours/waiting | `can` kosong / kode deny | Kalimat dari katalog kode di mobile (GAP E-6 peta Events) |
| `banner` "Dodi asked you to review", `leadNote`, "Returned ×n" | — | T-1 (S4) |
| `steps` | `checklist.items[] {id,text,isDone,position}` | ✓ + tulis nyata |
| `evidence` + Attach | — | **GAP T-9** (S5) |
| `history[] {text, when, who}` | `timeline.items[]` `activity {action, payload, author, at}` | Kalimat Inggris disusun klien dari `action` (bentuk `payload` per aksi perlu dicek) |
| Kotak komentar | `POST /:ref/comments` + `can.comment` | Nyata |
| — | `unstart` (`can.unstart`) | Tombol "Stop working" baru |

### 2d. Form (Edit, Fill form)

| Mobile | Server | Status |
|---|---|---|
| `project` + `formProjects(role)` | `form-options.projects[]` | ✓ cabang role dihapus; kosong → "No project to add a task to" |
| `type` (nama) | `kindId` dari `projects[i].kinds` | ✓ (GAP lama A12 tertutup) |
| `phase` (nama), `phasesOf` | `phaseId` dari `projects[i].phases` | ✓ |
| `who: string[]` | `assigneeId` tunggal | ✓ satu pengerja (T-2) dari `projects/:id/members`, "Unassigned" pertama |
| `due`, `start`, `priority`, `desc`, `title` | `dueDate`, `startDate`, `priority`, `description`, `title` | ✓ (`start > due` → 422) |
| `start` default = `TODAY` | `now.today` | Jam server |
| `tags` | 422 | T-8 |
| `hours` | 422 | **GAP T-10** |
| `review`, `reviewer`, `reviewersOf` | `needsReview: false` saja; reviewer tak bisa diubah | T-1 |
| `steps` (Fill form) | `checklist: string[]` di `POST` | Belum dipasang: form tak menawarkan langkah (ditambah di detail sesudah dibuat) |
| `steps` (Edit) | Rute checklist terpisah | ✓ di detail, tidak di Edit |
| `canSave` (judul + `who.length`) | `assigneeId` opsional | `formProblem`: judul + `start ≤ due`; "wajib pengerja" **dilepas** mengikuti server (T-12, lihat gap doc) |
| Setelah simpan → `/tasks/<no>` | 201 `TaskDetail.number` | ✓ |

### 2e. Just write ✦

| Mobile lama (`tasks.write.ts`, dihapus `09c01dd0`) | Server (`POST /tasks/draft`) | Status |
|---|---|---|
| proyek Atlas dipatok | `projectId` wajib | Pilih proyek dari `form-options` |
| `drafts[].{title, who, due, priority, type}` | `drafts[].{title, assigneeId, assigneeNote, dueDate, priority, kindId, description}` | ✓ |
| `ask[]` "Which Rina?" | `question {text, options[], draftIndexes[]}` | `text` Indonesia (K5) |
| Data contoh tanpa LLM | AI nyata; 503/502 → jatuh ke Fill form dengan teks di Title | Wajib tangani |

Keadaan sekarang: disambung di `src/data/tasks.draft.ts` + `createTasks` (`tasks.form.write.ts`) dan
`src/screens/tasks/new/{write.screen,write-drafts,use-just-write}.tsx`; rinciannya di gap doc §1 (baris B13).

---

## 3. Kalimat server (Indonesia, K5)

Semua `error` tulis (`REASON_REQUIRED`, `REVIEW_REQUIRED`,
`WRONG_STATE`, `VALIDATION` "Pilih proyeknya dulu." / "Tidak ada yang diubah.", tanggal), pesan `BAD_CURSOR`,
`question.text` dan `assigneeNote` draf AI, `trash.label`, nama kind bawaan (`Tugas, Bug, Ide`), dan nama
pengganti akun terhapus "Mantan anggota" di timeline. Kalimat riwayat timeline **tidak** dirangkai server
(hanya `action` + `payload`), jadi disusun klien dalam bahasa Inggris.

---

## 4. Aksi tulis + pengaman

| Aksi | Endpoint | `can` | Pengaman |
|---|---|---|---|
| Buat tugas | `POST /tasks` | `caps.createTask` | — |
| Simpan edit | `PATCH /:ref` | `update` | — |
| Start / Stop working | `start` / `unstart` | `start` / `unstart` | — |
| Mark done | `complete` | `complete` | — (Reopen tersedia) |
| Reopen | `reopen {reason}` | `reopen` | **Sheet alasan wajib** (baru; dulu tombol polos) |
| Cancel task | `cancel {category, note}` | `cancel` | Sheet (sudah ada); bisa dibatalkan lewat `uncancel` |
| Restore (dari Canceled) | `uncancel` | `uncancel` | — |
| Geser kartu di Kanban | `POST /:ref/<aksi>` per tugas | sisi radial dimatikan bila kunci aksi absen/kode | Notice "Moved N" menghitung yang berhasil; sebagian gagal → sebut jumlah gagal |
| Move to Archive | `DELETE /:ref` | `trash` | **T1**: langsung, notice + **Urungkan** (`POST /trash/task/:id/restore`) — Sampah 30 hari ada di belakangnya |
| Checklist tambah/centang/ubah | `POST`/`PATCH …/checklist` | `update` | — |
| Checklist hapus langkah | `DELETE …/checklist/:itemId` | `update` | **T2** ringan atau Urungkan lokal (permanen, tak ke Sampah) |
| Komentar kirim/ubah | `POST`/`PATCH …/comments` | `comment` | — |
| Komentar hapus | `DELETE …/comments/:id` | (pemilik) | **T2** ("Data ini akan dihapus permanen") |
| Return | `POST /:ref/return` | `return` | 404 sampai S4 |

Setelah tulis: jawaban `{ task, can }` memperbarui kartu/detail langsung; `invalidate` `tasks/counts`, Home,
daftar proyek terkait. Aturan klien yang **dihapus**: `mayChange`, `mayArchive`, `deniedNotice`, `actionsOf`,
`stateNoteOf` (notYours/waiting), `canReturn`, `reviewersOf`, `role === 'member'` di settings, `role === 'admin'`
di `formProjects`, gerbang `mayChange` di `board/use-move-menu.ts`, serta `takeProjectTasks`/`putTasksBack`/
`renameProjectTasks`/`forgetArchivedTask` di `tasks.store.ts` (store itu sendiri dihapus, `09c01dd0`).

---

## 5. Usulan pembagian 2 worker (berkas disjoint)

| Worker | Berkas milik | Isi |
|---|---|---|
| **A — Daftar + Kanban** | `data/tasks.ts` (dihapus, `09c01dd0`), `tasks.groups.ts`, `tasks.columns.ts`, `tasks.query.ts`, `tasks.query-state.ts`, `tasks.radial.ts`, `screens/tasks/{list,board,filter}/**`, `app/(tabs)/tasks/{index,filter}.tsx`, tes terkait | Resource daftar per grup/kolom ber-kursor, `counts`, filter → query, geser kartu (`POST` per tugas), `caps.createTask` |
| **B — Detail + tulis** | `data/tasks.detail.ts`, `tasks.actions.ts`, `tasks.form.ts`, `tasks.write.ts`, `tasks.settings.ts`, `tasks.store.edit.ts` (tiga terakhir dihapus, `09c01dd0`), `screens/tasks/{detail,sheets,edit,new,csv,settings,parts}/**`, `app/(tabs)/tasks/[id]/**`, `app/tasks/**`, tes terkait | Detail + timeline + checklist + komentar, transisi + Reopen sheet, Cancel, Sampah + Urungkan, Edit/Fill form via `form-options`, Just write AI |

Berkas bersama yang perlu satu pemilik: `tasks.shared.ts` (pemetaan DTO → bentuk layar, label enum) dan
`tasks.state.ts`/`tasks.store.ts` (store; keduanya dihapus, `09c01dd0`). Usul: **A** memiliki `tasks.state.ts`/`tasks.store.ts` (cache daftar),
**B** memiliki `tasks.shared.ts` (pemetaan + label) dan menulisnya **lebih dulu** sebagai langkah 0 yang
di-review koordinator, lalu A mengimpornya. Aksi tulis B memanggil `invalidate` yang diekspor A.

---

## 6. GAP

Nomor baru (T-*) dengan nomor lama di kurung.

| # | Layar | Masalah | Usulan | Butuh keputusan |
|---|---|---|---|---|
| T-1 (A6, A13) | Detail, Return, Edit, grup review | Alur review (request-review/approve/return, ganti reviewer, Needs review on) belum dirutekan (S4) | Sembunyikan Return, Request review, Approve, switch Needs review, grup "Waiting for my review" sampai S4; fact Reviewer baca-saja | **Nico** (jadwal S4) |
| T-2 (A1) | Semua | Satu pengerja (`assignee`) vs banyak (`who` + `also`) | Turunkan mobile ke satu pengerja, **atau** server menambah penugasan banyak | **User** (produk) |
| T-3 (A3) | Kartu All tasks / board | `kind` tak ada di item daftar | Hilangkan `type` dari kartu, **atau** server menambah `kind` ke `TaskListItem` (kecil, expand-only) | **User/Nico** |
| T-4 (A16) | Sort | "Title (A–Z)" tak ada | Ganti dengan "Newest" (`created`), atau server menambah | **User** |
| T-5 (A15) | Cari | Awalan nomor + tag tak didukung (`q` = judul atau nomor persis) | Terima perilaku server + ubah placeholder | User |
| T-6 (A10) | Import CSV | Tak ada endpoint | Sembunyikan pintu masuk CSV di Fase 2 | **User/Nico** |
| T-7 (A11) | Project settings | Switch review, CRUD kinds, tag tak ada rutenya | Baca-saja (kinds dari `form-options`) atau sembunyikan | **User/Nico** |
| T-8 (A2) | Detail, form, cari | Tag (422, S4) | Sembunyikan bidang tag | Nico (jadwal) |
| T-9 (A5) | Detail, Edit | Evidence/lampiran (S5) | Sembunyikan | Nico (jadwal) |
| T-10 (A9) | Fill form | Estimated hours (S5) | Sembunyikan | Nico (jadwal) |
| T-11 (A14) | Detail | "This task is in Archive." — tugas di Sampah = 404 | Hilangkan catatan; Sampah dibuka dari More › Archive | User (bersama A-1 peta Profil) |
| T-12 | Fill form | "Wajib pengerja" klien vs server opsional | Pertahankan sebagai aturan UX, atau lepas | User |
| T-13 | Kanban | 4 panggilan per buka papan; select-all hanya halaman termuat | Terima; label "Select all loaded" | — |
| — (A12) | Form | Opsi kinds/phases | **Tertutup**: `GET /tasks/form-options` | — |
