# Linear — Research Mendalam: Project & Task Management

> **URL:** https://linear.app  
> **Kategori:** Issue Tracker / Project Management untuk tim engineering  
> **Positioning:** "The issue tracking tool you'll enjoy using" — dirancang untuk kecepatan dan developer productivity  
> **Tanggal Research:** 2026-09-28

---

## Ringkasan Eksekutif

Linear bukan sekadar task tracker. Ini adalah tool yang dibangun dari perspektif **developer-first** — setiap fitur dirancang agar gestur (keyboard shortcut, shortcut copy, integrasi Git) terasa natural bagi engineer. Linear kini menambahkan **Linear Agent** sebagai AI layer yang deeply embedded, bukan sekadar chatbot tempel.

---

## 1. ISSUE (Task) — Create

### Cara Membuka
- Keyboard shortcut: **`C`** dari mana saja
- Tombol "Create new issue" di header
- Tombol "+ Create new issue" di setiap status column

### Form Create Issue (Modal Compact)

| Field | Tipe | Keterangan |
|-------|------|------------|
| **Title** | Text input | Required, placeholder "Issue title" |
| **Description** | Rich text | Placeholder "Add description…", editor penuh |
| **Status** | Dropdown | Backlog / Todo / In Progress / Done / Cancelled |
| **Priority** | Dropdown | No Priority / Urgent / High / Medium / Low |
| **Assignee** | Person picker | "Currently no one is assigned" |
| **Project** | Project picker | "No project" sebagai default |
| **Labels** | Multi-select | "No labels" sebagai default |
| **More actions** | Submenu | Lihat di bawah |

### More Actions (di Create Issue)
- **Set due date** (`⇧D`) — date picker
- **Make recurring…** — jadikan issue berulang (mingguan, bulanan, dll.)
- **Add link…** (`Ctrl+L`) — lampirkan URL ke issue
- **Add sub-issue** (`⌘⇧O`) — buat child issue langsung saat create

### Fitur Tambahan di Create
- **Checkbox "Create more"** — tetap buka modal setelah create, untuk input cepat massal
- **Tombol Expand** — membuka form full-screen (editor besar, description luas)
- **Team prefix** — issue otomatis diberi prefix (misal `NIC-6`) berdasarkan team
- **Attachment** (gambar, file, video) — bisa dilampirkan langsung dari modal

### UX Highlight
- Modal bisa di-expand ke mode full-page tanpa menutup dan membuka ulang
- "Create more" mode memungkinkan input ratusan issue tanpa friction
- Keyboard shortcut tersedia untuk hampir semua field

---

## 2. ISSUE (Task) — Detail & Edit

### Layout Halaman Detail

```
[Header: NIC-5 test ★ ···]
[URL | ID | Branch | Copy as Prompt ▼ | Choose Coding Tool ▼]

[Kiri: Title (editable) + Description (rich text)]
[Kiri: Reactions | Attachments | Sub-issues]
[Kiri: Activity (comments + history)]

[Kanan: Properties sidebar]
  - Status
  - Priority
  - Assignee/Assign
  - Labels
  - Project (+ link ke project)
```

### Properties Sidebar (Kanan)
| Properti | Aksi |
|----------|------|
| Status | Click to change (Backlog/Todo/In Progress/Done/Cancelled) |
| Priority | No Priority / Urgent / High / Medium / Low |
| Assignee | Assign ke member workspace |
| Labels | Multi-label |
| Project | Link ke project, dengan link shortcut ke project overview |

### Issue Options Menu (`···`)

```
── Due date (⇧D)         → Date picker
── Add link… (Ctrl+L)    → Simpan URL terkait
── Add document…         → Lampirkan dokumen
─────────────────────────
── Create related ▶
      Issue…
      Sub-issue… (⌘⇧O)
      Parent issue…
      Blocked issue…      ← Dependency tracking
      Blocking issue…     ← Dependency tracking
── Mark as ▶
─────────────────────────
── Copy ▶
── Convert to ▶
      Project…            ← Issue bisa dikonversi jadi Project
      Template…           ← Issue bisa disimpan sebagai template
      Recurring issue…    ← Issue bisa dijadikan recurring
── Make a copy…
─────────────────────────
── Favorite (⌥F)
── Remind me (⇧H) ▶
── Subscribe (⇧S)
─────────────────────────
── Run loop…              ← AI AUTOMATION FEATURE
─────────────────────────
── Show description history
── Delete (⌘⌫)
```

### Shortcut Bar di Header Issue

```
[Copy URL]  [Copy ID]  [Copy Branch Name]  [Copy as Prompt ▼]  [Choose Coding Tool ▼]
```

| Tombol | Fungsi |
|--------|--------|
| Copy URL | Salin URL issue |
| Copy ID | Salin ID singkat (misal `NIC-5`) |
| **Copy Branch Name** | Salin nama branch Git yang diformat dari title issue |
| **Copy as Prompt** (`⌘⌥P`) | Konversi issue ke format AI prompt |
| **Choose Coding Tool** | Pilih AI coding assistant (Claude, Copilot, Cursor, dll.) |

### Activity Section
- Timeline kejadian (create, status change, assignment change)
- Komentar berthread
- Emoji reactions pada issue
- Subscribe/Unsubscribe untuk notifikasi
- Subscriber visible

---

## 3. PROJECT — Create

### Form Create Project (Modal)

| Field | Tipe | Keterangan |
|-------|------|------------|
| **Name** | Text input | "Project name" |
| **Summary** | Short text | "Add a short summary…" (1 baris singkat) |
| **Status** | Dropdown | Backlog / Planned / In Progress / Paused / Completed / Cancelled |
| **Priority** | Dropdown | No Priority / Urgent / High / Medium / Low |
| **Lead** | Person picker | Satu orang project lead |
| **Members** | Multi-person | Semua member project |
| **Start date** | Date picker | Tanggal mulai |
| **Target date** | Date picker | Deadline target |
| **Labels** | Multi-select | Kategorisasi project |
| **Dependencies** | Project picker | Blokir/bergantung ke project lain |
| **Description** | Rich text editor | "Write a description, a project brief, or collect ideas…" |
| **Milestones** | Section | Tambah milestone inline saat create |

### Fitur Unik di Create Project

- **"Create with Agent" button** — AI mode: tulis deskripsi project dalam bahasa natural, Linear AI akan generate seluruh struktur project (issues, milestones, assignments)
- **Milestones bisa langsung ditambahkan** saat create, bukan setelah

---

## 4. PROJECT — Detail

### Navigasi Tab

```
[Overview]  [Activity]  [Issues]  [+ Add view]
```

### Overview Tab

**Bagian Kiri (Main Content)**
- Project icon (custom emoji/icon)
- Project name (editable inline)
- Summary (editable inline)
- **Properties bar** (horizontal): Status, Priority, Lead, Target date, Teams, `···`
- **Resources section**: "Add document or link…" — bisa lampirkan Notion doc, Figma, Google Doc, dll.
- **Project update** area: "Write first project update" — status update narasi ke seluruh tim
- **Description** (rich text editor penuh)
- **+ Milestone** button — tambah milestone ke dalam project

**Bagian Kanan (Sidebar)**
```
Properties ▼  [+ add dependency]
  Status:   Backlog
  Priority: No priority
  Lead:     Add lead
  Members:  Add members
  Dates:    [Start] → [Target]
  Teams:    Nico-project
  Slack:    Slack channel
  Labels:   Add label

Milestones ▼  [+]
  (Add milestones to organize work within your project)

Progress ▼
  Scope: 1    Completed: 0
  [Assignees]  [Labels]  (toggle)
  → breakdown per assignee atau label

Activity ▼  [See all]
  → Timeline terbaru
```

### Activity Tab
- Full timeline semua perubahan di project
- Issues dibuat/diubah/diselesaikan
- Komentar dari members
- Status update project

### Issues Tab
- List/Board view dari semua issues dalam project
- Filter, sort, grouping

---

## 5. AI FEATURES — Differentiator Utama

### 5.1 Linear Agent (Chat-based AI)

Accessible via: **sidebar "Agent"** atau tombol Agent di kanan bawah

```
[New chat  ▼]
┌─────────────────────────────────────────┐
│                                         │
│            [Linear icon]                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Ask Linear…                     │    │
│  │                                 │    │
│  │ [Skills ▼]  [📎]  [Send ↑]     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Capabilities:**
- Tanya tentang isi workspace (issues, projects, anggota)
- Buat/update issues via chat
- Generate project structure
- Analisis progress tim
- **Custom Skills** — tim bisa membuat "skills" (prosedur/instruksi custom) untuk Agent
- Attach gambar, file, video ke percakapan
- Chat history tersimpan

**Contoh use case Agent:**
- "Create 10 issues for the onboarding flow"
- "What issues are blocking the Q4 release?"
- "Summarize progress on the mobile project"
- "Assign all unassigned issues to me"

### 5.2 Create with Agent (Project Creation)

Saat membuat project baru:
- Klik **"Create with Agent"** di pojok modal
- Ketik deskripsi project dalam bahasa natural
- Linear AI generate: nama project, summary, milestones, daftar issues awal, assignees

### 5.3 Copy as Prompt (`⌘⌥P`)

Tombol di header setiap issue:
- Satu klik mengkonversi seluruh konteks issue (title, description, labels, status) menjadi **formatted AI prompt**
- Langsung bisa dipaste ke Claude, ChatGPT, Copilot chat, dll.
- Menjembatani PM workflow dengan coding workflow

### 5.4 Choose Coding Tool Integration

Dropdown di samping "Copy as Prompt":
- Pilih coding tool yang dipakai tim (Claude Code, GitHub Copilot, Cursor, Codeium, dll.)
- **Configure coding tools** — integrasi langsung agar issue context otomatis dikirim ke tool yang dipilih

### 5.5 Run Loop (AI Automation)

Di issue options menu `···` → "Run loop…":
- Jalankan **automated AI workflow** pada sebuah issue
- Contoh: AI secara otomatis memecah issue besar menjadi sub-issues
- Menjalankan recurring checks atau actions

### 5.6 Description History

`···` → "Show description history":
- Lihat semua versi description yang pernah diedit
- Siapa yang mengedit dan kapan
- Bisa restore ke versi sebelumnya

---

## 6. FITUR LAIN YANG PATUT DICATAT

### Recurring Issues
- Issue bisa diset recurring (harian, mingguan, bulanan)
- Otomatis membuat salinan issue baru saat jatuh tempo

### Issue Relationships
Linear mendukung 4 tipe relasi:
1. **Sub-issue** — hirarki parent/child
2. **Blocked by** — issue ini diblokir issue lain
3. **Blocking** — issue ini memblokir issue lain
4. **Related** — referensi longgar

### Views (Custom Views)
- Filter + sort + grouping tersimpan sebagai View
- Bisa di-favorite
- Bisa di-share ke team

### Milestones dalam Project
- Breakdown project jadi stages/fase
- Setiap milestone punya deadline
- Issues bisa di-assign ke milestone

### Project Dependencies
- Project bisa memblokir project lain
- Visible di sidebar project

### Git Integration
- **Auto-generate branch name** dari issue title
- Format: `username/NIC-5-issue-title`
- Tinggal copy langsung ke terminal

---

## 7. SELLING POINTS vs. KOMPETITOR

| Aspek | Linear | Jira | Asana | ClickUp |
|-------|--------|------|-------|---------|
| **Kecepatan UI** | ⚡ Paling cepat | 🐢 Lambat | 🟡 Sedang | 🟡 Sedang |
| **Keyboard-first** | ✅ Semua punya shortcut | ❌ Minimal | ❌ Minimal | ✅ Lumayan |
| **AI native** | ✅ Agent + AI create | ⬜ AI terbatas | ⬜ AI dasar | ✅ Lumayan |
| **Developer tools** | ✅ Branch copy, coding tool | ✅ Git integrasi | ❌ Minimal | ❌ Minimal |
| **Issue as AI Prompt** | ✅ Copy as Prompt | ❌ | ❌ | ❌ |
| **Create with AI** | ✅ Project + issues | ❌ | ❌ | ✅ Partial |
| **Recurring issues** | ✅ | ✅ | ✅ | ✅ |
| **Sub-issues** | ✅ | ✅ | ✅ | ✅ |
| **Dependencies** | ✅ | ✅ | ✅ | ✅ |
| **Milestones** | ✅ Per project | ✅ | ✅ | ✅ |
| **Slack integration** | ✅ Per project | ✅ | ✅ | ✅ |

### Unique Selling Points Linear

1. **Speed = Culture** — UI desain untuk minimal klik. Shortcut `C` untuk create, `G` kemudian `I` untuk navigate — developer langsung merasa di rumah.

2. **Issue ↔ Code bridge** — "Copy branch name", "Copy as prompt", "Choose coding tool" menghubungkan PM workflow ke dev workflow dalam satu klik.

3. **Linear Agent** — AI yang benar-benar mengerti konteks workspace. Bisa query isi workspace, bukan sekadar generic chatbot.

4. **"Create with Agent"** untuk project — bisa generate seluruh project structure dari satu kalimat deskripsi.

5. **Custom AI Skills** — tim bisa mendefinisikan instruksi/prosedur custom untuk Agent, menjadikannya asisten yang contextual ke kebutuhan spesifik tim.

6. **Run Loop** — AI automation built in pada setiap issue, tanpa perlu tool/platform automation terpisah.

7. **Developer trust** — dipakai oleh top engineering teams, sehingga ada "credibility pull" ke adoption.

---

## 8. PAIN POINTS / KELEMAHAN

1. **Bukan untuk non-technical team** — UX dan terminologi masih engineering-heavy (issue, backlog, branch)
2. **Tidak ada time tracking native** — harus pakai integrasi pihak ketiga
3. **Tidak ada Kanban timeline/Gantt native** — hanya list + board, tidak ada roadmap visual built-in (ada di plan berbayar sebagai "Roadmaps")
4. **Terbatas untuk non-software projects** — design sprint, marketing campaign terasa janggal
5. **Pricing** — lebih mahal dari ClickUp di tier equivalent
6. **Mobile app** — kurang mature dibanding desktop experience

---

## 9. KESIMPULAN UNTUK REFERENSI PM KITA

Linear membuktikan bahwa **kecepatan + AI embedding + developer workflow** adalah kombinasi yang sangat kuat untuk tim engineering. Hal-hal yang bisa diadaptasi:

- **"Copy as prompt"** — konversi task ke AI prompt, menjembatani PM dan dev
- **Create with AI** — bukan AI chatbot terpisah, tapi embedded di form create project/issue
- **Issue relationships** (blocked by/blocking) — dependency tracking yang proper
- **Keyboard shortcuts** — setiap action punya shortcut, user bisa kerja tanpa angkat tangan dari keyboard
- **"Create more" mode** — input massal task tanpa friction
- **Branch name auto-generation** — mengurangi context switching untuk developer
- **Project update** — narasi status update per project, bukan hanya metric chart

---

*Research ini berdasarkan explorasi langsung pada akun Linear aktif (2026-09-28). Beberapa fitur premium mungkin tidak terexplore karena keterbatasan akun trial/free.*
