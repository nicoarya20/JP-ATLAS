# R1 — Review Senior atas Laporan Analis A1–A4

> Reviewer: Principal PM + AI Product Lead (R1) · Run `run_16f58567a2c7` · Task `task_6c628f583df4` · 5 Oktober 2026
> Input: `note.md`, `orchestration/BRIEF.md`, `analysis/A1-dashboard-tim-events.md`, `analysis/A2-proyek-detail.md`, `analysis/A3-work-items.md`, `analysis/A4-ai-landscape-crosscutting.md`.
> Peran: **menilai, bukan menulis ulang**. File analis tidak diubah. Klaim pihak ketiga di laporan analis **tidak diverifikasi ulang** oleh reviewer (tidak ada riset web di fase ini). Tandanya tetap mengikuti laporan sumber.
> Rujukan silang: `A1§4.3` = laporan A1 bagian 4.3; `A3-F2` = fitur F2 di laporan A3; `K#` = konflik; `D#` = keputusan; `C#` = celah.

---

## 0. Ringkasan untuk orkestrator (baca ini dulu)

1. **Keempat laporan berkualitas tinggi dan arahnya searah.** Semuanya sepakat AI hanya menyarankan, manusia yang memutuskan; angka dihitung query, bukan LLM; widget dashboard dilebur; refresh manual dihapus; notulensi foto/voice jadi siklus "rapat → keputusan → task" yang dikonfirmasi manusia. Nilai rata-rata: **A1 8,3 · A3 8,0 · A2 7,8 · A4 6,0**.
2. **Masalah terbesar bukan isi, tapi inflasi P0.** Kalau semua P0 dari keempat laporan dijumlahkan, estimasi kasar reviewer **±100–130 engineer-minggu**. Kapasitas MVP yang diasumsikan A4 (3–5 engineer × ±13 minggu) hanya **±40–65 engineer-minggu**. Usulan reviewer memangkas P0 menjadi ±75–80 engineer-minggu, lalu membaginya dalam dua gelombang (§5.3, D17).
3. **Ada 25 konflik antar laporan (§2).** Sembilan di antaranya struktural dan wajib diputuskan sebelum fase workflow/wireframe: penyatuan menu work item, himpunan status, himpunan kind, definisi "Tiket", model agen (assignee vs delegate), status task dari hasil rapat, lokasi layanan kapasitas, fakta integrasi Git, dan model peran. Sisanya soal prioritas (mis. engine NL/⌘K: P0 di A4, P1 di A1/A2/A3; MCP: P0/P1/P2) dan penamaan ("Inbox" dipakai untuk dua hal berbeda).
4. **Celah terbesar yang tidak dibahas siapa pun (§3):** matriks peran & izin terpadu, model biaya AI (unit cost per fitur), strategi mobile/offline untuk capture rapat, aksesibilitas (sinyal yang hanya mengandalkan warna, kanban drag-drop), konflik "hak hapus UU PDP vs log AI append-only/embedding/cache", dan **kalibrasi estimasi yang bergantung pada "jam aktual" yang tidak pernah ada di note.md**.
5. **Tiga keputusan terpenting:** **D1** satu entitas Work Item + taksonomi kind/status final (fondasi semua menu); **D2** P0 AI versi ramping "deterministik dulu" dengan satu engine AI bersama; **D3** kebijakan data AI & rekaman rapat (pengiriman ke penyedia pihak ketiga, consent, retensi), yang menjadi gerbang bagi notulensi, planner, dan triage.

---

## 1. Skor tiap laporan

Skala 1–10. **Kelengkapan** = cakupan terhadap fitur note.md dalam scope analis + format BRIEF (alasan, dampak, prioritas, effort). **Ketajaman** = keberanian menghapus/menggabung dengan alasan kuat. **Realisme AI 2026** = tidak overclaim, ada human-in-the-loop, ada fallback. **Kelayakan delivery** = P0 realistis, dependensi dan migrasi dipikirkan.

| Laporan | Kelengkapan | Ketajaman | Realisme AI 2026 | Kelayakan delivery | Rata-rata |
|---|---|---|---|---|---|
| **A1** Dashboard, Tim, Events | **9** | **9** | **9** | **6** | **8,3** |
| **A2** Proyek & Detail | **9** | **9** | **8** | **5** | **7,8** |
| **A3** Work items | **9** | **10** | **8** | **5** | **8,0** |
| **A4** AI landscape & lintas fungsi | **7** | **6** | **7** | **4** | **6,0** |

### 1.1 A1 — Dashboard, Tim, Events (8,3)
- **Kelengkapan 9.** Ke-14 widget, 5 fitur Tim, dan 13 elemen Events dibedah satu per satu, termasuk peta irisan dan contoh "satu task muncul di 5 tempat" (A1§2.1). Inkonsistensi note.md juga dicatat (definisi "aktif", jendela waktu acak, deskripsi R3 keliru). Kurang: tidak membahas izin melihat beban kerja orang lain secara tuntas (dibiarkan jadi pertanyaan terbuka A1§9-4), dan tidak menyentuh aksesibilitas.
- **Ketajaman 9.** 11 dari 14 widget di-MERGE/REMOVE, grid view Events dihapus, "online sekarang" diganti ketersediaan. Berani, dan setiap penggabungan menunjuk tujuan yang jelas (chip alasan di Fokus Saya).
- **Realisme AI 9.** Ini laporan yang paling disiplin soal AI: urutan Fokus dihitung skor transparan dan **LLM tidak mengurutkan** (A1§4.1); setiap item hasil rapat wajib kutipan bukti dan confidence; PIC/tenggat dikosongkan kalau tidak disebut; ada state machine item rapat; tidak ada auto-create task. Risiko STT Bahasa Indonesia campur Inggris dan uji WER sebelum GA juga dicatat.
- **Delivery 6.** P0 berat: N11a capture suara (L) + N11b foto (M) + N12 + N13 + N20 + N1 + N2, ditambah diarization. Skala effort A1 (S ≤ 2 minggu, 2–3 engineer) **berbeda** dari A3/A4 (S ≤ 1 minggu), jadi angka tidak bisa dijumlah langsung. N18 sinkron kalender 2 arah (L) di P1 juga optimistis.

### 1.2 A2 — Proyek & Detail Proyek (7,8)
- **Kelengkapan 9.** Tabel 51 baris mencakup hampir semua elemen Menu Proyek dan tujuh tab Detail. Analisis status vs health (A2§2.1) adalah temuan konseptual terpenting di seluruh run. Kurang: **tag pada Fase** tidak dibahas; prioritas proyek hanya diperbaiki typo-nya tanpa dipakai di mana pun; skala effort tidak didefinisikan.
- **Ketajaman 9.** Milestone + Phases + Extensions digabung ke tab Rencana, 7 tab menjadi 5, tiga kartu ringkasan menjadi satu bar segmen, comfy/dense dan refresh dihapus, leaderboard kontributor dihapus. Tajam dan beralasan.
- **Realisme AI 8.** Health v1 rule-based deterministik dengan faktor terburuk (bukan rata-rata) itu bagus. Planner selalu draf → review per item. Status update eksternal wajib approval. Yang overclaim: (a) **F1 Planner P0** menerima input cerita, voice, PDF/Docx/Notion/URL, notulensi, dan repo sekaligus; (b) **F1a/F12 kalibrasi "estimasi vs aktual"** padahal note.md tidak punya pencatatan jam aktual (lihat C6); (c) Monte Carlo P50/P85 butuh histori throughput yang mungkin belum ada.
- **Delivery 5.** P0 memuat Planner (L), Health v1 (M), tab Rencana + `task.phaseId` + migrasi data milestone/phase (M), Overview baru (M), status update terjadwal multi-kanal (M), dan reuse komponen Tasks (bergantung A3). Semua bergantung pada model data A3 yang juga P0. Urutan dependensi tidak dipetakan.

### 1.3 A3 — Work Items (8,0)
- **Kelengkapan 9.** Paling teliti terhadap note.md: matriks duplikasi 4 menu (A3§2), inventaris inkonsistensi kind/status/field (A3§3) yang menjadi rujukan semua analis, daftar typo, model data lengkap, migrasi, dan state machine dengan guard. Kurang: definisi "Tiket" sebagai `status=triage` **menghilangkan fungsi "pantau yang overdue"** dari papan tiket (lihat K4), dan tabel label status ide bertentangan dengan Opsi A promote (ide berubah jadi `task/open`, jadi label "done = dipromosikan" tidak pernah terlihat).
- **Ketajaman 10.** Menghapus kind `ticket`, `qc`, `pengembangan`; status `reopened` dan "overdue" dijadikan turunan; 4 list/4 form/4 importer/3 detail menjadi satu. Ini keputusan yang paling berdampak sekaligus yang paling dipertahankan dengan bukti.
- **Realisme AI 8.** Agen sebagai *delegate* (manusia tetap assignee/owner), agen tidak boleh `done/canceled/hapus`, auto-apply default OFF, `AISuggestion` untuk mengukur akurasi, prompt injection dari tiket eksternal, dan optimistic locking manusia vs agen. Sedikit optimistis pada **F7 AI check evidence** (mencocokkan screenshot dengan acceptance criteria rawan "pass palsu", meski sudah dibatasi sebagai informasi) dan F8 agent delegate (L) di P1.
- **Delivery 5.** P0 A3 sendiri sudah ±40 engineer-minggu (model terpadu + migrasi + satu list/detail/composer + import wizard + relasi + state machine + AI triage + duplikat). Fondasinya benar, tapi perlu dipecah menjadi P0a (model + migrasi + list/detail) dan P0b (triage/duplikat), dengan jalur migrasi bertahap (dual-read) yang belum dijelaskan.

### 1.4 A4 — AI Landscape & Lintas Fungsi (6,0)
- **Kelengkapan 7.** Tabel kompetitor dengan sumber dan penanda "(perlu verifikasi)" (monday.com jujur ditandai gagal) itu bagus. Arsitektur AI layer, peta layer × menu, 18 fitur usang, roadmap, dan governance juga ada. Kurang: tidak menelusuri fitur note.md di luar yang "usang" (Tab Team, Milestone/Phases, Events view), sebagian blok §3 tidak menyebut "dampak ke user" (§3.5, §3.7), dan tidak ada "Pertanyaan terbuka".
- **Ketajaman 6.** Lebih banyak menambah daripada menghapus. U18 penyatuan work item ditaruh P1 "bila disetujui" dengan "menu boleh tetap ada"; U5 sisa widget "jadi opsional" (bukan dihapus); "proyek dari cerita" di-KEEP tanpa evaluasi.
- **Realisme AI 7.** Governance adalah yang terbaik di run ini: level approval L0–L4, daftar aksi yang selalu butuh manusia, AI Action Log, budget/kill switch, dan ACL saat retrieval. Overclaim ada pada **cakupan dan waktu**: ⌘K dengan aksi tulis, hybrid search, MCP, AI Gateway (L), insight card, smart import, dan notulensi semuanya di MVP 0–3 bulan. Asumsi #2 "sudah ada integrasi git" bertentangan dengan A2 (commits kemungkinan placeholder). Follow-up Agent default "Auto (komentar)" berisiko terasa seperti pengawasan.
- **Delivery 4.** MVP A4 tidak realistis untuk 3–5 engineer dalam 3 bulan. Kriteria keluar "≥ 60% task baru dibuat via quick-add/import" adalah metrik adopsi yang mendorong perilaku, bukan metrik nilai. Skala effort internal juga tidak konsisten ("1–2 engineer" di asumsi vs "3–5 engineer" di roadmap).

### 1.5 Kepatuhan format BRIEF
| Syarat BRIEF | A1 | A2 | A3 | A4 |
|---|---|---|---|---|
| Label [KEEP/MODIFY/MERGE/REMOVE/ADD-AI/ADD] | ✅ | ✅ | ✅ | ✅ |
| Alasan + dampak + prioritas + effort per rekomendasi | ✅ | ✅ | ✅ | ⚠️ sebagian blok §3 tanpa dampak |
| Definisi skala effort | ✅ (S ≤ 2 mg) | ❌ tidak ada | ✅ (S ≤ 1 mg) | ✅ (S ≤ 1 mg, tapi tim tidak konsisten) |
| Sumber pihak ketiga + "(perlu verifikasi)" | ✅ | ✅ | ✅ | ✅ |
| Asumsi & pertanyaan terbuka | ✅ | ✅ | ✅ | ⚠️ tanpa pertanyaan terbuka |

---

## 2. Konflik antar laporan & usulan resolusi

Legenda dampak: **S** = struktural (wajib diputuskan sebelum workflow/wireframe), **P** = prioritas, **N** = penamaan/definisi.

| # | Konflik | Posisi tiap laporan | Dampak | Usulan resolusi |
|---|---|---|---|---|
| K1 | **Struktur menu work item** | A3: gabung Tasks/Ticket/Pengembangan jadi satu list + saved views, **P0**. A4-U18: gabung **P1** "bila disetujui", menu boleh tetap. A4§3.10: peta layer masih per menu Ticket/Pengembangan. A2#29: tab Tasks proyek memakai komponen A3 | S | Satu entitas & satu komponen **P0** (A3). Navigasi tetap punya shortcut "Tiket" dan "Ide" di sidebar sebagai saved view bawaan, supaya user lama tidak kehilangan pintu masuk. → **D1** |
| K2 | **Nama & himpunan status** | A3: `triage/open/in_progress/in_review/done/canceled`, reopened = flag. A4: masih memakai `ready for qc`, `closed`. A1-R5: chip "Dibuka ulang" (seolah status). A2: `status≠closed` | S | Pakai enum A3 sebagai sumber kebenaran. Label UI default: *Perlu Triage · Open · In Progress · Ready for QC · Done · Dibatalkan*. Chip "Dibuka ulang" di Fokus = `reopen_count > 0 & kategori ≠ completed`. Semua laporan turunan memakai kata `done`, bukan `closed`. → **D1** |
| K3 | **Himpunan kind** | A3: `task/bug/idea` (ticket & qc dihapus). Note.md: task, bug, qc, ticket, idea. A4: Triage Agent "klasifikasi kind" pada menu Ticket | S | Ikuti A3, dengan syarat: apakah ada tim QA dengan backlog sendiri dijawab user (kalau ya, `qc` bisa tetap sebagai **tag/tipe view**, bukan kind). → **D1** |
| K4 | **Definisi "Tiket"** (internal A3 vs note.md) | A3: Triage Tiket = `status=triage`. Note.md: papan tiket dipakai untuk "tentukan prioritas, assign, **dan pantau yang overdue**" | S | Kalau tiket = status triage, tiket yang sudah diterima (open/in_progress) **hilang dari papan**, sehingga pemantauan overdue tiket mati. Resolusi: Tiket = item dengan `source ∈ intake` (form/email/chat/meeting) **di semua status**. View "Tiket" punya dua tab: *Perlu Triage* (`status=triage`) dan *Berjalan* (diterima, dengan chip overdue/unassigned/blocked/stale). → **D1** |
| K5 | **Model agen** | A4§3.3 & P1: `Member.type = human\|agent`, agen bisa jadi **assignee**. A3§4: assignee **selalu manusia**, agen = `delegate_agent_id` | S | Ikuti A3 (selaras pola delegasi yang dikutip A3 dari Linear). Agen tampil di Tab Team sebagai entitas "Agen" (bukan anggota ber-role), dengan human owner. Akuntabilitas tetap jelas dan model data tidak bercabang. → **D5** |
| K6 | **Istilah "Inbox" bertabrakan** | A3-F1: "Inbox Work Item" = list pekerjaan universal. A1-N5 & A4§3.6: Inbox = notifikasi prioritas | N | "Inbox" khusus notifikasi + persetujuan AI. List pekerjaan bernama **"Pekerjaan"** (atau "Work Items"). |
| K7 | **Prioritas engine NL query / ⌘K / copilot** | A1-N3 **P1 L**; A2-F9 **P1 M**; A3-F13 **P1 S**, F16 palette **P2**; A4§3.1 **P0 M** dengan aksi tulis | P | Satu engine milik AI layer (A4), dipakai Beranda, Proyek, Pekerjaan. **P1**: NL → filter terstruktur (read-only, filter tafsiran bisa diedit) + tanya-jawab bersumber. **P2**: aksi tulis lewat ⌘K dengan preview diff. P0 hanya navigasi ⌘K biasa (non-AI). → **D2** |
| K8 | **Prioritas MCP server** | A2-F11 **P2**; A3-F15 **P1**; A4§3.4 **P0 read-only**, write P1 | P | **P1 read-only** setelah tool API internal stabil (pasca-migrasi model A3). Write **P2**, di balik toggle admin. Alasan: MCP di atas skema yang masih berubah = kontrak publik yang langsung pecah. → **D9** |
| K9 | **Status item hasil rapat** | A1§4.3: confirmed action item → Task (kind=task). A3§5.1: ekstraksi rapat masuk `triage` | S | Item yang dikonfirmasi **dengan proyek + PIC terisi** → `open` (sudah lewat review manusia, triage ulang = kerja dobel). Kalau proyek/PIC kosong → `triage` di proyek terhubung atau triage workspace. `source=meeting_note` + tautan kutipan. → **D7** |
| K10 | **Ambang stale / ghost** | A1: in_progress ≥ 3 hari kerja, konfigurable. A3-L10: 7 hari open/triage, 3 hari in_progress. A4-U7: stale **adaptif** (P1) + Follow-up Agent auto-komentar. A3-F17: nudge AI P2 | P/N | Default A3 (per kategori status, dalam **hari kerja**, konfigurable per workspace). Satu mesin stale untuk Fokus, chip list, dan Health. Ambang adaptif **P2**. Follow-up Agent yang berkomentar otomatis **P2 dan opt-in** per proyek (risiko notif fatigue & kesan pengawasan). |
| K11 | **Prioritas Smart Import & quick-add** | A4: Smart Import AI **P0**, quick-add NL **P0 S**. A3: import wizard non-AI **P0**, smart mapping AI **P1**, quick capture teks/screenshot/voice **P1 M** | P | **P0**: import wizard non-AI (A3-L4) + quick-add NL **teks saja** (S, memakai pipeline ekstraksi yang sama dengan notulensi). **P1**: mapping kolom AI, paste bebas, screenshot/voice capture. |
| K12 | **Pencarian semantik** | A4§3.7: hybrid search **P0**. A3-L8: keyword **P0**, semantik **P1** | P | Keyword search **P0** di semua view. Embedding index dibangun di P0 **hanya untuk deteksi duplikat** (indeks yang sama). UI pencarian semantik + panel Related **P1**. |
| K13 | **Inbox notifikasi** | A1-N5 **P1 M**; A4§3.6 Inbox **P0**, digest P1 | P | **P0 versi minimal**: mention/assignment/approval di atas, perubahan status dibundel per item, tandai dibaca (non-AI). Digest AI **P1**. Alasan: approval AI (triage, hasil rapat) butuh tempat mendarat sejak P0. |
| K14 | **Health proyek** | A2-F2: v1 rule-based **P0**, v2 Monte Carlo P1. A4§3.8 & U9: health beralasan **P1**. A1: chip health di Beranda bergantung A2 | P | **v1 rule-based P0** (A2§2.1, satu definisi, dimiliki A2). Penjelasan LLM & forecast **P1**. Monte Carlo **P2**, menunggu ≥ 8–12 minggu data throughput. |
| K15 | **"Online sekarang"** | A1-T2: MODIFY → status ketersediaan **P1 M**. A4-U13: MERGE ke kapasitas **P2 S** | P | Hapus daftar online real-time di rilis pertama (trivial). Status ketersediaan manual (Fokus/Rapat/Cuti/Off) **P1**. Derivasi dari kalender ikut sinkron kalender (P1/P2). Presence kontekstual **P2**. |
| K16 | **Lokasi beban/kapasitas** | A1§4.2: Menu Tim → "Tim & Kapasitas" lintas proyek. A2#31/#34: tab Team proyek berisi beban, kapasitas, keahlian; "top assignees open" pindah ke sana. A4: rebalancing P2 | S | **Satu layanan kapasitas** (definisi jam estimasi ÷ kapasitas dari A1). Menu Tim = tampilan lintas proyek; tab Team = irisan proyek. Data kapasitas/keahlian per orang disimpan sekali di profil anggota workspace, bukan per proyek. → **D10** |
| K17 | **"Buat proyek dari cerita"** | A2-F1: AI Project Planner **P0 L**, input multi-format. A4: **[KEEP]** "sudah ada" di MVP | P | P0 = **Planner v1 teks saja** (cerita/tempel PRD sebagai teks) → draf fase, milestone, task, risiko → review per item → create. Input dokumen/voice/repo, saran assignee, kalibrasi estimasi **P1**. → **D8** |
| K18 | **Integrasi Git / card "commits"** | A2 asumsi #5: commits kemungkinan placeholder; F5 integrasi GitHub/GitLab **P1**. A4 asumsi #2: integrasi git **sudah ada** | S | Fakta harus dikonfirmasi user. Sementara itu card commits **disembunyikan** jika tidak ada repo tertaut. F5 tetap P1. → **D11** |
| K19 | **Status update stakeholder** | A2-F4 **P0 M** (in-app, email, Slack/Teams). A4: Status Agent **P1** | P | **P1**. P0 cukup health v1 + ringkasan AI 3 kalimat di header Overview (A2#28). Draf update terjadwal + approval + kanal eksternal masuk P1, mulai dari in-app + email. → **D2** |
| K20 | **Kartu KPI / insight** | A1: KPI hanya strip PM ≤ 4 dengan Δ; R6/R9 dihapus. A4-U4: "Insight card" (angka + tren + kalimat AI + aksi) **P0** di Ringkasan, Proyek, tab Tasks. A3-L9: chip hitungan di atas list. A2#30: Insights di Overview | P/N | Satu komponen metrik (angka + Δ + drill-down), deterministik, **P0**. Kalimat penjelasan AI di kartu **P1**. Chip di list (A3) dan strip PM (A1) memakai definisi yang sama dari A3§5.1. |
| K21 | **Extensions** | A2#39: tab Extensions dilebur ke panel "Riwayat jadwal" di Rencana, alasan wajib + kategori. A4 roadmap: "Re-plan — **Tab Extensions**"; alasan bisa didraft AI | N | Ikuti A2 (tidak ada tab Extensions). Draf alasan AI **ditolak** untuk P0/P1: alasan perpanjangan adalah akuntabilitas manusia, dan draf AI melemahkannya. AI cukup menampilkan dampak (impact preview, P1). |
| K22 | **Peran proyek** | Note.md: owner + PM/Member/Viewer. A2#6/#34: **Lead** (1 orang) + Members. A1: "PM/Owner". A3: guard "PM/Member proyek", Viewer tidak bisa delegasi. A4: agen tidak bisa PM/Owner | S | Lead = **atribut** pada satu anggota ber-role PM (bukan role baru). Role proyek tetap PM/Member/Viewer. Tambahkan role workspace (Admin/Member/Guest) yang belum didefinisikan siapa pun. → **D6** + C1 |
| K23 | **Skala effort** | A1: S ≤ 2 mg (2–3 eng). A2: tidak didefinisikan. A3: S ≤ 1 mg, L > 1 bln. A4: S ≤ 1 mg (1–2 eng) tapi roadmap 3–5 eng | N | Standarkan: **S ≤ 1 minggu, M 2–4 minggu, L > 4 minggu, untuk 1 engineer full-stack** (engineer-minggu), plus desain/QA terpisah. Effort A1 dinormalisasi ulang di fase berikutnya. → **D12** |
| K24 | **Promote ide** | A3§5.3 Opsi A (konversi di tempat) direkomendasikan, tapi tabel A3§5.1 memberi label `done` = "Diterima/dipromosikan" (tidak terjadi di Opsi A). A4: otomasi "ide ≥ N dukungan → usulan naik jadi task" | N | Opsi A default (riwayat utuh). Opsi B hanya saat satu ide dipecah jadi beberapa task. Status `done` untuk ide = "Diterima (dipecah)" khusus Opsi B. Mekanisme "dukungan/vote" ide belum ada di note.md; kalau mau, tambahkan sebagai [ADD] P2. |
| K25 | **Decision Log & risiko** | A1-N14: Decision Log per proyek (P1); item rapat kategori "Risiko". A2-F10: risk register P2. Tidak ada yang menentukan **lokasi** Decision Log di IA | N | Keputusan & risiko dari rapat masuk ke objek proyek yang sama: Decision Log (panel di Overview + tab "Keputusan" di Rapat & Events) dan risk register A2 (P2). Item rapat "Risiko" di P0 cukup disimpan sebagai informasi. |

---

## 3. Celah

### 3.1 Fitur note.md yang tidak dibahas (atau hanya tersirat)

| # | Fitur di note.md | Status pembahasan | Rekomendasi reviewer |
|---|---|---|---|
| C1 | **Tag pada Fase** ("tag untuk memudahkan pencarian fase") | Tidak dibahas A2 | [REMOVE]. Fase per proyek hanya 3–8 item; tag tidak menambah nilai pencarian. P2, S |
| C2 | **Detail fase / hapus fase** sebagai halaman terpisah | Tersirat dalam merge tab Rencana | Detail fase = drawer di timeline Rencana; hapus fase wajib memindahkan task ke "Tanpa fase" (bukan ikut terhapus). P0, S |
| C3 | **Prioritas proyek** (Low–Critical) | Hanya typo fix (A2#5) | Pakai sebagai sort & filter portofolio dan sebagai bobot di Fokus Saya (task dari proyek Critical naik). P1, S |
| C4 | **Siapa yang boleh menambah/menghapus event** ("semua anggota tim bisa melihat dan menambah") | A1-E9 sebagian | Masuk matriks izin (C-R1). Event pribadi/rahasia (flag A1§6.1) belum punya aturan visibilitas di kalender bersama. |
| C5 | **Field "peserta" event** vs anggota proyek vs tamu eksternal | A1-E4 sebagian | Peserta = anggota workspace + tamu (email). Tamu eksternal memicu default "jangan rekam" (A1§6.1). |
| C6 | **Estimasi jam tanpa jam aktual** | A2-F1a & A3-F12 mengandalkan "estimasi vs aktual", padahal note.md **tidak punya time tracking/jam aktual** | Kalibrasi memakai **cycle time** (`started → done`) sebagai proxy, bukan jam aktual. Atau putuskan apakah time tracking ringan perlu ditambah. → **D13** |
| C7 | **Export/download CSV** (task & retro .md) | A3-L13 KEEP, tanpa aturan izin | Export mengikuti izin baca; Viewer/Guest boleh atau tidak harus diputuskan. Export tercatat di audit log. |
| C8 | **Edit, arsip, dan hapus proyek**; efek status Completed/Cancelled | Tidak ada di note.md dan tidak dibahas siapa pun | [ADD] P0, S: proyek Completed/Cancelled jadi read-only (bisa dibuka ulang PM), task aktifnya keluar dari Fokus/Briefing, dan arsip ≠ hapus. |
| C9 | **Watcher/subscriber item** (siapa yang menerima notifikasi) | A3 menyebut "watcher" sekali, tanpa definisi | [ADD] P0, S: reporter, assignee, reviewer, dan yang di-mention otomatis jadi watcher. Ini prasyarat Inbox. |
| C10 | **Pengaturan notifikasi per user** (kanal, jam tenang, frekuensi briefing/digest) | Disinggung A1/A4, tanpa pemilik | Satu halaman preferensi notifikasi (P0 minimal: on/off per jenis). Lihat juga R9. |
| C11 | **Template fase bawaan** (planning/dev/testing/release) untuk proyek non-software | A2 menjadikannya template "Software delivery" | Sediakan juga 1 template generik (non-software), karena asumsi "semua tim software" (A2 asumsi #1) belum terkonfirmasi. |

### 3.2 Risiko yang terlewat atau kurang dalam

| # | Area | Celah | Rekomendasi | Prio |
|---|---|---|---|---|
| R1 | **Permission/role** | Tidak ada **matriks izin terpadu**. Izin tersebar di A1-E9, A2 pertanyaan #4, A3§5.3, A4§6.2. Role workspace (Admin/Guest) tidak didefinisikan. Viewer belum jelas: boleh pakai copilot? Melihat notulensi? Export CSV? Melihat beban orang lain? | Buat satu matriks *(Admin, Lead/PM, Member, Viewer, Guest, Agen) × (lihat, buat, ubah, hapus, export, konfirmasi hasil rapat, extend deadline, delegasi agen, lihat beban individu, pakai AI)*. Wajib sebelum wireframe. | P0 |
| R2 | **Keamanan, data turunan AI** | Briefing yang di-cache, `ThreadSummary`, ringkasan proyek, transkrip, dan embedding **membawa salinan data**. Saat user dikeluarkan dari proyek atau item dihapus/dirahasiakan, salinan ini bisa bocor. A4 hanya membahas ACL saat retrieval. | ACL dicek ulang saat **membaca** cache, bukan hanya saat membuat. Invalidasi cache & embedding saat izin/visibilitas berubah. Tes otomatis lintas role untuk setiap permukaan AI. | P0 |
| R3 | **Privasi: hak hapus vs log append-only** | A4 mendesain AI Action Log **append-only**, A1-N21 menyimpan jejak audit item AI, A3 menyimpan item `rejected` untuk evaluasi. UU PDP memberi hak penghapusan (perlu verifikasi legal). Belum ada yang mendamaikan keduanya. | Log menyimpan referensi/pseudonim, bukan isi mentah. Konten (transkrip, input prompt) disimpan terpisah dengan retensi & bisa dihapus. Lakukan **DPIA** sebelum fitur rekaman GA (perlu verifikasi legal). | P0 |
| R4 | **Biaya AI** | Semua laporan menyebut budget/kuota, tapi **tidak ada model biaya per unit**: briefing harian × jumlah user, STT per jam rapat, OCR per foto, embedding seluruh item (dan re-index), agen per run. Packaging juga tidak dibahas (AI termasuk paket dasar atau add-on? fair use?). | Sebelum P0 dikunci, buat lembar unit cost per fitur memakai harga aktual penyedia terpilih: `biaya/bulan = Σ (volume × token atau menit × harga)`, dengan 3 skenario adopsi. Tetapkan plafon per workspace dan fitur mana yang turun ke model kecil. | P0 |
| R5 | **Offline/mobile** | Capture rapat (rekam suara, foto whiteboard), quick-add, dan Fokus jelas dipakai dari HP, tapi **tidak ada strategi mobile** (responsive? PWA? native?). Tidak ada rencana rekaman saat koneksi putus atau upload audio besar di jaringan seluler. | Responsive web + **PWA** di P0 untuk Fokus, quick-add, dan capture. Rekaman disimpan lokal dulu lalu diunggah bertahap (resumable/chunked), dengan status "menunggu upload". Native app P2. | P0 |
| R6 | **Aksesibilitas** | Hampir tidak disentuh (hanya A2#38 "list sebagai alternatif aksesibel"). Banyak sinyal **hanya mengandalkan warna** (due merah, age kuning, health hijau/kuning/merah, stepper hijau). Kanban drag-drop dan timeline/Gantt tidak punya alternatif keyboard. Fitur voice-first belum punya padanan teks. | Target **WCAG 2.2 AA**. Setiap sinyal warna disertai ikon + teks. Drag-drop punya aksi keyboard/menu "Pindah ke…". Timeline punya tampilan list setara. Output AI streaming diumumkan via `aria-live`. Semua capture voice punya jalur ketik/tempel. | P0 (dasar) / P1 |
| R7 | **Ketersediaan AI** | Tidak ada yang mendefinisikan **degraded mode** saat penyedia LLM/STT gangguan atau kuota habis. | Setiap fitur AI punya fallback deterministik: Fokus tetap jalan tanpa kalimat alasan, briefing jatuh ke daftar poin data, notulensi ke ketik manual, triage ke form biasa. Kill switch per fitur (A4) dipakai juga sebagai circuit breaker otomatis. | P0 |
| R8 | **Evaluasi kualitas AI** | Hanya A1 (uji WER) dan A4 (👍/👎) yang menyinggung. Tidak ada **golden set** maupun ambang lulus per fitur sebelum GA. | Golden set Bahasa Indonesia per fitur: presisi/recall ekstraksi rapat, akurasi triage kind/priority, presisi duplikat, kesesuaian angka briefing (harus 100%). Ambang lulus disepakati sebelum GA. `AISuggestion` (A3) dipakai untuk monitoring pasca-rilis. | P0 |
| R9 | **Kelelahan notifikasi AI** | Kanal dorong baru yang diusulkan: briefing harian, digest mingguan, digest tim, recap rapat, nudge stale, follow-up agent, status update, peringatan overload. Masing-masing masuk akal, tapi **jumlahnya** belum dihitung siapa pun. | "Anggaran notifikasi" per user: semua output AI terjadwal masuk satu briefing/digest, bukan notifikasi terpisah. Default konservatif, dan user bisa mematikan per jenis. | P1 |
| R10 | **Keamanan intake & upload** | Form intake publik / email-to-ticket (A3-F14) tanpa anti-spam, rate limit, verifikasi pengirim. Upload evidence/audio/foto tanpa pemindaian malware. Teks hasil OCR foto sebagai jalur prompt injection baru. | CAPTCHA + rate limit untuk form publik, verifikasi domain email, pemindaian file upload, dan teks OCR diperlakukan sebagai *untrusted* (sama seperti body tiket). | P1 |
| R11 | **Zona waktu & hari kerja** | "Hari kerja", "hari ini", "besok", dan ambang stale bergantung zona waktu dan libur nasional Indonesia. A1 hanya bertanya. | Hari kerja & libur dikonfigurasi per workspace; tenggat disimpan dengan zona waktu; semua bucket waktu dihitung di zona user. | P1 |
| R12 | **Manajemen perubahan & migrasi** | A3 menyiapkan migrasi data; A2 menyiapkan migrasi milestone/phase. Belum ada rencana **rollout bertahap**: feature flag, periode dua-jalan, rollback, dan pelatihan user untuk 3 menu yang hilang. | Rollout per workspace dengan feature flag, satu rilis transisi dengan banner + "tampilan lama" read-only, laporan rekonsiliasi KPI lama vs baru (A3), dan rencana rollback skema. | P0 |
| R13 | **Pengawasan karyawan** | A1 menangani burnout & presence dengan baik, tapi **metrik individu lain** masih ada: `rework_count`/`reopen_count` per orang (A3 bertanya), kontribusi di Retro (A2), "siapa yang paling sibuk" lewat NL query (A1-N3). | Kebijakan tunggal: metrik individu hanya untuk yang bersangkutan dan Lead/PM proyeknya, tanpa ranking. NL query menolak pertanyaan perbandingan kinerja individu. | P1 |

---

## 4. Daftar Keputusan yang Diperlukan (untuk orkestrator)

Urutan = tingkat kepentingan. **D1–D3 adalah tiga keputusan terpenting** dan memblokir fase workflow/wireframe. Kolom "Siapa" menandai apakah orkestrator bisa memutuskan sendiri atau perlu input user/pemilik bisnis.

### D1 — Satu entitas Work Item + taksonomi kind/status final ⭐
- **Pertanyaan:** Apakah Tasks, Ticket, Pengembangan, dan tab Tasks proyek disatukan menjadi satu entitas & satu komponen? Kind dan status final apa? Apa definisi "Tiket"?
- **Opsi:**
  - **A.** Gabung penuh di P0 (A3): kind `task/bug/idea`; status `triage/open/in_progress/in_review/done/canceled`; Ticket & Ide menjadi saved view bawaan yang di-pin di sidebar.
  - **B.** Satukan model data dan komponen di P0, tapi navigasi tetap 3 menu terpisah sampai v1 (kompromi A4-U18).
  - **C.** Pertahankan 3 entitas/menu, hanya rapikan enum.
- **Rekomendasi: A**, dengan dua penyesuaian: (1) "Tiket" = `source ∈ intake` di **semua status** (K4), sehingga papan tiket tetap bisa memantau overdue; (2) label UI "Ready for QC" dipertahankan untuk `in_review`. **Alasan:** semua analis lain (A1 chip status, A2 health & tab Tasks, A4 MCP/agen) bergantung pada satu skema; B hanya menunda biaya migrasi navigasi; C mengabadikan drift yang sudah terbukti di A3§3.
- **Siapa:** orkestrator + **konfirmasi user** untuk dua fakta: apakah ada tim QA dengan backlog sendiri (nasib kind `qc`), dan apakah "ticket" pernah dipakai sebagai jenis pekerjaan, bukan jalur masuk.

### D2 — Cakupan P0 AI & satu engine AI bersama ⭐
- **Pertanyaan:** Seberapa besar MVP AI, dan siapa pemilik engine bersama (NL/⌘K, briefing, ekstraksi, triage)?
- **Opsi:**
  - **A.** MVP luas versi A4: AI Gateway lengkap, ⌘K + aksi tulis, hybrid search, MCP read-only, insight card AI, smart import AI, notulensi, briefing, triage.
  - **B.** **P0 ramping "deterministik dulu"**: fondasi data + log AI minimal; AI hanya di 6 titik bernilai tertinggi (§5.3); semua fitur AI lain P1, dibangun di atas satu engine milik AI layer.
  - **C.** Tunda semua AI ke P1; P0 hanya fondasi non-AI.
- **Rekomendasi: B.** **Alasan:** total P0 saat ini ±2× kapasitas (§0 poin 2). Dua janji AI eksplisit di note.md (proyek dari cerita, notulensi foto/voice) plus pengganti dashboard (briefing) dan triage sudah cukup membuktikan nilai. Opsi C membuat rilis pertama terasa "sama saja" dan membuang momentum.
- **Siapa:** orkestrator; angka kapasitas tim aktual perlu dari user.

### D3 — Kebijakan data AI & rekaman rapat ⭐
- **Pertanyaan:** Bolehkah audio/foto/transkrip, dokumen proyek, dan (nanti) kode dikirim ke penyedia LLM/STT pihak ketiga? Berapa lama audio mentah disimpan? Bagaimana consent?
- **Opsi:**
  - **A.** Penyedia pihak ketiga dengan zero-retention/no-training + DPA; audio mentah dihapus **30 hari setelah notulensi dikonfirmasi**; transkrip mengikuti retensi workspace; consent wajib; default tidak merekam rapat dengan pihak eksternal (A1§6.1).
  - **B.** Sama dengan A, tapi audio mentah **tidak pernah disimpan** (dihapus segera setelah transkrip jadi).
  - **C.** Hanya model self-hosted/region tertentu (biaya & effort jauh lebih tinggi, kualitas STT Bahasa Indonesia belum tentu setara).
- **Rekomendasi: A sebagai default, dengan B sebagai opsi kebijakan workspace.** **Alasan:** audio diperlukan untuk koreksi kutipan bukti selama masa review; 30 hari membatasi paparan. C baru masuk akal jika ada pelanggan dengan kewajiban residensi data (A4 sudah menaruh BYO key/self-host di v2).
- **Siapa:** **user/pemilik bisnis + review legal** (UU PDP, DPIA). Ini memblokir N11/N12 dan Planner berbasis dokumen.

### D4 — Siapa yang mengonfirmasi Hasil Rapat?
- **Opsi:** **A.** Notulis/pembuat event (bisa didelegasikan). **B.** PM/Lead proyek terhubung. **C.** Setiap peserta mengonfirmasi item yang menyangkut dirinya.
- **Rekomendasi: A**, ditambah: task yang terbentuk mengirim notifikasi ke PIC yang bisa langsung menolak/mengalihkan; PM/Lead bisa mengedit kapan saja; opsi "notulen resmi butuh persetujuan peserta" untuk rapat klien di **P2**. **Alasan:** C membuat review tidak pernah selesai; B menjadikan PM bottleneck; A cepat dan PIC tetap punya hak koreksi.

### D5 — Model agen AI
- **Opsi:** **A.** Agen = *delegate*, manusia selalu assignee (A3). **B.** Agen boleh jadi assignee/member (A4). **C.** Tidak ada agen sampai v2.
- **Rekomendasi: A**, dengan agen internal (triage/status) di P1 dan agen eksternal/coding di P2. **Alasan:** akuntabilitas tetap pada manusia; model data tidak bercabang; dan aturan "agen tidak boleh done/hapus/extend" mudah ditegakkan.

### D6 — Model peran & izin
- **Opsi:** **A.** Role workspace (Admin/Member/Guest) + role proyek (PM/Member/Viewer) + atribut **Lead** pada satu PM + entitas Agen. **B.** Ganti owner jadi role "Lead" terpisah (A2 harfiah). **C.** Tetap seperti note.md.
- **Rekomendasi: A**, dan matriks izin lengkap (R1) disusun sebelum wireframe. **Alasan:** menambah role baru memperbanyak kombinasi izin; "Lead" cukup sebagai penanda akuntabilitas health & status update.

### D7 — Status task dari hasil rapat
- **Opsi:** **A.** Selalu `triage`. **B.** `open` jika proyek + PIC terisi saat konfirmasi, selain itu `triage`. **C.** Selalu `open`.
- **Rekomendasi: B** (K9). **Alasan:** konfirmasi rapat sudah merupakan review manusia; triage ulang membuang waktu, tapi item tanpa pemilik tetap butuh jalur triage.

### D8 — Cakupan "Buat proyek dari cerita" (Planner) di P0
- **Opsi:** **A.** Planner penuh P0 (A2-F1: teks, voice, dokumen, repo, saran assignee). **B.** **Planner v1 teks** P0 (draf fase/milestone/task/risiko + review per item); dokumen/voice/saran assignee/kalibrasi di P1. **C.** Pertahankan versi lama (AI hanya isi form) (A4).
- **Rekomendasi: B.** **Alasan:** nilai utamanya ada di pemecahan kerja, bukan di jenis input. Input dokumen menambah parsing, privasi (D3), dan biaya. Saran assignee butuh data kapasitas yang baru ada di P1.

### D9 — Prioritas MCP server
- **Opsi:** **A.** P0 read-only (A4). **B.** P1 read-only, write P2 di balik toggle admin. **C.** P2 (A2).
- **Rekomendasi: B** (K8). **Alasan:** MCP adalah kontrak eksternal; menerbitkannya sebelum migrasi model A3 selesai berarti breaking change di depan mata. Tool API internal (A4§3.0) tetap didesain dari awal agar MCP tinggal "dibuka".

### D10 — Visibilitas beban kerja & kapasitas individu
- **Opsi:** **A.** Individu terlihat oleh semua anggota proyek. **B.** Hanya agregat tim. **C.** Individu terlihat oleh yang bersangkutan dan PM/Lead; anggota lain hanya melihat agregat + ketersediaan.
- **Rekomendasi: C**, dengan satu layanan kapasitas untuk Menu Tim (lintas proyek) dan Tab Team (irisan proyek) (K16). Peringatan burnout & rebalancing tetap P2. **Alasan:** PM butuh data individu untuk alokasi; transparansi penuh ke semua orang memicu perbandingan dan kesan pengawasan (A1§6.3).
- **Siapa:** **user/pemilik bisnis** (kebijakan SDM).

### D11 — Integrasi Git & card "commits"
- **Opsi:** **A.** Integrasi GitHub/GitLab sudah ada → pertahankan card commits, F5 menjadi peningkatan. **B.** Belum ada → sembunyikan card commits sampai F5 (P1). **C.** Hapus konsep commits dari Retro.
- **Rekomendasi: B** sampai fakta dikonfirmasi; F5 tetap P1 dengan PR merged & lead time sebagai metrik (A2#49). **Siapa:** **user** (repo apa yang dipakai, sumber data commits saat ini).

### D12 — Standar skala effort & kapasitas acuan
- **Opsi:** **A.** S ≤ 1 minggu, M 2–4 minggu, L > 4 minggu, dalam **engineer-minggu** (1 engineer full-stack), desain/QA terpisah. **B.** Skala A1 (S ≤ 2 minggu, untuk tim 2–3 engineer). **C.** Story point.
- **Rekomendasi: A.** **Alasan:** dua dari tiga laporan yang mendefinisikan skala sudah memakainya, dan engineer-minggu bisa dijumlah langsung terhadap kapasitas. **Siapa:** orkestrator; **user** mengonfirmasi ukuran tim aktual.

### D13 — Time tracking / data aktual untuk kalibrasi
- **Opsi:** **A.** Tambah pencatatan jam aktual ringan (opsional per task). **B.** Pakai **cycle time** (`started → done`) sebagai proxy, tanpa time tracking. **C.** Tanpa kalibrasi; estimasi AI apa adanya.
- **Rekomendasi: B.** **Alasan:** time tracking menambah beban input dan sensitif secara budaya; cycle time sudah ada dari log status dan cukup untuk forecast/kalibrasi kasar.

### D14 — Status update stakeholder AI (A2-F4)
- **Opsi:** **A.** P0 dengan kanal eksternal (A2). **B.** P1, mulai dari in-app + email, wajib approval Lead. **C.** P2.
- **Rekomendasi: B.** **Alasan:** health v1 + ringkasan 3 kalimat di Overview (P0) sudah memberi 80% nilai bagi stakeholder internal; pengiriman ke pihak eksternal butuh izin (D6), filter konten internal, dan kebijakan data (D3) yang belum siap di P0.

### D15 — Strategi mobile
- **Opsi:** **A.** Responsive web + **PWA** (capture, Fokus, quick-add, approval Inbox) di P0, native P2. **B.** Native app sejak awal. **C.** Desktop-only di P0.
- **Rekomendasi: A.** **Alasan:** capture rapat dan foto whiteboard hampir selalu dari HP; native menggandakan effort; C mematikan fitur andalan note.md.

### D16 — Penamaan menu & bahasa label
- **Opsi:** **A.** Bahasa Indonesia penuh (Beranda, Proyek, Pekerjaan, Rapat & Events, Tim & Kapasitas, Inbox). **B.** Istilah Inggris (Home, Projects, Work Items, Meetings, Team). **C.** Campuran sesuai kebiasaan tim (mis. "Tasks", "Ticket").
- **Rekomendasi: A** untuk menu, istilah teknis (QC, Inbox, Retro) dibiarkan. Satu glosarium istilah dipakai juga untuk prompt AI (A2§5 risiko bahasa). **Siapa:** user (preferensi tim).

### D17 — Urutan gelombang P0 (konsekuensi D2)
- **Pertanyaan:** P0 ramping (§5.3) masih ±75–80 engineer-minggu. Bagaimana menyesuaikannya dengan kapasitas?
- **Opsi:** **A.** Pecah jadi dua gelombang: **P0a** (fondasi Work Item, Beranda, Inbox minimal, triage + duplikat, izin) lalu **P0b** (Rapat AI, Rencana + Health v1, Planner v1); MVP ±4–5 bulan dengan 4–5 engineer. **B.** Tambah kapasitas agar semua P0 masuk ±3 bulan. **C.** Geser P0b ke P1.
- **Rekomendasi: A.** **Alasan:** P0b bergantung pada skema P0a (task.phaseId, status, source=meeting_note). Mengerjakan keduanya paralel di atas skema yang belum stabil adalah sumber rework terbesar. C memundurkan janji AI eksplisit di note.md (notulensi) terlalu jauh.
- **Siapa:** **user** (anggaran & tenggat).

### Ringkasan keputusan
| ID | Topik | Rekomendasi | Perlu input user? |
|---|---|---|---|
| **D1** ⭐ | Work Item terpadu + kind/status + definisi Tiket | A (+ Tiket = source intake, label "Ready for QC") | Ya (tim QA, makna "ticket") |
| **D2** ⭐ | Cakupan P0 AI | B, P0 ramping + satu engine | Ya (kapasitas) |
| **D3** ⭐ | Kebijakan data AI & rekaman | A default, B opsi workspace | **Ya + legal** |
| D4 | Konfirmator hasil rapat | A notulis + hak koreksi PIC | Tidak |
| D5 | Model agen | A delegate | Tidak |
| D6 | Peran & izin | A (role workspace + Lead sebagai atribut) | Tidak |
| D7 | Status task dari rapat | B | Tidak |
| D8 | Planner P0 | B, teks saja | Tidak |
| D9 | MCP | B, P1 read-only | Tidak |
| D10 | Visibilitas beban individu | C | **Ya** (kebijakan SDM) |
| D11 | Git/commits | B sampai dikonfirmasi | **Ya** |
| D12 | Skala effort | A engineer-minggu | Ya (ukuran tim) |
| D13 | Kalibrasi estimasi | B cycle time | Tidak |
| D14 | Status update AI | B, P1 | Tidak |
| D15 | Mobile | A, PWA | Tidak |
| D16 | Penamaan menu | A, Bahasa Indonesia | Ya (preferensi) |
| D17 | Gelombang P0 | A, P0a → P0b | **Ya** (anggaran) |

---

## 5. Usulan konsolidasi

> Berlaku jika rekomendasi D1–D17 diterima. Jika orkestrator memilih opsi lain, bagian yang terdampak ditandai dengan ID keputusannya.

### 5.1 Navigasi / IA final yang direkomendasikan

**Sidebar (6 menu, sebelumnya 7):**

```
┌───────────────────────────────┐
│ ⌘K  Cari / perintah            │  P0: navigasi & cari keyword · P1: NL → filter & tanya-jawab (D2)
│ ＋  Buat cepat                  │  quick-add teks (P0) · foto/voice (P1)
├───────────────────────────────┤
│ 🏠 Beranda                      │  ← Menu Ringkasan
│ 📥 Inbox            (badge)    │  ← Aktivitas terbaru + persetujuan AI (baru)
│ 📁 Proyek                      │  ← Menu Proyek
│ ✅ Pekerjaan                    │  ← Menu Tasks + Ticket + Pengembangan (D1)
│    ├ Tugas saya                │
│    ├ Tiket        (Triage│Berjalan)  ← shortcut menu Ticket lama (K4)
│    ├ Ide & Pengembangan        │  ← shortcut menu Pengembangan lama
│    ├ Menunggu QC               │
│    ├ Semua                     │
│    └ View tersimpan…           │
│ 📅 Rapat & Events               │  ← Menu Events
│ 👥 Tim & Kapasitas              │  ← Menu Tim
├───────────────────────────────┤
│ 🗑 Sampah · ⚙ Pengaturan        │  Pengaturan: Workspace · Peran & izin · AI & Data · Integrasi · Notifikasi
└───────────────────────────────┘
```

**Isi per menu:**

| Menu baru | Isi utama | Asal (note.md → laporan) |
|---|---|---|
| **Beranda** | Briefing harian AI (Harian/Mingguan) · **Fokus Saya** (satu daftar, chip alasan: Telat/Segera/Mandek/Memblokir/Menunggu saya; mode *Per tenggat*) · Agenda hari ini & besok · Proyek saya + health chip · KPI strip ≤ 4 khusus PM | 14 widget Ringkasan → A1§4.1 |
| **Inbox** | *Butuh aksi* (mention, assignment, persetujuan hasil rapat/triage/agen) · *Untuk diketahui* (dibundel per item) · digest (P1) | R13 + T4 → A1-N5, A4§3.6 (K6, K13) |
| **Proyek** | Bar segmen status + chip health · filter (Saya/Semua, prioritas, Lead/Anggota) · **Urutkan** · view List (default) / Grid / Timeline portofolio · **Proyek baru** (Kosong · Dari cerita (AI) · Dari template) · Library template | A2§3.1 |
| ↳ **Detail Proyek** | Header: status · health (▸ kenapa) · Lead · deadline · Extended ×N · **Tabs: Overview \| Pekerjaan \| Rencana \| Tim \| Retro** | 7 tab → 5 tab (A2§4.1) |
| ↳ Overview | Ringkasan AI 3 kalimat · Progres vs waktu · Berikutnya (fase/milestone) · Risiko & blocker · Keputusan terbaru (P1) · Insights (throughput, donut) | A2#21–30, K25 |
| ↳ Pekerjaan | Komponen yang sama dengan menu Pekerjaan, scope terkunci ke proyek | A2#29, A3-L1 |
| ↳ Rencana | Timeline + stepper fase & milestone (task ber-`phaseId`) · list alternatif · Riwayat jadwal (extensions) · Baseline (P1) | Milestone + Phases + Extensions → A2§2.2–2.3 |
| ↳ Tim | Anggota + role (Lead ditandai) · beban & kapasitas irisan proyek (P1) · Agen terdelegasi (P1) | A2#34, K16, D5 |
| ↳ Retro | Per fase/periode · kartu metrik (commits disembunyikan tanpa repo, D11) · Retro AI (P1) · simpan & action item | A2#43–51 |
| **Pekerjaan** | Satu list universal · saved views bawaan · filter bar terpadu · chip hitungan (open/overdue/unassigned/blocked/stale) · layout List/Board/Table/Timeline · bulk actions · import wizard · export · satu halaman detail (checklist, komentar, evidence + purpose, relasi, aktivitas lengkap, panel triage/ide/agen) | A3§6 |
| **Rapat & Events** | Tab Mendatang / Lampau / Kalender (list + kalender; grid dihapus) · detail event · **Capture** (rekam/upload/foto/tempel transkrip/ketik) · **Hasil Rapat** (review & konfirmasi) · tab **Keputusan** (Decision Log lintas proyek, P1) | A1§4.3 |
| **Tim & Kapasitas** | Kapasitas tertimbang lintas proyek (P1) · ketersediaan (P1) · Direktori (+ keahlian) · feed aktivitas tim + digest (P1) | A1§4.2, D10 |

**Perubahan dari IA lama:** Ringkasan → Beranda; Tasks + Ticket + Pengembangan → Pekerjaan (2 shortcut tetap ada); Inbox baru sebagai menu tingkat atas; tab Detail Proyek 7 → 5; Sampah dan Pengaturan AI/Data/Izin menjadi global.

### 5.2 Daftar REMOVE final

Hanya yang benar-benar **dihapus**. Yang dilebur ke tempat lain dicantumkan di 5.2b supaya tidak dibaca sebagai fitur hilang.

| # | Yang dihapus | Sumber | Pengganti | Kapan |
|---|---|---|---|---|
| X1 | **Tombol refresh** (Proyek, Tasks, Ticket, Pengembangan, Retro) | A2#2/#44, A3-L2, A4-U3 | Muat ulang saat tab kembali fokus (P0) → sinkronisasi real-time + indikator "ada X update" (P1) | Saat P1 real-time aktif |
| X2 | **Toggle comfy / dense** | A2#16 | Grid responsif otomatis | P0 |
| X3 | **Grid view Events** | A1-E6 | List + Kalender (+ tampilan minggu) | P0 |
| X4 | **Grid view Milestone/Phases** | A2#38 | Timeline + stepper, list sebagai alternatif aksesibel | P0 |
| X5 | Widget **Snapshot minggu ini** | A1-R9 | Briefing mingguan | P0 |
| X6 | Widget **Ditutup 14 hari** | A1-R6 | Briefing mingguan + Retro | P0 |
| X7 | **Daftar "online sekarang" real-time** | A1-T2, A4-U13 (K15) | Status ketersediaan (P1); presence kontekstual (P2) | P0 |
| X8 | Kind **`ticket`**, **`qc`**, **`pengembangan`** (dan ejaan `bugs`) | A3§4.1 (D1) | Tiket = `source` intake; QC = status `in_review` + reviewer; tag `qa` | P0 (dengan migrasi) |
| X9 | Status **`reopened`** | A3§4.1 | Flag `reopen_count` + badge "Dibuka ulang" | P0 |
| X10 | **"Overdue" sebagai status / kartu status** | A2#32, A3§3.2 | Kondisi turunan (`due_at < now`) sebagai chip & badge | P0 |
| X11 | Label health **Overdue / Delayed / At Risk** (tanpa rumus) | A2#11 | Health dihitung On track / At risk / Off track + badge Overdue, Extended ×N | P0 |
| X12 | **Ranking "Top contributors"** di Retro | A2#50 | Kontribusi tim tanpa peringkat | P1 |
| X13 | Kartu **"Top assignees open"** (definisi creator/assignee tertukar) | A2#31, A3-L17 | Beban per anggota di Tab Tim (P1) | P0 |
| X14 | Opsi status **Completed/Cancelled saat membuat proyek** | A2#4 | Saat create hanya Draft/Active | P0 |
| X15 | **Template fase hardcoded** (planning/dev/testing/release) | A2#37 | Template proyek bawaan "Software delivery" + 1 template generik (C11) | P1 |
| X16 | **Tag pada Fase** | Reviewer (C1) | — (cari via nama fase) | P2 |
| X17 | **Status event "selesai" yang diisi manual** | A1-E10 | Status diturunkan dari waktu + "Dibatalkan" manual | P1 |
| X18 | Teks/perilaku **"auto memilih project"** di view global | A3-L7, A3§3.3-2 | Proyek dipilih manual di view global; otomatis hanya di dalam proyek | P0 |
| X19 | **Filter "recently updated"** yang sebenarnya sort tenggat | A2#15 | Kontrol **Urutkan** (Terakhir diperbarui, Deadline, Health terburuk, Dibuat, Nama) | P0 |

**5.2b — Digabung (bukan hilang), untuk referensi wireframe:** 9 widget Ringkasan → Fokus Saya / KPI strip PM / Proyek saya (A1§3) · Aktivitas tim + Aktivitas terbaru → Inbox & feed tim · Menu Ticket & Pengembangan → saved view di Pekerjaan · 4 form → 1 composer · 4 importer CSV → 1 import wizard · 3 halaman detail → 1 · trash per proyek → Sampah global · kartu quick/status/health → bar segmen · kartu Overview Members/Team, Tasks/Task progress, Timeline/Dates → blok Progres & Jadwal · tombol Dashboard tab Tasks → Insights di Overview · tab Milestone + Phases + Extensions → tab Rencana · group-by-tag → kontrol Tampilan Events · kartu ringkasan + attention filter (Ticket/Ide) → chip hitungan.

### 5.3 Daftar ADD-AI P0 final

**Prinsip seleksi:** (1) memenuhi janji AI eksplisit di note.md (proyek dari cerita, notulensi foto/voice → hasil rapat), (2) menggantikan fitur yang dihapus/digabung sehingga harus ada di rilis pertama, (3) human-in-the-loop sudah jelas, (4) memakai satu pipeline/engine bersama.

| # | Fitur ADD-AI P0 | Sumber | Batas P0 (yang **tidak** termasuk) | Human-in-the-loop | Gelombang | Effort* |
|---|---|---|---|---|---|---|
| AI-0 | **Fondasi AI minimal** (prasyarat, berlabel [ADD]): routing penyedia, meter & plafon token per workspace/fitur, kill switch/circuit breaker, **AI Action Log**, tabel `AISuggestion`, golden set evaluasi | A4§3.0/§6.3, A3§4.2, R7, R8 | Tanpa BYO key, tanpa redaksi PII otomatis lanjutan (P1), tanpa dashboard biaya lengkap (P1) | Admin bisa mematikan per fitur | P0a | M (±5) |
| AI-1 | **Briefing harian Beranda**: 3–5 poin dari angka deterministik, setiap poin menautkan item; mode mingguan menggantikan Snapshot & Ditutup 14 hari | A1-N1, A4-U5 | Kirim ke email/chat (P1); digest tim (P1) | Hanya baca; "tidak ada yang mendesak" adalah output sah | P0a | M (3) |
| AI-2 | **AI Triage (saran kind & priority + proyek)** untuk item `triage`, mode Suggest (L1), dengan confidence & alasan | A3-F2, A4-U10 | Saran assignee (P1); auto-apply (P1, opt-in) | Accept/decline per saran; tercatat di `AISuggestion` | P0a | S–M (2) |
| AI-3 | **Deteksi duplikat** saat membuat item dan saat triage (embedding, indeks yang sama dengan pencarian semantik P1) | A3-F3, A4§3.7 | Panel Related & cari semantik (P1) | Tidak pernah auto-close; "tandai duplikat" butuh klik | P0a | M (3) |
| AI-4 | **Quick-add bahasa alami (teks)**: satu kalimat → draf item terisi | A4-U2, A3-F4 (bagian teks) | Screenshot & voice (P1) | Draf selalu dikonfirmasi; masuk `triage` jika proyek tidak pasti | P0a | S (1) — **kandidat pertama dipotong** |
| AI-5 | **Capture & draf notulensi**: upload/rekam audio (STT) + foto whiteboard (OCR) + tempel transkrip → draf notulensi terstruktur | A1-N11a/b/c, A4-U16 | Bot ikut rapat (P2); diarization otomatis (P1, label pembicara bisa diisi manual) | Consent wajib sebelum rekam (N20, D3); pratinjau & crop foto | P0b | L (±6) |
| AI-6 | **Ekstraksi Hasil Rapat** (Action item / Keputusan / Pertanyaan / Informasi) dengan **kutipan bukti + confidence**, PIC/tenggat kosong jika tidak disebut, lalu layar **Review & Konfirmasi** → task (D7) | A1-N12/N13, A4§3.3 Notulen | Deteksi duplikat dengan task yang ada (P1); recap otomatis (P1); Decision Log penuh (P1, P0 disimpan sebagai item) | Konfirmasi per item; bulk hanya untuk confidence Tinggi; item tanpa bukti tidak ditampilkan | P0b | M–L (±5) |
| AI-7 | **Planner v1 "Proyek dari cerita"**: teks → draf fase, milestone, task (+ estimasi kasar), risiko, asumsi → review per item (terima/ubah/buang/regenerate bagian) → create; opsi "simpan sebagai template" | A2-F1 (dipersempit, D8) | Input dokumen/voice/repo, saran assignee, kalibrasi estimasi (P1) | Draf, tidak pernah auto-create | P0b | M (±4) |

\* Effort dalam engineer-minggu (skala D12). Total ADD-AI P0 ≈ **±29 engineer-minggu**.

**Prasyarat non-AI P0 (bukan ADD-AI, tapi wajib agar AI-1…AI-7 berfungsi):** model Work Item + state machine + migrasi (A3) · satu list/detail/composer + saved views + bulk + keyword search + Sampah global · import wizard non-AI · **Fokus Saya** (mesin sinyal deterministik, A1-N2) · Inbox minimal + watcher + preferensi notifikasi (C9, C10) · matriks izin & role workspace (R1, D6) · Health v1 rule-based + Overview baru + tab Rencana dengan `phaseId` (A2) · consent/retensi/audit item AI (A1-N20/N21) · PWA responsif (D15) · aksesibilitas dasar (R6) · feature flag & rencana rollout (R12). Estimasi kasar reviewer **±47 engineer-minggu**, sehingga **P0 total ±75–80 engineer-minggu** (lihat D17).

**Sengaja diturunkan ke P1 (dengan alasan singkat):**

| Fitur | Diusulkan sebagai P0 oleh | Alasan turun |
|---|---|---|
| ⌘K/Copilot NL → filter & tanya-jawab; aksi tulis lewat ⌘K (P2) | A4 | Engine bersama perlu skema stabil; aksi tulis butuh preview diff & izin matang (K7) |
| Pencarian semantik UI + Related | A4 | Indeks sudah dibangun untuk AI-3; UI menyusul (K12) |
| Insight card dengan kalimat AI | A4-U4 | Angka + Δ deterministik sudah memberi nilai (K20) |
| Smart Import dengan mapping AI | A4-U1 | Wizard non-AI + sample cukup untuk P0 (K11) |
| Status update stakeholder AI | A2-F4 | Butuh izin eksternal & kebijakan data (D14) |
| MCP server read-only | A4§3.4 | Kontrak eksternal di atas skema yang masih bermigrasi (D9) |
| Health v2 (penjelasan LLM, forecast) | A2-F2 | v1 rule-based dulu; Monte Carlo menunggu data (K14) |
| Digest AI (harian/mingguan/tim) | A4§3.6 | Inbox minimal dulu; hindari kanal dorong baru (R9) |

---

## 6. Catatan untuk fase berikutnya (workflow & wireframe)

1. **Jangan mulai wireframe Pekerjaan, Proyek > Pekerjaan, dan Rapat > Hasil Rapat sebelum D1, D3, D6, dan D7 diputuskan.** Ketiganya bergantung pada enum status, izin, dan alur konfirmasi.
2. Wireframe yang **bisa dimulai sekarang** (risiko rework rendah): Beranda (A1§4.1 sudah matang), Detail Proyek tab Rencana & Overview (A2§4.1), layar Review Hasil Rapat (A1§4.3, asalkan D4 = A).
3. Workflow yang perlu digambar sebagai diagram: (a) state machine Work Item (A3§5.2, setelah koreksi K4); (b) siklus rapat sebelum → capture → review → hasil → recap (A1§4.3); (c) Planner draf → review → create (A2-F1); (d) triage tiket: intake → saran AI → terima/duplikat/tolak; (e) extend deadline dengan alasan wajib + impact preview (A2§2.3).
4. Setiap layar AI di wireframe wajib menampilkan: sumber/kutipan, confidence, tombol terima/ubah/tolak, status "draf AI", dan fallback saat AI tidak tersedia (R7).
5. Gunakan glosarium status/kind tunggal (K2) di semua wireframe dan dokumen workflow.

## 7. Asumsi reviewer

1. Estimasi engineer-minggu di §0, §5.3, dan D17 adalah **perkiraan kasar reviewer** dengan bobot S = 1, M = 3, L = 6 engineer-minggu yang diterapkan pada label effort analis, setelah mengurangi duplikasi antar laporan. Angkanya dipakai untuk menunjukkan orde besaran, bukan komitmen.
2. Kapasitas acuan 3–5 engineer × ±13 minggu diambil dari asumsi A4 (§5); ukuran tim nyata belum diketahui.
3. Klaim tentang produk pihak ketiga (Linear, Rovo, Asana, Notion, Plane, ClickUp, monday) diambil dari laporan analis dan **tidak diverifikasi ulang** oleh reviewer.
4. Rujukan UU PDP No. 27/2022 (hak hapus, DPIA) mengikuti laporan analis dan memerlukan **verifikasi legal**.
5. Tidak ada data penggunaan nyata (berapa sering tiap widget/menu dibuka). Rekomendasi hapus/gabung berbasis analisis struktur, sehingga validasi dengan analytics atau wawancara user tetap disarankan sebelum X5–X7 dan X12 dirilis.
