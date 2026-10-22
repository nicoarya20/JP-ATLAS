# Wrike — Deep Research: Project & Task Core

> Research date: 2026-09-28 | Source: wrike.com (live exploration via browser, trial account)

---

## 1. Overview & Positioning

Wrike memposisikan diri sebagai **"Collaborative Work Management Platform"** — enterprise-grade PM tool yang menyasar tim marketing, creative, PMO, IT, dan professional services. Target market utama adalah mid-market hingga enterprise (150+ karyawan).

**Tagline:** *"The most powerful work management platform"*

**Hierarchy utama:**
```
Account (Organization)
  └── Space (business unit / departemen)
        ├── Project (unit kerja utama)
        │     └── Task (pekerjaan individual)
        │           └── Subitem (nested, multi-level)
        └── Folder (pengelompokan tanpa timeline)
```

---

## 2. Navigation & Sidebar

Sidebar kiri berisi:
- **Search** (⌘K) — global search tasks, projects, files, comments
- **Inbox** — notifikasi & update
- **Whiteboards** — kolaborasi visual (powered by Klaxoon, badge "New")
- **More** — akses fitur tambahan
- **Space section** — berisi daftar project, folder, tools (dashboard), dan databases

**Top bar (per project):**
- AI agents (link ke pengaturan AI agents)
- Share button
- Trial days left indicator
- Wrike Assistant (Help Center)
- **Create new** (tombol global)

**Per project header:**
- Item type indicator (Project)
- Project name (editable inline)
- Info button
- Pin to sidebar
- **Copilot** button (AI)

---

## 3. Create Menu — Semua yang Bisa Dibuat

Klik tombol **"Create new"** (top-right) → dialog **"Select an item to create"**:

| Item | Fungsi |
|------|--------|
| **Task** | Buat task individual |
| **Project** | Buat project baru |
| **Folder** | Buat folder pengelompokan |
| **Space** | Buat business unit / departemen baru |
| **Request** | Buat request form submission |
| **Invite** | Undang anggota tim |
| **Whiteboard** | Buat papan kolaborasi visual (badge "New") |

Dialog juga memiliki:
- Search bar untuk mencari item, blueprint, atau custom item type
- Tombol "Customize this menu" untuk konfigurasi shortcuts

---

## 4. Task — Create Flow

### 4.1 Quick Create Dialog (dari Create → Task)

```
┌─────────────────────────────────────────┐
│ Save to: [First project 🚀]    [×]      │
│                                         │
│ Name: _________________________________ │
│                         [task ▼ Task]   │
│                                         │
│          [Add and open]   [Cancel]      │
└─────────────────────────────────────────┘
```

**Minimal fields saat create:**
- Nama task
- Location (project/folder target) — auto-filled dari context
- Item type (Task, atau custom item type lain)

Klik **"Add and open"** → langsung buka task detail panel.

### 4.2 Inline Create dari Board View

- Tombol `+ Item` di bawah setiap kolom status
- `Add item to [Status]` button di header kolom
- Ketik nama → Enter untuk simpan inline

### 4.3 Inline Create dari Table View

- Tombol `+ Item` di bawah list (shortcut: `Ctrl+Shift+N`)
- Edit field langsung di cell tabel

---

## 5. Task — Detail View

Task detail panel muncul sebagai **side panel** (tidak full page, overlay di kanan) saat klik task.

### 5.1 Header Panel

```
[Task icon] [Task title — editable textarea]
[Copy link]  [More actions ···]  [×]

Location breadcrumb: [First project 🚀]  [+ Add location]
```

**Catatan:** Task bisa berada di **multiple locations** (cross-project task).

### 5.2 Core Fields (selalu terlihat)

| Field | Detail |
|-------|--------|
| **Status** | Badge + Checkbox "Change to Completed". Status bisa dikustomisasi per workflow |
| **Assignee** | Multiple assignee, avatar + nama. Bisa tambah/remove |
| **Date** | Start date — End date, tampil durasi dalam hari (e.g., "24 – 30 Sep (5d)") |

### 5.3 Extended Fields (klik "Show more fields")

| Field | Detail |
|-------|--------|
| **Importance** | Low / Normal / High / Critical |
| **Author** | Auto-filled, siapa yang membuat |
| **Created date** | Otomatis |
| **Item type** | Task / Project / atau Custom item type |
| **ID** | Numeric ID unik per item |
| **Time spent** | Manual entry atau timer |
| **Work schedule** | Assignee's work schedule / custom |

**More fields (custom):**
- Bisa tambah custom field seperti Budget ($), Impact, dll
- Search field tersedia di drawer "Show more fields"
- Tombol "Show fields in side panel" untuk tampilkan semua

### 5.4 Attachments & Linked Content

```
[2 subitems]  [1 file]  [Add whiteboard ✦New]  [Approval]  [+1 more]

[▶ Start timer]  [0:00 Add entry]
```

| Tombol | Fungsi |
|--------|--------|
| **Subitems** | Nested task (infinite nesting) |
| **Files** | Attach file, dengan proofing/approval |
| **Whiteboard** | Visual board (powered by Klaxoon) |
| **Approval** | Formal approval workflow |
| **Time tracking** | Timer + manual entry |

### 5.5 Description

Rich text editor dengan:
- Formatting tools (bold, italic, colors, highlights)
- Attach file via drag & drop
- **"Write with AI"** button (lihat bagian AI)

### 5.6 Comment Area

```
[Avatar] Try @mentioning people to get their attention...
[Attach][Mention][@][Format][AI Assistant][@ AI agent]  [Send]
```

---

## 6. Project — Create & Detail

### 6.1 Project Create

Sama seperti Task, dari Create new → Project:
- Nama project
- Location (space target)
- Item type: Project

### 6.2 Project Info Panel

Dibuka via tombol **"Info"** di project header.

**Fields project:**
- Status (In Progress, dll)
- Assignee
- Date (project timeline)
- **Progress** (% completion)
- Author
- Created date
- Item type: Project
- ID
- **Booked effort** (planned hours)
- Time spent
- Custom fields (Budget, Impact)

**Tabs/attachments project:**
- Subitems (tasks di dalam project)
- Files
- Whiteboard
- Approval

**Description:** "Add a description or **write with AI**"

### 6.3 Project Views

Setiap project bisa diakses via 6 views:

| View | Fungsi |
|------|--------|
| **Table** | Spreadsheet-like dengan columns (Name, Assignee, Status, Due date, custom fields, Files). Bisa tambah kolom kustom. |
| **Board** | Kanban dengan kolom status (New / Planned / In Progress / In Review / Completed). Bisa tambah status baru. |
| **Gantt chart** | Timeline / dependency view |
| **Files** | Gallery semua file di project |
| **Analytics** | Dashboard data visualization bawaan |
| **Calendar** | Calendar view (hidden by default) |

Views bisa di-pin ke sidebar dan dikonfigurasi per-project.

---

## 7. Edit Task/Project

### 7.1 Inline Editing

- **Title**: Klik langsung di textarea header panel
- **Status**: Klik badge status → dropdown pilih status
- **Assignee**: Klik area assignee → search/pilih member
- **Date**: Klik date → date picker dengan start/end
- **Custom fields**: Klik value langsung di panel

### 7.2 Bulk Edit (Table View)

- Checkbox select multiple rows
- Edit field langsung di cell (click to edit)
- Columns bisa disort, filter, dan diatur

### 7.3 More Actions (··· menu)

Context menu per task mencakup aksi seperti duplicate, move, share, delete, dll.

---

## 8. Space Settings — Konfigurasi per Business Unit

Dari **Space Settings** (gear icon):

| Tab | Fungsi |
|-----|--------|
| **General** | Nama space, avatar |
| **Custom item types** | Buat tipe item baru (Bug, Epic, Story, dll) |
| **Custom fields** | Buat field kustom (text, number, date, dropdown, dll) |
| **Workflows** | Kustomisasi status per workflow (Task workflow, Project workflow) |
| **Automation** | Rule-based automation (if-then triggers) |
| **Request forms** | Form intake untuk external atau internal request |
| **Blueprints** | Template project yang bisa di-reuse |
| **Work schedule** | Jadwal kerja tim (untuk kalkulasi durasi) |
| **AI agents** | Konfigurasi AI agent (no-code automation) |

---

## 9. Fitur AI Wrike

Wrike memiliki **ekosistem AI berlapis** — salah satu yang paling komprehensif di PM tools.

### 9.1 Copilot (per Project)

Tombol **"Copilot"** di header setiap project/folder. Panel chat di kanan.

**Kapabilitas Copilot:**
1. **Find Insights** — query data project: status task, due dates, risks
   - *"What is the status of the 'Q4 Report' task?"*
   - *"Are there any risks in this project?"*
2. **Analyze Your Work** — agregasi & visualisasi:
   - *"Show me a chart of my overdue tasks per assignee."*
3. **Search Your Knowledge** — cari di konten Wrike:
   - *"What is the process for requesting time off?"*

**Quick prompts bawaan:**
- "What can Copilot do?"
- "What's the goal of this project?"
- "What's the progress?"
- "Is anything overdue?"

**Tabs Copilot:** Ask | Visualize | Search

### 9.2 Write with AI (Description)

Di task/project description, ada tombol **"write with AI"**:

Dialog: **"Write a description with AI"**

```
Describe what to write:
[Write a plan for...]

Or select an option below:
• Action items...
• Campaign plan...
• Event plan...
• Marketing text...
• Meeting agenda...
• Project brief...
• Project management document...
```

### 9.3 AI Agents (Automasi No-Code)

Fitur paling unik Wrike — **AI Agents** yang bisa dibuat tanpa coding.

**Cara membuat:**
- Chat-based: Deskripsikan apa yang agent harus lakukan dalam bahasa natural
- Manual: Konfigurasi sendiri via form
- Templates: Ready-made agent dari Wrike

**Template agent bawaan:**
| Template | Fungsi |
|----------|--------|
| **Revision Tracker agent** | Menghitung jumlah revisi dan menambahkan komentar setiap kali pekerjaan kembali ke status review |
| **Project Coordinator agent** | Setup project baru: assign subtask, jadwalkan deadline, kirim kickoff email ke Customer Success Manager |
| **Missed Deadline agent** | Alert kepada orang yang tepat tentang task/project terlambat, dengan konteks masalah dan saran langkah berikutnya |

**Community Library:** https://community.wrike.com — share & reuse AI agent configs dari tim Wrike dan komunitas.

**Integrasi agent di task:**
- Tombol **"@mention an AI agent"** di comment area
- AI agent bisa dinotifikasi langsung dari konteks task

### 9.4 AI Assistant (Comment)

Di toolbar comment area: tombol **"AI Assistant"** (saat comment field aktif) — membantu menulis/format komentar.

---

## 10. Selling Points & Differentiators vs Kompetitor

### 10.1 AI Agents — Fitur Paling Unik

Wrike adalah satu-satunya PM tool mainstream yang menawarkan **no-code AI agent builder** yang:
- Bisa di-describe lewat chat natural language
- Punya template siap pakai
- Bisa di-@mention dari dalam task comment
- Punya community library untuk sharing konfigurasi

**vs Asana:** Asana punya "AI Teammates" tapi belum bisa di-@mention dari task
**vs ClickUp:** ClickUp Brain adalah AI general, bukan agent yang bisa diprogram
**vs Linear:** Tidak ada AI agent
**vs Monday:** Ada automation rules tapi bukan AI agent
**vs Notion:** Tidak ada AI agent untuk task automation

### 10.2 Approval Workflow Built-in

Wrike punya **formal approval system** langsung di dalam task:
- Assign approver
- Track approval status
- File proofing (image/video/PDF bisa di-annotate dan di-approve)
- Review workflow yang terintegrasi

Ini khususnya kuat untuk tim **marketing & creative** yang butuh approval loop.

### 10.3 Copilot — AI yang "Project-Aware"

Copilot di Wrike bisa menjawab pertanyaan spesifik tentang **data project aktif** (bukan hanya general AI assistant). Bisa:
- Query task data dalam natural language
- Generate chart/visualisasi dari data project
- Search knowledge dalam context project

### 10.4 Multi-Hierarchy yang Fleksibel

Struktur Space → Project → Task → Subitem yang dilengkapi:
- **Cross-project task** (task bisa ada di multiple location)
- **Custom item types** (buat tipe item sendiri: Bug, Epic, Story, dll)
- **Databases** (structured data store — tersendiri dari project)

### 10.5 Enterprise-Grade Customization

| Fitur | Detail |
|-------|--------|
| Custom workflows | Buat workflow status sendiri per space |
| Custom item types | Buat entitas baru (bukan hanya Task/Project) |
| Blueprints | Template project yang reusable |
| Request forms | External/internal intake form |
| Work schedules | Kalkulasi effort berdasarkan jadwal kerja tim |
| Booked effort tracking | Planned vs actual hours |

### 10.6 Whiteboard Terintegrasi (via Klaxoon)

Whiteboard langsung bisa dilampirkan ke task atau project — untuk brainstorming, wireframing, atau retro — tanpa keluar dari Wrike. Fitur ini masih baru (badge "New").

---

## 11. Pain Points & Limitasi (Hasil Observasi)

| Issue | Detail |
|-------|--------|
| **UI complexity** | Banyak panel dan tombol, learning curve cukup tinggi |
| **Copilot ada di project, bukan di task** | Untuk context task individual, hanya ada AI di comment — belum per-task |
| **Write with AI terbatas** | Hanya untuk description, belum untuk nama task atau custom field |
| **Whiteboard masih "New"** | Integrasi Klaxoon terasa masih tempelan, bukan native |
| **Create task minimal** | Dialog create task sangat sederhana, semua detail harus diisi di detail view setelah buat |
| **Trial 13 hari** | Cukup singkat untuk eksplorasi enterprise features |

---

## 12. Ringkasan Positioning

```
Wrike = Enterprise PM + AI Automation + Creative/Marketing Workflow
         ↑                  ↑                    ↑
    Custom types &      AI Agents &         Proofing &
    deep hierarchy      Copilot              Approval
```

**Target ideal:** Tim marketing/creative/PMO di perusahaan 50-5000 orang yang butuh:
- Approval workflow yang formal
- AI automation tanpa engineering
- Customizable workflows per departemen
- Single source of truth untuk project + assets + approval

**Bukan untuk:** Tim development yang butuh code integration (vs Linear/Jira), atau tim kecil yang butuh simplicity (vs Trello/Notion).
