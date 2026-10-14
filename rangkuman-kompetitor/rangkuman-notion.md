# Rangkuman Kompetitor: Notion

**Tanggal riset:** 2026-09-26  
**Metode:** Eksplorasi langsung via ego-browser ke app.notion.com (akun aktif, Free Plan)  
**URL:** https://app.notion.com

---

## Gambaran Umum

Notion adalah platform "all-in-one workspace" yang menggabungkan dokumen, database, manajemen proyek, wiki, dan AI dalam satu tool. Notion memposisikan diri bukan sebagai task manager murni, tapi sebagai **connected workspace** — tempat tim menyimpan pengetahuan, merencanakan proyek, dan berkolaborasi sekaligus. Sejak 2024-2026, Notion semakin agresif mengintegrasikan AI (Notion AI & AI Agents) sebagai fitur inti.

---

## Struktur Navigasi Utama

Notion menggunakan **sidebar kiri** sebagai pusat navigasi, dengan dua bagian: **tab navigasi atas** dan **section konten** di bawahnya.

---

### TAB NAVIGASI ATAS (Top of Sidebar)

| Tab | Shortcut | Fungsi |
|-----|----------|--------|
| **Home** | — | Halaman awal — setup guide, akses cepat ke halaman Private & Teamspace, AI welcome suggestions |
| **Chat** | ⌘O | Akses Notion AI dan riwayat percakapan AI per hari. Sub-item: Notion AI · New agent |
| **Meetings** | — | Tampilan meeting terhubung kalender — Upcoming, Today. Tombol "New AI meeting note" |
| **Inbox** | — | Pusat notifikasi — @mention, komentar, perubahan halaman yang diikuti. Filter bisa dikustomisasi |
| **Search** | ⌘K | Pencarian global semua konten workspace (halaman, database, komentar) |

---

### SECTION PRIVATE (Ruang Kerja Pribadi)

Halaman di bagian ini hanya terlihat oleh pemilik akun.

| Menu | Path / URL | Fungsi |
|------|-----------|--------|
| **Notes** | `/p/[page-id]?v=[view-id]` | Database catatan pribadi. View: list. Fitur: Filter · Sort · Automations · AI Autofill · Search |
| **Add new** | — | Buat halaman baru di ruang privat |

---

### SECTION TEAMSPACES (Ruang Kerja Tim)

Notion mengelompokkan halaman tim di bawah **Teamspace**. Default teamspace: **Team HQ**, berisi 4 halaman utama.

#### Team HQ > Projects
**Path:** `/p/[id]?v=[view-id]`  
**Fungsi:** Pelacak proyek tim. Setiap proyek punya Stage dan Timeline.

| Kolom | Tipe Data |
|-------|-----------|
| Name | Judul proyek |
| Stage | Status (In Progress · Planning · Done · dsb) |
| Timeline | Rentang tanggal mulai–selesai |
| + Add property | Tambah kolom custom |

**Views tersedia:** All projects (table)  
**Tombol aksi:** New project · Filter · Sort · Automations · AI Autofill

---

#### Team HQ > Tasks
**Path:** `/p/[id]?v=[view-id]`  
**Fungsi:** Manajemen tugas tim. Setiap tugas punya Status dan Due date.

| Kolom | Tipe Data |
|-------|-----------|
| Name | Judul tugas |
| Status | Up next · In progress · Done |
| Due date | Tanggal jatuh tempo |

**Views tersedia:** All tasks (table) · By status (grouped)  
**Tombol aksi:** New task · Filter · Sort · Automations · AI Autofill

---

#### Team HQ > Meetings
**Path:** `/p/[id]?v=[view-id]`  
**Fungsi:** Database notulensi rapat. Setiap meeting bisa diisi agenda, peserta, dan catatan AI.

| Kolom | Tipe Data |
|-------|-----------|
| Name | Nama rapat |
| Date | Tanggal rapat |
| Attendees | Peserta (relasi ke anggota) |

**Views tersedia:** All meetings (table)  
**Tombol aksi:** New meeting

---

#### Team HQ > Docs
**Path:** `/p/[id]?v=[view-id]`  
**Fungsi:** Perpustakaan dokumen tim. Dokumen bisa diberi tag kategori (Strategy, Guideline, dsb).

**Views tersedia:** All docs (gallery card) · Table  
**Tombol aksi:** New doc · Filter · Sort · Automations · AI Autofill

---

### SECTION BAWAH SIDEBAR

| Menu | Path / URL | Fungsi |
|------|-----------|--------|
| **Add agents** | `/ai` | Notion AI assistant interaktif. Prompt: "What are we sketching out first?". Bisa: Create Slides · Spreadsheets · Research · Visualize. Terhubung ke 10+ app eksternal |
| **Library** | `/library/teamspaces` | Tampilan terpusat semua konten workspace |
| **Help** | Dialog popup | Documentation · Get support · What's new (Notion 3.7, Model controls, Agent edits) · View all releases |
| **Trash** | Sidebar | Halaman yang dihapus — bisa dipulihkan atau dihapus permanen |

**Library — Sub-tab:**

| Tab | Fungsi |
|-----|--------|
| Teamspaces | Semua teamspace & anggotanya |
| Recents | Halaman yang baru dikunjungi |
| Favorites | Halaman yang di-bintangi |
| Shared | Halaman yang dibagikan ke/oleh orang lain |
| Private | Halaman pribadi |
| AI Meeting Notes | Notulensi rapat yang di-generate AI |
| Skills | Integrasi dan skill yang tersedia |

---

### BOTTOM BAR (Kiri Bawah Sidebar)

| Tombol | Shortcut | Fungsi |
|--------|----------|--------|
| **New chat** | ⌘O | Buka sesi AI chat baru |
| **New page** | — | Buat halaman kosong baru |
| **Hot and fresh features** | — | Lihat fitur terbaru yang dirilis |

---

### WORKSPACE DROPDOWN (Klik nama workspace / avatar kiri atas)

| Item | Fungsi |
|------|--------|
| **Upgrade** | Naik ke plan Plus / Business / Enterprise |
| **Settings** | Pengaturan workspace: nama, anggota, billing, integrasi, keamanan |
| **Invite members** | Undang anggota baru lewat email |
| **Add account** | Tambah akun Notion lain di browser yang sama |
| **Account options** | Email akun, preferensi notifikasi |
| **Workspace switcher** | Pindah antar workspace yang terdaftar |
| **New workspace** | Buat workspace baru |
| **Log out** | Keluar dari akun |

---

### KONTROL LEVEL HALAMAN (Top Bar per Halaman)

| Tombol | Fungsi |
|--------|--------|
| **Share** | Bagikan halaman — ke tim, link publik, atau embed |
| **Copy link** | Salin URL langsung ke halaman |
| **Favorite** | Tandai sebagai favorit (muncul di Library > Favorites) |
| **Actions (...)** | Duplicate · Move to · Export · Templates · Lock page · Delete · dsb |
| **Follow** | Subscribe notifikasi perubahan halaman ini |

**Kontrol View Database (dalam halaman database):**

| Tombol | Fungsi |
|--------|--------|
| **Filter** | Saring baris berdasarkan properti |
| **Sort** | Urutkan berdasarkan properti |
| **Automations** | Buat trigger otomatis (misal: ubah status → kirim notifikasi) |
| **AI Autofill** | Isi properti otomatis menggunakan AI |
| **Settings** | Konfigurasi tampilan view (kolom yang ditampilkan, layout) |
| **New [item]** | Tambah entri baru |

---

## Keunggulan Notion

### Untuk Pengguna Profesional / Tim
| Keunggulan | Keterangan |
|------------|-----------|
| **All-in-one** | Dokumen, task, database, wiki, kalender, AI — semua satu tempat tanpa pindah app |
| **Fleksibilitas tinggi** | Satu halaman bisa jadi dokumen biasa, spreadsheet, kanban board, atau gabungan |
| **AI terintegrasi dalam** | Notion AI bisa menulis, merangkum, mengisi database, generate slides, riset, dan visualisasi langsung di dalam konten |
| **Kolaborasi real-time** | Edit bersamaan, komentar inline, @mention, reaksi emoji, riwayat versi |
| **Database relasional** | Properti bisa saling terhubung antar database (Relation + Rollup) — mirip Airtable |
| **Template kaya** | Ratusan template resmi dan komunitas: OKR, meeting notes, project tracker, roadmap, CRM |
| **Teamspace** | Ruang kerja tim terpisah dengan kontrol akses berbasis peran (Full access · Can edit · Can comment · Can view) |
| **Integrasi luas** | Slack, GitHub, Google Drive, Figma, Linear, Jira, Zapier, + 10 app lainnya via Notion AI |
| **Multi-platform** | Web, desktop (Mac/Windows), mobile (iOS/Android), offline support |

---

## Kelemahan Notion

### Untuk Orang Awam & Orang Tua (Kritik Utama)

| Kelemahan | Dampak bagi Pengguna Non-Teknis |
|-----------|--------------------------------|
| **Kurva belajar sangat curam** | Tidak ada alur jelas "mulai dari mana". Pengguna baru sering bingung antara Page, Database, Block, View, Template |
| **Terlalu banyak opsi** | Setiap halaman punya puluhan pengaturan. Mudah kewalahan bahkan untuk pengguna digital yang sudah biasa |
| **Terminologi asing** | Istilah seperti "Teamspace", "Database view", "Relation property", "Rollup", "Formula" tidak intuitif bagi non-teknis dan orang tua |
| **UI padat & ikon kecil** | Sidebar penuh, tidak semua tombol punya label teks — menyulitkan orang dengan ketajaman visual berkurang |
| **Tidak ada panduan step-by-step** | Welcome guide ada tapi singkat dan cepat menghilang. Tidak ada onboarding interaktif yang menuntun pengguna langkah demi langkah |
| **Fitur terlalu advance** | AI Agents, Database Relation, Rollup Formula, Automation Trigger — jauh dari kebutuhan penggunaan dasar |
| **Harga membingungkan** | Mulai gratis tapi banyak fitur penting (AI unlimited, guests, version history) butuh plan berbayar — bisa mengejutkan |
| **Pencarian kurang intuitif** | Filter di database cukup membingungkan, tidak ada autocomplete yang kuat, syntax pencarian tidak natural |
| **Recovery kurang kuat** | Salah hapus block/halaman bisa menyulitkan recovery — Trash ada tapi tidak semua pengguna tahu |
| **Mobile app kurang optimal** | Agak lambat loading, beberapa fitur database terbatas di HP, UX mobile berbeda jauh dari desktop |
| **Tidak ada "simpel mode"** | Tidak ada opsi tampilan yang lebih sederhana. Semua pengguna mendapat antarmuka yang sama kompleksnya |

---

## Penilaian Singkat per Segmen

| Segmen Pengguna | Cocok? | Catatan |
|-----------------|--------|---------|
| Tim profesional / startup | ✅ Sangat cocok | All-in-one, AI powerful, kolaborasi kuat |
| Developer / knowledge worker | ✅ Sangat cocok | Customizable, API ada, integrasi luas |
| Individu produktif (millennial) | ✅ Cocok | Butuh waktu belajar, reward besar jika sudah mahir |
| Pelajar / mahasiswa | ⚠️ Bisa, tapi perlu waktu | Free plan cukup, tapi perlu belajar dulu |
| Orang awam / non-teknis | ❌ Kurang cocok | Terlalu kompleks tanpa pendampingan |
| Orang tua (50+ tahun) | ❌ Tidak direkomendasikan | UI terlalu padat, terminologi asing, tidak ada mode simpel |

---

## Ringkasan Skor

| Aspek | Skor (1–5) | Catatan |
|-------|-----------|---------|
| Kelengkapan fitur | ⭐⭐⭐⭐⭐ | All-in-one terlengkap di kelasnya |
| Kemudahan onboarding | ⭐⭐ | Terlalu kompleks untuk langsung digunakan |
| Kemudahan untuk orang tua | ⭐ | Tidak direkomendasikan tanpa pendampingan intensif |
| Kolaborasi tim | ⭐⭐⭐⭐⭐ | Sangat kuat: real-time, comment, version history |
| Integrasi AI | ⭐⭐⭐⭐⭐ | Salah satu AI workspace terbaik saat ini (Notion AI 3.7) |
| Harga vs nilai | ⭐⭐⭐⭐ | Free plan cukup untuk personal, tim perlu upgrade |
| Mobile experience | ⭐⭐⭐ | Fungsional tapi lebih lambat & terbatas vs desktop |

---

## Catatan Khusus untuk Riset PM

- Notion **bukan PM tool murni** — lebih tepat disebut connected workspace / knowledge management yang punya fitur PM
- Kekuatan terbesarnya adalah **fleksibilitas**: bisa dikonfigurasi jadi hampir apa saja, tapi justru ini yang membuatnya sulit untuk orang awam
- Kompetitor langsung: **Asana** (lebih terfokus ke PM), **Monday.com** (lebih visual & mudah), **Confluence + Jira** (enterprise)
- Fitur AI-nya (Notion AI 3.7 + Agents) sangat agresif dan menjadi **diferensiasi utama** vs kompetitor per September 2026
- Untuk target pasar orang awam/orang tua, Notion perlu **mode simpel** atau **onboarding yang jauh lebih guided** agar bisa bersaing
