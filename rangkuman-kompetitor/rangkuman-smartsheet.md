# Rangkuman Riset Kompetitor: Smartsheet

**URL:** https://app.smartsheet.com
**Tanggal riset:** 27 September 2026
**Plan saat riset:** Business Plan (Trial 30 hari)
**Metode:** Eksplorasi langsung via browser (ego-browser), screenshot tiap menu

---

## 1. Gambaran Umum

Smartsheet adalah platform manajemen kerja berbasis cloud yang menggunakan **spreadsheet sebagai fondasi utama** antarmukanya. Berbeda dari PM tools berbasis Kanban (Trello) atau task list (Asana), Smartsheet terasa seperti **Excel yang bisa berkolaborasi real-time** — dengan tambahan fitur Gantt chart, Automation, Form digital, Dashboard pelaporan, dan kini AI assistant.

Target utama: **tim enterprise dan project manager** di perusahaan menengah–besar yang sudah akrab dengan Excel/Google Sheets dan butuh alat kolaborasi yang lebih powerful.

---

## 2. Navigasi Utama — Sidebar Kiri

Ada **9 item navigasi utama** di sidebar kiri dan **3 item** di bagian bawah sidebar.

### 2.1 Item Navigasi Atas

| No | Menu | Route / Path | Tipe UI | Fungsi Utama |
|----|------|-------------|---------|--------------|
| 1 | **Home** | `/b/home` | Halaman penuh | Dashboard pribadi: Smart Assist AI chatbox, Quick Links (pin file), Mentions (sebutan di komentar) |
| 2 | **Notifications** | *(overlay panel)* | Panel slide-in | Semua notifikasi masuk, tab: **All** dan **Requests** |
| 3 | **Search** | *(overlay dialog)* | Dialog global | Pencarian semua aset (sheet, report, dashboard, form), tampilkan riwayat recent |
| 4 | **Browse** | `/browse/workspaces` | Halaman + sidebar | Navigasi file utama: Portfolios, WorkApps, Scenario Plans, Sheets, Workspaces, Deleted Items |
| 5 | **Recents** | *(overlay flyout)* | Flyout panel | Daftar item yang baru dibuka, bisa search by name, pin, dan buka options |
| 6 | **Favorites** | *(overlay flyout)* | Flyout panel | Item yang sudah di-bintangi; empty state dengan instruksi jelas |
| 7 | **Resource Management** | `/r/rm` | Halaman penuh | Sub-tab: My Work, People, Schedule, Projects, Reports — **fitur premium, butuh upgrade tersendiri** |
| 8 | **WorkApps** | `/workapps` | Halaman + iframe | Platform bangun custom app dari data Smartsheet, filter: Shared with you / Recently updated |
| 9 | **Create (+)** | *(overlay dropdown)* | Dropdown menu | Buat konten baru: Sheet, Report, Dashboard, Form, Import, Workspace + **Build with AI** |

### 2.2 Item Navigasi Bawah Sidebar

| Ikon | Nama | Tipe UI | Fungsi |
|------|------|---------|--------|
| ⚡ Grid | **Launcher** | Dialog | Shortcut ke produk Smartsheet lain (saat ini: link ke WorkApps) |
| ❓ | **Help (Resource Center)** | Panel resizable | Artikel kontekstual, video, quick links (Community, Training, Sales, University), Chat with Support |
| 👤 Avatar | **Account** | Dropdown | Upgrade Plan, Plan & Billing, User Management, Group Management, Personal Settings, Apps & Integrations, Personal Colors & Logo, My Contacts, Sign Out |

---

## 3. Sub-menu Browse

Halaman Browse menampilkan **sidebar navigasi kiri** yang bisa di-expand dengan item berikut:

| Sub-item | Route | Fungsi |
|----------|-------|--------|
| **Portfolios** *(New)* | `/r/portfolios` | Kelola dan monitor beberapa proyek sekaligus dalam satu tampilan |
| **WorkApps** | `/browse/workapps` | Shortcut ke daftar WorkApps |
| **Scenario Plans** | `/browse/scenario-plans` | Alat simulasi "what-if" — skenario anggaran/timeline sebelum keputusan |
| **Sheets** | `/folders/personal` | Semua sheet di luar workspace tertentu (folder personal) |
| **Workspaces** | `/browse/workspaces` | Container proyek; info: sharing status, owner, last update |
| Workspace spesifik | `/browse/workspaces/{id}` | Isi satu workspace tertentu |
| **Deleted Items** | `/deleted` | Recycle bin, bisa restore file yang terhapus |

### Pola URL Sheet

```
/sheets/{sheetId}?view=gantt      → Sheet terbuka di Gantt view
/sheets/{sheetId}?view=table      → Sheet terbuka di Table view
/sheets/{sheetId}?view=board      → Sheet terbuka di Board view
```

View tersimpan di query param `?view=`.

---

## 4. Sheet Editor — Detail Fitur

Saat membuka sebuah sheet, antarmuka berubah total dengan toolbar dan menu bar tersendiri.

### 4.1 Menu Bar Sheet (horizontal, di atas sheet)

#### File
- Create New...
- Import (dari Excel, CSV, Google Sheets, Asana, dll)
- Open... *(⌘+/)*
- Save *(⌘+S)*
- Save as New...
- Save as Template...
- Rename...
- Refresh
- Share...
- Send as Attachment...
- Email Shared Users...
- Export (Excel, PDF, CSV, HTML)
- Print...
- Delete...
- View Activity Log...
- Properties...

#### Automation
- Create from template...
- Create from scratch...
- Manage automation workflows...
- Learn more...

#### Forms
- Create Form...
- Manage Forms...
- Learn about Forms

#### Connections
- Data Shuttle — Create workflow
- Data Shuttle — Manage workflows
- Learn more

### 4.2 5 Tipe View dalam Sheet

| View | Deskripsi |
|------|-----------|
| **Table** *(New)* | Grid spreadsheet klasik, mirip Excel — paling familiar untuk pemula |
| **Board** | Kanban board berbasis kolom status — mirip Trello |
| **Timeline** | Visualisasi waktu tanpa hierarki parent-child — lebih simpel dari Gantt |
| **Gantt** | View default PM; hierarki task + subtask, bar waktu, Baselines |
| **Calendar** | Tampilan kalender bulanan berdasarkan kolom tanggal |

### 4.3 Toolbar Atas Sheet

- Simpan / Cetak / Undo / Redo
- Dropdown View (Gantt, Table, Board, dll)
- Filter
- Indent / Outdent (hierarki tugas)
- Pilih font dan ukuran font
- Baselines (untuk Gantt)
- Settings / Expand

### 4.4 Panel Kanan Sheet (Ikon Vertikal)

10 ikon tanpa label teks (hanya tooltip hover):

| Ikon | Fungsi |
|------|--------|
| 💬 | Comments — thread diskusi per baris |
| 📎 | Attachments — lampirkan file ke baris |
| 📋 | Activity Log — riwayat semua perubahan |
| ➕ | Add Row |
| 🔔 | Alerts & Actions — pengaturan notifikasi |
| 🌐 | Publish — publikasikan sheet sebagai halaman web publik |
| ⚡ | Automations — akses cepat ke automation |
| 🔌 | Connectors — integrasi tool eksternal |
| ✨ | Smart Assist — AI dalam konteks sheet |

### 4.5 Workspace Panel (Sidebar Kiri saat dalam Sheet)

Sidebar kiri berganti menjadi **Workspace Panel** yang menampilkan:
- Nama workspace (bisa rename)
- Tombol "Add to workspace"
- Daftar semua item dalam workspace (sheet, report, dashboard, scenario plans, dll)

---

## 5. Menu Account — Detail Sub-item

| Grup | Item | Fungsi |
|------|------|--------|
| **Organisasi** | Upgrade Plan... | Halaman upgrade/pilih plan |
| | Plan & Billing Info... | Info tagihan dan plan aktif |
| | User Management... | Kelola user dalam organisasi |
| | Group Management... | Kelola grup/tim |
| **Personal** | Personal Settings... | Preferensi personal (notif, bahasa, dll) |
| | Apps & Integrations... | Koneksi ke Slack, Google, Microsoft, dll |
| | Personal Colors & Logo... | Kustomisasi tampilan akun |
| | My Smartsheet Contacts... | Buku kontak untuk sharing |
| | Sign Out | Keluar dari akun |

---

## 6. Fitur AI yang Ditemukan

| Fitur | Lokasi | Fungsi |
|-------|--------|--------|
| **Smart Assist** | Homepage (box tengah) + panel dalam sheet | Chatbot AI — bisa tanya tentang fitur, minta buat konten, dsb |
| **Build with AI** | Menu Create → opsi pertama | Buat sheet/form/report dari deskripsi teks |
| **AI Summary** | *(kontekstual di sheet)* | Ringkasan isi sheet |

---

## 7. Analisis Keunggulan & Kelemahan

### 7.1 Untuk Pengguna Awam / Umum

**Keunggulan:**
- Tampilan familiar seperti Excel — orang yang biasa spreadsheet langsung nyaman
- Smart Assist AI membantu orientasi dari hari pertama
- Build with AI mempercepat onboarding — tidak perlu mulai dari nol
- Template berlimpah untuk berbagai industri
- Multiple view dalam satu data (Gantt, Board, Kalender) tanpa duplikasi
- Form terintegrasi langsung ke sheet untuk pengumpulan data dari luar
- Help Center kontekstual — artikel sesuai halaman yang dibuka
- Quick Links di homepage bisa di-pin untuk akses cepat

**Kelemahan:**
- Terlalu banyak fitur untuk pemula — 9 menu, 5 view, 4 menu bar sheet, 10 ikon panel kanan
- Terminologi teknis asing: "Workspace", "WorkApp", "Scenario Plan", "Portfolio", "Data Shuttle"
- Resource Management muncul di sidebar tapi langsung diblokir upsell — frustrasi
- Tidak ada onboarding walkthrough step-by-step saat login pertama kali
- URL tidak intuitif (`/b/home`, `/r/rm`) tidak memberi konteks posisi user
- Fitur premium yang tersembunyi dibalik upsell tidak transparan sejak awal
- Automation terasa teknis meski ada template

**Skor estimasi:** 7/10 untuk pengguna umum yang sudah familiar Excel

### 7.2 Untuk Orang Tua / Pengguna Senior (55+)

**Yang Membantu:**
- Label teks di setiap ikon sidebar (ada tulisan "Home", "Browse", dll di bawah ikon)
- Warna brand konsisten di seluruh antarmuka
- Struktur folder mirip File Explorer Windows
- Sheet mirip Excel yang mungkin sudah pernah dipakai
- Pesan konfirmasi dan empty state yang jelas dan positif ("All clear!")
- Tombol Share dan Upgrade menggunakan warna kontras tinggi

**Hambatan Serius:**
- Font sangat kecil — toolbar sheet menggunakan font 10pt default, melelahkan mata
- 10 ikon panel kanan sheet tanpa label teks — harus hafal fungsi tiap ikon
- Tidak ada mode sederhana / mode pemula — selalu menampilkan versi penuh
- Tooltip muncul hanya saat hover — tidak cocok untuk pengguna tablet/mobile atau yang tidak terbiasa hover
- Smart Assist AI yang menonjol di tengah homepage bisa membingungkan — "ini untuk apa?"
- Tidak ada panduan visual yang jelas saat login pertama kali
- Terlalu banyak konsep baru sekaligus tanpa pengantar

**Skor estimasi:** 4/10 untuk pengguna senior yang belum familiar PM tools

---

## 8. Celah Peluang (untuk Produk Kita)

Berdasarkan kelemahan Smartsheet yang ditemukan:

| Celah | Deskripsi Peluang |
|-------|-------------------|
| **Onboarding guided** | Walkthrough step-by-step interaktif saat login pertama, bukan langsung antarmuka penuh |
| **Mode Simple vs Advanced** | Sembunyikan fitur kompleks untuk user baru, tampilkan bertahap |
| **Label ikon selalu terlihat** | Teks di bawah semua ikon, bukan hanya tooltip hover |
| **Terminologi lokal / kontekstual** | Bahasa Indonesia dan istilah yang lebih familiar |
| **Font aksesibel** | Ukuran teks default lebih besar, bisa disesuaikan |
| **Transparansi fitur premium** | Tunjukkan plan requirements sejak awal, bukan blokir mendadak |
| **Konteks posisi user yang jelas** | URL dan breadcrumb yang informatif |

---

## 9. Fitur yang Perlu Di-benchmark

Hal-hal yang dilakukan Smartsheet dengan baik dan bisa jadi referensi:

- **Multiple view dari satu data** — Gantt, Board, Table, Calendar, Timeline dari sheet yang sama
- **Form terintegrasi** — bisa buat form pengisian data langsung dari kolom sheet, tanpa tool terpisah
- **Automation dengan template** — ratusan template trigger-action siap pakai
- **Smart Assist AI yang kontekstual** — AI memahami konteks halaman yang sedang dibuka
- **Workspace sebagai container proyek** — hierarki yang jelas: Workspace > Folder > Sheet/Report/Dashboard
- **Resource Center kontekstual** — artikel bantuan berubah sesuai halaman aktif
- **Baselines di Gantt** — bisa tracking deviasi dari rencana awal
- **Data Shuttle** — sinkronisasi data otomatis antar sistem/file eksternal

---

## 10. Screenshot yang Tersimpan

Semua screenshot tersimpan di `ss-kompetitor/`:

| File | Konten |
|------|--------|
| `smartsheet-home.png` | Homepage dengan Smart Assist dan Quick Links |
| `smartsheet-notifications.png` | Panel Notifications dengan tab All & Requests |
| `smartsheet-search.png` | Dialog Search global dengan riwayat recent |
| `smartsheet-browse.png` | Halaman Browse dengan sidebar sub-navigasi |
| `smartsheet-favorites.png` | Flyout Favorites (empty state) |
| `smartsheet-resource-mgmt.png` | Resource Management dengan upsell modal |
| `smartsheet-workapps.png` | Halaman WorkApps |
| `smartsheet-create.png` | Dropdown Create dengan semua opsi termasuk Build with AI |
| `smartsheet-launcher.png` | Dialog Launcher |
| `smartsheet-help.png` | Panel Resource Center (Help) |
| `smartsheet-account.png` | Dropdown Account dengan semua sub-item |
| `smartsheet-sheet-editor.png` | Sheet editor view Gantt dengan workspace panel |
| `smartsheet-view-switcher.png` | Dropdown pilihan view (Table, Board, Timeline, Gantt, Calendar) |
| `smartsheet-sheet-file.png` | Menu File dalam sheet editor |
| `smartsheet-sheet-automation.png` | Menu Automation dalam sheet editor |
| `smartsheet-sheet-forms.png` | Menu Forms dalam sheet editor |
| `smartsheet-sheet-connections.png` | Menu Connections / Data Shuttle |

---

*Riset dilakukan melalui eksplorasi langsung menggunakan ego-browser pada sesi Claude Code, September 2026.*
