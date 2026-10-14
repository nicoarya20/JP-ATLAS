# Rangkuman Kompetitor: Zoho Projects

**Tanggal riset:** 2026-09-27  
**Metode:** Eksplorasi langsung via ego-browser ke projects.zoho.com (akun aktif, Portal Owner / Administrator)  
**URL:** https://projects.zoho.com  
**Portal:** nicoarya20gmaildotcom  

---

## Gambaran Umum

Zoho Projects adalah platform manajemen proyek berbasis cloud dari Zoho Corporation (India). Menargetkan tim bisnis skala kecil hingga menengah yang membutuhkan kontrol penuh atas tugas, waktu, anggota, dan pelaporan dalam satu tempat. Zoho memposisikan diri sebagai **all-in-one PM suite** yang menyatu erat dengan ekosistem Zoho lainnya (CRM, Mail, People, Books, dll).

Antarmuka tersedia dalam Bahasa Indonesia (dan banyak bahasa lain), namun sejumlah istilah masih campur antara Bahasa Inggris dan Indonesia ("Issues", "Log Waktu", "Custom View", dll).

---

## Struktur Navigasi Utama

Navigasi utama menggunakan **sidebar kiri tetap** yang selalu terlihat dari mana pun. Semua routing menggunakan **hash-based SPA** di bawah domain:

```
https://projects.zoho.com/portal/{portalName}#...
```

---

## MENU SIDEBAR KIRI (6 Menu Utama)

### 1. Beranda
**Route:** `#zp/dashboard/{dashboardId}` (redirect dari `#mywork`)  
**Fungsi:** Dashboard global. Menampilkan ringkasan pekerjaan seluruh portal dalam bentuk widget yang dapat dikustomisasi.

**Widget tersedia:**
- Tugas Terbuka / Tertutup (statistik angka)
- Masalah Terbuka / Tertutup
- Fase (milestone) Mendatang
- Item yang Jatuh Tempo Hari Ini
- Item yang Jatuh Tempo (belum selesai)
- Tugas Saya / Masalah Saya

**Catatan:** Widget bisa ditambah, dihapus, dan disusun ulang oleh pengguna.

---

### 2. Laporan
**Route:** `#workloadreport/{id}` (redirect dari `#myreports`)  
**Fungsi:** Pusat pelaporan lintas-proyek. Bisa diekspor ke PDF.

| Sub-tipe Laporan | Deskripsi |
|-----------------|-----------|
| **Laporan Beban Kerja** | Heatmap per anggota tim — seberapa banyak pekerjaan tiap orang per periode |
| **Terencana vs Aktual** | Perbandingan estimasi waktu vs waktu aktual yang digunakan |
| **Laporan Kustom** | Buat laporan dengan field dan filter sesuai kebutuhan |
| **Laporan Log Waktu** | Ringkasan jam kerja per proyek, tugas, dan anggota |

---

### 3. Projects
**Route:** `#allprojects/{portalId}`  
**Fungsi:** Daftar semua proyek di portal. Titik awal untuk membuat proyek baru.

| Tab | Fungsi |
|-----|--------|
| **Proyek Aktif** | Daftar proyek yang sedang berjalan |
| **Templat Proyek** | Galeri template dari berbagai industri (IT, Konstruksi, Farmasi, Pemasaran, dll.) |
| **Grup Proyek** | Kelompokkan proyek-proyek terkait ke dalam satu grup |
| **Proyek Publik** | Proyek yang dapat dilihat publik tanpa login |
| **Proyek yang Diarsipkan** | Proyek yang sudah selesai/ditutup |

**Cara buat proyek baru:** Klik area "Proyek Baru" → pilih template atau mulai dari nol → isi form (nama, tanggal, layout, owner).

**Fitur tambahan:**
- Template dari berbagai industri siap pakai
- AI Suggestions untuk nama dan deskripsi tugas
- Otomatisasi workflow (tanpa coding)

---

### 4. Pengguna
**Route:** `#zp/users/custom-view/1/list`  
**Fungsi:** Manajemen semua pengguna di seluruh portal.

| Tab | Deskripsi |
|-----|-----------|
| **Pengguna Portal** | Anggota internal — bisa login dan akses proyek sesuai peran |
| **Pengguna Klien** | Pengguna eksternal (klien) dengan akses terbatas |
| **Pelanggan** | Data pelanggan/customer yang terhubung ke proyek |
| **Tim** | Kelompokkan pengguna ke dalam tim-tim tertentu |
| **Sumber Daya** | Tampilan kapasitas dan alokasi sumber daya manusia |

**Peran yang tersedia:** Portal Owner, Administrator, Manager, Employee, dan lainnya.

---

### 5. Kolaborasi
**Route:** `#zp/collaboration/feed/all`  
**Fungsi:** Pusat komunikasi dan kolaborasi seluruh portal.

| Tab | Sub-tab | Deskripsi |
|-----|---------|-----------|
| **Umpan** | Umpan, Status, Aliran Aktivitas | Aliran aktivitas real-time dari semua proyek. Bisa filter per proyek |
| **Kalender** | — | Kalender bersama untuk jadwal tugas dan milestone |
| **Obrolan** | — | Fitur chat tim internal |

---

### 6. Persetujuan Saya
**Route:** `#zp/approvals/timeloggroups/list?view=pending`  
**Fungsi:** Approval workflow untuk absensi dan timesheet.

**Kolom yang ditampilkan:**
- Nama Absensi
- Periode Waktu
- Nama Proyek
- Jenis Penagihan (Billable / Non-billable)
- Total Jam
- Status Persetujuan (Belum Disetujui / Sudah Disetujui)

**Filter:** Belum Disetujui · Sudah Disetujui · Aturan Persetujuan

---

## SUB-MENU IKHTISAR (5 Item)

Menu ini memberikan tampilan lintas-proyek untuk item pekerjaan spesifik. Muncul di sidebar atau sebagai navigasi sekunder.

### Tugas
**Route:** `#zp/tasks/custom-view/{id}/list?group_by=tasklist`  
**Fungsi:** Daftar semua tugas dari semua proyek sekaligus, dalam satu tampilan.

**Kolom:** ID · Nama Tugas · Proyek · Pemilik · Status · Tag · Tanggal Mulai · Batas Tanggal Berakhir  
**View:** Daftar (List), dikelompokkan per Daftar Tugas  
**Aksi tersedia:** Tambah tugas baru, filter, sort, aktifkan otomatisasi

---

### Masalah
**Route:** `#zp/issues/custom-view/{id}/list?group_by=none`  
**Fungsi:** Bug tracker / issue tracker lintas-proyek. Tempat melapor masalah yang tidak masuk ke tugas reguler.

**Kolom:** Proyek · Pelapor · Waktu Yang Diharapkan · Penerima Tugas · Tag · Waktu  
**Aksi tersedia:** Laporkan masalah baru, assign ke anggota, ubah status

---

### Fase
**Route:** `#mymilestones/{portalId}`  
**Fungsi:** Tonggak capaian (milestone) dari semua proyek, tersentralisasi dalam satu tampilan.

**Kolom:** Nama Fase · Proyek · % Selesai · Status · Pemilik · Tanggal Mulai · Tanggal Akhir  
**Aksi tersedia:** Tambah fase baru, aktifkan otomatisasi

---

### Log Waktu
**Route:** `#zp/timelogs/custom-view/{id}/grid`  
**Fungsi:** Pencatatan jam kerja berbasis minggu dalam tampilan grid. Bisa filter per proyek.

**Tampilan:** Grid per hari dalam satu minggu  
**Footer ringkasan:** Total Dapat Ditagih · Total Tidak Dapat Ditagih · Total Keseluruhan

---

### Absensi
**Route:** `#zp/timeloggroups/list?view=all`  
**Fungsi:** Timesheet yang dikelompokkan untuk keperluan pelaporan dan persetujuan atasan.

**Kolom:** Nama Absensi · Periode Waktu · Nama Proyek · Jenis Penagihan · Total Jam · Status Persetujuan

---

## MENU DI DALAM PROYEK

Setelah masuk ke sebuah proyek, muncul **tab bar di bagian atas** halaman. Pola URL proyek:

```
#zp/projects/{projectId}/{modul}/...
```

### Tab Selalu Terlihat (6 Tab)

| Tab | Route | Fungsi |
|-----|-------|--------|
| **Dasbor** | `#zp/projects/{pid}/dashboard/{dashId}` | Dashboard khusus proyek: widget kustom, grafik, progres |
| **Tugas** | `#zp/projects/{pid}/tasks/custom-view/{id}/list` | Manajemen tugas dalam proyek. Ada AI Suggestions dan Otomatisasi |
| **Pengguna** | *(hash dinamis)* | Daftar anggota proyek, undang anggota, atur peran |
| **Laporan** | *(hash dinamis)* | Laporan khusus proyek: beban kerja, terencana vs aktual, log waktu |
| **Dokumen** | *(hash dinamis)* | Penyimpanan file dan dokumen proyek. Bisa buat folder |
| **Log Waktu** | `#zp/projects/{pid}/timelogs/custom-view/{id}/grid` | Log waktu per minggu dalam proyek ini |

### Tab Tersembunyi (di balik "..." / "Tab Lainnya")

| Tab | Route | Fungsi |
|-----|-------|--------|
| **Fase** | `#milestones/{pid}/{milestoneSetId}` | Milestone proyek: nama, tanggal, pemilik, % selesai |
| **Masalah** | `#zp/projects/{pid}/issues/custom-view/{id}/list` | Bug/issue tracker khusus proyek ini |
| **Umpan** | `#zp/projects/{pid}/feed` | Aliran aktivitas real-time proyek: siapa ubah apa, komentar, status |
| **Lembar Waktu** | *(hash dinamis)* | Timesheet formal untuk billing dan approval — berbeda dari Log Waktu |
| **Tambahkan Modul** | — | Buat tab/modul kustom sesuai kebutuhan proyek |

---

## RINGKASAN SEMUA ROUTE URL

| Menu | Route (Hash) | Catatan |
|------|-------------|---------|
| Beranda | `#mywork` → `#zp/dashboard/{id}` | Redirect ke dashboard aktif |
| Laporan | `#myreports` → `#workloadreport/{id}` | Default: Beban Kerja |
| Projects | `#allprojects/{portalId}` | Semua proyek |
| Pengguna | `#zp/users/custom-view/1/list` | Tab: Portal / Klien / Tim |
| Kolaborasi | `#zp/collaboration/feed/all` | Tab: Feed / Kalender / Chat |
| Persetujuan | `#zp/approvals/timeloggroups/list?view=pending` | Filter: pending/approved |
| Tugas (Ikhtisar) | `#zp/tasks/custom-view/{id}/list` | Lintas proyek |
| Masalah (Ikhtisar) | `#zp/issues/custom-view/{id}/list` | Bug tracker lintas proyek |
| Fase (Ikhtisar) | `#mymilestones/{portalId}` | Semua milestone |
| Log Waktu | `#zp/timelogs/custom-view/{id}/grid` | Grid mingguan |
| Absensi | `#zp/timeloggroups/list?view=all` | Timesheet groups |
| Tugas Proyek | `#zp/projects/{pid}/tasks/custom-view/{id}/list` | Default masuk ke Tugas |
| Dasbor Proyek | `#zp/projects/{pid}/dashboard/{dashId}` | |
| Masalah Proyek | `#zp/projects/{pid}/issues/custom-view/{id}/list` | |
| Fase Proyek | `#milestones/{pid}/{milestoneSetId}` | |
| Log Waktu Proyek | `#zp/projects/{pid}/timelogs/custom-view/{id}/grid` | |
| Umpan Proyek | `#zp/projects/{pid}/feed` | |

---

## KEUNGGULAN

1. **Fitur sangat lengkap** — task management, time tracking, milestone, issue tracker, dokumen, kolaborasi, dan laporan dalam satu platform
2. **Sudah tersedia Bahasa Indonesia** — membantu pengguna lokal, meski tidak konsisten 100%
3. **Template proyek siap pakai** dari berbagai industri: IT, Konstruksi, Farmasi, Pemasaran Digital, dll.
4. **Approval workflow terstruktur** untuk absensi dan timesheet — cocok tim yang butuh validasi atasan
5. **AI Suggestions** untuk rekomendasi nama dan deskripsi tugas secara otomatis
6. **Dashboard global yang dikustomisasi** — widget bisa ditambah/dihapus/diatur ulang
7. **Time tracking detail** — bedakan jam billable vs non-billable, berguna untuk freelancer/konsultan
8. **Integrasi penuh ekosistem Zoho** (CRM, Mail, People, Books, dll.)
9. **Otomatisasi workflow** tersedia di hampir setiap modul tanpa perlu coding
10. **Laporan Beban Kerja heatmap** memudahkan manajer memantau kapasitas tim

---

## KELEMAHAN

1. **Antarmuka terlalu padat** — terlalu banyak menu, sub-menu, dan tab yang muncul bersamaan, membingungkan pengguna baru
2. **Fitur penting tersembunyi di "..."** — Fase, Masalah, Umpan, Lembar Waktu ada di balik tombol "Tab Lainnya" yang kecil; pengguna baru tidak akan tahu
3. **Terminologi membingungkan** — "Fase" (bukan Milestone/Tahapan), "Umpan" (bukan Aktivitas), campur Inggris-Indonesia; tidak familiar bagi pengguna awam
4. **Tidak ada onboarding interaktif** — tidak ada tutorial walkthrough yang membimbing pengguna baru step by step
5. **Tiga fitur waktu serupa tapi beda** — Log Waktu vs Absensi vs Lembar Waktu membingungkan tanpa dokumentasi
6. **Dark theme default** — teks abu-abu di latar gelap sulit dibaca, terutama untuk mata yang kurang baik
7. **Teks navigasi terlalu kecil** — font tab 11-12px, tidak ada ikon besar untuk navigasi cepat
8. **Banyak klik untuk hal sederhana** — membuat proyek baru butuh 4-5 langkah; navigasi tidak efisien
9. **Redirect tidak konsisten** — beberapa URL redirect ke halaman lain secara tidak terduga
10. **Popup trial** muncul saat pertama buka dan menghalangi konten utama

---

## ANALISIS UNTUK USER AWAM & ORANG TUA

### Tantangan Spesifik

| Aspek | Tingkat Kesulitan | Penjelasan |
|-------|------------------|------------|
| **Beban Kognitif** | 🔴 Tinggi | Terlalu banyak pilihan sekaligus; pengguna baru tidak tahu harus mulai dari mana |
| **Ukuran Teks & Kontras** | 🔴 Tinggi | Dark theme + teks abu kecil → sulit dibaca, terutama untuk lansia |
| **Istilah Asing** | 🔴 Tinggi | "Fase", "Umpan", "Issues", "Custom View" tidak familiar bagi orang awam |
| **Navigasi Berlapis** | 🔴 Tinggi | Tab dalam tab, dropdown dalam dropdown — sangat membingungkan |
| **Onboarding** | 🔴 Tinggi | Tidak ada panduan interaktif; pengguna mudah menyerah |
| **Fitur Tersembunyi** | 🟡 Sedang | Fitur penting di balik "..." — tidak akan ditemukan tanpa instruksi |
| **Mobile / Layar Kecil** | 🟡 Sedang | Tampilan web di HP sangat padat, sulit dioperasikan dengan jari |
| **3 Fitur Waktu Mirip** | 🟡 Sedang | Log Waktu vs Absensi vs Lembar Waktu — perlu membaca docs untuk bedakan |

### Hal yang Membantu Pengguna Awam
- ✅ Sudah ada Bahasa Indonesia
- ✅ Template proyek siap pakai dari berbagai industri
- ✅ Tombol Bantuan (live chat) tersedia di pojok kanan bawah
- ✅ Ikon menu cukup representatif (meski kecil)
- ✅ Nomor identifikasi tugas dan masalah memudahkan komunikasi

---

## KESIMPULAN

**Zoho Projects cocok untuk:**
- Project Manager berpengalaman yang terbiasa dengan PM tools
- Tim IT / Software Development yang butuh issue tracker + task manager
- Konsultan yang perlu billing berdasarkan jam kerja (billable hours)
- Perusahaan yang sudah menggunakan ekosistem Zoho (CRM, Mail, dll.)
- Tim 5–50 orang dengan proyek kompleks dan multi-level

**Zoho Projects kurang cocok untuk:**
- Pengguna awam tanpa training / onboarding
- Orang tua / lansia (UX tidak dirancang dengan aksesibilitas prioritas)
- Proyek sederhana dengan tim kecil yang butuh setup cepat
- Pengguna yang tidak familiar dengan konsep PM tools

**Rating keseluruhan untuk user awam: 3/10** — Fitur lengkap, tapi kurva belajar sangat curam. Membutuhkan pelatihan atau pendampingan sebelum bisa dipakai produktif oleh orang awam.

**Alternatif yang lebih ramah pengguna awam:**
- **Trello** — visual Kanban, drag-and-drop, sangat intuitif
- **Asana** — onboarding lebih baik, tampilan lebih bersih
- **Notion** — fleksibel, tapi juga butuh kurva belajar (lebih toleran dari Zoho)

---

*Riset dilakukan melalui eksplorasi langsung pada akun Zoho Projects aktif. Portal: nicoarya20gmaildotcom. Proyek test: "Test Research Project" (ID: 2725905000000109768).*
