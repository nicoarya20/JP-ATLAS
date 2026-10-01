# Smartsheet — Core PM Research

> Research mendalam tentang fitur inti project & task management Smartsheet  
> Source: Live exploration di `app.smartsheet.com` (September 2026, Business Plan Trial)

---

## 1. Overview & Konsep Utama

Smartsheet pada dasarnya adalah **spreadsheet yang evolusi jadi platform PM**. Ini adalah DNA-nya — tampilan grid mirip Excel tapi dengan kemampuan kolaborasi, automasi, dan multi-view layaknya tools PM modern.

**Struktur hierarki:**
```
Workspace (top-level folder)
  └── Sheet / Report / Dashboard / Form / WorkApp
        └── Rows (Tasks/Items)
              └── Child Rows (Subtasks)
```

**Aset yang ada dalam workspace project template:**
- `1. Task Sheet` — sheet utama tempat semua task tinggal
- `2. Task Summary Report` — agregasi lintas sheet
- `3. Overdue Tasks Report` — filter task overdue
- `4. Project Dashboard` — visual analytics

---

## 2. Create Project / Sheet

### 2.1 Cara Membuat (tombol Create di navbar)

Menu Create membuka dropdown dengan opsi:
| Opsi | Deskripsi |
|------|-----------|
| **Build with AI** ✨ | Describe project goals → AI generate full workspace |
| Sheet | Grid/spreadsheet kosong atau dari template |
| Report | Agregasi data dari beberapa sheet |
| Dashboard | Panel charts dan metrics |
| Form | Form input data (tanpa akses sheet) |
| Import | Import dari Excel, Google Sheets, Asana, dll |
| Workspace | Folder baru untuk mengelompokkan aset |

### 2.2 Build with AI — Fitur Unggulan

Saat klik "Build with AI":
1. User memilih **industri** (Technology, Finance, Healthcare, dll)
2. AI menampilkan **suggested prompts** yang relevan dengan industri tersebut
3. User bisa pilih template langsung atau **describe sendiri** di text field
4. AI generate workspace lengkap beserta sheet, report, dashboard, dan automation

**Contoh suggested prompts untuk Technology:**
- _"Create a simple Project Tracker for the IT team that helps monitor system implementations..."_
- _"Create a simple Issue Tracker for the IT team that helps streamline ticket resolution..."_
- _"Create a simple Asset Tracker for the IT team that helps manage hardware inventory..."_

Workspace yang di-generate sudah include: task sheet, summary report, dan automation rules.

---

## 3. Views yang Tersedia

Satu sheet bisa dilihat dalam **5 views berbeda** — semua real-time sync:

| View | Deskripsi | Keunikan |
|------|-----------|----------|
| **Table** | Grid/spreadsheet (canvas-based) | Familiar seperti Excel, support formula |
| **Board** | Kanban cards | Group by column (Status, dll), drag-drop antar lane |
| **Gantt** | Timeline bar chart | Parent-child hierarchy, baseline support |
| **Timeline** | Visual date planner | Multi-row view |
| **Calendar** | View kalender | Berdasarkan start/end date |

Switcher view ada di toolbar kiri atas, perubahan view **tidak mengubah data** — hanya presentasi.

---

## 4. Task (Row) Fields Default

Default template "Project Tracker" punya field berikut:

| Field | Tipe | Keterangan |
|-------|------|------------|
| **Tasks** | Text | Nama task (primary column) |
| **Assigned To** | Contact | User picker dengan search |
| **% Allocation** | Number | Alokasi waktu (0–100%) |
| **Start Date** | Date | Picker + input manual |
| **End Date** | Date | Picker + input manual |
| **Health** | Dropdown | Indikator status: 🟢 Green / 🟡 Yellow / 🔴 Red |
| **Status** | Dropdown | Not Started / In Progress / Complete |
| **Notes** | Text (multi-line) | Catatan bebas |

Field custom bisa ditambah lewat **Fields panel** — tipe yang tersedia: text, number, date, contact, dropdown, checkbox, formula, symbol, auto-number, dan lainnya.

### Row Hierarchy (Parent-Child)

Smartsheet mendukung **indented rows** untuk membuat subtask:
- Row parent bisa di-collapse/expand
- Subtask mewarisi context dari parent
- Visible di semua view (terutama Gantt)
- Di-create via: Indent Row toolbar / Right-click → Indent row / keyboard `⌘]`

---

## 5. Create Task (Cara Menambah Row/Task)

### Via Grid View (Table)
- Klik **`+`** di bawah baris terakhir
- Tekan `Enter` di baris terakhir
- Right-click row → **"Insert 1 row above/below"**
- Keyboard: `⌃I` (insert above) / `⌃⌥I` (insert below)

### Via Board View
- Klik **"Add card"** di bawah lane
- Tekan `Add lane` untuk menambah status baru

### Via AI (Smart Assist)
- Ketik di Smart Assist: _"Add 5 tasks for the onboarding process"_
- AI menambahkan rows langsung ke sheet

---

## 6. Edit Task

### 6.1 Edit Inline di Grid View
- **Single click** → select cell
- **Double-click / F2** → masuk edit mode
- **Tab** → pindah ke kolom berikutnya
- **Enter** → konfirmasi + pindah ke baris berikutnya

### 6.2 Row Context Menu (right-click pada baris)

| Aksi | Shortcut |
|------|---------|
| Cut | ⌘X |
| Copy | ⌘C |
| Paste | ⌘V |
| Open row details | ⌘E |
| Insert 1 row above | ⌃I |
| Insert 1 row below | ⌃⌥I |
| Outdent row | ⌘[ |
| Indent row | ⌘] |
| Collapse (subtasks) | — |
| Copy link to row | ⌥⇧C |
| Move row to another sheet | — |
| Copy row to another sheet | — |
| Send row | — |
| Print row | — |
| **Create request** | — |
| **Lock row** | ⌘⇧L |
| Row properties | — |
| Delete row | ⌘Delete |

### 6.3 Edit di Board View (Card Options)

| Aksi | Shortcut |
|------|---------|
| Open card details | ⌘E |
| Add card above | ⌃I |
| Add card below | — |
| Delete card | ⌘Delete |
| **Set card color** | — |
| Copy card link | ⌘⇧C |
| Print card | — |
| Attachments | — |
| Conversations | — |
| Requests | — |
| **Proofs** | — |
| Send card | — |
| Move card to lane | — |
| Duplicate card | ⌘D |
| **Add child card** | ⇧↵ |

---

## 7. Task Detail Panel (Row Details)

Dibuka via: right-click → "Open row details" / ⌘E / klik ikon expand di baris

**Panel terdiri dari 3 bagian:**

### Details (Fields)
Semua field sheet ditampilkan dalam format form yang bisa langsung diedit:
- Task name (editable text)
- Assigned To (contact picker)
- % Allocation (number input)
- Start Date / End Date (date picker)
- Health (dropdown + color indicator)
- Status (dropdown)
- Notes (multi-line text)

Panel ada tombol **"Fields panel"** untuk menambah/menghapus/mengurutkan field dari sini.

### Attachments
- Drag & drop file langsung ke panel
- Support file dari komputer maupun URL
- Preview attachment inline

### Conversations
- Comments thread per row
- Support **@mention** team member
- Emoji reactions
- Attach file ke comment
- Riwayat diskusi tersimpan

---

## 8. Grid Toolbar — Fitur Lengkap

```
Table ▼ | ↩ ↪ | 🔍 | ⧖▼ | ↕ | ⇤ ⇥ | A | ≡▼ | fx | Σ | 💬 📎 📝 ✓ | 📄▼ | ⚡ | ··· | ⛶ | ⏱ | ⚙
```

| Tombol | Fungsi |
|--------|--------|
| Table ▼ | View switcher (Table/Board/Timeline/Gantt/Calendar) |
| Undo / Redo | History undo |
| Find | Cari dalam sheet |
| Filter ▼ | Filter rows berdasarkan kondisi |
| Sort | Urut rows |
| Outdent / Indent | Atur hierarki parent-child |
| Format | Text formatting (bold, italic, color) |
| Format Rules | Conditional formatting (highlight otomatis) |
| Formulas | Formula panel |
| Summary | Agregasi kolom (sum, count, avg, dll) |
| Conversations | Thread diskusi sheet-level |
| Attachments | File di level sheet |
| Requests | Update request management |
| Proofing | Creative review workflow |
| Forms ▼ | Kelola intake forms |
| Automations ⚡ | Workflow automation |
| Fullscreen | Mode layar penuh |
| Activity log | Riwayat semua perubahan |
| Sheet settings | Konfigurasi sheet |

---

## 9. Automations (Workflow)

Automation manager terbuka via toolbar **Automations** → dialog "Manage Automation Workflows".

### Cara Membuat
1. Pilih dari **template** atau "Create from scratch"
2. Atur **trigger** (kapan automation berjalan)
3. Atur **conditions** (filter opsional)
4. Atur **action** (apa yang dilakukan)

### Template Categories

**Notifications and Reminders:**
- Alert someone when specified criteria are met
- Remind someone on a specific date
- Alert someone when anything changes
- Send a message-only alert when criteria are met
- Alert a **Teams channel** when criteria are met
- Alert a **Slack channel** when criteria are met
- Alert someone when a row is deleted
- Alert someone when sharing changes

**Document Generation:**
- Generate documents when specified criteria are met

**Sheet to Sheet Workflows:**
- Move a row to another sheet when criteria are met
- Copy a row to another sheet when criteria are met

**Update and Approval Requests:**
- Request an update every week
- Request an update when criteria are met
- Request an **approval** when criteria are met

**Sheet Changes:**
- Change a cell value when criteria are met
- Record the date when criteria are met
- Assign someone when criteria are met
- Allow changes to a row when criteria are met

---

## 10. AI Features — Smart Assist

Smart Assist adalah AI assistant yang **built-in di setiap sheet** (tombol bintang/AI di header).

### Interface
- Sidebar panel di seisi kanan sheet
- Chat-based dengan text input
- Support file attachment
- Conversation history (multiple sessions)
- Full screen mode
- Quick action buttons berdasarkan struktur sheet aktif

### Kemampuan Smart Assist

**📊 Analyze & Understand Data**
- Summarize sheets — ringkasan data, metrics, status breakdown
- Answer questions — "How many tasks are overdue?", "What's assigned to me?"
- Detect patterns — outliers, concentration risks, overlapping date ranges
- Track changes — history perubahan per cell

**📈 Visualize Data**
- Create charts — bar, line, pie, stacked bar dari data sheet
- Add charts to dashboards — simpan chart ke Smartsheet dashboard
- Natural language chart creation: _"Show me a pie chart of tasks by status"_

**🛠️ Build & Organize**
- Create workspaces, folders, and sheets
- Create dashboards (AI-powered dari data sheet)
- Create reports (multi-sheet aggregation dengan filter)
- Add columns and rows

**✏️ Update & Manage**
- Update rows and columns — modifikasi values, rename kolom, ubah tipe kolom
- Delete rows, columns, or attachments
- Manage attachments — tambah URL, review existing

**🤖 Automate**
- Create workflows — setup automation berbasis aturan
- **Schedule AI tasks** — atur recurring/one-time AI analysis yang dikirim via email

**🔍 Search & Navigate**
- Find assets — cari di semua sheets, reports, dashboards, folders
- Search within a sheet — cari teks dalam cells
- Browse workspaces and folders

**💬 Collaborate**
- Manage discussions and comments — buat, baca, update, delete

**⭐ Organize & Share**
- Manage favorites
- View sharing info — siapa yang punya akses

### Quick Actions (Context-Aware)
Smart Assist menampilkan **suggested actions** berdasarkan struktur sheet:
- "Summarize this sheet"
- "Create a new sheet"
- "Based on my sheet structure, suggest charts to explore"
- "Add a Priority column"
- "Update tasks with overdue End Dates to At Risk in the Health column"
- "Start a discussion about task dependencies and blockers"
- "Surprise me"

---

## 11. Kolaborasi & Sharing

### Row-Level
- Conversations (@mention, emoji, attachment)
- Copy link to row (direct link)
- Send row (email row ke pihak luar tanpa butuh akses Smartsheet)
- Create request (minta update status via form)
- Lock row (cegah edit pada row kritis)

### Sheet-Level
- Conversations thread
- Attachments
- Proofing (creative/content review workflow)
- Activity log (siapa ubah apa, kapan)

### Workspace-Level
- Share button → bagi workspace atau sheet spesifik
- Role-based access (Admin, Editor, Commenter, Viewer)

### Update Requests (Fitur Unik)
User bisa mengirim **request form** ke anggota tim atau pihak eksternal:
- Penerima mendapat email dengan link form
- Tidak perlu punya akun Smartsheet
- Jawaban form otomatis mengupdate row di sheet

---

## 12. Fitur Khusus yang Membedakan Smartsheet

### 12.1 Spreadsheet-First UI
- Interface paling familiar bagi pengguna Excel/Google Sheets
- Support formula (SUM, IF, VLOOKUP, dll)
- Conditional formatting / Format Rules
- Row hierarchy (parent-child) dalam grid
- Column types lengkap

### 12.2 WorkApps
- Build custom **no-code apps** di atas data sheet
- Tampilkan sheet data dalam app UI yang lebih user-friendly
- Bisa untuk end-user yang tidak butuh akses langsung ke sheet

### 12.3 Resource Management
- Built-in capacity planning
- Lihat siapa yang over-allocated
- Terintegrasi dengan jadwal di sheets

### 12.4 Proofing
- Built-in creative review workflow
- Upload asset untuk di-review
- Reviewer beri feedback langsung di atas dokumen
- Approval workflow

### 12.5 Row Locking
- Lock row individual (⌘⇧L)
- Cegah perubahan accidental pada data kritis
- Hanya Admin yang bisa unlock

### 12.6 Schedule AI Tasks
- Atur AI untuk analisis data secara **recurring atau one-time**
- Hasil analisis dikirim via **email** ke recipients
- Tidak perlu masuk Smartsheet untuk dapat insight

### 12.7 Integrasi AI Eksternal
- Smartsheet tersedia di **berbagai AI platform** yang digunakan tim
- Kompatibel dengan AI assistants lainnya

### 12.8 Cross-Sheet Workflows
- Move/copy row **antar sheet** via automation
- Report yang mengagregasi data dari banyak sheet
- Formula cross-sheet referencing

---

## 13. Selling Points vs Kompetitor

| Aspek | Smartsheet | Keunggulan |
|-------|-----------|------------|
| **Learning Curve** | Rendah | Familiar spreadsheet → tidak perlu retrain user Excel |
| **AI** | Smart Assist paling lengkap | Bukan hanya chat — bisa manipulate data, buat chart, setup automation |
| **Build with AI** | Describe → AI buat workspace | Kompetitor biasanya hanya template static |
| **Multi-view** | 5 views native | Table + Board + Gantt + Calendar + Timeline dalam 1 sheet |
| **Update Requests** | Unik | Tim external bisa update status tanpa akun Smartsheet |
| **Resource Management** | Built-in | ClickUp dan Monday.com ada, tapi Smartsheet lebih terintegrasi |
| **WorkApps** | No-code app builder | Belum ada di Asana, Notion terbatas |
| **Proofing** | Built-in creative review | Hanya ada di Smartsheet dan beberapa tools khusus |
| **Document Generation** | Auto-generate dari data | Kompetitor butuh integrasi eksternal (Zapier, dll) |
| **Row Locking** | Per-row granular | Kompetitor biasanya per-project/sheet level |
| **Formula Support** | Excel-like | Notion/Asana tidak support formula kompleks |

---

## 14. Kelemahan / Gaps

- **Harga tinggi** — Business plan berbasis user/bulan, lebih mahal dari ClickUp
- **UI kompleks** — Banyak fitur = learning curve tinggi untuk non-spreadsheet user
- **Canvas-based grid** — Tidak bisa select multiple cells untuk copy-paste seperti Excel sejati
- **Mobile experience** — App mobile kurang powerful dibanding desktop
- **No real-time chat** — Conversations per row/sheet, bukan real-time chat seperti Slack
- **Offline mode** — Tidak support offline

---

*Research dilakukan: September 2026*  
*Platform: app.smartsheet.com (Business Plan Trial)*
