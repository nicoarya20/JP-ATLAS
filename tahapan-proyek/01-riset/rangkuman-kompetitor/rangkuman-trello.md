# Rangkuman Kompetitor: Trello

**Tanggal riset:** 2026-09-27  
**Metode:** Eksplorasi langsung via ego-browser ke trello.com (akun aktif, Free Plan + trial Premium 14 hari)  
**URL:** https://trello.com

---

## Gambaran Umum

Trello adalah platform manajemen proyek berbasis **Kanban board** yang dimiliki Atlassian sejak 2017. Trello memposisikan diri sebagai tools visual yang paling mudah digunakan untuk mengorganisasi tugas — konsep utamanya adalah **Board → List → Card** yang menyerupai sticky notes di papan tulis fisik. Target utama adalah individu, tim kecil, dan pengguna non-teknis yang ingin mulai cepat tanpa kurva belajar tinggi.

Model bisnisnya **freemium** — fitur dasar gratis selamanya, fitur lanjutan (Views, Dashboard, Export, Power-Ups tambahan) dikunci di balik paket berbayar (Standard ~$5/user/bln, Premium ~$10/user/bln, Enterprise).

---

## Struktur Navigasi Utama

Trello menggunakan **top navigation bar** di atas dan **sidebar kiri** yang dapat disembunyikan sebagai pusat navigasi utama.

---

### TOP NAVIGATION BAR (selalu muncul di semua halaman)

| Elemen | Path / Route | Fungsi |
|--------|-------------|--------|
| **Logo Trello** | `/` | Kembali ke halaman dashboard utama |
| **Switch to Atlassian** (ikon grid 3×3) | Atlassian Home | Berpindah ke ekosistem Atlassian (Jira, Confluence, dll) |
| **Search** | Searchbar global | Cari board, card, member, workspace secara global |
| **Create** | Dropdown | Buat konten baru — lihat sub-menu di bawah |
| **Notifications** (ikon lonceng) | Dropdown notif | Semua notifikasi: tugas, komentar, due date, aktivitas workspace |
| **Help / Information** (ikon ?) | Dropdown info | Dokumentasi, tips, keyboard shortcuts, kontak support |
| **Profile Avatar** | Dropdown akun | Akun, settings, logout |

**Sub-menu Create (dropdown):**

| Opsi | Keterangan | Akses |
|------|-----------|-------|
| Create board with AI | AI membangun board otomatis dari deskripsi ide yang diketik | Premium |
| Create board | Membuat board Kanban baru dengan list dan card | Gratis |
| Create workspace view | Tampilan lintas seluruh board dalam workspace | Premium |
| Start with a template | Mulai dari template komunitas siap pakai | Gratis |

**Sub-menu Profile (dropdown):**

| Opsi | Path | Fungsi |
|------|------|--------|
| Profile and Visibility | `/u/{username}/profile` | Edit profil publik dan pengaturan visibilitas akun |
| Activity | `/u/{username}/activity` | Riwayat semua aktivitas pengguna di Trello |
| Cards | `/u/{username}/cards` | Semua card yang ditugaskan kepada pengguna ini |
| Settings | `/u/{username}/account` | Pengaturan akun: notifikasi, bahasa, privasi, dll |
| AI Settings | `/u/{username}/ai-settings` | Toggle dan pengaturan fitur AI di Trello |
| Labs | `/u/{username}/labs` | Aktifkan/nonaktifkan fitur-fitur eksperimental beta |
| Theme | — | Ganti tema tampilan: Light / Dark / System |
| Create Workspace | — | Buat workspace baru |
| Help | `/contact` | Halaman bantuan dan kontak support |
| Shortcuts | `/shortcuts` | Daftar lengkap keyboard shortcuts Trello |
| Log out | — | Keluar dari akun |

---

### LEFT SIDEBAR (Sidebar Kiri)

| Menu | Path | Fungsi |
|------|------|--------|
| **Boards** | `/u/{username}/boards` | Daftar semua board yang dimiliki atau diikuti pengguna |
| **Templates** | `/templates` | Galeri template dari komunitas Trello (14 kategori) |
| **Home** | `/` | Dashboard personal: recent boards, template populer, semua workspace |
| **Workspaces** (section) | — | Daftar semua workspace yang diikuti pengguna |

**Sub-navigasi per Workspace di sidebar:**

| Sub-menu | Path | Fungsi |
|----------|------|--------|
| Boards | `/w/{workspace-id}/home` | Semua board dalam workspace + shortcut buat board baru |
| Members | `/w/{workspace-id}/members` | Kelola anggota: tambah/hapus, atur role Admin/Member |
| Settings | `/w/{workspace-id}/account` | Pengaturan workspace (AI, visibilitas, pembatasan board) |
| Billing | `/w/{workspace-id}/billing` | Kelola langganan dan pembayaran |

---

### TEMPLATES — 14 Kategori

`/templates/{kategori}` — tersedia kategori berikut:

| Slug | Label |
|------|-------|
| `/templates/business` | Business |
| `/templates/design` | Design |
| `/templates/education` | Education |
| `/templates/engineering` | Engineering |
| `/templates/marketing` | Marketing |
| `/templates/operations-hr` | HR & Operations |
| `/templates/personal` | Personal |
| `/templates/productivity` | Productivity |
| `/templates/product-management` | Product Management |
| `/templates/project-management` | Project Management |
| `/templates/remote-work` | Remote Work |
| `/templates/sales` | Sales |
| `/templates/support` | Support |
| `/templates/team-management` | Team Management |

---

## Dalam Board (`/b/{board-id}/{board-name}`)

### Board Toolbar (baris kontrol atas board)

| Fitur | Path / Akses | Fungsi |
|-------|-------------|--------|
| **Board name** | — | Judul board, bisa diklik untuk mengedit langsung |
| **Views** | Dropdown | Ganti cara melihat isi board — 6 tampilan tersedia |
| **Power-Ups** | Panel kanan | Integrasi dengan 200+ aplikasi eksternal per board |
| **Automation** | Panel kanan | Otomasi tanpa kode (Butler) — lihat detail di bawah |
| **Filter Cards** | Dropdown filter | Filter kartu: label, member, due date, keyword |
| **Star** | Toggle | Tandai board sebagai favorit |
| **Visibility** | Dropdown | Private / Workspace / Public |
| **Share** | Modal | Undang via email atau link |
| **Show Menu** | Panel samping kanan | Semua pengaturan board — lihat detail di bawah |

**Views yang tersedia (dari dropdown Views):**

| Tampilan | Akses | Deskripsi |
|----------|-------|-----------|
| Board | Gratis | Tampilan Kanban default — kolom berisi kartu |
| Table | Premium | Tampilan spreadsheet/tabel dari semua kartu |
| Calendar | Premium | Tampilan kalender berdasarkan due date kartu |
| Dashboard | Premium | Grafik dan statistik produktivitas board |
| Timeline | Premium | Gantt chart — visualisasi urutan dan durasi tugas |
| Map | Premium | Tampilan kartu berbasis lokasi geografis |

**Automation (Butler) — menu dan sub-menu:**

| Kategori | Sub-item | Fungsi |
|----------|----------|--------|
| Automations | Rules | Aturan "jika X terjadi → lakukan Y" secara otomatis |
| Automations | Scheduled | Otomasi berbasis jadwal (misal: setiap Senin jam 9) |
| Automations | Due date | Otomasi berdasarkan tanggal jatuh tempo kartu |
| Custom buttons | Card buttons | Tombol kustom yang muncul di dalam setiap kartu |
| Custom buttons | Board buttons | Tombol kustom di toolbar board |
| App automations | View apps | Integrasi otomasi dengan aplikasi pihak ketiga |
| More | Suggestions | Saran automation dari Trello berdasarkan pola kerja |
| More | Activity | Log semua aktivitas automation yang pernah berjalan |
| More | Reports | Laporan penggunaan automation |

**Board Side Menu (Show Menu) — panel kanan:**

| Item | Fungsi |
|------|--------|
| Share | Bagikan board via email/link |
| About this board | Tambah deskripsi board |
| Visibility: Private | Atur siapa bisa melihat board |
| Print, export, and share | Cetak atau export board ke JSON/PDF |
| Star | Tandai board sebagai favorit |
| Settings | Pengaturan tambahan board |
| Change background | Ganti warna atau foto latar board |
| Custom Fields | Tambah field kustom ke card (teks, angka, dropdown, tanggal) |
| Automation | Shortcut ke panel Butler |
| Power-Ups | Shortcut ke panel Power-Ups |
| Labels | Buat dan kelola label warna |
| Stickers | Tambahkan stiker emoji ke kartu |
| Make template | Jadikan board ini sebagai template |
| Activity | Log semua aktivitas board |
| Archived items | Lihat dan pulihkan kartu/list yang diarsip |

---

### Bottom Navigation (dalam Board)

| Menu | Path | Fungsi |
|------|------|--------|
| **Inbox** | Panel kiri | Kotak masuk personal — tangkap tugas dari email, Slack, Teams |
| **Planner** | `/b/{id}/{name}/planner` | Tampilan jadwal mingguan + bisa connect Google Calendar/Outlook |
| **Board** | `/b/{id}/{name}` | Tampilan Kanban default |
| **Switch boards** | Dropdown | Pindah cepat ke board lain dalam workspace yang sama |

---

### Card Detail (`/c/{card-id}/{card-name}`)

| Fitur | Fungsi |
|-------|--------|
| Card title | Judul tugas, bisa diedit langsung |
| List indicator | Menampilkan list mana card ini berada, bisa dipindah |
| Cover | Gambar atau warna header card |
| **Add** | Tombol tambah fitur ke card |
| **Labels** | Label warna untuk kategorisasi visual |
| **Dates** | Set tanggal mulai dan deadline — merah jika terlewat |
| **Checklist** | Daftar sub-tugas dengan progress bar otomatis |
| **Members** | Tugaskan anggota tim ke card ini |
| **Description** | Deskripsi panjang dalam format Markdown |
| **Comments & Activity** | Komentar tim + log otomatis semua perubahan card |
| Bottom: Power-ups | Akses Power-Up langsung dari dalam card |
| Bottom: Automations | Akses Automation langsung dari dalam card |
| Bottom: Comments | Shortcut ke kolom komentar |

---

## Workspace Settings (`/w/{workspace-id}/account`)

### Personal Settings (sidebar kiri halaman settings)

| Menu | Path | Fungsi |
|------|------|--------|
| Profile and Visibility | `/u/{username}/profile` | Edit foto, nama, bio, dan pengaturan privasi profil |
| Activity | `/u/{username}/activity` | Log semua aktivitas pengguna |
| Cards | `/u/{username}/cards` | Semua card yang ditugaskan ke pengguna |
| Settings | `/u/{username}/account` | Preferensi akun: email, notifikasi, bahasa |
| AI Settings | `/u/{username}/ai-settings` | Toggle fitur AI Trello aktif/nonaktif |
| Labs | `/u/{username}/labs` | Aktifkan fitur-fitur eksperimental beta |

### Workspace Settings (konten utama)

| Pengaturan | Fungsi |
|-----------|--------|
| AI (Premium) | Toggle AI untuk seluruh workspace — help generate, improve, summarize content |
| Workspace visibility | Private / Public — atur apakah workspace terindeks dan terlihat di luar |
| Workspace membership restrictions | Siapa yang bisa ditambahkan ke workspace ini |
| Board creation restrictions | Siapa yang bisa membuat board (public/workspace/private) |
| Board deletion restrictions | Siapa yang bisa menghapus board |

### Workspace Sub-navigasi (sidebar kiri)

| Menu | Path | Akses |
|------|------|-------|
| Boards | `/w/{id}/home` | Gratis |
| Members | `/w/{id}/members` | Gratis |
| Settings | `/w/{id}/account` | Gratis |
| Power-Ups | `/w/{id}/power-ups` | Premium |
| Export | `/w/{id}/export` | Premium |
| Billing | `/w/{id}/billing` | Gratis |

---

## Path Routes Lengkap

```
/                                          → Dashboard utama (Home)
/u/{username}/boards                       → Semua board pengguna
/u/{username}/profile                      → Profil publik pengguna
/u/{username}/activity                     → Riwayat aktivitas pengguna
/u/{username}/cards                        → Semua card yang ditugaskan
/u/{username}/account                      → Pengaturan akun personal
/u/{username}/ai-settings                  → Pengaturan fitur AI
/u/{username}/labs                         → Fitur eksperimental beta
/shortcuts                                 → Daftar keyboard shortcuts
/templates                                 → Galeri template komunitas
/templates/{kategori}                      → Template per kategori spesifik
/w/{workspace-id}/home                     → Dashboard utama workspace
/w/{workspace-id}                          → Daftar board workspace
/w/{workspace-id}/members                  → Anggota workspace
/w/{workspace-id}/account                  → Settings workspace
/w/{workspace-id}/power-ups                → Power-Ups workspace [Premium]
/w/{workspace-id}/export                   → Export data workspace [Premium]
/w/{workspace-id}/billing                  → Halaman billing/langganan
/b/{board-id}/{board-name}                 → Board Kanban view
/b/{board-id}/{name}/planner               → Planner view (mingguan)
/b/{board-id}/{name}/butler/rules          → Automation rules (Butler)
/b/{board-id}/{name}/butler/rules/power-ups → Power-Ups board
/c/{card-id}/{card-name}                   → Detail kartu
/contact                                   → Halaman bantuan & kontak
```

---

## Keunggulan dan Kelemahan

### Keunggulan Umum

- **Paling mudah untuk pemula** — konsep Board-List-Card sangat intuitif, menyerupai sticky notes di papan tulis fisik. Tidak butuh pelatihan untuk mulai.
- **Drag & drop** antar kolom terasa natural dan instan — tidak ada konfigurasi awal.
- **Fitur gratis fungsional** — untuk personal dan tim kecil (≤5 orang), board + list + card + due date + checklist + label sudah sangat cukup.
- **14 kategori template** siap pakai dari komunitas — bisa langsung mulai tanpa setup dari nol.
- **Mobile app** (iOS & Android) stabil dan responsif untuk penggunaan sehari-hari.
- **Notifikasi terorganisir** — jelas menampilkan siapa yang berkomentar, menugaskan, atau mengubah card.
- **Inbox dari email** — bisa forward email langsung ke `inbox@app.trello.com` untuk dijadikan kartu tugas.
- **Power-Ups** (integasi): 200+ integrasi tersedia — Google Drive, Slack, Microsoft Teams, Jira, GitHub, dll.
- **Automation tanpa kode** (Butler) — aturan "jika X terjadi → lakukan Y" tanpa perlu keterampilan teknis.

### Kelemahan Umum

- **Fitur kunci terkunci di Premium** — Views paling berguna (Timeline/Gantt, Calendar, Dashboard) semuanya berbayar. Versi gratis hanya dapat Board view.
- **Automation membingungkan pemula** — meskipun tanpa kode, antarmuka Butler butuh pemahaman logika kondisi.
- **Power-Ups gratis hanya 1 per board** — mengintegrasikan Google Drive + Slack sekaligus di satu board sudah butuh Premium.
- **Tidak ada sub-task hierarki** — hanya ada checklist di dalam card. Proyek kompleks dengan dependensi antar tugas sulit dikelola.
- **Tidak ada mode offline** — sepenuhnya bergantung koneksi internet.
- **Tidak ada laporan/report bawaan** di versi gratis — tidak bisa melihat statistik produktivitas tim.
- **Tidak cocok untuk proyek sangat besar** — satu board dengan ratusan card sulit dinavigasi.

---

### Keunggulan untuk Pengguna Awam

- Konsep visual kartu sangat mudah dipahami tanpa latar belakang teknologi.
- Template siap pakai mengurangi keputusan awal yang bisa membingungkan.
- Label warna memudahkan kategorisasi tanpa harus membaca teks panjang.
- Fitur gratis sudah cukup untuk kebutuhan personal dan tim kecil.

### Kelemahan untuk Pengguna Awam

- Fitur paling berguna untuk PM serius (Gantt, Calendar) semuanya berbayar.
- Tidak ada laporan/statistik di versi gratis — sulit memantau progress tim.
- Automation Butler terasa seperti "coding ringan" yang tetap membingungkan.
- Tidak ada mode offline — tidak bisa diakses saat internet bermasalah.

---

### Keunggulan untuk Pengguna Lansia

- Visual kartu seperti sticky notes fisik — konsep yang familiar bagi generasi sebelum digital.
- Inbox bisa menerima tugas langsung dari email — tidak harus belajar antarmuka baru untuk menambah tugas.
- Tampilan Kanban tidak padat — tidak seperti spreadsheet besar dengan ratusan angka.
- Planner (tampilan mingguan) cocok bagi yang terbiasa melihat jadwal dalam format kalender.
- Warna-warna label membantu klasifikasi visual secara intuitif.

### Kelemahan untuk Pengguna Lansia

- **Ukuran teks default kecil** (13-14px di dalam card dan sidebar) — tidak ada Large Text Mode bawaan.
- **Ikon toolbar tanpa label teks** — hanya ikon kecil yang harus di-hover untuk tahu fungsinya (Power-Ups, Automation, Filter).
- **Istilah teknis asing** — "Power-Ups", "Butler", "Workspace", "Premium badge" tidak familiar dan tidak ada penjelasan inline yang memadai.
- **Drag & drop di layar sentuh HP kecil** sering tidak presisi — kartu mudah salah masuk ke kolom yang tidak dituju.
- **Notifikasi email bisa membanjiri inbox** jika tidak dikonfigurasi — pengaturan notifikasi tersembunyi di Settings > Notifications.
- **Struktur Settings yang nested** (Personal Settings + Workspace Settings) membingungkan karena tidak linear.
- Mode gelap (dark mode) tersedia, tapi kontras di beberapa elemen justru bisa lebih menyulitkan penglihatan.

---

## Skor Kemudahan Penggunaan (Estimasi)

| Dimensi | Skor (1-10) | Catatan |
|---------|------------|---------|
| Kemudahan awal / onboarding | 7.8 | Sangat cepat mulai, template membantu |
| Kejelasan interface | 7.2 | Board jelas, tapi settings agak kompleks |
| Kemudahan kolaborasi | 7.5 | Mudah undang anggota, notifikasi jelas |
| Keterbacaan untuk lansia | 5.2 | Teks kecil, ikon tanpa label |
| Kompleksitas fitur lanjutan | 3.8 | Butler & Premium Views membingungkan |
| Keterjangkauan harga | 5.5 | Gratis terbatas, premium $5-10/user/bln |

---

## Paket Harga

| Paket | Harga | Fitur Utama |
|-------|-------|-------------|
| **Free** | $0 | Board tak terbatas, 10 board per workspace, 1 Power-Up/board |
| **Standard** | ~$5/user/bln | Board tak terbatas, unlimited Power-Ups, Custom Fields, 250 Automation/bln |
| **Premium** | ~$10/user/bln | Semua Views (Table/Calendar/Dashboard/Timeline/Map), unlimited Automation |
| **Enterprise** | Custom | SSO, advanced admin, audit log, prioritas support |

---

## Perbandingan Singkat vs Kompetitor

| Aspek | Trello | Notion | Asana | ClickUp | Monday |
|-------|--------|--------|-------|---------|--------|
| Kemudahan awal | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Fitur gratis | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Cocok untuk lansia | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Kolaborasi tim | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Proyek kompleks | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Harga Premium | $5/user | $10/user | $10.99/user | $7/user | $9/user |

---

## Kesimpulan

Trello adalah **entry point terbaik** ke dunia project management digital. Cocok untuk:
- Individu yang baru belajar mengorganisasi tugas secara digital
- Tim kecil 2-5 orang dengan proyek yang tidak terlalu kompleks
- Proyek yang bersifat visual dan alur kerjanya linier (To Do → Doing → Done)

Kurang cocok untuk:
- Proyek besar dengan banyak dependensi dan sub-task hierarki
- Tim yang butuh laporan/reporting mendalam di versi gratis
- Pengguna lansia yang tidak ada pendampingan setup awal
- Organisasi yang butuh fitur enterprise (SSO, audit log) di harga terjangkau
