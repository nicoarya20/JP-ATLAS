# A2 — Analisis Menu Proyek & Detail Proyek (Modernisasi 2026)

> Analis Produk #2 · Run orkestrasi Orca · 5 Oktober 2026
> Scope: Menu Proyek (list, filter, view, buat proyek, "buat dari cerita", template) + Detail Proyek (Overview, Tasks tab, Team, Milestone, Phases, Extensions, Retro).
> Di luar scope (dirujuk saja): detail task/ticket, bulk CSV, trash → A3; dashboard/Tim/Events → A1; riset pasar lintas-fungsi → A4.
> Legenda label: **[KEEP]** pertahankan · **[MODIFY]** ubah · **[MERGE]** gabung · **[REMOVE]** hapus · **[ADD-AI]** fitur baru berbasis AI · **[ADD]** fitur baru non-AI.

---

## 1. Ringkasan eksekutif

1. **Konsep inti proyek masih kabur.** Ada dua sumbu yang dicampur: *status* (siklus hidup: Draft/Active/On Hold/Completed/Cancelled, diisi manual) dan *health* (Overdue/At Risk/Delayed) yang **tidak punya definisi atau rumus** di catatan. "Overdue" dan "Delayed" nyaris sinonim, dan "Overdue" sebenarnya fakta tanggal, bukan kesehatan. Usulan: health jadi **On track / At risk / Off track** yang dihitung otomatis, bisa dijelaskan faktornya, dan bisa di-override PM dengan alasan. "Overdue" cukup jadi badge.
2. **Milestone dan Phases tumpang tindih, dan keduanya tidak terhubung ke task.** Field task (A3) tidak punya `phase` maupun `milestone`, jadi progres fase/milestone tidak bisa dihitung; keduanya cuma daftar tanggal yang diisi manual. Usulan: **gabung jadi satu tab "Rencana"**. Fase = rentang waktu yang memuat task, milestone = titik cek (deliverable) di dalam/akhir fase. Task mendapat field `phaseId`.
3. **Overview & Tasks tab penuh kartu redundan** (Members vs Team, Tasks vs Task Progress vs Dashboard Tasks, Timeline vs Dates). Usulan: Overview jadi **satu layar "keadaan proyek"**: header health + forecast + ringkasan AI, progres kerja vs waktu, fase/milestone berikutnya, risiko & blocker, status update terakhir.
4. **Extensions & Retro sudah punya bahan bagus tapi berhenti di angka.** Retro menampilkan "commits" tanpa sumber integrasi yang jelas, dan alasan perpanjangan bersifat opsional, padahal itu data paling berharga untuk belajar. Usulan: alasan wajib + kategori, integrasi **GitHub/GitLab (webhook + MCP)**, dan **Retro AI** yang menghasilkan insight + action item, bukan sekadar hitungan.
5. **Lompatan 2026:** (a) **AI Project Planner** dari cerita/dokumen/PRD/voice yang menghasilkan draf fase, milestone, task, estimasi, dependensi & risiko untuk direview (bukan langsung dibuat); (b) **template yang terbentuk otomatis** dari proyek selesai + pembelajaran retro; (c) **health prediktif** (forecast tanggal selesai P50/P85); (d) **status update stakeholder otomatis** (draft AI → PM approve → kirim). Pola ini sudah umum di pasar: Linear "Write with Agent" untuk project update dan health On track/At risk/Off track [S1], Asana "Smart status" draft-with-AI [S3].
6. **Yang dibuang/disederhanakan:** toggle comfy/dense, tombol refresh manual, filter "recently updated" (salah definisi → jadi *Sort*), 3 kartu ringkasan (quick/status/health) dilebur jadi satu bar filter, kartu overview duplikat, dan template fase hardcoded (dilebur ke template proyek).

**Prioritas teratas (P0):** definisi status vs health + rumus health v1 · gabung Milestone+Phases dengan task ter-link · Overview baru · AI Project Planner v1 (draf → review → create) · status update AI dengan approval.

---

## 2. Bedah fitur (jawaban Tugas 1)

### 2.1 Status proyek vs Health — bagaimana health dihitung?

**Temuan di catatan lama**
- Status: Draft, Active, On Hold, Completed, Cancelled, dipilih manual di form create.
- Health: Overdue, At Risk, Delayed, dipakai di "card health" untuk menyortir. **Tidak ada rumus, sumber data, atau aturan siapa yang menetapkan.**
- Ambiguitas:
  - *Overdue* (deadline lewat, belum Completed) adalah **fakta**, bukan prediksi.
  - *Delayed* bisa berarti "deadline pernah diperpanjang" (ada data Extensions), atau "mulai terlambat", atau sama dengan Overdue. Tidak bisa dibedakan.
  - *At Risk* tanpa rumus = opini, atau bahkan tidak pernah terisi.
  - Health untuk proyek Draft/On Hold/Completed/Cancelled tidak bermakna, tapi tidak ada aturannya.

**Usulan model (dua sumbu yang tegas)**

| Sumbu | Nilai | Siapa yang menetapkan | Berlaku untuk |
|---|---|---|---|
| **Status** (lifecycle) | Draft → Active ⇄ On Hold → Completed / Cancelled | Manusia (PM/Lead) | Semua proyek |
| **Health** (kondisi) | On track · At risk · Off track (+ "Belum cukup data") | Sistem menghitung, PM boleh override dengan alasan wajib | Hanya status **Active** |
| **Badge fakta** | Overdue (deadline < hari ini), Extended ×N, Update basi | Sistem, deterministik | Sesuai kondisi |

**Rumus Health v1 (rule-based, deterministik, P0)**. Setiap faktor menghasilkan skor 0–100, lalu diambil yang terburuk (bukan rata-rata, agar satu masalah besar tidak tertutup):

| Faktor | Sumber data | At risk jika | Off track jika |
|---|---|---|---|
| Jadwal vs progres | % waktu berjalan (start→deadline) vs % kerja selesai (bobot `estimateHours`, fallback jumlah task) | selisih > 15 poin | selisih > 30 poin, atau Overdue |
| Forecast laju | sisa estimasi ÷ throughput rata-rata 14 hari | tanggal forecast > deadline ≤ 10% durasi | > 10% durasi |
| Task telat | task aktif lewat `dueAt` / task aktif | > 10% | > 25% |
| Blocker | task kritis/high yang terblok deps | ≥ 1 kritis terblok > 3 hari | ≥ 3 |
| Bug kritis terbuka | kind=bug, priority=critical, status≠closed | ≥ 1 | ≥ 3 |
| Milestone terdekat | progres task di fase/milestone vs tanggalnya | tanggal < 7 hari & progres < 70% | tanggal lewat & belum selesai |
| Kesegaran | tidak ada status update / aktivitas | > 7 hari tanpa update | > 14 hari |

Ambang di atas adalah **default yang bisa dikonfigurasi** per workspace (bukan hardcode), dan dicatat di sini sebagai asumsi awal yang perlu dikalibrasi dengan data historis.

**Health v2 (prediktif AI, P1).** Forecast tanggal selesai berbasis simulasi Monte Carlo atas throughput historis tim → P50 & P85. Aturannya: *On track* jika P85 ≤ deadline, *At risk* jika P50 ≤ deadline < P85, *Off track* jika P50 > deadline. LLM menambahkan **penjelasan sinyal lunak** dari komentar, alasan extension, scope creep (task baru > task selesai), dan PR yang lama tidak di-merge. Output selalu menampilkan "kenapa" (top 3 faktor) dan "apa yang bisa dilakukan" (mis. potong scope X, tambah reviewer di Y).

### 2.2 Milestone vs Phases — tumpang tindih?

| Aspek | Milestone (lama) | Phase (lama) |
|---|---|---|
| Field | judul, deskripsi, deadline | nama, mulai, selesai, deskripsi, tag |
| State | tidak ada (hanya ada/tidak) | belum mulai → dimulai (hijau) → selesai |
| View | list, grid | list, grid, stepper |
| Template | — | planning/development/testing/release (hardcoded) |
| Link ke task | **tidak ada** | **tidak ada** |
| Muncul di Overview | card milestones | tidak |

**Kesimpulan:** keduanya merepresentasikan "tahapan rencana" dengan tanggal. Bedanya cuma *rentang* (phase) vs *titik* (milestone). Karena tidak ada yang terhubung ke task, progres keduanya manual dan tidak bisa dipercaya untuk health. Tiga view (list/grid/stepper) untuk data yang biasanya 3–8 item juga berlebihan.

**Usulan [MERGE] → Tab "Rencana" (Plan):**
- **Fase** = rentang tanggal + tujuan + daftar task (`task.phaseId`). Progres dihitung otomatis dari task.
- **Milestone** = titik cek di dalam fase (default: akhir fase), dengan *kriteria selesai* (deliverable) dan opsional *gate* (perlu approval PM/klien). Status milestone: Pending / Tercapai / Meleset (otomatis dari tanggal + task).
- Satu tampilan utama: **timeline horizontal (roadmap mini)** dengan stepper di atasnya; list sebagai alternatif aksesibel. Grid dihapus.
- "Mulai fase / selesaikan fase" tetap ada sebagai aksi, tapi sistem **menyarankan** transisi (mis. semua task fase selesai → "tandai fase selesai?").
- Template fase hardcoded dilebur ke **template proyek** (lihat §2.6).

Pola serupa dipakai Linear: milestone berada di dalam project, issue di-assign ke milestone, dan progres milestone terlihat di timeline [S2].

### 2.3 Extensions — nilai & sumber data

- **Nilai:** jejak audit perubahan deadline proyek dan transparansi ke stakeholder. Ini sinyal penting untuk health ("Delayed") dan untuk retro.
- **Sumber data:** event `project.deadline_changed` (lama, baru, aktor, waktu, alasan).
- **Masalah:**
  1. *Reason* opsional, sehingga data paling berharga (kenapa meleset) sering kosong.
  2. Tidak jelas apakah edit tanggal selesai lewat **form edit proyek** juga tercatat. Kalau tidak, ini celah audit. Semua perubahan `endDate` wajib lewat jalur yang sama.
  3. Hanya mencatat perpanjangan; *percepatan* atau perubahan tanggal mulai tidak tercatat.
  4. Tidak ada analisis dampak: memperpanjang deadline proyek tapi milestone/fase/task tidak ikut bergeser.
  5. Tab sendiri untuk data yang jarang (biasanya 0–3 entri) itu boros navigasi.
- **Usulan:** [MODIFY] alasan wajib + kategori (scope bertambah · estimasi meleset · dependensi eksternal · sumber daya · prioritas berubah · lainnya). [ADD-AI] saat extend, AI menampilkan *impact preview*: fase/milestone/task yang ikut bergeser, sekaligus menawarkan "geser semua secara proporsional?". [MERGE] riwayat extension dipindah ke panel **"Riwayat jadwal"** di tab Rencana; jumlahnya tampil sebagai badge "Extended ×N" di header proyek.

### 2.4 Retro — nilai & sumber data

| Kartu | Sumber data | Catatan |
|---|---|---|
| Shipped | task `closedAt` dalam periode | OK |
| Slipped | **definisi ambigu**: task closed setelah `dueAt`? Atau task aktif lewat `dueAt`? | Perlu didefinisikan: *slipped = (closed & closedAt > dueAt) ∪ (aktif & dueAt < akhir periode)* |
| Still blocked | deps belum resolve | Snapshot saat ini, bukan periode. Perlu diberi label "saat ini" |
| New tasks | `createdAt` dalam periode | Dibandingkan dengan shipped = indikator scope creep |
| Extensions | event deadline_changed | OK |
| **Commits** | **tidak ada integrasi git di catatan** | Pertanyaan terbuka: dari mana datanya sekarang? Butuh link repo ↔ proyek dan commit ↔ task |
| Top contributors | jumlah task closed per orang | **Risiko budaya**: mendorong memecah task kecil-kecil & leaderboard. Ganti framing jadi "kontribusi" (closed + review + bantu unblock) atau tampilkan tanpa ranking |

**Masalah utama:** retro hanya menjawab *"berapa"*, tidak *"kenapa"* dan *"apa yang kita ubah"*. Periode 7/14/30/90 hari juga tidak selaras dengan ritme kerja; retro paling bermakna dilakukan **per fase/milestone/sprint**. Copy markdown/.md berguna, tapi tidak ada tempat menyimpan hasil retro atau melacak action item-nya.

**Integrasi git yang diusulkan:** GitHub/GitLab App/OAuth → webhook (push, PR, review, merge, deploy) untuk data real-time + **MCP server resmi** (GitHub MCP Server [S4], GitLab MCP server [S5]) agar agen AI di dalam aplikasi bisa membaca PR/issue/diff saat membuat retro, status update, atau health. Link commit/PR ke task via key task di nama branch/judul PR/pesan commit (mis. `PM-123`).

### 2.5 Overview, Tasks tab, Team — redundansi

- **Overview:** Members ≈ Team (dua kartu, satu data, plus ada tab Team). Tasks ≈ Task progress ≈ Dashboard di Tasks tab. Timeline (%) ≈ Dates (deadline); keduanya potongan dari satu informasi "jadwal". "Card milestones" hanya hitungan, tidak menjawab "milestone berikutnya apa & aman tidak?".
- **Tasks tab:** pada dasarnya **Menu Tasks yang difilter ke proyek ini** (filter, sort, view kanban/table/gantt, CSV, select, sama persis). Sebaiknya memakai komponen yang sama (A3), bukan implementasi kedua. Tombol "Dashboard" berisi kartu statistik yang lebih cocok di Overview/Insights. Catatan inkonsistensi untuk A3:
  - Status di form/ubah status: *open, inprogress, reopened, closed*. Di filter: *open, in progress, ready for qc, closed*. Di donut: *closed, open, inprogress, reopened* (tanpa *ready for qc*).
  - "Overdue" diperlakukan seperti status, padahal itu kondisi turunan.
  - "Top assignees open" didefinisikan sebagai "yang **membuat** task open", sehingga creator dan assignee tertukar. Beban kerja lebih tepat di tab Team / Menu Tim (A1).
- **Team tab:** owner + member dengan role PM/Member/Viewer. Kalimat "owner pemilik tasknya" kemungkinan maksudnya *pemilik proyek*. Di form create ada "assignee" proyek, yang tidak jelas bedanya dengan owner/lead. Usulan: satu konsep **Lead** (1 orang, akuntabel atas health & update) + Members dengan role. Tambah alokasi/kapasitas (jam/minggu) karena forecast & planner butuh data ini.

### 2.6 Buat proyek: form, "dari cerita", template

- **Form manual:** status saat create menawarkan Completed/Cancelled (tidak masuk akal untuk proyek baru) → cukup Draft/Active. Typo "Cartical" → *Critical*. Quick-range (1 mgg/2 mgg/1 bln/3 bln) bagus → [KEEP].
- **"Dari cerita" lama:** AI hanya mengisi field form (nama, deskripsi, status, prioritas, assignee, timeline). Ini nilai kecil, karena bagian yang sulit (memecah kerja, estimasi, urutan, risiko) tidak tersentuh.
- **Template lama:** hanya lahir dari "cerita" + checkbox, dan yang disimpan pun hanya isi form. Padahal proyek nyata yang selesai (dengan fase, task, estimasi aktual) adalah bahan template terbaik. Template fase (planning/dev/testing/release) terpisah dan hardcoded.

---

## 3. Tabel fitur lama → label + alasan

### 3.1 Menu Proyek

| # | Fitur lama | Label | Alasan | Dampak ke user | Prio | Effort |
|---|---|---|---|---|---|---|
| 1 | Search nama/deskripsi | [MODIFY] | Tambah pencarian natural-language ("proyek klien X yang telat") lewat command bar global (selaras A4) | Lebih cepat menemukan proyek tanpa kombinasi filter | P2 | M |
| 2 | Tombol refresh | [REMOVE] | Data harus real-time (websocket/polling) atau refresh saat fokus kembali; tombol manual adalah tanda data basi | Satu tombol berkurang, data selalu segar | P1 | S |
| 3 | New project: card form | [MERGE] | Tiga kartu (form/cerita/template) jadi **satu dialog "Proyek baru"** dengan 3 jalur: Kosong · Dari cerita/dokumen (AI) · Dari template | Satu pintu masuk, tidak bingung memilih kartu | P0 | S |
| 4 | Form: status 5 opsi | [MODIFY] | Saat create hanya Draft/Active | Mencegah data tidak masuk akal | P1 | S |
| 5 | Form: prioritas (typo "Cartical") | [MODIFY] | Perbaiki → Critical, konsisten dengan task | Konsistensi | P1 | S |
| 6 | Form: "assignee" proyek | [MODIFY] | Pecah jadi **Lead** (1) + **Members** (n) | Akuntabilitas jelas, dipakai untuk reminder update | P0 | S |
| 7 | Form: timeline + quick 1w/2w/1m/3m | [KEEP] | Sudah efisien | — | — | — |
| 8 | Buat project dari cerita | [MODIFY] → [ADD-AI] | Naik kelas jadi AI Project Planner (lihat F1) | Dari proyek kosong ke rencana siap kerja dalam menit | P0 | L |
| 9 | Template project (dari cerita) | [MODIFY] → [ADD-AI] | Template dari proyek mana pun, auto-suggest saat proyek selesai, berparameter (lihat F3) | Proyek berulang tidak perlu disusun ulang | P1 | M |
| 10 | Card quick / card status / card health | [MERGE] | Tiga kartu dilebur jadi **satu bar segmen yang sekaligus filter**: `Semua · Active · On Hold · Draft · Selesai` + chip health `Off track · At risk` | Ruang layar lebih hemat, satu klik untuk filter | P1 | S |
| 11 | Health: Overdue / At Risk / Delayed | [MODIFY] | Ganti ke On track / At risk / Off track (dihitung); Overdue & Extended jadi badge (lihat §2.1) | Health bisa dipercaya dan dijelaskan | P0 | M |
| 12 | Filter: Proyek saya / Semua | [KEEP] | Esensial | — | — | — |
| 13 | Filter: any priority | [KEEP] | — | — | — | — |
| 14 | Filter: any user | [MODIFY] | Perjelas: "Lead" atau "Anggota". Saat ini makna "berhubungan" ambigu | Hasil filter dapat diprediksi | P2 | S |
| 15 | Filter "recently updated" (isinya: urut tenggat) | [MODIFY] | **Salah definisi**: label menyebut "updated" tetapi perilakunya sort tenggat, dan itu sort, bukan filter. Ganti jadi kontrol **Urutkan**: Terakhir diperbarui · Deadline terdekat · Health terburuk · Dibuat · Nama | Tidak ada lagi kebingungan label vs perilaku | P0 | S |
| 16 | View comfy / dense | [REMOVE] | Beda 3 vs 4 kolom tidak sepadan dengan beban kognitifnya; layout grid harus responsif otomatis | Satu toggle berkurang | P2 | S |
| 17 | Grid view | [KEEP] | Kartu visual untuk portofolio kecil | — | — | — |
| 18 | List view | [MODIFY] | Jadikan **default** dengan kolom health, lead, progres vs waktu, deadline, update terakhir; kolom bisa diatur | Skimming portofolio jauh lebih cepat | P1 | S |
| 19 | Timeline view | [MODIFY] | Jadikan roadmap portofolio: bar proyek + milestone + garis "hari ini" + warna health | PM/manajemen melihat tabrakan jadwal antar proyek | P1 | M |
| 20 | — | [ADD] | **Saved views** (filter+sort+view tersimpan & bisa dibagikan) | Tidak perlu set ulang filter tiap hari | P2 | S |

### 3.2 Detail Proyek

| # | Fitur lama | Label | Alasan | Dampak ke user | Prio | Effort |
|---|---|---|---|---|---|---|
| 21 | Overview: card members | [MERGE] | Ke strip avatar tim (satu komponen) | Hilang duplikasi | P1 | S |
| 22 | Overview: card team | [MERGE] | Sama dengan #21; detail di tab Team | — | P1 | S |
| 23 | Overview: card tasks (jumlah) | [MERGE] | Ke kartu **Progres** (kerja selesai vs waktu berjalan) | Satu angka bermakna, bukan dua | P0 | S |
| 24 | Overview: card task progress | [MERGE] | Idem #23 | — | P0 | S |
| 25 | Overview: card timeline (%) | [MERGE] | Ke kartu **Jadwal**: start–deadline, % waktu, forecast selesai, badge Extended | Langsung terlihat aman/tidak | P0 | S |
| 26 | Overview: card dates | [MERGE] | Idem #25 | — | P0 | S |
| 27 | Overview: card milestones | [MODIFY] | Jadi **"Berikutnya"**: fase aktif + milestone terdekat + progres + risiko | Menjawab "apa yang harus aman minggu ini" | P0 | S |
| 28 | — | [ADD-AI] | **Header health + ringkasan AI 3 kalimat** + top 3 faktor + status update terakhir | Stakeholder paham kondisi dalam 10 detik | P0 | M |
| 29 | Tasks tab (filter/sort/view/CSV/select) | [MERGE] | Reuse komponen Menu Tasks (A3) dengan scope proyek terkunci; tidak dibuat dua kali | Konsistensi perilaku & biaya maintenance turun | P0 | M |
| 30 | Tasks tab: tombol Dashboard (7 kartu) | [MERGE] | Pindah ke sub-bagian **Insights** di Overview: throughput 14 hari (created vs closed) + donut status. Kartu total/open/closed/overdue sudah tercakup di Progres | Hilang satu tombol & satu layar duplikat | P1 | S |
| 31 | Dashboard: "top assignees open" | [MODIFY] | Definisi salah (creator vs assignee). Pindah ke tab Team sebagai **beban kerja** per anggota | Data beban akurat | P1 | S |
| 32 | Dashboard: card "overdue" sebagai status | [MODIFY] | Overdue = kondisi turunan, bukan status. Selaraskan himpunan status dengan A3 | Konsistensi data | P1 | S |
| 33 | Trash (30 hari) | [KEEP] | Dibahas A3 | — | — | — |
| 34 | Tab Team: owner + member + role PM/Member/Viewer | [MODIFY] | Owner→**Lead**; tambah kolom beban (task aktif, jam estimasi), kapasitas/minggu, keahlian (dipakai planner untuk saran assignee) | Planner & forecast punya data kapasitas | P1 | M |
| 35 | Tab Milestone | [MERGE] | Ke tab **Rencana** (lihat §2.2) | Satu tempat untuk rencana | P0 | M |
| 36 | Tab Phases | [MERGE] | Ke tab **Rencana**; task punya `phaseId`; progres otomatis | Progres fase akurat, health punya input | P0 | M |
| 37 | Phases: template planning/dev/testing/release | [MERGE] | Ke template proyek (F3); tetap tersedia sebagai template bawaan "Software delivery" | Satu sistem template | P1 | S |
| 38 | Phases/Milestone: view list/grid/stepper | [MODIFY] | Timeline + stepper (utama) dan list (alternatif). **Grid dihapus** | Lebih sedikit pilihan tanpa nilai | P2 | S |
| 39 | Tab Extensions | [MERGE] | Ke panel "Riwayat jadwal" di tab Rencana + badge "Extended ×N" di header | Navigasi lebih ringkas | P1 | S |
| 40 | Extend deadline: reason opsional | [MODIFY] | **Wajib** + kategori | Retro & AI punya bahan sebab-akibat | P0 | S |
| 41 | Extend deadline: validasi "Same as current deadline" | [KEEP] | Bagus. Tambah: tanggal baru < hari ini → peringatan | — | P2 | S |
| 42 | — | [ADD-AI] | **Impact preview** saat extend (fase/milestone/task yang bergeser + opsi geser proporsional) | Jadwal tetap konsisten setelah perpanjangan | P1 | M |
| 43 | Retro: periode 7/14/30/90d | [MODIFY] | Tambah periode **per fase/milestone/sprint** (default) dan rentang kustom | Retro selaras ritme kerja | P1 | S |
| 44 | Retro: tombol refresh | [REMOVE] | Data dihitung saat dibuka/real-time | — | P2 | S |
| 45 | Retro: copy markdown / download .md | [KEEP] | Berguna untuk dibagikan; tambah "Simpan retro" (versi tersimpan di proyek) | Hasil retro tidak hilang | P1 | S |
| 46 | Retro: cards shipped/new/extensions | [KEEP] | Data dasar yang valid | — | — | — |
| 47 | Retro: card slipped | [MODIFY] | Definisikan rumus eksplisit (§2.4) | Angka bisa dipercaya | P1 | S |
| 48 | Retro: card still blocked | [MODIFY] | Label "saat ini" karena snapshot, bukan metrik periode | Tidak menyesatkan | P2 | S |
| 49 | Retro: card commits | [MODIFY] | Sumber data dari integrasi Git (F5). Tampilkan PR merged & lead time, bukan hanya jumlah commit (jumlah commit mudah bias) | Metrik engineering lebih bermakna | P1 | M |
| 50 | Retro: top contributors | [MODIFY] | Hapus ranking; tampilkan kontribusi (closed, review, unblock) tanpa leaderboard | Menghindari insentif buruk | P1 | S |
| 51 | Retro: list shipped & deadline pushes | [KEEP] | Bahan dasar retro AI | — | — | — |

---

## 4. Fitur baru 2026 (prioritas & effort)

| ID | Fitur | Label | Deskripsi singkat | Alasan | Dampak ke user | Prio | Effort |
|---|---|---|---|---|---|---|---|
| F1 | **AI Project Planner** | [ADD-AI] | Input: cerita teks, voice, dokumen/PRD (PDF/Docx/Notion/URL), notulensi rapat (A1), atau repo. Output **draf rencana**: ringkasan & tujuan, fase, milestone + kriteria selesai, task (kind, prioritas, estimasi jam + rentang kepercayaan), dependensi, saran assignee berdasarkan keahlian & beban, risiko + mitigasi, asumsi & pertanyaan terbuka. User mereview dalam **tampilan diff/outline** (terima/ubah/buang per item, "regenerate bagian ini"), lalu Create. AI juga menyarankan template yang mirip ("Proyek ini 80% mirip 'Onboarding Klien B'. Pakai sebagai dasar?") | Bagian tersulit memulai proyek adalah memecah kerja & estimasi; "dari cerita" lama hanya mengisi form | Waktu setup proyek turun dari jam ke menit; rencana lebih lengkap (risiko & asumsi tidak terlupa) | P0 | L |
| F1a | Kalibrasi estimasi historis | [ADD-AI] | Estimasi planner dikoreksi dengan rasio estimasi vs aktual tim dari proyek sebelumnya | LLM cenderung optimistis tanpa data tim | Forecast lebih realistis | P1 | M |
| F2 | **Health score explainable + prediktif** | [ADD-AI] | v1 rule-based (§2.1) → v2 Monte Carlo P50/P85 + penjelasan LLM. Riwayat health per minggu (sparkline). Override PM wajib alasan & kedaluwarsa otomatis 7 hari | Health lama tidak terdefinisi | Masalah terdeteksi minggu lebih awal, bukan saat deadline lewat | P0 (v1) / P1 (v2) | M / L |
| F3 | **Template otomatis & hidup** | [ADD-AI] | (a) Saat proyek Completed, AI menawarkan "Jadikan template" dan menyusun template dari struktur nyata (fase, task, **estimasi aktual**), (b) parameter: tanggal relatif (H+n), role bukan nama orang, variabel (`{{klien}}`), (c) pelajaran retro ditambahkan sebagai catatan/risiko bawaan, (d) library template + statistik pemakaian & durasi rata-rata | Template lama statis dan hanya dari cerita | Proyek berulang makin akurat dari waktu ke waktu | P1 | M |
| F4 | **Status update stakeholder otomatis** | [ADD-AI] | Jadwal per proyek (mis. Jumat 15:00): AI menyusun draf dari perubahan sejak update terakhir (task selesai, milestone, health, extension, PR merged, komentar penting) → Lead review/edit → kirim ke kanal (in-app, email, Slack/Teams; WhatsApp perlu verifikasi kebutuhan). Dua gaya: *tim* (detail) & *eksekutif/klien* (3 poin + health). Reminder ke Lead jika belum posting; update basi menurunkan health "Kesegaran". Pola sama dengan Linear (reminder + "Write with Agent") [S1] & Asana Smart status [S3] | Status update manual memakan waktu PM dan sering terlewat | PM hemat ~1 jam/minggu/proyek (asumsi); stakeholder dapat info konsisten | P0 | M |
| F5 | **Integrasi GitHub/GitLab (webhook + MCP)** | [ADD] + [ADD-AI] | Link repo ↔ proyek; commit/branch/PR ↔ task via key; panel "Kode" di task; otomasi status opsional (PR opened → in progress, PR merged → ready for QC); data untuk retro & health (PR macet > 3 hari). MCP server GitHub [S4]/GitLab [S5] dipakai agen AI internal untuk membaca diff/PR saat membuat retro & status update | Kartu "commits" di Retro tidak punya sumber; tim software hidup di Git | Status task tidak perlu diubah manual; retro punya data engineering nyata | P1 | M–L |
| F6 | **Retro AI** | [ADD-AI] | Per fase/milestone/periode: AI menyusun *Apa yang berjalan baik · Apa yang meleset & kenapa (dari alasan extension, komentar, task slipped, PR lama) · Pola dibanding retro sebelumnya · Action item*. Action item bisa jadi task satu klik; retro tersimpan & action item dari retro sebelumnya ditinjau otomatis ("3 dari 4 action item selesai") | Retro lama hanya angka | Tim belajar dari pola, bukan hanya menghitung | P1 | M |
| F7 | **Tab Rencana (Phases+Milestone+Riwayat jadwal)** | [ADD] | Lihat §2.2/§2.3; termasuk baseline (rencana awal vs saat ini) | Fondasi data untuk health/forecast | Satu tempat untuk "kapan & apa" | P0 | M |
| F8 | **Baseline & scope-creep tracker** | [ADD] | Simpan snapshot rencana saat proyek di-Active-kan; tampilkan delta (task ditambah, estimasi naik, tanggal geser) | Tanpa baseline, keterlambatan tidak bisa dijelaskan | PM bisa menunjukkan ke klien "scope naik 30%" | P1 | S |
| F9 | **Tanya proyek (NL Q&A)** | [ADD-AI] | Panel chat terkontekstual proyek: "apa yang menghambat release?", "siapa yang overload?", "ringkas diskusi soal API minggu ini" (jawaban dengan sitasi ke task/komentar). Mesin bersama dengan A4 | Mengurangi klik antar tab | Jawaban cepat untuk pertanyaan ad-hoc | P1 | M |
| F10 | **Risk register ringan + AI risk forecast** | [ADD-AI] | Risiko dari planner (F1) + deteksi otomatis (dependensi eksternal, satu orang memegang terlalu banyak task kritis/bus factor, bug kritis menumpuk). Tiap risiko: dampak, kemungkinan, mitigasi, pemilik | Risiko selama ini tidak tercatat di mana pun | Mitigasi dilakukan sebelum jadi masalah | P2 | M |
| F11 | **MCP server untuk aplikasi PM** | [ADD] | Expose proyek/task/health ke agen eksternal (Claude, IDE) dengan scope izin per role. Detail lintas-fungsi di A4 | Standar integrasi 2026 | Tim bisa bertanya/ubah data PM dari IDE/agen | P2 | M |

### 4.1 Struktur Detail Proyek yang diusulkan

```
[Header] Nama · Status · Health (On track/At risk/Off track ▸ kenapa) · Lead · Deadline · Extended ×N · [Kirim update]
Tabs: Overview | Tasks | Rencana | Team | Retro
  Overview : Ringkasan AI · Progres vs waktu + forecast · Berikutnya (fase/milestone) · Risiko & blocker · Update terakhir · Insights (throughput, donut)
  Tasks    : komponen Menu Tasks (A3), scope terkunci ke proyek
  Rencana  : Timeline+stepper fase & milestone · Baseline vs saat ini · Riwayat jadwal (extensions)
  Team     : Lead, anggota+role, beban, kapasitas, keahlian
  Retro    : per fase/periode · kartu metrik · Retro AI · action items · riwayat retro
```
Dari **7 tab → 5 tab**, dan dari **7 kartu Overview + 7 kartu Dashboard → 6 blok** dengan informasi lebih banyak.

---

## 5. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Halusinasi planner (task/estimasi tidak realistis, fase tidak relevan) | Rencana buruk diterima mentah-mentah | Selalu draf + review per item; tampilkan asumsi & confidence; kalibrasi historis (F1a); jangan auto-create |
| Health score salah dan dipercaya berlebihan | Keputusan keliru, PM merasa "dinilai mesin" | Rule v1 transparan, top-3 faktor, override dengan alasan, ambang dapat dikonfigurasi, tampilkan "belum cukup data" bila estimasi/task kosong |
| Kualitas data rendah (estimasi kosong, task tidak di-link ke fase) | Forecast & progres tidak akurat | Fallback ke jumlah task; nudge "12 task tanpa estimasi"; planner mengisi estimasi awal |
| Status update AI terkirim ke klien dengan isi keliru/sensitif | Masalah kepercayaan & kerahasiaan | Wajib approval manusia sebelum kirim eksternal; filter konten internal (komentar privat); log siapa yang approve |
| Integrasi Git: token berlebih, kebocoran kode ke LLM | Risiko keamanan & kepatuhan | GitHub App/OAuth scope minimal (read metadata, PR), toolset MCP dibatasi [S5], opsi "jangan kirim diff ke LLM", audit log |
| Metrik kontributor/commit memicu perilaku buruk | Gaming metrik, moral tim turun | Hapus ranking, fokus metrik tim, bukan individu |
| Migrasi data Milestone+Phases lama | Data hilang/ganda | Migrasi: phase → fase, milestone → milestone di fase yang tanggalnya mencakup (atau fase "Tanpa fase"); task lama `phaseId = null` + saran AI untuk mengelompokkan |
| Biaya & latensi LLM (planner dokumen panjang, update terjadwal massal) | Biaya operasional naik | Cache, model kecil untuk ringkasan rutin, model besar hanya untuk planner; batasi frekuensi |
| Bahasa campuran (ID/EN) menurunkan kualitas output | Hasil kaku/salah istilah | Prompt & glosarium istilah proyek; evaluasi dengan contoh nyata berbahasa Indonesia |
| Scope tumpang tindih dengan A1/A3/A4 (NL query, MCP, beban tim) | Fitur dibangun dua kali | Orkestrator memutuskan pemilik di DECISIONS.md; A2 hanya mendefinisikan kebutuhan level proyek |

---

## 6. Asumsi

1. Produk adalah PM tool internal untuk tim yang (sebagian besar) mengerjakan software, terlihat dari kind *bug/qc*, kartu *commits*, dan status *ready for qc*.
2. "Deadline proyek" = tanggal selesai di timeline proyek; Extensions mencatat perubahan field itu.
3. Saat ini task **tidak** punya relasi ke fase/milestone (tidak disebut di field task maupun CSV header).
4. Health saat ini dihitung sederhana atau diisi manual. Rumus di dokumen ini adalah usulan baru, bukan reverse-engineering.
5. Data "commits" di Retro saat ini berasal dari integrasi yang belum terdokumentasi atau masih placeholder.
6. Tersedia akses ke LLM (multimodal) melalui provider yang disetujui organisasi; data proyek boleh diproses LLM dengan kontrol privasi.
7. Stakeholder bisa berada di luar aplikasi (manajemen/klien), sehingga status update perlu kanal eksternal (email/Slack); role *Viewer* dipakai untuk stakeholder yang login.
8. Ambang angka health (15/30 poin, 10/25%, 7/14 hari) adalah default awal yang wajib dikalibrasi, bukan nilai final.
9. Angka hemat waktu (mis. ~1 jam/minggu/proyek untuk status update) adalah estimasi kasar tanpa data pengukuran.
10. Riset web dibatasi (5 halaman dibuka); klaim Jira/Rovo "AI work breakdown" tidak bisa dimuat dan dianggap **(perlu verifikasi)**. Detail riset pasar diserahkan ke A4.

---

## 7. Pertanyaan terbuka

1. **Health lama:** apakah Overdue/At Risk/Delayed saat ini dihitung sistem atau dipilih manual? Apa beda *Delayed* vs *Overdue* yang dimaksud?
2. **Commits:** dari mana data commits di Retro saat ini (GitHub/GitLab/Bitbucket/self-hosted)? Repo mana yang dipakai tim?
3. **"Assignee" proyek** di form create: apakah maksudnya owner/lead, atau daftar anggota awal?
4. **Siapa boleh extend deadline:** hanya PM/Lead, atau semua member? Apakah perlu approval (mis. dari owner/klien)?
5. **Stakeholder eksternal:** apakah klien memakai aplikasi (role Viewer) atau cukup menerima update via email/WA/Slack? Kanal apa yang wajib?
6. **Retro:** apakah tim bekerja dengan sprint/iterasi? Jika ya, apakah sprint perlu jadi konsep tersendiri (saat ini tidak ada di catatan)?
7. **Kebijakan data AI:** apakah dokumen/PRD dan kode boleh dikirim ke LLM pihak ketiga, atau harus model self-hosted/region tertentu?
8. **Template:** apakah template boleh dibagikan lintas tim/workspace, dan siapa yang mengkurasi?
9. **Migrasi:** apakah data Milestone & Phases lama banyak dipakai? Ini menentukan effort migrasi ke tab Rencana.
10. **Status task** (untuk A3/orkestrator): himpunan status final mana yang benar: dengan atau tanpa *ready for qc*? Health & progres bergantung pada ini.

---

## Sumber

- [S1] Linear Docs — Initiative and Project updates (health On track/At risk/Off track, reminder, "Write with Agent"): https://linear.app/docs/initiative-and-project-updates (diakses 5 Okt 2026)
- [S2] Linear Docs — Project milestones: https://linear.app/docs/project-milestones (diakses 5 Okt 2026)
- [S3] Asana Help — Smart status: AI-generated status updates: https://help.asana.com/s/article/smart-status (diakses 5 Okt 2026)
- [S4] GitHub — github/github-mcp-server (MCP server resmi GitHub): https://github.com/github/github-mcp-server (diakses 5 Okt 2026)
- [S5] GitLab Docs — GitLab MCP server (OAuth, toolsets): https://docs.gitlab.com/user/gitlab_duo/model_context_protocol/mcp_server/ (diakses 5 Okt 2026)
- Jira/Atlassian "break down work with AI": halaman gagal dimuat → **(perlu verifikasi)**, diserahkan ke A4.
