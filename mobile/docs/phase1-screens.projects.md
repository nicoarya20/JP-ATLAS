# Phase 1 — Projects (W4)

Status: diimplementasikan di Fase 1 (2026-10-25). Penyimpangan dari prototipe dan log: reacttransition.md §1 dan §8.

Bagian dari `phase1-screens.md`. Sumber: `riset-keano/prototype-react/src/screens/projects/*` (14 berkas), `src/data/sample.js` (`projects`, `atlas`, `story`, `templates`), tes `projects.filter`, `projects.people`, `projects.tasks`, `projects.edit`, `projects.create`, `archive.undo`, `roles.gating`.

## 1. Id → route

| Id prototipe | Route | Presentasi | Tab bar |
|---|---|---|---|
| `projects.list` | `app/(tabs)/projects/index.tsx` — param `who?` (`'me'` atau nama depan) | root tab | ya |
| `projects.filter` | `app/(tabs)/projects/filter.tsx` | formSheet | — |
| `projects.overview`, `.tasks`, `.phases`, `.members` | `app/(tabs)/projects/[id]/index.tsx` — param `tab=overview\|tasks\|phases\|members` (default overview), `view=list\|board` (tab tasks) | push | ya (allowlist `projects.detail`) |
| `projects.edit` (pm/admin) | `app/(tabs)/projects/[id]/edit.tsx` | push | tidak |
| `tasks.settings` | `app/(tabs)/projects/[id]/settings.tsx` → `ProjectSettingsScreen` (`settings/project-tasks-routes.tsx`) → `TasksSettings` W1 | push | tidak |
| `projects.extend` (pm/admin) | `app/(tabs)/projects/[id]/extend.tsx` | formSheet | — |
| `projects.archive` (pm/admin) | `app/(tabs)/projects/[id]/archive.tsx` | formSheet | — |
| `tasks.filter` (dalam proyek) | `app/(tabs)/projects/[id]/task-filter.tsx` → `ProjectTaskFilterScreen` (`settings/project-tasks-routes.tsx`) → `TasksFilterPanel` W1, scope `project:<id>` | formSheet | — |
| `projects.new` (pm/admin) | `app/projects/new/index.tsx` | modal (root) | — |
| `projects.form`, `.story`, `.draft`, `.template` | `app/projects/new/{form,story,draft,template}.tsx` | push di Stack modal | — |

- Berkas route `app/(tabs)/projects/[id]/*` dan `app/projects/new/*` hanya meng-ekspor ulang layar dari `src/screens/projects/` (§7); `app/projects/new/_layout.tsx` = Stack tanpa header.
- Ganti tab detail = `router.setParams({ tab })`; header dan tab tetap (prototipe: `go` antar empat id dengan header bersama).
- **Ditetapkan (orchestrator 2026-10-25):** detail lengkap (fase, milestone, Deadline history, usulan Extend deadline, Recent activity sampel) hanya untuk Atlas (`PROJECT_DETAIL.atlas`; prototipe membuka Atlas dari semua kartu). Kartu membuka `/projects/<id>`; header dibangun dari data list (`getProjectHeader`), tiap tab punya getter sendiri (§6), dan proyek lain menampilkan empty state di bagian tanpa data ("No phases yet.", "No activity yet."). **Tasks needing attention** dihitung dari tugas proyek, jadi berlaku untuk semua proyek. Id yang tidak ada, atau Member yang bukan anggota → layar "Project not found".
- Member tidak bisa membuka `projects.new/*`, `edit`, `extend`, `archive` (Redirect `/`). FAB Projects untuk Member sudah dilipat Sesi A.

## 2. List (`ProjectsList`)

- `StackedScreen` judul **"Projects"**, cari **"Search project name or description…"** + ikon filter (titik bila status/health ≠ All).
- **People row** (`PeopleRow`, scroll horizontal, label grup "Show projects of"): chip **My projects** (tidak untuk Member — baginya semua proyek adalah miliknya) lalu satu avatar per rekan yang ada di proyek yang terlihat (urutan `people`, kecuali saya). Satu pilihan; tap yang terpilih lagi = semua. Pilihan disimpan di param `who`, jadi Back dari proyek mempertahankannya.
- Baris di bawahnya bila ada pilihan: **"My projects"** / **"Rina's projects"** / (Member) **"Projects with Rina"** + ` · <jumlah>` dan tautan **Clear**.
- Kartu (`ProjectCard`): nama + StatusPill; "Lead: X"; `health · why` (bold; tanpa why → health saja); Progress + "%"(atau "–"); "Due X" + avatar anggota.
- Member melihat hanya proyek yang ia ikuti; Admin dan PM semua.
- Kosong: ikon `FolderOpen`, **"You're not in any project yet."**. Tanpa hasil karena filter: ikon `SearchX`, **"No projects match these filters."** + **Reset filters**.
- Filter (`ProjectsFilter`, "Filter & sort"): **Status** `'All','Active','On hold','Done','Draft','Canceled'`; **Health** `'All','Needs attention','Overdue','On track'`; **Sort by** radio `'Nearest deadline','Lowest progress','Name (A–Z)'`. Reset/Apply seperti Tasks (store query, K4).

## 3. Create (modal `projects.new` → langkah)

- **New project** (`ProjectsNew`): "Create a new project" / "Choose the easiest way for you." Tiga kartu, tombol **Choose**:
  - **Tell us about the project ✦** (pill **Recommended**, tombol primary) — "Describe the project like telling a friend. AI drafts the phases and tasks." / "You still review the draft before the project is created." → `story`.
  - **Fill in the form yourself** — "Enter the project name, dates, and members one by one." / "Good if you already know the project details." → `form`.
  - **Use a template** — "Start from a project structure you made before." / "Good for projects similar to a previous one." → `template`.
- **Form** ("Fill in project form"): Project name \*, Description, Start date \*, End date/Estimated end, Priority · Initial status, Lead (main manager), Members & roles (pencipta tetap Manager: "Creator stays Manager"), catatan "The creator automatically becomes Manager and Lead. Default task types created: Task, Bug, Idea (can be changed in Project settings)." → **Create project** ("Project created").
- **Story** ("Tell us about the project ✦"): textarea "Your story" dengan penghitung "/ 2000 characters", "To get a good draft, mention:" (Who is involved / When it must be done / The project's goal), Speak (toast), **Build draft ✦** → `draft`.
- **Draft** ("Review draft"): "This is an AI draft. Review it before creating."; Project info; "Phases, milestones & initial tasks" dengan checkbox ("AI picked the type from Task · Bug · Idea, tap to change. Uncheck to discard."); "Also save as template"; **Rebuild** / **Create project**.
- **Template** ("Use template"): pilih satu template (`PROJECT_TEMPLATES`, mis. Leave Request App; radio buatan sendiri `role="radio"` dalam `radiogroup`, karena `RadioList` kit tidak mendukung baris meta), isi Project name \* dan Start date \*; Estimated end dihitung dari panjang template (`templateDates`) → **Create project**.
- Kaki tiap langkah (`Foot`, `parts/form-bits.tsx`): **Cancel** (back; di Draft **Rebuild**) + tombol primary. Selama primary mati, alasannya tampil dan dibacakan sebagai hint (`WHY` di `projects.strings.added.ts`: "Enter a project name.", "Choose a template.", "Write your story first."). Draft punya tautan **Edit** di "Project info" → `form`.
- Tanpa LLM: draf dan template = data sampel (`story`, `templates`). Prototipe tidak menyimpan proyek baru.
- **Create project** (form, draft, template) = `createProject(notice)` di `new/create-done.ts`: notice "Project created" → `router.dismissTo('/projects')` lalu `router.push('/projects/atlas')` hanya bila Atlas masih terdaftar (prototipe membuka `projects.overview` Atlas); bila Atlas di Archive atau sudah dihapus, berakhir di list Projects.
- Ringkasan di atas; copy persis diambil dari `projects.create.jsx` dan `projects.draft.jsx` (K8).

## 4. Detail (`DetailScreen` + 4 tab)

Header (semua tab):
- Judul = nama proyek, chevron back. ⋯ **"Project actions"** hanya non-member dan tidak diarsipkan: **Edit project** → `edit`; **Project settings** → `settings`; **Move to Archive** (danger) → sheet `archive`.
- "This project is in Archive." bila diarsipkan. Proyek di Archive tetap bisa dibuka lewat id (`findProject` mencari list dan Archive), tetapi `canEdit` = false: tanpa ⋯, Extend deadline, dan aksi tab; tab Tasks tanpa **+ New task** dengan empty state "Tasks are in Archive with the project." Proyek di Archive tidak muncul di list Projects dan tidak ditawarkan sebagai pilihan proyek di Tasks.
- StatusPill status + StatusPill health; "Why: …"; "Lead: X · Due: <dueLong>"; StatusPill `extended` + **Extend deadline** (canEdit).
- Tab **Overview / Tasks / Phases / Members** (Seg/tab kit; gluestack Tabs alpha tidak dipakai).

| Tab | Isi | Aksi |
|---|---|---|
| Overview (`ProjectsOverview`) | **Progress**: "Tasks done" %, "Time elapsed" %, "Start X · due Y · N days left". **Phases & next milestone**: langkah fase (✓ Done, sekarang), "Now: <fase> · n%", "◆ Next milestone: …", tanggal + "in N days", tautan "See all phases →". **Tasks needing attention**: tugas terbuka proyek itu yang Overdue, Awaiting review, atau Due today (urutan itu; di sampel Atlas = #12, #17, #14) → detail tugas; kosong → "No tasks need attention." **Recent activity** | Tautan ke tab Phases dan detail tugas |
| Tasks (`ProjectsTasks`) | Cari + filter (scope proyek, field Assignee), Seg **List / Kanban**, **+ New task** (primary). List (`ProjectTaskCard`): tautan kartu (`#no title`, StatusPill, `type · priority · who · due`) membuka detail tugas; catatan dan tombol aksi berada **di samping** tautan, bukan di dalamnya (Pressable accessible menyembunyikan tombol bersarang); "n tasks". Kanban: `TaskBoard` W1 | Tombol per tugas menurut status (PM/Admin): In progress → **Request review** ("Sent for review"), In review → **Review** → detail tugas, To do → **Start working** ("Task started"); status lain / Member: **View**. "+ New task" → `/tasks/new/form?project=<id>` (tidak ada bila proyek di Archive) |
| Phases (`ProjectsPhases`) | Kartu per fase: nomor/✓, nama, rentang, StatusPill, progres; **Deadline history** (`original`, `change`, `reason`) | canEdit: **+ Phase** ("Add phase"), **+ Milestone** ("Add milestone"), fase In progress **Complete phase** ("Phase completed"), Testing **Start phase** ("Phase started") |
| Members (`ProjectsMembers`) | "n members", kartu anggota (role select Manager/Member/Viewer, "(You)"), catatan lead "<lead> is the only Manager, so they can't be removed. Add a second Manager so their tasks can be reviewed by someone else.", **What roles mean** (Manager / Member / Viewer + penjelasan) | canEdit: **+ Member** ("Pick a member"), ubah role, **Remove** ("Member removed") — **T2 AlertDialog** (§2 main doc) |

- Catatan tugas di proyek (`note` di `tasks.shared.ts` W1): In review → "Awaiting review by <reviewer>", atau "Waiting for my review" bila reviewer-nya saya; selain itu `t.when`.
- Kartu dan papan re-render saat store tugas berubah.

## 5. Sheet dan edit

**Extend deadline** (`projects.extend`): "Current deadline" (`extend.current`), **New deadline \***, **Why extend? \*** (quick pick + alasan), "Impact of change", "Recorded in Deadline history and Project activity." → **Save** ("Deadline extended"). Port copy dari `projects.extend.jsx`.

**Edit project** (`projects.edit`): "Edit project"; Project name (unik: nama proyek lain, terdaftar maupun di Archive, tanpa beda huruf besar/kecil → "A project with this name already exists." dan Save mati), Description, Status (`Draft/Active/On hold/Done/Canceled`, hint "Status can move to any other, even from Done back to Active."), Lead (hanya Manager proyek), Priority (chips), Start date (bila sudah mulai), Deadline; catatan "Need more time and want the reason on record? Use Extend deadline on the project page." → **Save changes** (`editProject(id, fields, editor)`; rename juga memanggil `renameProjectTasks` W1, karena tugas menunjuk proyeknya lewat nama).

**Move to Archive** (`projects.archive`): judul **"Move project to Archive?"**, sub nama proyek; "“<nama>” and its <n tasks> leave every list and wait in Archive."; kotak "Restore brings the project back with all its tasks. Only an Admin can delete it forever."; **Cancel** / **Move to Archive** (danger). Aksi: `archiveProject(id, by)` (entri Archive dulu, lalu `takeProjectTasks`; mengembalikan key entri) → `router.dismissTo('/projects')` → snack **"Project moved to Archive"** + **Undo** = `restoreProject(id, key)` (kembali ke posisi semula; memanggil `putTasksBack`) → "Project restored". Undo terikat ke key entri: bila sudah Delete forever di Archive (`canRestoreProject` false) → "This project was deleted forever and can't be restored."

## 6. Data dan logika

| Berkas baru | Port dari | Isi |
|---|---|---|
| `sample/projects.extra.ts` | `sample.js` `projects[].health/why/extended`, `atlas`, `story`, `templates` | `PROJECT_EXTRA: Record<id, ProjectExtra>` (`health`, `why`, `extended?`, `started?`), `PROJECT_ROLES` (role yang berbeda dari default), `PROJECT_DETAIL` (hanya `atlas`: `phasePct`, `phases`, `activity`, `deadlineHistory`, `extend`), `PROJECT_STORY`, `PROJECT_TEMPLATES`, `TEMPLATE_PROJECT` (tanggal ISO) |
| `projects.query.ts` | `projects.query.js` | `STATUSES`, `HEALTHS`, `SORTS`, `BASE_QUERY`, `isFiltered`, `applyQuery`, `searchProjects` |
| `projects.people.ts` | `projects.people.jsx` | `WHO_ME`, `ofWho(list, who, me)`, `teammates(list, me)`, `whoLabel(who, member)` |
| `projects.dates.ts` | — | `longDate`, `weekdayLongDate`, `addDays`, `addMonths`, `rangeLabel`, `daysLeftLabel`, `QUICK_ENDS` |
| `projects.state.ts` | — | State dan getter untuk semua modul, **tanpa impor `tasks*`** (Tasks dan Home membaca proyek dari sini tanpa siklus impor): `ProjectItem`, `HeldProject`, `ProjectsState` (`list`, `archived`, `held`, `activity`), `projectsStore` (hanya ditulis `projects.store`), `findProject` (list atau Archive), `getProjectByName`, `projectNameTaken(name, exceptId?)` (trim, tanpa beda huruf, list + Archive), `listProjects`, `listArchivedProjects`, `isArchivedProject`, `getProjectsState`, `useProjectsState` |
| `projects.store.ts` | `projects.store.js` | Aksi (`createStore` W0), mengekspor ulang getter `projects.state`: `editProject(id, fields, editor)` (nama kosong/terpakai dan Lead bukan anggota → throw; rename → `renameProjectTasks`), `setMemberRole`, `removeMember` (Lead tetap Manager dan tidak bisa dihapus), `archiveProject(id, by)` → key, `canRestoreProject(id, key)`, `restoreProject(id, key?)`, `forgetArchivedProject(key)` (Delete forever dari `archive.ts`; memanggil `forgetProjectTasks(taken)`), `taskCountOf`, `taskCount`, `resetProjects` (test-only), `setProjectsQuery`, `useProjectsQuery`; tipe `ProjectFields` |
| `projects.ts` | — | Titik tukar API: `projectsFor(role)`, `getProjectsList(role, { who, query, search })`, `getProjectHeader(role, id)` → `ProjectHeader \| null` (`archived`, `canEdit`), `getProjectEdit(id)` (`leads` = Manager), `getProjectExtend(id)`, `getProjectArchive(id)`, `getProjectCreate(role)`, `templateDates(start, days)`; mengekspor ulang getter tab dari `projects.detail.ts` |
| `projects.detail.ts` | — | Getter tab: `getProjectOverview(role, id)` (attention dari tugas), `getProjectTasks(role, id, view, search)` (`rows` dengan `TaskAction` per status), `getProjectPhases(id, canEdit)`, `getProjectMembers(role, id)`, `PROJECT_ROLES_LIST` |

- Sampel Sesi B `sample/projects.ts` (`id, name, status, lead, progress, due ISO, members, …`) dibaca, tidak diubah (K7).
- `ACTIONS` per tugas (#12/#17/#14/#15) adalah data demo prototipe; di-port sebagai turunan status (`To do` → Start working, `In progress` → Request review, `In review` → Review) agar tidak terikat nomor.

## 7. Berkas layar (`src/screens/projects/`, layar ≤ 150 baris)

`projects.strings.ts` (copy prototipe), `projects.strings.added.ts` (copy di luar prototipe: `WHY`, `NAMES`, `STEP_STATE`, `ADDED`); `parts/display.tsx` (`Sec`, `Soft`, `Note`, `Head`, `Info`, `Bar`, `Ai`), `parts/form-bits.tsx` (`Labelled`, `CheckRow`, `Foot`); `list/projects.screen.tsx` (menggantikan placeholder T5), `list/project-card.tsx`, `list/people-row.tsx`; `filter/projects-filter.screen.tsx`; `detail/project-detail.screen.tsx`, `detail/project-page.tsx`, `detail/detail-header.tsx`, `detail/overview.tab.tsx`, `detail/tasks.tab.tsx`, `detail/task-card.tsx`, `detail/phases.tab.tsx`, `detail/members.tab.tsx`; `sheets/extend.screen.tsx`, `sheets/archive.screen.tsx`; `edit/project-edit.screen.tsx`; `settings/project-tasks-routes.tsx` (`ProjectSettingsScreen`, `ProjectTaskFilterScreen`); `new/new.screen.tsx`, `new/form.screen.tsx`, `new/form-members.tsx`, `new/story.screen.tsx`, `new/draft.screen.tsx`, `new/template.screen.tsx`, `new/create-done.ts`.

## 8. Komponen dan interaksi

- gluestack: Card, Badge (StatusPill), Progress, Avatar, Button, Input, Textarea, Select, Checkbox, Menu, AlertDialog lewat `ConfirmDialog` kit (Remove member, ubah role). Radio template dibuat sendiri (§3).
- People row: `ScrollView horizontal`, avatar `Pressable` dengan `accessibilityState={{ selected }}` dan label nama.
- Tidak ada gesture khusus selain papan W1. Header detail + tab tetap di atas saat scroll (`stickyHeaderIndices` pada baris alat tab Tasks, padanan `pj-tools` sticky).
- Keyboard: story (textarea 2000 karakter) dan form panjang → §7 main doc.

## 9. Risiko

| Risiko | Penanganan |
|---|---|
| Detail hanya punya data Atlas | Header + empty state (§1); tes kedua jalur |
| Papan di dalam ScrollView vertikal detail | Papan W1 sudah dirancang di dalam halaman vertikal; uji tahan kartu di tab Tasks proyek |
| Arsip proyek memindahkan tugasnya | Tes store gabungan: arsip → tugas hilang dari list Tasks; Undo → kembali |
| Rename proyek | `renameProjectTasks` agar list tugas tetap cocok (port perilaku prototipe); nama duplikat ditolak (`projectNameTaken`) karena kunci tugas = nama proyek, kunci id menyusul bersama API |

## 10. Tes (`__tests__/projects/`)

Berkas: `projects.{query,store}.test.ts`, `projects.{list,detail,manage,create,qa}.test.tsx`; helper `__tests__/helpers/projects-router.tsx`.

- **Unit**: `projects.query` (filter status/health, tiga urutan, isFiltered), `projects.people` (ofWho 'me'/nama, teammates tanpa saya, whoLabel member vs lainnya), `projects.store` (edit, archive + task take, restore + put back, reset).
- **Port tes prototipe**: `projects.filter`, `projects.people` (chip My projects tidak untuk Member, toggle, Clear, Back mempertahankan `who`), `projects.tasks` (List/Kanban mempertahankan query, aksi per status, Member hanya View), `projects.edit` (Save, rename), `projects.create` (tiga cara, story → draft → create), `archive.undo` (proyek).
- **Route**: Member membuka `/projects/new` → Redirect; tab param mengganti isi tanpa push.
- Aksesibilitas: people row (label + selected), tab detail (`accessibilityRole="tab"` + selected).
