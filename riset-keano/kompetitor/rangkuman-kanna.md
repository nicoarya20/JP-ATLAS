# Rangkuman Kompetitor: Kanna (Aldagram Inc.)

**Tanggal riset:** 2026-09-05 (profil PDF), dirangkum 2026-10-02
**Metode:** OSINT — situs resmi, LinkedIn, Crunchbase/PitchBook/CB Insights, TechCrunch, Capterra, App Store. **Tanpa akses langsung ke aplikasi** (berbeda dari riset rekan yang memakai akun trial).
**Sumber:** `../sumber/Kanna_Company_Product_Profiling_v3.pdf`
**URL:** https://kanna4u.com · https://aldagram.com

---

## Gambaran Umum

Kanna (カンナ) adalah aplikasi manajemen proyek dan kolaborasi dari Aldagram Inc., Tokyo (berdiri 2019). Kanna mengklaim diri sebagai software project management/kolaborasi **No.1 di Jepang** untuk pekerja **non-desk** (lapangan). Industri utamanya konstruksi (40% reviewer Capterra), lalu manufaktur, real estate, utilities, telekomunikasi, dan facilities services.

Kanna menyatukan empat hal: manajemen proyek dan jadwal, pelaporan lapangan (foto dan suara), komunikasi tim, dan sejak Series B (September 2026) diarahkan menjadi **"Field AI Platform"**.

Ciri khas yang paling relevan untuk kita:
- **Ramah pekerja senior:** 1 dari 4 pengguna berusia 50+, sebagian di atas 70 tahun. UI dirancang untuk pekerja yang tidak melek teknologi.
- **Mode offline:** untuk lokasi tanpa sinyal (bawah tanah, area terpencil).
- **Sangat bisa dikustomisasi:** form, laporan, dan alur kerja per perusahaan.
- **Bahasa Indonesia** tersedia sejak Agustus 2025, dengan kantor di Jakarta.

---

## Profil Perusahaan

| Item | Keterangan |
|---|---|
| Nama resmi | Aldagram Inc. (株式会社アルダグラム) |
| Berdiri | 2019, Tokyo |
| Kantor lain | Bangkok, Jakarta |
| Status | Swasta, belum IPO |
| Pendanaan | Series A ¥2 M (2022, MonotaRO, JAFCO) · strategic Panasonic (2023) · Series B ¥2 M (Sep 2026) · total estimasi US$15,4–26 juta |
| Karyawan | ~60–75 (Mei 2023) |
| Pelanggan | 5.000 (Mar 2022) → 70.000+ perusahaan (Jul 2025) |
| Negara | 100+ |
| Klaim lain | 155.000+ proyek terlacak, uptime 99,99%, kepuasan 90%+, ISO 27001 |
| Bahasa | Inggris, Jepang, Thailand, Indonesia |
| Klien unggulan | Panasonic, Nissan, Hitachi Elevator (TH), Lutley Windows (UK), Watford Control x Edison (TH) |

**Pola pertumbuhan:** media sosial korporat tipis dibanding skala 70.000+ klien. Pertumbuhan didorong direct sales, kemitraan distribusi (Panasonic sebagai investor sekaligus mitra), dan word of mouth di industri konstruksi.

---

## Struktur Fitur

> Struktur navigasi/sidebar aktual **belum diketahui** karena belum ada eksplorasi langsung. Pengelompokan di bawah mengikuti profil PDF.

### 1. Manajemen Proyek

| Fitur | Fungsi |
|---|---|
| Project Dashboard | Hub progres, status, planned vs actual cost/value, jumlah item selesai/terlambat |
| Project Calendar | Semua proyek aktif dan mendatang per anggota tim, mingguan/bulanan |
| Calendar (tim/sumber daya) | Ketersediaan anggota internal dan subkontraktor; undangan dengan konfirmasi **Yes/No/Maybe** |
| Project List | Daftar proyek, filter status/lokasi/linimasa/PIC, cari per proyek/klien/alamat |
| Task Management | Pekerjaan, tenggat, penanggung jawab (bisa lebih dari satu orang) |
| Project Board | Kanban drag-and-drop per tahap proyek (mis. Pre-quote → Pre-contract → Before), dengan jumlah per tahap |
| Sub-Project | Memecah proyek besar per unit/tahap, akses terkontrol per tim/subkontraktor |
| Gantt Chart | Drag-and-drop, dependensi antar-task, ekspor ke Excel |

### 2. Pelaporan & Dokumentasi

| Fitur | Fungsi |
|---|---|
| Photos & Documents | Simpan dan bagi foto/dokumen lokasi per folder tahapan |
| Punch Listing (Drawing Pins) | Pin bernomor di atas denah PDF untuk defect/instruksi, tertaut ke daftar tugas |
| S-Curve | Kurva plan vs baseline vs aktual, termasuk proyeksi tanggal selesai |
| Photo Report | Pilih foto, beri komentar per foto, ekspor jadi laporan siap cetak |
| Reporting | Laporan harian lokasi (mobile dan web), menggantikan kertas |
| Custom Report | Template laporan bergaya spreadsheet: teks, angka, foto, tanda tangan digital |
| Approval Flow | Sign-off dokumen/laporan; syarat **semua approver** atau **cukup satu** |

### 3. Fitur AI

| Fitur | Fungsi |
|---|---|
| AI MCP | Data proyek diekspos lewat Model Context Protocol; AI eksternal (mis. Claude) bisa membuat laporan, Gantt, proyek, dan menghitung budget |
| AI OCR | Foto formulir kertas → entri laporan digital |
| AI Assistance ("KANNA AI") | Chatbot bantuan penggunaan produk dan otomasi pekerjaan rutin |
| AI Voice Reporting | Dikte suara → tombol "Apply AI to report" mengisi field laporan (**beta**) |

### 4. Kolaborasi & Keamanan

| Fitur | Fungsi |
|---|---|
| In-House Chat | Chat per proyek, grup, dan privat; berbagi foto; web dan mobile |
| Security | 2FA, audit log, pembatasan perangkat, kontrol IP, ISO 27001 |

---

## Keunggulan dan Kelemahan

### Keunggulan Umum

- **Dirancang untuk pekerja lapangan:** mobile-first, mode offline, pelaporan berbasis foto dan suara.
- **Satu aplikasi untuk proyek + laporan + chat:** tidak perlu menyambung tool lain untuk kebutuhan lapangan.
- **Kalender dengan konfirmasi Yes/No/Maybe:** jawaban sekali ketuk langsung mengisi data kehadiran.
- **AI yang mengurangi input manual:** OCR formulir kertas dan dikte suara.
- **Terbuka untuk AI agent** lewat MCP.
- **Traksi besar:** 70.000+ perusahaan, 100+ negara.

### Kelemahan Umum (inferensi dari profil, belum diverifikasi)

- **Banyak modul** (±19 fitur utama). Berpotensi padat untuk pengguna baru, sama seperti pola kompetitor lain.
- **Istilah industri konstruksi:** Punch List, S-Curve, baseline, subkontraktor, Pre-quote. Asing bagi pengguna di luar konstruksi.
- **Harga tidak dipublikasikan** di profil. Kemungkinan model sales/demo, bukan self-serve.
- **Voice Reporting masih beta.**
- **Chat hanya di dalam aplikasi:** pengguna harus membuka Kanna untuk berkomunikasi, tidak memakai kanal yang sudah mereka pakai (WhatsApp).
- **Ulasan App Store global sedikit:** sulit menilai kualitas mobile dari sudut pengguna.

### Untuk Pengguna Awam

- ✅ UI ditujukan untuk orang yang tidak melek teknologi; Bahasa Indonesia tersedia.
- ✅ Input bisa lewat foto, suara, dan formulir kertas, tidak harus mengetik.
- ❌ Konteksnya kerja perusahaan (B2B), bukan kebutuhan pribadi atau keluarga.
- ❌ Banyak fitur dan istilah khusus konstruksi.

### Untuk Pengguna Lansia

- ✅ Bukti pemakaian nyata: 25% pengguna 50+, sebagian di atas 70 tahun.
- ✅ Mode offline mengurangi kegagalan karena sinyal.
- ❓ Ukuran font, label ikon, dan alur onboarding **belum diketahui**. Perlu dicek langsung.
- ❌ Tidak ada konsep pendamping (keluarga yang membantu dari jauh).

---

## Skor Kemudahan Penggunaan

**Belum dinilai.** Skor di riset rekan berasal dari eksplorasi langsung. Kanna perlu dicoba dengan akun trial/demo dulu agar skornya sebanding.

## Paket Harga

**Tidak tercantum** di profil. Perlu dicek di kanna4u.com atau lewat permintaan demo.

---

## Relevansi terhadap Riset Rekan

### Klaim rekan yang perlu ditinjau

| Klaim di riset rekan | Temuan Kanna |
|---|---|
| "Ke-10 kompetitor tidak disarankan untuk orang tua/awam" (`rangkuman-gabungan-usp.md` §1) | Kanna secara eksplisit menyasar dan dipakai pekerja senior 50–70+ |
| Tidak ada mode offline dianggap celah (§4) | Kanna sudah punya mode offline |
| Hanya/dominan Inggris (§4) | Kanna tersedia dalam Bahasa Indonesia sejak Agustus 2025, kantor di Jakarta |

### USP rekan vs Kanna (`alur-usp-peran-dan-menu.md`)

| USP rekan | Ada di Kanna? | Catatan |
|---|:-:|---|
| 1. Tangkap + Tanya Satu Hal | ◐ | Ada dikte suara dan OCR, tapi untuk **mengisi laporan**, bukan membuat tugas lalu bertanya satu hal |
| 2. Estafet | ◐ | Ada dependensi di Gantt; tidak tercatat ada pengabaran otomatis ke penerima giliran |
| 3. Tangga Tindak Lanjut | ❌ | Tidak tercatat |
| 4. Proyek Sepotong-sepotong | ❌ | Tidak tercatat; ada Sub-Project, tapi tujuannya pembagian akses, bukan membuka satu langkah saja |
| 5. Kabar Berujung Tombol | ❌ | Ada Dashboard dan S-Curve, tapi pengguna harus membukanya sendiri |
| 6. Minta Tolong Dua Arah | ◐ | Konfirmasi Yes/No/Maybe di Calendar mirip pola tombol jawaban, tapi khusus jadwal |

◐ = sebagian. Semua penilaian berdasar profil PDF; belum diverifikasi di aplikasi.

**Kesimpulan relevansi:** Kanna menutup sebagian celah "ramah lansia" dan "offline", tapi untuk **pekerja di perusahaan**. Pembeda riset rekan (Pendamping keluarga, kanal luar seperti WhatsApp, loop tanya-jawab sekali ketuk) **tidak ada** di Kanna.

### Fitur Kanna yang layak dipertimbangkan

- **Approval Flow** dengan syarat "semua" atau "cukup satu" orang.
- **Konfirmasi Yes/No/Maybe** di kalender: pola yang sama dengan aturan "tombol = perubahan data".
- **Photo Report:** relevan untuk pengguna yang lebih mudah memotret daripada mengetik.
- **AI MCP:** aplikasi live `pm-dashboard.wibudev.com` sudah punya access token untuk agent, jadi arahnya sejalan.
- **Mode offline.**

---

## Yang Perlu Diverifikasi

- [ ] Eksplorasi langsung (trial/demo): struktur menu, langkah sebelum bisa kerja, ukuran font, label ikon
- [ ] Kualitas terjemahan Bahasa Indonesia
- [ ] Harga dan model penjualan (self-serve atau sales)
- [ ] Cara kerja mode offline (apa yang bisa dilakukan tanpa sinyal, cara sinkronisasi)
- [ ] Ada tidaknya notifikasi/pengingat lewat kanal luar (WhatsApp, LINE, SMS)
- [ ] Sumber angka "25% pengguna 50+" (klaim situs resmi atau pihak ketiga)

---

## Kesimpulan

Kanna adalah kompetitor **paling dekat secara segmen** dengan arah riset rekan: produk ramah pekerja senior, berbahasa Indonesia, dan sudah beroperasi di Jakarta. Bedanya, Kanna adalah tool B2B untuk tenaga kerja lapangan perusahaan, dengan fitur khas konstruksi dan komunikasi di dalam aplikasi.

Cocok untuk:
- Perusahaan konstruksi, manufaktur, dan facilities dengan banyak pekerja lapangan
- Tim yang butuh laporan harian berbasis foto dan persetujuan dokumen
- Lokasi kerja dengan sinyal buruk

Kurang cocok untuk:
- Kebutuhan pribadi atau keluarga
- Pengguna yang ingin dibantu dari jauh oleh pendamping
- Orang yang tidak mau membuka aplikasi khusus dan lebih nyaman lewat WhatsApp
