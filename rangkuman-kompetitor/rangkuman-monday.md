# Rangkuman Kompetitor: monday.com

**Tanggal riset:** 2026-09-26  
**Metode:** Eksplorasi langsung via ego-browser ke monday.com (akun aktif, workspace "nicoarya20s-team-company")  
**URL:** https://monday.com | https://nicoarya20s-team-company.monday.com

---

## Gambaran Umum

monday.com memposisikan diri sebagai **"Work OS" (Work Operating System)** — platform manajemen kerja all-in-one yang kini sangat berorientasi AI. Bukan sekadar task manager, monday mencakup board, dokumen, AI agents, workflow otomasi, meeting notes, dan bahkan app builder (Vibe) dalam satu ekosistem. Tagline saat ini: *"Lead your AI team"* — AI adalah inti produk, bukan sekadar fitur tambahan.

---

## Struktur Navigasi Utama

monday.com menggunakan **sidebar kiri vertikal** dengan ikon + label, serta **top bar** untuk aksi global.

---

### 1. Workspace
**Route:** `/workspaces/{id}`  
**Fungsi:** Pusat organisasi semua konten kerja tim.

| Sub-elemen | Fungsi |
|------------|--------|
| **Dropdown workspace** | Ganti antar workspace (misal: "Main workspace", "HR", "Marketing") |
| **Tab Recents** | Item yang baru-baru ini dibuka |
| **Tab Content** | Semua board, dashboard, dan doc dalam workspace |
| **Tab Collaborators** | Daftar anggota yang punya akses ke workspace |
| **Tab Permissions** | Atur hak akses per workspace |
| **Manage workspace** | Pengaturan lanjutan workspace |
| **My agents** | Shortcut ke agen AI yang dibuat dalam workspace |

**Sub-item di dalam Content (sidebar):**
- **Board** (`/boards/{id}`) — spreadsheet interaktif dengan views: Main table, Kanban (+ tambah view lain)
- **Dashboard** (`/boards/{id}` tipe dashboard) — widget laporan lintas board
- **Doc** — dokumen terhubung ke board

**Fitur di dalam Board:**
- Header: AI suggestions *(baru)*, Integrate, Automate, Agents, Discussion, Board activity, Invite
- Views: Main table (default), Kanban; bisa tambah Calendar, Gantt, Chart, dll
- Toolbar: New task, Search, Person filter, Filter, Sort, Hide columns, Group by
- Kolom standar: Task name, Owner, Status, Due date, Last updated, Files
- Status visual: 🟡 Working on it / 🟢 Done / 🔴 Stuck

---

### 2. Sidekick
**Route:** `/sidekick`  
**Fungsi:** Asisten AI personal yang "mengenal" semua data kerja di akunmu.

| Sub-menu | Fungsi |
|----------|--------|
| **New chat** | Mulai percakapan baru dengan AI |
| **Scheduled** *(New)* | Jadwalkan tugas/pengingat yang dijalankan AI secara berkala |
| **Personalization** | Atur nama, gaya komunikasi, dan preferensi AI |
| **Skills** | Shortcut siap pakai — dipanggil dengan `/` di chat (misal: `/daily brief`, `/meeting prep`) |
| **More** | Opsi tambahan |
| **All chats** | Riwayat semua percakapan |

**Fitur utama:**
- Chat natural — contoh pertanyaan: *"Apa yang perlu perhatianku hari ini?"*, *"Siapkan aku untuk meeting"*
- Terkoneksi via **Telegram** dan **WhatsApp** (scan QR code, tanpa buka browser)
- Dapat voice input (Speech to text)
- Dapat attach file, board context, atau foto
- Catatan: *"AI may be inaccurate, make sure to review it"*

---

### 3. Agents
**Route:** `/ai_agents/new`  
**Fungsi:** Buat dan kelola agen AI yang bekerja otomatis di belakang layar.

| Sub-menu | Fungsi |
|----------|--------|
| **New agent** | Buat agen baru dari deskripsi teks atau pilih dari directory |
| **My agents** | Daftar agen yang sudah dibuat |
| **Agent directory** | Katalog agen pre-built dari monday.com |
| **Feed** | Log aktivitas semua agen |
| **Skill hub** | Library skill/kemampuan yang bisa ditambahkan ke agen |
| **Learn more** | Dokumentasi dan tutorial |
| **Give us feedback** | Kirim masukan ke tim monday |

**Cara buat agen:**
1. Deskripsikan dalam teks bebas (misal: *"Monitor kompetitor dari digital presence mereka"*)
2. Pilih dari template pre-built berdasarkan kategori
3. "Bring your agent" — impor agen eksternal

**Kategori agen pre-built:**
- Project management, Marketing, Operations, Sales, HR, Product & Engineering, Productivity, By monday.com

**Contoh agen:** Liam (Project Manager), Judy (Priorities Manager)

---

### 4. Vibe
**Route:** `/monday_vibe`  
**Fungsi:** App builder berbasis AI — buat mini-aplikasi custom tanpa coding.

| Sub-menu | Fungsi |
|----------|--------|
| **New Vibe app** | Buat aplikasi baru dari deskripsi teks |
| **All apps** | Daftar semua aplikasi Vibe yang sudah dibuat |
| **Templates** | Template aplikasi siap pakai |
| **Vibe integrations** | Sambungkan Slack, Gmail, Google Calendar, dll ke app |

**Cara pakai:**
1. Deskripsikan ide aplikasi di text box
2. Sambungkan board monday sebagai sumber data
3. Tambah integrasi eksternal
4. AI membuat rencana aplikasi → bangun
5. Live suggestions berdasarkan board yang sudah ada

**Contoh suggestion otomatis:** Team Progress Tracker, Project Task Manager, Project Portfolio Hub, Resource Scheduler, Task Priority Manager, Content Editorial Calendar

---

### 5. Workflows
**Route:** `/ai_workflows`  
**Fungsi:** Buat workflow otomasi berbasis AI — cukup deskripsikan proses, AI yang membangunnya.

| Sub-menu | Fungsi |
|----------|--------|
| **New workflow** | Buat workflow baru (dari deskripsi atau dari scratch) |
| **All workflows** | Kelola semua workflow yang ada |
| **Learn more** | Dokumentasi |
| **Give us feedback** | Masukan ke tim monday |

**Cara buat workflow:**
- Tulis deskripsi bahasa natural → klik "Build workflow"
- Atau "Start from scratch" dengan builder visual

**Template bawaan:**
| Template | Deskripsi |
|----------|-----------|
| Daily open tasks digest | Setiap weekday jam 8 pagi, ringkas open tasks → kirim via Email |
| Bi-weekly competition news | Tiap 2 minggu Senin jam 9 pagi, cari berita kompetitor → kirim via Email ke tim |
| Meeting summarizer | Saat update ditambah ke meeting script → ringkas → kirim via Gmail ke tim |

**Kategori template:** All, Sales & CRM, Support, Marketing, Productivity, HR

**Fitur canggih (baru):**
- Chat to build (deskripsikan → AI bangun otomatis)
- Add agents to workflows (tambah monday agents atau agen eksternal ke workflow)
- Loop over items, trigger with webhook, connect to MCP, wait for approval
- Run workflow sebelum publish (test dulu)

---

### 6. Notetaker
**Route:** `/product_view/notetaker/meetings-page-product-view`  
**Fungsi:** Perekam dan peringkas meeting otomatis, terintegrasi dengan calendar.

| Sub-elemen | Fungsi |
|------------|--------|
| **Kalender harian** | Navigasi per tanggal (kemarin/hari ini/besok) |
| **Upcoming** | Meeting yang akan datang (dari calendar yang terhubung) |
| **Google Calendar / Outlook** | Tombol connect calendar untuk otomasi |
| **Add an agent** | Tambah AI agent ke Notetaker |
| **Add Notetaker to meeting** | Tambah Notetaker ke meeting spesifik secara manual |
| **Meeting history** | Tab My meetings / Shared with me |
| **Search meetings** | Cari rekaman meeting lama |
| **Filter** | Saring per Participant atau Date |
| **Settings** | Pengaturan Notetaker |

**Fitur utama:**
- Rekam otomatis setiap meeting setelah calendar terhubung
- Chapter-based recap — ringkasan per topik, bukan satu blok teks panjang
- Smart action items — AI ekstrak daftar tindakan dari meeting
- AI highlights — poin penting yang disorot AI
- Tanya AI tentang isi meeting kapan saja
- Embedded ke workflows (bisa trigger automasi dari meeting notes)
- **Desktop app** tersedia untuk Mac (Windows, iPhone, Apple Watch coming soon) — rekam tanpa bot, dengan live summary saat meeting berlangsung

---

### 7. Favorites
**Route:** Tidak punya URL sendiri — panel sidebar  
**Fungsi:** Akses cepat ke board, doc, atau dashboard favorit.

- Klik ikon ⭐ di item mana saja untuk menambahkan
- Jika belum ada favorit, tampilkan **Recently viewed**
- Diakses via klik tombol "Favorites" di sidebar

---

## Menu "More" (Tombol `···` di bawah sidebar)

### 8. My Work
**Route:** `/my_work`  
**Fungsi:** Dashboard pribadi — aggregasi semua tugas yang di-assign ke kamu dari seluruh board.

| Elemen | Fungsi |
|--------|--------|
| **Tab Table** | Tampilan spreadsheet dengan kolom Group, Board, People, Date, Status |
| **Tab Calendar** | Tampilan kalender semua tugasmu |
| **New item** | Tambah tugas baru |
| **Date view** | Toggle tampilan per tanggal |
| **Customize** | Atur kolom dan tampilan |

**Pengelompokan otomatis:** Past Dates, Today, This week, Next week, Later, Without a date

---

### 9. Template Center
**Route:** `/template_center`  
**Fungsi:** Library ratusan template siap pakai untuk berbagai use case — dibuka sebagai overlay dialog di atas halaman.

---

### 10. Docs Hub
**Route:** `/product_view/monday_documents/docs-hub`  
**Fungsi:** Pusat pembuatan dan pengelolaan semua dokumen tim.

| Elemen | Fungsi |
|--------|--------|
| **Create doc with AI** | Deskripsikan → AI buat draft dokumen |
| **Create new doc** | Buat dokumen kosong |
| **Template docs** | Meeting Notes, Project Brief, Employee Onboarding Guide, Weekly Status Update, Retrospective |
| **Recent documents** | Tabel dokumen terbaru dengan filter creator/tanggal |

---

### 11. Autopilot Hub
**Route:** Di dalam menu `More`  
**Fungsi:** Manajemen pusat workflow otomatis yang sudah berjalan.

---

### 12. Customize Menu
**Route:** Di dalam menu `More`  
**Fungsi:** Atur item mana yang muncul di sidebar utama.

---

## Top Navigation Bar

| Ikon/Tombol | Nama | Fungsi |
|-------------|------|--------|
| Logo monday | Home | Kembali ke workspace utama |
| 💎 See plans | See plans | Upgrade ke plan berbayar |
| 🔍 Search bar | Search everything | Cari apapun di seluruh akun (board, task, doc, anggota) |
| 🔔 | Notifications | Notifikasi aktivitas tim |
| 📥 (+ badge angka) | Update feed | Feed update/inbox dari semua board — mirip email masuk |
| 👤+ | Invite members | Undang anggota tim baru |
| 🧩 | monday marketplace | App store integrasi (Slack, Gmail, Zoom, GitHub, dan 200+ app) |
| ❓ | Help | Panduan, tutorial, customer support |
| ⊞ (grid 3×3) | Products switcher | Ganti produk atau akses tool global |
| 👤 (avatar) | User Menu | Profil, pengaturan akun, logout |

**Products Switcher** menampilkan:
- **monday** (Work OS — yang sedang aktif)
- **Explore products** — lihat semua produk monday
- **monday CRM** — kelola sales cycle (14-day free trial)
- Tools: Marketplace, Workflows, Template center
- Shortcut: Help, Invite, Admin, Teams

---

## Fitur Unggulan

1. **AI deeply embedded** — Sidekick, Agents, Vibe, Workflows, Notetaker semuanya berbasis AI yang benar-benar bekerja, bukan sekadar chatbot
2. **Visual status board** — warna status langsung terlihat: 🟡🟢🔴, sangat intuitif untuk tracking
3. **Workflow via bahasa natural** — tidak perlu drag-and-drop rule builder, cukup tulis deskripsi
4. **Notetaker terintegrasi** — dari rekam meeting → ringkasan → action items → masuk ke board → trigger workflow, semua otomatis
5. **Vibe app builder** — buat mini-aplikasi custom berbasis board data, tanpa coding
6. **Multi-produk** — monday CRM, monday Dev, dll dalam satu ekosistem
7. **Mobile via chat** — Sidekick bisa diakses dari WhatsApp/Telegram tanpa buka app
8. **Integrasi luas** — 200+ integrasi via Marketplace

---

## Analisis untuk Orang Awam / Pemula

### Keunggulan
- Board yang sangat visual — warna status langsung dipahami tanpa baca teks
- Template center memudahkan mulai tanpa buat dari nol
- "New workflow" cukup tulis kalimat → langsung terbentuk
- My Work menyederhanakan pengalaman: fokus pada tugas sendiri saja

### Kelemahan
- **Terlalu banyak fitur langsung terlihat** — 7 menu utama + More → mana yang dipakai duluan?
- **Terminologi tidak familiar** — "Workspace", "Board", "Pulse", "Sidekick", "Vibe", "Agents" — tidak ada yang langsung dipahami pemula
- **Banyak popup saat pertama kali buka fitur** — Notetaker welcome, Workflows dialog, "What's new" dialog — membingungkan
- **AI sebagai inti** — pengguna yang tidak familiar AI akan bingung Agents/Sidekick untuk apa

---

## Analisis Khusus untuk Orang Tua / Non-Tech User

### Keunggulan
- Warna-warni dan visual — lebih menarik dari spreadsheet biasa
- Status tugas langsung terlihat dari warna (merah/kuning/hijau) — universal

### Kelemahan

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | **Nama fitur tidak intuitif** | "Sidekick", "Vibe", "Agents", "Notetaker" — perlu waktu untuk mengerti fungsinya |
| 2 | **Semua UI dalam Bahasa Inggris** | Tidak ada opsi Bahasa Indonesia — hambatan serius untuk lansia |
| 3 | **Banyak dialog popup saat pertama pakai** | Notetaker welcome, Workflows "What's new", app tips — panik, tidak tahu harus apa |
| 4 | **Menu berlapis-lapis** | Untuk buka board: klik Workspace → klik workspace → klik item |
| 5 | **My Work, Template Center tersembunyi** | Di balik menu "More" yang tidak jelas |
| 6 | **Banner upgrade terus muncul** | "See plans" dan "Connect AI" banner di atas — mengganggu dan membingungkan |
| 7 | **Tidak ada mode sederhana** | Tidak ada toggle "tampilan lite" untuk menyembunyikan fitur advanced |
| 8 | **AI-first approach** | Pengguna non-tech mungkin tidak nyaman mendelegasikan kerja ke AI |
| 9 | **Icon-only di beberapa tombol** | Beberapa button di header board hanya ikon tanpa label |
| 10 | **Onboarding tidak ada tutorial wajib** | Langsung dilempar ke empty workspace tanpa panduan step-by-step |
| 11 | **Beberapa halaman loading lambat** | Sidekick, Vibe, Agents bisa butuh beberapa detik — dikira error |
| 12 | **Versi gratis sangat terbatas** | Fitur AI, Notetaker, Automations penuh memerlukan plan berbayar |

---

## Pricing (per September 2026)

| Plan | Harga | Fitur Utama |
|------|-------|-------------|
| **Free** | Gratis | Board dasar, 2 seats, doc, terbatas |
| **Basic** | ~$9/seat/bulan | Unlimited viewer, 5GB storage |
| **Standard** | ~$12/seat/bulan | Timeline, Gantt, Calendar view, Guest access, Automation (250 actions/bulan) |
| **Pro** | ~$19/seat/bulan | Time tracking, Private boards, Formula, Dependency, Automation (25.000 actions/bulan) |
| **Enterprise** | Custom | Advanced permissions, Enterprise security, Audit log, IP restriction |
| **AI add-on** | ~$20/seat/bulan | Sidekick, Agents, AI workflows (sebagian fitur AI butuh add-on terpisah) |

> Catatan: akun yang diteliti menggunakan free trial dengan akses ke beberapa fitur AI.

---

## Kesimpulan: Profil Pengguna yang Cocok

| Profil | Cocok? | Catatan |
|--------|--------|---------|
| Tim startup/perusahaan 5–50 orang | ✅ Sangat cocok | All-in-one, skalabel, banyak integrasi |
| Project manager / ops professional | ✅ Sangat cocok | Board, workflows, reporting sangat powerful |
| Tim yang ingin adopsi AI di workflow | ✅ Sangat cocok | Agents + Workflows + Sidekick terdepan di market |
| Tim marketing / sales | ✅ Cocok | Template kaya, monday CRM tersedia |
| Tim enterprise 100+ orang | ✅ Cocok | Enterprise plan, multi-workspace, SSO |
| Freelancer / solo user | ⚠️ Berlebihan | Fitur terlalu banyak, harga per-seat mahal untuk 1 orang |
| Orang awam baru mulai | ⚠️ Perlu pendampingan | Kurva belajar tinggi, perlu onboarding aktif dari admin |
| Orang tua / non-tech user | ❌ Tidak disarankan | Interface terlalu kompleks, terminologi asing, UI penuh dengan jargon AI |
| UMKM yang baru digitalisasi | ❌ Tidak disarankan | Terlalu mahal dan kompleks, lebih baik mulai Trello atau Google Tasks |

---

## Perbandingan dengan Asana

| Aspek | monday.com | Asana |
|-------|-----------|-------|
| **Pendekatan utama** | Work OS + AI-first | Work management + Goal alignment |
| **Kekuatan AI** | Lebih dalam — Agents, Vibe, Sidekick | AI Teammates, Work with Dash — lebih terbatas |
| **Interface** | Board/spreadsheet sentris | List/project sentris |
| **Meeting notes** | Notetaker terintegrasi penuh | Meetings tab (lebih sederhana) |
| **App builder** | Vibe (buat mini-app) | Tidak ada |
| **Workflow otomasi** | Via bahasa natural + AI | Via rule builder (trigger-action) |
| **Ramah pemula** | Lebih membingungkan (lebih banyak menu) | Sedikit lebih terarah (5 tab jelas) |
| **Harga** | Lebih mahal jika pakai AI add-on | Lebih terjangkau di plan dasar |
| **Kustomisasi board** | Lebih fleksibel (custom views, columns) | Lebih terstruktur (fixed views per tier) |
| **Mobile** | Via WhatsApp/Telegram (unik) | App mobile standar |

---

## Alternatif yang Lebih Simpel

- **Trello** — Kanban visual, sangat intuitif, tidak ada learning curve, cocok untuk orang tua
- **Todoist** — To-do list sederhana tanpa konsep workspace/board
- **Notion** — Dokumen-sentris, lebih familiar, sedikit lebih ramah pemula
- **Google Tasks + Google Calendar** — Untuk non-tech user yang sudah pakai ekosistem Google
- **Asana** — Lebih terstruktur, onboarding lebih terarah (ada tutorial di Home), tapi tetap kompleks
