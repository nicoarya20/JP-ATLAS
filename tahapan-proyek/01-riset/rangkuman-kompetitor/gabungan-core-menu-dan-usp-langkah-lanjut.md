# Gabungan 10 Kompetitor (Core Menu) + USP dengan "Langkah Lanjut" yang Berbeda

**Sumber:** 10 file di `tahapan-proyek/01-riset/core-menu-kompetitor/` (airtable, asana, clickup, linear, monday, notion, smartsheet, trello, wrike, zoho-projects). Untuk Sidekick monday via WhatsApp dipakai juga `rangkuman-monday.md`.
**Dasar data:** eksplorasi langsung akun trial/free, 26–28 September 2026.
**Segmen target:** orang awam / lansia (keputusan 30 September 2026).
**Pertanyaan yang dijawab:** fitur yang *pemicunya sama* dengan kompetitor, tapi *apa yang terjadi sesudahnya* berbeda.

---

## 1. Temuan Utama

1. **Pemicunya sudah dimiliki semua orang.** Buat dengan AI, tangkap dari email/chat, form permintaan, pengingat tenggat, ringkasan status: semuanya ada di 3 kompetitor atau lebih. Berebut di sini tidak membuat kita dipilih.
2. **Langkah sesudah pemicu hampir selalu sama di 10 kompetitor:** sistem mencatat hasilnya di dalam aplikasi, lalu menunggu manusia membuka aplikasi untuk memilah, mengubah, atau memutuskan. Tercatat empat bentuk langkah lanjut: (a) menampilkan hasil, (b) mengirim notifikasi, (c) menaruh di Inbox/daftar untuk dipilah, (d) membuat draf teks.
3. **Yang tidak tercatat di riset:** sistem yang mengajukan *satu pertanyaan dengan jawaban sekali ketuk*, di kanal yang sudah dipakai orangnya, lalu jawaban itu langsung mengubah data dan menjadwalkan langkah berikutnya. Itulah celah mekanisme yang dipakai di bagian 5.
4. **Payung mekanisme (usulan):** *loop tertutup*. Setiap peristiwa tugas (masuk, selesai, terlewat) punya langkah lanjut yang sudah disiapkan sistem. Orang cukup menjawab.
5. **Tiga hero yang menutup siklus hidup tugas:** USP-1 (masuk), USP-2 (selesai), USP-3 (terlewat). Tiga lainnya (USP-4, 5, 6) mendukung.

---

## 2. Peta Gabungan 10 Kompetitor

### 2a. Struktur dan alur dasar

| Kompetitor | Hierarki | Cara buat task | Detail task | View |
|---|---|---|---|---|
| **Airtable** | Base → Table → View → Interface (task = baris) | Klik baris kosong (inline), Form view, Omni AI | Modal 2 kolom: field kiri, aktivitas kanan. Tanpa sub-task native | 9 (Timeline/Gantt/Section di Team+) |
| **Asana** | Goal → Portfolio → Project → Section → Task → Subtask | Dialog cepat: nama, assignee, project, tenggat | Panel kanan; multi-homing; tombol Approve/Reject; subtask tak terbatas | 8 tab |
| **ClickUp** | Workspace → Space → Folder (opsional) → List → Task → Subtask | Modal penuh, inline, perintah `/`, draft tersimpan otomatis | Properti + tombol "Next status" satu klik; timer | 13 |
| **Linear** | Team → Project → Issue (sub-issue) | Tombol `C`, centang "Create more", prefix NIC-6 | Sidebar properti; Copy branch / Copy as Prompt | List, Board; Roadmap berbayar |
| **monday.com** | Workspace → Board → Group → Item → Subitem | "+ Add item" inline, Enter | Panel samping: Updates / Files / Activity Log | 9 + Vibe |
| **Notion** | Teamspace → Database (Projects, Tasks) | "New task", otomatis terhubung ke project | Halaman penuh: dokumen + properti | 6 |
| **Smartsheet** | Workspace → Sheet → Row → Child row | Tombol + di bawah baris, Enter, Smart Assist | Panel: Details / Attachments / Conversations | 5 |
| **Trello** | Workspace → Board → List → Card | "+ Add a card" satu kolom, tempel link, Inbox | Modal kartu; tombol Complete bulat di kiri judul | Board gratis, 5 lainnya premium |
| **Wrike** | Account → Space → Project/Folder → Task → Subitem | Dialog satu kolom nama + "Add and open" | Panel samping; status dan tanggal selalu terlihat | 6 |
| **Zoho Projects** | Portal → Project → Task list → Task → Subtask | Galeri template dulu; form panel; inline | Panel geser, 6 tab bawah; email unik per task | 3 (List, Gantt, Kanban) |

### 2b. AI, keunikan, dan kelemahan

| Kompetitor | AI andalan | Keunikan yang diklaim | Kelemahan yang tercatat |
|---|---|---|---|
| **Airtable** | Omni (tanya dulu, tampilkan rencana, "Build it", ada Undo); Field Agents | Interface layer; izin view Personal/Locked | Model database; sub-task manual |
| **Asana** | Dash; AI Teammates (Work Intake); Create with AI | Multi-homing; approval; Goals | Hierarki berat; AI masih preview |
| **ClickUp** | Brain², Super Agents, Talk to Text | 13 view; "everything app"; draft create tersimpan | Overwhelming; kredit AI cepat habis |
| **Linear** | Agent; Create with Agent; Copy as Prompt | Kecepatan; jembatan issue ke kode | Khusus developer |
| **monday.com** | Sidekick (juga via WhatsApp/Telegram); Agents; kolom AI | Status berwarna; direktori agent siap pakai | Sidekick kosong di akun free; subitem 1 level |
| **Notion** | AI kontekstual proaktif; Autofill; Meeting Notes | Dokumen dan task satu halaman | Tanpa sub-task asli; automation berbayar |
| **Smartsheet** | Build with AI; Smart Assist; jadwal AI dikirim via email | Update request tanpa akun; kunci baris | Harga; UI kompleks |
| **Trello** | Create board with AI; saran automation | Inbox (email/Slack/Teams); Planner; Butler; Focus time | View utama berbayar; deskripsi hanya Markdown |
| **Wrike** | Copilot; AI Agents no-code (bisa di-@mention) | Approval + proofing; tipe item kustom | Kompleks; create task terlalu minim |
| **Zoho Projects** | Zia (saran task harus diaktifkan manual, isi konten, terjemah) | Mode proyek ketat; email per task; tipe penagihan; UI Indonesia | UI berat dan terasa lama |

---

## 3. Yang Sama di Semua (Bukan Pembeda)

Multi-view dari satu data; template; automation if-then; form intake; komentar dan @mention; riwayat aktivitas; subtask (kecuali Airtable, Notion); AI penulis deskripsi; AI pembuat proyek dari satu kalimat (Asana, Linear, Smartsheet, Trello, Airtable).

---

## 4. Pemicu Sama → Langkah Lanjut di Kompetitor

Kolom kanan adalah inti analisis. "Tidak tercatat" berarti riset tidak mencatatnya, bukan berarti pasti tidak ada.

| Pemicu | Yang sudah ada | Langkah lanjut di kompetitor |
|---|---|---|
| **Buat dengan AI** | Asana, Linear, Smartsheet, Trello, Airtable | Pengguna mendarat di struktur lengkap (bagian, tugas, tanggal, view) lalu merapikan sendiri. Asana menawarkan "Go to project". Hanya Airtable bertanya dulu, dan pertanyaannya soal struktur data (chip), bukan soal orangnya. |
| **Tangkap dari luar** | Trello Inbox (email, Slack, Teams); email per task di Zoho; form di Asana/Airtable/Wrike/Smartsheet/monday/ClickUp | Kartu atau baris masuk ke daftar. Orang harus membuka aplikasi dan memilah (Trello: badge "From email", lalu dipindah ke list). Pengirim tidak tercatat menerima balasan. |
| **Chat dengan asisten** | monday Sidekick (WhatsApp/Telegram), Asana Dash, Linear Agent, ClickUp Brain² | Asisten menjawab setelah *pengguna bertanya*. Ada yang terjadwal (monday `/daily brief`), tapi isinya bacaan. |
| **Tandai selesai / ganti status** | Trello lingkaran Complete; ClickUp "Next status"; Wrike, Asana | Status berubah. Sesudahnya hanya notifikasi ke pengamat berakun, atau aturan if-then yang harus dibuat sendiri (Butler, aturan Zoho, template monday). |
| **Tenggat / terlambat** | Zoho pengingat di hari tenggat; Wrike agent Missed Deadline; Smartsheet tandai "At Risk"; Trello dan monday aturan tanggal | Notifikasi atau penandaan. Orang harus membuka task lalu mengubah tanggal atau penanggung jawab sendiri. Terdekat: agent Wrike (beri konteks dan saran langkah, berupa teks untuk PM). |
| **Laporan status** | Asana Dash "Draft my weekly status"; Notion draf update; Linear project update; Wrike Copilot; Smartsheet jadwal AI via email; monday scheduled | Draf teks atau grafik untuk dibaca atau disunting. Smartsheet mengirim email ke penerima tanpa login, tapi berhenti di membaca. |
| **Menugaskan orang** | Semua | Penerima dapat notifikasi dan harus masuk aplikasi. Pengecualian: Smartsheet "Send row" dan Update Request (penerima tanpa akun, jawaban form mengubah baris); Zoho (balas email jadi komentar). |
| **Dependensi** | Asana, ClickUp, Linear, Zoho, Smartsheet | Tercatat sebagai tanda blok atau garis di Gantt. Apa yang terjadi saat task pemblokir selesai tidak tercatat. |
| **Intake permintaan** | Asana Work Intake (AI klasifikasi, rutekan, prioritaskan); Wrike Request; Smartsheet Request | Permintaan jadi task di project dan dirutekan ke tim. Tidak tercatat ada tawar-menawar balik ke peminta. |
| **Saran "kerjakan apa hari ini"** | Asana Dash; monday `/daily brief`; Trello Planner | Model *tarik*: pengguna membuka panel atau kalender, lalu membaca daftar. |

---

## 5. Enam USP dengan Mekanisme Berbeda

Format: **pemicu sama** → **kompetitor lanjut** → **kita lanjut**. Bukti merujuk ke bagian 4.

### USP-1. Tangkap, lalu Tanya Satu Hal

- **Pemicu sama:** pesan WhatsApp, email, atau suara diteruskan jadi tugas.
- **Kompetitor lanjut:** Trello menaruh kartu di Inbox untuk dipilah nanti. monday Sidekick menunggu Anda bertanya. Airtable Omni bertanya banyak hal tentang struktur.
- **Kita lanjut:** tugas langsung jadi. Sistem membalas di kanal yang sama dan hanya menanyakan satu bagian yang kurang, dengan tombol jawaban: *"Kontrol dokter. Kapan? [Kamis pagi] [Kamis siang] [Hari lain]"*. Begitu dijawab, pengingat terpasang. **Tidak ada Inbox yang harus dibereskan.**
- **Beda mekanisme:** Inbox kompetitor memindahkan pekerjaan memilah ke manusia. Ini memindahkannya ke sistem, manusia hanya menjawab.
- **Risiko:** pemahaman tanggal Bahasa Indonesia ("Jumat depan", "habis magrib"); biaya dan kebijakan WhatsApp Business API (siapkan fallback email/Telegram).

### USP-2. Estafet: Selesai Langsung Menyalakan Langkah Berikutnya

- **Pemicu sama:** menandai tugas selesai; dependensi "harus setelah…".
- **Kompetitor lanjut:** status berubah, notifikasi ke pengamat yang punya akun. Dependensi hanya penanda.
- **Kita lanjut:** satu centang memicu dua hal. (1) Tugas berikutnya di urutan langsung aktif dan orang yang kebagian dapat *"Giliran Anda"*. (2) Orang yang menunggu, tanpa akun, dapat satu kalimat: *"Bapak sudah ambil hasil lab. Sekarang giliran daftar ke dokter."*
- **Beda mekanisme:** kompetitor mencatat perubahan. Kita meneruskan tongkat ke orang berikutnya.
- **Risiko:** pendamping melihat aktivitas orang lain, jadi butuh persetujuan jelas dari yang bersangkutan. Asana/Linear/ClickUp mungkin sudah mengirim notifikasi saat pemblokir selesai; cek ulang sebelum klaim "tidak ada".

### USP-3. Tangga Tindak Lanjut: Terlambat = Ditanya, Bukan Diteriaki

- **Pemicu sama:** tenggat lewat atau hampir lewat.
- **Kompetitor lanjut:** notifikasi atau tanda "At Risk". Agent Wrike memberi alert dengan konteks dan saran, berupa teks untuk PM.
- **Kita lanjut:** satu pesan dengan tiga tombol yang **langsung mengubah data**: *[Sudah selesai] [Besok saja] [Minta Sari bantu]*. "Besok saja" menggeser tanggal. "Minta bantu" membuat permintaan ke Sari. Tidak dijawab: naik satu anak tangga (ulang sekali dengan lembut, lalu kabari pendamping satu kalimat). Jam tenang berlaku.
- **Beda mekanisme:** kompetitor memberi tahu lalu menyerahkan pekerjaan mengedit ke manusia. Kita membuat jawaban itu sendiri sebagai pengeditan.
- **Risiko:** terasa seperti diawasi atau cerewet jika anak tangganya agresif. Perlu batas frekuensi dan tombol "jangan ingatkan soal ini".

### USP-4. Proyek Sepotong-sepotong: AI Memberi Satu Langkah, Bukan Tiga Puluh

- **Pemicu sama:** "buat dengan AI" dari satu kalimat.
- **Kompetitor lanjut:** struktur penuh (Asana: bagian, tugas, tanggal, 4 view) lalu "Go to project". "Hari ini kerjakan apa" harus ditanyakan ke Dash.
- **Kita lanjut:** hasil AI ditampilkan sebagai ringkasan kecil (*"Syukuran: 9 langkah. Mulai dari: tentukan tanggal"*) dan hanya **satu langkah pertama** yang terbuka. Langkah berikutnya terbuka setelah yang ini dicentang (memakai estafet USP-2). Daftar penuh ada di "Lihat semua". Langkah hari ini *didorong* pagi hari, tidak perlu ditanya.
- **Beda mekanisme:** kompetitor menyerahkan peta lengkap. Kita menyerahkan satu langkah dan membuka sisanya bertahap.
- **Risiko:** sebagian orang ingin melihat gambaran besar; "Lihat semua" harus selalu tersedia.

### USP-5. Kabar yang Berujung Tombol

- **Pemicu sama:** ringkasan status otomatis.
- **Kompetitor lanjut:** draf teks atau grafik (Asana, Notion, Wrike). Smartsheet dan monday mengirim terjadwal, tapi berhenti di dibaca.
- **Kita lanjut:** kabar ke pendamping disertai aksi yang bisa langsung dijalankan: *"2 tugas Ibu terlambat. [Kirim pengingat lembut] [Geser ke Sabtu] [Biarkan]"*. Menekan tombol menjalankan aksinya, termasuk tangga di USP-3.
- **Beda mekanisme:** laporan kompetitor adalah akhir dari alur. Laporan kita adalah awal langkah berikutnya.
- **Risiko:** kualitas kabar bergantung pada data yang diisi (tenggat dan penanggung jawab kosong membuatnya hambar).

### USP-6. Minta Tolong Dua Arah

- **Pemicu sama:** form permintaan atau intake.
- **Kompetitor lanjut:** kiriman form jadi task di project. Asana Work Intake mengklasifikasi dan merutekan untuk PMO. Smartsheet Update Request meminta *update*. Tidak tercatat ada negosiasi balik.
- **Kita lanjut:** tombol besar **"Minta tolong"** (beli obat, antar ke dokter). Pendamping menerima pertanyaan dengan tiga jawaban: *[Bisa, Sabtu] [Bisa, kapan?] [Tidak bisa]*. Jawaban kembali ke peminta dengan kalimat biasa dan menjadi tugas bertanggal.
- **Beda mekanisme:** formulir searah diganti percakapan pendek yang hasilnya tugas yang sudah disepakati.
- **Risiko:** pembeli dan pengguna berbeda orang; onboarding pendamping harus dirancang sendiri.

---

## 6. Perbandingan dan Prioritas untuk Awam/Lansia

| USP | Pemicu yang sama | Langkah lanjut kompetitor | Langkah lanjut kita | Siklus | Prioritas |
|---|---|---|---|---|:-:|
| **1 Tangkap + Tanya Satu Hal** | Email/chat jadi tugas | Masuk Inbox, dipilah manual | Tugas langsung jadi, satu pertanyaan tombol | Masuk | **1** |
| **3 Tangga Tindak Lanjut** | Pengingat / terlambat | Notifikasi, tanda risiko | Tiga tombol yang mengubah data, naik tangga | Terlewat | **2** |
| **2 Estafet** | Centang selesai | Status berubah, notif | Langkah berikut menyala, penunggu dikabari | Selesai | **3** |
| **6 Minta Tolong Dua Arah** | Form intake | Jadi task di project | Tawar-menawar tiga jawaban | Masuk | 4 |
| **4 Proyek Sepotong-sepotong** | Buat dengan AI | Struktur penuh | Satu langkah, sisanya bertahap | Masuk | 5 |
| **5 Kabar Berujung Tombol** | Ringkasan status | Draf/grafik dibaca | Kabar + aksi sekali ketuk | Terlewat | 6 |

**Alasan urutan:** USP-1, 3, 2 menutup seluruh siklus hidup tugas dan paling langsung menjawab hambatan lansia di riset (font kecil, istilah asing, takut salah klik, enggan membuka aplikasi). USP-6 kuat secara emosional tapi bergantung pada adanya pendamping. USP-4 dan 5 lebih berharga setelah 1–3 berjalan.

**Kalimat pemasaran untuk diuji:**
- "Setiap tugas punya langkah berikutnya. Anda cukup menjawab."
- "Tidak perlu buka aplikasi. Balas saja pesannya."
- "Terlambat? Kami tanya dulu, bukan marah."

---

## 7. Hubungan dengan USP Lama (`rangkuman-gabungan-usp.md`)

| USP baru | Turunan dari | Yang baru |
|---|---|---|
| 1 | U5, U14 | Sistem yang bertanya balik satu hal; tanpa Inbox |
| 2 | U13, U20 | Langkah berikut menyala otomatis; kabar ke penunggu tanpa akun |
| 3 | U15, U10 | Jawaban langsung mengubah data; ada tangga eskalasi |
| 4 | U13, U4 | AI menyerahkan satu langkah; pembukaan bertahap |
| 5 | U6, U20 | Kabar disertai tombol aksi |
| 6 | U7 | Permintaan dua arah, bukan formulir |

Bedanya dengan daftar lama: di sana yang dijual adalah *fitur* (WhatsApp, pengingat, laporan). Di sini yang dijual adalah *apa yang terjadi sesudah fitur itu dipakai*.

---

## 8. Catatan Jujur dan Hal yang Perlu Divalidasi

1. **"Tidak tercatat" bukan "tidak ada".** Riset adalah eksplorasi satu orang di akun trial/free. Sebelum dipakai di materi pemasaran, cek ulang terutama: notifikasi saat pemblokir selesai (Asana, Linear, ClickUp), agent Missed Deadline Wrike, Work Intake Asana, dan Sidekick monday di WhatsApp (catatan WhatsApp datang dari `rangkuman-monday.md`; file `monday.md` menyebut Sidekick kosong di akun free).
2. **Mekanismenya tidak sulit ditiru secara teknis.** Wrike, Asana, dan monday sudah punya agent. Yang sulit ditiru adalah membuat *seluruh produk* bertumpu pada balasan sekali ketuk untuk pengguna non-teknis. Dugaan bahwa kompetitor enggan mendorong pengguna keluar dari aplikasi (karena harga per seat dan metrik penggunaan) adalah **hipotesis**, belum terbukti.
3. **Bergantung pada kanal.** WhatsApp Business API berbiaya dan berkebijakan; SMS berbiaya; Telegram jarang dipakai lansia. Kanal utama belum diputuskan.
4. **Risiko ke pengguna:** kesan diawasi (USP-2, 3, 5), pesan berlebihan, dan privasi isi chat. Perlu persetujuan eksplisit, jam tenang, dan batas frekuensi.
5. **Belum diuji ke lansia dan pendamping.** Yang terbukti dari riset hanya hambatan di alat yang ada. Mekanisme di atas adalah hipotesis rancangan.
6. **Kasus pakai belum dipetakan.** Tugas harian lansia (obat, kontrol, arisan) belum diriset.

---

## 9. Langkah Berikutnya (Usulan)

1. Pilih hero final: disarankan USP-1, 2, 3 sebagai satu paket "loop tertutup".
2. Uji tanpa membangun: selama seminggu, kirim pesan WhatsApp manual (peran sistem dimainkan orang) ke 5 lansia dan pendampingnya. Ukur berapa tugas selesai tanpa membuka aplikasi.
3. Uji USP-3 secara khusus: bandingkan balasan tombol vs pengingat biasa. Amati apakah anak tangga terasa membantu atau mengganggu.
4. Prototipe USP-1 lewat email dulu (tanpa biaya WhatsApp), lalu ukur akurasi pemahaman tanggal.
5. Putuskan kanal utama dan model persetujuan pendamping sebelum desain layar.
