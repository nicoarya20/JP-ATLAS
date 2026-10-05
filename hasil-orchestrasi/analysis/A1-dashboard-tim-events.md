# A1 — Analisis Menu Ringkasan (Dashboard), Menu Tim, Menu Events

> Analis Produk #1 · Run `run_16f58567a2c7` · Task `task_fee6a80702ee` · Oktober 2026
> Sumber fitur lama: `note.md` (bagian *Menu Ringkasan*, *Menu Tim*, *Menu Events*).
> Legenda label: **[KEEP] [MODIFY] [MERGE] [REMOVE] [ADD-AI] [ADD]** · Prioritas **P0** (wajib MVP) / **P1** (v1) / **P2** (nanti) · Effort kasar **S** (≤2 minggu) / **M** (2–4 minggu) / **L** (>1 bulan), untuk 1 tim kecil (asumsi 2–3 engineer).

---

## 1. Ringkasan eksekutif

1. **Menu Ringkasan saat ini adalah 14 widget yang sebagian besar menghitung ulang data yang sama.** Empat widget (*jadwal task*, *perlu perhatian kamu*, *jatuh tempo 7 hari*, *ghost reminder*) sama-sama berasal dari "task aktif saya + tanggal tenggat/terakhir disentuh". Satu task telat yang terbengkalai bisa muncul di **5 tempat sekaligus**. Hasilnya beban kognitif tinggi, tapi pengguna tetap tidak tahu *harus mengerjakan apa duluan*.
2. **Usulan 2026: ganti 14 widget menjadi 4 zona AI-first**, yaitu (a) **Briefing Harian AI** (narasi 3–5 poin berbasis data, tiap poin bisa diklik), (b) **Fokus Saya Hari Ini** (satu daftar terurut dengan *chip alasan*: Telat / Segera jatuh tempo / Mandek / Memblokir orang / Di-mention, tiap task hanya muncul sekali), (c) **Tanyakan ke data proyek** (NL query yang sadar permission dan menampilkan filter hasil tafsirannya), (d) **Agenda & Proyek saya** (event hari ini beserta bahan persiapannya, ditambah proyek dengan health chip). KPI angka dipindah ke tampilan PM dan hanya ditampilkan kalau ada delta/ambang yang bisa ditindaklanjuti.
3. **Menu Tim bergeser dari "siapa yang online" ke "siapa yang kapasitasnya aman"**. *Online sekarang* diubah menjadi **status ketersediaan** (Fokus/Rapat/Cuti, jam kerja, zona waktu) karena daftar online real-time nyaris tidak bisa ditindaklanjuti dan terasa seperti pengawasan. *Beban tim* (saat ini cuma jumlah task) diubah menjadi **beban tertimbang** (jam estimasi vs kapasitas, tenggat dalam jendela waktu, WIP, jumlah proyek paralel) dengan **peringatan dini overload** dan **saran rebalancing** yang harus dikonfirmasi PM.
4. **Menu Events dijadikan "Rapat & Events" dengan siklus tertutup**: *agenda otomatis → rekam/foto/transkrip → draf notulensi AI → ekstraksi Action item / Keputusan / Pertanyaan / Informasi lengkap dengan kutipan bukti & confidence → review & konfirmasi manusia → menjadi Task / Decision Log / Pertanyaan terbuka → recap ke peserta → dibawa ke rapat berikutnya*. "Hasil Rapat yang Dikonfirmasi" jadi inti fitur ini. **Tidak ada satu pun item yang otomatis menjadi task tanpa konfirmasi manusia.**
5. **Yang dihapus/digabung**: 11 dari 14 widget Ringkasan di-MERGE/REMOVE dan sisanya di-MODIFY (lihat §3), *grid view* Events dihapus, *aktivitas tim* digabung dengan *aktivitas terbaru* ke satu feed/digest, dan status event "selesai" diturunkan otomatis dari waktu, bukan diisi manual.
6. **Risiko utama**: privasi rekaman rapat (consent, retensi, UU PDP No. 27/2022), halusinasi saat ekstraksi (assignee/tanggal/keputusan yang dikarang), fitur burnout yang disalahgunakan untuk menilai kinerja, dan akurasi STT untuk Bahasa Indonesia yang bercampur istilah Inggris. Mitigasinya: consent eksplisit, sitasi wajib, field kosong lebih baik daripada tebakan, metrik beban hanya agregat dan non-punitif, serta audit log.
7. **Lanskap pasar mendukung arah ini**: Linear *Pulse* mengirim ringkasan update harian/mingguan ke Inbox; Notion *AI Meeting Notes* mentranskrip dan mengekstrak action item; Atlassian *Rovo* memperbarui task dari rekaman rapat; Asana *Dash* diposisikan sebagai "AI chief of staff" yang memunculkan langkah berikutnya dari rapat, Slack, dan email (sumber di §10).

---

## 2. Bedah fitur lama

### 2.1 Menu Ringkasan: nilai, irisan, beban kognitif

| # | Widget lama | Pertanyaan user yang dijawab | Sumber data / sinyal | Nilai saat ini |
|---|---|---|---|---|
| R1 | Proyek aktif | "Ada berapa proyek berjalan?" | project.status = Active | Rendah (angka statis, jarang berubah) |
| R2 | Task terbuka | "Seberapa besar backlog?" | task.status ∈ {open, inprogress, reopened} | Rendah untuk Member, sedang untuk PM (tanpa tren tidak bisa ditindaklanjuti) |
| R3 | Bug terbuka | "Seberapa buruk kualitas?" | task.kind = bug & aktif | Sedang (lebih berguna jika dipecah per severity/tren) |
| R4 | Ditugaskan saya | "Berapa beban saya?" | assignee = me & aktif | Sedang (hanya angka) |
| R5 | Status task saya | "Komposisi pekerjaan saya" | assignee = me, group by status | Sedang (berguna untuk "menunggu QC") |
| R6 | Ditutup 14 hari | "Seberapa produktif?" | status→closed, 14 hari | Rendah, **KPI vanity** (tanpa pembanding/target) |
| R7 | Jadwal task | "Kapan tenggat saya?" | due bucket: telat/hari ini/besok/minggu ini/nanti/tanpa tenggat | Tinggi, tapi **menelan R8 & R10** |
| R8 | Perlu perhatian kamu | "Apa yang telat?" (top 5) | due < today & belum closed | Tinggi, tapi **= bucket "telat" di R7** |
| R9 | Snapshot minggu ini | "Apa yang terjadi 7 hari terakhir?" | closed, inprogress, bugs, total aktif | Rendah, **menduplikasi R2, R3, R6** dengan jendela berbeda |
| R10 | Jatuh tempo 7 hari | "Apa yang segera jatuh tempo?" | today ≤ due ≤ today+7 | Tinggi, tapi **= bucket hari ini+besok+minggu ini di R7** |
| R11 | Ghost reminder | "Apa yang saya tinggalkan?" | inprogress & last_touched > 3 hari | Tinggi (sinyal unik: *staleness*), tapi terpisah dari daftar kerja |
| R12 | Events mendatang | "Rapat apa sebentar lagi?" | event 7 hari ke depan | Sedang (tidak ada bahan persiapan) |
| R13 | Aktivitas terbaru | "Apa yang berubah dan menyangkut saya?" | notifikasi: komentar, assignment, status, mention | Tinggi, tapi tidak diprioritaskan (mention bercampur dengan perubahan status biasa) |
| R14 | Proyek kamu | "Proyek saya bagaimana?" | proyek yang dimiliki/diikuti, max 5 | Sedang (tanpa health/progres) |

**Peta irisan.** Empat dari empat belas widget punya pertanyaan inti yang sama ("task saya mana yang butuh tindakan?"):

```
                          ┌───────────── Jadwal task (R7) ─────────────┐
                          │ telat │ hari ini │ besok │ minggu ini │ ... │
                          └───┬───┴────┬─────┴───┬───┴─────┬──────┴─────┘
Perlu perhatian (R8) ═════════╛        │         │         │
Jatuh tempo 7 hari (R10) ══════════════╧═════════╧═════════╛
Ghost reminder (R11)  ── irisan parsial: task inprogress yang mandek bisa sekaligus telat / segera jatuh tempo
Ditugaskan saya (R4) + Status task saya (R5) ── himpunan induk dari R7, R8, R10, R11
Snapshot (R9) ≈ Task terbuka (R2) + Bug terbuka (R3) + Ditutup 14 hari (R6), jendela waktu berbeda
Proyek aktif (R1) ⊂ Proyek kamu (R14) (sebagai hitungan)
Aktivitas terbaru (R13) ≈ Aktivitas tim (Menu Tim) dengan scope berbeda
Events mendatang (R12) = Menu Events difilter 7 hari
```

**Contoh beban kognitif.** Task *"Fix login SSO"* dengan status inprogress, tenggat kemarin, dan tidak disentuh 4 hari akan muncul di **R4 (hitungan), R5 (inprogress), R7 (telat), R8 (top 5), R11 (ghost)**, ditambah lagi terhitung di R2 dan R9. User harus menyadari sendiri bahwa kelima kemunculan itu adalah *satu pekerjaan yang sama*. Dashboard sudah memberi tahu "ada masalah", tapi tidak memberi tahu "kerjakan ini dulu, karena…".

**Inkonsistensi yang ditemukan di `note.md` (scope A1):**
- **Definisi "aktif" berbeda.** R2 menghitung open/inprogress/reopened (tanpa *ready for qc*), sementara R5 menyertakan *ready for qc*. Task yang sedang menunggu QC jadi "hilang" dari backlog di R2. (Model status terpadu menjadi domain A3.)
- **Jendela waktu acak**: 14 hari (R6), 7 hari (R9, R10, R12), 3 hari (R11), padahal Ticket/Pengembangan memakai *stale > 7 hari*. Ambang "mandek" berbeda antar menu tanpa alasan.
- **Deskripsi R3 keliru.** Tertulis "bisa membuat task tapi dengan kind bugs", padahal semestinya hitungan bug terbuka (diasumsikan begitu, lihat §8).
- **Scope ambigu**: tidak jelas apakah R2/R3/R9 menghitung semua proyek di workspace, proyek yang saya ikuti, atau hanya task saya.
- **R8 "nanti akan dijadikan top 5"** tidak menyebut kriteria urutan (paling telat? prioritas?).

### 2.2 Menu Tim

| # | Fitur lama | Nilai | Masalah |
|---|---|---|---|
| T1 | Filter proyek | Tinggi (konteks) | — |
| T2 | Online sekarang (+role, jumlah) | Rendah | Tidak bisa ditindaklanjuti ("online" ≠ "bisa diganggu"), terasa seperti pengawasan, dan tidak relevan untuk tim lintas zona waktu atau yang bekerja async |
| T3 | Beban tim = jumlah task terbuka per orang | Sedang | **Menyesatkan**: 10 task kecil vs 2 epic dihitung sama; mengabaikan estimasi jam, prioritas, tenggat, cuti, dan pekerjaan lintas proyek |
| T4 | Aktivitas tim (log 7 hari) | Rendah–sedang | Log mentah yang panjang, beririsan dengan R13; tidak ada ringkasan "apa yang penting" |
| T5 | Direktori teman (nama, email, role, jumlah task, proyek bersama + role) | Tinggi | Email tampil ke semua orang yang berbagi proyek (pertimbangan privasi); tidak ada keahlian/ketersediaan |

### 2.3 Menu Events

| # | Fitur lama | Nilai | Masalah |
|---|---|---|---|
| E1 | Filter tag | Sedang | — |
| E2 | Group by tag | Rendah | Bisa digabung dengan filter dalam satu kontrol "Tampilan" |
| E3 | Upcoming saja | Sedang | Sebaiknya jadi default, dengan tab "Lampau" sebagai arsip notulensi |
| E4 | Buat event | Tinggi | Tidak ada recurring, sinkron kalender, maupun pilih peserta dari tim |
| E5 | List view | Tinggi | — |
| E6 | Grid view | Rendah | Event berorientasi waktu, sehingga grid tidak memberi nilai di atas list/kalender |
| E7 | Calendar view | Tinggi | Perlu tampilan minggu |
| E8 | Card event (judul, status, tag, waktu, lokasi, peserta, pembuat) | Sedang | Tidak menunjukkan status notulensi/hasil rapat |
| E9 | Edit & hapus event | Tinggi | Permission tidak jelas ("semua anggota bisa menambah": apakah juga bisa menghapus milik orang lain?) |
| E10 | Status event (mis. "selesai") | Rendah | Kemungkinan diisi manual; seharusnya diturunkan dari waktu (+ "dibatalkan" manual) |
| E11 | Detail: tanggal/jam, lokasi, project terhubung, pembuat, dibuat/diperbarui | Tinggi | Project terhubung adalah kunci untuk merutekan action item ke proyek yang benar |
| E12 | Catatan/notulensi (teks bebas, rencana foto/voice → draf AI) | Tinggi | Teks bebas tidak terstruktur; contoh "daftar peserta" menduplikasi field peserta |
| E13 | Hasil Rapat yang Dikonfirmasi (pilah jadi tugas/keputusan/informasi/pertanyaan) | **Sangat tinggi** | Alurnya belum terdefinisi: siapa yang mengonfirmasi, apa yang terjadi setelahnya (jadi task?), dan bagaimana pertanyaan/keputusan ditindaklanjuti |

---

## 3. Tabel fitur lama → label

| # | Fitur lama | Label | Alasan | Dampak ke user | Prioritas | Effort |
|---|---|---|---|---|---|---|
| R1 | Proyek aktif | **[MERGE]** → "Proyek saya" (R14) | Angka statis; cukup jadi jumlah di header panel proyek | Satu widget hilang tanpa kehilangan informasi | P1 | S |
| R2 | Task terbuka | **[MERGE]** → KPI strip *tampilan PM* | Vanity untuk Member; bagi PM baru bernilai jika ada tren & ambang | Member: lebih bersih. PM: angka plus konteks Δ minggu lalu | P1 | S |
| R3 | Bug terbuka | **[MERGE]** → KPI strip PM ("Bug terbuka: x critical, Δ") | Lebih actionable jika dipecah per prioritas dan tren | PM melihat sinyal kualitas, bukan sekadar angka | P1 | S |
| R4 | Ditugaskan saya | **[MERGE]** → header "Fokus Saya" | Hitungan sudah tersirat di daftar fokus | Satu tempat untuk semua pekerjaan saya | P0 | S |
| R5 | Status task saya | **[MERGE]** → chip filter di "Fokus Saya" (Dikerjakan / Menunggu QC / Dibuka ulang) | Chart breakdown tidak menuntun tindakan; chip yang bisa diklik lebih berguna | Bisa langsung menyaring tanpa pindah menu | P0 | S |
| R6 | Ditutup 14 hari | **[REMOVE]** dari dashboard → pindah ke Briefing mingguan & Retro (A2) | KPI vanity tanpa target/pembanding; mendorong "tutup task kecil" | Mengurangi kebisingan; capaian tetap diceritakan dalam konteks | P1 | S |
| R7 | Jadwal task | **[MERGE]** → "Fokus Saya" (mode tampilan *Per tenggat*) | Induk dari R8 & R10 | Pengelompokan per tenggat tetap ada sebagai opsi | P0 | M |
| R8 | Perlu perhatian kamu | **[MERGE]** → "Fokus Saya" (chip *Telat*) | Identik dengan bucket "telat" | Task telat tidak muncul dobel | P0 | S |
| R9 | Snapshot minggu ini | **[REMOVE]** → diganti Briefing AI (harian/mingguan) | Angka duplikat dengan jendela berbeda; tanpa narasi | Informasi "apa yang terjadi" jadi cerita yang bisa dibaca dalam 20 detik | P0 | — (lihat N1) |
| R10 | Jatuh tempo 7 hari | **[MERGE]** → "Fokus Saya" (chip *Segera jatuh tempo*) + early warning di Briefing | Identik dengan bucket hari ini–minggu ini | Peringatan dini tetap ada, tanpa widget sendiri | P0 | S |
| R11 | Ghost reminder | **[MERGE]** → "Fokus Saya" (chip *Mandek*), dengan aksi 1-klik: update status / tambah catatan / lepas assignment | Sinyal unik (staleness), tapi harus berada di daftar kerja yang sama. Ambang diseragamkan & dapat dikonfigurasi (default 3 hari kerja untuk inprogress) | Task mandek bisa ditangani langsung, bukan sekadar diingatkan | P0 | S |
| R12 | Events mendatang | **[MODIFY]** → "Agenda hari ini & besok" plus bahan persiapan (agenda AI, action item rapat lalu yang belum selesai) | Daftar event sudah ada di menu Events; nilai tambah dashboard ada di *persiapan* | User masuk rapat dalam keadaan siap | P1 | M |
| R13 | Aktivitas terbaru | **[MODIFY]** → "Inbox ringkas": mention & assignment di atas, perubahan status dikelompokkan, mark-as-read, dan digest | Notifikasi mentah yang tidak diprioritaskan menimbulkan kebisingan (selaras dengan A4: notifikasi pintar) | Yang butuh balasan tidak tenggelam | P1 | M |
| R14 | Proyek kamu | **[MODIFY]** → "Proyek saya": health chip (dari A2), progres, dan status 1 kalimat dari AI | Daftar nama proyek saja tidak informatif | Bisa langsung melihat proyek mana yang bermasalah | P1 | S |
| T1 | Filter proyek | **[KEEP]** | Konteks dasar | — | — | — |
| T2 | Online sekarang | **[MODIFY]** → *Status ketersediaan* (Fokus / Rapat / Cuti / Off + jam kerja & zona waktu, diturunkan dari kalender) + presence kontekstual (avatar di task/notulen yang sedang dibuka). Daftar online real-time dihapus dari halaman utama | "Online" tidak bisa ditindaklanjuti dan terasa seperti pengawasan; yang dibutuhkan adalah "bisa saya hubungi sekarang?" | Menghormati waktu fokus; mengurangi gangguan | P1 | M |
| T3 | Beban tim | **[MODIFY]** → *Kapasitas tim*: jam estimasi vs kapasitas per minggu, tenggat dalam jendela, WIP, jumlah proyek paralel, cuti; heatmap 4 minggu | Hitungan task menyesatkan | PM bisa menyeimbangkan beban berdasarkan data yang lebih jujur | P1 | M |
| T4 | Aktivitas tim | **[MERGE]** → feed aktivitas tunggal (dengan R13, scope "tim") + *Digest tim mingguan AI* | Duplikat log; log mentah jarang dibaca | Satu feed dan satu ringkasan | P1 | S |
| T5 | Direktori teman | **[KEEP]** + minor: tambah keahlian/tag skill & ketersediaan; email mengikuti pengaturan privasi | Fitur referensi yang berguna | Bisa mencari "siapa yang paham X" | P2 | S |
| E1 | Filter tag | **[KEEP]** (gabung dengan E2 dalam satu kontrol) | — | — | — | S |
| E2 | Group by tag | **[MERGE]** → opsi di kontrol "Tampilan" | Kontrol terpisah menambah kebisingan toolbar | Toolbar lebih ringkas | P2 | S |
| E3 | Upcoming saja | **[MODIFY]** → tab default *Mendatang* + tab *Lampau* (arsip rapat & notulensi) | Toggle jadi struktur navigasi yang lebih jelas | Notulensi lama mudah dicari | P1 | S |
| E4 | Buat event | **[MODIFY]** → + recurring, peserta dari anggota proyek, link meeting, sinkron kalender (N18), quick-create NL (N19) | Rapat rutin (standup/sprint review) belum bisa dibuat berulang | Input manual berkurang | P1 | M |
| E5 | List view | **[KEEP]** | — | — | — | — |
| E6 | Grid view | **[REMOVE]** | Tidak memberi nilai di atas list/kalender untuk data berbasis waktu; menambah biaya pemeliharaan | Pilihan tampilan lebih sederhana | P2 | S |
| E7 | Calendar view | **[KEEP]** + tampilan minggu | — | — | P2 | S |
| E8 | Card event | **[MODIFY]** → + badge status notulensi (Belum ada / Draf AI / Menunggu review / Dikonfirmasi) & jumlah action item terbuka | Membuat utang tindak lanjut rapat terlihat | Tidak ada rapat yang "lupa dinotulensi" | P0 | S |
| E9 | Edit & hapus event | **[KEEP]** + aturan permission (pembuat/PM boleh edit-hapus; anggota boleh tambah catatan) + soft delete | Saat ini ambigu | Mencegah penghapusan tak sengaja | P1 | S |
| E10 | Status event manual | **[MODIFY]** → diturunkan otomatis (Akan datang / Berlangsung / Selesai) + *Dibatalkan* manual | Mengurangi input manual & data basi | — | P1 | S |
| E11 | Metadata detail (waktu, lokasi, project, pembuat, timestamps) | **[KEEP]**; project terhubung **wajib** jika ingin membuat task dari hasil rapat | Routing action item ke proyek | — | P0 | S |
| E12 | Catatan/notulensi teks bebas | **[MODIFY]** → editor notulensi terstruktur (Agenda / Diskusi / Hasil) + Capture AI multimodal (N11) | Teks bebas sulit diolah; peserta sudah punya field sendiri | Notulensi tercipta dalam hitungan menit | P0 | M |
| E13 | Hasil Rapat yang Dikonfirmasi | **[MODIFY]** → *Review Hasil Rapat* (N12–N15): kategori Action item / Keputusan / Pertanyaan terbuka / Informasi (+ Risiko opsional), dengan kutipan bukti & confidence, lalu konfirmasi → Task / Decision Log / Tracker pertanyaan | Inti nilai "rapat → eksekusi"; alurnya perlu didefinisikan | Rapat benar-benar berujung pada pekerjaan yang terlacak | P0 | M |

**Rekap**: dari 14 widget Ringkasan, **9 MERGE (2 di antaranya ke KPI strip PM), 2 REMOVE, 3 MODIFY**, dilebur menjadi **4 zona**. Menu Tim: 2 KEEP, 2 MODIFY, 1 MERGE. Menu Events: 5 KEEP, 6 MODIFY, 1 MERGE, 1 REMOVE.

---

## 4. Rancangan versi 2026

### 4.1 Dashboard "Beranda" AI-first (pengganti Menu Ringkasan)

Prinsipnya: **satu pekerjaan muncul satu kali, setiap angka punya tindakan, dan AI hanya menarasikan data yang sudah dihitung secara deterministik.**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔎 Tanyakan ke data proyek…  ("bug critical yang telat di Proyek Atlas")  ⌘K │  ← Zona C
├──────────────────────────────────────────────────────────────────────────────┤
│ ☀ Briefing pagi · Senin 5 Okt                                [Harian|Minggu] │  ← Zona A
│ • 2 task kamu telat; "Fix login SSO" memblokir 3 task tim QA → kerjakan dulu │
│ • Sprint Review 14:00: 4 action item rapat lalu, 1 masih terbuka (milikmu)   │
│ • Proyek Atlas berisiko: 6 task jatuh tempo Jumat, kapasitas tim 120%        │
│ • 3 mention butuh balasan (Rina, Dodi)                     [Tandai dibaca ✓] │
├───────────────────────────────────────────────┬──────────────────────────────┤
│ 🎯 Fokus Saya Hari Ini (7)    [Prioritas|Per tenggat]│ 📅 Agenda hari ini & besok   │  ← Zona D
│ [Semua][Dikerjakan][Menunggu QC][Dibuka ulang]│ 10:00 Standup        ▸ siap  │
│ 1 Fix login SSO      Telat 1h · Memblokir 3 · Mandek 4h │ 14:00 Sprint Review ▸ agenda│
│   [Update status] [Tambah catatan] [Minta bantuan]│ Besok 09:00 Klien X  ▸ prep  │
│ 2 API rate limit     Jatuh tempo besok · High │──────────────────────────────│
│ 3 Review PR #212     Di-mention · Menunggu kamu│ 📁 Proyek saya (4)            │
│ …                                             │ Atlas   ● Berisiko  62%       │
│ ──────────────                                │ Borneo  ● Sehat     80%       │
│ 📥 Inbox ringkas: 3 mention · 5 update status │ "Atlas: 2 milestone mundur…"  │
└───────────────────────────────────────────────┴──────────────────────────────┘
 Tampilan PM menambah satu baris KPI strip (maks. 4): Task aktif (Δ) · Bug critical (Δ)
 · Tenggat terlewat minggu ini · Kapasitas tim %. Setiap angka bisa diklik untuk drill-down.
```

**Zona A: Briefing Harian AI [ADD-AI].** 3–5 poin, berisi: apa yang berubah sejak terakhir login, apa yang berisiko hari ini, rapat beserta persiapannya, dan siapa yang menunggu saya. Tersedia mode *Mingguan* (menggantikan R6/R9: capaian, slip, keputusan penting). Bisa juga dikirim ke email/chat pada jam yang dipilih user. Kalau tidak ada yang penting, briefing **harus pendek** ("Tidak ada yang mendesak hari ini"). Preseden: Linear Pulse mengirim ringkasan harian/mingguan ke Inbox sekitar pukul 06.00 waktu lokal.

**Zona B: Fokus Saya Hari Ini [ADD] + alasan AI [ADD-AI].** Satu daftar terurut untuk semua task aktif saya, dengan *chip alasan* dari mesin sinyal deterministik:

| Sinyal (reason code) | Aturan default | Menggantikan |
|---|---|---|
| `OVERDUE` Telat | due < hari ini & belum closed | R8, bucket telat R7 |
| `DUE_SOON` Segera jatuh tempo | due ≤ +2 hari kerja (konfigurable) | R10, R7 |
| `STALE` Mandek | inprogress & tidak disentuh ≥ 3 hari kerja | R11 |
| `BLOCKING` Memblokir | task ini menjadi deps bagi task aktif orang lain | baru |
| `WAITING_ME` Menunggu saya | mention belum dibalas / review/QC diminta | sebagian R13 |
| `AT_RISK` Berisiko (P1) | prediksi slip dari A2 (estimasi sisa > waktu sisa) | baru |

Skor urutan (transparan, bisa dijelaskan): `prioritas × urgensi tenggat + bobot memblokir + bobot mandek + bobot menunggu-saya`. LLM **tidak** menentukan urutan; LLM hanya menulis satu kalimat alasan ("kerjakan dulu karena memblokir 3 task QA"). Tampilan alternatif *Per tenggat* mempertahankan pengelompokan R7 bagi user yang terbiasa.

**Zona C: "Tanyakan ke data proyek" [ADD-AI].** NL diterjemahkan menjadi **filter terstruktur** (bukan SQL bebas), lalu dieksekusi dengan **permission user**. Hasil ditampilkan sebagai daftar item bersama *chip filter hasil tafsiran* yang bisa diedit ("Proyek: Atlas · Kind: bug · Prioritas: critical · Telat"). Untuk pertanyaan agregat ("siapa yang paling sibuk minggu depan?"), jawaban menyebut angka plus tautan ke item sumber. Pertanyaan atas notulensi/keputusan ("apa keputusan soal pricing bulan lalu?") memakai pencarian semantik atas Decision Log dan notulensi yang sudah dikonfirmasi. *Engine yang sama sebaiknya dipakai command palette/copilot lintas aplikasi milik A4. Jangan bangun dua.*

**Zona D: Agenda & Proyek saya.** Agenda dengan tautan "siapkan" (agenda AI, N16), lalu proyek dengan health chip (definisi health dari A2) dan status 1 kalimat dari AI.

**Role-based [ADD]:** Member melihat A–D. PM/Owner mendapat tambahan KPI strip (maks. 4, dengan Δ dan ambang) serta tautan ke halaman Kapasitas Tim. Widget tidak bisa ditambah bebas di MVP (mencegah dashboard kembali gemuk); kustomisasi ditunda ke P2.

### 4.2 Menu Tim → "Tim & Kapasitas"

1. **Ketersediaan, bukan online [MODIFY T2].** Status: *Fokus / Rapat / Cuti / Off*, jam kerja, dan zona waktu. Rapat diambil otomatis dari kalender (Events + sinkron kalender), dan cuti diisi manual atau dari kalender. Indikator "aktif sekarang" hanya muncul *kontekstual* (avatar di task/notulensi yang sedang dibuka bersama) dan bisa dimatikan user.
2. **Kapasitas tertimbang [MODIFY T3].** Per orang per minggu: Σ estimasi jam task aktif yang jatuh tempo di minggu itu ÷ kapasitas (default 30 jam efektif/minggu, bisa diatur per orang, dikurangi cuti). Kolom: beban %, telat, WIP (inprogress), jumlah proyek paralel. Heatmap 4 minggu ke depan. Task tanpa estimasi dihitung dengan nilai default + ditandai "estimasi tidak ada" supaya data buruk terlihat, bukan disembunyikan.
3. **Peringatan dini overload/burnout [ADD-AI].** Sinyal **hanya dari data kerja**: beban > 110% selama ≥ 2 minggu berturut-turut, jumlah task telat naik, proyek paralel ≥ 3, dan (opsional, opt-in organisasi) aktivitas di luar jam kerja. Output berupa *peringatan ke PM + notifikasi pribadi ke yang bersangkutan*, dengan bahasa non-punitif ("beban Rina diperkirakan 140% minggu depan"). **Tidak ada leaderboard, skor produktivitas individu, atau label "malas".**
4. **Saran rebalancing [ADD-AI].** "Pindahkan 2 task dari Rina (140%) ke Dodi (60%, punya tag skill *backend*)". Saran ini perlu dikonfirmasi PM, dan assignee baru menerima notifikasi.
5. **Feed & Digest tim [MERGE T4].** Feed aktivitas tunggal (scope: saya / tim / proyek) ditambah *Digest mingguan AI*: yang selesai, yang mundur, keputusan rapat, dan risiko.
6. **Direktori [KEEP T5]** ditambah tag keahlian & ketersediaan; visibilitas email mengikuti pengaturan workspace.

### 4.3 Menu Events → "Rapat & Events" dengan siklus hasil rapat

**Alur utama (human-in-the-loop):**

```
[Sebelum]  Event dibuat/disinkron dari kalender ─► Agenda AI (N16): item terbuka proyek,
           action item rapat lalu yang belum selesai, pertanyaan terbuka, keputusan tertunda
              │
[Saat]     Capture (N11) — pilih salah satu / kombinasi:
           🎙 Rekam suara in-app (mobile/desktop) · ⬆ Upload rekaman (audio/video)
           📷 Foto whiteboard/catatan tulisan tangan · 📋 Tempel transkrip Meet/Zoom/Teams
           ✍ Ketik manual          ⚠ Banner consent wajib sebelum rekam (N20)
              │
[Proses]   STT + diarization (pembicara) / OCR ─► Draf notulensi terstruktur
           (Ringkasan · Agenda · Poin diskusi) ─► Ekstraksi item (N12):
           ┌ Action item  : apa · usulan PIC · usulan tenggat · proyek
           ├ Keputusan    : apa yang diputuskan · oleh siapa
           ├ Pertanyaan   : pertanyaan terbuka · usulan owner
           ├ Informasi    : fakta/pengumuman penting
           └ Risiko (opsional)
           Setiap item disertai: KUTIPAN BUKTI (timestamp audio / potongan teks / area foto)
           + confidence (Tinggi/Sedang/Rendah) + flag "PIC/tenggat tidak disebut"
              │
[Review]   Layar "Hasil Rapat — Menunggu Review" (pemilik: notulis/pembuat event, bisa diwakilkan)
           per item: ✓ Konfirmasi · ✎ Edit · ⇄ Ubah kategori · ✗ Tolak · ⧉ Gabung dengan task yang ada
           (AI menandai kemungkinan duplikat dengan task terbuka di proyek)
           Bulk: "Konfirmasi semua yang confidence Tinggi" → tetap 1 klik eksplisit manusia
              │
[Hasil]    Action item ─► Task (kind=task, sumber=rapat, tautan balik ke kutipan)
           Keputusan   ─► Decision Log proyek (N14)
           Pertanyaan  ─► Tracker pertanyaan terbuka (N15) → muncul di agenda rapat berikutnya
           Informasi   ─► tetap di notulensi
              │
[Sesudah]  Recap otomatis ke peserta (N17): ringkasan + daftar task baru + keputusan
           Card event: badge "Dikonfirmasi · 5 task (2 selesai)" — progres tindak lanjut terlihat
```

**State item hasil rapat:**

```
draft ──edit──► draft
draft ──konfirmasi──► confirmed ──materialize──► linked (task/decision/question id)
draft ──tolak──► rejected (disimpan untuk audit & evaluasi kualitas AI)
confirmed ──batalkan (sebelum materialize)──► draft
```

**Sketsa data minimal** (detail model work item mengikuti A3):
- `MeetingCapture { event_id, source: voice|upload|photo|transcript|manual, asset_ref, transcript, language, consent_log[], retention_until, created_by }`
- `MeetingItem { capture_id, type: action|decision|question|info|risk, text, suggested_assignee_id?, suggested_due?, project_id, evidence{kind: timestamp|quote|image_region, ref}, confidence, status: draft|confirmed|rejected|linked, confirmed_by, confirmed_at, linked_ref? }`
- `Decision { project_id, text, decided_by[], source_item_id, decided_at, superseded_by? }`

**Aturan penting ekstraksi:**
- PIC dan tenggat **hanya diisi jika disebut** di sumber; sisanya dikosongkan dengan flag. Lebih baik kosong daripada dikarang.
- PIC yang diusulkan harus merupakan anggota proyek terhubung. Nama yang tidak cocok ditampilkan sebagai teks + "pilih orang".
- Tanggal relatif ("Jumat depan") dikonversi berdasarkan tanggal rapat dan ditampilkan bersama kutipan aslinya.
- Bahasa: mendukung Bahasa Indonesia + campuran istilah Inggris (code-switching); output notulensi mengikuti bahasa rapat.

---

## 5. Fitur baru

| ID | Fitur | Label | Alasan | Dampak ke user | Prioritas | Effort |
|---|---|---|---|---|---|---|
| N1 | Briefing Harian/Mingguan AI (in-app + opsional email/chat) | [ADD-AI] | Mengganti R6/R9 dan widget angka dengan narasi yang bisa ditindaklanjuti | Paham kondisi dalam < 30 detik | **P0** | M |
| N2 | Fokus Saya Hari Ini: mesin sinyal + skor urutan transparan | [ADD] | Menggabungkan R4/R5/R7/R8/R10/R11; satu task muncul satu kali | Tahu harus mengerjakan apa duluan | **P0** | M |
| N2b | Kalimat alasan AI per item Fokus | [ADD-AI] | Menjelaskan *mengapa* tanpa menyerahkan urutan ke LLM | Kepercayaan & pemahaman | P1 | S |
| N3 | Tanyakan ke data proyek (NL → filter terstruktur, sadar permission, filter hasil tafsiran bisa diedit) | [ADD-AI] | Menggantikan banyak widget/filter khusus; ekspektasi 2026 | Jawaban ad-hoc tanpa membuat laporan | P1 | L |
| N4 | Dashboard berbasis peran (Member vs PM) + KPI strip ≤ 4 dengan Δ & ambang | [ADD] | KPI hanya bernilai bagi PM dan jika ada konteks | Member lebih fokus, PM lebih informatif | P1 | S |
| N5 | Inbox ringkas + digest notifikasi (mention prioritas, kelompokkan perubahan status) | [ADD] | R13/T4 mentah dan bising (selaras A4) | Kurang noise | P1 | M |
| N6 | Kapasitas tim tertimbang + heatmap 4 minggu | [ADD] | T3 menyesatkan | Keputusan alokasi berbasis data | P1 | M |
| N7 | Peringatan dini overload/burnout (agregat, non-punitif) | [ADD-AI] | Mencegah slip & kelelahan sebelum terjadi | Tim lebih sehat; PM proaktif | P2 | M |
| N8 | Saran rebalancing beban (konfirmasi PM) | [ADD-AI] | Menindaklanjuti N6/N7 | Redistribusi dalam 1 klik | P2 | M |
| N9 | Status ketersediaan (Fokus/Rapat/Cuti/Off, jam kerja, zona waktu) | [ADD] | Pengganti T2 yang relevan | Tahu kapan bisa menghubungi rekan | P1 | M |
| N10 | Digest tim mingguan AI | [ADD-AI] | Mengganti log mentah T4; berbagi engine dengan N1 | Ringkasan tim tanpa membaca log | P1 | S |
| N11a | Capture suara: rekam in-app & upload rekaman → transkrip (diarization) → draf notulensi | [ADD-AI] | Rencana di note.md (voice) + rekaman meeting | Notulensi tanpa mengetik | **P0** | L |
| N11b | Capture foto whiteboard/tulisan tangan → OCR → draf | [ADD-AI] | Rencana di note.md (foto); rapat tatap muka | Papan tulis tidak hilang | **P0** | M |
| N11c | Tempel/impor transkrip dari Meet/Zoom/Teams | [ADD] | Jalur termurah & paling akurat jika transkrip sudah ada | Tanpa perlu rekam ulang | P1 | S |
| N11d | Bot yang ikut rapat online & merekam otomatis | [ADD-AI] | Kenyamanan, tapi isu consent & integrasi berat | Zero-effort capture | P2 | L |
| N12 | Ekstraksi terstruktur (action/keputusan/pertanyaan/info/risiko) + kutipan bukti + confidence | [ADD-AI] | Inti "Hasil Rapat"; bukti untuk melawan halusinasi | Review cepat & terpercaya | **P0** | M |
| N13 | Review & konfirmasi → task (bulk confirm eksplisit, tautan balik ke sumber) | [ADD] | Human-in-the-loop wajib | Rapat → task terlacak | **P0** | M |
| N13b | Deteksi duplikat dengan task terbuka saat review | [ADD-AI] | Mencegah task ganda dari rapat berulang | Backlog bersih | P1 | M |
| N14 | Decision Log per proyek (bisa dicari, ada status "digantikan oleh") | [ADD] | Keputusan saat ini hilang di teks bebas | "Kenapa kita memutuskan X?" terjawab | P1 | S |
| N15 | Tracker pertanyaan terbuka (owner, dibawa ke agenda berikutnya) | [ADD] | Pertanyaan rapat sering menggantung | Tidak ada pertanyaan yang hilang | P1 | S |
| N16 | Agenda pra-rapat otomatis | [ADD-AI] | Rapat lebih singkat & terarah | Persiapan 0 menit | P1 | M |
| N17 | Recap otomatis ke peserta setelah konfirmasi | [ADD-AI] | Menutup loop komunikasi | Semua orang tahu hasilnya | P1 | S |
| N18 | Sinkron kalender 2 arah (Google/Outlook) + event berulang | [ADD] | Events terisolasi dari kalender nyata | Tidak ada input ganda | P1 | L |
| N19 | Buat event dari bahasa natural ("sprint review tiap Kamis 14.00 dengan tim Atlas") | [ADD-AI] | Mengurangi isian form | Cepat | P2 | S |
| N20 | Consent, retensi & akses rekaman (banner consent, log persetujuan, auto-hapus audio mentah, akses per peran) | [ADD] | Prasyarat legal & kepercayaan untuk N11 | Aman secara privasi | **P0** | M |
| N21 | Jejak audit item AI (sumber, versi model, siapa yang mengonfirmasi/mengubah) | [ADD] | Akuntabilitas; selaras governance A4 | Bisa ditelusuri | **P0** | S |

**Urutan rilis yang disarankan untuk scope A1:**
- **MVP (P0):** N2 + N1 (Beranda baru), N11a/N11b + N12 + N13 + N20 + N21 (siklus hasil rapat dengan consent), E8 badge, dan perbaikan R-merge.
- **v1 (P1):** N3 NL query (bersama A4), N4 role-based, N5/N10 digest, N6/N9 kapasitas & ketersediaan, N13b, N14–N17, N18 kalender.
- **v2 (P2):** N7/N8 burnout & rebalancing, N11d bot rapat, N19, kustomisasi dashboard.

---

## 6. Risiko & mitigasi

### 6.1 Privasi rekaman rapat
| Risiko | Mitigasi |
|---|---|
| Merekam tanpa persetujuan peserta (termasuk tamu/klien eksternal) | Banner consent wajib sebelum rekam; indikator "sedang merekam" bagi semua peserta; consent log per event; opsi "jangan rekam rapat dengan pihak eksternal" sebagai default kebijakan workspace |
| Kepatuhan UU PDP (UU No. 27 Tahun 2022) atas suara & transkrip sebagai data pribadi | Dasar pemrosesan & tujuan jelas; retensi audio mentah terbatas (usulan default: hapus 30 hari setelah notulensi dikonfirmasi, transkrip mengikuti kebijakan workspace); hak hapus; DPA dengan penyedia STT/LLM (perlu review legal) |
| Data rapat sensitif (HR, gaji, klien) bocor ke anggota lain | Akses notulensi mengikuti peserta + anggota proyek terhubung; flag "rahasia" per event yang menonaktifkan AI dan pencarian global; NL query/semantic search wajib menghormati permission |
| Data dikirim ke penyedia AI pihak ketiga | Pilih penyedia dengan zero-retention/no-training; opsi region; tampilkan ke admin penyedia mana yang dipakai (selaras A4 governance) |
| Foto whiteboard menangkap informasi di luar konteks rapat | Pratinjau & crop sebelum diproses; foto asli mengikuti retensi yang sama |

### 6.2 Halusinasi & kesalahan AI
| Risiko | Mitigasi |
|---|---|
| Action item/keputusan yang tidak pernah diucapkan | Setiap item **wajib** punya kutipan bukti yang bisa diklik; item tanpa bukti tidak ditampilkan; evaluasi berkala dari rasio item yang ditolak (N21) |
| PIC/tenggat dikarang | Kosongkan jika tidak disebut; PIC harus anggota proyek; tampilkan kutipan untuk tanggal relatif |
| Salah pembicara (diarization) | Label pembicara bisa dikoreksi; koreksi diterapkan ke seluruh transkrip |
| Akurasi STT rendah untuk Bahasa Indonesia campur Inggris, logat, dan ruang rapat berisik | Uji akurasi (WER) dengan sampel rapat internal sebelum GA; tampilkan confidence; fallback ke tempel transkrip/ketik |
| Briefing/NL query salah angka | Angka selalu berasal dari query deterministik; LLM hanya merangkai kalimat; setiap poin menautkan item sumber; NL query menampilkan filter hasil tafsiran yang bisa diedit |
| Urutan Fokus "aneh" dan tidak dipercaya | Skor transparan berbasis aturan; LLM tidak mengurutkan; user bisa pin/sembunyikan item |

### 6.3 Human-in-the-loop & dampak organisasi
| Risiko | Mitigasi |
|---|---|
| **Kelelahan konfirmasi** (review dilewati / "confirm all" tanpa membaca) | Bulk confirm hanya untuk confidence Tinggi; item Rendah wajib dibuka; batas waktu review + pengingat ke notulis; badge "Menunggu review" di card event |
| Task otomatis membanjiri backlog | Tidak ada auto-create; deteksi duplikat (N13b); task dari rapat ditandai sumbernya |
| Fitur beban/burnout dipakai sebagai alat penilaian kinerja/pengawasan | Tidak ada leaderboard/skor individu; sinyal non-punitif; data aktivitas di luar jam kerja hanya opt-in organisasi; individu melihat datanya sendiri lebih dulu; kebijakan penggunaan tertulis |
| Presence/ketersediaan dianggap pengawasan | Hapus daftar online real-time; status dikendalikan user; presence kontekstual bisa dimatikan |
| Briefing menjadi spam baru | Pendek, bisa diatur (harian/mingguan/mati), dan "tidak ada yang mendesak" adalah output yang valid |
| Biaya token membengkak (rekaman panjang, briefing semua user) | Briefing dihitung batch harian dan di-cache; STT hanya atas permintaan; kuota per workspace (selaras A4) |

---

## 7. Ketergantungan dengan analis lain
- **A2 (Proyek):** definisi *health/at risk* untuk chip proyek dan sinyal `AT_RISK` di Fokus; Retro menjadi tempat pindahan R6.
- **A3 (Work items):** model status terpadu (konsistensi *ready for qc* yang memengaruhi R2/R5); kind & field task yang dibuat dari hasil rapat; ambang "stale" diseragamkan (R11 3 hari vs Ticket 7 hari).
- **A4 (AI layer):** N3 NL query = engine copilot/command palette yang sama; N5 digest = notifikasi pintar; N20/N21 mengikuti governance (audit log, permission, biaya token, penyedia AI).

---

## 8. Asumsi
1. "Bug terbuka" (R3) dimaksudkan sebagai **hitungan task kind=bug yang aktif**, bukan fitur membuat bug (deskripsi di note.md tampaknya keliru tulis).
2. Widget R2, R3, R9 menghitung **proyek yang diikuti user**, bukan seluruh workspace (tidak disebut di note.md).
3. Status event "selesai" (E10) saat ini diisi manual.
4. Pengguna utama adalah tim produk/engineering kecil–menengah (5–50 orang) di Indonesia; bahasa rapat dominan Bahasa Indonesia dengan istilah Inggris.
5. Estimasi jam (`estimate`) sudah ada di task, tapi sering kosong, sehingga kapasitas perlu nilai default dan penanda data kosong.
6. Belum ada integrasi kalender maupun video conference; Events berdiri sendiri.
7. Produk memakai penyedia LLM/STT pihak ketiga via API (bukan model on-premise), sehingga isu residensi data & DPA berlaku.
8. Effort S/M/L adalah perkiraan kasar untuk 2–3 engineer dan belum memperhitungkan desain/QA terpisah.
9. Belum ada sistem notifikasi email/chat; "Aktivitas terbaru" saat ini hanya in-app.
10. Tidak ada kebutuhan widget dashboard yang bisa dikustomisasi bebas di MVP.

## 9. Pertanyaan terbuka
1. **Siapa yang berwenang mengonfirmasi Hasil Rapat?** Hanya notulis/pembuat event, PM proyek terhubung, atau setiap peserta untuk item yang menyangkut dirinya?
2. Apakah **rekaman audio mentah boleh disimpan**, dan berapa lama? Apakah ada rapat dengan klien eksternal yang harus dikecualikan secara default?
3. Apakah organisasi **mengizinkan pengiriman audio/transkrip ke penyedia AI pihak ketiga**? Jika tidak, apakah ada anggaran untuk STT/LLM self-hosted?
4. Bagaimana sikap organisasi terhadap **metrik beban/burnout**: boleh dilihat PM per individu, atau hanya agregat tim?
5. Apakah dashboard harus tetap menampilkan **angka KPI untuk Member**, atau cukup untuk PM/Owner?
6. Berapa **kapasitas default per orang** (jam efektif/minggu), dan apakah cuti/hari libur nasional perlu ditarik dari sumber tertentu?
7. Integrasi kalender & konferensi mana yang prioritas: **Google Workspace, Microsoft 365, Zoom**?
8. Apakah **briefing harian dikirim ke luar aplikasi** (email/Slack/WhatsApp), atau hanya in-app?
9. Event tanpa proyek terhubung: apakah action item boleh menjadi task "tanpa proyek" (inbox pribadi), atau proyek wajib dipilih saat review?
10. Apakah **"Hasil Rapat yang Dikonfirmasi"** perlu ditandatangani/di-approve peserta lain (mis. untuk rapat dengan klien sebagai notulen resmi)?

---

## 10. Sumber riset (diakses 5 Okt 2026 via ego-browser)
- Linear Docs, *Pulse*: feed update project/initiative plus ringkasan harian/mingguan ke Inbox (~06.00 waktu lokal), tab "For me". https://linear.app/docs/pulse
- Notion, *AI Meeting Notes* (halaman produk & help center): transkripsi, ringkasan, identifikasi action item; aplikasi desktop menangkap audio sistem + mic, browser/mobile hanya mic; paket Business/Enterprise. https://www.notion.com/product/ai-meeting-notes · https://www.notion.com/help/ai-meeting-notes
- Atlassian, *Rovo*: "Teamwork Graph"; memperbarui strategi/spec/task berdasarkan rapat terbaru; Rovo dapat memperbarui Jira secara proaktif; admin mengontrol akses data AI. https://www.atlassian.com/software/rovo
- Asana, *AI & Agentic Work Management*: AI Teammates; *Asana Dash* sebagai "AI chief of staff" yang memunculkan langkah berikutnya dari meetings, Slack, email; AI Connectors & MCP; mitra AI tidak melatih model dengan data pelanggan. https://asana.com/product/ai
- ClickUp *AI Notetaker*: halaman produk gagal dimuat saat riset, sehingga klaim fitur ClickUp **(perlu verifikasi)**.
- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi: dirujuk dari pengetahuan umum; implikasi spesifik terhadap rekaman rapat **(perlu verifikasi legal)**.
