# Rangkuman Gabungan 10 Kompetitor → Peta Celah & Kandidat USP

**Sumber:** 10 file `rangkuman-*.md` (Airtable, Asana, ClickUp, Linear, monday.com, Notion, Smartsheet, Trello, Wrike, Zoho Projects) + `tabel-presentasi-core-project-task.md`
**Dasar data:** eksplorasi langsung (akun trial/free) per 26–27 September 2026. Skor di tiap rangkuman memakai skala berbeda-beda, jadi **tidak dijumlahkan**, hanya dibaca sebagai arah.
**Tujuan:** menemukan *unique selling point* untuk PM baru yang **tampilannya sederhana** tapi **fiturnya tidak ada di kompetitor**.

---

## 1. Ringkasan Eksekutif

1. **Ke-10 kompetitor bersaing di arah yang sama: makin banyak fitur, makin banyak AI.** Hasilnya UI padat, istilah asing, dan kurva belajar tinggi. Hampir semua rangkuman menutup dengan "tidak disarankan untuk orang tua / awam / UMKM baru digitalisasi".
2. **Yang simpel (Trello, Smartsheet) terkunci di ujung lain:** mudah dipakai, tapi view penting berbayar (Trello), tanpa sub-task/laporan gratis, dan teksnya tetap kecil. Tidak ada yang menggabungkan *mulai semudah Trello* dengan *kemampuan PM yang muncul saat dibutuhkan*.
3. **Kelemahan yang muncul di 10 dari 10 kompetitor:** istilah teknis/asing, serta font kecil dan ikon tanpa label. Ini celah terbesar dan paling murah digarap.
4. **Fitur yang wajib ada tapi bukan pembeda:** multi-view, template, automation, forms, integrasi, AI chat. Semua kompetitor sudah punya. Kalau hanya menyamai, kita tidak punya alasan untuk dipilih.
5. **Rekomendasi positioning:** *"PM yang bisa dipakai siapa saja dalam 60 detik, dan fiturnya tumbuh bersama penggunanya."* Tiga fitur andalan: **Fitur Muncul Bertahap**, **Tambah Tugas dari WhatsApp/Email**, dan **Kabar Proyek otomatis satu kalimat** (detail di bagian 8–9).

---

## 2. Profil Singkat 10 Kompetitor

| Kompetitor | Posisi yang diklaim | Target nyata | Kekuatan khas | Kelemahan paling menonjol | Ramah awam* |
|---|---|---|---|---|:---:|
| **Trello** | Kanban visual | Individu, tim kecil | Board-List-Card seperti sticky note; email-to-card | View (Timeline, Calendar, Dashboard) berbayar; tanpa sub-task; teks kecil | 🟢 |
| **Smartsheet** | Spreadsheet kolaboratif | Enterprise, PM | Mirip Excel; Gantt + baselines; form ke sheet | Font 10pt; 10 ikon panel tanpa label; upsell mendadak | 🟢 |
| **Asana** | Work management + goals | Tim 5–500 | Multi-homing; goal alignment; My Tasks | Tidak ada mode lite; setup butuh keputusan arsitektur | 🟡 |
| **monday.com** | Work OS, AI-first | Tim bisnis | Status berwarna; workflow via kalimat; Sidekick lewat WhatsApp/Telegram | Jargon AI (Sidekick, Vibe, Agents); popup & banner upsell | 🟡 |
| **Notion** | Connected workspace | Knowledge worker | Fleksibilitas; database relasi; AI di dalam konten | Tidak ada "mulai dari mana"; recovery lemah | 🔴 |
| **Airtable** | Spreadsheet + database | Marketing, product, ops | 9 tipe view; import Excel/CSV; linked records | Istilah Base/Record/Field; Gantt di paywall | 🔴 |
| **Linear** | Issue tracker untuk developer | Tim software | Sangat cepat; penomoran NIC-1; integrasi Git | Jargon developer; tanpa onboarding; hanya Inggris | 🔴 |
| **Zoho Projects** | All-in-one PM suite | SMB 5–50 | Bahasa Indonesia; billable hours; heatmap beban kerja | UI padat; dark default; 3 fitur waktu membingungkan | 🔴 |
| **ClickUp** | "One app to replace them all" | Tim teknis/startup | Paling lengkap; Brain² AI; Clips | 12+ menu sidebar; dark default; ikon tanpa label | 🔴 |
| **Wrike** | Work delivery platform | Enterprise | Gantt terdetail; workload; 18 bahasa; request forms | 5 langkah sebelum bisa kerja; jargon PM | 🔴 |

\* Penilaian dari `tabel-presentasi-core-project-task.md`.

---

## 3. Struktur Menu Inti: Berapa Langkah Sebelum Bisa Kerja?

| Kompetitor | Hierarki | Langkah awal |
|---|---|:---:|
| Trello | Board → List → Kartu | 2 |
| Smartsheet | Folder → Sheet → Baris | 2 |
| Asana | Proyek → Bagian → Task | 3 |
| monday.com | Board → Grup → Item | 3 |
| Airtable | Base → Tabel → Baris | 3 |
| Zoho Projects | Proyek → Daftar Task → Task | 3–4 |
| Linear | Tim → Proyek → Issue | 4 |
| ClickUp | Folder → List → Task | 5 |
| Wrike | Folder → Proyek → Task | 5 |
| Notion | Database bebas | tidak tentu |

**Pola:** makin banyak langkah di depan, makin rendah keramahan untuk pemula. Batas "enak" ada di 2 langkah.

---

## 4. Pola Kelemahan Lintas Kompetitor

✔ = disebut eksplisit di rangkumannya. Sel kosong = tidak disebut (belum tentu tidak ada).

| Kelemahan | Air | Asa | Cli | Lin | Mon | Not | Sma | Tre | Wri | Zoh | Total |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Istilah teknis / asing | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **10** |
| Font kecil / ikon tanpa label | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **10** |
| Fitur inti di paywall / upsell | ✔ | ✔ | ✔ |  | ✔ | ✔ | ✔ | ✔ | ✔ |  | **8** |
| Tanpa onboarding terpandu |  |  | ✔ | ✔ | ✔ | ✔ | ✔ |  | ✔ | ✔ | **7** |
| Tanpa "mode simpel" | ✔ | ✔ |  |  | ✔ | ✔ | ✔ |  | ✔ |  | **6** |
| Mobile / layar sentuh lemah | ✔ |  | ✔ | ✔ |  | ✔ |  | ✔ |  | ✔ | **6** |
| Fitur penting disembunyikan di "More / …" |  |  | ✔ | ✔ | ✔ |  |  |  | ✔ | ✔ | **5** |
| Notifikasi membanjiri |  | ✔ | ✔ |  |  |  |  | ✔ | ✔ |  | **4** |
| Hanya / dominan Inggris |  | ✔ |  | ✔ | ✔ |  |  |  | ◐ | ◐ | **3–5** |
| Popup / banner upsell mengganggu |  |  |  |  | ✔ |  | ✔ |  |  | ✔ | **3** |
| Dark mode default, sulit dibaca |  |  | ✔ |  |  |  |  |  |  | ✔ | **2** |
| Undo / recovery tidak jelas |  |  |  | ✔ |  | ✔ |  |  |  |  | **2** |
| Tidak ada mode offline | ✔ |  |  |  |  |  |  | ✔ |  |  | **2** |

◐ = sebagian (Wrike: UI ada Bahasa Indonesia tapi Help Center dominan Inggris; Zoho: Indonesia bercampur Inggris).

---

## 5. Pola Kekuatan Lintas Kompetitor (Table Stakes)

Ini yang harus ada agar dianggap PM "beneran", tapi **bukan** alasan orang memilih kita:

| Kemampuan | Pemain yang sudah kuat |
|---|---|
| Multi-view dari satu data (List/Board/Calendar/Gantt) | Airtable, Asana, Smartsheet, Wrike, ClickUp |
| Template siap pakai | Semua |
| Automation tanpa kode | Asana, monday, Trello (Butler), Zoho, Wrike, Airtable |
| Form untuk menerima permintaan dari luar | Asana, Wrike, Smartsheet, Airtable |
| Status berwarna | monday, Trello (label), Smartsheet |
| AI chat / asisten | monday, Notion, ClickUp, Linear, Airtable, Smartsheet, Wrike |
| Integrasi 200–400+ | Asana, monday, Trello, Wrike, Linear |
| Kolaborasi real-time | Hampir semua |

---

## 6. Peta Harga (per September 2026, dari rangkuman)

| Kompetitor | Gratis | Berbayar awal | Yang dikunci |
|---|---|---|---|
| Trello | Board saja, 10 board, 1 Power-Up/board | ~$5 Standard, ~$10 Premium | Semua view selain Board |
| Asana | Maks 10 user; List & Board | ~$10.99 Starter, ~$24.99 Advanced | Timeline, Dashboard, Goals, Reporting |
| monday.com | 2 seat, terbatas | ~$9 Basic, $12 Standard, $19 Pro, AI add-on ~$20 | Timeline/Gantt, automation, AI |
| Airtable | 1.000 record/base | ~$20/seat Team | Timeline, Gantt, AI |
| Wrike | Ada (batas active tasks tidak jelas) | ~$10/user (tahunan), Business ~$25 | AI terbaik, Pinnacle/Apex tanpa harga |
| Notion | Cukup untuk personal | ~$10 | AI unlimited, guests, version history |
| ClickUp | Cukup lengkap | ~$7 | Template & dashboard Business, timesheets |
| Smartsheet, Zoho, Linear | tidak dicatat | tidak dicatat | Smartsheet: Resource Management diblokir upsell |

**Pola:** view dan fitur yang justru dibutuhkan PM serius (Timeline, Calendar, Dashboard) adalah yang dipaywall. Harga **per seat** membuat tim kecil/UMKM merasa mahal.

---

## 7. Celah Pasar (White Space)

| # | Celah | Bukti dari rangkuman |
|---|---|---|
| G1 | **Simpel di awal, kuat kemudian.** Belum ada yang menggabungkan keduanya. | Trello mudah tapi terbatas; ClickUp/Wrike kuat tapi 5 langkah |
| G2 | **Bahasa sehari-hari yang konsisten.** | 10/10 punya jargon; Zoho campur Inggris–Indonesia |
| G3 | **Aksesibilitas sebagai fitur utama**, bukan tambahan. | 10/10 font kecil/ikon tanpa label; 2 dark default |
| G4 | **Fitur yang tidak membanjiri.** Semua menampilkan semuanya; "mode simpel" hanya ada sebagai saran. | 6 eksplisit tanpa mode simpel; 5 sembunyi di "More" |
| G5 | **Tugas masuk dari tempat orang sudah berada (chat/email).** | Trello hanya email; monday WhatsApp tapi lewat AI berbayar |
| G6 | **Laporan tanpa konfigurasi.** | Trello free tanpa laporan; lainnya butuh setup dashboard |
| G7 | **Orang yang tidak mau/bisa belajar tetap ikut bekerja.** | Airtable: "butuh pendampingan orang yang lebih muda" |
| G8 | **Rasa aman salah klik.** | Linear tanpa undo jelas; Notion recovery lemah |
| G9 | **Harga dan paywall transparan.** | Smartsheet, ClickUp, Wrike memblokir mendadak |
| G10 | **Notifikasi yang tenang.** | 4 kompetitor membanjiri |

---

## 8. Kandidat USP

Penilaian: **Dampak** = seberapa besar menutup kelemahan umum; **Sulit ditiru** = seberapa berat bagi kompetitor menambalnya; **Biaya** = perkiraan kasar effort bangun (R/S/T).

### A. Fondasi: janji dasar produk

| ID | USP | Isi | Dampak | Sulit ditiru | Biaya |
|---|---|---|:-:|:-:|:-:|
| U1 | **Mulai 60 detik, 2 level** | Proyek → Task. Tanpa folder/workspace wajib. Proyek pertama <60 detik. | Tinggi | Rendah (Trello sudah begini) | R |
| U2 | **Bahasa polos, Indonesia asli** | "Tugas", "Proyek", "Selesai", bukan Issue/Base/Portfolio. Status 🔴🟡🟢 dulu, teks belakangan. Kamus istilah di bawah. | Tinggi | Sedang | R |
| U3 | **Aksesibilitas bawaan** | Teks Besar sekali klik; label selalu tampil di samping ikon; tema terang default + kontras tinggi; target sentuh besar; semua aksi bisa tanpa drag ("Pindahkan ke…"). | Tinggi | **Tinggi** (kompetitor bergantung pada UI padat) | S |

### B. Fitur unik: kandidat hero

| ID | USP | Isi | Dampak | Sulit ditiru | Biaya |
|---|---|---|:-:|:-:|:-:|
| **U4** | **Fitur Muncul Bertahap** | Bukan sekadar toggle Simpel/Lanjutan. Fitur ditawarkan saat relevan: task ke-10 → "Mau lihat di Kalender?"; ada tenggat berkaitan → "Mau tandai task yang harus selesai dulu?". Satu tombol kembali ke Simpel. | Tinggi | Sedang | S–T |
| **U5** | **Tambah tugas dari chat & email** | Teruskan pesan WhatsApp / email / catatan suara → jadi task (judul, tenggat dikenali dari kalimat). Jawaban balik berupa konfirmasi singkat. | Tinggi | Sedang | T |
| **U6** | **Kabar Proyek otomatis** | Tanpa dashboard yang disetel: satu paragraf per proyek, misal "7 dari 12 selesai, 2 terlambat (keduanya milik Budi), jadwal mundur ±3 hari." Dikirim harian/mingguan. Memakai ide heatmap beban kerja (Zoho/Wrike) tanpa konfigurasi. | Tinggi | Sedang | S–T |
| U7 | **Mode Pendamping** | Satu orang (anak/admin) mengatur; yang lain hanya melihat "Tugas saya hari ini" dan mencentang. Bisa lewat link tanpa akun. Memakai ide request forms Wrike dan Trello inbox. | Tinggi untuk segmen awam | Sedang | S |
| U8 | **AI Pemandu, bukan AI Agen** | Tombol kecil "Tanya cara…" yang *menunjukkan sambil mengerjakan* ("Bagaimana menugaskan ini ke Sari?" → sorot tombolnya, atau langsung lakukan setelah konfirmasi). Opt-in, tidak menonjol di beranda. Belajar dari Linear (AI sebagai jembatan UI) dan hindari Smart Assist yang membingungkan. | Sedang | Rendah (AI mudah ditiru) | S |
| U9 | **Jaring pengaman** | "Batalkan" muncul setelah setiap aksi; Sampah terlihat jelas, 30 hari; konfirmasi kalimat biasa sebelum hapus massal. | Sedang | Rendah | R |
| U10 | **Notifikasi tenang** | Default: satu ringkasan harian + langsung hanya untuk "disebut namamu" dan "terlambat". Pengaturan tiga pilihan, bukan puluhan toggle. | Sedang | Rendah | R |

### C. Model bisnis

| ID | USP | Isi | Dampak | Sulit ditiru | Biaya |
|---|---|---|:-:|:-:|:-:|
| U11 | **Semua view terbuka + label plan sejak awal** | Kalender, Timeline, Board, List tidak dipaywall. Yang berbayar dilabeli di muka, tidak diblokir mendadak. | Tinggi | Sedang (mengorbankan pendapatan) | R (teknis), T (bisnis) |
| U12 | **Harga per tim/proyek, bukan per seat** | Masuk akal untuk UMKM dan keluarga. *Hipotesis, perlu uji harga.* | Sedang | Sedang | R (teknis), T (bisnis) |

### Kamus istilah (bahan U2)

| Jargon kompetitor | Kata polos |
|---|---|
| Workspace / Base / Space | (tidak ditampilkan; cukup "Proyek") |
| Issue / Item / Record / Card | Tugas |
| Portfolio | Kumpulan Proyek |
| Sprint / Backlog / Triage | Minggu ini / Daftar tunggu / Perlu dipilah |
| Dependency | "Harus setelah…" |
| Multi-homing | "Tampil juga di proyek lain" |
| Automation / Butler / Workflow | Aturan otomatis ("Kalau… maka…") |
| Gantt / Timeline | Jadwal bergaris |

---

## 9. Rekomendasi Positioning

**Pernyataan posisi:**
> PM untuk orang yang tidak mau belajar PM. Mulai dalam 60 detik, dan fiturnya ikut tumbuh sesuai kebutuhan.

**Tiga USP hero:** U4 (Fitur Muncul Bertahap) + U5 (Tambah Tugas dari Chat/Email) + U6 (Kabar Proyek).
- Ketiganya *fitur*, bukan sekadar "lebih simpel", jadi bisa didemokan dan dibandingkan.
- Tidak ada satu pun yang ada utuh di 10 kompetitor (ada irisan: email-to-card Trello, WhatsApp via AI monday, heatmap Zoho/Wrike, tapi tidak dalam bentuk ini).
- UI tetap sederhana: ketiganya bekerja di belakang layar atau muncul hanya saat relevan.

**Janji dasar (wajib, murah, langsung terasa):** U1, U2, U3, U9, U10.

**Kait emosional bila target adalah orang awam/lansia/UMKM:** U7 (Mode Pendamping). Kalau targetnya tim kecil umum, turunkan jadi fitur pendukung.

**Kalimat pemasaran awal (untuk diuji):**
- "Semudah Trello. Sekuat yang kamu butuhkan."
- "Kirim tugas lewat WhatsApp, sisanya kami urus."
- "Tanpa dashboard. Kabar proyek datang sendiri."

**Catatan jujur soal daya tahan:**
- Sederhana saja **bukan moat**. Trello sudah memegang posisi itu. Pembeda ada di kombinasi: sederhana di awal + kemampuan yang tumbuh + tidak dipaywall + aksesibel.
- Toggle Simpel/Lanjutan (dari `tabel-presentasi-core-project-task.md`) perlu dibaca sebagai *syarat*, bukan pembeda utama: mudah ditiru. U4 membuatnya lebih dalam (adaptif, bukan sakelar).
- U1–U3 bisa ditiru, tapi sulit ditambal kompetitor karena model mereka bertumpu pada kepadatan fitur.

---

## 10. Yang Layak Dipinjam dari Kompetitor

| Dari | Ide | Dipakai di |
|---|---|---|
| Trello | Board-List-Card, email-to-card, label warna | U1, U5 |
| Linear | Kecepatan; penomoran jelas; AI sebagai jembatan UI; activity log | Teknis, U8 |
| monday | Status berwarna; workflow dari kalimat; akses lewat WhatsApp | U2, U5 |
| Asana | Multi-homing; "My Tasks" sebagai beranda; video tutorial di Home | U1 |
| Smartsheet | Bantuan kontekstual sesuai halaman; baselines Gantt; label di bawah ikon | U3, U8 |
| Wrike | Request forms; workload view; 18 bahasa | U6, U7 |
| Zoho | Heatmap beban kerja; approval timesheet; Bahasa Indonesia | U6 |
| Airtable | Import Excel/CSV langsung | Onboarding |
| Notion | Recovery (Trash) sebagai pelajaran apa yang kurang | U9 |

**Yang dihindari (antipola yang berulang):** sidebar 7–12 menu sekaligus; fitur penting disembunyikan di "More/…"; popup dan banner upsell saat pertama buka; ikon tanpa label; onboarding berupa chat AI; tiga fitur serupa bernama beda (Zoho: Log Waktu / Absensi / Lembar Waktu); dark mode sebagai default.

---

## 11. Risiko dan Hal yang Perlu Divalidasi

1. **Data riset bersifat eksplorasi satu orang pada akun trial/free.** Belum diuji ke pengguna target nyata. Klaim "tidak ada yang punya X" berlaku sebatas yang tercatat di rangkuman; cek ulang tiap klaim sebelum dijadikan materi pemasaran.
2. **Skor antar rangkuman tidak sebanding** (skala 1–5, 1–10, bintang). Dipakai hanya untuk arah.
3. **U5 (WhatsApp):** bergantung pada WhatsApp Business API (biaya per percakapan dan kebijakan). Siapkan fallback: email dan Telegram dulu. Periksa juga implikasi privasi (isi chat).
4. **U6 (Kabar Proyek):** kualitas tergantung data yang diisi pengguna. Jika tenggat/penanggung jawab kosong, laporan jadi hambar. Perlu desain "nudge" pengisian.
5. **U4 (Fitur Bertahap):** aturan kapan menawarkan fitur bisa terasa mengganggu. Perlu uji dan tombol "jangan tawarkan lagi".
6. **U11/U12:** membuka semua view menekan pendapatan per seat. Butuh model bisnis yang sudah dihitung.
7. **Belum ditentukan segmen utama** (awam/lansia, UMKM, tim kecil umum). Pilihan ini mengubah urutan prioritas USP (terutama U7).
8. **Transkripsi suara Bahasa Indonesia dan pengenalan tanggal alami** ("Jumat depan") perlu diuji akurasinya.

---

## 12. Langkah Berikutnya (Usulan)

1. Tetapkan **segmen utama** dan pilih 3 hero USP final.
2. Uji cepat dengan **5–8 calon pengguna** dari segmen itu: apakah "60 detik" tercapai, apakah kalimat pemasaran dipahami.
3. Buat wireframe Beranda, Proyek, Task dengan Mode Simpel sebagai default, dan titik munculnya U4.
4. Prototipe U5 (email dulu) dan U6 (template kalimat) sebagai bukti konsep.
5. Hitung model harga untuk U11/U12 sebelum mengunci janji "semua view terbuka".

---

## 13. Penyesuaian untuk Segmen Terpilih: Orang Awam / Lansia

**Keputusan segmen:** orang awam dan lansia (dikonfirmasi user). Ini mengubah urutan prioritas di bagian 9.

### 13.1 Urutan baru

| Peringkat | USP | Alasan untuk segmen ini |
|:-:|---|---|
| 1 | **U3 Aksesibilitas bawaan** | Font kecil dan ikon tanpa label ada di 10/10 kompetitor. Ini hambatan pertama lansia. |
| 2 | **U7 Mode Pendamping** | Airtable sendiri mencatat lansia "butuh pendampingan orang yang lebih muda". Jadikan pendampingan sebagai fitur, bukan beban. |
| 3 | **U5 Tambah tugas dari chat / suara** | Lansia sudah memakai WhatsApp; tidak perlu belajar antarmuka baru (Trello inbox diakui membantu lansia). |
| 4 | **U2 Bahasa polos, Indonesia asli** | Jargon 10/10; Linear, Asana, monday hanya Inggris. |
| 5 | **U9 Jaring pengaman** | Rasa takut salah klik disebut di Linear dan Notion. |
| 6 | U1 Mulai 60 detik, 2 level | Dasar; Trello sudah begini. |
| 7 | U10 Notifikasi tenang | Banjir notifikasi disebut di 4 kompetitor. |
| 8 | U6 Kabar Proyek | Berguna terutama untuk **pendamping** (keluarga/admin) memantau tanpa bertanya terus. |
| Turun | U4 Fitur Bertahap, U8 AI Pemandu, U11/U12 | Fitur bertahap kurang relevan bila pengguna memang hanya butuh yang dasar. AI di sini hanya pemandu kecil. Model harga tetap penting tapi bukan alasan utama memilih. |

### 13.2 USP tambahan khusus awam / lansia

Catatan: **yang terbukti dari riset hanyalah masalahnya** (font, istilah, onboarding, drag di layar sentuh, takut salah klik, template bisnis yang tidak relevan). **Solusi di bawah ini hipotesis saya**, belum diuji ke pengguna.

| ID | USP | Isi | Dasar dari riset |
|---|---|---|---|
| U13 | **Satu hal dalam satu waktu** | Layar "Hari ini": satu-dua tugas besar, satu tombol besar "Sudah selesai ✅". Daftar lengkap ada di belakang tombol "Lihat semua". | Beban kognitif 🔴 tinggi (Zoho); terlalu banyak pilihan (Notion, Asana) |
| U14 | **Suara masuk, suara keluar** | Bicara untuk membuat tugas; tugas hari ini bisa dibacakan. | Teks kecil, mengetik sulit; Linear/monday memakai chat sebagai jembatan UI |
| U15 | **Pengingat lewat WhatsApp atau SMS, bukan notifikasi aplikasi** | Lansia tidak perlu membuka aplikasi sama sekali. Balas "sudah" untuk menyelesaikan. | Notifikasi aplikasi dan email dianggap membanjiri/tersembunyi (Trello) |
| U16 | **Template kehidupan sehari-hari** | Obat dan kontrol dokter, arisan, acara keluarga, belanja bulanan, usaha kecil. Bukan "sprint planning" atau "cross-functional plan". | Template Asana/monday/Wrike berorientasi bisnis |
| U17 | **Tampilan seperti kertas** | Kartu seperti sticky note dan tampilan mingguan seperti kalender dinding. Metafora fisik. | Trello dicatat familiar bagi generasi pra-digital; Planner mingguan disukai |
| U18 | **Masuk tanpa kata sandi rumit** | Login dengan nomor HP + kode, atau tautan dari pendamping. | Tidak ada di riset: hipotesis murni, perlu diuji |
| U19 | **Cetak atau kirim sebagai gambar** | Daftar tugas bisa dikirim ke WhatsApp sebagai gambar atau dicetak. | Hipotesis; sejalan dengan kebutuhan tanpa harus membuka aplikasi |
| U20 | **Pendamping menerima kabar** | Anak/pendamping dapat ringkasan ("Ibu sudah menyelesaikan 4 dari 5 tugas hari ini"). Ini U6 versi keluarga. | Turunan U6 + U7 |

### 13.3 Paket usulan untuk segmen ini

- **Janji utama (hero):** U3 Aksesibilitas + U7 Mode Pendamping + U5/U14 Tugas dari chat dan suara
- **Pengalaman harian:** U13 (Hari ini satu-satu) + U15 (pengingat lewat WhatsApp)
- **Dasar:** U1, U2, U9, U10, U16
- **Kalimat pemasaran untuk diuji:** "Cukup centang. Sisanya biar keluarga yang atur." / "Tugas harian yang bisa dipakai Ibu tanpa belajar."

### 13.4 Risiko tambahan untuk segmen ini

1. **Pembeli berbeda dari pengguna.** Yang memasang dan membayar mungkin anak/pendamping, bukan lansia. Pesan pemasaran dan onboarding harus dua arah.
2. **Privasi dan persetujuan.** Pendamping melihat aktivitas orang lain (U20). Perlu izin yang jelas dari lansia.
3. **Kasus pakai belum terpetakan.** Riset ini tentang alat PM; tugas harian lansia (obat, kontrol, arisan) belum diriset. Perlu wawancara 5–8 lansia dan pendamping.
4. **Suara Bahasa Indonesia** (aksen daerah, campur bahasa daerah) perlu diuji akurasinya.
5. **Risiko salah posisi:** "PM" mungkin bukan kata yang mereka cari. Bisa jadi produknya terasa lebih sebagai "pengatur tugas keluarga" daripada "project management".
