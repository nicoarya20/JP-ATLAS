# Notion — Research Mendalam: Project & Task Management

> Research dilakukan langsung via browser (ego-browser) ke https://app.notion.com
> Tanggal: 2026-09-28

---

## 1. Overview Struktur

Notion mengorganisir pekerjaan dalam konsep **Teamspace** → **Database**. Template default yang disediakan:

| Section | Tipe | Fungsi |
|---------|------|--------|
| **Projects** | Database (List view) | Kumpulan proyek dengan properties |
| **Tasks** | Database (Board view) | Semua task lintas proyek |
| **Meetings** | Database | Catatan meeting otomatis |
| **Docs** | Database | Dokumen/wiki team |

---

## 2. Projects — Create

### Cara Membuat Project
- **Tombol "New project"** di kanan atas toolbar database
- **Dropdown "More add options"** → memunculkan:
  - **New project** (Default template — pre-filled dengan struktur bawaan)
  - **Empty** (halaman kosong tanpa template)
  - **+ New template** (buat template sendiri)
- **"+ New project"** di bagian bawah daftar (inline tambah cepat)

### Fields Default Saat Create Project
| Field | Tipe | Keterangan |
|-------|------|-----------|
| Name | Title | Nama proyek |
| Stage | Select | Planning / In Progress / Done / dll |
| Timeline | Date range | Tanggal mulai → selesai |
| Lead | Person | Penanggungjawab proyek |
| Tasks | Relation | Link ke database Tasks |
| Meetings | Relation | Link ke database Meetings |
| Docs | Relation | Link ke database Docs |

**Key behavior**: Project baru langsung jadi halaman penuh (full page), bukan sekadar baris.

---

## 3. Projects — Edit & Detail

### Tampilan Detail Project (Full Page)
Setelah membuka sebuah project, user mendapatkan **halaman penuh** yang terdiri dari:

```
┌─────────────────────────────────────┐
│ [Icon] [+ Add cover] [Customize layout] │
│                                      │
│ [Judul Project — editable]           │
│ [View details / Hide details]        │
├──────────────────────────────────────┤
│ PROPERTIES PANEL (collapsible):      │
│  Stage:     ● In Progress            │
│  Timeline:  May 8, 2026 → May 22    │
│  Lead:      (empty)                  │
│  Tasks:     • Update homepage copy   │
│             • Write FAQ for launch   │
│  Meetings:  (empty)                  │
│  Docs:      • Brand Guidelines       │
│  [+ Add a property]                  │
├──────────────────────────────────────┤
│ SECTION TABS: Content | Tasks | Meetings | Docs │
├──────────────────────────────────────┤
│ Comments: [Add a comment...]         │
│                                      │
│ [Rich text content area]             │
│  Vision: ...                         │
│  Background: ...                     │
│  (free-form document)                │
└─────────────────────────────────────┘
```

### Section Tabs di dalam Project
| Tab | Isi |
|-----|-----|
| **Content** | Dokumen bebas — vision, brief, background, keputusan |
| **Tasks** | Daftar task yang linked ke proyek ini |
| **Meetings** | Meeting notes yang linked ke proyek ini |
| **Docs** | Dokumen pendukung yang linked |

### Edit Properties
- Klik langsung pada nilai property → edit inline
- **Stage**: dropdown pilih status (Planning, In Progress, Done, dll)
- **Timeline**: date picker dengan date range
- **Lead**: people picker
- **Tasks / Meetings / Docs**: relation picker (link ke item yang sudah ada)
- **"+ Add a property"**: tambah custom property (text, number, date, select, formula, dll)

---

## 4. Tasks — Create

### Cara Membuat Task

**Dari Tasks database (board view):**
- **"New task"** button di toolbar → langsung buat task baru
- **"+ New task"** di bawah kolom status tertentu → task langsung masuk ke status itu
- **"+ New task" dropdown** → tampilkan template options:
  - New task (default)
  - Empty
  - + New template

**Dari dalam Project (tab Tasks):**
- Tombol **"+ New task"** → buat task yang otomatis ter-link ke project tersebut
- **"Link existing"** → sambungkan task yang sudah ada ke project ini

### Fields Default Task
| Field | Tipe | Keterangan |
|-------|------|-----------|
| Name | Title | Nama task |
| Status | Select | Not started / Up next / In progress / Done |
| Due date | Date | Deadline |
| Project | Relation | Proyek induk (auto-filled jika dari dalam project) |

---

## 5. Tasks — Edit & Detail

### Tampilan Detail Task (Full Page)

```
┌─────────────────────────────────────┐
│ [Judul Task — editable]             │
│                                     │
│  Status:    ● Up next               │
│  Due date:  (empty)                 │
│  Project:   🎨 Website Redesign     │
│  [+ Add a property]                 │
│                                     │
│ Comments: [Add a comment...]        │
│                                     │
│ [Rich text content area]            │
│  The current homepage copy is...    │
│                                     │
│  ☐ Draft new hero headline          │
│  ☐ Rewrite product description      │
│  ☐ Get copy review from marketing   │
└─────────────────────────────────────┘
```

### Fitur Editing di Task Body
- **Rich text blocks** penuh: paragraf, heading (H1/H2/H3), bullet, numbered list
- **Checklist** (sub-task style) langsung dalam body task
- **Slash command `/`** untuk insert block apapun (lihat bagian AI)
- **Inline mention** (`@nama`) untuk mention anggota tim
- **Embedded content**: file, video, embed web

### Task Board (Kanban) View
- Kolom status: Not started → Up next → In progress → Done
- Drag & drop antar kolom untuk update status
- Klik card langsung buka detail task (side peek atau full page)

---

## 6. Fitur AI — Lengkap

### 6.1 AI Chat Panel (Kontekstual — Killer Feature)

**Behavior**: Panel AI muncul otomatis di sisi kanan saat membuka Project atau Task. AI **mengetahui konteks halaman** yang sedang dibuka.

**Saat buka Project, AI proaktif menyarankan:**
> "Each project page is the home for everything related to that initiative — the tasks, docs, and meeting notes all connected in one place."

**Quick action buttons yang muncul otomatis:**
| Button | Fungsi |
|--------|--------|
| **Add tasks to this project →** | AI bantu isi task list |
| **Never take project sync notes again** | Aktifkan AI Meeting Notes untuk proyek |
| **Get my project update drafted for me** | AI draft update status proyek |

**Input field AI**: "Describe your own" — user bisa tanya bebas apapun tentang proyek.

**Context switcher**: Badge di chat box menampilkan nama halaman aktif, AI selalu tahu sedang di page mana.

---

### 6.2 Ask AI (Slash Command)

Ketik `/ai` atau `/ask` di dalam body task/dokumen:

| Menu Item | Fungsi |
|-----------|--------|
| **AI Meeting Notes** | Insert block catatan meeting otomatis |
| **AI Block** | Block konten yang di-generate dan di-update AI |
| **Ask AI** *(⌘J)* | Buka AI assistant langsung di halaman |

**Setelah "Ask AI" dibuka, quick actions tersedia:**
| Quick Action | Fungsi |
|-------------|--------|
| Summarize this page | Rangkum konten halaman saat ini |
| Translate this page | Terjemahkan halaman ke bahasa lain |
| Analyze for insights | AI analisa konten dan berikan insight |
| Create a task tracker | Generate task tracker dari konten |

---

### 6.3 AI Autofill (Database Property)

**Lokasi**: Toolbar database → tombol "AI Autofill"

**Fungsi**: "Automatically fills properties with context from your workspace and the web."

**Use case**: Notion AI bisa otomatis mengisi property seperti summary, tags, atau status berdasarkan konten halaman dan sumber web.

**Cara setup**: Klik "+ New AI Autofill" → pilih property mana yang ingin di-autofill → define prompt/instruksi.

---

### 6.4 Automations (Paid Feature)

**Lokasi**: Toolbar database → tombol "Automations"

**Fungsi**: "Automatically edit properties, create pages, send updates, and more."

**Trigger examples**:
- Saat status berubah → kirim notifikasi
- Saat task dibuat → assign ke orang tertentu
- Saat deadline lewat → ubah status menjadi overdue

**Status**: Memerlukan upgrade plan (tidak tersedia di free tier).

---

### 6.5 AI Meeting Notes

**Akses**: Tab "Meetings" di sidebar → "Try AI Meeting Notes" button

**Fungsi**: Notion AI otomatis merekam, mentranskrip, dan merangkum meeting notes. Hasil meeting langsung ter-link ke proyek terkait.

**Killer use case**: Tidak perlu lagi manual mencatat selama meeting — AI yang handle.

---

### 6.6 Notion Agents (Add Agents)

**Lokasi**: Sidebar bawah → "Add agents"

**Konsep**: AI agents yang bisa diprogram untuk menjalankan tugas berulang secara otomatis di workspace Notion (fitur baru, masih dalam pengembangan aktif).

---

## 7. Toolbar Database — Ringkasan Lengkap

Setiap database (Projects/Tasks) memiliki toolbar yang sama:

| Tombol | Fungsi |
|--------|--------|
| Filter | Filter berdasarkan property (status, assignee, date, dll) |
| Sort | Urutkan record |
| Automations | Buat automation rules (paid) |
| AI Autofill | Setup AI property filling |
| Search | Cari dalam database |
| Settings | Konfigurasi tampilan, properties, dll |
| **New [item]** | Buat record baru (tombol utama) |
| **▼ dropdown** | Template picker untuk item baru |

---

## 8. View Types yang Tersedia

Notion mendukung banyak view untuk database yang sama:

| View | Deskripsi |
|------|-----------|
| **Table/List** | Default — tampilan baris seperti spreadsheet |
| **Board** | Kanban board by status |
| **Calendar** | Tampilan kalender berdasarkan due date |
| **Timeline** | Gantt chart untuk project planning |
| **Gallery** | Card dengan preview konten |
| **Chart** *(baru)* | Visualisasi data |

---

## 9. Selling Points vs Kompetitor

### Diferensiasi Utama Notion

| Selling Point | Detail | vs Siapa |
|--------------|--------|---------|
| **Doc + Task = Satu halaman** | Setiap project/task ADALAH dokumen — bukan sekedar record | Asana, Linear (hanya task), Trello |
| **Connected context** | Tasks, Docs, Meetings semua terhubung dalam 1 project page | Semua kompetitor butuh integrasi terpisah |
| **AI kontekstual & proaktif** | AI tahu kamu sedang di halaman mana dan langsung suggest action | ClickUp AI reaktif, bukan proaktif |
| **AI Meeting Notes** | Auto-catat meeting dan link ke project | Asana, Linear tidak punya built-in |
| **Flexible database** | 1 database bisa jadi table, board, calendar, timeline, gallery | Linear rigid, Asana terbatas |
| **Wiki + PM hybrid** | Bisa dipakai murni sebagai wiki/docs atau sebagai PM tool | Kompetitor tidak bisa keduanya |
| **Teamspaces** | Ruang kerja terstruktur per tim | Lebih baik dari ClickUp folders |
| **AI Autofill property** | AI isi property otomatis dari konteks workspace + web | Fitur unik, tidak ada di kompetitor lain |
| **Template system** | Template per database + bisa buat custom | ClickUp juga punya, tapi Notion lebih natural |

---

### Kelemahan Notion (untuk dipertimbangkan)

| Kelemahan | Detail |
|-----------|--------|
| **Kompleksitas awal** | Kurva belajar tinggi — butuh setup sebelum produktif |
| **Performa lambat** | Loading halaman kompleks bisa lambat |
| **Tidak ada true sub-tasks** | Relation task ≠ sub-task native seperti ClickUp/Linear |
| **Notifications lemah** | Sistem inbox/notifikasi kalah dari Asana/Linear |
| **Automations di paywall** | Fitur automation dasar butuh upgrade |
| **Offline terbatas** | Butuh koneksi internet untuk fitur penuh |

---

## 10. Alur Kerja Lengkap (End-to-End)

```
1. Buat Project di Projects database
   → Pilih template atau kosong
   → Isi: nama, stage, timeline, lead
   
2. Project page terbuka (full page)
   → Tab Content: tulis vision, brief, background
   → Tab Tasks: tambah tasks untuk project ini
   → Tab Meetings: meeting notes ter-link
   → Tab Docs: lampirkan dokumen pendukung
   
3. Task Management
   → Tasks database: board view by status
   → Buat task baru → otomatis linked ke project
   → Task detail: isi body, checklist, comments
   → Update status dengan drag & drop di board
   
4. AI Assistance sepanjang alur:
   → AI Chat: suggest action berdasarkan konteks
   → /ai di body: insert AI block, ask AI, meeting notes
   → AI Autofill: isi property otomatis
   → AI Meeting Notes: catat meeting otomatis
```

---

## 11. Screenshots yang Dikumpulkan

| File | Isi |
|------|-----|
| `/tmp/notion-initial.png` | Home screen + sidebar navigation |
| `/tmp/notion-projects.png` | Projects database list view |
| `/tmp/notion-project-details.png` | Project detail + properties panel terbuka |
| `/tmp/notion-website-redesign.png` | Project detail dengan AI chat panel aktif |
| `/tmp/notion-tasks-db.png` | Tasks database board/kanban view |
| `/tmp/notion-task-detail.png` | Task detail full page (Update homepage copy) |
| `/tmp/notion-ai-autofill.png` | AI Autofill panel explanation |
| `/tmp/notion-automations.png` | Automations panel explanation |
| `/tmp/notion-slash-menu.png` | Slash command menu |
| `/tmp/notion-slash-ai.png` | Slash command filtered: AI options |
| `/tmp/notion-ask-ai.png` | Ask AI panel dengan quick actions |
| `/tmp/notion-more-options.png` | Task template options dropdown |
| `/tmp/notion-new-project-options.png` | Project template options dropdown |
