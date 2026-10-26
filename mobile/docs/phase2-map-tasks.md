# Fase 2 — Pemetaan data: modul Tugas (Tasks)

Analisis read-only, bukan implementasi. Memetakan data contoh mobile (`mobile/src/data/tasks*.ts`,
`mobile/src/screens/tasks/**`) ke DTO server yang sudah ada (`server/api/app-tasks*.ts`,
`server/task/*`), supaya penukaran data contoh → API nyata tidak menemukan kejutan di tengah jalan.

Aturan yang mengikat analisis ini:

- Mobile hanya mengonsumsi `/api/app/*`, endpoint yang **sama persis** dengan web; tidak ada endpoint
  khusus mobile (`mobile/reacttransition.md:34`, `:69`).
- Mobile **membaca** `can{}` dari server dan **dilarang** membuat aturan izin versi sendiri.
- "Hari ini" ditentukan server, jangan `new Date()` di klien.
- Keputusan koordinator yang dipakai di dokumen ini: **K1** `today`/`timeZone` dibaca dari
  `GET /api/app/home` (tanpa endpoint baru), **K2** zona tim `Asia/Jakarta`, **K5** bahasa dibiarkan
  campur — UI mobile tetap Inggris, kalimat rangkaian server tetap Indonesia apa adanya.

Tidak ada berkas di `server/` yang diubah. Semua kekurangan server hanya dilaporkan di §2.

**Ringkasan GAP: 29** — 16 arah mobile→API (§2a) dan 13 arah API→mobile (§2b); **12 butuh perubahan
server** (A1, A2, A3, A5, A6, A9, A10, A11, A12, A13, A15, A16).

---

## 0. Endpoint yang tersedia untuk modul ini

Dirakit di `server/api/app.ts:40-42` (`tasksApi`, `taskWorkflowApi`, `taskDetailApi`), semuanya di
bawah prefix `/api/app` dan otomatis `401` tanpa sesi.

| Metode + path | Sumber | Jawaban |
|---|---|---|
| `GET /api/app/tasks` | `server/api/app-tasks.ts:27-59` | `{ items: TaskListItem[], nextCursor, caps }` |
| `GET /api/app/tasks/counts` | `server/api/app-tasks.ts:61` | `{ mine: Record<ScheduleGroup, number>, byStatus: Record<TaskStatus, number> }` |
| `GET /api/app/tasks/:ref` | `server/api/app-tasks.ts:63-70` | `TaskDetail` (`:ref` = semua digit → nomor global, selain itu id) |
| `POST /api/app/tasks` | `server/api/app-tasks.write.ts:21-30` | `201` + `TaskDetail` |
| `PATCH /api/app/tasks/:ref` | `server/api/app-tasks.write.ts:32-39` | `TaskDetail` |
| `DELETE /api/app/tasks/:ref` | `server/api/app-tasks.delete.ts:16-33` | `{ trash: { kind, id, number, label } }` — ke **Sampah**, bukan Archive |
| `POST /api/app/tasks/:ref/{start,unstart,complete,reopen,cancel,uncancel}` | `server/api/app-tasks.workflow.ts:40-76` | `{ task: TaskState, can: TaskCaps }` |
| `POST /api/app/tasks/:ref/checklist` + `PATCH`/`DELETE .../:itemId` | `server/api/app-tasks.detail.ts:47-81` | `{ item, checklist }` |
| `POST /api/app/tasks/:ref/comments` + `PATCH`/`DELETE .../:commentId` | `server/api/app-tasks.detail.ts:83-115` | komentar / `{ id }` |
| `GET /api/app/tasks/:ref/timeline` | `server/api/app-tasks.detail.ts:117-128` | `{ items: TimelineEntry[], nextCursor }` |
| `POST /api/app/tasks/draft` | `server/api/app-tasks.draft.ts:21-48` | `TaskDraftResponse` (AI; `503 AI_DISABLED` tanpa kunci provider) |
| `POST /api/app/trash/task/:id/restore` | `server/api/app-trash.ts:62-82` | `{ id, number }` — **butuh id UUID**, bukan nomor |
| `GET /api/app/team/picker?q&projectId&limit` | `server/api/app-team.picker.ts:17-27` | `{ items: [{ id, name, jobTitle, image }] }` |
| `GET /api/app/home` | `server/api/app-home.ts:13` | termasuk `now.{today,timeZone,iso}` (§4) |

**Belum dirutekan sampai S4:** `request-review`, `approve`, `return`
(`server/task/task.limits.ts:70-75`; `server/api/app-tasks.workflow.ts:1-4` menyebutnya 404).

**Tidak ada endpointnya sama sekali:** opsi form (proyek/kinds/phases), pengaturan proyek
(jenis tugas, tag, switch review), dan impor CSV. Rinciannya A10–A12 di §2a.

### Query `GET /api/app/tasks`

Skema di `server/api/app-tasks.schema.ts:29-39`, batasnya di `server/task/task.limits.ts:15-21`:

- `scope`: `mine | project | all` (`project` tanpa `projectId` → `422 VALIDATION`,
  `server/api/app-tasks.ts:31-33`).
- `projectId`: dipakai di scope apa pun, bukan hanya `project` (`server/task/task.query.ts:51-52`).
- `status`: boleh berulang (`?status=todo&status=done`); **kosong = semua status**, termasuk
  `done`/`canceled` (`server/task/task.query.ts:53`).
- `assigneeId`, `priority` (berulang), `q` (maks 100 karakter), `due` (satu `ScheduleGroup`),
  `sort` (`due|priority|updated|created`, default `due`), `limit` (default 25, maks 100), `cursor`.

### Kamus nilai

| Konsep | Mobile | Server |
|---|---|---|
| Status | `'To do' \| 'In progress' \| 'In review' \| 'Done' \| 'Canceled'` (`mobile/src/data/sample/tasks.ts:3`) | `todo \| in_progress \| in_review \| done \| canceled` (`server/pm/enums.ts:36`) |
| Prioritas | `'Low' \| 'Medium' \| 'High' \| 'Critical'` (`mobile/src/data/sample/tasks.ts:10`) | `low \| medium \| high \| critical` (`server/pm/enums.ts:10`) |
| Grup jadwal | `GROUPS` 7 nilai, termasuk `Done`/`Canceled` (`mobile/src/data/tasks.groups.ts:12-20`) | `SCHEDULE_GROUPS` 6 nilai, hanya tugas terbuka (`server/metrics/schedule.ts:14`, `:54-58`) |
| Label/badge | tidak ada | `TaskLabel` = `overdue \| awaiting_my_review \| blocked \| stale \| reopened` (`server/metrics/types.ts:43`) |
| Alasan batal | 5 teks bebas (`mobile/src/data/tasks.actions.ts:27-33`) | enum `TaskCancelCategory` + `note` (`server/pm/enums.ts:39-46`) |

Pemetaan huruf besar/kecil ini murni kerja klien dan tidak dihitung sebagai GAP.

---

## 1. Peta per layar

13 layar. Kolom **GAP** menunjuk ke id di §2a; kosong = ada pasangan langsung.

### 1.1 My tasks — `mobile/app/(tabs)/tasks/index.tsx` (`scope=mine`, `view=list`)

Layar: `mobile/src/screens/tasks/list/tasks.screen.tsx:38` → `getTasksList(role, { scope, view, query, search }, state)`.

Endpoint: satu panggilan **per grup jadwal** seperti web (`app/components/tasks/TaskGroupList.tsx:26`
memakai `useTaskList({ ...query, due: group })`), plus hitungannya:

```
GET /api/app/tasks?scope=mine&due=<overdue|today|tomorrow|week|later|none>
                  &status=todo&status=in_progress&status=in_review&sort=due&limit=25[&cursor=]
GET /api/app/tasks/counts
```

"All active" mobile = **kirim tiga status terbuka secara eksplisit**; menghilangkan `status` berarti
semua status di server (`server/task/task.query.ts:53`), jadi Done/Canceled akan bocor ke daftar.

| Bidang data contoh mobile | Bidang DTO server | GAP |
|---|---|---|
| `TaskCard.no` (`mobile/src/data/tasks.ts:43`) | `TaskListItem.number` (`server/task/task.dto.ts:53`) | — |
| `TaskCard.title` | `TaskListItem.title` | — |
| `TaskCard.project` (nama string) | `TaskListItem.project.name` (`server/task/task.dto.ts:61`) | — |
| `TaskCard.status` | `TaskListItem.status` | — |
| `TaskCard.priority` | `TaskListItem.priority` | — |
| `TaskCard.due` → `monthDay(t.due)` (`mobile/src/data/tasks.ts:105`) | `TaskListItem.dueDate` `YYYY-MM-DD\|null` (`server/task/task.dto.ts:59`) | — (format label = klien) |
| `TaskCard.people[]` dari `assignees()` (`mobile/src/data/tasks.shared.ts:76`) | `TaskListItem.assignee: PersonRef \| null` — **satu orang** | **A1** |
| `TaskCard.whoLabel` "Nico Pratama +1" (`mobile/src/data/tasks.shared.ts:86`) | diturunkan dari `assignee` saja | **A1** |
| `TaskCard.note` dari `note()` (`mobile/src/data/tasks.shared.ts:146-155`) | tidak ada; `status` + `reviewer` + `labels` | **A4**, **A6** |
| `TaskCard.late` / `lateOnBoard` (`mobile/src/data/tasks.ts:106-107`) | hitung dari `dueDate` vs `today`, atau `labels` memuat `overdue` | — |
| `TaskCard.lateBy` "2 days late" (`mobile/src/data/tasks.ts:108`) | tidak ada; dihitung klien dari `dueDate` + `today` | — |
| `TaskCard.steps` "2/3" (`mobile/src/data/tasks.ts:109`) | `TaskListItem.checklist: { done, total }` (`server/task/task.dto.ts:66`) | — |
| `TaskCard.mayChange` (`mobile/src/data/tasks.shared.ts:90`) | `TaskListItem.can{}` (`server/task/task.dto.ts:69`) | **B3** (aturan mobile dibuang) |
| `TaskCard.type` (dipakai kartu All tasks/board) | `kind` **tidak ada** di `TaskListItem`, hanya di detail | **A3** |
| grup `Overdue/Today/Tomorrow/This week/Later` (`mobile/src/data/tasks.groups.ts:25-32`) | param `due=` + `counts.mine` | — |
| grup `Done` / `Canceled` | `counts.byStatus.done` / `.canceled`; **bukan** `ScheduleGroup` | — (query terpisah) |
| judul grup review "Waiting for my review" (`mobile/src/data/tasks.groups.ts:35-38`) | `labels` memuat `awaiting_my_review`, atau `can.approve` | **A6** (approve = S4) |
| `empty: 'none' \| 'noMatch'` (`mobile/src/data/tasks.ts:74`) | `counts` nol semua = `none`; `items` kosong tapi `counts` > 0 = `noMatch` | — |

Grup `Done` dan `Canceled` tidak punya `ScheduleGroup`: `scheduleGroupOf` mengembalikan `null` untuk
tugas yang tidak terbuka (`server/metrics/schedule.ts:54-58`). Keduanya butuh panggilan sendiri
dengan `status=done` / `status=canceled`.

### 1.2 All tasks — route sama (`scope=all`, `view=list`)

```
GET /api/app/tasks?scope=all&projectId=<id>&status=…&priority=…&sort=…&limit=25[&cursor=]
```

Default query mobile mulai dari proyek Atlas (`baseQuery`, `mobile/src/data/tasks.query.ts:48-54`) —
di API itu `projectId=<id Atlas>`. Satu daftar rata, tanpa grup (`mobile/src/data/tasks.ts:152-159`).
Bidang kartu sama dengan §1.1, ditambah:

| Bidang mobile | Bidang server | GAP |
|---|---|---|
| `#no · type · whoLabel` (`mobile/docs/phase1-screens.tasks.md` §2.2) | `number` + `kind` + `assignee` | **A1**, **A3** |
| Tick "Select" (tanpa aksi massal) | — (murni state layar) | — |
| StatusPill | `status` | — |

### 1.3 Kanban — route sama (`view=board`)

Empat kolom tetap (`mobile/src/data/tasks.columns.ts:17-22`). Server tidak punya konsep kolom, jadi
**satu panggilan per kolom**, masing-masing dengan kursornya sendiri:

```
GET /api/app/tasks?scope=<mine|all>&status=todo&sort=due&limit=25      → kolom To do
GET /api/app/tasks?…&status=in_progress                                 → In progress
GET /api/app/tasks?…&status=in_review                                   → In review
GET /api/app/tasks?…&status=done                                        → Done
```

| Bidang mobile | Bidang server | GAP |
|---|---|---|
| chip avatar (`board/board-card-chips.tsx`) | `assignee.name` (+`image` hanya dari picker) | **A1** |
| chip `Calendar` + due merah + "· N days late" | `dueDate` + `today` | — |
| chip `Flag` + prioritas | `priority` | — |
| chip `ListChecks` "2/3" | `checklist` | — |
| `cardName` (nama untuk screen reader, `list/card-name.ts`) | gabungan bidang di atas | **A1**, **A3** |
| gerbang `mayChange` sebelum menu radial membuka | `can.update` / `can.start` / dst. per kartu | **B3** |
| hasil `moveOnBoard(viewer, nos, status)` (`mobile/src/data/tasks.store.ts`) | `POST /tasks/:ref/<action>` **satu per tugas** | — (lihat §6 langkah 6) |
| notice "Moved 2 tasks to Done" (`mobile/src/data/tasks.columns.ts:57`) | tidak ada aksi massal; klien menghitung yang berhasil | — |
| select-all per kolom (`board/select-control.tsx`) | hanya mencakup halaman yang sudah dimuat | — (lihat §5) |

Menu radial memetakan sisi → status, bukan → aksi. Server hanya menerima transisi yang sah
(`TASK_TRANSITIONS`, `server/access/task-flow.policy.ts:46-65`): 12 pasang `from→to`. Geser ke status
yang tidak punya transisi dari status sekarang akan dijawab `409 WRONG_STATE`, jadi sisi yang tidak
sah harus **dimatikan sebelum menu dibuka** berdasarkan `can{}`, bukan dicoba lalu gagal. Contoh
nyata: `todo → in_review` tidak ada; `in_progress → in_review` hanya ada bila `needsReview` menyala
(`server/access/task-flow.policy.ts:57`) dan itu `requestReview` yang baru ada di S4 (**A6**).

### 1.4 Filter & sort — `mobile/app/(tabs)/tasks/filter.tsx`

Tanpa panggilan sendiri; menulis query lalu daftar memuat ulang
(`mobile/src/data/tasks.query-state.ts:35`).

| Field mobile | Parameter server | GAP |
|---|---|---|
| Status `'All active'` (indeks 0, `mobile/src/data/tasks.query.ts:17-24`) | `status=todo&status=in_progress&status=in_review` | — |
| Status satuan `'To do'`…`'Canceled'` | `status=<satu nilai>` | — |
| Project (`All projects` + semua proyek) | `projectId` (kosong = tanpa param) | — |
| Assignee `'Anyone' \| 'Me'` (tab Tasks proyek, `mobile/src/data/tasks.query.ts:29`) | `assigneeId=<id saya>` | — |
| Priority `'All','High','Medium','Low'` (`mobile/src/data/tasks.query.ts:25`) | `priority` — server juga punya `critical`, filter mobile tidak menawarkannya | — (catatan) |
| Sort `'Due date'` | `sort=due` | — |
| Sort `'Priority'` | `sort=priority` | — |
| Sort `'Recently updated'` | `sort=updated` | — |
| Sort `'Title (A–Z)'` (`mobile/src/data/tasks.query.ts:26`) | **tidak ada** di `TASK_SORTS` (`server/task/task.limits.ts:19`) | **A16** |
| `isFiltered` (titik di ikon, `mobile/src/data/tasks.query.ts:72`) | murni klien | — |
| opsi daftar proyek | `GET /api/app/projects?scope=all&sort=name&limit=100` (`server/api/app-projects.ts:31-50`) | — |

Pencarian (`mobile/src/data/tasks.query.ts:113-123`) harus pindah ke `q=`, dan semantiknya berubah —
lihat **A15**.

### 1.5 Detail — `mobile/app/(tabs)/tasks/[id]/index.tsx`

`mobile/src/screens/tasks/detail/task-detail.screen.tsx:36` → `getTaskDetail(role, no, state)`.

```
GET /api/app/tasks/:number
GET /api/app/tasks/:number/timeline?limit=25[&cursor=]
```

| Bidang mobile (`mobile/src/data/tasks.detail.ts:57-84`) | Bidang DTO server | GAP |
|---|---|---|
| `task` (`TaskItem` lengkap) | `TaskDetail` (`server/task/task.dto.ts:97-112`) | sebagian |
| `variant: 'todo'\|'progress'\|'review'` (`mobile/src/data/tasks.shared.ts:106`) | diturunkan klien dari `status` | — |
| `meta` "#12 · Atlas Project · Bug · Development" (`mobile/src/data/tasks.detail.ts:210`) | `number` + `project.name` + `kind.name` (`server/task/task.dto.ts:100`) + `phase.name` (`:63`) | — |
| `due` dari `dueLabel()` (`mobile/src/data/tasks.shared.ts:114-120`) | `dueDate` + `today` | — |
| `mayChange` | `can.update` | **B3** |
| `mayArchive` (`mobile/src/data/tasks.shared.ts:94`) | `can.trash` (`server/access/task-trash.policy.ts:19-27`) | **B3** |
| `canReturn` | `can.return` — **belum dirutekan (S4)** | **A6** |
| `menu: ['edit','cancel','archive']` | `can.update` / `can.cancel` / `can.trash` | **B3** |
| `actions[]` dari `actionsOf()` (`mobile/src/data/tasks.detail.ts:103-110`) | `primary` (`server/access/task-flow.policy.ts:77-83`) + `can{}` | **B3**, **B4** |
| fact Assignee (daftar orang) | `assignee` tunggal | **A1** |
| fact Due date + `dueNote()` (`mobile/src/data/tasks.shared.ts:126-132`) | `dueDate` + `today` | — |
| fact Priority | `priority` | — |
| fact Type | `kind.name` + `kind.baseKind` | — |
| fact Needs review ("Off · Mark done directly", `mobile/src/data/tasks.detail.ts:113-119`) | `needsReview: boolean` (`server/task/task.dto.ts:103`) — teksnya klien | **A6** (kalimat bergantung alur review) |
| fact Reviewer "Nico (creator, Manager)" | `reviewer: PersonRef \| null` (`server/task/task.dto.ts:102`) — tanpa tag peran | **A6** |
| fact Tag (pill / "—") | **`tags` ditolak `422`** (`server/api/app-tasks.schema.ts:47-51`) | **A2** |
| fact Created by "Nico · Oct 5" | `creator: PersonRef \| null` (`:101`) + `createdAt` (`:109`) | — |
| `stateNote` kind `archived` (`mobile/src/data/tasks.detail.ts:140`) | tugas di Sampah menjawab `404`, bukan detail ber-catatan | **A14** |
| `stateNote` kind `canceled` "Canceled by X: reason" (`:142-145`) | `cancel: { category, note }` (`:105`) — **tanpa `by`** | **A7** |
| `stateNote` kind `notYours` / `waiting` (`:147-155`) | `can{}` kosong + `capMessage(kode)` (`server/access/capabilities.ts:136-138`) | **B3** |
| `banner` "Dodi asked you to review this task · Oct 7" (`:160-167`) | tidak ada field; harus dari `timeline` | **A6** |
| `leadNote` (`:220-223`) | tidak ada | **A6** |
| `steps` (`:169-177`) | `checklist.items: ChecklistItemDto[]` (`server/task/task.dto.ts:90-95`, `:111`) | — |
| `evidence` + "+ Attach evidence" (`:179-185`) | **tidak ada lampiran** (S5) | **A5** |
| `description` / "No description yet." | `description: string \| null` (`:98`) | — |
| `history[]` `{ text, when, who }` (`:229-232`) | `TimelineEntry` `{ kind, action, payload, author, at }` (`server/task/task-timeline.query.ts:21-30`) | **A8** |
| kaki "Write a comment…" (input saja) | `POST /tasks/:ref/comments` tersedia | **B10** |

Tombol detail → endpoint (`mobile/src/data/tasks.actions.ts:14-21`):

| Tombol mobile | Endpoint | Catatan |
|---|---|---|
| Start working | `POST /tasks/:ref/start` | tugas tanpa pengerja jadi milik pemanggil (`server/access/task-flow.policy.ts:68`, `:88`) |
| Mark done | `POST /tasks/:ref/complete` | `needsReview=true` → `409 REVIEW_REQUIRED` (`:115`) |
| Request review | `POST /tasks/:ref/request-review` | **404 sampai S4** → **A6** |
| Reopen | `POST /tasks/:ref/reopen` body `{ reason }` | alasan 3–200 karakter **wajib** (`:171-184`); mobile Reopen **tanpa alasan** → **A6** |
| Approve | `POST /tasks/:ref/approve` | **404 sampai S4** → **A6** |
| Restore (dari Canceled) | `POST /tasks/:ref/uncancel` | — |
| ⋯ Move to Archive | `DELETE /tasks/:ref` | ke Sampah → **A14** |
| Undo di snack | `POST /trash/task/:id/restore` | butuh **id UUID** dari jawaban DELETE → **B1** |

Reopen adalah temuan yang perlu diperhatikan saat implementasi: mobile memanggilnya sebagai tombol
polos (`mobile/src/data/tasks.actions.ts:18`), server menuntut `reason` dan menolak dengan
`REASON_REQUIRED` bila kosong. Jadi Reopen di mobile harus tumbuh sheet alasan, sama seperti Return.

### 1.6 Edit — `mobile/app/(tabs)/tasks/[id]/edit.tsx`

`mobile/src/screens/tasks/edit/task-edit.screen.tsx:42` → `getTaskEdit(role, no)`; Save →
`saveTaskEdit` (`mobile/src/data/tasks.form.ts:149-178`).

```
GET   /api/app/tasks/:number                      (nilai awal + can.update)
GET   /api/app/team/picker?projectId=<id>          (opsi Assignee)
PATCH /api/app/tasks/:number                      (Save)
POST/PATCH/DELETE /api/app/tasks/:number/checklist[/:itemId]   (Steps)
```

| Field `TaskForm` (`mobile/src/data/tasks.form.ts:25-46`) | Bidang `UpdateBody` (`server/api/app-tasks.schema.ts:78-92`) | GAP |
|---|---|---|
| `title` | `title` (maks 200, `server/task/task.limits.ts:8`) | — |
| `who: string[]` (chip multi) | `assigneeId: string \| null` — **satu** | **A1** |
| `due` (ISO) | `dueDate` (`format: 'date'`, nullable) | — |
| `priority` | `priority` | — |
| `type` | `kindId` (id, bukan nama; per proyek) | **A3**, **A12** |
| `phase` (nama) | `phaseId` (id, nullable) | **A12** |
| `desc` | `description` (maks 5000) | — |
| `tags: string[]` | `tags` → `t.Never()` = **422** | **A2** |
| `review` + `reviewer` (`reviewersOf`, `mobile/src/data/tasks.form.ts:58-65`) | `needsReview` → `t.Never()` = **422**; reviewer tak bisa diubah | **A6**, **A13** |
| `wasOn` / `reviewLocked` | `can.needsReviewOn` / `can.needsReviewOff` / `can.changeReviewer` | **A6** |
| `steps: TaskStep[]` | endpoint checklist terpisah, **bukan** bagian `PATCH` | — (lihat §6 langkah 5) |
| `proof: TaskProof[]` | tidak ada | **A5** |
| `people: Option[]` / `members` (`mobile/src/data/tasks.form.ts:137-138`) | `GET /api/app/team/picker?projectId=` | — |
| `phases: Option[] \| null` (`mobile/src/data/tasks.form.ts:72-77`) | `loadTaskPhases` **tanpa endpoint** | **A12** |
| `allowed: false` + "You can't edit this task" (`:110-113`) | `can.update` absen → sembunyikan; kode → `capMessage` | **B3** |

`PATCH` hanya mengirim field yang berubah; badan kosong dijawab `VALIDATION` "Tidak ada yang diubah."
(`server/task/task.limits.ts:93`).

### 1.7 Return (sheet) — `mobile/app/(tabs)/tasks/[id]/return.tsx`

`mobile/src/screens/tasks/sheets/return.screen.tsx:36` → `returnTask(role, no, reason)`.

Endpoint `POST /api/app/tasks/:ref/return` **belum dirutekan sampai S4** → seluruh layar ini
terhalang **A6**. Kontrak policy-nya sudah ada: `canReturnTask` menuntut catatan dengan panjang
`REVIEW_NOTE_MIN_LENGTH`..`MAX` (`server/access/task-flow.policy.ts:59`,
`server/access/capabilities.ts:143`), dan "Returned ×n" mobile
(`mobile/src/data/tasks.actions.ts:68`) **tidak** sama dengan `reopenCount`
(`server/task/task.dto.ts:104`), yang menghitung Reopen bukan Return.

| Bidang mobile | Server | GAP |
|---|---|---|
| quick pick 3 teks (`mobile/src/data/tasks.actions.ts:24`) | tidak ada enum; teks bebas masuk `note` | — |
| `Reason *` wajib | panjang dijaga policy | **A6** |
| `nextReturnCount(no)` | `reopenCount` ≠ jumlah return | **A6** |

### 1.8 Cancel (sheet) — `mobile/app/(tabs)/tasks/[id]/cancel.tsx`

`mobile/src/screens/tasks/sheets/cancel.screen.tsx:41` → `cancelTask(role, no, why, text)`.

```
POST /api/app/tasks/:number/cancel   body { category, note? }
```

| Bidang mobile | Bidang server | GAP |
|---|---|---|
| radio 5 teks (`mobile/src/data/tasks.actions.ts:27-33`) | `category: TaskCancelCategory` enum (`server/pm/enums.ts:39-46`) | — (peta teks→enum di klien) |
| catatan wajib bila Other (`:84-89`) | `note` wajib saat `category === 'other'` (`server/access/task-flow.policy.ts:199`) | — |
| `cancelReason()` merangkai "Reason (note)" jadi satu string | server menyimpan `category` + `note` terpisah | — |
| tombol Cancel task disabled + alasan | `can.cancel` | **B3** |

Satu-satunya yang perlu dipetakan hati-hati: lima teks mobile harus dipasangkan ke
`TASK_CANCEL_CATEGORIES`, dan `note` dikirim apa adanya — jangan kirim string gabungan hasil
`cancelReason()`, karena server mengharapkan dua bidang.

### 1.9 Just write ✦ — `mobile/app/tasks/new/index.tsx`

`mobile/src/screens/tasks/new/write.screen.tsx:77` → `getQuickWrite()`
(`mobile/src/data/tasks.write.ts:19-31`, data contoh, tanpa LLM).

```
POST /api/app/tasks/draft   body { projectId, text }     → { drafts[], question }
POST /api/app/tasks         (satu per draf yang disetujui)
```

Ini satu-satunya bagian modul yang **lebih lengkap di server** daripada di data contoh mobile.

| Bidang mobile (`mobile/src/data/sample/tasks.extra.ts:70-92`) | Bidang `TaskDraft` (`server/ai/task-draft.types.ts:26-42`) | GAP |
|---|---|---|
| `text` | request `text` (maks 2000, `server/ai/task-draft.limits.ts:8`) | — |
| `drafts[].title` | `title` | — |
| `drafts[].who` (nama depan) | `assigneeId` + `assigneeNote` | — |
| `drafts[].due` + `dueHint` | `dueDate` (dihitung server dari "hari ini" zona app, `server/ai/task-draft.types.ts:36`) | — |
| `drafts[].priority` | `priority` | — |
| `drafts[].type` | `kindId` | **A3** |
| — | `description` | **B13** |
| `ask: string[]` + `askTitle` "Which Rina?" | `question: { text, options[], draftIndexes[] }` (`:45-54`) | — |
| `saveLabel` "Save 2 tasks" | `drafts.length` | — |
| proyek = Atlas, dipatok (`mobile/src/data/tasks.write.ts:12-16`) | `projectId` wajib di body | **A12** |

Jalur gagal yang wajib ditangani layar ini: `503 AI_DISABLED` dan `502 AI_UNAVAILABLE` → jatuh ke
Fill form dengan teks pengguna masuk ke Title (`server/ai/task-draft.types.ts:17-19`), serta
`429 RATE_LIMITED` dengan header `retry-after` (`server/api/app-tasks.draft.ts:35-42`).

### 1.10 Fill form — `mobile/app/tasks/new/form.tsx`

`mobile/src/screens/tasks/new/form.screen.tsx:39` → `getTaskForm(role, projectId)`; Save →
`saveNewTask` (`mobile/src/data/tasks.form.ts:227-254`).

```
GET  /api/app/team/picker?projectId=<id>     (opsi Assignee)
POST /api/app/tasks                          → 201 TaskDetail
```

| Field mobile | Bidang `CreateBody` (`server/api/app-tasks.schema.ts:54-75`) | GAP |
|---|---|---|
| `project` (dari `formProjects(role)`, `mobile/src/data/tasks.form.ts:181-185`) | `projectId` **wajib** | **A12** |
| `title` | `title` | — |
| `who[]` | `assigneeId` tunggal | **A1** |
| `due` | `dueDate` | — |
| `priority` | `priority` | — |
| `type` | `kindId` | **A3**, **A12** |
| `phase` | `phaseId` | **A12** |
| `desc` | `description` | — |
| `tags` | `tags` → **422** | **A2** |
| `start` (`mobile/src/data/tasks.form.ts:204`) | `startDate` (ada; `startDate > dueDate` → `422`, `server/task/task.limits.ts:87`) | — |
| `hours` "4" (`:205`) | `estimateHours` → **422** (S5) | **A9** |
| `review` + `reviewer` | `needsReview` hanya boleh `false` (`server/api/app-tasks.schema.ts:69-70`) | **A6** |
| `steps` | `checklist: string[]` (maks 20 item × 300 karakter, `server/task/task.limits.ts:24-25`) | — |
| tombol New task terlihat/tidak | `caps.createTask` (`server/task/task.dto.ts:78`) | **B5** |
| `pickProject()` menyaring assignee ke anggota proyek (`:210-213`) | `assigneeNotWorker` → `422` (`server/task/task.limits.ts:84`) | — |
| sesudah Save → `router.push('/tasks/<no>')` | `201` mengembalikan `TaskDetail` lengkap, termasuk `number` | — |

### 1.11 Import CSV — `mobile/app/tasks/csv.tsx`

`mobile/src/screens/tasks/csv/csv.screen.tsx:50` → `getCsvImport()`
(`mobile/src/data/tasks.write.ts:42-61`).

**Tidak ada endpoint impor CSV mana pun di `/api/app`** (hasil pencarian `csv` di `server/api/`
hanya menemukan modul ekspor admin dan analytics, tidak ada impor tugas). Seluruh layar terhalang
**A10**. Bidang pratinjau `CsvRow` (`mobile/src/data/sample/tasks.extra.ts:110-118`: `title`,
`email`, `due`, `state`, `note`) belum punya pasangan apa pun di server — termasuk pencocokan email
→ `assigneeId` dan validasi "Type 'QC' doesn't exist in this project" yang mengandaikan daftar
`kinds` per proyek (**A12**).

### 1.12 Project settings — `mobile/app/(tabs)/projects/[id]/settings.tsx`

`mobile/src/screens/tasks/settings/tasks-settings.screen.tsx:31` → `getTaskSettings(role, projectId)`
(`mobile/src/data/tasks.settings.ts:28-46`).

| Bidang mobile | Server | GAP |
|---|---|---|
| `allowed: false` untuk Member (`mobile/src/data/tasks.settings.ts:29`) | `projectCaps.manageKinds` (`server/access/capabilities.ts:85`, `:187`) | **B3** |
| `project` (nama) | `GET /api/app/projects/:id` | — |
| `needsReview` switch (`mobile/src/data/sample/tasks.settings.ts:10-12`) | **tidak ada endpoint** | **A11** |
| `types[]` + `count` per jenis | `loadTaskKinds` ada, **tanpa endpoint**; tidak ada tulis | **A11**, **A12** |
| `typeLimit` "3 of max. 6" | `METRICS.TASK_KINDS_MAX_ACTIVE = 6` (`server/metrics/config.ts:10`) | — |
| `tags[]` + hitungan + Rename/Merge/Delete | tag = S4, **422** | **A2**, **A11** |

Cap `manageKinds` sudah dikirim server, tapi route untuk memakainya belum ada: pencarian `taskKind`
di `server/api/` tidak menemukan apa pun (hanya `server/task/*`, `server/project/project.service.ts`
dan seed). Jadi tombolnya bisa ditampilkan dengan benar, aksinya belum bisa jalan.

### 1.13 Tab Tasks proyek + filternya — `mobile/app/(tabs)/projects/[id]/{index,task-filter}.tsx`

Scope `project:<id>` (`mobile/src/data/tasks.query.ts:32`):

```
GET /api/app/tasks?scope=project&projectId=<id>&…&limit=25[&cursor=]
```

`scope=project` tanpa `projectId` dijawab `422 VALIDATION` "Pilih proyeknya dulu."
(`server/api/app-tasks.ts:31-33`). Untuk scope ini `caps.createTask` dihitung **untuk proyek itu**,
bukan "ada proyek mana pun" (`server/task/task.query.ts:68-82`) — jadi tombol New task di tab proyek
otomatis benar begitu **B5** dikerjakan. Filter Assignee `'Anyone'|'Me'` → `assigneeId`. Bidang kartu
mengikuti §1.1; kartunya milik W4 (`mobile/src/screens/projects/detail/task-card.tsx`).

---

## 2. GAP dua arah

### 2a. Mobile menampilkan, API tidak mengirim (16)

| Id | Apa yang hilang | Layar terdampak | Usulan |
|---|---|---|---|
| **A1** | Pengerja ganda: `who` + `also[]` (`mobile/src/data/sample/tasks.ts:12-14`), `assignees()`, `whoLabel` "+N", fact Assignee daftar orang | semua kartu, board, detail, Edit, Fill form | **Butuh perubahan server.** `TaskListItem.assignee`/`TaskDetail.assignee` tunggal (`server/task/task.dto.ts:60`), `CreateBody`/`UpdateBody` hanya `assigneeId` tunggal (`server/api/app-tasks.schema.ts:59`, `:81`), dan skema DB hanya punya `assignee_id`. Yang kurang: tabel penugasan banyak-ke-banyak + DTO `assignees: PersonRef[]`. **Alternatif tanpa server:** turunkan fitur ke satu pengerja dan buang `also` dari mobile — ini pilihan produk, bukan teknis, jadi perlu keputusan user |
| **A2** | Tag: pencarian tag, fact Tag, `TagsEdit`, daftar tag di Project settings | daftar, detail, Edit, Fill form, Settings | **Butuh perubahan server** (S4). `tags` sengaja ditolak `t.Never()` → `422` (`server/api/app-tasks.schema.ts:47-51`) dan tidak ada di DTO mana pun. Yang kurang: kolom/tabel tag + `tags: string[]` di `TaskListItem`/`TaskDetail` + filter `q` yang mencakup tag |
| **A3** | `kind`/Type **di item daftar**: kartu All tasks dan board menampilkan `#no · type` | All tasks, Kanban, `cardName`, draft AI | **Butuh perubahan server** (kecil, expand-only). `kind` hanya ada di `TaskDetail` (`server/task/task.dto.ts:100`), tidak di `TaskListItem` (`:51-70`); `cardColumns` di `server/task/task.sql.ts` juga tidak menyeleksi kolom jenis, jadi ini penambahan di query **dan** DTO (`TaskCardRow`, `server/task/task.dto.ts:117-141`). **Alternatif:** panggil detail per kartu — tidak praktis untuk daftar |
| **A4** | `when` / catatan kartu: "2 days overdue", "Today", "Done Sep 20" (`mobile/src/data/sample/tasks.ts:16`), `note()` (`mobile/src/data/tasks.shared.ts:146-155`) | semua kartu | **Dihitung di klien** dari `status` + `dueDate` + `today` + `labels` + `reviewer`. Logikanya sudah ada di `whenFromDue()` (`mobile/src/data/tasks.shared.ts:168-173`); tinggal ganti sumber `today` (§4) |
| **A5** | Evidence / lampiran: "Evidence n", "+ Attach evidence", `TaskProof { file, caption }` | detail (varian progress/review), Edit | **Butuh perubahan server** (S5). Tidak ada lampiran di DTO atau skema. Yang kurang: tabel lampiran + endpoint unggah lewat `storage()` + `proof[]` di `TaskDetail` |
| **A6** | Seluruh alur review: Request review, Approve, Return, banner `asked`, fact Reviewer bertag peran, "Returned ×n", `leadNote`, switch Needs review, ganti reviewer | detail, Return sheet, Edit, grup "Waiting for my review" | **Butuh perubahan server** (S4). Policy-nya sudah lengkap (`server/access/review.policy.ts`, cap `requestReview`/`approve`/`return`/`needsReviewOn`/`needsReviewOff`/`changeReviewer` sudah dikirim) tetapi **rutenya belum ada** (`server/task/task.limits.ts:70-75`), `needsReview: true` ditolak saat create (`server/api/app-tasks.schema.ts:69-70`), dan `TASK_REVIEW_UI_ENABLED = false` (`server/pm/limits.ts:26`). Yang kurang: tiga route `POST /tasks/:ref/{request-review,approve,return}`, `needsReview` di `UpdateBody`, field siapa-minta-review + kapan (atau diturunkan dari timeline), dan hitungan Return yang terpisah dari `reopenCount` |
| **A7** | Siapa yang membatalkan: "Canceled by X: reason" (`mobile/src/data/tasks.detail.ts:142-145`) | detail (Canceled) | **Diambil dari endpoint lain.** `cancel: { category, note }` tidak memuat `by` (`server/task/task.dto.ts:105`); pelakunya ada di `GET /tasks/:ref/timeline` sebagai entri `action: 'canceled'` dengan `author` (`server/task/task.limits.ts:49`). Kategori enum → label dipetakan di klien |
| **A8** | Baris riwayat siap-pakai: `TaskLog { text, on }` ("Nico started working") | detail, "Chat & history" | **Dihitung di klien** dari `TimelineEntry` (`server/task/task-timeline.query.ts:21-30`): server mengirim `action` + `payload` + `author` + `at`, bukan kalimat. Catatan **K5**: kalimat yang memang dirangkai server (mis. pesan error, ringkasan audit) tetap Indonesia apa adanya; kalimat riwayat yang dirangkai klien ikut UI Inggris. Akun terhapus tampil sebagai "Mantan anggota" (`server/task/task.limits.ts:34`) — itu teks server, dibiarkan |
| **A9** | Estimated hours (`mobile/src/data/tasks.form.ts:205`) | Fill form | **Butuh perubahan server** (S5). `estimateHours` ditolak `t.Never()` → `422` (`server/api/app-tasks.schema.ts:47-51`) |
| **A10** | Impor CSV seluruhnya: unggah/tempel, pratinjau per baris, ringkasan "4 ready · 1 error", Import | `tasks/csv.tsx` | **Butuh perubahan server.** Tidak ada endpoint impor di `/api/app` sama sekali. Yang kurang: endpoint pratinjau (parse + validasi per baris tanpa menyimpan) dan endpoint impor massal, termasuk pencocokan email → `assigneeId` dan validasi `kindId` per proyek |
| **A11** | Project settings yang bisa ditulis: switch "New tasks need review", kelola jenis tugas, Rename/Merge/Delete tag | Project settings | **Butuh perubahan server.** Cap `manageKinds` dikirim (`server/access/capabilities.ts:187`) tapi tidak ada route; pencarian `taskKind` di `server/api/` kosong. Yang kurang: CRUD jenis tugas, setelan `needsReview` per proyek, dan (bersama A2) operasi tag |
| **A12** | Opsi form: proyek yang boleh ditambahi + `kinds` + `phases` per proyek | Fill form, Edit, Just write, Project settings, pratinjau CSV | **Butuh perubahan server — paling memblokir.** `listTaskFormProjects`, `loadTaskKinds`, `loadTaskPhases` ada (`server/task/task-form.query.ts:29-124`) tapi **hanya dipanggil loader web** (`app/routes/app/task-new.tsx:7`, `app/routes/app/task-edit.tsx:8`); mobile tidak punya loader SSR. Yang kurang: satu endpoint `GET /api/app/tasks/form-options[?projectId=]` yang mengembalikan `TaskFormProject[]`. Tanpa ini mobile tidak bisa mengirim `kindId`/`phaseId` yang sah, jadi New task dan Edit tidak bisa disambungkan |
| **A13** | Kandidat reviewer (`reviewersOf`, `mobile/src/data/tasks.form.ts:58-65`) | Edit (Needs review on) | **Butuh perubahan server** (S4). `reviewerCandidates` hanya hidup di dalam policy (`server/access/review.policy.ts`), tidak ada endpoint. Menyusunnya di klien = membuat aturan izin sendiri, yang dilarang |
| **A14** | Archive tugas dengan semantik prototipe: catatan "This task is in Archive." di detail, daftar Archive, Delete forever | detail, snack Undo, layar Archive (modul More) | **Keputusan produk, bukan kekurangan server.** Server punya **Sampah 30 hari**: `DELETE /tasks/:ref` (`server/api/app-tasks.delete.ts`) + `POST /trash/task/:id/restore` + retensi `TRASH_RETENTION_DAYS = 30` (`server/metrics/config.ts:9`). Bedanya: tugas di Sampah **tidak bisa dibuka detailnya** (`404`, `server/api/app-tasks.ts:62`), sedangkan mobile menampilkan detail ber-catatan. Izinnya sudah sepadan: `canTrashTask` = pembuat / manager / Admin (`server/access/task-trash.policy.ts:19-27`) ≈ `mayArchive` mobile (`mobile/src/data/tasks.shared.ts:94`). Pertanyaan terbuka ini sudah tercatat di `mobile/reacttransition.md:153` dan perlu diputuskan user sebelum §6 langkah 7 |
| **A15** | Semantik pencarian: mobile mencari judul, **awalan** nomor ("#1" menemukan #12, #14) dan tag (`mobile/src/data/tasks.query.ts:113-123`) | kotak cari daftar + board | **Butuh perubahan server** (sebagian). Server `q` = judul `ILIKE` **atau nomor persis** (`server/task/task.sql.ts:34-47`): awalan nomor dan tag tidak didukung. Tag ikut A2. Untuk awalan nomor: ubah server, atau terima perubahan perilaku (cari nomor persis saja) dan catat sebagai penyimpangan |
| **A16** | Sort "Title (A–Z)" (`mobile/src/data/tasks.query.ts:26`) | Filter & sort | **Butuh perubahan server.** `TASK_SORTS` hanya `due\|priority\|updated\|created` (`server/task/task.limits.ts:19`). Mengurutkan di klien **salah** begitu ada paginasi: yang terurut hanya halaman yang sudah dimuat. Sebaliknya server punya `created` yang tidak ditawarkan mobile |

### 2b. API mengirim, mobile belum memakainya (13)

| Id | Yang tersedia | Kenapa penting |
|---|---|---|
| **B1** | `id` UUID di setiap item (`server/task/task.dto.ts:52`) | Mobile hanya memakai `no`. `POST /trash/task/:id/restore` menuntut **id**, bukan nomor (`server/api/app-trash.ts:63`), jadi Undo setelah Archive tidak bisa jalan tanpa menyimpan `id`. Route `/:ref` memang menerima keduanya (`server/api/app-tasks.ts:64`), tapi route Sampah tidak |
| **B2** | `labels: TaskLabel[]` (`server/metrics/types.ts:43`) | Mobile tidak punya badge `stale` (lewat `TASK_STALE_DAYS = 3`), `blocked` (S4) dan `reopened`. `overdue` dan `awaiting_my_review` bisa langsung mengganti perhitungan klien |
| **B3** | `can{}` 15 kunci + `capMessage` (§3) | Mobile masih memakai aturan izin buatan sendiri (`mayChange`, `mayArchive`, `deniedNotice`, `actionsOf`, `role === 'member'`). Ini melanggar aturan modul dan harus dibuang |
| **B4** | `primary: PrimaryAction \| null` (`server/access/task-flow.policy.ts:77-83`, `:217-238`) | Server sudah memutuskan satu tombol utama per tugas; mobile menyusunnya sendiri di `actionsOf` (`mobile/src/data/tasks.detail.ts:103-110`). Bonus: kartu daftar bisa punya tombol langkah-berikutnya seperti web (`app/lib/tasks-api.ts:38-45`) |
| **B5** | `caps.createTask` (`server/task/task.dto.ts:78`) | Tombol New task / "Add task" per kolom / empty state "New task" di mobile tidak bersyarat. Absen = sembunyikan |
| **B6** | `project.status: ProjectStatus` (`server/task/task.dto.ts:46`) | Mobile hanya memakai nama proyek; status proyek bisa menjelaskan kenapa sebuah aksi terkunci |
| **B7** | `nextCursor` (§5) | Mobile tidak punya "muat lebih banyak" |
| **B8** | `GET /tasks/counts` → `mine` per grup + `byStatus` (`server/task/task.dto.ts:83-88`) | Judul grup dengan hitungan, dan pembeda `empty: 'none'` vs `'noMatch'` tanpa memuat semua tugas |
| **B9** | Tulis checklist: `POST`/`PATCH`/`DELETE .../checklist` (`server/api/app-tasks.detail.ts:47-81`) | Steps mobile masih state lokal yang tidak disimpan (dibiarkan sesuai prototipe di W1d #15). Jawabannya mengembalikan `{ item, checklist }` sehingga progres "2/3" ikut segar |
| **B10** | Komentar: `POST`/`PATCH`/`DELETE .../comments` + `editedAt` + paginasi timeline | Kaki komentar mobile input tanpa tombol kirim. Semua yang dibutuhkan sudah ada |
| **B11** | `POST /tasks/:ref/unstart` ("Batal mulai", `server/api/app-tasks.workflow.ts:47-51`) | Tidak ada tombolnya di mobile, padahal `can.unstart` dikirim |
| **B12** | Stempel waktu + `reopenCount`: `startedAt`, `completedAt`, `canceledAt`, `createdAt`, `updatedAt` (`server/task/task.dto.ts:104-110`) | Mobile hanya punya `doneOn` dan `updated` sampel. Berguna untuk riwayat dan "terakhir diubah" — tapi perhatikan §4 soal zona waktu saat merendernya |
| **B13** | `POST /tasks/draft` AI nyata + `description` per draf (`server/ai/task-draft.types.ts:41`) | Just write mobile memakai data contoh. Server sudah menyediakan draf sungguhan, pertanyaan ambigu dengan `options`, dan `dueDate` yang dihitung server |

---

## 3. Izin (`can{}`)

Server mengirim kapabilitas per objek, dan arti nilainya ditetapkan di
`server/access/capabilities.ts:5-8` dan `:61-62`:

- `true` → kontrol **tampil dan aktif**
- kode deny (mis. `REVIEW_REQUIRED`, `LOCKED_BY_STATUS`) → kontrol **tampil tapi disabled**, alasannya
  dari `capMessage(kode)` (`server/access/capabilities.ts:136-138`)
- **kunci tidak ada** → kontrol **disembunyikan**

Pilihan sembunyikan-vs-disable dimiliki `DENY_UI[kode].ui` (`server/access/decision.ts:22-90`), bukan
mobile. 15 kunci tugas ada di `TASK_CAP_KEYS` (`server/access/capabilities.ts:65-82`); daftar lengkap
yang dipakai modul ini:

| Kunci `can` | Kontrol mobile yang harus mematuhinya |
|---|---|
| `update` | ⋯ › **Edit task**; tombol **Save** di layar Edit |
| `start` | **Start working** (detail); sisi menu radial ke **In progress** dari To do |
| `unstart` | *(belum ada tombolnya — **B11**)*; sisi radial In progress → To do |
| `complete` | **Mark done** (detail); sisi radial ke **Done** |
| `requestReview` | **Request review** (detail); sisi radial ke **In review** — S4 (**A6**) |
| `approve` | **Approve** (detail, varian review); grup "Waiting for my review" — S4 (**A6**) |
| `return` | tombol **Return** + sheet Return — S4 (**A6**) |
| `reopen` | **Reopen** pada tugas Done (ingat: butuh `reason`, §1.5) |
| `cancel` | ⋯ › **Cancel task**; tombol **Cancel task** di sheet |
| `uncancel` | **Restore** di catatan tugas Canceled |
| `comment` | kaki **"Write a comment…"** |
| `needsReviewOn` / `needsReviewOff` | switch **Needs review** di Edit; fact "Needs review" — S4 (**A6**) |
| `changeReviewer` | pemilih **Reviewer** di Edit; nilai khusus `NO_ELIGIBLE_REVIEWER` = tampil disabled (`server/access/capabilities.ts:59`) — S4 (**A6**, **A13**) |
| `trash` | ⋯ › **Move to Archive** (→ Sampah, **A14**) |

Di luar 15 kunci itu, dua kapabilitas tingkat jawaban:

- `caps.createTask` pada `GET /tasks` → tombol **New task**, **"Add task"** per kolom board, dan
  tombol **New task** di empty state (**B5**). Untuk `scope=project` nilainya dihitung khusus untuk
  proyek itu (`server/task/task.query.ts:68-82`).
- `projectCaps.manageKinds` pada `GET /projects/:id` → layar **Project settings**, menggantikan
  `role === 'member'` (`mobile/src/data/tasks.settings.ts:29`).

### Aturan izin mobile yang wajib dibuang

Semuanya diganti pembacaan `can{}`:

| Yang dibuang | Lokasi |
|---|---|
| `mayChange` (Member hanya tugasnya) | `mobile/src/data/tasks.shared.ts:90` |
| `mayArchive` (Member hanya yang ia buat) | `mobile/src/data/tasks.shared.ts:94` |
| `deniedNotice` ("Only Nico or Rina can change this task") | `mobile/src/data/tasks.shared.ts:98` |
| `actionsOf` (tombol per varian) | `mobile/src/data/tasks.detail.ts:103-110` → pakai `primary` + `can{}` |
| `stateNoteOf` cabang `notYours` / `waiting` | `mobile/src/data/tasks.detail.ts:147-155` → `can{}` kosong + `capMessage` |
| `canReturn` (`role !== 'Member'`) | `mobile/src/data/tasks.detail.ts:206`, `:214` → `can.return` |
| `role === 'member'` di Project settings | `mobile/src/data/tasks.settings.ts:29` → `manageKinds` |
| `role === 'admin'` di `formProjects` | `mobile/src/data/tasks.form.ts:184` → endpoint opsi form (**A12**) |
| `reviewersOf` (Manager proyek + semua Admin) | `mobile/src/data/tasks.form.ts:58-65` → endpoint kandidat reviewer (**A13**) |
| gerbang `mayChange` sebelum menu radial + notice "Only X or Y…" | `mobile/src/screens/tasks/board/use-move-menu.ts` |

Catatan **K5** untuk bagian ini: `capMessage` mengembalikan kalimat **Indonesia**
(`server/access/decision.ts:22-90`) sementara UI mobile Inggris. Sesuai keputusan user, bahasa
dibiarkan campur: pesan dari server ditampilkan apa adanya, **tidak** diterjemahkan di klien.

---

## 4. Tanggal dan zona waktu

### Keadaan sekarang

Data contoh memakai "hari ini" sebagai konstanta: `TODAY = '2026-10-07'`
(`mobile/src/data/sample/today.ts:5`). Modul Tugas membacanya di lima tempat:

| Pemakaian | Lokasi |
|---|---|
| `dueIn(t)` — dasar semua perhitungan tenggat | `mobile/src/data/tasks.shared.ts:73` |
| `groupOf(t)` + `daysToSunday(TODAY)` — batas grup jadwal | `mobile/src/data/tasks.groups.ts:31` |
| `whenFromDue(due, tomorrow)` — label "N days overdue"/"Today"/"Tomorrow" | `mobile/src/data/tasks.shared.ts:168-173` |
| `initialForm().start` — Start date default di Fill form | `mobile/src/data/tasks.form.ts:204` |
| `runTaskAction` → `asked.on` saat Request review | `mobile/src/data/tasks.actions.ts:59` |

Hal baik yang sudah benar: **tidak ada satu pun `new Date()`** di `mobile/src/data/tasks*.ts` maupun
`mobile/src/screens/tasks/**` (hasil pencarian kosong). Jam perangkat belum pernah dibaca.

### Dari mana `today` dan `timeZone` diambil (K1)

`GET /api/app/home` sudah mengirim keduanya di `now`:

```
now: { iso, today, timeZone, greeting, dateLabel, timeLabel }
```

`server/home/home.dto.ts:14-24`, route `server/api/app-home.ts:13`. Server menurunkannya lewat
`requestClock()` → `isoDateIn(now, getMetrics().TIME_ZONE)` (`server/task/task.clock.ts:7-9`), dibaca
ulang **setiap request** supaya pergantian hari tidak pernah ter-cache. Tidak perlu endpoint baru:
`TODAY` diganti nilai `now.today` yang disimpan sekali per sesi/segar bersama Beranda, dan modul
Tugas membacanya dari satu tempat yang sama seperti sekarang.

### Zona tim Asia/Jakarta (K2) — dengan satu koreksi

Zona tim memang `Asia/Jakarta`, bukan UTC (`server/metrics/config.ts:11`).

Tapi dugaan bahwa perhitungan tanggal mobile "meleset 7 jam" **tidak berlaku untuk modul Tugas
sebagaimana kodenya sekarang**, dan ini perlu dicatat supaya tidak ada yang "memperbaiki" hal yang
tidak rusak. Alasannya: `mobile/src/data/dates.ts` tidak pernah mengubah *instant* menjadi tanggal.
`toUtc()` mem-parse string `YYYY-MM-DD` menjadi tengah malam UTC dan `daysBetween()` mengurangi dua
hasil itu (`mobile/src/data/dates.ts:8-16`). Server melakukan hal yang sama persis: `scheduleBounds`
juga memakai aritmetika UTC **di atas string tanggal** (`server/metrics/schedule.ts:28-48`), dan
`diffDays` memakai `utcDay()` (`server/metrics/dates.ts:32-40`). Zona hanya ikut bermain satu kali,
yaitu saat server mengubah `now` menjadi tanggal kalender lewat `isoDateIn(now, 'Asia/Jakarta')`
(`server/metrics/dates.ts:26-30`). Jadi selama `today` yang dipakai mobile adalah `now.today` dari
server, aritmetika UTC murni di klien memberi hasil identik dengan server. Yang salah di mobile
sekarang hanyalah **sumber** `today` (konstanta), bukan cara menghitungnya.

Risiko 7 jam itu nyata, tetapi **baru muncul di Fase 2** pada bidang yang belum dipakai mobile, yaitu
setiap *instant* UTC yang mulai masuk dari API: `createdAt`, `updatedAt`, `startedAt`, `completedAt`,
`canceledAt` (`server/task/task.dto.ts:106-110`), `TimelineEntry.at` dan `editedAt`
(`server/task/task-timeline.query.ts:21-30`), serta `trash.deletedAt`. Semuanya ISO UTC. Merendernya
dengan `toUtc()`/`monthDay()` akan menampilkan **tanggal yang salah antara 00.00 dan 07.00 WIB** —
misalnya komentar pukul 01.00 WIB tanggal 8 Oktober (`2026-10-07T18:00Z`) akan terbaca "Oct 7".
Aturannya untuk Fase 2: instant harus dikonversi memakai `now.timeZone`, bukan `toUtc()`; sedangkan
bidang yang sudah berupa tanggal (`dueDate`, `startDate`, `YYYY-MM-DD`) tetap aman dengan `dates.ts`
apa adanya. Perlu pemisahan jelas antara dua jenis bidang ini, dan `dates.ts` sekarang hanya
mendukung jenis kedua.

### Layar yang akan salah kalau memakai jam perangkat

Urut dari yang paling berbahaya:

1. **My tasks** — grup Overdue/Today/Tomorrow/This week (`mobile/src/data/tasks.groups.ts:25-32`).
   Paling parah karena `due=` dikirim ke server: kalau mobile memilih grup dengan "hari ini" versi
   perangkat sementara server memotong dengan versi Jakarta, sebuah tugas bisa diminta di grup
   `today` tapi dijawab kosong, atau tampil di dua grup sekaligus. Pengelompokan dan hitungan
   (`counts.mine`) akan saling bertentangan.
2. **Kartu daftar dan board** — `late`, `lateOnBoard`, `lateBy` (`mobile/src/data/tasks.ts:106-108`).
   Tenggat hari ini salah ditandai merah "1 day late" bagi pengguna yang zonanya lebih timur, atau
   tugas yang benar-benar lewat tampil normal.
3. **Detail** — `dueLabel()` dan `dueNote()` (`mobile/src/data/tasks.shared.ts:114-132`): "Today" /
   "Tomorrow" / "Overdue N days" bergeser satu hari.
4. **Fill form** — Start date default `TODAY` (`mobile/src/data/tasks.form.ts:204`); bisa memicu
   `422` "Tanggal mulai tidak boleh sesudah tenggat" (`server/task/task.limits.ts:87`) untuk kombinasi
   yang menurut pengguna wajar.
5. **Just write** — label "(tomorrow)", "(Friday)" (`mobile/src/data/tasks.write.ts:24`). Di Fase 2
   `dueDate` dihitung server dari hari ini zona app (`server/ai/task-draft.types.ts:36`), jadi label
   klien harus mengikuti `now.today` yang sama atau akan bertentangan dengan tanggal yang ditampilkan.
6. **Filter & sort** — tidak ada tanggal, aman.

---

## 5. Paginasi dan muat ulang

### Keadaan sekarang: semua di memori

Data contoh adalah larik penuh di memori, dan seluruh penyaringan/pengurutan/pencarian terjadi di
klien:

| Asumsi "semua data tersedia sekaligus" | Lokasi |
|---|---|
| `s.tasks.filter(...)` untuk menentukan sumber per scope | `mobile/src/data/tasks.ts:115-123` |
| `applyQuery()` menyaring **dan** `.sort()` seluruh larik | `mobile/src/data/tasks.query.ts:90-107` |
| `searchTasks()` mencari di seluruh larik | `mobile/src/data/tasks.query.ts:113-123` |
| `myGroups()` membagi seluruh tugas saya ke 7 grup | `mobile/src/data/tasks.groups.ts:44-68` |
| `boardColumns(tasks)` membagi satu larik ke 4 kolom | `mobile/src/data/tasks.columns.ts:37-38` |
| "My tasks membaca **setiap** tugas" untuk antrean review lintas tim | `mobile/src/data/tasks.ts:145-148` |
| select-all per kolom + `holdGroup` (pindah grup) | `mobile/src/data/tasks.columns.ts:44-45`, `board/select-control.tsx` |
| hitungan tag dan jenis di Project settings dari seluruh tugas proyek | `mobile/src/data/tasks.settings.ts:32-34` |

Tidak ada `nextCursor`, tidak ada "muat lebih banyak", tidak ada keadaan "sedang memuat halaman
berikutnya" di layar mana pun.

### Bentuk kursor server

Keyset, bukan offset. Kursor opaque: base64url dari JSON `[sortValue, id]`
(`server/pm/keyset.ts:1`, `:10-12`). Nilainya diambil dari baris terakhir halaman dan dicocokkan
dengan sort yang dipakai (`server/task/task.query.ts:121-126`, `:139-141`).

- `limit` default **25**, maksimum **100** (`server/pm/limits.ts:15-16`;
  skema `server/api/app-common.ts:5-6`).
- Server mengambil `limit + 1` baris untuk tahu ada halaman berikutnya tanpa query hitung kedua
  (`server/task/task.query.ts:137-141`).
- `nextCursor: null` = halaman terakhir.
- Kursor rusak **atau milik sort lain** → `400 BAD_CURSOR` dengan pesan "Halaman daftar tidak
  dikenali. Muat ulang daftar dari awal." (`server/api/app-tasks.ts:50-55`). Jadi **mengganti sort
  atau filter wajib membuang kursor** dan memuat dari awal — ini penyebab bug yang paling mudah
  terjadi di layar filter.
- Kursor `sortValue` bergantung sort: tanggal `YYYY-MM-DD` untuk `due` (boleh `null`), peringkat int
  untuk `priority`, timestamptz teks untuk `updated`/`created` (`server/task/task.sql.ts:122-150`).

### Layar yang butuh "muat lebih banyak"

| Layar | Bentuknya |
|---|---|
| **My tasks** | satu daftar ber-kursor **per grup jadwal**, seperti web (`app/components/tasks/TaskGroupList.tsx:26`). Grup `Done` dan `Canceled` jadi dua daftar tambahan dengan `status=` (bukan `due=`), karena tugas tertutup tidak punya `ScheduleGroup` (`server/metrics/schedule.ts:54-58`) |
| **All tasks** | satu daftar ber-kursor |
| **Tab Tasks proyek** | satu daftar ber-kursor (`scope=project`) |
| **Kanban** | **empat kursor terpisah**, satu per kolom (`status=todo\|in_progress\|in_review\|done`). Ini konsekuensi paling berat: tidak ada cara meminta "25 teratas tiap kolom" dalam satu panggilan |
| **Detail › Chat & history** | `GET /tasks/:ref/timeline?cursor=` juga keyset, limit sama (`server/task/task-timeline.query.ts:49-50`) |
| **Detail › Steps** | tidak perlu: checklist dikirim utuh di detail (`server/task/task.dto.ts:111`), dibatasi 50 langkah (`server/task/task.limits.ts:28`) |

### Yang perlu diputuskan bersama paginasi

Tiga hal akan berubah perilakunya, bukan cuma bertambah tombol:

1. **Pencarian dan pengurutan harus pindah ke server.** `searchTasks` dan `.sort()` di klien hanya
   melihat halaman yang sudah dimuat, jadi hasilnya akan terlihat salah begitu ada halaman kedua.
   Pindah ke `q=` dan `sort=` mengubah semantik pencarian (**A15**) dan menghilangkan sort judul
   (**A16**).
2. **Select-all dan pindah grup di board jadi "semua yang sudah dimuat".** `holdGroup` memindahkan
   seluruh pilihan (`mobile/src/data/tasks.columns.ts:44-45`), dan pilihan itu kini tidak bisa
   mencakup kartu yang belum dimuat. Label "Select all To do tasks" perlu diperiksa ulang supaya
   tidak menjanjikan lebih dari yang dilakukan. Tambahan: tidak ada endpoint aksi massal — satu
   `POST /tasks/:ref/<action>` per tugas, jadi "Moved 2 tasks to Done" harus menghitung yang benar-
   benar berhasil dan menangani sebagian gagal.
3. **Hitungan sebaiknya dari `counts`, bukan dari panjang larik.** Judul grup, pembeda `empty: 'none'`
   vs `'noMatch'`, dan jumlah per status diambil dari `GET /tasks/counts`
   (`server/task/task.dto.ts:83-88`) agar tidak memuat seluruh tugas hanya untuk menghitung.
   Hitungan tag/jenis di Project settings (`mobile/src/data/tasks.settings.ts:32-34`) tidak punya
   padanan dan ikut terhalang **A11**.

---

## 6. Urutan kerja yang disarankan (bahan dispatch Tahap 3)

Dari yang paling tidak berisiko. Setiap langkah dimaksudkan tetap lulus tes dan bisa dihentikan di
situ tanpa meninggalkan layar yang rusak.

| # | Pekerjaan | Kenapa aman di urutan ini | Perkiraan berkas |
|---|---|---|---|
| 1 | **Peta nilai + sumber `today`.** Peta status/prioritas/kategori-batal huruf besar↔enum; `TODAY` konstanta → `now.today` dari `GET /api/app/home`; pisahkan helper *tanggal* (aman UTC) dari helper *instant* (wajib `now.timeZone`) | Murni penambahan fungsi; belum ada layar yang berubah. Menutup §4 lebih dulu supaya semua langkah berikutnya memakai hari yang sama dengan server | `mobile/src/data/dates.ts`, `mobile/src/data/sample/today.ts` → modul jam baru, `mobile/src/data/tasks.shared.ts`, `mobile/src/data/tasks.groups.ts`, tes `__tests__/tasks/` |
| 2 | **Lapisan tipe + pemetaan DTO.** Tipe `TaskListItem`/`TaskDetail`/`TaskCounts`/`TimelineEntry` di sisi mobile, plus fungsi `toTaskCard(dto)` dan `toTaskDetailView(dto)` yang menghasilkan bentuk yang **sudah dipakai layar hari ini** | Layar tidak disentuh: data contoh masih mengisi bentuk yang sama. Semua beda bentuk ketahuan di tes, bukan di layar | `mobile/src/api/tasks.types.ts` (baru), `mobile/src/data/tasks.ts`, tes unit pemetaan |
| 3 | **Baca `can{}` dan `primary`.** Buang aturan izin mobile (tabel di §3), ganti pembacaan cap; tombol disabled memakai `capMessage` apa adanya (**K5**) | Bisa dikerjakan **sebelum** ada API: cap diisi dari data contoh. Ini melunasi pelanggaran aturan modul paling awal, dan menyederhanakan `tasks.detail.ts` sebelum layar disambung | `mobile/src/data/tasks.shared.ts`, `tasks.detail.ts`, `tasks.settings.ts`, `tasks.form.ts`, `mobile/src/screens/tasks/detail/detail-actions.tsx`, `board/use-move-menu.ts`, `settings/tasks-settings.screen.tsx` |
| 4 | **Daftar read-only ber-paginasi.** My tasks (per grup) + All tasks + tab proyek + `counts`; `q`/`sort`/filter pindah ke server; "muat lebih banyak" + penanganan `BAD_CURSOR` (buang kursor saat filter/sort berubah) | Read-only: tidak ada tulis, jadi kegagalan paling buruk hanya daftar kosong. Dua penyimpangan (**A15**, **A16**) wajib dilaporkan ke user di langkah ini | `mobile/src/api/tasks.ts` (baru), `mobile/src/data/tasks.ts`, `tasks.query.ts`, `tasks.query-state.ts`, `mobile/src/screens/tasks/list/**`, `filter/**` |
| 5 | **Detail read-only + timeline + checklist.** `GET /tasks/:ref`, timeline ber-kursor, dan tulis checklist (**B9**) yang sudah tersedia penuh | Satu objek, tanpa transisi status. Timeline sekaligus menutup **A7** (siapa membatalkan) dan **A8** (kalimat riwayat) | `mobile/src/data/tasks.detail.ts`, `mobile/src/screens/tasks/detail/**` |
| 6 | **Enam transisi status.** `start`, `unstart` (**B11**), `complete`, `reopen` (**tambah sheet alasan**, §1.5), `cancel`, `uncancel`; board memanggil satu `POST` per tugas, memakai `can{}` untuk mematikan sisi radial yang tidak sah | Tulis pertama, tapi semuanya idempoten dari sudut pengguna dan jawabannya `{ task, can }` sehingga tombol langsung segar. Matikan sisi radial **sebelum** menu dibuka, jangan andalkan `409` | `mobile/src/data/tasks.actions.ts`, `tasks.store.ts`, `mobile/src/screens/tasks/board/**`, `sheets/cancel.screen.tsx`, sheet alasan Reopen (baru) |
| 7 | **Sampah + Undo.** `DELETE /tasks/:ref` → snack Undo → `POST /trash/task/:id/restore`; simpan `id` UUID (**B1**) | Destruktif, jadi setelah semua yang di atas stabil. **Butuh keputusan user lebih dulu** soal Archive vs Sampah (**A14**): detail tugas di Sampah menjawab `404`, sehingga catatan "This task is in Archive." tidak bisa ditiru apa adanya | `mobile/src/data/tasks.store.ts`, `tasks.actions.ts`, `mobile/src/screens/tasks/detail/**`, `mobile/src/data/archive.ts` |
| 8 | **Tulis tugas: Edit + Fill form.** `PATCH` dan `POST /tasks` | **Terhalang A12** (tanpa endpoint opsi form, `kindId`/`phaseId` yang sah tidak bisa dikirim). Siapkan di belakang A12; sampai itu ada, Edit/Fill form tetap data contoh | `mobile/src/data/tasks.form.ts`, `mobile/src/screens/tasks/edit/**`, `new/form.screen.tsx` |
| 9 | **Just write ✦ nyata.** `POST /tasks/draft` + buat per draf; tangani `503`/`502`/`429` | Butuh langkah 8 (draf berujung pada `POST /tasks`). Nilai tambahnya besar karena server sudah lebih lengkap dari data contoh (**B13**) | `mobile/src/data/tasks.write.ts`, `mobile/src/screens/tasks/new/write.screen.tsx` |
| 10 | **Tertunda menunggu server.** Review S4 (**A6**, **A13**), pengerja ganda (**A1**), tag (**A2**), `kind` di item daftar (**A3**), lampiran (**A5**), estimasi jam (**A9**), impor CSV (**A10**), Project settings (**A11**), opsi form (**A12**), sort judul (**A16**) | Bukan pekerjaan mobile. Layar Return, CSV dan Project settings tetap memakai data contoh/notice seperti Fase 1 sampai endpointnya ada | — |

Catatan untuk perencanaan Tahap 3: langkah 1–7 bisa dikirim sebagai pekerjaan mobile murni tanpa
menunggu apa pun dari sisi server. Langkah 8–9 menunggu **A12**, yang karena itu jadi permintaan
server paling berharga dan paling kecil: satu endpoint read-only yang membungkus
`listTaskFormProjects` yang **sudah ada dan sudah diuji** (`server/task/task-form.query.ts:77-124`),
tanpa logika baru.

---

## Yang belum dipastikan

Hal-hal yang tidak bisa disimpulkan dari kode dan perlu dicek sebelum dipakai sebagai dasar
keputusan:

- **Bentuk `payload` per `action` di timeline.** `TimelineEntry.payload` bertipe `unknown`
  (`server/task/task-timeline.query.ts:30`). `task.limits.ts:36-56` menyebut beberapa bentuk
  (`{ from, to }` untuk `phase_changed`, `{ number }` untuk `trashed`/`restored`,
  `{ commentId }` untuk `comment.delete`), tetapi tidak semua aksi terdokumentasi. Perlu dibaca di
  `server/task/task.service.ts` dan `task-workflow.service.ts`, atau diamati dari respons nyata,
  sebelum menyusun kalimat riwayat (**A8**).
- **Apakah `scope=all` untuk Member dipersempit otomatis.** Untuk proyek, `listProjects` menyebut
  "a Member asking for `all` gets `mine`" (`server/api/app-projects.ts:27`). Untuk tugas, visibilitas
  diputuskan di SQL lewat `visibleTo(projectListScope(p))` (`server/task/task.query.ts:134`); saya
  belum memverifikasi apakah efeknya sama. Ini menentukan apakah Seg "All tasks" perlu disembunyikan
  untuk Member.
- **Apakah `GET /api/app/home` layak jadi satu-satunya sumber `now`** (**K1**), dan seberapa sering
  harus disegarkan supaya pergantian hari tengah malam WIB tidak membuat grup jadwal basi. Perlu
  keputusan: panggil ulang saat app kembali ke foreground, atau ikut siklus react-query Beranda.
- **Nilai `limit` yang pas untuk kolom board.** Default 25 per kolom × 4 kolom = 4 panggilan per
  pembukaan papan. Belum diukur apakah itu nyaman di jaringan ponsel atau perlu `limit` lebih kecil.
- **Apakah `also` (pengerja ganda, **A1**) benar-benar dipertahankan.** Ini pilihan produk: menambah
  tabel penugasan di server, atau menurunkan fitur mobile ke satu pengerja. Perlu jawaban user
  sebelum **A1** dijadwalkan.
