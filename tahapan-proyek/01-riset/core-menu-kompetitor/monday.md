# monday.com — Core PM Feature Research

> Riset langsung via browser (live product) · 2026-09-28
> Sumber: https://monday.com (akun trial/free)

---

## 1. Arsitektur Konsep Inti

monday.com memposisikan dirinya sebagai **"Work OS"** — bukan sekadar PM tool, tapi platform kerja yang bisa dikustomisasi untuk berbagai use case (project management, CRM, HR, marketing, dsb).

| Konsep | Padanan di PM Tool Lain | Keterangan |
|--------|------------------------|------------|
| **Workspace** | Organization / Org | Container paling atas |
| **Board** | Project | Unit kerja utama; berisi groups & items |
| **Group** | Section / Sprint | Pengelompokan item dalam satu board |
| **Item** | Task / Ticket | Unit kerja terkecil yang bisa dikerjakan |
| **Subitem** | Subtask | Item bersarang di bawah item |
| **Column** | Field / Custom field | Atribut item; tipenya sangat banyak |
| **View** | Layout / Perspective | Cara visualisasi board yang berbeda-beda |
| **Automation** | Workflow / Rule | If-then rule untuk otomatisasi aksi di board |

---

## 2. Membuat Project (Board)

### Cara Membuat Board Baru
- Klik tombol **"+ Add"** di sidebar kiri atau tombol **"New board"**
- Pilih dari template atau mulai dari kosong
- Pilih tipe board: **Main** (default), **Private** (hanya anggota yang diundang), **Shareable** (bisa dibagikan ke eksternal dengan link)
- Isi nama board dan pilih workspace tujuan

### Struktur Default Board
Saat board dibaru, tersedia:
- 1 group default ("Group Title")
- Kolom bawaan: **Item Name**, **Owner** (People), **Status**, **Due date**, **Last updated**, **Files**
- Tombol "+ Add column" untuk tambah kolom custom

### Column Types yang Tersedia
Text, Long text, Numbers, Date, People, Status, Timeline, Tags, Rating, Checkbox, Email, Phone, Link, Files, Location, Color picker, World clock, Formula, Mirror (dari board lain), Connect boards, Auto number, dsb.

---

## 3. Membuat Task (Item)

### Cara Menambah Item
- Klik **"+ Add item"** di bawah setiap group → muncul baris baru inline di table
- Klik **"New item"** → input nama langsung di cell
- Keyboard shortcut: Enter setelah nama item untuk simpan, lalu Enter lagi untuk item berikutnya
- Di board Kanban: klik "+ Add item" di kolom status yang diinginkan

### Right-Click Context Menu pada Item
Klik kanan pada item menampilkan menu:

| Menu Item | Aksi |
|-----------|------|
| **Open task** | Buka task detail di side panel kanan |
| **Open in new tab** | Buka task detail di tab browser baru |
| **Copy task link** | Salin URL langsung ke task ini |
| **Move to** | Pindahkan item ke group/board lain |
| **Duplicate** | Duplikat item (beserta semua field-nya) |
| **Create new task below** | Buat item baru di bawah item ini |
| **Add subitem** | Tambahkan subitem (subtask) |
| **Convert to subitem** | Jadikan item ini sebagai subitem dari item lain |
| **Apps** | Buka app marketplace untuk item ini |
| **Archive** | Arsipkan item (disembunyikan tapi tidak dihapus) |
| **Delete** | Hapus permanen |

---

## 4. Edit Task / Item

### Edit Inline (di Table View)
- Klik langsung pada cell manapun untuk edit nilai kolom
- Status: klik untuk pilih label dari dropdown (bisa dikustomisasi warna & teks)
- Due date: klik untuk buka date picker
- Owner: klik untuk assign anggota tim (multi-select)
- Semua edit otomatis tersimpan (no save button)

### Task Detail Panel (Side Panel)
Klik **"Open task"** dari context menu atau klik nama item → side panel muncul di sisi kanan layar.

Panel detail dibagi 3 tab utama:

#### Tab: Updates
- Area komunikasi utama tentang task ini
- Rich text editor dengan formatting: Bold, Italic, Bullet list, Numbered list, Mention (@), Emoji, File attachment, GIF
- Semua update bersifat threaded — bisa di-reply langsung
- **Write with AI (Beta)**: tombol AI di dalam editor untuk generate update draft

#### Tab: Files
- Semua file yang dilampirkan ke task ini
- Preview gambar langsung di panel
- Upload dari komputer atau integrasi cloud storage

#### Tab: Activity Log
- Riwayat semua perubahan yang terjadi di task ini (siapa, apa, kapan)
- Audit trail lengkap: perubahan status, assignment, due date, dsb.

---

## 5. Views (Cara Visualisasi Board)

Klik **"Add view"** di tab bar board untuk menambah view baru. Semua view menggunakan data yang sama, hanya cara tampilannya yang berbeda.

| View | Deskripsi |
|------|-----------|
| **Table** | Default spreadsheet view; semua kolom terlihat |
| **Kanban** | Board kartu per kolom status |
| **Gantt** | Timeline bar chart untuk project planning |
| **Chart** | Visualisasi data: bar, line, pie, chart, dsb. |
| **Calendar** | View per tanggal berdasarkan due date |
| **Doc** | Halaman dokumen yang bisa embed board data |
| **File gallery** | Grid galeri semua file attachment |
| **Form** | Form intake yang menjadi item baru di board |
| **Dashboard** | Widget dashboard aggregasi dari multiple boards |

**Build with Vibe**: opsi ke-10 — low-code app builder bawaan monday.com untuk buat custom view/aplikasi dari nol dengan prompt AI atau drag-and-drop.

---

## 6. Automations (Otomatisasi Workflow)

### Cara Akses
Klik tombol **"Automate"** di header board → panel automations terbuka.

### Interface Automations
- **Create tab**: Buat automation baru
- **Manage tab**: Lihat & kelola automation yang sudah aktif

### Template Automation (Tersedia Langsung)
| Template | Trigger | Aksi |
|----------|---------|------|
| When item is created | Item baru dibuat | Assign creator sebagai owner |
| When status changes | Status item berubah | Notify someone |
| When date arrives | Tanggal due date tiba | Notify someone |

**"Create from scratch"** — buat automation custom dengan pilih trigger + kondisi + aksi sendiri.

**"or create with AI"** — tulis deskripsi automation dalam bahasa natural, AI akan generate rule-nya.

### Kategori Automation (Sidebar Kiri)
- **AI-powered** *(New)* — automation yang melibatkan AI action
- **2-way sync** *(New)* — sinkronisasi dua arah antar board/tool
- **Recommended** — 11+ template populer
- **Productivity** — efisiensi kerja
- **Dates** — berbasis deadline/tanggal
- **Communication** — notifikasi & pesan
- **Sync** — sinkronisasi data
- **Connected & mirror columns** — update lintas board

### Integrations (34 integrasi)
Gmail, Google Calendar, Outlook, Slack, Jira, GitHub, Salesforce, HubSpot, Zoom, Microsoft Teams, Zapier, dll.

---

## 7. Fitur AI yang Terintegrasi

monday.com tidak punya satu fitur AI terpusat — AI tersebar di banyak titik di seluruh produk.

### 7.1 Write with AI (Beta)
**Lokasi**: Di dalam task detail panel → tab Updates → tombol di rich text editor

**Cara kerja**:
- Klik "Write with AI"
- Muncul text box **"Describe your update..."**
- Tulis instruksi singkat (misal: "summarize what we discussed today")
- Klik **"Generate"** → AI generate draft update
- Edit sebelum posting

**Kegunaan**: Bantu nulis update task, ringkasan meeting, atau update status dalam format profesional.

---

### 7.2 AI-Suggested Columns
**Lokasi**: Tombol "AI suggestions" di header board (terlihat di board overview)

**Cara kerja**:
- monday.com menganalisis konten board yang ada
- Menyarankan kolom baru yang relevan beserta nilainya
- Contoh nyata yang muncul: **"Due Date Priority"** + **"Notes Category"**
- Klaim: "Save up to 10 hours/month"
- Bisa langsung klik "Add" untuk terapkan, atau dismiss

**Kegunaan**: Auto-enrich item dengan metadata relevan tanpa setup manual.

---

### 7.3 AI Columns (Column Type)
**Lokasi**: "+ Add column" → pilih tipe "AI"

**Cara kerja**:
- Kolom khusus yang auto-fill nilainya menggunakan AI
- Contoh: kolom "Category" yang otomatis menentukan kategori berdasarkan nama/deskripsi item
- Bisa dikonfigurasi dengan prompt custom

**Kegunaan**: Auto-labeling, auto-categorization, auto-summarization task di seluruh board.

---

### 7.4 AI Sidekick
**Lokasi**: Accessible via shortcut **⌘/** di mana saja dalam aplikasi

**Cara kerja**:
- Panel AI assistant yang bisa diakses dari konteks apapun
- Bisa tanya pertanyaan tentang board, minta aksi, atau minta ringkasan
- Contoh: "What tasks are overdue?", "Summarize this board for me", "Create 5 items about..."

**Catatan**: Feature ini kemungkinan requires paid plan — panel muncul blank di akun free trial.

---

### 7.5 AI Agents Builder
**Lokasi**: Tombol **"Agents"** di header board

**Cara kerja**:
- Interface untuk build AI agent sendiri
- Input: describe agent dengan natural language
- **Add context**: lampirkan board atau data sebagai knowledge base agent
- Pilih **AI model** (tidak disebutkan model apa, mungkin configurable)
- Submit → agent dibuat dan bisa dipanggil kapan saja

**Cara trigger agent**:
- Manual: dari panel Agents
- Otomatis: via Automation ("when X happens, trigger agent Y")

---

### 7.6 Agent Directory (Pre-built AI Agents)
**Lokasi**: Tab "Directory" di panel Agents

Pre-built agents siap pakai dengan persona dan spesialisasi:

| Agent | Spesialisasi | Deskripsi |
|-------|-------------|-----------|
| **Sarah** | Competitor Research | Riset kompetitor, analisis market |
| **Diana** | Feedback Analyzer | Analisis feedback pelanggan/user |
| **Elena** | Procurement | Proses procurement & vendor management |
| + lebih banyak | Berbagai domain | Template per use case bisnis |

**Kegunaan**: Tidak perlu prompt engineering dari nol — langsung gunakan agent yang sudah dikonfigurasi untuk task spesifik.

---

## 8. Selling Points & Differentiators

### vs. Asana / ClickUp / Jira
| Aspek | monday.com | Kompetitor Umum |
|-------|-----------|-----------------|
| **Filosofi** | "Work OS" — platform general purpose | PM tool spesifik |
| **Kustomisasi** | Sangat tinggi — column types, views, automations | Terbatas pada field predefined |
| **Kurva belajar** | Relatif rendah, visual & intuitif | Beragam, banyak yang steep |
| **AI integration** | Tersebar di seluruh produk (bukan fitur terpisah) | Biasanya fitur AI add-on |
| **Automations** | Built-in, tanpa coding, + "create with AI" | Terbatas atau butuh integrasi |
| **Vibe (app builder)** | Bisa build custom app sendiri | Tidak ada |

### Keunggulan Spesifik monday.com

1. **Multi-use platform**: Board bisa dipakai untuk CRM, HR, event planning — bukan cuma PM
2. **AI everywhere**: AI bukan menu terpisah tapi tersebar di editor, columns, suggestions, agents
3. **AI Agents ecosystem**: Bisa build & deploy AI agent yang bekerja autonomous di dalam board
4. **34 native integrations**: Gmail, Outlook, Slack, Jira, GitHub, Salesforce, dsb. langsung dari Automations
5. **Vibe builder**: Low-code platform untuk build custom views atau mini-apps tanpa developer
6. **2-way sync automations**: Sinkronisasi dua arah antar board atau antar tools (fitur baru)
7. **Views yang kaya**: 9 tipe view termasuk Form (intake) dan Doc (wiki) — tidak perlu tool terpisah
8. **Column mirroring**: Data dari board lain bisa di-mirror ke board ini secara real-time
9. **Granular permission**: Board bisa di-set private, main, atau shareable (dengan external link)
10. **Agent Directory**: Marketplace AI agents siap pakai — Sarah, Diana, Elena, dsb.

### Positioning
> monday.com tidak ingin disebut "project management tool" — mereka menyebut dirinya **"Work OS"** yang bisa dipakai oleh siapa saja untuk mengatur pekerjaan apapun, bukan hanya tim tech atau tim project.

---

## 9. Gaps & Limitasi yang Ditemukan

- **AI Sidekick** blank di akun free — kemungkinan fitur berbayar
- **Automations** butuh upgrade plan untuk automation lebih dari 3-5 per board
- **Forms** view tidak bisa dikustomisasi banyak di plan free
- **Storage file** terbatas di plan gratis
- Tidak ada **time tracking** built-in (butuh kolom manual atau integrasi third-party)
- **Subitem** tidak bisa nested lebih dari 1 level

---

## 10. Ringkasan Screenshots yang Diambil

| File | Konten |
|------|--------|
| `monday-board-overview.png` | Board Kanban dengan tombol AI suggestions, Agents, Integrate, Automate |
| `monday-main-table.png` | Table view dengan kolom: Task, Owner, Status, Due date, Last updated, Files |
| `monday-task1-contextmenu.png` | Right-click context menu lengkap pada item |
| `monday-task-detail-loaded.png` | Task detail side panel (Updates/Files/Activity Log) |
| `monday-write-with-ai.png` | Fitur Write with AI di rich text editor update |
| `monday-ai-suggestions.png` | Modal AI-suggested columns |
| `monday-agents.png` | Panel Agents builder |
| `monday-agent-directory.png` | Agent Directory dengan Sarah, Diana, Elena |
| `monday-add-view-options.png` | Semua 9 tipe view + Vibe + Apps |
| `monday-automate-loaded.png` | Panel Automations dengan categories & templates |

Semua screenshot tersimpan di: `../ss-kompetitor/`
