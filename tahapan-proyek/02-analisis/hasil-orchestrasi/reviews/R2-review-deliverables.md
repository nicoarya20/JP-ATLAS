# R2 — Review QA Desain atas Deliverables Workflow & Wireframe

> **Tanggal:** 5 Oktober 2026 · Run `run_16f58567a2c7` · Task `task_e5b1064caf4c`
> **Peran:** Reviewer QA Desain (Principal Designer + Staff Engineer). Laporan ini hanya **menilai**, tidak ada file deliverable yang diubah.
> **Sumber kebenaran:** `orchestration/DECISIONS.md` (D1–D17, E1–E4, glosarium, IA final). Pendukung: `note.md`, `reviews/R1-review-analisis.md` §3, §5–§6, `orchestration/BRIEF.md`.
> **Target:** `deliverables/workflow.md` (+ `workflow.html`), `deliverables/wireframes/01-beranda-proyek.html` (S1–S13), `deliverables/wireframes/02-pekerjaan-rapat-tim.html` (P1–P16), keduanya memakai `wf.css`.

## Ringkasan eksekutif

- **Verdict: PERLU REVISI** (revisi terarah, ±1–2 hari kerja). Ada **0 Blocker · 12 Major · 20 Minor**.
- Ketiga deliverable kuat. Glosarium dipakai persis (tidak ada sisa *open/closed/ready for QC/overdue/at risk* di UI). IA dan nama menu sidebar identik di ketiga file. Semua aturan E2/E3/D7/D10 tergambar. Validitas teknis bersih: 0 tag tak tertutup, 0 anchor rusak, 21/21 diagram Mermaid lolos parser resmi `mermaid@11`, dan `workflow.html` setara 1:1 dengan `workflow.md`.
- Masalah utamanya **konsistensi lintas-file**, bukan kualitas per file. Workflow dan dua wireframe ditulis paralel, dan beberapa aturan berbeda: state machine W-1 tidak memuat transisi yang dipakai W-6/D7, arti "Tolak" di triage, izin Guest/Viewer, bottom bar mobile (3 versi), fase rilis Export CSV/intake portal, KPI ke-4, opsi geser jadwal di dialog deadline, metrik individu di Retro, dan contoh hitungan Health yang salah penyebut. Ada juga beberapa alur P0 yang belum punya layar: Laporkan tiket/Guest, Sampah, Pengaturan › Notifikasi & Peran, dan catatan Retro manual.
- Semua Major bisa diperbaiki dengan menyunting teks/anotasi. Tidak ada keputusan produk baru yang dibutuhkan, kecuali dua pilihan yang saya tandai "pilih salah satu" (KPI ke-4 dan isi bottom bar).

---

## 1. Skor per deliverable (1–10)

| Kriteria | `workflow.md` (+ `.html`) | `01-beranda-proyek.html` | `02-pekerjaan-rapat-tim.html` |
|---|---|---|---|
| **Kejelasan** | **9**: format 7 bagian konsisten di W-0…W-10, tabel transisi T1–T12, guard backend eksplisit | **9**: anotasi bernomor + catatan per layar, state valid/validasi digambar (S10) | **9**: state interaktif (bulk bar, drag guard, dropdown promote), varian fallback |
| **Kesesuaian DECISIONS** | **8**: D1–D17/E1–E4 tercermin; dua celah di state machine (ide → Selesai, item rapat tanpa prioritas → Terbuka) | **7**: Guest "hanya Viewer" (bertentangan A-03), metrik individu di Retro (R13/W-9), contoh E3 salah penyebut | **7**: "Tolak" ganda makna, izin Tutup tiket/komentar Viewer berbeda, AI-5 di L2 |
| **Kelengkapan** | **8**: 11 alur + matriks izin + roadmap + 34 asumsi; belum ada pemetaan alur → ID layar | **7**: Sampah, Pengaturan (non-AI), Guest, dan edit/hapus fase/milestone tidak digambar | **7**: Laporkan tiket, sub-tab Berjalan, aksi triage Minta info/Teruskan, form buat event tidak digambar |
| **Konsistensi lintas-file** | **6** | **6** | **5**: persona berbeda dari file 01, bottom bar berbeda, Export P1, undo 7 hari |
| **Kesiapan dipakai engineering** | **8**: bisa langsung dipecah jadi tiket; perlu menambah T13 dan menyamakan istilah | **7** | **7** |
| **Rata-rata** | **7,8** | **7,2** | **7,0** |

Catatan `workflow.html`: render setara penuh. 21/21 blok Mermaid identik dengan `.md` setelah unescape, 23/23 tabel dibungkus `.table-scroll`, 21 diagram di `figure.diagram` + `diagram-scroll`, 38 penanda ASUMSI dirender sebagai badge, tema gelap memakai token `:root`. Satu ketergantungan: Mermaid dimuat dari `cdn.jsdelivr.net`, dan saat offline fallback menampilkan teks sumber (sudah ditangani `#mermaidStatus`). Skornya sama dengan `.md`.

---

## 2. Matriks keterlacakan `note.md` → nasib → lokasi

Legenda nasib: **KEEP** · **MODIFY** · **MERGE** · **REMOVE** (ID X dari R1§5.2) · **ADD**. Lokasi: alur `W-x`, layar `S#` (file 01) / `P#` (file 02).
Penanda: ✅ terlacak dan terlihat · ⚠️ terlacak tetapi **tanpa layar**, **tergradasi ke P1 tanpa keputusan**, atau **berbeda antar file** · ❌ **hilang tanpa jejak**.

### 2.1 Menu Ringkasan (14 widget)

| # | Fitur note.md | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| R-01 | Proyek aktif | MERGE → Proyek saya + chip health | W-7 · S2, S3 | ✅ |
| R-02 | Task terbuka | MERGE → KPI "Pekerjaan aktif" (PM), chip hitungan | W-7 · S3, P1 | ✅ (lihat M12: label chip) |
| R-03 | Bug terbuka | MODIFY → KPI "Bug Kritis terbuka" (PM saja) | W-7 · S3 | ⚠️ cakupan menyempit (semua bug → Kritis); Member tidak lagi punya hitungan bug di Beranda. Bisa diterima, tapi tidak dicatat sebagai keputusan |
| R-04 | Ditugaskan saya | MERGE → Fokus Saya + saved view Tugas saya | W-7 · S2, P1 | ✅ |
| R-05 | Status task saya | MERGE → filter chip Fokus + Kelompokkan Status | W-7 · S2, P1 | ✅ |
| R-06 | Ditutup 14 hari | REMOVE X6 → Briefing Mingguan + Retro | W-7, W-9 · S2, S12 | ✅ |
| R-07 | Jadwal task (bucket tenggat) | MERGE → Fokus mode "Per tenggat" | W-7 step 7 · S2 | ✅ |
| R-08 | Perlu perhatian kamu (top 5) | MERGE → Fokus Saya (chip Telat) | W-7 · S2 | ✅ (W-7: 7 teratas; S2 menampilkan 6, tidak masalah) |
| R-09 | Snapshot minggu ini | REMOVE X5 → Briefing Mingguan | W-7 · S2 | ✅ |
| R-10 | Jatuh tempo 7 hari (early warning) | MODIFY → chip Segera (≤ 2 hari kerja) + bucket "Minggu ini" | W-7 · S2 | ⚠️ horizon 7 → 2 hari; ambang oranye P1 berbeda (≤ 3 hari), lihat m5 |
| R-11 | Ghost reminder (in progress 3 hari) | MODIFY → Mandek (> 7 hari, D1) | W-1 flag · S2, P1 | ✅ (01-Asumsi mencatat 3 → 7) |
| R-12 | Events mendatang 7 hari (merah jika hari ini) | MODIFY → Agenda hari ini & besok; sisanya di Rapat & Events | W-3, W-7 · S2, P9 | ✅ |
| R-13 | Aktivitas terbaru | MERGE → Inbox (Untuk diketahui) | W-8 · S4 | ✅ |
| R-14 | Proyek kamu (maks 5) | KEEP/MODIFY → Proyek saya + health | W-7 · S2, S3 | ✅ |

### 2.2 Menu Proyek

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| PR-01 | Search projects | KEEP (+ ⌘K P0, NL P1) | W-0 · S5, P14 | ✅ |
| PR-02 | Tombol refresh | REMOVE X1 | S1, S5 catatan | ✅ |
| PR-03 | New project (a) form: nama, deskripsi, status, prioritas, assignee, timeline + pintasan | MODIFY (status Draft/Active E4/X14; assignee → Lead + anggota) | W-4 · S6 | ✅ |
| PR-04 | (b) Buat dari cerita (AI) + checklist jadikan template | MODIFY → Planner v1 AI-7 (D8) | W-4 · S7 | ✅ |
| PR-05 | (c) Template project | KEEP/MODIFY → Dari template + Library | W-4 · S5, S6 | ✅ |
| PR-06 | Card quick | MERGE → bar segmen status | S5 | ✅ |
| PR-07 | Card status | MERGE → bar segmen status | S5 | ✅ |
| PR-08 | Card health (Overdue/At Risk/Delayed) | MODIFY X11 → Health v1 E3 + badge Telat | W-5 · S5, S13 | ✅ |
| PR-09 | Filter Proyek saya / Semua | KEEP | S5 | ✅ |
| PR-10 | Any priority (typo "Cartical") | KEEP (typo diperbaiki) | S5 | ✅ |
| PR-11 | Any user | MODIFY → Orang: Lead/Anggota | S5 | ✅ |
| PR-12 | Recently updated (sebenarnya sort tenggat) | REMOVE X19 → Urutkan | S5 | ✅ |
| PR-13 | Comfy/dense | REMOVE X2 | S5 | ✅ |
| PR-14 | Grid / List / Timeline view | KEEP (List default) | S5 | ✅ |

### 2.3 Detail Proyek (7 tab → 5 tab)

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| DP-01 | Overview: card members, tasks, milestones, timeline, dates, task progress, team | MERGE → header + Progres vs waktu + Berikutnya; team → tab Tim | W-5 · S8, S11 | ✅ |
| DP-02 | Tab Tasks (seluruh list/filter/view) | MERGE → tab Pekerjaan (komponen = menu Pekerjaan) | W-1 · S8 #5 → P1–P6 | ✅ |
| DP-03 | Tombol dashboard: total, open, closed, overdue, throughput 14 hari, donut status | MERGE → Insights Overview | S8 | ✅ |
| DP-04 | Card top assignees open | REMOVE X13 | S3, S8, S11 catatan | ✅ |
| DP-05 | Button trash (30 hari) | MERGE → Sampah global | W-1 (aturan umum) · nav S1 | ⚠️ **tanpa layar**: tidak ada wireframe Sampah (lihat M11) |
| DP-06 | New task single (+ kind bug/qc/ticket/idea) | MERGE → composer; kind qc/ticket REMOVE X8 | W-1 · P7 | ✅ |
| DP-07 | Bulk CSV + download sample + paste | MERGE → Import wizard | P8 | ✅ |
| DP-08 | Filter scope/kind/status/priority, urutan | MERGE → filter bar terpadu + Urutkan | P1 | ✅ |
| DP-09 | View kanban / table / gantt | KEEP/MODIFY (Board/Table/Timeline) | P2, P3 | ✅ |
| DP-10 | Tombol download CSV | KEEP (A3-L13) | Matriks izin W (✅ semua role internal) · P1/P2 "Export CSV **P1**" | ⚠️ **turun ke P1 di wireframe tanpa keputusan** (M5) |
| DP-11 | Tombol select (pilih semua) | MERGE → bulk action bar | P1 | ⚠️ kontrol "pilih semua" tidak digambar (m13) |
| DP-12 | Detail task: judul, deskripsi, tab checklist/komentar/evidence/deps/aktivitas | KEEP/MODIFY (evidence ber-tujuan, Relasi) | W-1 · P6 | ✅ |
| DP-13 | Ubah status (open/inprogress/reopened/closed) | MODIFY → state machine D1 | W-1 · P6, P2 | ✅ |
| DP-14 | Pengaturan kind/prioritas/assignee, planning, tags | KEEP | P6 | ✅ |
| DP-15 | Tab Team: owner + member + role PM/Member/Viewer | MODIFY → D6 (Lead ★) | Matriks izin · S11 | ✅ |
| DP-16 | Tab Milestone: view list/grid | MERGE → Rencana; grid REMOVE X4 | W-5 · S9 | ✅ |
| DP-17 | Tambah / edit / hapus milestone | MERGE → Rencana | W-5 (step 2, guard hapus fase) · S9 "+ Milestone" | ⚠️ edit/hapus milestone tidak digambar (m13) |
| DP-18 | Tab Phases: template planning/dev/testing/release | REMOVE X15 → template bawaan P1 | W-4 · S9 catatan | ✅ |
| DP-19 | Phases view list/grid/stepper | MERGE (grid X4) | S9 | ✅ |
| DP-20 | Tambah/edit fase (+ tag fase) | MERGE; tag REMOVE X16 | W-5 · S9 | ✅ (edit tidak digambar) |
| DP-21 | Detail fase | MODIFY → drawer (R1 C2, P0) | — | ⚠️ **tanpa layar & tanpa langkah workflow** (m13) |
| DP-22 | Mulai fase / selesaikan fase / hapus fase | KEEP (saran berbasis aturan); hapus → "Tanpa fase" | W-5 Diagram 1 + guard · S9 #4 | ✅ (hapus tidak digambar) |
| DP-23 | Tab Extensions: jumlah extension | MODIFY → badge Diperpanjang ×N | W-5 · S8, S9 | ✅ |
| DP-24 | List riwayat extension | MERGE → Rencana › Riwayat jadwal | W-5 · S9 | ✅ |
| DP-25 | Extend deadline form (current/new, error "same", reason opsional) | MODIFY E2 (kategori + alasan wajib + impact preview) | W-5 · S10 | ✅ (opsi geser berbeda, M7) |
| DP-26 | Tab Retro: rentang 7/14/30/90, refresh, copy md, download .md | KEEP (refresh X1) + per fase | W-9 · S12 | ✅ |
| DP-27 | Card shipped/slipped/still blocked/new tasks/extensions | KEEP (definisi diperjelas) | W-9 · S12 | ✅ |
| DP-28 | Card commits | MODIFY D11 → empty-state Hubungkan repo | W-9 · S12 | ✅ |
| DP-29 | List shipped, deadline pushes | KEEP | W-9 · S12 | ✅ |
| DP-30 | Top contributors | REMOVE X12 → kontribusi tanpa peringkat (P1) | W-9 · S12 | ⚠️ S12 menampilkannya di P0 dengan angka per orang (M8) |

### 2.4 Menu Tasks + detail task

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| T-01 | Refresh | REMOVE X1 | P1 #4 | ✅ |
| T-02 | New task single / bulk CSV | MERGE → composer + import wizard | P7, P8 | ✅ |
| T-03 | Filter, urutan, view kanban/table/gantt, download, select | MERGE → Pekerjaan › Tugas saya / Semua | W-1 · P1–P3 | ✅ (download ⚠️ M5) |
| T-04 | Detail task (duplikat dari DP-12…14) | MERGE → satu Detail Work Item | P6 | ✅ |

### 2.5 Menu Ticket

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| TK-01 | Papan tiket lintas proyek untuk triage | MERGE → Pekerjaan › Tiket (Triage \| Berjalan), E1 | W-2 · P4, S4 | ✅ |
| TK-02 | Refresh | REMOVE X1 | P1 #4 | ✅ |
| TK-03 | Buat tiket single (kind default ticket, priority default medium) | MERGE → "＋ Buat cepat › Laporkan tiket" (W-2) | W-2 step 1 · **tidak ada di S1/P7** | ⚠️ **tanpa layar**; composer hanya punya Tugas/Bug/Ide (M10) |
| TK-04 | Bulk CSV tiket + import | MERGE → Import wizard | P8 | ⚠️ item hasil import ber-`source=import`, sehingga tidak lagi terhitung sebagai "Tiket" (m20) |
| TK-05 | Card open/overdue/unassigned/blocked/stale > 7d | MERGE → chip hitungan | P4 | ✅ |
| TK-06 | Filter search/project/status/priority/assignee | MERGE → filter bar | P4 | ⚠️ P4 hanya punya Cari, Proyek, Kanal, Urutkan (m12) |
| TK-07 | Attention filter cepat | MERGE → chip hitungan | P4 | ✅ |
| TK-08 | Tabel tiket (task, project, status, priority, assignee, due merah, age) | KEEP/MODIFY | P4 (Triage); Berjalan hanya teks | ⚠️ sub-tab Berjalan tidak digambar (M11) |
| TK-09 | Detail ticket | MERGE → Detail Work Item | P6 | ✅ |

### 2.6 Menu Pengembangan

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| PG-01 | Catatan ide lintas proyek, ditinjau berkala, dinaikkan jadi task | MERGE → Pekerjaan › Ide & Pengembangan + **ADD** Promote A/B/C | W-6 · P5 | ✅ (state machine ⚠️ M1) |
| PG-02 | Refresh | REMOVE X1 | — | ✅ |
| PG-03 | Catat ide single (kind idea, priority default medium) | MERGE → composer jenis Ide | W-6 · P5, P7 | ✅ |
| PG-04 | Bulk CSV ide | MERGE → Import wizard | P8 | ✅ |
| PG-05 | Card open/unassigned/stale | MERGE → chip hitungan | P5 | ✅ |
| PG-06 | Filter + attention | MERGE | P5 | ⚠️ filter Prioritas/Assignee tidak ada (m12) |
| PG-07 | Tabel ide (… due, age kuning) | MODIFY (Pengusul, Umur; due disembunyikan untuk Ide) | P5, P7 | ✅ |
| PG-08 | Detail pengembangan | MERGE → Detail Work Item | P6 | ✅ |

### 2.7 Menu Tim

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| TM-01 | Filter proyek | KEEP | P13 | ✅ |
| TM-02 | Online sekarang | REMOVE X7 → Ketersediaan (P1) | P13, S11 | ✅ |
| TM-03 | Beban tim (urut beban/telat/nama) | MODIFY → Kapasitas tertimbang **P1** + D10 | P13, S11 | ⚠️ **di P0 tidak ada pengganti**: hitungan sederhana lama hilang sampai P1 (m14) |
| TM-04 | Aktivitas tim 7 hari | KEEP/MERGE | W-8 · P13 | ✅ |
| TM-05 | Direktori: nama, email, role, **jumlah task**, proyek bersama + role | KEEP (+ keahlian) | P13 | ❌ **kolom "jumlah task" hilang tanpa jejak** (tidak ada ID REMOVE, tidak dicatat); email jadi kondisional (dicatat) |

### 2.8 Menu Events

| # | Fitur | Nasib | Lokasi | Cek |
|---|---|---|---|---|
| EV-01 | Filter tag | KEEP | P9 | ✅ |
| EV-02 | Group: tag | MERGE → Kelompokkan (Hari/Tag/Proyek) | P9 | ✅ |
| EV-03 | Upcoming saja | MODIFY → tab Mendatang | P9 | ✅ |
| EV-04 | Buat event | KEEP (+ proyek, peserta tamu, flag Rahasia) | W-3 step 1 · P9 tombol | ⚠️ form buat event tidak digambar (m13), padahal field-nya memicu aturan consent D3 |
| EV-05 | View list / grid / calendar | KEEP list+kalender; grid REMOVE X3 | P9 | ✅ |
| EV-06 | Card event (judul, status, tag, waktu, lokasi, peserta, pembuat) | KEEP; status manual → X17 (P1) | P9 | ✅ |
| EV-07 | Edit & hapus event | KEEP | P10 (Edit, ⋯) | ✅ |
| EV-08 | Detail event (kembali, judul/status/tag, waktu, lokasi, proyek, pembuat, dibuat/diubah) | KEEP | W-3 · P10 | ✅ |
| EV-09 | Catatan/notulensi + rencana AI foto/voice → draf | MODIFY → Capture + AI-5 | W-3 · P10, P11, P16 | ✅ |
| EV-10 | Hasil Rapat dikonfirmasi (tugas/keputusan/informasi/pertanyaan) | MODIFY → AI-6 + review + D7 | W-3 · P12, S4 | ✅ |

### 2.9 ADD (tidak ada di note.md), cek keberadaan layar

| Fitur baru | Alur | Layar | Cek |
|---|---|---|---|
| Inbox (Butuh aksi / Untuk diketahui / persetujuan AI) | W-8 | S4, P16 | ✅ |
| Briefing harian AI-1 + Fokus Saya | W-7 | S2, S3, P16 | ✅ |
| ⌘K + ＋ Buat cepat (AI-4) | W-0 | S1, P7, P14 | ✅ |
| Triage + duplikat AI-2/AI-3 | W-2 | P4, P6, S4 | ✅ |
| Health v1 + override | W-5 | S13 | ✅ |
| Pengaturan › AI & Data (AI-0) | W-10 | P15 | ✅ |
| PWA (D15) | W-0 | S1, P16 | ⚠️ bottom bar berbeda (M4) |
| Sampah global | W-1 | — | ⚠️ tanpa layar (M11) |
| Pengaturan › Workspace / Peran & izin / Integrasi / Notifikasi | W-0, W-8, Matriks | — | ⚠️ tanpa layar; Notifikasi = P0 (C10) (M11) |
| Perjalanan Guest | W-0 Diagram 2 | — | ⚠️ tanpa layar (M10) |

**Rekap keterlacakan:** 94 baris fitur note.md. 1 ❌ hilang tanpa jejak (TM-05 "jumlah task" di direktori). 17 ⚠️: tanpa layar, turun ke P1 tanpa keputusan atau tanpa pengganti P0, berbeda antar file, atau terpangkas sebagian. Semua menu note.md (Ringkasan, Proyek, Detail Proyek a–h, Tasks, Ticket, Pengembangan, Tim, Events) tercakup.

---

## 3. Pemeriksaan konsistensi

### 3.1 Glosarium

| Konsep | workflow | 01 | 02 | Hasil |
|---|---|---|---|---|
| Status (Triage…Dibatalkan) | ✅ | ✅ | ✅ | Persis. Tidak ada sisa "open/in progress/closed/ready for QC/reopened" (grep = 0). |
| Jenis (Tugas/Bug/Ide) | ✅ | ✅ | ✅ | Persis; `ticket/qc` hanya muncul sebagai pesan error import (P8), dan itu benar. |
| Kondisi turunan (Telat/Terblokir/Mandek/Dibuka ulang) | ✅ | ✅ | ✅ | Persis, ditampilkan sebagai chip, bukan status atau kolom board. |
| Prioritas (Rendah…Kritis) | ✅ | ✅ | ✅ | Persis. "Cartical" hanya disebut sebagai typo yang diperbaiki. |
| Health (Sesuai jalur/Berisiko/Keluar jalur) | ✅ | ✅ | ✅ | Persis; tidak ada "On track/At risk/Off track" di UI. |
| Sumber (Manual/Tiket (intake)/Rapat/Import/Agen) | ✅ | ✅ | ✅ | Persis. |
| **Penyimpangan** | | | | (a) chip hitungan **"Terbuka 11/18"** di P1/P2 menghitung semua status aktif, sehingga label status dipakai untuk agregat (M12). (b) Status Milestone **"Pending"** (W-5) vs **"Menunggu"** (S9), tidak ada di glosarium (m3). (c) Nama dialog deadline tiga varian: "Ubah deadline" (W-5), "Perpanjang deadline" (S8–S10), "Perpanjang tenggat" (P3) (M7). (d) "Shipped/Slipped" (W-9) vs "Shipped (Selesai)/Meleset" (S12) (m3). |

### 3.2 IA & nama menu

- **Sidebar:** sama persis di ketiga file: ⌘K Cari/perintah · ＋ Buat cepat · Beranda · Inbox · Proyek · Pekerjaan (Tugas saya · Tiket · Ide & Pengembangan · Siap QC · Semua · View tersimpan) · Rapat & Events · Tim & Kapasitas · Sampah · Pengaturan (Workspace · Peran & izin · AI & Data · Integrasi · Notifikasi). ✅ Sesuai DECISIONS (memakai "Siap QC", bukan "Menunggu QC" versi R1).
- **Tab Detail Proyek:** Overview | Pekerjaan | Rencana | Tim | Retro di W-0, S8–S13. ✅
- **E1:** kata "Inbox" tidak muncul di dalam Pekerjaan; Tiket memakai sub-tab Triage | Berjalan (W-2, S1, P4). ✅
- **Penyimpangan:** bottom bar PWA punya tiga versi (M4). "Proyek › Pengaturan › AI" disebut di P15, padahal tidak ada tab Pengaturan di Detail Proyek (m8). Ikon menu berbeda antara 01 (☺) dan 02 (◎) (abaikan, lo-fi).

### 3.3 Aturan AI di setiap layar AI

Kolom: L = label "Draf AI"/✦ · S = sitasi/sumber · C = confidence · A = Terima/Ubah/Tolak · F = fallback.

| Layar | Fitur | L | S | C | A | F | Catatan |
|---|---|---|---|---|---|---|---|
| S2 | Briefing Member (AI-1) | ✅ | ✅ | ✅ | ✅* | ✅ | *A dimaknai ulang untuk output baca-saja (01-Asumsi). Briefing berisi 7 poin, melebihi aturan 3–5 (m2) |
| S3 | Briefing portofolio | ✅ | ✅ | ✅ | ✅* | ✅ | |
| S4 | Saran triage + duplikat di pratinjau Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | Aksi triage dijalankan dari Inbox (m19) |
| S6 | Kartu "Dari cerita" | ✅ | — | — | — | ✅ | pintu masuk |
| S7 | Planner AI-7 | ✅ | ✅ | ✅ | ✅ (Terima/Ubah/Buang/↻) | ✅ | angka ringkasan tidak konsisten (m16) |
| S8 | Ringkasan proyek 3 kalimat | ✅ | ✅ | ✅ | ✅* | ✅ | |
| S12 | Retro AI (P1) | ✅ | ✅ | ✅ | ✅ | ✅ | |
| S13 | Penjelasan Health v2 (P1) | ✅ | ✅ | ✅ | ✅ | ✅ | |
| P2 | Chip "✦ saran: Tinggi" di kartu Board | ✅ | ❌ | ❌ | ❌ | ❌ | pointer saja; perlu tooltip/tautan ke panel (m10) |
| P4 | Triage AI-2 + duplikat AI-3 | ✅ | ✅ | ✅ | ✅ | ✅ | "Tolak" ganda makna (M2) |
| P5 | Skor ide (P2) | ✅ | ✅ | ✅ | ✅ | ✅ | |
| P6 | Panel saran item | ✅ | ✅ | ✅ | ✅ | ✅ | |
| P7 | Quick-add AI-4 | ✅ | ✅ (kata asal) | ✅ per field | ✅ (Buat/Ubah/Buang) | ✅ | |
| P11 | Draf notulensi AI-5 | ✅ | ✅ (timestamp/foto) | ✅ | ✅ | ✅ | |
| P12 | Hasil Rapat AI-6 | ✅ | ✅ | ✅ | ⚠️ | ✅ | item Informasi hanya punya "Tolak"; tidak ada "Ubah kategori" (m11) |
| P14 | ⌘K NL (P1) | ✅ | ✅ (per kata) | ✅ | ✅ | ✅ | |
| P16 | Briefing mobile | ✅ | ✅ | ✅ | ❌ (👍/👎) | ✅ | (m10) |
| P16 | Saran triage mobile | ✅ | ✅ | ✅ | ✅ | ❌ | fallback tidak dinyatakan (m10) |

Kesimpulan: 14 dari 18 permukaan AI memenuhi kelima unsur. Empat sisanya kurang satu atau dua unsur, semuanya Minor.

### 3.4 Level approval L0–L4

| Fitur | workflow (W-10 tabel) | Wireframe | Hasil |
|---|---|---|---|
| AI-1 Briefing | L1 | S2 "baca saja", P15 "L1 Suggest (baca saja)" | ✅ |
| AI-2 Triage | L1 (L3 opt-in P1) | P4 "L1 Suggest", P15 "L1 ▾ L3 auto-apply: P1" | ✅ |
| AI-3 Duplikat | L1, tidak pernah auto-close | P15 "L1 (terkunci)" | ✅ |
| AI-4 Quick-add | L2 | P7, P15 "L2 Confirm" | ✅ |
| **AI-5 Capture & draf notulensi** | **L1 (draf)** | **P15 "L2 Confirm"** | ❌ **berbeda** (M5) |
| AI-6 Hasil Rapat | L2 | S4, P12, P15 "L2 Confirm (terkunci)" | ✅ |
| AI-7 Planner | L2 | S7, P15 "L2 Confirm (terkunci)" | ✅ |
| Retro AI / agen / status update | L2 / L2→L3 / L2 + Lead | S12 "(L2)", S11, S8 P1 | ✅ |
| Prinsip "P0 tidak ada di atas L2" | ✅ | P15 catatan ✅ | ✅ |
| "Selalu butuh manusia" | W-0, W-10 | S10, P15 (terkunci), P2 drag guard, S11 | ✅ |

### 3.5 D7 / D10 / E2 / E3

| Aturan | workflow | Wireframe | Hasil |
|---|---|---|---|
| **D7** item rapat → Terbuka jika proyek + PIC, selain itu Triage | W-3 step 15, Diagram 1 S6 | P12 ringkasan (2 → Terbuka, 2 → Triage), S4 catatan | ✅ alurnya benar. ⚠️ W-1 menuntut **prioritas** untuk Terbuka (T1, Langkah 1), sedangkan P12 tidak punya field prioritas (M1) |
| **D10** beban individu: ybs + PM/Lead; lainnya agregat + ketersediaan | Matriks B, W-7 guard | S11 "dilihat oleh anggota lain", P13 "Tampilan Member" | ✅ di Tim. ❌ **S12 Retro menampilkan hitungan per orang ke semua pembaca Retro (termasuk Viewer)** (M8) |
| **E2** alasan + kategori wajib, impact preview, Riwayat jadwal, badge ×N | W-5 Diagram 2, step 7–12 | S9, S10 (state valid & validasi), S8 badge | ✅ isi. ❌ opsi geser jadwal berbeda (W-5: geser fase terakhir default ON; S10: geser proporsional default OFF). Nama dialog tiga versi (M7) |
| **E3** rumus Health, override beralasan, hanya Active | W-5 Diagram 3, step 13–18 | S13, S5 ("—" untuk non-Active), S2 Dieng | ✅ rumus & override. ❌ **contoh S13 salah penyebut**: "9 dari 52 aktif = 17%", padahal S8 menyatakan 52 = total (25 Selesai). Aktif = 27, jadi 9/27 = 33% → **Terpicu** (M9) |

### 3.6 Izin (matriks workflow vs wireframe)

| Aksi | workflow | Wireframe | Hasil |
|---|---|---|---|
| Role proyek Guest | A-03: default Viewer, **maks. Member** | S11 + 01-Asumsi: "Guest **hanya** Viewer" | ❌ (M3) |
| Komentar oleh Viewer | A-28: **tidak** | P6 + 02-Asumsi: Viewer/Guest "baca dan berkomentar" | ❌ (M3) |
| Tolak/Tutup tiket | T3/T10/Matriks: PM; Member hanya item laporannya | P4: "PM/Member proyek" | ❌ (M3) |
| Hapus item | W-1: PM atau **pembuat** item | P6: PM atau **pelapor** | ❌ (M3) |
| Promote ide lintas proyek | W-6: Admin **atau** PM proyek tujuan | P5: "Hanya PM/Lead proyek tujuan" | ⚠️ Admin hilang (M3) |
| Ubah role / pindah Lead | PM, Lead, Admin | S11 ✅ | ✅ |
| Ubah deadline / override health | PM/Lead | S10, S13 ✅ | ✅ |

---

## 4. Validitas teknis

| Pemeriksaan | Metode | Hasil |
|---|---|---|
| Tag tak tertutup / stray | `html.parser` Python: stack per tag, mode longgar (tag opsional `p/li/td/tr` diabaikan) **dan** mode ketat (semua tag harus seimbang) | **0 error** di `workflow.html`, `01`, `02`. Tidak ada tag terbuka di EOF. |
| ID duplikat | parser | 0 duplikat di ketiga file |
| `.wf-index` → id | parser: semua `a[href^="#"]` di dalam `.wf-index` dicocokkan ke `id` | 01: 14/14 valid (S1–S13, `asumsi`). 02: 17/17 valid (p1–p16, `asumsi`). 0 anchor rusak di seluruh dokumen (termasuk TOC `workflow.html`). |
| Tautan antar file | parser | 01 → 02 ada (di intro, bukan di `.wf-index`). **02 → 01 tidak ada** (m7). |
| Sintaks Mermaid | `mermaid@11` + `jsdom` di `/tmp`, `mermaid.parse()` per blok. Validasi parser: blok rusak buatan (node tak tertutup, composite state cacat) terdeteksi FAIL | **21/21 lolos** (6 flowchart, 6 stateDiagram-v2, 6 sequenceDiagram, 3 flowchart LR/TB). Tidak ada `;`/`%%`/entity rawan di label. Composite `state "Fase" as F {…}` valid. |
| Paritas md ↔ html | skrip: unescape blok `pre.mermaid`, bandingkan dengan blok `.md`; hitung heading & baris tabel | 21/21 diagram identik · 99/100 heading (yang tidak ada hanya "Daftar isi", digantikan sidebar TOC) · 251 `<tr>` = 274 baris tabel md − 23 baris pemisah · 38/38 penanda ASUMSI |
| Scroll horizontal: `workflow.html` | inspeksi CSS | Semua 23 tabel di `.table-scroll{overflow-x:auto}`, diagram di `diagram-scroll` + `svg{max-width:100%}`, `pre.code{overflow-x:auto}`, breakpoint 960px. ✅ |
| Scroll horizontal: 02 | scan elemen ber-`width/min-width` ≥ 340px dan tabel tanpa pembungkus | 10/10 tabel di `.scroll{overflow-x:auto}`. Timeline `.tl{min-width:700px}` di `.tlw{overflow-x:auto}`. `.phone{max-width:100%}`, modal `min(760px,100%)`. ✅ |
| Scroll horizontal: 01 | sama | 5 tabel dibungkus `class="tw"`, tetapi **`.tw` tidak didefinisikan** di `wf.css` maupun `<style>` 01. 1 tabel (S9) tanpa pembungkus. `.frame{overflow:hidden}` mencegah scroll halaman, tetapi kolom tabel 7 kolom (S5, S11) **terpotong** di ≤ 900px. Klaim di 01-Asumsi ("tabel dibungkus .tw, scroll di dalam kartu") tidak benar (m6). |
| Sinyal tidak hanya warna | grep kelas warna dan isi teksnya | ✅ chip health "● + teks", chip Telat/Mandek bertuliskan teks, heatmap P13 ada angka %, ketersediaan ada teks. ❌ hanya warna: 02 `.due-warn` (8×, mis. "Kam, 8 Okt" oranye tanpa teks), umur tiket oranye/merah, kalender `.ev.k` (rapat eksternal); 01 bar timeline portofolio `.tb.ok/.warn/.bad` (health per proyek) dan ◆ milestone `.ms.ok/.bad` di S9 (m5). |
| Label teks / landmark | grep | `lang="id"` ✅ di semua file. Struktur heading konsisten (h1 → h2 per layar → h4). 02 `.wf-index` punya `aria-label`, 01 tidak (m7). Tombol digambar sebagai `<span class="btn">` (wajar untuk lo-fi). Tidak ada `<img>` tanpa alt. |
| Mobile | statis (tidak membuka browser, sesuai aturan CLAUDE.md) | Media query 900px menumpuk grid jadi 1 kolom di kedua file. Belum diverifikasi visual. |

---

## 5. Daftar temuan

Severity: **Blocker** = deliverable tidak bisa dipakai atau melanggar DECISIONS secara mendasar · **Major** = akan menghasilkan implementasi salah/ganda atau melanggar aturan eksplisit, wajib diperbaiki sebelum handoff · **Minor** = kualitas, kejelasan, atau a11y, boleh menyusul.

### Blocker (0)

Tidak ada.

### Major (12)

| ID | File · layar/alur | Masalah | Perbaikan konkret |
|---|---|---|---|
| **M1** | `workflow.md` W-1 (Diagram 1, tabel T1–T12, Langkah 1) vs W-6, W-3 step 15, P5, P12 | State machine tidak memuat dua jalur yang dipakai alur lain. (a) Promote ide B/C membuat ide **→ Selesai** dari Triage/Terbuka, padahal satu-satunya jalan ke `done` adalah T7 dari `in_review` oleh reviewer. (b) D7 membuat item rapat **Terbuka** dengan proyek + PIC tanpa prioritas, padahal Langkah 1 & T1 mewajibkan prioritas untuk Terbuka. Backend yang mengikuti W-1 akan menolak kedua aksi. | Tambah **T13** `triage\|open → done` khusus `kind=idea`, aksi "Promote (pecah/jadi proyek)", aktor PM/Admin manusia, efek `promoted_to_ids` / `project_id` + `completed_at`. Tambahkan juga ke Diagram 1 dan tabel. Untuk D7: tambahkan ke W-3 step 15 "prioritas default **Sedang** bila tidak disebut (dapat diubah di P12)", tambahkan field Prioritas di kartu Action item P12, dan ubah W-1 Langkah 1 menjadi "…atau dibuat dari Hasil Rapat dengan proyek + PIC (prioritas default Sedang)". |
| **M2** | `workflow.md` W-2 step 8 & Diagram vs `02` P4 | "Tolak" punya dua arti. Di W-2, Tolak = keputusan triage (→ Dibatalkan + alasan). Di P4, "Tolak" = membuang **saran AI** (tiket tetap Triage), sedangkan pembatalan tiket ada di menu ⋯ "Tutup tiket". Aksi W-2 **Gabung duplikat**, **Minta info**, dan **Teruskan ke PM proyek X** tidak ada di P4. | Pisahkan label di kedua file: **"Tolak saran"** (per chip AI) vs **"Tolak tiket"** (keputusan, → Dibatalkan). Di P4 kolom Aksi: `Terima · Tolak tiket… · ⋯ (Gabung duplikat · Minta info · Teruskan ke PM…)`, dan Terima/Ubah/Tolak saran tetap di sel "Saran AI". Ganti "Tutup tiket" dengan "Tolak tiket" dan tambahkan label "Menunggu pelapor" untuk Minta info. |
| **M3** | `01` S11 + 01-Asumsi; `02` P4, P5, P6 + 02-Asumsi; `workflow.md` Matriks B, A-03, A-28, T3/T10, W-6 | Izin berbeda antar file: (a) Guest "hanya Viewer" vs "default Viewer, maks. Member"; (b) Viewer boleh komentar (02) vs tidak (A-28); (c) Tutup tiket "PM/Member" (P4) vs "PM; pelapor untuk itemnya" (T3/T10); (d) Hapus "PM atau pelapor" (P6) vs "PM atau pembuat item" (W-1); (e) Promote ide lintas proyek tanpa Admin (P5). | Jadikan **Matriks izin workflow** sumber tunggal dan sunting wireframe: S11 dan 01-Asumsi → "Guest: default Viewer, maks. Member (A-03)". P6/02-Asumsi → "Viewer: baca saja (A-28). Guest: komentar pada item yang ia laporkan/ikuti". P4 catatan → "Tolak tiket: PM; pelapor untuk item laporannya". P6 menu ⋯ → "Hapus: PM atau pembuat item". P5 → "PM proyek tujuan atau Admin (lintas proyek)". Tambahkan baris "Komentar Guest vs Viewer" ke Matriks B agar perbedaannya disengaja dan tercatat. |
| **M4** | `workflow.md` W-0 edge case + A-05; `01` S1 (catatan 7 + frame mobile); `02` P16 | Bottom bar PWA punya tiga versi: W-0 = Beranda · Inbox · ＋ · Pekerjaan · Rapat; S1 = Beranda · Inbox · ＋ · Pekerjaan · **Lainnya**; P16 = **Fokus** · Pekerjaan · ＋ · Rapat · Inbox. | Pilih satu dan terapkan di ketiga file. Rekomendasi: **Beranda · Pekerjaan · ＋ · Rapat · Inbox** (urutan P16, karena capture rapat & approval Inbox adalah alur PWA P0 di D15), dengan "Lainnya" lewat menu avatar di header. Ganti label "Fokus" di P16 menjadi "Beranda" (Fokus Saya adalah bagian Beranda), lalu perbarui A-05 dan S1. |
| **M5** | `02` P1/P2/02-Asumsi (Export CSV), P4 + `01` S4 (Kanal "Form portal"/"Email", tombol "Form intake ↗"), P12 (Gabung), P15 (AI-5) vs `workflow.md` W-2, W-3 step 12, W-10 tabel | Fase rilis dan level berbeda: (a) **Export CSV** ditandai P1, padahal fitur lama yang di-KEEP (A3-L13) dan matriks workflow tidak membatasi fase, sehingga muncul regresi MVP tanpa keputusan. (b) Kanal **portal/email** digambar sebagai P0 di P4/S4, padahal W-2 menetapkannya P1 (P0a hanya Laporkan tiket + AI-4). (c) **Gabung** item rapat dengan item yang ada: W-3 = P0b (cari manual), P12 = P1. (d) **AI-5**: W-10 = L1, P15 = L2 Confirm. | (a) Hapus chip P1 dari Export CSV di P1/P2 dan ubah 02-Asumsi menjadi "Export CSV = P0 (KEEP, effort S), mengikuti filter + kolom, tercatat di audit". Tambahkan ke Roadmap W-1 P0a. (b) Di P4/S4 ganti contoh kanal P0 menjadi "Laporkan tiket (in-app)" / "＋ Buat cepat", tandai baris Form portal/Email dengan chip **P1**, dan ubah tombol "Form intake ↗" menjadi chip P1. (c) P12: tambahkan aksi "Gabung dengan item yang ada (cari manual) · P0b" dan biarkan "saran mirip PAY-142" sebagai P1. (d) Samakan AI-5 = **L1** di P15 (draf notulensi baca-edit; konfirmasi formal terjadi di AI-6 L2), atau ubah W-10 bila L2 yang dimaksud. Pilih satu. |
| **M6** | `workflow.md` W-7 step 8 + A-25 + W-0 PM step 1 vs `01` S3 + 01-Asumsi | KPI ke-4 untuk PM berbeda: workflow = "Item menunggu Triage", wireframe = "Proyek Berisiko / Keluar jalur". Catatan: Health v1 baru ada di **P0b**, sedangkan KPI strip ada di **P0a**. | Pilih satu. Rekomendasi: P0a = "Item menunggu Triage" (data tersedia sejak P0a); mulai P0b ganti ke "Proyek Berisiko/Keluar jalur"; P1 = "Kapasitas tim %". Tuliskan urutan per gelombang ini di W-7 step 8, A-25, S3 (kartu ke-4 + catatan 2), dan 01-Asumsi. |
| **M7** | `workflow.md` W-5 step 7–11 vs `01` S10, S8/S9 header, `02` P3 #4 | Dialog deadline berbeda. (a) Opsi geser: W-5 = "Geser **fase terakhir** & milestone-nya, **default ON**; tenggat pekerjaan tidak digeser". S10 = "☐ Geser fase & milestone setelah hari ini **secara proporsional**", default OFF. (b) Nama: "Ubah deadline" / "Perpanjang deadline" / "Perpanjang tenggat". (c) S10 menambah "alasan minimal 20 karakter", yang tidak ada di workflow. | Samakan perilaku: satu opsi "Geser fase terakhir & milestone-nya ke deadline baru" **default ON**, sedangkan geser proporsional = P1 (sejalan dengan "Saran re-plan" P1 di W-5). Nama tunggal: tombol **"Ubah deadline"** (karena juga mencakup percepatan), judul dialog "Ubah deadline · {proyek}", tombol simpan "Simpan perubahan"; badge tetap "Diperpanjang ×N". Tambahkan "alasan min. 20 karakter" ke W-5 step 8 (atau hapus dari S10). Perbarui S8–S13 header, S9, S10, dan P3 #4. |
| **M8** | `01` S12 (#4 "Kontribusi tim") vs `workflow.md` W-9 guard, roadmap W-9 P1, D10, R1 R13 | S12 menampilkan hitungan **per orang** ("Andi 6 selesai · 3 review", …) di P0 tanpa chip P1. W-9 menyatakan "tidak ada metrik individu di retro" dan "kontribusi tim tanpa peringkat menyusul di P1". Retro dibaca Member dan Viewer, sehingga D10 (beban individu hanya untuk ybs + PM/Lead) juga terlanggar. | Di S12: tandai blok Kontribusi dengan chip **P1**, ganti isinya dengan agregat tim ("23 selesai · 20 review · 1 bantu buka blokir oleh 5 anggota"), dan tambahkan catatan "rincian per orang hanya untuk ybs + PM/Lead (D10)". Atau hapus blok dari P0. Selaraskan teks catatan 4 S12. |
| **M9** | `01` S13 (baris "> 20% item Telat"), S8 | Contoh hitungan E3 salah penyebut: "9 dari 52 aktif = 17% → Tidak". S8 menyatakan 52 = total item (25 Selesai), dan Insights S8 memberi aktif = 14 + 9 + 4 = **27**. Hasil benar: 9/27 = **33% → Terpicu**. Contoh ini mengajarkan engineer memakai penyebut total. | Pilih salah satu dan tulis eksplisit: (a) perbaiki angka contoh (mis. "9 dari 47 aktif = 19%"), lalu sesuaikan S8 Insights dan "9 item Telat (17%)"; atau (b) ubah hasil menjadi "Terpicu" dengan 3 aturan Berisiko. Tambahkan definisi penyebut di W-5 step 15 dan S13: "**pekerjaan aktif** = status ∉ {Selesai, Dibatalkan}, tidak termasuk Triage". |
| **M10** | `workflow.md` W-0 (Guest), W-2 step 1 + Diagram ("＋ Buat cepat › Laporkan tiket - P0a"), Matriks B vs `01` S1 #3, `02` P7, P4 "＋ Tiket" | Jalur intake **P0a** tidak punya layar. Composer (S1 #3, P7) hanya punya Tugas · Bug · Ide (+ Proyek baru, Catat rapat); tidak ada **"Laporkan tiket"**, sehingga tidak jelas bagaimana `source=intake` di-set. Arti tombol "＋ Tiket" di P4 tidak dijelaskan. Perjalanan **Guest** (W-0 Diagram 2: lapor → pantau "Dilaporkan oleh saya" → komentar → notulensi rapat) tidak punya satu layar pun. | Tambahkan ke P7 mode/jenis **"Laporkan tiket"** (field: judul, deskripsi, proyek opsional, lampiran; status Triage; `source=intake`; tanpa prioritas/assignee) + catatan bahwa "＋ Tiket" di P4 membuka mode ini. Tambahkan layar baru **P17 · Tampilan Guest** (sidebar terbatas tanpa Tim & Kapasitas/Sampah/Pengaturan, view "Dilaporkan oleh saya", detail item dengan aksi "Minta buka ulang", notulensi terkonfirmasi). Tambahkan juga ke `.wf-index`. |
| **M11** | `01`/`02` (tidak ada layar) vs `workflow.md` W-1 (Sampah 30 hari, P0a), W-8 (Pengaturan › Notifikasi, P0a, C10), Matriks (Peran & izin), W-2 (sub-tab Berjalan), W-9 step 5 (catatan tiga bagian, P0b) | Beberapa permukaan P0 yang disebut workflow atau IA tidak digambar: **Sampah global** (fitur trash lama), **Pengaturan › Notifikasi** (on/off per jenis + kanal), **Pengaturan › Peran & izin**, **Tiket › Berjalan** (hanya teks), dan **catatan Retro manual** "Berjalan baik · Meleset & kenapa · Yang kita ubah" (di S12 hanya muncul sebagai fallback AI P1). | Tambahkan layar ringkas: **P18 Sampah** (list item terhapus, sisa hari, Pulihkan, filter proyek, izin "item yang ia hapus" untuk Member); **P19 Pengaturan › Notifikasi** (tabel jenis × kanal in-app/push/email sesuai tabel W-8) + **Peran & izin** (tampilan read-only Matriks A/B); frame kedua di **P4 untuk sub-tab Berjalan** (kolom Assignee/Status/Umur/Tenggat). Di **S12**: tambahkan blok P0 "Catatan retro" dengan tiga kolom yang bisa diisi, terpisah dari blok Retro AI P1. |
| **M12** | `02` P1 (#3 "Terbuka 11"), P2 ("Terbuka 18") | Chip hitungan memakai label status **"Terbuka"** untuk agregat semua status aktif. P1 menunjukkan Terbuka 6 + Dikerjakan 3 + Siap QC 2 = 11. Ini melanggar Prinsip 4 (satu glosarium) dan akan menghasilkan query salah (`status=open` vs `status ∈ aktif`). | Ganti label chip menjadi **"Aktif 11"** / **"Aktif 18"** dan tambahkan "Aktif" sebagai istilah turunan di glosarium workflow ("Aktif = Terbuka + Dikerjakan + Siap QC"). Chip "Terbuka" hanya dipakai untuk status `open`. Periksa juga S3 "Pekerjaan aktif" dan P5 "Terbuka 17" (di P5, karena ide tidak memakai Dikerjakan, label itu benar bila memang `status=open`). |

### Minor (20)

| ID | File · layar | Masalah | Perbaikan konkret |
|---|---|---|---|
| m1 | `01` vs `02` (intro, semua layar) | Persona dan data berbeda: 01 = Andi **Saputra** (Member), Sari **Wulandari** (PM), proyek Atlas. 02 = Rina **Wijaya** (Member), Andi **Nugroho** (PM/Admin), Sari **Lestari**, proyek Payment Gateway v2. Nama "Andi" berganti peran antar file. | Satukan persona di kedua intro (mis. Member = Rina Wijaya, PM/Lead = Sari Wulandari, Admin = Andi Nugroho). Proyek boleh berbeda, tetapi sebutkan di intro 02 bahwa Atlas dan Payment Gateway v2 adalah dua proyek workspace yang sama. |
| m2 | `01` S2 | Briefing harian berisi **7 poin**, sedangkan aturan W-7/S2-catatan adalah 3–5. Mode Harian juga memuat poin mingguan ("Minggu lalu kamu menyelesaikan…", "Keputusan penting"). | Kurangi menjadi 5 poin harian. Pindahkan 2 poin mingguan ke contoh mode Mingguan (bisa sebagai frame kecil di bawahnya). |
| m3 | `workflow.md` W-5 Diagram 1 / W-9 vs `01` S9, S12 | Istilah di luar glosarium berbeda: milestone **Pending** vs **Menunggu**; **Shipped/Slipped** vs Shipped (Selesai)/**Meleset**. | Tambahkan baris glosarium "Status milestone: Menunggu · Tercapai · Meleset" dan "Kartu retro: Shipped (Selesai) · Meleset · Masih terblokir · Item baru · Perpanjangan", lalu ganti "Pending" dan "Slipped" di W-5/W-9. |
| m4 | `workflow.md` A-06, A-31, W-10 step 11 vs `02` P8 #5 + 02-Asumsi | Jendela undo batch **24 jam** (workflow) vs **7 hari** (import, wireframe). | Pilih satu, atau bedakan secara eksplisit (mis. import = 7 hari karena dipicu manusia, L2 AI = 24 jam) dan catat di A-06/A-31. |
| m5 | `02` P1, P2, P4, P9; `01` S5, S9 | Sinyal **hanya warna**: tenggat oranye "≤ 3 hari" tanpa teks (8×), umur tiket oranye/merah, kalender rapat eksternal oranye, bar timeline portofolio (health), ◆ milestone hijau/merah di S9. Ambang "≤ 3 hari" (P1) juga berbeda dari "Segera ≤ 2 hari kerja" (W-7). | Tambahkan teks/ikon: "Kam, 8 Okt · **Segera**", "⚠ 6 hr", "👥 Demo klien (eksternal)", label health di ujung bar timeline, "◆✓/◆✕" di milestone. Samakan ambang oranye = "Segera" (≤ 2 hari kerja). |
| m6 | `01` S3, S5, S11, S12, S13 (+ S9 tanpa pembungkus); 01-Asumsi | `class="tw"` dipakai tetapi tidak didefinisikan. Dengan `.frame{overflow:hidden}`, tabel 7 kolom terpotong di ≤ 900px. 01-Asumsi mengklaim tabel bisa di-scroll. | Tambahkan `.tw{overflow-x:auto;max-width:100%}.tw>table{min-width:640px}` ke `<style>` file 01 (bukan `wf.css`), lalu bungkus tabel S9 dengan `.tw`. Atau pindahkan aturan `.scroll` dari 02 ke `wf.css` dalam satu perubahan terkoordinasi. |
| m7 | `01` `.wf-index`, `02` `.wf-index` | Navigasi antar file satu arah (02 tidak menaut ke 01). 01 `.wf-index` tanpa `aria-label`. | Tambahkan `<a href="01-beranda-proyek.html">← 01</a>` di `.wf-index` 02 dan `<a href="02-pekerjaan-rapat-tim.html">02 →</a>` di 01. Tambahkan `aria-label="Navigasi layar"` di 01. |
| m8 | `02` P15 ("Override per proyek: Proyek › Pengaturan › AI") vs IA 5 tab | Lokasi toggle AI per proyek (A-27, Matriks "Matikan AI di proyek ini") tidak ada di IA. | Tetapkan lokasinya di header Detail Proyek **⋯ › Pengaturan proyek › AI** (drawer). Tulis di W-10 Aktor/Langkah 2 dan P15. |
| m9 | `workflow.md` W-8 Diagram 2 | Cabang "Ubah" menulis `AISuggestion` = **rejected** + nilai koreksi. Ini membuat metrik akurasi bias dan tidak sejalan dengan W-2 step 9. | Tambahkan status `edited` (diterima dengan koreksi) dan ubah Diagram 2: `Ubah → status edited + nilai koreksi`. Definisikan status enum `AISuggestion`: pending · accepted · edited · rejected · expired. |
| m10 | `02` P2 (kartu Board), P16 (Briefing, saran triage) | Output AI tidak lengkap: chip "✦ saran: Tinggi" di Board tanpa confidence/aksi; Briefing mobile memakai 👍/👎, bukan Terima/Ubah/Tolak; saran triage mobile tanpa fallback. | Board: chip menampilkan confidence ("✦ Tinggi · Sedang") dan membuka panel P6 saat diklik (catat di anotasi). P16: samakan aksi dengan S2 (Terima/Ubah/Tolak, atau definisikan bahwa 👍/👎 = Terima/Tolak untuk output baca-saja di semua layar) dan tambahkan baris fallback di kartu triage. |
| m11 | `02` P12 vs `workflow.md` W-3 step 12–14 | (a) Item Informasi hanya punya "Tolak". (b) Aksi **Ubah kategori** (W-3) tidak ada. (c) "Konfirmasi & buat 4 item" ikut menghitung item ber-confidence Rendah yang "masih perlu ditinjau" (2 → Triage termasuk item Pak Hendra). (d) "Ajukan perpanjangan milestone… (E2)", padahal E2 hanya berlaku untuk deadline proyek. | (a, b) Semua item: Terima · Ubah · Ubah kategori ▾ · Tolak. (c) Ringkasan: "1 tugas → Triage · 1 belum ditinjau (tidak ikut dibuat)", tombol "Konfirmasi & buat 3 item". (d) Ganti dengan "Buka Rencana untuk menggeser milestone", atau tambahkan aturan pergeseran milestone ke W-5. |
| m12 | `02` P4, P5 vs note.md Ticket/Pengembangan; `workflow.md` A-08 | Filter **Status/Prioritas/Assignee** (Tiket) dan **Prioritas/Assignee** (Ide) dari note.md tidak tergambar. Belum jelas apakah item `kind=idea` berstatus Triage (P5 IDE-37) ikut muncul di **Tiket › Triage** (A-08: "semua sumber"). | Tambahkan "＋ Filter" atau dropdown yang hilang di P4/P5. Tegaskan di A-08 dan P4: "Tiket › Triage memuat semua item Triage **kecuali `kind=idea`**, yang ditinjau di Ide & Pengembangan" (atau sebaliknya, tetapi eksplisit). |
| m13 | `01` S9; `02` P1, P9 | Belum digambar: edit/hapus milestone & fase, **drawer detail fase** (R1 C2, P0), kontrol "pilih semua" (fitur select lama), **form Buat event** (peserta tamu, proyek, flag Rahasia, yang memicu D3). | Tambahkan mini-frame: drawer fase (nama, tujuan, tanggal, progres, item; aksi Edit/Mulai/Selesaikan/Hapus → "item pindah ke Tanpa fase"); checkbox header "Pilih semua (n)" di P1; modal Buat event di P9 dengan field peserta (anggota + email tamu → penanda eksternal), proyek, Kerahasiaan. |
| m14 | `01` S11, `02` P13 vs note.md Menu Tim | "Beban tim" (jumlah task terbuka per orang, urut beban/telat/nama) hanya ada di P1 (kapasitas tertimbang). Di P0 tidak ada pengganti. | Tambahkan varian P0 deterministik "Item aktif · Telat per orang" (visibilitas D10, sortir beban/telat/nama). Kapasitas tertimbang tetap P1. Catat di roadmap W-0/Tim. |
| m15 | `02` P10 (varian eksternal) vs `workflow.md` W-3 Diagram 1 (b2 → c3 Foto) | Rapat eksternal: W-3 masih mengizinkan **Foto whiteboard**, P10 hanya Ketik/Tempel. | Samakan: tambahkan "📷 Foto whiteboard" di varian eksternal P10/P16, atau hapus panah b2 → c3 di W-3. |
| m16 | `01` S7; `workflow.md` W-4 step 8 | Angka ringkasan draf tidak konsisten (17 item vs 22 baris review; tombol "13 item"). W-4 step 8 menyebut "klik ini konfirmasi untuk semua item", sedangkan guard dan S7 hanya membuat item Diterima/Diubah. | Rapikan angka contoh. Ubah W-4 step 8: "Buat proyek mengonfirmasi semua item berstatus Diterima/Diubah; item Belum direview tidak dibuat". |
| m17 | `01` S13 (#3 override → Untuk diketahui ke anggota), S10 | Perilaku tambahan wireframe belum ada di workflow: override health dikirim sebagai notifikasi ke anggota. | Tambahkan ke W-5 step 18 dan tabel jenis notifikasi W-8 ("Health di-override · anggota · Untuk diketahui · P0b"). |
| m18 | `workflow.md` Matriks B | Guest (role Viewer) boleh komentar, sedangkan Viewer internal tidak (A-28). Hasilnya pihak luar punya hak lebih dari anggota internal. | Putuskan secara eksplisit di A-28: Viewer boleh komentar (disarankan, konsisten dengan Guest), atau Guest hanya pada item laporannya. Tambahkan ke Pertanyaan terbuka #12. |
| m19 | `01` S4 (pratinjau triage di Inbox) vs `workflow.md` W-8 step 8, E1 | Inbox menjalankan triage penuh (Terima/Ubah/Tolak + Tandai duplikat), sedangkan workflow menyebut kartu Inbox hanya membuka layar asal. Risikonya ada dua UI triage. | Tambahkan anotasi S4: "Pratinjau memanggil aksi Tool API yang sama dengan Tiket › Triage; aksi Gabung/Minta info/Teruskan hanya di Tiket". Atau sisakan tombol "Buka di Tiket › Triage". Selaraskan W-8 step 8. |
| m20 | `02` P8 vs note.md Ticket bulk CSV | Tiket yang diimpor menjadi `source=import`, sehingga tidak masuk view Tiket (didefinisikan `source=intake`). | Tambahkan opsi di langkah 1 P8: "Sumber item: Import (default) · Tiket (intake)", atau catat di W-2 bahwa import tiket memakai `source=intake` + `source_ref.import_batch`. |

---

## 6. Verdict

### **PERLU REVISI** (terarah)

**Alasan:** tidak ada Blocker, dan kualitas tiap file tinggi (rata-rata 7,0–7,8). Namun ada **12 Major** yang akan menghasilkan implementasi berbeda tergantung file mana yang dibaca engineer: state machine, arti "Tolak", izin, bottom bar, fase rilis, KPI, dialog deadline. Dua di antaranya melanggar aturan eksplisit (metrik individu di Retro vs D10/R13; label status untuk agregat vs Prinsip 4). Kriteria "SIAP DENGAN PERBAIKAN MINOR" tidak terpenuhi selama Major masih terbuka.

**Urutan perbaikan yang disarankan (±1–2 hari):**
1. `workflow.md`: M1 (T13 + prioritas default D7), M6/M7 (pilih nilai), m3, m9. Workflow menjadi acuan tunggal.
2. Wireframe mengikuti workflow: M2, M3, M4, M5, M8, M9, M12.
3. Tambah layar: M10 (Laporkan tiket + P17 Guest), M11 (P18 Sampah, P19 Notifikasi/Peran, Tiket › Berjalan, catatan Retro P0).
4. Minor bisa diselesaikan di putaran yang sama atau sesudah handoff.

**Syarat naik ke SIAP:** seluruh M1–M12 ditutup, lalu cek ulang dengan skrip yang sama: 0 error parser, 21+/21+ Mermaid lolos, dan semua tautan `.wf-index` valid, termasuk layar baru.

---

### Lampiran — metode & reproduksi (read-only)

- `python3` `html.parser`: stack tag mode longgar dan ketat, ID duplikat, pencocokan `href="#…"` ke `id`, deteksi tabel tanpa pembungkus overflow, scan `width/min-width ≥ 340px` dan `nowrap`. Skrip berada di `/tmp/mmcheck/htmlcheck.py`.
- `mermaid@11` + `jsdom` (diinstal di `/tmp/mmcheck`, bukan di proyek): `mermaid.parse()` per blok dari `workflow.md`. Parser divalidasi dengan dua blok rusak buatan yang terdeteksi FAIL.
- Paritas md ↔ html: perbandingan blok Mermaid setelah unescape, heading, jumlah `<tr>` vs baris tabel md, dan jumlah penanda ASUMSI.
- Ekstraksi teks wireframe per `section.screen` (chip/btn/AI-block ditandai) untuk membandingkan isi dengan workflow dan DECISIONS. Pengecekan dilakukan statis; browser tidak dibuka (aturan CLAUDE.md global: Playwright/browser hanya atas perintah eksplisit).
- Tidak ada file deliverable, `wf.css`, atau `DECISIONS.md` yang diubah. Satu-satunya file yang ditulis adalah laporan ini.
