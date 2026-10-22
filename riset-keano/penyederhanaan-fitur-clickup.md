# Penyederhanaan Fitur ClickUp: Lengkap, tapi Mudah Dipakai

**Tanggal:** 5 Oktober 2026
**Metode:** (1) Membaca workspace ClickUp Keano lewat ClickUp MCP. (2) Daftar fitur dilengkapi dari riset rekan, yang dieksplorasi langsung pada 26–28 September 2026: `tahapan-proyek/01-riset/core-menu-kompetitor/clickup-research.md`, `tahapan-proyek/01-riset/rangkuman-kompetitor/rangkuman-clickup.md`, dan screenshot `tahapan-proyek/01-riset/ss-kompetitor/clickup-*`.
**Catatan data:** versi awal disusun dari workspace template. Pada 5 Oktober 2026 pemetaan diulang dengan proyek riset ini (39 tugas, 20 urutan). Temuannya (sudah diterapkan ke bagian 2, 3, 7): `pemetaan-ulang-data-nyata.md`.
**Status:** draf untuk direview. Kalau sudah disetujui, dokumen ini menjadi acuan scope worktree.

---

## 1. Prinsip: Mudah Bukan Berarti Sedikit Fitur

Hampir semua kemampuan ClickUp tetap ada. Yang diubah ada tiga: **kapan** fitur muncul, **bagaimana** fitur dipakai, dan **siapa** yang menyetelnya.

| # | Prinsip | Masalah di ClickUp | Cara kita |
|---|---|---|---|
| P1 | **Satu jalan utama per tindakan** | Ada 5 cara membuat tugas: modal, inline, perintah `/`, shortcut, dan tombol sidebar | Satu tombol **+** dan satu kotak ketik. Shortcut tetap ada sebagai jalan pintas, tapi tidak diajarkan di awal |
| P2 | **Fitur muncul saat relevan** | 12+ menu, 13 view, dan puluhan field sudah tampil sejak hari pertama | Awalnya cukup 3 hal. Sisanya muncul saat datanya ada atau saat diminta |
| P3 | **Sistem yang menyetel, bukan pengguna** | Space, Folder, List, status, view, dan automation harus disusun dulu sebelum bisa bekerja | Mulai dari tujuan ("Mau mengurus apa?"), lalu struktur dibuat otomatis |
| P4 | **Diberi nama sesuai pertanyaan pengguna, bukan nama alatnya** | "Board", "Gantt", "Workload", "Pulse" | "Kerjakan apa hari ini?", "Siapa yang sedang sibuk?" |
| P5 | **Bahasa sehari-hari** | Sprint, OKR, Timesheet, Custom Field, Dependency | Lihat Kamus di bagian 4 |
| P6 | **Sistem mengusulkan, pengguna tidak perlu merakit** | Pembuat automation if/then | Sistem melihat pola lalu menawarkan: *"Tiap tugas selesai, kabari Ibu? [Ya] [Tidak]"* |
| P7 | **Batalkan, bukan konfirmasi** | Dialog "Save draft?" dan dialog konfirmasi | Aksi langsung jalan, lalu ada tombol **Batalkan** selama beberapa detik. Draf tersimpan tanpa bertanya |
| P8 | **Mudah dilihat dan disentuh** | Dark mode default, ikon tanpa label, elemen berdempetan di HP | Mode terang default, ikon selalu berlabel, target sentuh ≥ 48 px, ukuran huruf bisa diperbesar |

### 1.1 Lapisan Tampil

Setiap fitur di bagian 2 diberi satu lapisan berikut.

| Lapisan | Arti | Contoh |
|---|---|---|
| **L1 Selalu** | Terlihat tanpa diminta | Nama tugas, Kapan, Siapa, tombol Selesai |
| **L2 Saat relevan** | Muncul sendiri bila datanya ada atau kondisinya terpenuhi | Jadwal bergaris muncul saat proyek punya tugas berurutan yang bertanggal |
| **L3 Diminta** | Ada di "Tambah detail" (tugas) atau "Alat tambahan" (proyek). Setelah dipakai, tetap tampil di item itu | Catat waktu, info tambahan, tahap persetujuan |
| **S Sistem** | Dikerjakan otomatis, pengguna cukup menjawab | Membaca tanggal dari kalimat, menawarkan aturan otomatis |
| **— Nanti** | Ditunda ke fase berikutnya, tidak dihapus | Whiteboard, Mind Map |

**Tidak ada "Mode Lanjutan" global.** Saklar seperti itu jarang dibuka, sehingga fitur yang dibutuhkan tetap tersembunyi. Fitur dibuka per tugas atau per proyek, di tempat yang membutuhkannya.

---

## 2. Peta Fitur: ClickUp ke Versi Kita

### 2.1 Struktur dan Hierarki

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Workspace → Space → Folder → List → Task → Subtask | 6 level yang harus disusun dulu, dan tetap ada walau disembunyikan (folder "hidden") | **Proyek → Tugas → Langkah**. Ruang kerja satu per akun dan tidak ditampilkan | L1 |
| Folder | Lapisan tambahan hanya untuk mengelompokkan | **Label kelompok** pada proyek (mis. "Rumah", "Usaha"), dipakai sebagai filter | L3 |
| Multi-List | Konsep abstrak | **"Tampil juga di proyek lain"** | L3 |
| Subtask dan Checklist | Dua konsep mirip, pengguna bingung kapan pakai yang mana | Digabung jadi **Langkah**. Langkah yang diberi orang atau tanggal otomatis diperlakukan seperti tugas | L2 |
| Task type | Dropdown tipe dengan istilah teknis | Milestone menjadi tanda **⭐ Titik penting**. Meeting Note menjadi **Catatan rapat** di proyek. Form Response menjadi tugas biasa berlabel "Dari formulir" | L3 / S |
| Task wajib berada di List | Harus memilih tempat sebelum menulis | Tugas tanpa proyek masuk ke proyek bawaan **"Harian"** (sama dengan riset rekan) | S |

### 2.2 Membuat Tugas

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Modal Create Task | 10+ field sekaligus | **Satu kotak ketik**: *"Bayar listrik Jumat, Budi"*. Sistem membacanya jadi chip *Jumat · Budi* yang bisa diketuk untuk diubah | L1 + S |
| Perintah `/` dan shortcut | Harus dihafal | Tetap ada untuk pengguna cepat, tidak masuk onboarding | L3 |
| Talk to Text | Tombol mikrofon tersebar di banyak tempat | Satu tombol 🎤 di kotak ketik, plus voice note lewat WhatsApp | L1 |
| Draft auto-save dan dialog "Save draft?" | Dialognya menyela | Draf tersimpan diam-diam dan muncul lagi saat **+** dibuka | S |
| Template | Galeri terpisah yang harus dicari | Ditawarkan saat mengetik: *"Kelihatannya acara. Pakai contoh langkah acara? [Ya]"* | S |
| Write with AI (deskripsi, rencana, action item, tone, kreativitas) | Panel AI dengan pengaturan | Tombol **"Pecah jadi langkah"** dan **"Rapikan tulisan"**, tanpa pengaturan tone | L2 |
| Import (spreadsheet, Trello, Notion, monday) | Ada di Settings → Imports/Exports, kadang butuh izin admin | **"Pindahkan dari Excel/Trello"** dengan pratinjau sebelum masuk | L3 |
| (Pemicu dari luar) | — | **Teruskan pesan WhatsApp/email → jadi tugas**, lalu sistem menanyakan satu hal yang kurang (USP-1 rekan) | S |

### 2.3 Detail Tugas

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Status + tombol "Next status" + "Mark as Closed" | Status berbeda di tiap List, dan "closed" berbeda dari "complete" | Tombol besar **✅ Selesai**. Status lainnya diatur otomatis (lihat 2.4) | L1 |
| Assignees (banyak) | Tanggung jawab jadi kabur | **Siapa**: satu penanggung jawab utama, plus "Ikut bantu" | L1 |
| Start date + Due date | Dua kolom dan dua pemilih kalender | **Kapan**: satu kolom yang menerima "Jumat", "Jumat–Minggu", atau "tiap Senin" (berulang) | L1 |
| Priority 4 tingkat | Beda Urgent dan High tidak jelas | Saklar **⭐ Penting**. "Mendesak" dihitung otomatis dari tenggat | L1 / S |
| Tags | Daftar tag harus dibuat dulu | **Label**, dengan saran dari label yang pernah dipakai | L3 |
| Custom Fields (puluhan tipe) | Harus memilih tipe, nama, dan opsi | **"Tambah info"**: ketik namanya ("Nomor meteran") dan sistem menebak jenisnya. Bisa diterapkan ke semua tugas di proyek itu | L3 |
| Time estimate + Track time | Dua konsep teknis di setiap tugas | **Perkiraan lama** dan **Catat waktu**, diaktifkan per proyek lewat Alat tambahan | L3 |
| Description rich text + blok `/` | Toolbar penuh | Kolom **Catatan** biasa. Format dasar muncul saat teks diseleksi | L1 |
| Dependencies (waiting on / blocking) + Relate items | Istilah teknis, dan tidak terjadi apa-apa saat pemblokirnya selesai | **"Harus setelah…"**: boleh lebih dari satu tugas, lintas proyek. Saat semuanya selesai, tugas ini aktif dan orangnya dikabari (estafet, USP-2 rekan). Ditambah **"Terkait"** | L2 |
| Attachments + cover | — | **Lampiran**, foto langsung dari kamera | L3 |
| Watchers | Hanya untuk orang yang punya akun | **"Kabari…"**: pilih orang, termasuk tamu tanpa akun, yang dikabari saat tugas selesai | L2 |
| Activity log | Panel terpisah | **Riwayat**, dilipat di bawah | L3 |
| Toggle "Collapse empty fields" | Harus dinyalakan sendiri | Field kosong memang tidak pernah tampil | S |

### 2.4 Status dan Alur Kerja

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Status custom per List | Harus disetel sebelum kerja, dan tiap List bisa berbeda | Mengikuti model rekan: **Menunggu giliran → Aktif → Selesai**, plus turunan otomatis **Belum berjadwal** dan **Terlambat** | L1 / S |
| Status tambahan ("Awaiting Review", "Ready for Launch") | — | **Tahap tambahan** per proyek (maks. 5) lewat Alat tambahan. Contoh: "Perlu dicek" yang memunculkan tombol **Setuju / Kembalikan** | L3 |
| Closed vs Complete | Dua konsep untuk hal yang sama, dan tipenya bisa beda antar-space | Hanya **Selesai**. Diarsipkan otomatis setelah 30 hari | S |
| Bulk edit | Checkbox kecil dan bar aksi yang padat | Tekan lama untuk memilih beberapa tugas, lalu muncul bar: Selesai · Geser tanggal · Ganti orang | L2 |

### 2.5 Tampilan (13 view menjadi 3 lensa, sisanya muncul otomatis)

| View ClickUp | Versi kita | Lapisan |
|---|---|:-:|
| List, Table | **Daftar** (default). Table menjadi Daftar dengan "Tampilkan kolom" | L1 |
| Board (Kanban) | **Papan**: kolom adalah status, kartu digeser (atau "Pindahkan ke…" tanpa drag) | L1 |
| Calendar, Planner | **Kalender** (mingguan seperti kalender dinding) | L1 |
| Gantt, Timeline | **Jadwal bergaris**, hanya muncul sebagai pilihan bila proyek punya ≥ 2 tugas bertanggal yang saling "Harus setelah…" | L2 |
| Workload, Teams Pulse | **"Siapa sedang sibuk"** di menu Orang: jumlah tugas aktif dan terlambat per orang | L2 |
| Activity | Riwayat per proyek | L3 |
| Dashboard (widget rakitan) | **Ringkasan proyek** otomatis: x selesai, y terlambat, langkah berikutnya, disertai tombol aksi (USP-5 rekan) | S |
| Doc, Docs hub, Wiki | **Catatan proyek**: satu halaman per proyek, dan baris teks bisa dijadikan tugas | L3 |
| Form, Forms | **Formulir permintaan**: tautan yang bisa dibagikan, setiap kiriman jadi tugas. Untuk keluarga: tombol **Minta tolong** (USP-6 rekan) | L3 |
| Whiteboard, Mind Map | Sementara diganti "Pecah jadi langkah" (AI) untuk mengurai ide | — Nanti |
| Private view, Pin view | Lensa terakhir yang dipakai diingat otomatis per orang | S |

### 2.6 Komunikasi dan Kolaborasi

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Inbox (Primary/Other/Later/Cleared), Replies, Assigned Comments | 4 tab dan 3 halaman yang harus dipilah | **Tidak ada Inbox.** Hal yang butuh jawaban menjadi **kartu di Hari Ini** dengan maks. 3 tombol | S |
| Comments + @mention | — | **Obrolan** di setiap tugas, dengan @nama | L1 |
| Assign comment | Ikon kecil yang tidak dikenali | Tekan lama sebuah pesan, lalu pilih **"Jadikan tugas"** | L2 |
| Chat Channels + Direct Messages | Aplikasi chat lengkap di dalam aplikasi | Obrolan menempel di **proyek**. Pesan pribadi tetap lewat WhatsApp | L2 |
| Clips (rekam layar) | — | **Pesan suara / video singkat** dari kamera di obrolan tugas | L3 |
| Schedule comment | Nilainya rendah untuk segmen ini | — | — Nanti |
| Notifikasi | Mudah membanjir | Maks. satu ringkasan pagi ditambah pesan mendesak. Jam tenang 21.00–06.00 (aturan pesan rekan) | S |
| Share, public link, guest | Banyak pilihan izin | **Bagikan**: tautan lihat-saja atau kirim ke WhatsApp. Tamu tanpa akun bisa menekan tombol jawaban | L2 |

### 2.7 Perencanaan, Waktu, dan Target

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Planner + time blocking | Harus menyusun blok waktu sendiri | **Hari Ini**: rencana harian otomatis berisi 1–3 tugas | L1 |
| Sinkron Google Calendar / Outlook | Harus lewat Planner | Satu saklar di Pengaturan | L3 |
| Meetings + AI Notetaker | Halaman terpisah | **Catatan rapat** di proyek: rekam suara, lalu dapat ringkasan dan daftar langkah yang bisa dicentang jadi tugas | L3 |
| Goals / OKR (key results) | Istilah manajemen | **Target**: proyek dengan angka ("Tabungan Rp10 juta"), progresnya dari tugas yang selesai atau angka yang diisi | L3 |
| Timesheets | — | **Laporan waktu**, hanya muncul bila Catat waktu aktif di proyek | L2 |
| Recurring task | Ada di menu tanggal yang terpisah | Ditulis langsung di **Kapan**: "tiap Senin", "tiap tanggal 5" | L1 |

### 2.8 Otomasi dan Integrasi

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Automations (trigger → kondisi → aksi) | Pengguna merakit logika sendiri | **Aturan otomatis yang ditawarkan** setelah sistem melihat pola (P6). Daftar aturan aktif ditulis dalam kalimat biasa ("Saat tugas selesai → kabari Ibu") dan bisa dimatikan | S / L3 |
| App Center (ribuan integrasi) | Terlalu banyak pilihan | 3 sambungan inti: **WhatsApp, Email, Google Calendar**. Sisanya fase berikutnya | L3 |
| Export | Ada di Settings | **Unduh Excel / PDF** dan **Kirim sebagai gambar ke WhatsApp** (U19 rekan) dari halaman proyek | L3 |

### 2.9 AI (Brain², Super Agents, Skills)

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Brain² Ask | Satu menu lagi yang harus dipelajari | AI tidak punya menu. Pertanyaan diketik di kotak **Cari**: *"tugas Budi minggu ini?"*, lalu keluar jawaban beserta tombol | L2 |
| Write / improve / summarize | Panel AI terpisah | "Rapikan tulisan" dan "Ringkas obrolan" muncul di tempat, mis. saat obrolan sudah panjang | L2 |
| Create task from text | — | Inti dari kotak ketik (2.2) | S |
| Super Agents, Skills, Agent templates, Memory, Max mode, Credits | Konsep developer, dan kredit membuat cemas | **Tidak tampil sebagai fitur.** Kemampuannya bekerja di balik layar untuk tangkap-lalu-tanya, tangga tindak lanjut, dan kabar (USP rekan). Pengguna tidak melihat kredit karena biayanya masuk paket | S |
| Banner saran Brain² | Saran muncul di mana-mana | Maks. satu saran per layar, dan bisa ditutup permanen | L2 |

### 2.10 Orang, Akses, dan Navigasi

| Fitur ClickUp | Kenapa rumit | Versi kita | Lapisan |
|---|---|---|:-:|
| Invite via email | Harus tahu email dan memilih seat | **Undang lewat WhatsApp atau tautan**, sambil memilih peran | L1 |
| Roles, permissions, guests | Matriks izin | 4 peran: **Pemilik, Pendamping, Anggota, Tamu** (riset rekan), tanpa matriks izin | L1 |
| Sidebar ikon tanpa label + "More" | Fitur tersembunyi, harus di-hover dulu | **5 menu bawah berlabel**: Hari Ini, Tugas, Proyek, Orang, Pengaturan (riset rekan). Tidak ada "More" | L1 |
| 6+ quick action di header | Terlalu banyak tombol | Satu tombol **+** berisi Tugas, Proyek, dan Minta tolong | L1 |
| Search ⌘K | Shortcut harus dihafal | Kotak **Cari** di atas Tugas dan Proyek, yang juga menerima pertanyaan (AI) | L1 |
| Dark mode default | Sulit dibaca sebagian orang | Mode terang default, mode gelap opsional | S |
| Settings yang luas | Puluhan toggle | Maks. 3 pilihan per hal (rekan) | L1 |
| Paywall template yang tidak jelas | Pengguna terkejut saat diblokir | Fitur berbayar sudah diberi label sejak awal (U11 rekan) | S |

---

## 3. Alur Kerja Inti: Sebelum dan Sesudah

Jumlah langkah ClickUp di bawah masih **perkiraan**, belum dihitung ulang dengan uji langsung.

| # | Alur | ClickUp | Versi kita |
|---|---|---|---|
| A1 | **Mulai pertama kali** | Buat Space, buat List, atur status, pilih view, baru buat task (≥ 5 langkah setup) | "Mau mengurus apa?" → ketik atau pilih contoh → proyek beserta langkah pertamanya jadi |
| A2 | **Tugas dengan tenggat dan orang** | Buka modal, isi nama, klik assignee, pilih orang, klik tanggal, pilih tanggal, Create (± 7 klik) | Ketik *"Bayar listrik Jumat, Budi"* lalu Enter |
| A3 | **Memecah tugas besar** | Buka task, tab Subtask, + Add, isi nama (diulang untuk tiap subtask) | **Pecah jadi langkah** → periksa daftarnya → **[Pakai]** |
| A4 | **Tugas berurutan** | Set dependency waiting on/blocking di dua task, lalu lihat Gantt | Di tugas: **"Harus setelah…"** (bisa beberapa). Saat semuanya selesai, tugas ini aktif dan orangnya dikabari |
| A5 | **Tugas terlambat** | Notifikasi masuk, buka task, ubah tanggal atau orang secara manual | Kartu: **[Sudah selesai] [Besok saja] [Minta tolong]**, dan jawabannya langsung mengubah data |
| A6 | **Melapor ke atasan/keluarga** | Rakit dashboard dan widget, atau minta Brain² | Ringkasan dikirim otomatis, lengkap dengan tombol aksi |
| A7 | **Membuat otomasi** | ⚡ → pilih trigger → kondisi → aksi → simpan | Terima tawaran sistem: **[Ya]** |

---

## 4. Kamus Istilah

Istilah yang sudah ada di kamus rekan (`rangkuman-gabungan-usp.md`, U2) dipakai sama persis, supaya mudah digabung.

| ClickUp | Kita |
|---|---|
| Workspace / Space | (tidak ditampilkan) |
| Folder | Label kelompok |
| List | Proyek |
| Task | Tugas |
| Subtask / Checklist | Langkah |
| Assignee | Siapa / Penanggung jawab |
| Due date + Start date | Kapan |
| Priority | Penting ⭐ |
| Custom status | Tahap tambahan |
| Dependency | Harus setelah… *(rekan)* |
| Multi-List | Tampil juga di proyek lain *(rekan)* |
| Gantt / Timeline | Jadwal bergaris *(rekan)* |
| Watcher | Dikabari |
| Milestone | Titik penting |
| Custom Field | Info tambahan |
| Dashboard | Ringkasan |
| Goal / OKR | Target |
| Timesheet / Time tracking | Catat waktu / Laporan waktu |
| Workload / Pulse | Siapa sedang sibuk |
| Automation | Aturan otomatis *(rekan)* |
| Inbox | (tidak ada; jadi kartu di Hari Ini) |
| Comment / Chat | Obrolan |
| Guest | Tamu |
| Template | Contoh langkah |

---

## 5. Usulan Urutan Pengerjaan (Acuan Worktree)

| Tahap | Isi | Lapisan |
|---|---|---|
| **1. Inti** | Proyek, Tugas, Langkah; kotak ketik yang membaca tanggal dan nama; Kapan, Siapa, Penting; status 3 + turunan; Hari Ini; lensa Daftar, Papan, Kalender; Obrolan tugas; undang dan 4 peran; 5 menu bawah; Batalkan; mode terang dan teks besar | L1 |
| **2. Sistem yang membantu** | Harus setelah… (estafet); Kabari…; kartu tindak lanjut untuk tugas terlambat; Ringkasan proyek; Pecah jadi langkah (AI); Jadwal bergaris; Siapa sedang sibuk; Bagikan tautan; edit massal; kanal luar (WhatsApp/email, sesuai keputusan rekan no. 1) | L2 / S |
| **3. Alat tambahan** | Info tambahan; Catat waktu dan laporannya; Tahap tambahan dan persetujuan; Target; Catatan proyek dan rapat; Formulir permintaan; Impor/Ekspor; sinkron Google Calendar; aturan otomatis yang ditawarkan | L3 |
| **4. Nanti** | Whiteboard, Mind Map, jadwal kirim obrolan, integrasi lain | — |

---

## 6. Relevansi terhadap Riset Rekan

- **Sejalan:** 5 menu, tanpa Inbox, status minimal, 4 peran, proyek bawaan "Harian", aturan pesan (maks. 3 tombol, jam tenang), dan istilah di kamus U2.
- **Tambahan dari dokumen ini:** pemetaan satu per satu setiap fitur ClickUp ke lapisan tampil; Subtask dan Checklist digabung menjadi Langkah; Jadwal bergaris yang muncul sendiri; "Alat tambahan" per proyek sebagai pengganti mode lanjutan.
- **Perlu dibahas saat penggabungan:**
  1. Rekan memakai prinsip **2 level (Proyek → Tugas)**, sedangkan dokumen ini menambahkan **Langkah** di dalam tugas. Pilihannya: Langkah sebagai checklist sederhana (objeknya tetap 2 level) atau sebagai sub-tugas penuh.
  2. Untuk segmen lansia, rekan **menurunkan prioritas U4 Fitur Muncul Bertahap**. Arahan Keano ("mudah tanpa memangkas fitur") justru menjadikannya pusat desain (P2, L2/L3). Perlu disepakati.
  3. U4 rekan menyebut "satu tombol kembali ke Simpel". Dokumen ini mengusulkan **tanpa mode global** (lihat 1.1).

---

## 7. Yang Perlu Diputuskan atau Divalidasi

1. **Langkah:** checklist sederhana atau sub-tugas penuh (lihat 6.1).
2. **Tahap tambahan:** apakah batas 5 sudah tepat, dan apakah status custom perlu diizinkan sama sekali.
3. **Kapan Jadwal bergaris muncul:** syarat ≥ 2 tugas berurutan yang bertanggal masih tebakan dan perlu diuji.
4. **Membaca kalimat Bahasa Indonesia** ("Jumat depan", "habis magrib", nama panggilan). Risikonya sama dengan USP-1 rekan.
5. **AI tanpa kredit yang terlihat:** biaya AI per pengguna perlu dihitung sebelum dijanjikan.
6. **Jumlah langkah ClickUp di bagian 3** perlu dihitung ulang saat uji langsung.
7. **Tugas bersama:** 10 dari 29 tugas di data nyata tidak punya satu penanggung jawab. Perlu "Bersama", atau tetap satu orang utama?
8. **Keputusan sebagai tugas:** 6 dari 29 tugas berupa keputusan. Perlu bentuk khusus atau cukup tugas biasa?
