# ClickUp — Deep Research: Core Project & Task Features

> Research Date: 2026-09-28  
> Source: Live exploration di app.clickup.com  
> Fokus: Create, Edit, Detail View, AI Features, Selling Points

---

## 1. Hierarki Struktur Project

```
Workspace
  └── Space
        └── Folder (opsional)
              └── List
                    └── Task
                          └── Subtask
```

**Catatan penting:**
- Folder bersifat opsional — List bisa langsung di bawah Space
- Task bisa ada di banyak List sekaligus (Multi-List feature)
- Space bisa punya assignee, priority, dan dates sendiri (Space-level metadata)

---

## 2. CREATE TASK

### 2.1 Entry Points

| Entry Point | Deskripsi |
|-------------|-----------|
| **Tombol "Create task"** (top bar) | Buka modal create task full-featured |
| **"Add Task"** di List view | Inline create di baris list |
| **Shortcut Keyboard** | Quick access dari mana saja |
| **"Create" button** di sidebar | Shortcut create dari sidebar |
| **"/commands" dalam Task Name** | Ketik "/" untuk assign field langsung dari nama |

### 2.2 Modal Create Task — Fields Tersedia

**Header Modal:**
- Tabs tipe item: **Task** | Doc | Reminder | Whiteboard | Dashboard
- List selector (pilih di mana task masuk)
- Task Type dropdown: **Task** (default), **Milestone**, **Form Response**, **Meeting Note**

**Core Fields:**
| Field | Detail |
|-------|--------|
| **Task Name** | Textarea dengan support `/` commands dan `@mention` |
| **Description** | Rich text editor + "Write with AI" button |
| **Status** | Default: TO DO, IN PROGRESS, DONE (customizable per Space) |
| **Assignee** | Multiple assignees |
| **Due Date** | Start date + Due date (tanggal terpisah) |
| **Priority** | Urgent / High / Normal / Low |
| **Tags** | Multiple tags |
| **Custom Fields** | Via "More actions" button |

**Footer Modal:**
- **Templates** — template library tersedia
- **Attachments** — langsung attach file dari modal
- **Create Task** — tombol submit
- **Create options** — create & open, create another, dll.

**Fitur Khusus:**
- **Draft Auto-save** — jika tutup modal, ClickUp tanya "Save draft?" — draft tersimpan di task tray
- **"Write with AI"** — tombol AI langsung di deskripsi field

### 2.3 AI dalam Create Task

Dari deskripsi field, panel AI terbuka dengan opsi:
- **"Write a description"** — AI tulis deskripsi task
- **"Create a plan"** — AI buatkan rencana kerja
- **"Generate action items"** — AI generate action item dari konteks
- **Tone control** — Default Tone, Medium Creativity (bisa diatur)
- **"Ask Brain to edit or write"** — text input bebas

---

## 3. TASK DETAIL VIEW

### 3.1 Header Task

```
[Breadcrumb: Team Space / Get Started with ClickUp]
[Task Type Badge] [Task ID: #z8qu5cyfpn] [Add Cover]
[Task Title — editable inline]
[Brain² banner: "Ask Brain² to: estimate this, make a skill, build an artifact"]
```

### 3.2 Properties Panel (Kiri/Atas)

| Field | Detail |
|-------|--------|
| **Status** | Badge klikable + tombol "Next status" (one-click advance) + "Mark as Closed" |
| **Assignees** | Avatar list, multiple assignees |
| **Dates** | Start date + Due date (calendar picker) |
| **Priority** | Urgent / High / Normal / Low |
| **Time Estimate** | Custom time input |
| **Track Time** | Timer Start button + dropdown |
| **Tags** | Multiple tags |
| **Custom Fields** | "Add fields" button → tambah field apa saja |
| **Collapse empty fields** | Toggle sembunyikan field kosong |

### 3.3 Description Area

- **Rich text editor** (bold, italic, underline, code, lists, headings, etc.)
- **"/" slash commands** — insert blocks, mention, etc.
- **Inline AI suggestions** — Brain² proactively suggest actions
- **Table support** — insert table dalam deskripsi
- **Checklist** tersendiri (bukan dalam deskripsi)

### 3.4 Bottom Action Bar

| Action | Deskripsi |
|--------|-----------|
| **Add subtask** | Buat subtask langsung dari task |
| **Relate items / Add dependencies** | Hubungkan ke task lain, set dependency |
| **Create checklist** | Tambah checklist terpisah dari deskripsi |
| **Attach file** | Upload file attachment |
| **Add fields** | Tambah custom field |

### 3.5 Activity Panel (Kanan)

**Tabs:**
- **Activity** — history perubahan real-time
- **Related items** — task/doc yang terhubung
- **Add links** — tambah external/internal link

**Comment Box features:**
| Feature | Deskripsi |
|---------|-----------|
| Slash commands (/) | Format commands dalam comment |
| **Ask Brain² privately** | AI menjawab hanya ke kamu |
| **Ask Brain² (replies in thread)** | AI reply di thread comment |
| Add a file | Attach di comment |
| Mention a task | @task reference |
| Talk to Text | Input suara |
| Schedule for later | Jadwal kirim comment |

---

## 4. EDIT TASK

### 4.1 Inline Edit (dari List/Board view)
- Klik nama task → edit title inline
- Klik field (status, priority, assignee, date) → dropdown editor langsung muncul
- Tidak perlu buka task detail

### 4.2 Edit dari Task Detail
- Semua field editable secara langsung (click-to-edit)
- Status: klik badge → pilih status baru ATAU klik panah "Next status" (1 klik)
- Task title: textarea yang langsung bisa diedit
- Description: WYSIWYG editor

### 4.3 Bulk Edit
- Dari List view: pilih multiple task → bulk action bar muncul
- Bisa bulk change: status, assignee, priority, due date, move, dll.

---

## 5. VIEWS YANG TERSEDIA (13 View Types!)

### Popular Views
| View | Deskripsi |
|------|-----------|
| **List** | Track tasks, bugs, people & more |
| **Board (Kanban)** | Move tasks between columns |
| **Gantt** | Plan dependencies & time |
| **Calendar** | Plan, schedule, & delegate |
| **Doc** | Collaborate & document anything |
| **Form** | Collect, track, & report data |
| **Dashboard** | Track metrics & insights |

### More Views
| View | Deskripsi |
|------|-----------|
| **Table** | Structured table format (spreadsheet-like) |
| **Whiteboard** | Visualize & brainstorm ideas |
| **Timeline** | See tasks by start & due date |
| **Activity** | Real-time activity feed |
| **Workload** | Visualize team capacity |
| **Mind Map** | Visual brainstorming of ideas |

**View Options:**
- **Private view** — view hanya untuk dirimu
- **Pin view** — pin ke tab bar

---

## 6. AI FEATURES — BRAIN²

ClickUp AI disebut **"Brain²"** (Brain Squared). Ini adalah AI yang deeply integrated ke seluruh platform, bukan sekadar writing assistant.

### 6.1 AI di Level Task

| Lokasi | AI Action |
|--------|-----------|
| Create Task → Description | "Write with AI" — buat deskripsi, plan, action items |
| Task Detail → Description banner | "Estimate this" / "Make a skill" / "Build an artifact" |
| Task Detail → Comment | "Ask Brain² privately" / "Ask Brain² (replies in thread)" |
| Any field | Talk to Text — voice input |

### 6.2 AI Chat Hub (/ai)

Halaman AI tersendiri dengan:
- **Tab "Ask"** — Chat biasa dengan Brain²
- **Tab "Agents"** — Mode Super Agents
- **Attach context** — sertakan file/task sebagai konteks
- **Skills** — panel skill tersedia
- **Max mode** — model lebih powerful
- **Memory** — AI ingat konteks workspace
- **Talk to Text** — voice input
- **Credits system** — 500 credits per workspace

**Quick Actions dari AI Hub:**
- Create Roadmap — "Plan your project tasks"
- Write Onboarding — "Draft onboarding email templates"
- Summarize Tasks — "Summarize getting started tasks"
- Learn AI Features — "Explain ClickUp AI features"

### 6.3 Super Agents

Fitur terbaru ClickUp — AI agents yang bisa automasi workflow secara autonomous.

**Input:** "Describe the busy work that slows your team down..."

**Kategori Agent Templates:**
| Kategori | Use Case |
|----------|----------|
| Apps | Integrasi dengan tool eksternal |
| Projects | Manajemen project otomatis |
| Personal | Personal productivity |
| Certified | Agent tersertifikasi ClickUp |
| Tasks | Otomasi task-related |
| Exec | Executive-level reporting |
| Scheduling | Penjadwalan otomatis |
| Software | Dev/engineering workflows |
| Meetings | Meeting notes, action items |
| Intelligence | Data analysis & insights |
| Research | Research automation |
| Updates | Status updates otomatis |
| Writing | Content creation |

**Super Agent Management:**
- Create Agent
- Agent Activity log
- All Agents (marketplace)
- My Agents

### 6.4 AI Skills (Beta)

Tersedia di `/ai/skills` — sistem skill AI yang bisa dikustomisasi untuk use case spesifik.

### 6.5 AI Analytics

Tersedia di `/ai/analytics` — insights dari penggunaan AI.

### 6.6 Connections

Integrasi tool eksternal untuk Brain²:
- Brain² bisa baca email, meeting notes, dll. dari tool yang terconnect
- "Connect your tools and Brain² handles meetings, emails, and context for you"

---

## 7. FITUR UNIK LAINNYA

### 7.1 Goals & OKR

- Halaman tersendiri (`/goals`)
- "Create Goals, break them down into measurable targets, and track progress in real-time"
- Link goals ke task untuk track progress otomatis

### 7.2 Planner (Calendar View Personal)

- Kalender personal di `/calendar`
- Task due dates, personal schedule
- Badge "28" — menunjukkan jumlah task di bulan ini

### 7.3 Teams Pulse

- Di `/teams-pulse`
- Visibility ke aktivitas & workload team secara real-time

### 7.4 Clips (Screen Recording)

- Built-in screen recording di `/hubs/clips`
- Record Clip langsung dari header bar
- Kirim clip ke task/comment tanpa tool eksternal

### 7.5 Timesheets

- Di `/time`
- Built-in time tracking dan timesheet reporting
- Langsung dari task (tombol Track Time)

### 7.6 Talk to Text

- Voice input tersedia di MANA SAJA:
  - Create task
  - Comment
  - AI chat
  - Description editor
- Tersedia via tombol mic di berbagai lokasi

### 7.7 Automations

- Tombol "Automate" tersedia di setiap Space/List
- Rule-based automation (if/then)
- Agent-based automation (Brain² Super Agents)

### 7.8 Docs (Terintegrasi)

- Doc bisa ada di dalam Space/Folder/List
- Doc bisa di-link ke task
- Doc sebagai salah satu View type

---

## 8. SELLING POINTS — DIFERENSIASI VS KOMPETITOR

### 8.1 "Everything App" — One Platform for All Work

**Klaim utama ClickUp:** Replace semua tool lain.

| Dalam ClickUp | Gantikan |
|---------------|----------|
| Tasks + Projects | Asana, Jira, Trello |
| Docs | Notion, Confluence |
| Chat | Slack |
| Whiteboard | Miro, Figma |
| Goals/OKR | Lattice, Betterworks |
| Time Tracking | Toggl, Harvest |
| Dashboards | Databox |
| Clips | Loom |
| Forms | Typeform |

Ini adalah **keunggulan biaya** — satu harga untuk semua tool.

### 8.2 Brain² — AI Paling Terintegrasi

Kompetitor punya AI, tapi ClickUp Brain² berbeda karena:
1. **Context-aware** — AI tahu isi seluruh workspace (task, doc, chat)
2. **Actionable** — Bukan hanya menulis, tapi bisa estimate task, create subtask, build artifact
3. **Super Agents** — Agen AI yang bisa bekerja secara autonomous (bukan hanya asisten)
4. **Memory** — AI ingat konteks antar-session
5. **Skills system** — AI bisa dikustomisasi untuk workflow spesifik tim

### 8.3 Fleksibilitas Ekstrem

- **13 View Types** — lebih banyak dari Asana (6), Notion (lebih sedikit), Trello (3)
- **Custom Status** — workflow custom per Space/List
- **Custom Fields** — field type apa pun bisa ditambah ke task
- **Hierarchy Fleksibel** — Space > Folder > List > Task > Subtask
- **Multi-List Tasks** — 1 task bisa ada di banyak List

### 8.4 Task Types yang Beragam

Default task bisa diubah jadi:
- **Milestone** — untuk checkpoint project
- **Meeting Note** — langsung dari task
- **Form Response** — track form submissions sebagai task

### 8.5 Time Tracking Native

Tidak perlu Toggl/Harvest — built-in langsung di task:
- Start/stop timer dari task detail
- Time estimate field
- Timesheet reporting

### 8.6 Draft Saving

Fitur kecil tapi thoughtful: ketika user tutup modal Create Task sebelum submit, ClickUp tanya "Save draft?" — draft tersimpan di task tray dan bisa dilanjutkan nanti.

### 8.7 Quick Status Advancement

Di task detail, ada tombol panah "Next status" → 1 klik langsung pindah ke status berikutnya tanpa harus buka dropdown. Ini sangat cepat untuk update status saat daily standup.

---

## 9. KEKURANGAN / KOMPLEKSITAS

| Masalah | Detail |
|---------|--------|
| **Overwhelming** | Terlalu banyak fitur untuk user baru — steep learning curve |
| **Performance** | Bisa lambat karena fitur yang sangat banyak |
| **Pricing AI** | Brain² pakai credit system — bisa cepat habis di tim besar |
| **Terlalu kompleks untuk small team** | Small team mungkin cukup dengan tool yang lebih simple |

---

## 10. KESIMPULAN — POSITIONING CLICKUP

**Target Market:** Tim yang ingin **one platform untuk semua** — menggantikan multiple tools dengan satu subscription.

**Positioning Statement:** *"The everything app for work — replace all your tools with ClickUp"*

**Diferensiasi Utama vs Kompetitor:**
1. 🧠 **Brain²** — AI paling canggih dan terintegrasi (super agents, context-aware, actionable)
2. 🔄 **13+ Views** — fleksibilitas view tertinggi
3. 🛠 **Everything app** — tasks + docs + chat + goals dalam 1 platform
4. ⚡ **Custom everything** — status, fields, workflow, hierarchy sesuai kebutuhan
5. 🎙 **Talk to Text** — voice input di seluruh platform

---

*Research ini berdasarkan eksplorasi langsung di app.clickup.com pada 2026-09-28.*  
*Screenshots tersimpan di `/ss-kompetitor/` folder.*
