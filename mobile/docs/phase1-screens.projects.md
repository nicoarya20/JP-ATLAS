# Phase 1 — Projects (W4)

Bagian dari `phase1-screens.md`. Sumber: `riset-keano/prototype-react/src/screens/projects/*` (14 berkas), `src/data/sample.js` (`projects`, `atlas`, `story`, `templates`), tes `projects.filter`, `projects.people`, `projects.tasks`, `projects.edit`, `projects.create`, `archive.undo`, `roles.gating`.

## 1. Id → route

| Id prototipe | Route | Presentasi | Tab bar |
|---|---|---|---|
| `projects.list` | `app/(tabs)/projects/index.tsx` — param `who?` (`'me'` atau nama depan) | root tab | ya |
| `projects.filter` | `app/(tabs)/projects/filter.tsx` | formSheet | — |
| `projects.overview`, `.tasks`, `.phases`, `.members` | `app/(tabs)/projects/[id]/index.tsx` — param `tab=overview\|tasks\|phases\|members` (default overview), `view=list\|board` (tab tasks) | push | ya (allowlist `projects.detail`) |
| `projects.edit` (pm/admin) | `app/(tabs)/projects/[id]/edit.tsx` | push | tidak |
| `tasks.settings` | `app/(tabs)/projects/[id]/settings.tsx` → layar `TasksSettings` W1 | push | tidak |
| `projects.extend` (pm/admin) | `app/(tabs)/projects/[id]/extend.tsx` | formSheet | — |
| `projects.archive` (pm/admin) | `app/(tabs)/projects/[id]/archive.tsx` | formSheet | — |
| `tasks.filter` (dalam proyek) | `app/(tabs)/projects/[id]/task-filter.tsx` → `TasksFilterPanel` W1, scope `project:<id>` | formSheet | — |
| `projects.new` (pm/admin) | `app/projects/new/index.tsx` | modal (root) | — |
| `projects.form`, `.story`, `.draft`, `.template` | `app/projects/new/{form,story,draft,template}.tsx` | push di Stack modal | — |

- Ganti tab detail = `router.setParams({ tab })`; header dan tab tetap (prototipe: `go` antar empat id dengan header bersama).
- **Phase 1 = 1:1 prototipe**: hanya Atlas punya data detail (`atlas`), dan semua kartu prototipe membuka detail Atlas. Rekomendasi: kartu membuka `/projects/<id>`; `getProjectDetail(id)` mengembalikan detail Atlas bila id = `atlas`, dan untuk proyek lain header dari data list + bagian tanpa data memakai empty state ("No phases yet." dst.). Bila orchestrator memilih 1:1 murni, semua kartu → `/projects/atlas`. **Perlu keputusan.**
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
- **Template** ("Use a template"): pilih template (sampel `templates`, mis. Leave Request App) → **Use template**.
- Kaki tiap langkah (`CancelFoot`): **Cancel** (back) + tombol primary. Draft punya tautan **Edit** di "Project info" → `form`.
- Tanpa LLM: draf dan template = data sampel (`story`, `templates`). Prototipe tidak menyimpan proyek baru.
- **Create project** (form, draft, template): notice "Project created" → `router.dismiss()` lalu `router.push('/projects/atlas')` (prototipe membuka `projects.overview` Atlas).
- Ringkasan di atas; copy persis diambil dari `projects.create.jsx` dan `projects.draft.jsx` (K8).

## 4. Detail (`DetailScreen` + 4 tab)

Header (semua tab):
- Judul = nama proyek, chevron back. ⋯ **"Project actions"** hanya non-member dan tidak diarsipkan: **Edit project** → `edit`; **Project settings** → `settings`; **Move to Archive** (danger) → sheet `archive`.
- "This project is in Archive." bila diarsipkan.
- StatusPill status + StatusPill health; "Why: …"; "Lead: X · Due: <dueLong>"; StatusPill `extended` + **Extend deadline** (canEdit).
- Tab **Overview / Tasks / Phases / Members** (Seg/tab kit; gluestack Tabs alpha tidak dipakai).

| Tab | Isi | Aksi |
|---|---|---|
| Overview (`ProjectsOverview`) | **Progress**: "Tasks done" %, "Time elapsed" %, "Start X · due Y · N days left". **Phases & next milestone**: langkah fase (✓ Done, sekarang), "Now: <fase> · n%", "◆ Next milestone: …", tanggal + "in N days", tautan "See all phases →". **Tasks needing attention**: #12 Overdue, #17 Awaiting review, #14 Due today → detail tugas. **Recent activity** | Tautan ke tab Phases dan detail tugas |
| Tasks (`ProjectsTasks`) | Cari + filter (scope proyek, field Assignee), Seg **List / Kanban**, **+ New task** (primary). List: kartu `#no title`, StatusPill, `type · priority · who · due`, catatan + tombol aksi; "n tasks". Kanban: `TaskBoard` W1 | Tombol per tugas (PM/Admin): #12 **Request review** ("Sent for review"), #17 **Review** → detail review, #14/#15 **Start working** ("Task started"); lainnya / Member: **View**. "+ New task" → `/tasks/new/form?project=<id>` |
| Phases (`ProjectsPhases`) | Kartu per fase: nomor/✓, nama, rentang, StatusPill, progres; **Deadline history** (`original`, `change`, `reason`) | canEdit: **+ Phase** ("Add phase"), **+ Milestone** ("Add milestone"), fase In progress **Complete phase** ("Phase completed"), Testing **Start phase** ("Phase started") |
| Members (`ProjectsMembers`) | "n members", kartu anggota (role select Manager/Member/Viewer, "(You)"), catatan lead "<lead> is the only Manager, so they can't be removed. Add a second Manager so their tasks can be reviewed by someone else.", **What roles mean** (Manager / Member / Viewer + penjelasan) | canEdit: **+ Member** ("Pick a member"), ubah role, **Remove** ("Member removed") — **T2 dialog** (deviasi §2 main doc) |

- Catatan tugas di proyek (`useNote`): In review dan role bukan pm → "Awaiting review by <reviewer>"; selain itu `t.when`.
- Kartu dan papan re-render saat store tugas berubah.

## 5. Sheet dan edit

**Extend deadline** (`projects.extend`): "Current deadline" (`extend.current`), **New deadline \***, **Why extend? \*** (quick pick + alasan), "Impact of change", "Recorded in Deadline history and Project activity." → **Save** ("Deadline extended"). Port copy dari `projects.extend.jsx`.

**Edit project** (`projects.edit`): "Edit project"; Project name, Description, Status (`Draft/Active/On hold/Done/Canceled`, hint "Status can move to any other, even from Done back to Active."), Lead, Priority (chips), Start date (bila sudah mulai), Deadline; catatan "Need more time and want the reason on record? Use Extend deadline on the project page." → **Save changes** (`editProject`, rename juga memanggil `renameProjectTasks` W1).

**Move to Archive** (`projects.archive`): judul **"Move project to Archive?"**, sub nama proyek; "“<nama>” and its <n tasks> leave every list and wait in Archive."; kotak "Restore brings the project back with all its tasks. Only an Admin can delete it forever."; **Cancel** / **Move to Archive** (danger). Aksi: `archiveProject` (memanggil `takeProjectTasks`) → `router.dismissTo('/projects')` → snack **"Project moved to Archive"** + **Undo** (`restoreProject` + `putTasksBack`).

## 6. Data dan logika

| Berkas baru | Port dari | Isi |
|---|---|---|
| `sample/projects.extra.ts` | `sample.js` `projects[].health/why/dueLong/extended`, `atlas`, `story`, `templates` | `PROJECT_EXTRA: Record<id, …>`, `PROJECT_DETAIL` (atlas: `timeElapsed`, `started`, `daysLeft`, `phases`, `phaseNow`, `phasePct`, `nextMilestone`, `activity`, `deadlineHistory`, `extend`), `PROJECT_STORY`, `PROJECT_TEMPLATES` (tanggal ISO) |
| `projects.query.ts` | `projects.query.js` | `STATUSES`, `HEALTHS`, `SORTS`, `BASE_QUERY`, `isFiltered`, `applyQuery`, `searchProjects` |
| `projects.people.ts` | `projects.people.jsx` | `ofWho(list, who, me)`, `teammates(list, me)`, `whoLabel(who, member)` |
| `projects.store.ts` | `projects.store.js` | `editProject`, `archiveProject`, `restoreProject`, `taskCountOf`, `listArchivedProjects`, `resetProjects` (`createStore` W0) |
| `projects.ts` | — | Titik tukar API: `getProjectsList(role, { who, query, search })`, `getProjectDetail(role, id, tab)` → `{ header, canEdit, menu, overview \| tasks \| phases \| members }`, `getProjectCreate()`, `getProjectEdit(id)`, `getProjectExtend(id)` |

- Sampel Sesi B `sample/projects.ts` (`id, name, status, lead, progress, due ISO, members, …`) dibaca, tidak diubah (K7).
- `ACTIONS` per tugas (#12/#17/#14/#15) adalah data demo prototipe; port sebagai turunan status (`To do` → Start working, `In progress` → Request review, `In review` → Review) agar tidak terikat nomor — catat perbedaan ini di tes.

## 7. Berkas layar (`src/screens/projects/`, tiap ≤ 150 baris)

`projects.strings.ts`; `list/projects.screen.tsx` (menggantikan placeholder T5), `list/project-card.tsx`, `list/people-row.tsx`; `filter/projects-filter.screen.tsx`; `detail/project-detail.screen.tsx`, `detail/detail-header.tsx`, `detail/overview.tab.tsx`, `detail/tasks.tab.tsx`, `detail/task-card.tsx`, `detail/phases.tab.tsx`, `detail/members.tab.tsx`; `sheets/extend.screen.tsx`, `sheets/archive.screen.tsx`; `edit/project-edit.screen.tsx`; `new/new.screen.tsx`, `new/form.screen.tsx`, `new/story.screen.tsx`, `new/draft.screen.tsx`, `new/template.screen.tsx`.

## 8. Komponen dan interaksi

- gluestack: Card, Badge (StatusPill), Progress, Avatar, Button, Input, Textarea, Select, Checkbox, Radio, Menu, AlertDialog (Remove member, ubah role).
- People row: `ScrollView horizontal`, avatar `Pressable` dengan `accessibilityState={{ selected }}` dan label nama.
- Tidak ada gesture khusus selain papan W1. Header detail + tab tetap di atas saat scroll (`stickyHeaderIndices` pada baris alat tab Tasks, padanan `pj-tools` sticky).
- Keyboard: story (textarea 2000 karakter) dan form panjang → §7 main doc.

## 9. Risiko

| Risiko | Penanganan |
|---|---|
| Detail hanya punya data Atlas | Keputusan §1; tes kedua jalur |
| Papan di dalam ScrollView vertikal detail | Papan W1 sudah dirancang di dalam halaman vertikal; uji tahan kartu di tab Tasks proyek |
| Arsip proyek memindahkan tugasnya | Tes store gabungan: arsip → tugas hilang dari list Tasks; Undo → kembali |
| Rename proyek | `renameProjectTasks` agar list tugas tetap cocok (port perilaku prototipe) |

## 10. Tes (`__tests__/projects/`)

- **Unit**: `projects.query` (filter status/health, tiga urutan, isFiltered), `projects.people` (ofWho 'me'/nama, teammates tanpa saya, whoLabel member vs lainnya), `projects.store` (edit, archive + task take, restore + put back, reset).
- **Port tes prototipe**: `projects.filter`, `projects.people` (chip My projects tidak untuk Member, toggle, Clear, Back mempertahankan `who`), `projects.tasks` (List/Kanban mempertahankan query, aksi per status, Member hanya View), `projects.edit` (Save, rename), `projects.create` (tiga cara, story → draft → create), `archive.undo` (proyek).
- **Route**: Member membuka `/projects/new` → Redirect; tab param mengganti isi tanpa push.
- Aksesibilitas: people row (label + selected), tab detail (`accessibilityRole="tab"` + selected).
