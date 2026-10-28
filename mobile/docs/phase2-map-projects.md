# Fase 2 — Peta layar ↔ endpoint: Proyek

Rujukan W3. Dokumen analisis, **bukan implementasi** (2026-10-28, `feature/mobile-api-wiring` @ `fc0ab4e`).
Aturan lintas modul (galat seragam, K5, rate limit, `href` web, `can{}`: `true` / kode = disabled /
kunci absen = sembunyikan) ada di kepala `phase2-map-home-inbox-team.md`.

- **Sumber yang diverifikasi:** `server/api/app-projects{,.write,.members,.plan,.deadline,.schedule,.trash}.ts`,
  `server/project/{project,project-plan,project-activity}.dto.ts`, `server/project/project-list.query.ts`,
  `server/access/{project.policy,capabilities}.ts`, `server/api/app-tasks.ts` (`form-options`), dan
  `mobile/src/data/projects*.ts` + `mobile/src/screens/projects/**` saat ini.
- **Acuan lama:** `git show 2a985b7^:mobile/docs/phase2-map-projects.md` (26 Okt, bernomor A-1..A-18/B-1..B-17,
  lengkap dengan nomor baris). Rute dan DTO proyek **tidak berubah** sejak itu (`git log` server kosong untuk
  berkas di atas). Yang menutup GAP lama: `whoami.caps.createProject` (A-17), `GET /tasks/form-options`
  (A-12 bagian baca), keputusan K5 (A-8: kalimat Indonesia tampil apa adanya), `DELETE /trash/:kind/:id`.
- Signature mobile (`getProjectsList`, `getProjectHeader`, `getProjectOverview`, `getProjectTasks`,
  `getProjectPhases`, `getProjectMembers`, `getProjectEdit/Extend/Archive/Create`, store `editProject`,
  `setMemberRole`, `removeMember`, `archiveProject`, `restoreProject`) masih sama dengan acuan lama.

Enum (`server/pm/enums.ts`): status `draft|active|on_hold|completed|canceled` (mobile "Done" = `completed`),
priority `low|medium|high|critical`, peran anggota `manager|member|viewer`, kondisi `on_track|at_risk|off_track`,
fase `not_started|in_progress|done`, kategori perpanjangan `scope_change|dependency|resource|other`.

---

## 0. Endpoint modul ini

| Endpoint | Balasan / catatan |
|---|---|
| `GET /projects?scope=mine\|all&status&q&sort=due\|name\|recent&perhatian=1&rencana=1&page&limit` | `{ items: ProjectListItem[], total, page, limit }`; Member yang minta `all` diam-diam jadi `mine` |
| `GET /projects/:id` | `ProjectDetail` (= item + `description`, `originalDueDate`, `taskCounts {active,overdue,live}`, `can`, `extensionCount`, `lastExtension`, `conditionOverride`); hilang/Sampah/tersembunyi = **404 sama** |
| `POST /projects` | Body ketat: `name, description?, status? (draft\|active), priority?, leadId?, startDate?, dueDate?, members?[{userId,role}] (≤50), tasksNeedReviewDefault?` → 201 `ProjectDetail`. Kunci asing = 422 |
| `PATCH /projects/:id` | `{ name?, description?, priority?, startDate?, dueDate? }` → `ProjectDetail` (`status`/`leadId` = 422) |
| `POST /projects/:id/status` | `{ status }` |
| `PUT /projects/:id/lead` | `{ userId }` (harus manager proyek) |
| `DELETE /projects/:id` | Ke Sampah → `{ id, tasks }`; sesi saja (`PM_KEY_DENY`) |
| `POST /trash/project/:id/restore` | Undo / pulihkan → `{ id, tasks }` |
| `GET /projects/:id/members` | `{ items: ProjectMemberItem[] }` `{ userId, name, image, jobTitle, role, isLead, joinedAt }`; manager dulu |
| `POST /projects/:id/members` · `PATCH …/:userId` · `DELETE …/:userId` | `{ userId, role }` · `{ role }` · — ; galat per anggota `LAST_MANAGER`, `IS_LEAD`, `NO_SELF_LEAVE`, `ALREADY_MEMBER`, `BAD_CANDIDATE` (Indonesia) |
| `GET /projects/:id/plan` | `{ phases[], milestones[], currentPhase, nextMilestone }` |
| `POST /:id/phases` · `PATCH /:id/phases/:phaseId` (`status` di sini) · `DELETE` · `POST /:id/phases/reorder {ids}` | Fase ≤ 20/proyek |
| `POST /:id/milestones` · `PATCH/DELETE /:id/milestones/:mid` · `POST …/reach` · `POST …/unreach` | |
| `POST /projects/:id/extend-deadline` | `{ newDueDate, reasonCategory, reason (≤500, wajib) }` → 201; sesi saja |
| `GET /projects/:id/extensions?limit` | `{ items, count, total, limit }` |
| `PUT/DELETE /projects/:id/condition-override` | `{ level, reason, expiresAt? }`; sesi saja |
| `GET /projects/:id/activity?limit&cursor` | `{ items: { id, action, text, actorId, actorName, createdAt }[], nextCursor }` |
| `GET /tasks?scope=project&projectId=…` | Tab Tasks; `{ items, nextCursor, caps.createTask }` (peta Tasks) |
| `GET /tasks/form-options?projectId=` | `{ projects: [{ id, name, kinds[{id,name,baseKind}], phases[{id,name}] }] }` |
| `GET /team/picker?projectId&q` | Kandidat anggota/Lead |
| `GET /whoami` | `caps.createProject` (FAB + gerbang `/projects/new`) |

---

## 1. Layar/aksi → endpoint

| Layar mobile (rute → berkas) | Titik tukar | Endpoint |
|---|---|---|
| Daftar `(tabs)/projects/index` → `list/projects.screen.tsx` | `getProjectsList(role, {who, query, search})` | `GET /projects` (+ `page`) |
| Filter & sort `(tabs)/projects/filter` | `projects.query.ts` (`applyQuery`, `searchProjects` — filter di memori) | Menulis query `status`, `perhatian`, `sort`, `q` |
| Baris orang + "My projects" | `projects.people.ts` (`ofWho`, `teammates`) | Tidak ada filter "proyek milik X" (GAP P-2) |
| Detail header `[id]/index` → `detail/detail-header.tsx` | `getProjectHeader` | `GET /projects/:id` |
| Tab Overview | `getProjectOverview` | detail + `GET /:id/plan` + `GET /:id/activity?limit=4` + baris perhatian dari `GET /tasks?scope=project&projectId&due=overdue` / `due=today` / `status=in_review` |
| Tab Tasks + `[id]/task-filter` | `getProjectTasks` | `GET /tasks?scope=project&projectId=…` (peta Tasks) |
| Tab Phases | `getProjectPhases` | `GET /:id/plan` + `GET /:id/extensions` |
| Tab Members | `getProjectMembers` | `GET /:id/members` |
| Extend `[id]/extend` → `sheets/extend.screen.tsx` | `getProjectExtend` | `POST /:id/extend-deadline` |
| Edit `[id]/edit` → `edit/project-edit.screen.tsx` | `getProjectEdit`, `editProject` | `PATCH /:id` + bila berubah `POST /:id/status` + `PUT /:id/lead` |
| Move to Archive `[id]/archive` → `sheets/archive.screen.tsx` | `getProjectArchive`, `archiveProject`, `restoreProject` | `DELETE /projects/:id`, Undo = `POST /trash/project/:id/restore` |
| Settings `[id]/settings` → `settings/project-tasks-routes.tsx` | `getTaskSettings` (`tasks.settings.ts`) | Baca kinds via `form-options`; **tulis tidak ada** (GAP P-9) |
| Create `projects/new/{index,form,story,draft,template}` | `getProjectCreate`, `templateDates` | `POST /projects` (jalur Form saja; GAP P-10) |

---

## 2. Pemetaan bidang

### 2a. Kartu daftar (`ProjectCard` ← `ProjectListItem`)

| Mobile | Server | Status |
|---|---|---|
| `id`, `name` | `id`, `name` | ✓ |
| `status` "Active"… | `status` enum | Label Inggris di klien; "Done" = `completed` |
| `lead: 'Nico'` | `lead: {id,name}\|null` | `null` mungkin (FK SET NULL); nama penuh |
| `progress: 70` / `percent: '70%'\|'–'` | `progress {done,total,percent\|null}` | `null` → "–" |
| `due` "Oct 31" | `dueDate\|null` | `null` → "No deadline" |
| `health` + `why` | `condition {level, reason}\|null` | `reason` Indonesia, tampil apa adanya (K5). `condition` null untuk status ≠ active → "✓ Done" (`completed`), "No tasks yet" (`progress.total === 0`) disusun klien |
| `members[]` → `AvatarStack` | — | **GAP P-1** |
| Filter "milik siapa" (`who`) | `scope=mine\|all` saja | **GAP P-2** |
| — | `priority`, `startDate`, `myRole`, `plan?` | `myRole` menggantikan role akun untuk label "(You) Manager" |
| `projectsFor(role)` (Member hanya miliknya) | Server meng-clamp `scope` | **Hapus** aturan klien |
| Unik nama proyek (`projectNameTaken`) | Tidak ada constraint unik | **Hapus** validasi; kunci = `id` |

### 2b. Filter & sort

| Mobile | Server | Status |
|---|---|---|
| Status (6 pilihan) | `status=<enum>` | ✓ |
| Health: Needs attention / Overdue / On track | `perhatian=1` (= `at_risk` + `off_track` digabung) | **GAP P-3** |
| Sort: Nearest deadline / Lowest progress / Name | `sort=due\|name\|recent` | **GAP P-4** ("Lowest progress") |
| Search nama + deskripsi | `q` = nama saja (≤ 100) | **GAP P-5** |
| — | `page`/`limit` (25, maks 100) | Load more di daftar |

### 2c. Header + Overview

| Mobile | Server | Status |
|---|---|---|
| `dueLong`, `timeLine`, `elapsed` | `startDate`, `dueDate` + `today` server (W2) | Klien |
| `extended` "Extended ×1" | `extensionCount` | ✓ |
| `archived` | Proyek di Sampah = 404 dari `GET /:id`; `can.update === 'PROJECT_IN_TRASH'` hanya untuk jalur lain | Layar "Project not found" tetap benar |
| `canEdit = role !== 'member' && !archived` | `can.update` / `can.trash` / `can.createTask` / `can.manageKinds` | **Hapus** aturan klien (§4) |
| `steps[]` | `plan.phases[].{name,status}` | ✓ |
| `now` "Development · 60%" | `plan.currentPhase` + `doneCount/taskCount` | Persen didefinisikan ulang (angka sampel ditulis tangan) |
| `milestone` | `plan.nextMilestone {title, dueDate, reachedAt}` | ✓ |
| `attention[]` | 3 panggilan `GET /tasks` (overdue, today, in_review) | Digabung + diurutkan klien |
| `activity[] {text, on}` | `activity.items[] {text, actorName, createdAt}` | `text` Indonesia (K5) |
| — | `conditionOverride` | Badge "set manually" + alasan; tulis tidak di prototipe |

### 2d. Phases, Members, Extend, Edit

| Mobile | Server | Status |
|---|---|---|
| `cards[].range` | `phases[].startDate/endDate` (**nullable**) | Klien siap "No dates" |
| `cards[].milestone` | `milestones[]` dengan `phaseId` sama | ✓ |
| `cards[].button` Start/Complete | `PATCH /:id/phases/:phaseId {status}` | Kini nyata, bukan notice |
| `history {original, change, reason, by}` | `extensions.items[] {oldDueDate,newDueDate,reasonCategory,reason,extendedByName,createdAt}` | Pemetaan **silang**: label mobile = `reasonCategory` (peta Inggris 4 nilai di klien), catatan mobile = `reason` |
| Anggota `sub` "UI Designer · Product" | `jobTitle` saja | **GAP P-6** (`department`) |
| Anggota `name` (depan), `you`, `lead` | `name` penuh, `userId === viewer`, `isLead` | ✓ |
| `onlyManager` | Hitung dari `items` | ✓ |
| — | `image`, `joinedAt` | Avatar foto |
| Extend `impact` "3 tasks and 1 milestone…" | Tak ada pratinjau | Hitung klien dari plan + daftar tugas proyek (P-7) |
| Extend `next` (terisi) | — | Kosong setelah API |
| Edit Save (satu tombol) | 1–3 panggilan | Urutan: `PATCH` → `status` → `lead`; gagal di tengah → tampilkan galat, detail dimuat ulang (yang sudah tersimpan tetap) |
| `renameProjectTasks` | Tugas menunjuk `projectId` | **Hapus** |

### 2e. Create

| Mobile | Server | Status |
|---|---|---|
| Form (nama, deskripsi, tanggal, priority, status awal, Lead, anggota) | `POST /projects` | ✓; anggota dari `team/picker` |
| "Default task types: Task, Bug, Idea" | Server membuat `Tugas, Bug, Ide` | Copy (P-8) |
| Story → Draft ✦, Template, "Save as template" | Tidak ada endpoint AI/template | **GAP P-10** |
| `router.push('/projects/atlas')` | `201 detail.id` | ✓ |
| Gerbang Member | `whoami.caps.createProject` | ✓ (GAP lama A-17 tertutup) |

---

## 3. Kalimat server (Indonesia, K5)

`condition.reason`, `activity.items[].text`, `conditionOverride.reason` (ditulis manusia),
`extensions.items[].reason` (ditulis manusia), semua `error` tulis (galat anggota, tanggal mustahil, batas fase,
`VALIDATION` "Pilih proyeknya dulu."). Alasan tombol disabled hanya dikirim sebagai **kode** (lihat GAP E-6 peta Events). Nama task type bawaan
(`Tugas`, `Bug`, `Ide`) juga Indonesia. Label enum (status, priority, peran, kategori) tetap Inggris dari klien.

---

## 4. Aksi tulis + pengaman

| Aksi | Endpoint | `can` | Pengaman |
|---|---|---|---|
| Buat proyek | `POST /projects` | `whoami.caps.createProject` | — ; loading, buka detail baru |
| Edit proyek | `PATCH` (+ status, lead) | `update` | — |
| Ubah status ke `canceled`/`completed` | `POST /:id/status` | `update` | **T2** (berdampak ke tugas; copy jelaskan) |
| Ganti Lead | `PUT /:id/lead` | `update` | **T2** (ubah peran) |
| Pindah ke Sampah | `DELETE /projects/:id` | `trash` | **T2** sebut dampak (`taskCounts.live` tugas) — hanya Super-admin, Admin, PM-Pengelola; Member-Pengelola punya `update` tanpa `trash`. Setelah sukses notice + **Urungkan** (`restore`) |
| Tambah anggota | `POST /:id/members` | `update` | — |
| Ubah peran anggota | `PATCH /:id/members/:userId` | `update` | **T2** |
| Keluarkan anggota | `DELETE /:id/members/:userId` | `update` | **T2** |
| Perpanjang tenggat | `POST /:id/extend-deadline` | `update` (proksi; tak ada kunci sendiri) | Sheet + alasan wajib; tercatat di riwayat |
| Start/Complete phase | `PATCH /:id/phases/:phaseId` | `update` | — (bisa diubah balik) |
| Tambah/ubah fase & milestone | `POST/PATCH` plan | `update` | — (mobile belum punya form) |
| Hapus fase / milestone | `DELETE` plan | `update` | **T2** (permanen, tidak ke Sampah) |
| Reach/unreach milestone | `POST …/reach\|unreach` | `update` | — |
| Kondisi manual | `PUT/DELETE condition-override` | `update` | Tidak ada di prototipe |

Setelah tulis: `invalidate` detail proyek, daftar proyek, Home (kartu proyek), dan bila Sampah: daftar Sampah.
Aturan klien di `projects.store.ts` (`setMemberRole`/`removeMember` yang menjaga manager terakhir & Lead,
`canRestoreProject`, `forgetArchivedProject`) **dihapus**; galat server ditampilkan apa adanya.

---

## 5. Usulan pembagian 2 worker (berkas disjoint)

| Worker | Berkas milik | Isi |
|---|---|---|
| **A — Daftar + buat + edit** | `data/projects.ts`, `projects.query.ts`, `projects.people.ts`, `projects.state.ts`, `data/sample/projects*.ts`, `screens/projects/{list,filter,new,edit,parts}/**`, `screens/projects/projects.strings*.ts`, `app/(tabs)/projects/{index,filter}.tsx`, `app/(tabs)/projects/[id]/edit.tsx`, `app/projects/new/**`, tes terkait | Resource daftar (page), filter ke query, create, edit (3 panggilan), gerbang `caps.createProject` |
| **B — Detail** | `data/projects.detail.ts`, `projects.dates.ts`, `projects.store.ts`, `screens/projects/{detail,sheets,settings}/**`, `app/(tabs)/projects/[id]/{index,extend,archive,settings,task-filter}.tsx`, tes terkait | Detail + plan + activity + members + extensions, extend, Sampah + Urungkan, aksi anggota/fase |

Titik sentuh: `getProjectHeader` tinggal di `projects.ts` (A) tetapi dipakai B → usul pindah ke
`projects.detail.ts` milik B di langkah pertama. Tab Tasks memakai resource daftar tugas milik peta Tasks
(B hanya mengimpor). `getTaskSettings` (`tasks.settings.ts`) milik worker Tasks.

---

## 6. GAP

Nomor baru (P-*) dengan rujukan nomor lama di kurung.

| # | Layar | Masalah | Usulan | Butuh keputusan |
|---|---|---|---|---|
| P-1 (A-1) | Kartu daftar | Anggota/jumlah anggota tak ada di `ProjectListItem`; ambil per kartu = N+1 | Sembunyikan avatar stack, **atau** server menambah `memberCount` + `members` (≤ 4) | **User/Nico** |
| P-2 (A-2) | Daftar | Filter "proyek milik X" (baris orang, `who`) | Sembunyikan baris orang; pakai `scope=mine\|all` saja, **atau** server menambah `?memberId=` | **User/Nico** |
| P-3 (A-3) | Filter | Health per tingkat | Ganti jadi satu toggle "Needs attention" (`perhatian=1`), **atau** server `?condition=` | **User** |
| P-4 (A-4) | Sort | "Lowest progress" | Ganti dengan "Recently updated" (`recent`), **atau** server menambah sort | **User** |
| P-5 (A-6) | Cari | Deskripsi tak ikut dicari | Ubah placeholder jadi "Search project name" | User |
| P-6 (A-9) | Members | `department` tak dikirim | Tampilkan `jobTitle` saja, atau server menambah | Nico (bila ke server) |
| P-7 (A-10) | Extend | Pratinjau dampak | Hitung klien dari plan + tugas proyek | — |
| P-8 | Create | Nama task type bawaan Indonesia (`Tugas, Bug, Ide`) | Tampilkan apa adanya (K5) atau ubah copy | User |
| P-9 (A-12) | Project settings | Kinds bisa dibaca (`form-options`), **tak ada rute tulis**; `can.manageKinds` ada | Layar jadi baca-saja / sembunyikan, atau server menambah rute kinds | **User/Nico** |
| P-10 (A-16) | Create | Story → Draft ✦ (AI) dan Template tak punya endpoint | Fase 2 hanya jalur Form; sembunyikan Story/Draft/Template | **User** |
| P-11 (A-15) | Sampah | Jendela Urungkan 10 dtk & retensi 30 hari tak dikirim | Konstanta bernama di klien | — |
| P-12 (A-18) | Extend | Tak ada kunci `can` sendiri | `can.update` sebagai proksi (sama kebijakannya hari ini) | — |
| — (A-8) | Kondisi, aktivitas | Teks Indonesia | **Tertutup oleh K5** | — |
| — (A-17) | FAB | Kapabilitas buat proyek | **Tertutup**: `whoami.caps.createProject` | — |
