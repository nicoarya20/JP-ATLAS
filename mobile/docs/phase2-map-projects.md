# Fase 2 — Pemetaan data: modul Proyek (Projects)

Status: analisis (read-only), 26 Okt 2026. **Tidak ada kode yang diubah** oleh dokumen ini.

Dasar keputusan: mobile hanya mengonsumsi API `/api/app/*` yang sama dengan web — `mobile/reacttransition.md:34`
("Mobile nanti hanya **mengonsumsi** API `/api/app/*`") dan `:69` (Fase 2 = login + client API + ganti data contoh).
Tidak ada endpoint khusus mobile. Layar mobile Fase 1 ada di `mobile/docs/phase1-screens.projects.md`.

Catatan metode: web tidak memanggil HTTP untuk halamannya sendiri — loader SSR memanggil lapisan query langsung
(`app/routes/app/project/layout.tsx:27` memanggil `getProjectDetail`, `app/routes/app/projects.tsx:47` memanggil
`listProjects`). Jadi "data yang sama dengan web" artinya **DTO yang sama**, dan route HTTP `/api/app/projects*`
mengembalikan DTO itu tanpa perubahan. Satu akibat penting: data yang web ambil **hanya** lewat loader (daftar task
type, lihat GAP A-12) belum punya route HTTP sama sekali.

## 0. Ringkasan

| Hal | Angka |
|---|---|
| Layar/sheet modul ini yang dipetakan | 12 |
| GAP (a) — mobile menampilkan, API tidak mengirim | **18** |
| … di antaranya **butuh perubahan server** | **10** (A-1, A-2, A-3, A-4, A-6, A-8, A-9, A-12, A-16, A-17) |
| … bisa dihitung di klien | 5 (A-5, A-11, A-14, A-15, A-18) |
| … bisa diambil dari endpoint lain yang sudah ada | 3 (A-7, A-10, A-13) |
| GAP (b) — API mengirim, mobile belum memakai | **17** |

Dua perubahan struktural yang menyentuh hampir semua tabel di bawah:

1. **Kunci orang dan proyek.** Mobile memakai **nama depan** sebagai identitas orang (`'Nico'`,
   `mobile/src/data/sample/people.ts:9`) dan **nama proyek** sebagai kunci tugas → proyek
   (`mobile/src/data/projects.state.ts:76` `getProjectByName`, dan karena itu `projectNameTaken` di `:85` menolak nama
   ganda). Server memakai **id** (`userId`, `projectId`). Setelah API tersambung, aturan "nama proyek wajib unik" tidak
   punya dasar lagi: `server/db/schema.project.ts:27` tidak punya constraint unik, dan tugas menunjuk `projectId`.
2. **Bahasa.** UI mobile berbahasa Inggris (`reacttransition.md:§1`, keputusan 2026-10-25), sedangkan server mengirim
   **enum snake_case** (`server/pm/enums.ts:7`) plus beberapa **teks siap tampil berbahasa Indonesia**
   (`condition.reason` dari `server/metrics/condition.ts:100`, `activity.text` dari
   `server/project/project-activity.dto.ts:157`, pesan error dari `server/project/member.service.ts:29`). Enum → label
   Inggris adalah pekerjaan klien; teks siap tampil berbahasa Indonesia adalah GAP (A-8, dan pesan error, lihat §3).

---

## 1. Peta per layar

Enum yang dipakai berulang (`server/pm/enums.ts`): `PROJECT_STATUSES = draft|active|on_hold|completed|canceled` (`:7`),
`PROJECT_PRIORITIES = low|medium|high|critical` (`:10`), `PROJECT_MEMBER_ROLES = manager|member|viewer` (`:13`),
`PROJECT_CONDITIONS = on_track|at_risk|off_track` (`:16`), `PHASE_STATUSES = not_started|in_progress|done` (`:20`),
`EXTENSION_REASON_CATEGORIES = scope_change|dependency|resource|other` (`:25`).

### 1.1 Projects list — `app/(tabs)/projects/index.tsx` → `list/projects.screen.tsx`

Endpoint: **`GET /api/app/projects?scope=mine|all&status=<enum>&q=<≤100>&sort=due|name|recent&perhatian=1&page=&limit=`**
(`server/api/app-projects.ts:31`, skema query `:14`). Jawaban `{ items, total, page, limit }` (`:48`); `items[]` =
`ProjectListItem` (`server/project/project.dto.ts:29`). Titik tukar mobile: `getProjectsList`
(`mobile/src/data/projects.ts:82`), bentuk kartu `ProjectCard` (`:32`, dirakit di `card()` `:69`).

| Bidang data contoh mobile | Bidang DTO server | GAP |
|---|---|---|
| `id` (`sample/projects.ts:6`) | `id` | — |
| `name` | `name` | — |
| `status: 'Active'\|'On hold'\|'Draft'\|'Done'\|'Canceled'` (`sample/projects.ts:3`) | `status: active\|on_hold\|draft\|completed\|canceled` | — (perhatikan `Done` → **`completed`**) |
| `lead: 'Nico'` (nama depan) | `lead: { id, name } \| null` (`project.dto.ts:24`); `name` = display name penuh | — untuk data; **copy berubah** ("Lead: Nico Pratama") dan `lead` bisa `null` (FK SET NULL, `schema.project.ts:32`) sedangkan mobile mengasumsikan selalu ada |
| `progress: 70` (angka) | `progress: { done, total, percent }` (`project.dto.ts:25`), `percent: number \| null` | — ; `percent` dibatasi 99 kecuali semua selesai (`server/metrics/config.ts:13`) |
| `percent: '70%' \| '–'` (`projects.ts:77`) | — | turunan klien dari `progress.percent === null` |
| `due: 'Oct 31'` (`projects.ts:78`, `monthDay`) | `dueDate: string \| null` (`YYYY-MM-DD`) | — ; mobile wajib menangani `null` (belum) |
| `health: '! Needs attention'` + `why: '1 important task overdue'` (`sample/projects.extra.ts:18`) | `condition: { level, reason } \| null` (`project.dto.ts:27`); `reason` **Bahasa Indonesia** ("1 tugas penting terlambat", `metrics/condition.ts:100`) | **GAP A-8** (teks Indonesia) + **A-5** (`'✓ Done'`/`'No tasks yet'` bukan condition: `condition` null untuk status selain `active`, `metrics/condition.ts:72`) |
| `members: ['Nico','Rina',…]` → `AvatarStack` (`list/project-card.tsx:47`) | **tidak ada di `ProjectListItem`** | **GAP A-1** |
| — | `priority`, `startDate`, `myRole`, `plan?` | **GAP B-1, B-2, B-4, B-9** |
| `people[]` + chip "My projects" + param `who` (`projects.ts:88`, `projects.people.ts:10`) | hanya `scope=mine\|all` (`app-projects.ts:16`) | **GAP A-2** |
| `whoLine: "Rina's projects · 3"` (`projects.ts:91`) | — | turunan klien, tergantung A-2 |
| `empty: 'none'\|'noMatch'` (`projects.ts:93`) | `total === 0` + apakah ada filter | turunan klien |
| `filtered` (titik di ikon filter) | — | turunan klien dari query sendiri |
| `projectsFor(role)`: member hanya proyek yang ia ikuti (`projects.ts:63`) | `scope` di-clamp server: `all` dari Member menjadi `mine` tanpa error (`access/project.policy.ts:123`) | — ; **aturan ini pindah ke server**, jangan diduplikasi di klien |

### 1.2 Filter & sort — `app/(tabs)/projects/filter.tsx` → `filter/projects-filter.screen.tsx`

Tidak ada endpoint sendiri; menulis query untuk 1.1. Mobile: `projects.query.ts:6-9` + `applyQuery` (`:36`) dan
`searchProjects` (`:45`), keduanya **memfilter di memori**.

| Kontrol mobile | Padanan query server | GAP |
|---|---|---|
| Status `All/Active/On hold/Done/Draft/Canceled` (`projects.query.ts:6`) | `status=<enum>` (satu nilai, `app-projects.ts:17`) | — |
| Health `All/Needs attention/Overdue/On track` (`projects.query.ts:7`, dicocokkan dengan **substring** `health.includes` `:40`) | hanya `perhatian=1` = `at_risk` **+** `off_track` digabung (`project-list.query.ts:27`) | **GAP A-3** |
| Sort `Nearest deadline / Lowest progress / Name (A–Z)` (`projects.query.ts:9`) | `sort=due\|name\|recent` (`project-list.query.ts:23`, urutan SQL `:57`) | **GAP A-4** ("Lowest progress"); `recent` belum dipakai mobile (**B-10**) |
| Search nama **dan** deskripsi (`projects.query.ts:48`) | `q` = `ilike` **nama saja** (`project-list.query.ts:129`), maks 100 huruf (`app-projects.ts:12`) | **GAP A-6** |
| Reset → `BASE_QUERY` (`projects.query.ts:21`) | hapus parameter | — |

Nama parameter yang dipakai web ada di `app/lib/projects-filters.ts:10` (`lingkup`, `status`, `urut`, `q`,
`perhatian`, `hal`) — itu parameter **URL halaman web**, bukan API; API memakai `scope/status/sort/q/perhatian/page`.

### 1.3 Detail — header (semua tab) — `app/(tabs)/projects/[id]/index.tsx` → `detail/project-detail.screen.tsx:39`

Endpoint: **`GET /api/app/projects/:id`** (`server/api/app-projects.ts:53`) → `ProjectDetail`
(`project.dto.ts:61`) = `ProjectListItem` + `description`, `originalDueDate`, `taskCounts`, `can`, `extensionCount`,
`lastExtension`, `conditionOverride`. Id yang tidak ada, di Sampah, atau tidak boleh dilihat → **404 yang sama**
(`project.query.ts:32`, D8).

| Bidang mobile (`ProjectHeader`, `projects.ts:99`) | DTO server | GAP |
|---|---|---|
| `id`, `name`, `status`, `lead` | sama (lihat 1.1) | — |
| `health`, `why` | `condition.level`, `condition.reason` | A-5, A-8 |
| `dueLong: 'Oct 31, 2026'` (`projects.dates.ts:7`) | `dueDate` | turunan klien |
| `extended: 'Extended ×1'` (`sample/projects.extra.ts:22`) | `extensionCount: number` (`project.dto.ts:49`) | turunan klien (label "Extended ×N") |
| `archived: boolean` (`isArchivedProject`, `projects.state.ts:98`) | **tidak ada bidang eksplisit**; proyek di Sampah tetap bisa dibuka (`access/project.policy.ts:37`) dan terbaca dari `can.update === 'PROJECT_IN_TRASH'` (`:59`) | lihat §3; **A-15** (bentuk "di Archive" harus dibaca dari `can`, bukan bidang sendiri) |
| `canEdit: role !== 'member' && !archived` (`projects.ts:125`) | **diganti seluruhnya oleh `can{}`** (`project.dto.ts:66`) | lihat §3 — aturan izin versi mobile wajib dibuang |
| — | `description`, `originalDueDate`, `taskCounts`, `conditionOverride`, `lastExtension` | **GAP B-5, B-6, B-7, B-8** |

### 1.4 Tab Overview — `detail/overview.tab.tsx`, data `projects.detail.ts:66`

Butuh **tiga** panggilan (mobile kini satu getter lokal):
`GET /api/app/projects/:id` + **`GET /api/app/projects/:id/plan`** (`app-projects.plan.ts:80` → `ProjectPlan`,
`project-plan.query.ts:24`) + **`GET /api/app/projects/:id/activity?limit&cursor`** (`app-projects.deadline.ts:122`).

| Bidang mobile | DTO server | GAP |
|---|---|---|
| `progress` (% tugas selesai) | `progress.percent` | — |
| `elapsed` (% waktu terpakai, `projects.detail.ts:71`) | hitung dari `startDate`, `dueDate`, `today` | turunan klien; butuh `today` server (§4) |
| `timeLine: 'Start Sep 1 · due Oct 31 · 24 days left'` (`:80`) | `startDate` + `dueDate` + `today` | turunan klien (`daysLeftLabel`, `projects.dates.ts:25`) |
| `steps[]` = `{ name, state }` per fase (`:83`) | `plan.phases[].{ name, status }` (`project-plan.dto.ts:12`) | — ; `state: 'Done'\|'In progress'\|'Not started'` → `done\|in_progress\|not_started` |
| `now: 'Now: Development · 60%'` (`:84`) | `plan.currentPhase` (`project-plan.query.ts:97`) + `taskCount`/`doneCount` fase itu | **A-11**: `phasePct` di sampel adalah angka tulis tangan (`sample/projects.extra.ts:72`); server tidak punya "persen fase", jadi persen harus didefinisikan ulang sebagai `doneCount/taskCount` — **definisinya berbeda**, bukan hanya formatnya |
| `milestone: { name: '◆ Next milestone: Beta release', line: 'Oct 20, 2026 · in 13 days' }` (`:86`) | `plan.nextMilestone` (`project-plan.query.ts:92`) → `{ title, dueDate, reachedAt }` (`project-plan.dto.ts:28`) | — ; `name` ← `title`, "in N days" dari `today` |
| `attention[]` = baris tugas Overdue / Awaiting review / Due today (`projects.detail.ts:23,44`) | **tidak ada endpoint ringkas**; detail hanya memberi angka `taskCounts.{active,overdue,live}` (`project.dto.ts:65`) | **GAP A-7** → `GET /api/app/tasks?scope=project&projectId=<id>&due=overdue` dan `&due=today`, plus `&status=in_review` (`app-tasks.schema.ts:29`; nilai `due` = `SCHEDULE_GROUPS`, `server/metrics/schedule.ts:14`), lalu digabung + diurutkan di klien sesuai `ORDER` (`projects.detail.ts:41`) |
| `activity[]` = `{ text, on }` (`:92`) | `activity.items[]` = `ActivityItemDto` `{ id, action, text, actorId, actorName, createdAt }` (`project-activity.dto.ts:9`) | **GAP A-8**: `text` dirakit **di server dalam Bahasa Indonesia** (`:157`), dan `payload` mentah tidak dikirim, jadi versi Inggris tidak bisa dibuat di klien |

### 1.5 Tab Tasks — `detail/tasks.tab.tsx`, data `projects.detail.ts:112`

Endpoint: **`GET /api/app/tasks?scope=project&projectId=<id>&q=&status=&assigneeId=&priority=&due=&sort=&cursor=&limit=`**
(`server/api/app-tasks.ts:27`; `scope=project` tanpa `projectId` = 422, `:31`). Jawaban `{ items, nextCursor, caps }`
(`:56`); `caps.createTask` adalah kapabilitas **proyek itu** (`server/task/task.query.ts:62`).

Pemetaan isi kartu tugas adalah wilayah worker modul Tasks; di sini hanya yang milik tab proyek:

| Bidang mobile | Server | GAP |
|---|---|---|
| `view: 'list'\|'board'` + `rows[].action` per status (`ACTIONS`, `projects.detail.ts:104`) | aksi per tugas ada di `items[].can` + `items[].primary` (dibangun `access/capabilities.ts:147`) | aturan "To do → Start working, In progress → Request review, In review → Review" wajib **dibaca dari `can`/`primary`**, bukan dari status (lihat §3) |
| `count: '5 tasks'` (`:136`) | panjang halaman saja; **tidak ada total** pada daftar keyset | **A-13** → pakai `GET /api/app/tasks/counts` (`app-tasks.ts:60`) atau `taskCounts.active` dari detail proyek (definisi beda: aktif ≠ semua) |
| `empty`/`filtered` + Reset | turunan klien | — |
| `+ New task` muncul bila `!archived` (`tasks.tab.tsx:57`) | `caps.createTask` / `can.createTask` | §3 |
| filter Assignee di dalam proyek (`task-filter`) | `assigneeId` + daftar orang dari `GET /api/app/team/picker?projectId=<id>` (`app-team.picker.ts:20`) | — |
| pilihan **task type** di form New task dalam proyek | web memakai `loadTaskKinds` lewat loader SSR (`app/routes/app/task-edit.tsx:8`, fungsi di `server/task/task-form.query.ts:29`); **tidak ada route `/api/app` untuk task kind** | **GAP A-12** |

### 1.6 Tab Phases — `detail/phases.tab.tsx`, data `projects.detail.ts:149`

Endpoint: `GET /api/app/projects/:id/plan` (fase + milestone sekaligus) dan
**`GET /api/app/projects/:id/extensions?limit`** (`app-projects.deadline.ts:69` → `{ items, count, total, limit }`).

| Bidang mobile | DTO server | GAP |
|---|---|---|
| `count: '4 phases'` | `plan.phases.length` (dibatasi 20/proyek, `project.limits.ts:24`) | — |
| `cards[].name` | `phases[].name` | — |
| `cards[].mark` (`'✓'` atau nomor urut) | `status === 'done'` + urutan tampil (`position`, `project-plan.dto.ts:17`) | turunan klien |
| `cards[].range: 'Sep 25–Oct 20'` (`projects.dates.ts:17`) | `startDate`, `endDate` — **keduanya nullable** | turunan klien; mobile mengasumsikan non-null (**A-15**) |
| `cards[].state` | `status` | — |
| `cards[].pct` | `taskCount`/`doneCount` per fase (`project-plan.dto.ts:24`) | lihat A-11 |
| `cards[].milestone.{name,line}` | `plan.milestones[]` yang `phaseId` = fase itu (`project-plan.dto.ts:30`), `reachedAt` | turunan klien ("Reached …" / "… · Waiting") |
| `cards[].button` (`Complete phase` / `Start phase`, `projects.detail.ts:141`) | `PATCH /api/app/projects/:id/phases/:phaseId` dengan `{ status: 'done' \| 'in_progress' }` (`app-projects.plan.ts:101`) | — ; sekarang mobile hanya menampilkan notice |
| `history.{original,change,reason,by}` (`:178`, satu catatan) | `lastExtension` di detail, atau daftar `extensions.items[]` = `DeadlineExtensionDto` `{ oldDueDate, newDueDate, reasonCategory, reason, extendedBy, extendedByName, createdAt }` (`project-plan.dto.ts:58`) | **A-14**: pemetaan **menyilang** — `reason` mobile ("Scope grew") = label dari `reasonCategory`, `note` mobile (`'"Add SSO login"'`) = `reason` server. Label Inggris untuk empat kategori belum ada (server hanya punya Indonesia: `app/components/projects/summary/summary.copy.ts:5`) |
| `+ Phase` / `+ Milestone` (canEdit) | `POST /:id/phases` (`app-projects.plan.ts:87`), `POST /:id/milestones` (`:115`) | mobile belum punya formnya (**B-14**) |

### 1.7 Tab Members — `detail/members.tab.tsx`, data `projects.detail.ts:193`

Endpoint: **`GET /api/app/projects/:id/members`** → `{ items: ProjectMemberItem[] }`
(`app-projects.members.ts:36`; urutan: manager dulu, lalu nama, `project.query.ts:94`).

| Bidang mobile | DTO server (`project.dto.ts:69`) | GAP |
|---|---|---|
| `name` (nama depan) | `name` (display name penuh) + `userId` | copy berubah; identitas jadi `userId` |
| `full` | `name` | — |
| `sub: 'UI Designer · Product'` (`projects.detail.ts:205`, title · division) | hanya `jobTitle`; **`department` tidak dikirim** (ada di tabel `server/db/schema.profile.ts:26` dan di `TeamPersonProfile`, `server/team/team.dto.ts:76`) | **GAP A-9** |
| `role: 'Manager'\|'Member'\|'Viewer'` | `role: manager\|member\|viewer` | — |
| `you` | `userId === sesi saya` | turunan klien |
| `lead` | `isLead` (`project.query.ts:101`) | — |
| `count: '4 members'` | `items.length` (tanpa paginasi) | — |
| `onlyManager` (catatan Lead, `projects.detail.ts:212`) | hitung dari `items`: satu `role === 'manager'` dan dia `isLead` | turunan klien |
| — | `image` (foto), `joinedAt` | **GAP B-11** |
| Ubah role (T2) | `PATCH /:id/members/:userId` `{ role }` (`app-projects.members.ts:51`) | — |
| Remove (T2) | `DELETE /:id/members/:userId` (`:62`) | — |
| `+ Member` | `POST /:id/members` `{ userId, role }` (`:45`) + kandidat dari `GET /api/app/team/picker?projectId=` | — |

Penolakan per-anggota (`LAST_MANAGER`, `IS_LEAD`, `NO_SELF_LEAVE`, `ALREADY_MEMBER`, `BAD_CANDIDATE`) hanya diketahui
**setelah** panggilan dan teksnya Bahasa Indonesia (`server/project/member.service.ts:29`). Mobile sekarang memeriksa
sendiri di store (`projects.store.ts:99,109`) — itu harus diganti menampilkan `error` dari respons.

### 1.8 Extend deadline — `app/(tabs)/projects/[id]/extend.tsx` → `sheets/extend.screen.tsx`, data `projects.ts:142`

Endpoint: **`POST /api/app/projects/:id/extend-deadline`** `{ newDueDate, reasonCategory, reason }`
(`app-projects.deadline.ts:60`; 201 + baris riwayat).

| Bidang mobile | Server | GAP |
|---|---|---|
| `name`, `current`, `currentLabel` | `name`, `dueDate` dari detail | — |
| `next` (tanggal usulan terisi) | — | sampel prototipe; isian kosong setelah API (bukan GAP data) |
| `reason` (quick pick + teks) | `reasonCategory` (enum 4 nilai) + `reason` (wajib, ≤500, `project.limits.ts:32`) | quick pick → `reasonCategory`; label Inggris lihat A-14 |
| `impact: '3 tasks and 1 milestone go past the old deadline.'` (`sample/projects.extra.ts:108`) | **tidak ada endpoint pratinjau dampak** | **GAP A-10** → hitung klien dari `plan.milestones` (dueDate > tenggat lama) + `GET /api/app/tasks?scope=project&projectId=` (dueDate > tenggat lama) |
| "Recorded in Deadline history and Project activity." | benar: menulis `project_deadline_extension` + `project_activity` | — |

### 1.9 Edit project — `app/(tabs)/projects/[id]/edit.tsx` → `edit/project-edit.screen.tsx`, data `projects.ts:130`

Satu tombol **Save changes** mobile (`projects.store.ts:80`) menjadi **sampai tiga panggilan**, karena server memisah
rute:

| Isian mobile (`ProjectFields`, `projects.store.ts:39`) | Endpoint server | GAP |
|---|---|---|
| `name` (≤120, `project.limits.ts:8`), `desc`, `priority`, `due`, `started` | `PATCH /api/app/projects/:id` `{ name?, description?, priority?, startDate?, dueDate? }` (`app-projects.write.ts:86`, body `:52`) | — |
| `status` (`Draft/Active/On hold/Done/Canceled`) | **`POST /api/app/projects/:id/status`** `{ status }` (`:93`) — `status` adalah **unknown key** di `PATCH` (`:51`) | bukan GAP data, tapi urutan panggilan dan nasib panggilan kedua yang gagal adalah keputusan baru (§6) |
| `lead` (hanya Manager proyek, `projects.ts:134`) | **`PUT /api/app/projects/:id/lead`** `{ userId }` (`:100`); kandidat = `items[].role === 'manager'` dari daftar anggota | sama seperti di atas (§6) |
| validasi "A project with this name already exists." (`projects.state.ts:85`) | tidak ada constraint unik (`schema.project.ts:27`) | aturan ini **dibuang** setelah API (lihat §0 poin 1) |
| `renameProjectTasks` setelah rename (`projects.store.ts:92`) | tidak perlu: tugas menunjuk `projectId` | kode ini dibuang |

### 1.10 Move to Archive — `app/(tabs)/projects/[id]/archive.tsx` → `sheets/archive.screen.tsx`, data `projects.ts:157`

Mobile: Archive lokal + snack Undo (`archiveProject`, `projects.store.ts:115`; `restoreProject` `:144`).
Server: **Sampah 30 hari** — **`DELETE /api/app/projects/:id`** → `{ id, tasks }` (`app-projects.trash.ts:14`), pulih
lewat **`POST /api/app/trash/project/:id/restore`** → `{ id, tasks }` (`server/api/app-trash.ts:45`), daftar Sampah
`GET /api/app/trash?kind=project` (`:29`). Tidak ada "hapus permanen" manual; purge adalah job terjadwal (`app-trash.ts:5`).

| Bidang mobile | Server | GAP |
|---|---|---|
| `name` | `name` dari detail | — |
| `tasks: '5 tasks'` (`taskCountOf`, `projects.store.ts:73`) | `taskCounts.live` di detail (termasuk tugas yang dibatalkan — tepat yang ikut pindah, `project.dto.ts:64`) | — |
| snack Undo 10 detik (`METRICS.UNDO_WINDOW_SECONDS = 10`, `server/metrics/config.ts:12`) | Undo = panggil restore; angka 10 dan retensi 30 hari (`:9`) **tidak dikirim ke klien** | **A-15** (hardcode klien, atau minta dikirim) |
| "Archive" / "Restore brings the project back" | kosakata server = **Sampah** 30 hari | keputusan copy user (pertanyaan terbuka di `reacttransition.md:§7`) |
| `canRestoreProject(id, key)` lokal (`projects.store.ts:140`) | `access/project.policy.ts:86`: manager/Admin, **dalam masa retensi**, dan tidak sedang impersonate | aturan klien dibuang |

### 1.11 Create project — `app/projects/new/{index,form,story,draft,template}.tsx`, data `projects.ts:167`

Endpoint inti: **`POST /api/app/projects`** `{ name, description?, status?, priority?, leadId?, startDate?, dueDate?,
members?: [{ userId, role }], tasksNeedReviewDefault? }` (`app-projects.write.ts:78`, body `:32`) → 201 + `ProjectDetail`.
Hanya `draft` dan `active` boleh jadi status awal (`project.limits.ts:15`); maks 50 anggota (`:12`);
`tasksNeedReviewDefault: true` ditolak selama review belum rilis (`project.service.ts:116`).

| Langkah / bidang mobile | Server | GAP |
|---|---|---|
| Form: name, description, start, end, priority, initial status, Lead, members & roles | `POST /api/app/projects` (satu panggilan) | — ; `members` butuh `userId` dari `GET /api/app/team/picker` |
| "Default task types created: Task, Bug, Idea" | benar: `DEFAULT_TASK_KINDS` (`server/pm/limits.ts:8`) — tapi **Indonesia**: `Tugas, Bug, Ide` | copy |
| Story → **Build draft ✦** (fase + milestone + tugas dari cerita) | **tidak ada endpoint AI**, dan tidak ada endpoint "buat proyek + rencana sekaligus" | **GAP A-16** → setelah `POST /projects`, rencana harus dibuat berurutan: `POST /:id/phases` × n, `POST /:id/milestones` × n, `POST /api/app/tasks` × n (tanpa transaksi; separuh jalan gagal = proyek setengah jadi) |
| Template + "Also save as template" (`PROJECT_TEMPLATES`, `sample/projects.extra.ts:198`) | **tidak ada tabel maupun endpoint template** | bagian dari **GAP A-16** → layar Template disembunyikan di Fase 2, atau perubahan server |
| `creator`, `helpers`, `today` (`projects.ts:172`) | sesi + `GET /api/app/home` (`now.today`, §4) | — |
| `templateDates(start, days)` (`projects.ts:196`) | turunan klien | — |
| setelah sukses: `router.push('/projects/atlas')` (`new/create-done.ts`) | id proyek baru datang dari 201 `detail.id` | perbaikan alami |
| izin membuka `/projects/new` (Member → Redirect) | `canCreateProject` = PM/Admin/Super-admin (`access/project.policy.ts:42`), tapi **tidak ada kapabilitas di jawaban daftar proyek** (bandingkan daftar event yang mengirim `caps.createEvent`, `server/api/app-events.ts:60`) | **GAP A-17** (lihat §3) |

### 1.12 Project settings (task types) — `app/(tabs)/projects/[id]/settings.tsx`

Mobile memakai layar TasksSettings W1 (`settings/project-tasks-routes.tsx`). Server: `can.manageKinds` ada
(`access/capabilities.ts:85`) tetapi **tidak ada route `/api/app` untuk task kind** — web pun hanya membacanya lewat
loader (`server/task/task-form.query.ts:29`). Halaman web `/app/project/:id/settings`
(`app/routes/app/project/settings.tsx`) isinya **Edit project**, bukan task type. → **GAP A-12**.

---

## 2. GAP dua arah

### (a) Ditampilkan layar mobile, tidak dikirim API

Kolom **Usulan**: `klien` = dihitung di perangkat, `endpoint lain` = ambil dari route `/api/app/*` yang sudah ada,
`server` = butuh perubahan di `server/` (**tidak dikerjakan di sini, hanya dilaporkan**).

| # | Yang hilang | Di mana mobile memakainya | Usulan | Kalau butuh server: apa yang kurang |
|---|---|---|---|---|
| A-1 | Daftar anggota per proyek di **daftar** | Avatar stack + "4 members" di kartu (`list/project-card.tsx:47`, `projects.ts:75`) | **server** | `ProjectListItem` (`server/project/project.dto.ts:29`) tidak punya anggota; tambah `memberCount: number` dan/atau `members: { id, name, image }[]` (potong, mis. 4 teratas). Tanpa itu satu-satunya jalan adalah `GET /api/app/team?projectId=` per kartu = N+1 (dilarang aturan 13) |
| A-2 | Filter "proyek milik siapa" | People row + param `who`, chip My projects, `whoLine` (`projects.ts:88,91`, `projects.people.ts:10`) | **server** | Daftar hanya punya `scope=mine\|all` (`server/api/app-projects.ts:16`). Tambah `anggota=<userId>` (filter `project_member`). Jalan tanpa server: `GET /api/app/team` memberi tiap orang `projects[]` (`server/team/team.dto.ts:55`) → chip bisa dibangun dan halaman yang sudah dimuat bisa difilter di klien, tetapi hasilnya salah begitu ada halaman kedua (§5) |
| A-3 | Filter Health per tingkat | Opsi `Needs attention / Overdue / On track` (`projects.query.ts:7`, dicocokkan substring `:40`) | **server** | Hanya ada `perhatian=1` yang menggabung `at_risk` + `off_track` (`server/project/project-list.query.ts:27`). Tambah `kondisi=<on_track\|at_risk\|off_track>`. Kondisi dihitung di kode, bukan kolom, jadi filternya akan memakai jalur pindai seperti `perhatian` (`project-list.query.ts:139`) |
| A-4 | Urutan "Lowest progress" | Sort ke-2 (`projects.query.ts:9,31`) | **server** | `PROJECT_SORTS = due\|name\|recent` (`project-list.query.ts:23`); progress dihitung dari tugas (`project.dto.ts:106`), bukan kolom. Pilihan: tambah sort yang memakai jalur pindai, atau ganti opsi mobile menjadi "Recently updated" (`recent`, sudah ada) |
| A-5 | Health `'✓ Done'`, `'No tasks yet'` | Baris health kartu & header (`sample/projects.extra.ts:28,29`) | **klien** | `condition` null untuk status selain `active` (`server/metrics/condition.ts:72`), jadi: `status === 'completed'` → "✓ Done", `progress.total === 0` → "No tasks yet", `status` lain tanpa condition → status saja |
| A-6 | Pencarian pada deskripsi; `description` di item daftar | `searchProjects` mencari `name` + `desc` (`projects.query.ts:48`) | **server** | `q` memakai `ilike` pada nama saja (`project-list.query.ts:129`) dan `description` hanya ada di detail (`project.dto.ts:62`). Tambah `description` ke pencarian (dan/atau ke item daftar). Alternatif tanpa server: terima pencarian nama saja dan ubah placeholder "Search project name or description…" |
| A-7 | Baris **Tasks needing attention** | Overview (`projects.detail.ts:44`) | **endpoint lain** | `GET /api/app/tasks?scope=project&projectId=<id>&due=overdue`, `&due=today`, `&status=in_review` (`server/api/app-tasks.schema.ts:29`), gabung + urutkan Overdue → Awaiting review → Due today di klien. Detail proyek hanya memberi angka (`taskCounts`, `project.dto.ts:65`) |
| A-8 | Teks berbahasa **Inggris** untuk alasan kondisi dan aktivitas | `health · why` di kartu/header; Recent activity (`projects.detail.ts:92`) | **server** | `condition.reason` dirakit server dalam Bahasa Indonesia (`server/metrics/condition.ts:100`) dan `ActivityItemDto.text` juga (`project-activity.dto.ts:157`); `payload` mentah **tidak** dikirim (`:9`), jadi klien tidak bisa merakit versi Inggris. Yang kurang: kirim bentuk terstruktur (mis. `reasonCodes: [{ code, count }]` dan `payload`) atau sepakati mobile memakai Bahasa Indonesia untuk dua teks ini |
| A-9 | `department` anggota | `sub: 'UI Designer · Product'` (`projects.detail.ts:205`) | **server** | `ProjectMemberItem` hanya `jobTitle` (`project.dto.ts:69`); kolomnya ada (`server/db/schema.profile.ts:26`) dan sudah dikirim di tempat lain (`server/team/team.dto.ts:76`). Tambah `department: string \| null`. Alternatif: tampilkan `jobTitle` saja (`GET /api/app/team/:userId` per anggota = N+1) |
| A-10 | "Impact of change" di Extend deadline | Sheet Extend (`sample/projects.extra.ts:108`) | **endpoint lain** | Hitung klien: `GET /:id/plan` → milestone dengan `dueDate > tenggat lama`; `GET /api/app/tasks?scope=project&projectId=` → tugas dengan `dueDate > tenggat lama`. Bila mau satu panggilan, butuh endpoint pratinjau di server |
| A-11 | Persen fase berjalan | `now: 'Now: Development · 60%'`, `cards[].pct` (`projects.detail.ts:84,159`) | **klien (definisi baru)** | Server tidak punya "persen fase"; yang ada `taskCount`/`doneCount` per fase (`project-plan.dto.ts:24`). Persen jadi `doneCount/taskCount` — **angkanya tidak akan sama** dengan sampel (60% ditulis tangan di `sample/projects.extra.ts:72`); perlu diterima sebagai perubahan nilai |
| A-12 | Daftar **task type** proyek | Project settings (`settings/project-tasks-routes.tsx`) dan pilihan type di form New task dalam proyek | **server** | Tidak ada route `/api/app` untuk task kind; web membacanya lewat loader SSR (`server/task/task-form.query.ts:29`, dipakai `app/routes/app/task-edit.tsx:8`). Yang kurang: `GET /api/app/projects/:id/kinds` (dan tulis, bila Project settings mau benar-benar jalan — `can.manageKinds` sudah ada, `server/access/capabilities.ts:85`) |
| A-13 | Jumlah tugas tab Tasks ("5 tasks") | `count` (`projects.detail.ts:136`) | **endpoint lain** | Daftar tugas keyset tidak mengirim total (`server/api/app-tasks.ts:56`). Pakai `GET /api/app/tasks/counts` (`:60`) atau `taskCounts.active` dari detail proyek — perhatikan definisinya beda (aktif ≠ semua tugas) |
| A-14 | Label Inggris kategori perpanjangan + pemetaan silang | Deadline history (`projects.detail.ts:178`) | **klien** | `reason` mobile ("Scope grew") = label `reasonCategory`; `note` mobile = `reason` server. Peta label hanya ada dalam Bahasa Indonesia (`app/components/projects/summary/summary.copy.ts:5`), jadi mobile menulis peta Inggrisnya sendiri untuk empat nilai (`server/pm/enums.ts:25`) |
| A-15 | Angka dan penanda kecil yang tidak dikirim | Jendela Undo 10 detik; "This project is in Archive."; rentang fase yang tanggalnya kosong; `dueDate` kosong | **klien** | `UNDO_WINDOW_SECONDS`/`TRASH_RETENTION_DAYS` ada di server saja (`server/metrics/config.ts:9,12`) → hardcode di mobile atau minta dikirim. Status "di Sampah" dibaca dari `can.update === 'PROJECT_IN_TRASH'` (`server/access/project.policy.ts:59`), bukan bidang `archived`. `startDate`/`endDate`/`dueDate` **nullable** di server sedangkan mobile mengasumsikan terisi |
| A-16 | Draft "AI" dari cerita + template proyek | Story → Draft (`sample/projects.extra.ts:138`), Template (`:198`), "Also save as template" | **server / tunda** | Tidak ada endpoint AI, tidak ada endpoint "proyek + rencana sekaligus", tidak ada tabel/endpoint template. Tanpa perubahan server: Fase 2 hanya memakai jalur **Form** (satu `POST /api/app/projects`), lalu rencana dibuat berurutan `POST /:id/phases`, `POST /:id/milestones`, `POST /api/app/tasks` tanpa transaksi; layar Story/Draft/Template disembunyikan sampai diputuskan |
| A-17 | Kapabilitas "boleh membuat proyek" | FAB + gerbang route `/projects/new` (Member → Redirect, `phase1-screens.projects.md:25`) | **server** | Jawaban daftar proyek tidak membawa kapabilitas (`server/api/app-projects.ts:48`), padahal daftar event membawa `caps.createEvent` (`server/api/app-events.ts:60`) dan daftar tugas membawa `caps.createTask` (`server/api/app-tasks.ts:56`). Yang kurang: `caps: { createProject }` pada `GET /api/app/projects`. Tanpa itu mobile harus menebak dari role (dilarang §3) atau mengirim `POST` lalu membaca 403 |
| A-18 | Kapabilitas "boleh memperpanjang tenggat" | Tombol **Extend deadline** di header (`detail/detail-header.tsx`) | **klien (proksi)** | `PROJECT_CAP_KEYS` tidak punya kunci untuk ini (`server/access/capabilities.ts:85`), tetapi servernya memakai `canManageProject` (`server/project/project-deadline.guard.ts:53`) — kunci yang sama dengan `can.update`. Jadi `can.update` adalah proksi yang **tepat hari ini**; kunci sendiri (`extendDeadline`) lebih aman bila aturannya berubah. **Belum dipastikan** apakah tim server mau menambah kunci |

### (b) Dikirim API, mobile belum memakainya

| # | Bidang / kemampuan | Di mana | Yang bisa jadi lebih baik |
|---|---|---|---|
| B-1 | `priority` (daftar **dan** detail) | `project.dto.ts:33` | Prototipe hanya memakai priority di form Edit; kartu bisa menampilkannya |
| B-2 | `startDate` untuk **semua** proyek | `project.dto.ts:36` | Mobile hanya punya `started` untuk Atlas (`sample/projects.extra.ts:23`), jadi "Time elapsed" dan "Start X" bisa tampil untuk semua proyek |
| B-3 | `progress.done` / `progress.total` | `project.dto.ts:25` | Bisa "7/10 tugas selesai", bukan hanya persen; juga dasar A-5 |
| B-4 | `myRole` (peran saya **di proyek itu**) | `project.dto.ts:41` | Mobile memakai role akun global (`SESSION_ROLE`); `myRole` membuat "(You) Manager/Member/Viewer" benar per proyek |
| B-5 | `taskCounts.{active,overdue,live}` | `project.dto.ts:65` | Mobile menghitung sendiri dari store tugas; `live` adalah angka yang tepat untuk dialog hapus |
| B-6 | `originalDueDate` | `project.dto.ts:63` | Tenggat asli tanpa perlu membaca riwayat |
| B-7 | `conditionOverride` (kondisi manual, alasan, siapa, kedaluwarsa) | `project.dto.ts:52`, `project-plan.dto.ts:72` | Tidak ada padanannya di mobile sama sekali — UI baru (badge "diatur manual" + alasan manajer) |
| B-8 | `lastExtension` di detail, `extensions.count/total` | `project.dto.ts:50`, `server/api/app-projects.deadline.ts:76` | Riwayat terakhir tanpa panggilan kedua; "Extended ×N" dari `extensionCount` |
| B-9 | `plan` pada daftar (`rencana=1`) | `project.dto.ts:43`, `project-plan.dto.ts:56` | Bahan tampilan timeline/Gantt; mobile belum punya tampilan itu |
| B-10 | `sort=recent` | `project-list.query.ts:23` | Opsi urut "Terbaru" yang mobile belum tawarkan |
| B-11 | Anggota: `image`, `joinedAt` | `project.dto.ts:72,76` | Avatar foto (kini hanya inisial) dan "bergabung sejak" |
| B-12 | `can.createTask`, `can.manageKinds` | `access/capabilities.ts:85` | Mobile memakai satu `canEdit` untuk semuanya (§3) |
| B-13 | Aktivitas: `action`, `actorId`, `actorName`, `createdAt`, `nextCursor` | `project-activity.dto.ts:9`, `project-activity.query.ts:18` | Ikon per jenis aksi, nama pelaku, dan riwayat lebih panjang dari 4 baris sampel |
| B-14 | Tulis rencana: urut ulang fase, hapus fase/milestone, reach/unreach milestone | `server/api/app-projects.plan.ts:94,108,129,136,143` | Mobile hanya punya tombol notice Start/Complete phase dan "+ Phase"/"+ Milestone" tanpa form |
| B-15 | Fase: `position`, `description`, `startedAt`, `finishedAt`, `taskCount`, `doneCount`; milestone: `description`, `phaseId` | `project-plan.dto.ts:12,28` | Kartu fase lebih kaya; milestone bisa dikelompokkan ke fasenya |
| B-16 | Sampah nyata: `GET /api/app/trash?kind=project` + `counts` | `server/api/app-trash.ts:29` | Mobile Archive memakai store lokal (`archive.store.ts`); daftar Sampah server bisa menggantinya |
| B-17 | `scope=all` untuk Admin/PM | `server/api/app-projects.ts:16`, clamp di `access/project.policy.ts:123` | Mobile memfilter sendiri per role (`projects.ts:63`); dengan `scope` pilihan "Semua / Punya saya" bisa jadi kontrol nyata |

---

## 3. Izin (`can{}`)

Aturan: **mobile membaca `can{}`, mobile tidak membuat aturan izin sendiri.** Semua pemeriksaan role yang sekarang ada
di mobile (`canEdit = role !== 'member' && !archived`, `projects.ts:125`; `canEdit = role !== 'member'`,
`projects.detail.ts:120`; penjagaan Lead dan anggota terakhir di `projects.store.ts:99,109,140`) **dibuang**.

Bentuk nilai (`server/access/capabilities.ts:61`): `true` = tampil dan aktif; **kode deny** = tampil tapi mati, dengan
alasan dari `capMessage(code)` (`:136`); **kunci tidak ada** = kontrolnya **disembunyikan**. Jangan menganggap "kunci
tidak ada" sama dengan "false yang bisa diklik".

Kunci yang dikirim untuk proyek — `PROJECT_CAP_KEYS = ['update', 'trash', 'createTask', 'manageKinds']`
(`server/access/capabilities.ts:85`, dibangun di `:177`):

| Kunci `can` | Kontrol mobile yang harus mematuhinya | Catatan |
|---|---|---|
| `update` | ⋯ **Edit project** (`detail-header.tsx` `projectMenu`); **Extend deadline** di header; tab Phases: **+ Phase**, **+ Milestone**, **Complete phase**, **Start phase**; tab Members: **+ Member**, select Role, **Remove** | Server memakai `canManageProject` untuk semuanya (`access/project.policy.ts:50`, `project-deadline.guard.ts:53`, `member.service.ts` lewat `lockProject`+policy). Kode deny yang mungkin: `NOT_MANAGER`, `PROJECT_IN_TRASH` (`project.policy.ts:58,59`) |
| `trash` | ⋯ **Move to Archive** (danger) → sheet archive | `canTrashProject` (`project.policy.ts:68`): butuh manage **dan** PM/Admin ke atas, dan ditolak saat impersonate (`IMPERSONATING`). Jadi "Member-Pengelola" bisa `update` tanpa `trash` — mobile sekarang tidak bisa membedakan ini |
| `createTask` | tab Tasks: **+ New task** (kini `!archived`, `tasks.tab.tsx:57`) | Juga datang pada jawaban daftar tugas sebagai `caps.createTask` (`server/task/task.query.ts:62`), jadi tab Tasks tidak perlu panggilan tambahan |
| `manageKinds` | ⋯ **Project settings** (task types) | Kunci ada, endpointnya belum (A-12) |

Yang **tidak** ada kuncinya:

- **Buat proyek** (FAB Projects + gerbang `/projects/new`) → **A-17**. Sumbernya `canCreateProject`
  (`access/project.policy.ts:42`) lewat `appCaps` (`capabilities.ts:212`), tapi `appCaps` tidak dikirim oleh route
  mana pun yang dipakai modul ini.
- **Extend deadline** → **A-18**; pakai `can.update` sebagai proksi (sama kebijakannya hari ini).
- **Restore dari Sampah** → `canRestoreProject` (`project.policy.ts:86`) sengaja di luar `can{}` karena butuh `now`
  (komentar `capabilities.ts:88`); layar Sampah (S6) yang menyediakannya. Tombol **Undo** setelah hapus tetap boleh
  ditampilkan, lalu `POST /api/app/trash/project/:id/restore` yang menentukan hasil akhirnya.
- **Aturan per-anggota** (anggota manager terakhir, Lead, keluarkan diri sendiri) tidak ada di `can{}`: itu hasil
  pemeriksaan saat menulis (`server/project/member.service.ts:29`). Mobile menampilkan pesan dari respons, bukan
  menebak lebih dulu.

Proyek yang tidak boleh dilihat → **404 yang sama** dengan proyek yang tidak ada (`project.query.ts:32`), jadi layar
"Project not found" mobile (`project-detail.screen.tsx:40`) tetap benar, tanpa membedakan "tidak ada" dan "bukan
anggota".

---

## 4. Tanggal dan zona waktu

Aturan project: **"hari ini" ditentukan server; jangan `new Date()` di klien.** Mobile sudah mematuhinya dengan
konstanta `TODAY = '2026-10-07'` (`mobile/src/data/sample/today.ts:5`) — jadi yang perlu diganti hanyalah **sumber**
konstanta itu, bukan cara layar memakainya.

**Dari mana `today` dan `timeZone` diambil setelah tersambung**

- Satu-satunya route `/api/app/*` yang mengirimkannya adalah **`GET /api/app/home`** → `now: HomeNow`
  `{ iso, today, timeZone, greeting, dateLabel, timeLabel }` (`server/home/home.dto.ts:15`, dirakit di
  `server/home/home.now.ts:31`). Zonanya zona tim, bukan zona perangkat: `TIME_ZONE = 'Asia/Jakarta'`
  (`server/metrics/config.ts:11`), dibaca per-request supaya pergantian hari tidak ikut ter-cache
  (`server/task/task.clock.ts:7`).
- Route proyek **tidak** mengirim `today`. Mereka memakainya di dalam (`new Date()` di handler →
  `isoDateIn(now, cfg.TIME_ZONE)`, `server/project/project.dto.ts:113,148`), lalu hasilnya sudah terkandung dalam
  `condition`, `taskCounts.overdue`, dan `progress`.
- Jadi: **ambil `now.today` + `now.timeZone` sekali dari `GET /api/app/home`** saat sesi mulai, simpan sebagai sumber
  "hari ini" untuk seluruh app (mengganti `TODAY`), dan segarkan saat app kembali ke depan (foreground) agar
  pergantian hari tidak membuat label basah. Nilai `now.iso` berguna untuk mengukur selisih jam perangkat vs server.
- Kalau nanti dirasa salah bergantung pada `/home` untuk hal sekecil ini, itu permintaan server yang kecil
  (`GET /api/app/whoami` sudah ada di `server/api/app.ts:44` dan bisa membawa `today`/`timeZone`) — **belum
  dipastikan**, jangan diasumsikan ada.

**Layar modul Proyek yang akan salah bila memakai jam perangkat**

| Layar | Yang salah |
|---|---|
| Overview — `timeLine` "N days left / Due today / N days overdue" (`projects.dates.ts:25`) | Pengguna di zona lain (atau jam perangkat yang salah) melihat jumlah hari berbeda dari server, dan "Due today" bisa bergeser sehari |
| Overview — `elapsed` ("Time elapsed %") | Dihitung dari `started → today`; salah hari = persen bergerak |
| Overview — `milestone.line` "in N days" (`projects.detail.ts:88`) | Sama; dan milestone yang sudah terlewat bisa tampak masih akan datang |
| Overview — **Tasks needing attention** (Overdue / Due today, `projects.detail.ts:34`) | Pengelompokan ulang di klien bisa berbeda dari `due=overdue\|today` milik server (`server/metrics/schedule.ts:14`) → **ambil pengelompokan dari server** (A-7), jangan hitung ulang |
| Daftar & header — `health`/`condition` | Dihitung **server** dengan `today` server (`metrics/condition.ts:76`); klien tidak boleh menghitung ulang |
| Create project / Template — tanggal awal dan "estimated end" (`projects.ts:172`, `templateDates` `:196`) | Tanggal default yang dibuat dari jam perangkat bisa jadi hari sebelumnya/berikutnya dibanding kalender tim |
| Extend deadline — perbandingan tenggat lama vs baru dan "Impact" (A-10) | Batas "lewat tenggat" ikut bergeser |
| Phases — `rangeLabel`, "Reached …" | Hanya format, tidak bergantung hari ini; aman |

Catatan tipe: semua tanggal kalender server adalah string `YYYY-MM-DD` (`date(..., { mode: 'string' })`,
`server/db/schema.project.ts:34`) dan semua instant adalah ISO UTC (`project-plan.dto.ts:116`). Mobile sudah bekerja
pada string ISO + UTC (`mobile/src/data/dates.ts`, `projects.dates.ts:1`), jadi tidak perlu pustaka zona waktu —
cukup jangan pernah membuat `Date` dari waktu lokal.

---

## 5. Paginasi dan muat ulang

Keadaan mobile sekarang: **seluruh data ada di memori**. `getProjectsList` memanggil `projectsFor` → `ofWho` →
`applyQuery` → `searchProjects` atas larik penuh (`mobile/src/data/projects.ts:85-87`), dan layar me-`map` semua kartu
di dalam `StackedScreen` (ScrollView), tanpa `FlatList` dan tanpa pemicu "muat lebih banyak"
(`list/projects.screen.tsx:66`). People row juga dihitung dari larik penuh (`projects.people.ts:16`).

| Daftar | Bentuk paginasi server | Default / batas | Mobile sekarang | Yang harus berubah |
|---|---|---|---|---|
| **Projects list** `GET /api/app/projects` | **Offset**: `page` + `limit`, jawaban `{ items, total, page, limit }` (`server/api/app-projects.ts:34-48`, skema `PageQuery` `server/api/app-common.ts:12`) | `limit` default 25, maks 100 (`server/pm/limits.ts:15`); web memakai 20 per halaman (`app/lib/projects-filters.ts:56`) | satu larik, tanpa batas | Butuh **"muat lebih banyak"** (atau infinite scroll seperti web, `app/routes/app/projects.tsx:8` `useInfiniteQuery`). Pindah ke `FlatList` + `onEndReached`. `total` dipakai untuk "N projects" dan untuk memutuskan ada halaman lagi |
| **Tasks di dalam proyek** `GET /api/app/tasks?scope=project` | **Keyset/cursor**: `cursor` + `limit`, jawaban `{ items, nextCursor, caps }` (`server/api/app-tasks.ts:56`, skema `CursorQuery` `app-common.ts:15`); cursor opaque, cursor rusak = **400 `BAD_CURSOR`** (`app-tasks.ts:51`) | `limit` default 25, maks 100 | `getProjectTasks` memakai seluruh store (`projects.detail.ts:119`), termasuk papan Kanban yang menyusun kolom dari semua tugas | Butuh "muat lebih banyak" di tampilan **List**. Untuk **Kanban** ini lebih berat: papan memerlukan tugas per kolom status, jadi perlu satu permintaan per kolom (`status=todo`, `in_progress`, …) dengan cursor masing-masing, atau batas "N teratas per kolom". **Keputusan terbuka untuk Tahap 3** |
| **Members** `GET /:id/members` | Tidak dipaginasi; satu daftar penuh (`project.query.ts:72`) | dibatasi praktis oleh `PROJECT_CREATE_MEMBERS_MAX = 50` saat membuat (`project.limits.ts:12`) | cocok | Tidak ada perubahan |
| **Phases & milestones** `GET /:id/plan` | Tidak dipaginasi; dikembalikan utuh karena dibatasi per proyek (`project-plan.query.ts:3`) | 20 fase, 60 milestone (`project.limits.ts:24,26`) | cocok | Tidak ada perubahan |
| **Deadline history** `GET /:id/extensions?limit` | Hanya `limit` + `total` (tanpa cursor) (`app-projects.deadline.ts:69`) | default 50 (`project-deadline.query.ts:23`), maks `PAGE_LIMIT_MAX` | satu catatan sampel | Tampilkan `limit` pertama + "lihat semua" bila `total > items.length` |
| **Recent activity** `GET /:id/activity?limit&cursor` | **Keyset**: `{ items, nextCursor }` (`project-activity.query.ts:18`); cursor dipalsukan = **422 VALIDATION** (`:61`) | default 20 (`:16`) | 4 baris sampel | "Muat lebih banyak" di Overview, atau layar aktivitas sendiri |
| **Sampah** `GET /api/app/trash?kind=project` | Offset + `counts` (`app-trash.ts:34`) | default 25 | store lokal | Bila Archive mobile diganti Sampah server (B-16) |

Akibat penting yang perlu disadari sebelum menukar: **filter dan urutan yang sekarang berjalan di klien harus pindah
ke server**, karena memfilter satu halaman bukan memfilter daftar. Yang terdampak: people row/`who` (A-2), filter
Health (A-3), sort "Lowest progress" (A-4), pencarian deskripsi (A-6), dan `whoLine · <jumlah>` yang harus memakai
`total`, bukan `cards.length`.

---

## 6. Urutan kerja yang disarankan (bahan dispatch Tahap 3)

Dari yang paling kecil risikonya. Setiap langkah bisa di-merge sendiri dan punya tes sendiri.

| # | Langkah | Mengapa risikonya rendah | Perkiraan berkas yang disentuh |
|---|---|---|---|
| 1 | **Tipe + pemeta DTO→tampilan, tanpa jaringan.** Tulis tipe `ProjectListItem`/`ProjectDetail`/`PhaseDto`/… versi mobile dan fungsi murni `toProjectCard`, `toProjectHeader`, label enum→Inggris (status, priority, condition, phase status, kategori perpanjangan), A-5, A-11, A-14. Diuji dengan fixture JSON. | Tidak ada layar yang berubah; semua bisa diuji unit | baru: `src/data/api/projects.types.ts`, `src/data/api/projects.map.ts`, `src/data/api/pm-labels.ts`; tes `__tests__/projects/projects.map.test.ts` |
| 2 | **Sumber "hari ini" dari server.** Satu titik `today`/`timeZone` (dari `GET /api/app/home`) yang menggantikan `TODAY`, dengan fallback aman sebelum data datang. | Hanya mengganti sumber satu konstanta; §4 | `src/data/sample/today.ts` (jadi fallback), baru `src/data/api/clock.ts`; pemakai: `projects.detail.ts`, `projects.ts`, `projects.dates.ts` (tanpa ubah logika) |
| 3 | **Daftar proyek, baca saja.** `GET /api/app/projects` + `FlatList` + muat lebih banyak + status/sort/`q` dikirim ke server. People row & filter Health sementara **disembunyikan** (A-2, A-3) sampai server siap. | Satu layar, read-only; membuktikan client + auth + paginasi | `src/data/projects.ts`, `src/screens/projects/list/projects.screen.tsx`, `list/project-card.tsx`, `filter/projects-filter.screen.tsx`, `src/data/projects.query.ts`; tes `projects.list.test.tsx`, `projects.query.test.ts` |
| 4 | **Header + tab Overview & Phases, baca saja**, dengan `can{}` menggantikan `canEdit` (§3) dan tombol-tombol masih non-aktif. | Read-only, tapi memindahkan model izin lebih dulu — sebelum ada tombol yang bisa salah tampil | `src/data/projects.detail.ts`, `screens/projects/detail/{project-detail.screen,detail-header,overview.tab,phases.tab}.tsx`; tes `projects.detail.test.tsx` |
| 5 | **Tab Members, baca saja** (`GET /:id/members`), avatar foto (B-11), `onlyManager` dari data. | Daftar kecil tanpa paginasi | `src/data/projects.detail.ts`, `detail/members.tab.tsx`, `src/components/avatar/*`; tes `projects.manage.test.tsx` |
| 6 | **Tulis yang paling aman: Edit project.** `PATCH` + (bila berubah) `POST /status` + `PUT /lead`, dengan urutan tetap, loading, pesan error dari respons, dan aturan nama-unik dibuang. | Satu form, hasilnya langsung terlihat; sudah menyentuh pola 3-panggilan | `src/data/projects.store.ts`, `edit/project-edit.screen.tsx`; tes `projects.store.test.ts`, `projects.manage.test.tsx` |
| 7 | **Tulis anggota** (tambah / ubah role / keluarkan) dengan T2 dan pesan server; buang penjagaan Lead/anggota-terakhir versi klien. | Pola error server→UI sudah ada dari langkah 6 | `src/data/projects.store.ts`, `detail/members.tab.tsx`, `src/components/confirm/*`; tes `projects.manage.test.tsx` |
| 8 | **Tab Tasks (List)** dengan cursor + muat lebih banyak, aksi per kartu dari `can`/`primary`, `+ New task` dari `can.createTask`. Kanban **ditunda** (§5). | Bergantung pada modul Tasks; dibuat setelah pola daftar matang | `src/data/projects.detail.ts`, `detail/{tasks.tab,task-card}.tsx`; tes `projects.detail.test.tsx` |
| 9 | **Extend deadline** (`POST /:id/extend-deadline`) + Deadline history dari `extensions`; "Impact" dihitung klien (A-10). | Satu sheet, satu panggilan tulis | `src/data/projects.ts`, `sheets/extend.screen.tsx`, `detail/phases.tab.tsx`; tes `projects.manage.test.tsx` |
| 10 | **Hapus → Sampah + Undo nyata** (`DELETE /projects/:id`, `POST /trash/project/:id/restore`), termasuk keputusan copy "Archive" vs "Sampah". | Destruktif: dikerjakan setelah semua pola tulis stabil | `src/data/projects.store.ts`, `sheets/archive.screen.tsx`, `src/data/archive*.ts`, `src/screens/archive/*`; tes `projects.store.test.ts`, `archive.test.tsx` |
| 11 | **Create project — jalur Form saja** (`POST /api/app/projects`), lalu arahkan ke id baru. Story/Draft/Template disembunyikan sampai A-16 diputuskan. | Jalur paling sederhana dari tiga; tidak menyentuh rencana | `new/{form.screen,form-members,create-done}.tsx`, `new/new.screen.tsx` (sembunyikan dua kartu), `src/data/projects.ts`; tes `projects.create.test.tsx` |
| 12 | **Tulis rencana: fase & milestone** (`POST`/`PATCH`/`DELETE` phases & milestones, reach/unreach) menggantikan tombol notice. | Butuh form baru; paling banyak UI baru | `detail/phases.tab.tsx` + form baru di `src/screens/projects/plan/*`, route `app/(tabs)/projects/[id]/*`; tes baru |
| — | **Diblokir sampai ada perubahan server** | | A-1 (avatar daftar), A-2 (people row), A-3 (filter Health), A-4 (sort progress), A-6 (cari deskripsi), A-8 (teks Inggris alasan & aktivitas), A-9 (department), A-12 (task type / Project settings), A-16 (draft AI & template), A-17 (`caps.createProject`) |

Catatan untuk dispatch: langkah 1–2 bisa jalan paralel dengan langkah lain; 3→4→5 berurutan karena berbagi
`projects.ts`/`projects.detail.ts`; 6–7 berbagi `projects.store.ts` jadi jangan diparalelkan; 8 menunggu modul Tasks
tersambung; 10 menunggu modul Sampah/Archive diputuskan.
