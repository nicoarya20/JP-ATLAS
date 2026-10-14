# Trello — Research Mendalam: Core Project & Task Features

> Riset langsung via browser | September 2026 | Akun: Free trial (13 hari tersisa)

---

## 1. Overview & Konsep Inti

Trello beroperasi di atas model **Kanban board**:
- **Workspace** → **Board** (setara "project") → **List** (kolom/tahapan) → **Card** (setara "task")
- Tagline baru: bukan sekadar board, tapi tiga panel terpadu: **Inbox + Planner + Board**

---

## 2. Create Board (Membuat Project)

### 2a. Manual (Classic)
Dialog create board muncul dari tombol **"Create"** di navbar.

| Field | Detail |
|---|---|
| **Title** | Required. Alert muncul jika kosong ("Board title is required") |
| **Background** | Pilih foto dari Unsplash (langsung preview) atau solid color — 4 foto + 9 warna |
| **Visibility** | Workspace / Private / Public |
| Tombol lain | "Start with a template" (shortcut ke template gallery) |

### 2b. AI-Powered Board Creation ✨
Opsi **"Create board with AI"** muncul di menu Create berdampingan dengan opsi manual.

- **Flow**: Ketik deskripsi bebas → AI generate struktur board (lists + cards) otomatis
- **Placeholder**: *"Describe or select what you want to create"*
- **Preset inspirasi** (klik auto-isi prompt):
  - "Organize my to-dos" → `"Create a board to help me organize and track my to-dos."`
  - "Reach a goal"
  - "Host an event"
  - "Plan a trip"
- **Default privacy**: Board dibuat sebagai Private
- **Powered by**: Atlassian Intelligence
- **Disclaimer**: "Content quality may vary" (link ke atlassian.com/trust/ai)

---

## 3. Board Layout — 3-Panel Interface (Fitur Baru)

Navigasi bawah board: **Inbox | Planner | Board | Switch boards**

### Panel 1: Inbox
Panel kiri — dedicated inbox untuk menangkap task dari luar.

- **Add a card** inline dari inbox
- Menerima cards dari **email** (forward ke `inbox@app.trello.com`)
- Menerima cards dari **Slack** (Save for later / emoji `:inbox_tray:`)
- Menerima cards dari **Microsoft Teams** (Create card dari pesan)
- Filter dan Inbox Menu tersedia
- Badge pada card: "From email", "Has description"

### Panel 2: Planner
Panel tengah — kalender/agenda mingguan terintegrasi.

- Default view: **Agenda** (daftar hari per minggu)
- Navigasi: Previous week / Today / Next week
- View switcher tersedia (bisa ganti ke tampilan lain)
- Cards dengan due date muncul di hari yang sesuai

### Panel 3: Board
Panel kanan — Kanban board klasik.

---

## 4. Create Card (Membuat Task)

### 4a. Inline Creation (Quick Add)
Tombol **"+ Add a card"** di bawah setiap list.

- Input: `"Enter a title or paste a link"` — satu field saja
- Bisa paste URL langsung (card otomatis ambil metadata link)
- Tombol: **Add card** | ✕ (cancel)
- Shortcut: tombol di pojok kanan bawah list untuk buka card baru di window terpisah

### 4b. Create from Template
Tombol **"Create from template…"** di sebelah "+ Add a card".

- Pilih dari template card yang sudah dibuat sebelumnya
- Berguna untuk card berulang dengan struktur checklist/label yang sama

### 4c. Capture dari Email/Slack/Teams
(Lihat Panel Inbox di atas)

---

## 5. Card Detail (Task Detail)

Card dibuka sebagai **modal/dialog** di atas board.

### 5a. Header Card
```
[○ Complete]  [Judul Card]                    [Today ▼] [👁] [···] [✕]
```

- **Complete button** (lingkaran di kiri judul): Toggle task selesai seketika
- **Judul**: Klik untuk edit inline (textarea yang bisa diubah langsung)
- **Date badge** (Today ▾): Konteks tanggal, bisa filter view
- **Watch** (👁): Subscribe notifikasi perubahan card
- **More options** (···): Aksi tambahan
- **Close** (✕): Tutup modal

### 5b. Quick Action Bar (di bawah judul)
```
[+ Add]  [🏷 Labels]  [📅 Dates]  [☑ Checklist]  [📎 Attachment]
```

Tombol akses cepat ke field yang paling sering dipakai.

### 5c. Breadcrumb List
```
[Trello Starter Guide ▾]
```
Klik untuk **pindahkan card ke list lain** tanpa drag-drop.

### 5d. Members Section
- Tampil avatar member yang di-assign
- Tombol **+** untuk menambah member
- Quick-assign tanpa masuk ke menu tersendiri

### 5e. Description
- **Editor**: Markdown-based rich text
- Placeholder: *"Add a more detailed description..."*
- Toolbar: Save | Cancel | **Formatting help**
- Format: bold, italic, link, list, heading via markdown syntax
- **Catatan**: Tidak ada AI writing assistant di free tier; mungkin premium

### 5f. Attachments
- Upload file dari komputer
- Preview otomatis untuk gambar
- Bisa jadikan gambar sebagai **Cover card**
- Metadata: nama file, tanggal upload, badge "Cover"
- Bisa download langsung dari card

### 5g. Checklist
- Judul checklist bisa dikustom (mis. "Try capturing to-dos from Email and Slack 📧")
- Progress bar dengan persentase (0%)
- Counter: `0/6` items
- Setiap item: checkbox + teks (support markdown link di teks item)
- Tombol **"Add an item"** di bawah list
- Tombol **"Delete checklist"** per checklist

### 5h. Comments & Activity
- Area kanan card (atau bawah di mobile)
- Input: *"Write a comment…"*
- Activity log: setiap perubahan tercatat (mis. "added this card to Trello Starter Guide · Sep 27, 2026")
- Toggle: "Show details" untuk lihat semua aktivitas

### 5i. Bottom Navigation Card
```
[⚡ Power-ups]  [⚡ Automations]  [💬 Comments]
```

---

## 6. "Add to Card" — Semua Field yang Tersedia

Klik **"+ Add"** (atau "Add to card") membuka menu:

| Field | Deskripsi |
|---|---|
| **Labels** | Organize, categorize, and prioritize — color labels dengan nama custom |
| **Dates** | Start dates, due dates, and reminders |
| **Checklist** | Add subtasks |
| **Members** | Assign members |
| **Attachment** | Add links, pages, work items, and more |
| **Focus time** ✨ | Schedule focus time for this card (integrasi calendar Atlassian) |
| **Location** | View this card on a map (pin lokasi geografis) |
| **Custom Fields** | Create your own fields (field custom per board) |

---

## 7. Card Actions (Edit & Management)

Dari tombol **"Actions"** di header card:

- Move (pindah ke board/list lain)
- Copy (duplikasi card)
- Make template (jadikan template)
- Watch
- Archive
- Delete

**Edit judul**: klik langsung pada judul di modal → textarea terbuka inline.

---

## 8. Views (Tampilan Board)

Akses via tombol **Views** di toolbar board.

> ⚠️ Views adalah fitur **PREMIUM** — hanya tersedia untuk Premium Workspaces

| View | Free | Keterangan |
|---|---|---|
| **Board** | ✅ | Kanban klasik — list + cards |
| **Table** | 🔒 Premium | Spreadsheet grid dengan semua cards |
| **Calendar** | 🔒 Premium | Cards berdasarkan due date |
| **Dashboard** | 🔒 Premium | Charts dan laporan otomatis |
| **Timeline** | 🔒 Premium | Gantt-like view per card |
| **Map** | 🔒 Premium | Cards dengan lokasi ditampilkan di peta |

---

## 9. Automation (Butler)

Akses via **board menu → Automation** atau tombol Automations di card.

### 9a. Automations
| Type | Deskripsi |
|---|---|
| **Rules** | If-then triggers: "When X happens → do Y automatically" |
| **Scheduled** | Time-based: jalankan aksi pada waktu tertentu |
| **Due date** | Date-triggered: aksi berdasarkan due date card |

**Contoh Rules yang ditampilkan:**
- `When a card is created in list "To Do" by me` → `add the "Steps" checklist`
- `When a card is moved to list "Done" by anyone` → `mark the due date as complete and remove all members from the card`
- `When I am added to a card` → `set the due date`

### 9b. Custom Buttons
| Type | Deskripsi |
|---|---|
| **Card buttons** | Tambah tombol aksi di setiap card (muncul di card menu) |
| **Board buttons** | Tambah tombol aksi di toolbar board |

### 9c. App Automations
- **View apps**: Integrasi automation dengan third-party apps

### 9d. AI dalam Automation
- **Suggestions**: AI merekomendasikan automation yang relevan berdasarkan pola kerja
- **Activity**: Log semua automation yang berjalan
- **Reports**: Analytics performa automation

---

## 10. Board Menu (Pengaturan Board)

Tombol **"···" (Show menu)** di kanan toolbar board membuka sidebar menu:

| Item | Fungsi |
|---|---|
| **Share** | Undang orang ke board |
| **About this board** | Tambah deskripsi board |
| **Visibility: Private** | Ubah ke Workspace / Public |
| **Print, export, and share** | Export ke JSON, PDF, dll |
| **Star** | Tandai sebagai favorit |
| **Settings** | Pengaturan board |
| **Change background** | Ganti foto/warna latar |
| **Custom Fields** | Kelola field kustom board |
| **Automation** | Akses Butler automation |
| **Power-Ups** | Kelola integrasi 3rd party |
| **Labels** | Buat dan kelola color labels |
| **Stickers** | Tambah stiker dekoratif ke cards |
| **Make template** | Jadikan board sebagai template |
| **Activity** | Log semua aktivitas board |
| **Archived items** | Lihat cards yang diarsipkan |

---

## 11. Power-Ups (Integrasi)

Ekosistem integrasi 3rd party yang luas, diakses via Power-Ups.

**Kategori contoh**: Jira, Slack, GitHub, Google Drive, Salesforce, Zendesk, dll.

- Free: 1 Power-Up per board
- Premium: unlimited Power-Ups

---

## 12. AI Features Lengkap (Atlassian Intelligence)

| Fitur AI | Lokasi | Deskripsi |
|---|---|---|
| **Create board with AI** | Create menu | Describe → AI bangun board (lists + cards) otomatis |
| **Automation Suggestions** | Butler → More → Suggestions | AI rekomendasikan rule automation yang relevan |
| **AI Board Presets** | Create with AI dialog | Template prompt: organize to-dos, reach goals, host events, plan trips |

> Powered by **Atlassian Intelligence** — note: "Content quality may vary"
> Lisensi: [atlassian.com/trust/ai](https://www.atlassian.com/trust/ai)

---

## 13. Selling Points & Diferensiasi Unik

### 🥇 Selling Point Utama

1. **Simplicity First — Zero Learning Curve**
   Trello adalah PM tool paling mudah dipahami. Konsep Inbox → list → card sangat intuitif bahkan untuk non-tech user. Tidak ada terminologi rumit.

2. **AI Board Builder — Friction Paling Rendah**
   Dari semua kompetitor, Trello memiliki flow "start with AI" paling sederhana: cukup satu kalimat → board siap dipakai. Tidak perlu pilih template dulu.

3. **Inbox — Unified Capture dari Mana Saja**
   Fitur paling unik dibanding kompetitor: panel **Inbox** khusus yang terintegrasi native dengan email, Slack, dan Microsoft Teams. User bisa forward email → langsung jadi card. Tidak perlu buka Trello.

4. **3-Panel Workspace: Inbox + Planner + Board**
   Layout tiga panel secara bersamaan sangat membantu personal productivity — melihat inbox, agenda mingguan, dan board dalam satu layar.

5. **Butler Automation — No-Code yang Powerful**
   Automation engine (Butler) built-in tanpa perlu Power-Up tambahan. Rules, schedule, date triggers, custom card/board buttons — semua tersedia dalam UI visual yang mudah dipahami.

6. **Focus Time (Atlassian Feature)**
   Fitur unik: tambahkan "Focus time" ke card → blokir waktu di kalender untuk mengerjakan task tersebut. Integrasi dengan Atlassian calendar ecosystem.

7. **Power-Ups Ecosystem yang Matang**
   Ekosistem integrasi terbesar di antara PM tools. Ratusan apps tersedia dari marketplace resmi.

8. **Atlassian Ecosystem Lock-in (untuk Enterprise)**
   Deep integration dengan Jira Software, Confluence, Bitbucket via Power-Ups → natural upgrade path dari personal ke tim engineering.

9. **Card Templates**
   "Create from template" memungkinkan user membuat card berulang dengan struktur yang konsisten (checklist, labels, members sudah preset).

10. **Location on Cards**
    Bisa pin lokasi geografis ke card dan lihat di Map view (premium) — diferensiasi unik untuk use case event management / field operations.

---

## 14. Kelemahan & Celah

| Kelemahan | Detail |
|---|---|
| **Views terkunci Premium** | Table, Calendar, Timeline, Dashboard, Map — semua premium. Kompetitor lain (ClickUp, Notion) memberikan lebih banyak views di free tier |
| **Deskripsi hanya Markdown** | Tidak ada rich text editor modern (block-based seperti Notion). Tidak ada AI writing di free tier |
| **Custom Fields terbatas** | Free tier sangat terbatas. Premium diperlukan untuk memanfaatkan penuh |
| **Power-Ups dibatasi** | Free: 1 per board — sangat membatasi untuk integrasi |
| **Tidak ada Docs/Pages** | Tidak ada fitur knowledge base / wiki terintegrasi (harus pakai Confluence terpisah) |
| **Field card terbatas** | Tidak ada native number/formula fields seperti Airtable atau ClickUp |
| **Harga AI** | Atlassian Intelligence hanya di paket premium ke atas |

---

## 15. Posisi di Pasar

**Target User:**
- Individual / personal productivity
- Tim kecil (3-10 orang) non-teknis
- Tim yang baru mulai dengan project management
- Use case: marketing, event planning, personal to-do, HR onboarding

**Kompetitor Langsung:**
- Asana (lebih kompleks, lebih powerful untuk tim besar)
- Monday.com (lebih visual, lebih mahal)
- ClickUp (lebih feature-rich, bisa overwhelming)
- Notion (database-first, lebih fleksibel tapi lebih steep learning curve)
- Linear (engineering-focused, tidak untuk non-tech)

**Pesan Inti Trello:** *"Boards, lists, and cards enable you to organize and prioritize your projects in a fun, flexible, and rewarding way."*

---

*Research dilakukan: 28 September 2026 | Platform: Web app (trello.com) | Account: Free trial*
