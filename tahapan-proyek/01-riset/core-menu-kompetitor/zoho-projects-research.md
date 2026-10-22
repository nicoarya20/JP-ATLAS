# Zoho Projects — Deep Research: Project & Task Core

> Research dilakukan via live browser session pada https://projects.zoho.com  
> Tanggal: 28 September 2026

---

## Ringkasan Eksekutif

Zoho Projects adalah PM tool dari ekosistem Zoho yang menawarkan **kedalaman fitur enterprise** (bug tracker, time tracking, attendance, billing, approval) dalam satu platform. Selling point utamanya adalah **integrasi native antar-produk Zoho** (CRM, Books, Cliq, WorkDrive) dan **harga yang jauh lebih terjangkau** dibanding Asana/Monday untuk fitur setara. Kelemahannya: UI terasa lebih berat dan kompleks dibanding Linear atau ClickUp modern.

---

## 1. PROJECT — Create

### Alur Create Project
Saat user klik "Proyek Baru", langkah pertamanya bukan langsung form, melainkan **Template Gallery**:

```
[Galeri Templat]
├── Filter kategori: Semua | Templat Proyek | Perangkat lunak/IT | Konstruksi | Farmasi | ...
├── Search template ("Cari Templat")
├── [Proyek kosong] — Mulai semuanya dari awal (blank slate)
└── Pre-defined templates (dengan screenshot preview UI):
    ├── Lainnya
    ├── Pemasaran/Penjualan
    └── ... (berbasis industri)
```

**Insight:** Template Gallery mucul sebelum form — ini beda dari kompetitor. Ini mendorong user pakai template terlebih dahulu, bukan langsung isi form kosong. Ada opsi "Jangan tampilkan ini kembali" untuk skip di sesi berikutnya.

### Form Create Project (setelah pilih blank/template)

| Field | Tipe | Keterangan |
|-------|------|-----------|
| **Judul Proyek** | Text (required) | Nama proyek |
| **Pemilik** | Dropdown | Default ke user saat ini |
| **Templat** | Dropdown | Pilih template yang sudah ada |
| **Tanggal Mulai** | Date picker | Start date proyek |
| **Tanggal Akhir** | Date picker | End date proyek |
| **Jadikan ini proyek ketat** | Checkbox | Mode strict: task tidak bisa start/end di luar tanggal proyek |
| **Grup Proyek** | Dropdown | Kelompokkan proyek dalam grup (ada + Tambah Grup Baru) |
| **Deskripsi** | Rich Text Editor | Dengan AI content generation (tombol "Hasilkan konten" via Zia) |
| **Jam Kerja** | Dropdown (required) | "Standard Business Hours" — untuk time tracking |
| **Tugas Tata Letak** | Dropdown | Pilih custom layout untuk task di proyek ini |
| **Tag** | Multi-input | Tag proyek |

**AI di Create Project:**
- Tombol **"Hasilkan konten" (Zia)** ada di toolbar deskripsi — user bisa generate deskripsi proyek dengan AI.

**Shortcut:** `⌘ + Enter` untuk submit form.

---

## 2. PROJECT — Detail / Edit

### Project List View
Columns default di halaman Projects (all projects):

| Kolom | Isi |
|-------|-----|
| ID | Auto-generated (contoh: NI-1) |
| Nama Proyek | Clickable |
| Progress | Persentase (0%) |
| Pemilik | Avatar + nama |
| Status | Aktif / Arsip |
| Tugas | Count + progress bar (open tasks) |
| Fase | Milestone count |
| Masalah | Bug/issue count |
| + Tambahkan Kolom | Customizable |

### Project Detail Panel (Tampilkan Detail)
Di dalam project, header menampilkan:
- **Project ID** (NI-1) + **Nama Proyek**
- Tombol "Tindakan lainnya" (⋯) untuk: Edit, Arsipkan, Hapus, Export, dll
- Tombol "Tampilkan Detail" — membuka panel info project (Fase, Owner, Created date, dll)

**Project Tabs:**
```
Dasbor | Tugas | Pengguna | Laporan | Dokumen | Fase | ⋯ (more)
```

### Mode "Proyek Ketat" (Strict Project)
Fitur unik: saat diaktifkan, **task/milestone/issue tidak bisa dimulai atau diakhiri di luar tanggal yang dijadwalkan** pada proyek. Ini enforcement date constraint yang tidak ada di semua PM tool.

---

## 3. TASK — Create

### Cara Membuat Task
Ada 3 cara:
1. **Inline di task list** — klik "Tambahkan Tugas" di baris bawah task list
2. **Form popup** — muncul panel form overlay
3. **AI Task Suggestions** — tombol "Saran AI untuk Tugas" (lihat seksi AI)

### Form Create Task (Panel Overlay)

```
[Tugas Baru]  |  Test Research Project [Tata Letak Privat] [Edit Tata Letak]
─────────────────────────────────────────────────────────────────────────────
Nama Tugas *
[_____________________________________________________________]

Tambahkan Deskripsi ▼
[Toolbar: B I U ~~  |  Font  |  Size  |  Color  |  Align  |  List  |  More]
[── ── Hasilkan konten (Zia AI) ──]
[Rich Text Editor Area]

Daftar Tugas
[Umum ▼]

Letakkan file atau tambahkan lampiran di sini...
Maksimum 30 file

▼ Tugas Informasi
  Tim Terkait     [Select]
  Pemilik         [Pilih Pengguna/Sumber Daya]

[Tambahkan]  [Tambahkan Lebih Banyak]  [Batalkan]
```

### Field Detail Form Create Task

| Field | Keterangan |
|-------|-----------|
| **Nama Tugas** | Required. Textarea (bisa multi-line) |
| **Deskripsi** | Rich text editor dengan toolbar lengkap + AI Generate Content (Zia) |
| **Daftar Tugas** | Dropdown — kelompokkan task dalam "task list" (default: Umum/General) |
| **Lampiran** | Drag & drop area, max 30 file |
| **Tim Terkait** | Pilih team/department |
| **Pemilik** | Multi-assignee: bisa assign ke beberapa user/resource |

**Note:** Form memiliki link "Edit Tata Letak" yang langsung mengarah ke setup halaman untuk customize field yang muncul di form ini.

---

## 4. TASK — List View

### Kolom Default Task Grid

| Kolom | Keterangan |
|-------|-----------|
| Checkbox | Select task |
| ID | Auto (TR1-T1, format: [ProjectCode]-T[Number]) |
| Nama Tugas | Dengan ikon "critical task flag" |
| (icon) | Kritisitas task |
| Pemilik | Avatar |
| Status | Dropdown (Buka, Dalam Proses, dll) |
| Tag | Label |
| Tanggal Mulai | |
| Batas Tanggal Berakhir | |
| + Tambahkan Kolom | Customizable |

**Fitur di Task List:**
- **Customize Grid** — pilih kolom apa yang tampil
- **Group By** — default by Daftar Tugas, bisa diubah
- **Otomatisasi** — tombol di header untuk buka workflow rules
- **Filter** — filter task
- **Collapse/Expand** task list groups
- **Saran AI untuk Tugas** button (AI task suggestion)

---

## 5. TASK — Detail View

Saat task diklik, panel detail muncul di sisi kanan (slide-in panel, tidak navigate ke halaman baru):

### Header Panel

```
[🗂 Tugas]  [TR1-T1]                          [⋯] [👤+] [↗] [✕]
───────────────────────────────────────────────────────────────
Research Zoho Projects Features  [🌐 Terjemahkan]
By Nico Arya Putra Laksana                 [💬] [📎] [ℹ]
```

- **ID badge**: menampilkan type (Tugas) dan ID task (TR1-T1)
- **Copy to clipboard** button untuk nama task
- **Terjemahkan** (Translate) — langsung translate nama task ke bahasa lain
- **Tindakan lainnya (⋯)**: Edit, Duplikasi, Archive, Delete, dll
- **Pengikut (👤+)**: Tambah follower/watcher
- **Share (↗)**: Share link task
- **Komentar (💬)**, **Lampiran (📎)**, **Info (ℹ)**

### Status Section
```
● Buka ▼          ← dropdown untuk ganti status
STATUS
```

### Description Section
- Rich text area untuk deskripsi task
- **Tombol AI Generate Content (Zia)** tersedia di toolbar

### Tugas Informasi (Task Information Fields)

| Field | Default | Keterangan |
|-------|---------|-----------|
| **Tim Terkait** | — | Assign ke team/dept |
| **Pemilik** | — | Multi-assignee |
| **Jam Kerja** | 00:00 | Time logged |
| **Status** | Buka | Dropdown status |
| **Tanggal Mulai** | — | Date picker |
| **Batas Tanggal Berakhir** | — | Due date |
| **Durasi** | 2 hari/jam/cdays/chours | Estimated duration |
| **Prioritas** | Tidak ada | None/Low/Medium/High/Critical |
| **Persentase Penyelesaian** | 0 | 0–100% |
| **Tag** | — | Label task |
| **Pengingat** | Tidak ada | Reminder |
| **Pengulangan** | — | Recurring task config |
| **Jenis Penagihan** | Tidak ada | Billable/Non-billable/Non-billable Hours |

### Bottom Tabs di Task Detail

```
Komentar | Subtugas | Jam Catatan | Dokumen | Dependensi | Lini Masa Status | ...
```

| Tab | Fungsi |
|-----|--------|
| **Komentar** | Thread diskusi dengan Rich Text + AI generate content + email reply |
| **Subtugas** | Buat sub-task bersarang di bawah task ini |
| **Jam Catatan** | Log waktu yang sudah dicatat untuk task ini |
| **Dokumen** | File terlampir ke task |
| **Dependensi** | Set task dependencies (finish-to-start, start-to-start, dll) |
| **Lini Masa Status** | Audit trail perubahan status task |

### "Informasi Lebih Lanjut" (ℹ) Tooltip
Saat hover/klik icon ℹ:

| Info | Value |
|------|-------|
| Fase | Milestone yang terkait |
| Daftar Tugas | Nama task list |
| Waktu yang Dibuat | Timestamp |
| Waktu Modifikasi | Timestamp |
| Terakhir Dimodifikasi oleh | Nama user |

### Email-to-Comment
Setiap task punya **unique email address**:
```
b9Y64rd8eK4m7d8k0lx6700kx6708EN7S71c2@zohoprojects.com
```
Reply ke email ini = tambah komentar ke task. Fitur ini memungkinkan external stakeholder berkomunikasi tanpa login ke Zoho Projects.

---

## 6. VIEWS (Tampilan Task)

### View Switcher
Tiga pilihan view tersedia (klik tombol "Daftar ▼" di header):

| View | Ikon | Deskripsi |
|------|------|-----------|
| **Daftar** | ≡ | Grid/spreadsheet — default |
| **Gantt** | ── | Timeline dengan bar chart |
| **Kanban** | ⊞ | Board dengan kolom status |

### Gantt View
- **Layout**: panel kiri (task list: ID + Nama Tugas) + panel kanan (timeline)
- **Default period**: Weekly (W38, W39, W40...)
- **Zoom**: Perbesar / Perkecil
- **Navigate**: Lompat ke Tugas (jump to task bar)
- Task yang belum ada due date tidak muncul sebagai bar

### Kanban View
- **Default columns** (sesuai status task):
  - Buka (Open)
  - Dalam Proses (In Progress)
  - Sedang Ditinjau (Under Review)
  - Akan Diuji (To Be Tested)
- **Card fields**: Task ID, Nama Tugas, Task List (General), Due Date, Owner avatar
- **Drag & drop** antar kolom
- **Kustomisasikan Kolom** — tambah/edit kolom status
- **Tampilkan Opsi** — atur card fields yang tampil

---

## 7. AI FEATURES (Zia)

Zoho Projects menggunakan **Zia** sebagai nama AI assistant-nya. Ada 4 fitur AI yang ditemukan:

### 7.1 Saran AI untuk Tugas (AI Task Suggestions)
- Tombol "Saran" dengan ikon bintang di header task list
- Saat diklik muncul popup: *"Klik di sini untuk mengaktifkan Tugas Berbasis AI"*
- Harus **diaktifkan secara terpisah** (bukan default on)
- Fungsi: AI menyarankan daftar task berdasarkan nama/konteks proyek

### 7.2 Hasilkan Konten (AI Content Generation)
- **Lokasi**: Toolbar description editor di form Create Task, Create Project, dan Task Detail Comment
- **Ikon**: Bintang/AI icon di toolbar
- Fungsi: Generate deskripsi task/project, auto-write comment berdasarkan konteks
- Berjalan via Zia

### 7.3 Zia Button (Document AI)
- Tombol "Zia" ada di Documents section dalam project
- Full AI assistant untuk dokumen: Q&A, summarize, extract info dari dokumen

### 7.4 Terjemahkan (AI Translation)
- Tombol translate langsung di nama task di detail panel
- Translate konten task ke bahasa lain
- Berguna untuk tim multinasional/internasional

---

## 8. AUTOMATION (Workflow Rules)

Accessible dari tombol "Otomatisasi" di header task view.

### Pre-built Workflow Rules (Default)

| Code | Nama Rule | Trigger | Fungsi |
|------|-----------|---------|--------|
| **NO** | Notify Owner on Task Assignment/Status Change | Perbarui (Tanggal Mulai, Pemilik) | Notif owner saat ada perubahan assignment/status |
| **NF** | Notify Follower on Task Assignment/Status Change | Perbarui (Tanggal Mulai, Pemilik) | Notif follower saat ada perubahan |
| **RT** | Remind Task Owners on the Due Date | Perbarui (Tanggal Mulai, Pemilik, Due Date) | Reminder H-X sebelum due date |
| **AT** | Assign Task to Project Owner by Default | Pembuatan (Creation) | Auto-assign task baru ke project owner |

**Fitur Automation:**
- Toggle enable/disable per rule
- "Jalankan Aturan Berikutnya" — chain rules (jalankan rule berikutnya setelah rule ini)
- "Aturan Alur Kerja Baru" — buat custom workflow rule
- "Susun Ulang" — atur urutan eksekusi rules
- Setiap rule berlaku untuk "Semua Tata Letak" (all layouts)

---

## 9. NAVIGATION & MODUL

### Global Navigation (Top Bar)
| Menu | Fungsi |
|------|--------|
| **Beranda** | My Work: semua tugas/milestone/issue yang di-assign ke saya |
| **Laporan** | Cross-project reports |
| **Projects** | Daftar semua proyek |
| **Pengguna** | User management portal-wide |
| **Kolaborasi** | Team collaboration hub |
| **Persetujuan Saya** | Approval workflow yang menunggu action |

### Sidebar Overview (Ikhtisar)
Cross-project work view:

| Module | Fungsi |
|--------|--------|
| **Tugas** | Semua task dari semua proyek |
| **Masalah** | Bug/issue tracker cross-project |
| **Fase** | Semua milestone cross-project |
| **Log Waktu** | Time log entries |
| **Absensi** | Attendance management |

### Bottom Bar
- **My Pins** — pin item-item penting
- **Chats** — Zoho Cliq embedded
- **Channels** — Team channels
- **Threads** — Discussion threads
- **Contacts** — Directory

---

## 10. SELLING POINTS & DIFFERENTIATORS

### Keunggulan vs Kompetitor

| # | Differentiator | Detail | vs Kompetitor |
|---|---------------|--------|---------------|
| **1** | **Zoho Ecosystem Integration** | Native connect ke Zoho CRM (deal → project), Zoho Books (invoice dari billable hours), Zoho Cliq (chat), Zoho WorkDrive (documents), Zoho Analytics (reporting) | Asana/Monday hanya punya integrasi third-party via API/Zapier |
| **2** | **Jenis Penagihan per Task** | Field "Jenis Penagihan" di setiap task (Billable/Non-billable). Time log langsung bisa di-invoice via Zoho Books | ClickUp punya time tracking tapi billing ke invoice system perlu integrasi manual |
| **3** | **Strict Project Mode** | Task tidak bisa mulai/selesai di luar jadwal proyek — enforcement constraint yang ketat | Tidak ada di Asana, Linear, Notion, ClickUp |
| **4** | **Built-in Bug/Issue Tracker** | Module "Masalah" dedicated untuk bug tracking dengan workflow sendiri, bukan cuma task dengan tag | Trello/Notion butuh plugin; Linear punya tapi bukan PM tool |
| **5** | **Attendance Management** | Module "Absensi" untuk time/attendance tracking dalam satu platform | Tidak ada di semua kompetitor utama |
| **6** | **Email-to-Comment per Task** | Unique email address per task untuk external stakeholder reply via email | Asana punya email forward tapi tidak sespesifik ini |
| **7** | **AI Task Suggestions (Zia)** | AI generate daftar task berdasarkan nama proyek | ClickUp AI ada tapi bayar extra; Asana AI masih beta limited |
| **8** | **Built-in Translation** | Tombol Terjemahkan langsung di task detail | Tidak ada native di semua kompetitor |
| **9** | **Industry Templates** | Template pre-built untuk Software/IT, Konstruksi, Farmasi dengan visual preview | Monday.com punya template tapi tidak se-spesifik industri |
| **10** | **Custom Task Layout per Project** | Project berbeda bisa punya field task yang berbeda | Asana hanya global custom fields |
| **11** | **My Approvals** | Module approval workflow built-in | Wrike punya, tapi Asana/ClickUp butuh workflow rules |
| **12** | **Recurring Tasks** | Field "Pengulangan" langsung di task detail | Tersedia di semua, tapi di Zoho ini built-in tanpa add-on |
| **13** | **Price-to-Feature Ratio** | Lebih murah dari Asana/Monday/Wrike untuk fitur level enterprise | Zoho One bundle bisa dapat semua 55+ apps |

### Kelemahan vs Kompetitor

| Kelemahan | Detail |
|-----------|--------|
| **UI lebih kompleks** | Banyak modul dan tombol — learning curve lebih tinggi dari Linear/Notion |
| **AI membutuhkan aktivasi manual** | Saran AI untuk Tugas tidak langsung aktif — harus di-enable terpisah |
| **UX terasa legacy** | Design tidak se-modern ClickUp 3.0 atau Linear |
| **Kanban terbatas** | Hanya 3 view: List, Gantt, Kanban. Tidak ada Calendar view di task level (hanya di portal level) |
| **Onboarding complex** | Banyak konsep baru: task list, strict mode, billing type, attendance |
| **Tight Zoho lock-in** | Nilai terbesar dari integrasi hanya terasa kalau pakai produk Zoho lain |

---

## 11. TASK FIELD SUMMARY (Quick Reference)

### Create Form Fields
```
Nama Tugas* | Deskripsi (RT+AI) | Daftar Tugas | Lampiran (30 max)
Tim Terkait | Pemilik (multi)
```

### Detail Panel Fields
```
STATUS (badge dropdown)
Deskripsi (RT+AI)
Tim Terkait | Pemilik | Jam Kerja | Status | Tanggal Mulai | Due Date
Durasi | Prioritas | % Penyelesaian | Tag | Pengingat | Pengulangan | Jenis Penagihan
```

### Detail Tabs
```
Komentar | Subtugas | Jam Catatan | Dokumen | Dependensi | Lini Masa Status
```

### Info Tambahan (tooltip ℹ)
```
Fase | Daftar Tugas | Waktu Dibuat | Waktu Modifikasi | Terakhir Dimodifikasi Oleh
```

---

## 12. SCREENSHOT REFERENCES

Semua screenshot tersimpan di `/tmp/` dari sesi research:

| File | Konten |
|------|--------|
| `zoho-tasks-view.png` | Task list view dengan kolom grid |
| `zoho-task-create.png` | Form create task |
| `zoho-ai-suggestions.png` | Tombol AI Task Suggestions |
| `zoho-task-detail2.png` | Task detail panel dengan semua fields |
| `zoho-task-moreinfo.png` | Tooltip "Informasi Lebih Lanjut" |
| `zoho-view-switcher.png` | Dropdown view: Daftar/Gantt/Kanban |
| `zoho-gantt2.png` | Gantt view dengan timeline |
| `zoho-kanban.png` | Kanban view dengan kolom status |
| `zoho-project-create.png` | Template Gallery saat buat proyek |
| `zoho-project-form.png` | Form create project lengkap |
| `zoho-automation2.png` | Automation (Workflow Rules) panel |

---

*Research via live browser session — Zoho Projects (projects.zoho.com) — 28 Sep 2026*
