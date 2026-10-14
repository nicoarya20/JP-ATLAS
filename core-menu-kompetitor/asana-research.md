# Asana — Deep Research: Project & Task Core

> Research date: 2026-09-28 | Source: app.asana.com (live exploration via browser)

---

## 1. Overview & Positioning

Asana memposisikan diri sebagai **"Work Management Platform"** — bukan sekadar task manager, tapi sistem pengelola kerja lintas tim dari level goal strategis sampai task harian.

**Tagline AI mereka:** *"I'll help you stay on top of your work in Asana — flagging what matters, surfacing what's next, and jumping in when you need a hand."*

**Hierarchy utama:**
```
Goals (strategic OKR)
  └── Portfolios (kumpulan project)
        └── Projects (unit kerja utama)
              └── Sections (pengelompokan, e.g. Phase 1: Planning)
                    └── Tasks (pekerjaan individual)
                          └── Subtasks (nested, unlimited level)
```

---

## 2. Navigation & Sidebar

Sidebar dibagi ke dalam **5 area utama** (bisa di-switch dengan ikon besar di sidebar kiri):

| Area | Isi |
|------|-----|
| **Work** | Home, Inbox, My tasks, Projects, Portfolios, Project list |
| **Agents** | AI Teammates (Trial), Automations, Project templates, Forms, Custom fields |
| **Strategy** | Goals, Portfolios strategis |
| **Knowledge** | Pages/Docs, Files |
| **People** | Team management, Workload |

**Top bar:**
- `+ Create` button (global)
- `Search` (⌘K)
- `Work with Dash` (AI assistant, always visible)

---

## 3. Create Menu — Semua yang Bisa Dibuat

Klik tombol `+ Create` memunculkan menu:

| Item | Fungsi |
|------|--------|
| **Task** | Buat task baru via quick dialog |
| **Project** | Buka template gallery untuk buat project baru |
| **Page** | Buat dokumen/wiki |
| **Message** | Kirim pesan ke tim |
| **Portfolio** | Buat portfolio (kumpulan project) |
| **Goal** | Buat OKR / strategic goal |
| **AI Teammate** | Buat AI agent baru (Trial) |
| **Invite** | Undang anggota tim |

---

## 4. Task — Create Flow

### 4.1 Quick Create Dialog (dari tombol Create → Task)

Dialog floating muncul dengan field:

```
┌─────────────────────────────────────────┐
│ Task name                               │
│ For: [Assignee]    in: [Project]        │
│                                         │
│ Description...                          │
│ [Insert][Format][Emoji][@][Attach][AI✨]│
│ [Due date]          [Collaborators]     │
│                         [Create task]   │
└─────────────────────────────────────────┘
```

**Field yang tersedia:**
- **Task name** — plain text input
- **For (Assignee)** — dropdown pilih anggota tim
- **In (Project)** — assign ke project tertentu
- **Description** — rich text editor
- **Due date** — date picker
- **Collaborators** — bisa tambah beberapa orang

**Toolbar description:**
| Icon | Fungsi |
|------|--------|
| Insert | Paragraph, H1/H2/H3, Bulleted list, Numbered list, Quote, Code block, Table, Section break, Emoji, Image, Mention, Embed link |
| Formatting | Bold, Italic, dll |
| Emoji | Emoji picker |
| @ | At-mention teammate |
| Attach | Upload file / paste image |
| **AI ✨** | **AI assist options** (lihat seksi AI) |

---

## 5. Task — Detail View (Full)

Ketika task diklik dari project list, panel detail terbuka di sebelah kanan (atau bisa full screen).

### 5.1 Header Task

```
[✓ Mark complete]  [Planning Task 1]
[Approve] [Request changes] [Reject]     ← Approval workflow built-in
[👤 Collaborators] [Share] [👍 Like] [🔗 Copy link] [⛶ Full screen] [...] [✕]
```

### 5.2 Field-field Standar

| Field | Detail |
|-------|--------|
| **Assignee** | Pilih anggota tim, bisa kosong (No assignee) |
| **Due date** | Mendukung **date range** (Today – Oct 2), bisa di-clear |
| **Dependencies** | Hubungan blocking: task ini bergantung pada task lain |
| **Projects** | Multi-home: satu task bisa masuk **banyak project sekaligus** |

### 5.3 Custom Fields (per Project)

Setiap project bisa punya custom fields sendiri yang muncul di detail task:

| Field | Tipe | Contoh Value |
|-------|------|--------------|
| **Estimated time** | Duration | 30m, 1h, 2.5h |
| **Priority** | Dropdown (color-coded) | 🔴 High, 🟡 Medium, 🟢 Low |
| **Status** | Dropdown | Not started, In progress, Completed |
| **Stage** | Dropdown | Planning, Execution, Launch |
| **Workstream** | Multi-select | Product, Engineering, Design, Marketing |

> Custom fields ini muncul di inline list project view, bisa di-sort dan di-filter.

### 5.4 Description

Rich text editor dengan placeholder *"What is this task about?"*

Mendukung: Heading, List, Quote, Code, Table, Image, Embed, @mention.

### 5.5 Subtasks

```
Subtasks    [0 / 1]    [+ Add subtask]    [Filter/Sort]
─────────────────────────────────────────
☐  [task name]    [Due date]  [Assignee]  [Details →]
   └── 1 subtask (nested bisa dalam-dalam)
```

- Progress counter: `0 / 1` (completed/total)
- Filter & Sort subtasks independent dari parent
- Subtask punya link "Details" untuk buka detail subtask itu
- Subtask bisa punya sub-subtask lagi (unlimited nesting)

### 5.6 Attachments

Section untuk upload file, drag & drop.

### 5.7 Comments & Activity

```
[Comments] [All activity]    Sort: Oldest ▼
──────────────────────────────────────────
[NL] Add a comment or @mention a teammate
     [Insert][Emoji][@][❤️ Appreciations]
```

- Tab **Comments**: hanya komentar
- Tab **All activity**: semua perubahan (created, marked complete, field changes)
- **Appreciations** emoji reactions (bukan sekadar like)
- Activity log: timestamped, linked ke profile user

---

## 6. Project — Create Flow

### 6.1 Template Gallery

Klik `+ Create → Project` → Template Gallery dengan:

**3 opsi utama di atas:**
- `✨ Create with AI` — AI project generator
- `Import` — import dari CSV/Asana/dll
- `Blank project` — mulai dari nol

**Kategori template:**
- For you (AI-personalized)
- My organization
- Marketing
- Operations & PMO
- Productivity
- Manufacturing
- Professional services

**"Templates for you"** section: template AI yang dipersonalisasi berdasarkan role user.

---

## 7. Project — Views

Project punya **8 view** yang bisa di-switch via tab di atas:

| View | Fungsi |
|------|--------|
| **Overview** | Ringkasan project: status, milestones, key resources, team |
| **List** | Grid list seperti spreadsheet, kolom custom fields |
| **Board** | Kanban board — kolom = section/status |
| **Timeline** | Gantt chart dengan dependency lines |
| **Dashboard** | Chart & metrics otomatis dari data project |
| **Calendar** | Tampilan task di kalender |
| **Messages** | Thread pesan khusus project ini |
| **Files** | Semua attachment dalam project |

---

## 8. Project List View — Detail

### 8.1 Struktur

```
Project management                    [Set status] [Actions] [⭐ Starred]
[Overview][List][Board][Timeline][Dashboard][Calendar][Messages][Files]
──────────────────────────────────────────────────────────────────────
[+ Add task]  [More: Filter | Sort | Search]
──────────────────────────────────────────────────────────────────────
Name          | Assignee | Due date | Est. time | Priority | Status | Stage
══════════════════════════════════════════════════════════════════════
▼ Phase 1: Planning  [⚡ Automations] [+ Add task] [...]
  ☑ Planning Task 1   [1 subtask]           Today - Oct 2
  ☑ Planning Task 2                                        
  ☑ Planning Task 3                                        
  ◇ Milestone 1                             Oct 5         
  [+ Add task]
▼ Phase 2: Execution  [⚡ Automations]
  ☐ Execution Task 1                        Oct 6 - 8    
  ☐ Execution Task 2                        Oct 9 - 12
  ◇ Milestone 2                             Oct 13
▼ Phase 3: Launch  [⚡ Automations]
  ...
[+ Add section]
```

### 8.2 Fitur List View

- **Sections** sebagai grouping: collapsible, bisa di-rename, di-reorder
- **Automations** per section (⚡ icon) — atur aturan otomatis
- **Milestone** (◇ icon, berbeda dari task biasa)
- **Inline edit** task name langsung di list
- **Column headers**: klik untuk sort, tambah field custom via "+ Add field"
- **Drag & drop** task antar section
- **Move tasks between sections** button di setiap task row

---

## 9. Automation

Setiap section / project bisa punya **Automation Rules**:

> Contoh aturan: *"When a task is added to this section, set Priority to High"*

Accessed via:
- ⚡ icon di section header
- Sidebar Agents → Automations

---

## 10. AI Features — Lengkap

### 10.1 AI Assist di Task (Smart Editor)

Di description dan comment editor, ada tombol **AI ✨**:

- **Recommend edits** — AI menyarankan perubahan/perbaikan teks description

> Tersedia saat ada teks di description. Mengganti teks biasa dengan versi yang lebih terstruktur/jelas.

### 10.2 Dash — AI Assistant (Work with Dash)

**Akses:** Tombol `Work with Dash` di top bar, panel muncul di kanan.

```
┌─────────────────────────────────┐
│  Hi, I'm Dash         [⚙] [⛶] │
│                                 │
│  "I'll help you stay on top of  │
│  your work in Asana..."         │
│                                 │
│  ┌─────────────────────────┐   │
│  │ What should I work on   │   │
│  │ today?                  │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Draft my weekly status  │   │
│  │ update                  │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ How do I work with Dash?│   │
│  └─────────────────────────┘   │
│                                 │
│  Connect your apps: 📧🗄️💬...  │
│                                 │
│  [Project management] [Task X]  │
│  ________________________       │
│  [+] [@]              [↑ Send]  │
└─────────────────────────────────┘
```

**Kemampuan Dash:**
- Menjawab *"What should I work on today?"* — merangkum task prioritas dari semua project
- *"Draft my weekly status update"* — auto-generate status report minggu ini
- Membaca konteks project/task yang sedang dibuka (context chips)
- Connect ke Google Workspace (Gmail, Google Drive), Slack, dan app lain
- Chat-based interface, context-aware

**Catatan:** Dash is AI and can make mistakes (disclaimer di bawah input).

### 10.3 Create with AI — AI Project Generator

**Akses:** `+ Create → Project → Template Gallery → Create with AI`

**Flow:**
```
1. Ketik deskripsi project dalam bahasa natural
   → "Help me create a product launch project for a mobile app"

2. AI langsung generate project di panel kanan (real-time preview):
   - Nama project: "Mobile App Launch"
   - Sections: Planning, Development & Testing, Marketing & Promotion, Launch & Post-Launch
   - Tasks dengan: priority, status, date range
   - Views: List, Board, Timeline, Calendar

3. AI lanjutkan dengan follow-up question:
   "Do you have any existing planning docs, spreadsheets, or briefs you'd like to import?"
   → [+ Add files] atau paste Google Drive/OneDrive link
   → [Skip] atau [Next]

4. "Follow up or start a new request" untuk refinement lebih lanjut

5. [Go to project] untuk membuka project yang sudah dibuat
```

**Quick suggestion chips:**
- Work intake
- Organizational planning
- Strategic planning
- Event planning

**Interaksi lanjutan:** Bisa chat terus untuk revisi structure, tambah task, ubah timeline.

### 10.4 AI Teammates (AI Agents)

**Akses:** Sidebar → Agents → AI Teammates

```
AI Teammates                           [Create AI Teammate]
─────────────────────────────────────────────────────────
[AI Teammates] [Work]         Filter: Created by | Sort: Newest

Name                    | Description              | Status | Members | Last activity
────────────────────────────────────────────────────────────────────────────────────
Work Intake Specialist  | Replaces email intake... | Active |  👤 NL  | 3 days ago
```

**Konsep AI Teammate:**
> *"AI that works alongside you and your team, with shared memory and context. Each one is built for a specific kind of work, and ready to go from day one."*

- Persistent AI agents dengan **shared memory & context** (ingat history kerja tim)
- Setiap AI Teammate didesain untuk **satu jenis kerja spesifik**
- Contoh bawaan: **Work Intake Specialist** — menggantikan email intake dengan self-service workflows yang otomatis classify, route, dan prioritize requests
- Bisa dibuat custom via `Create AI Teammate`
- Status: Active / Inactive
- Tab **Work** menampilkan pekerjaan yang sudah dilakukan AI teammate

### 10.5 AI-Personalized Templates

Di Template Gallery, section **"Templates for you"**:
> *"Try these project templates made with AI tailored to your role."*

AI merekomendasikan template berdasarkan role dan usage pattern user.

---

## 11. Other Notable Features

### 11.1 Multi-homing Tasks
Task bisa **di-assign ke banyak project sekaligus** tanpa duplikasi. Di detail task, section "Projects" menampilkan semua project yang mengandung task ini, lengkap dengan section placement-nya.

> **Selling point besar**: Satu task bisa terlihat di Project A (Design) dan Project B (Sprint) sekaligus — tidak perlu copy-paste.

### 11.2 Approval Workflow Built-in
Di header task ada button:
- **Approve** — tandai sebagai disetujui
- **Request changes** — minta revisi
- **Reject** — tolak

Approval history masuk ke activity log.

### 11.3 Milestone Tasks
Tipe task khusus "Milestone" (◇ icon) untuk menandai pencapaian penting dalam timeline. Berbeda secara visual di List dan Timeline view.

### 11.4 Forms (Work Intake)
Sidebar → Agents → Forms: Buat form intake kerja yang hasilnya langsung jadi task di project tertentu. Ini adalah cara resmi Asana untuk work request management.

### 11.5 Portfolios
Kumpulkan banyak project ke dalam 1 Portfolio. Tampilkan status rollup, health indicators, dan progress semua project dalam satu view. Cocok untuk manager dan PMO.

### 11.6 Goals / OKR
Level tertinggi hierarchy: buat Goal strategis, link ke Portfolio/Project sebagai "supporting work". Dashboard goal menampilkan progress berdasarkan task yang terselesaikan.

---

## 12. Selling Points — Diferensiasi vs Kompetitor

| Diferensiator | Penjelasan |
|---------------|------------|
| **AI Teammates (Agents)** | AI persistent dengan shared memory dan context — bukan chatbot biasa, tapi AI yang "bekerja" dalam tim. Kompetitor belum ada yang sepersisten ini di level task management. |
| **Dash — Proactive AI** | AI assistant yang membaca seluruh workspace dan proaktif flagging prioritas. Bukan sekadar chatbot tapi advisor. |
| **Create with AI** | Generate project lengkap (nama, sections, tasks, dates, priorities) dari satu kalimat deskripsi. Real-time preview sambil AI generate. |
| **Multi-homing** | Task bisa ada di banyak project tanpa duplikasi — unik dan kuat untuk cross-functional teams. |
| **7+ Views** | Satu project bisa dilihat sebagai List, Board, Timeline (Gantt), Dashboard, Calendar, sekaligus — tidak perlu tool berbeda. |
| **Approval workflow** | Approve/Request changes/Reject built-in di setiap task — tidak perlu workaround. |
| **Full hierarchy (Goal → Task)** | Dari OKR sampai subtask dalam satu platform — kompetitor jarang yang cover semua level. |
| **Automations per Section** | Aturan otomatis bisa di-set per section/fase project, bukan hanya per project. |
| **Work Intake Forms** | Built-in form builder terintegrasi langsung ke project — bukan add-on. |

---

## 13. Kelemahan / Area yang Kurang

| Area | Catatan |
|------|---------|
| **Learning curve tinggi** | Banyak fitur dan konsep baru (multi-homing, portfolio, goal) membuat onboarding berat untuk user awam |
| **Harga premium** | Fitur AI, Timeline, Portfolio, Goals ada di tier mahal (Business/Enterprise) |
| **AI masih "Public Preview"** | Dash dan AI Teammates masih beta — "Dash is AI and can make mistakes" |
| **UI kompleks** | Dengan 5 section sidebar + 7+ views, user baru bisa overwhelmed |
| **Offline** | Tidak ada mode offline yang kuat |

---

## 14. Referensi Visual (Screenshots)

| Filename | Isi |
|----------|-----|
| `asana-home.png` | Home dashboard dengan My tasks, Projects, People widgets |
| `asana-create-menu.png` | Create dropdown menu |
| `asana-create-task.png` | Quick task creation dialog |
| `asana-ai-assist.png` | AI assist menu (Recommend edits) |
| `asana-project.png` | Project list view dengan sections dan custom fields |
| `asana-task-detail.png` | Full task detail panel |
| `asana-dash.png` | Dash AI assistant panel |
| `asana-create-project2.png` | Template gallery dengan Create with AI |
| `asana-ai-project-complete.png` | AI project generation result (Board preview) |
| `asana-agents-section.png` | AI Teammates management page |

---

*Ditulis berdasarkan eksplorasi langsung app.asana.com | September 2026*
