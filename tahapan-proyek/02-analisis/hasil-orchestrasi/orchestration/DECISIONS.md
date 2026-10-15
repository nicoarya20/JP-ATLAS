# DECISIONS — Keputusan Orkestrator (final untuk fase workflow & wireframe)

Tanggal: 5 Oktober 2026 · Run `run_16f58567a2c7`
Dasar: analysis/A1–A4 + reviews/R1-review-analisis.md (§4 & §5 diterima sebagai baseline kecuali dinyatakan lain di bawah).
Label **[ASUMSI]** = default yang diambil orkestrator karena butuh fakta dari user; desain harus tetap berjalan, tetapi tandai di dokumen/wireframe sebagai "perlu konfirmasi".

## Prinsip produk (berlaku untuk semua deliverable)
1. **AI menyarankan, manusia memutuskan.** Angka/hitungan dari query deterministik, bukan LLM. LLM hanya menarasikan, mengekstrak, dan menyarankan.
2. **Setiap output AI di UI wajib punya:** label "Draf AI"/ikon AI, sumber/kutipan, confidence (Tinggi/Sedang/Rendah), aksi Terima / Ubah / Tolak, dan fallback ketika AI tidak tersedia.
3. **Model approval L0–L4** (A4§6.2). **Selalu butuh manusia:** delete, close/done, extend deadline, ubah role/member, kirim ke pihak eksternal, bulk > 20 item.
4. **Satu glosarium** (di bawah) dipakai di semua dokumen, wireframe, dan prompt AI.

## Keputusan
| ID | Keputusan | Catatan |
|---|---|---|
| **D1** | **A — Satu entitas Work Item.** kind = `task` · `bug` · `idea`. Status = `triage` → `open` → `in_progress` → `in_review` → `done` / `canceled`. Label UI `in_review` = **"Siap QC"**. **Tiket = `source` intake** (form/email/portal) dan terlihat di semua status. Flag turunan: `overdue`, `blocked`, `stale` (>7 hari tanpa aktivitas), `reopened` (reopen_count>0). | [ASUMSI] tidak ada tim QA dengan backlog terpisah, jadi pekerjaan QA = tag `qa` + reviewer di `in_review`. |
| **D2** | **B — P0 ramping "deterministik dulu"** + satu engine AI bersama. ADD-AI P0 = AI-0…AI-7 (R1§5.3). ⌘K NL, semantic search UI, MCP, status update AI, smart import AI, digest → P1. | AI-4 (quick-add NL) adalah kandidat pertama dipotong jika kapasitas kurang. |
| **D3** | **A default + B opsi workspace.** Penyedia LLM/STT dengan zero-retention + no-training + DPA; consent wajib sebelum rekam; audio mentah dihapus 30 hari setelah notulensi dikonfirmasi (opsi: hapus segera); rapat dengan pihak eksternal default tidak direkam. | [ASUMSI] butuh review legal (UU PDP 27/2022, DPIA) sebelum rilis P0b. |
| D4 | **A** — notulis/pembuat event mengonfirmasi Hasil Rapat (bisa didelegasikan); PIC menerima notifikasi dan bisa tolak/alihkan; PM/Lead bisa edit kapan saja. | |
| D5 | **A** — Agen = *delegate*; manusia selalu assignee & reviewer. Agen internal P1, agen eksternal/coding P2. | |
| D6 | **A** — Role workspace Admin/Member/Guest + role proyek PM/Member/Viewer + atribut **Lead** (1 orang per proyek) + entitas Agen. Matriks izin wajib ada di workflow. | |
| D7 | **B** — item dari hasil rapat → `open` jika proyek + PIC terisi saat konfirmasi; selain itu → `triage`. | |
| D8 | **B** — Planner v1 "Proyek dari cerita" berbasis **teks** di P0 (draf fase/milestone/task/estimasi/risiko → review per item → create, opsi simpan template). Dokumen/voice/saran assignee di P1. | |
| D9 | **B** — MCP read-only P1, write P2 di balik toggle admin; API tool internal didesain dari awal. | |
| D10 | **C** — beban individu terlihat oleh ybs + PM/Lead; anggota lain hanya agregat + ketersediaan. | [ASUMSI] kebijakan SDM. |
| D11 | **B** — card "commits" disembunyikan sampai integrasi Git (P1) tersambung; tampilkan empty-state "Hubungkan repo". | [ASUMSI] belum ada integrasi Git aktif. |
| D12 | **A** — effort dalam engineer-minggu: S ≤ 1, M 2–4, L > 4. | [ASUMSI] tim 4–5 engineer. |
| D13 | **B** — kalibrasi estimasi memakai cycle time (`in_progress`→`done`), tanpa time tracking. | |
| D14 | **B** — status update stakeholder AI di P1 (in-app + email), wajib approval Lead. | |
| D15 | **A** — responsive web + PWA (capture rapat, Fokus Saya, quick-add, approval Inbox) di P0; native di P2. | |
| D16 | **A** — label menu Bahasa Indonesia; istilah teknis (QC, Inbox, Retro, Board) dipertahankan. | [ASUMSI] preferensi tim. |
| D17 | **A** — dua gelombang: **P0a** (fondasi Work Item, Beranda, Inbox, triage + duplikat, izin, AI-0..AI-4) lalu **P0b** (Rapat AI AI-5/6, Rencana + Health v1, Planner v1 AI-7). MVP ±4–5 bulan. | [ASUMSI] anggaran. |

**Keputusan tambahan orkestrator:**
- **E1 — Penamaan:** "Inbox" HANYA untuk notifikasi & persetujuan (menu tingkat atas). Di Pekerjaan, view tiket bernama **"Tiket"** dengan sub-tab **Triage | Berjalan**. Tidak ada istilah "Inbox" di dalam Pekerjaan.
- **E2 — Extend deadline:** alasan **wajib** + kategori (Scope bertambah / Dependensi eksternal / Estimasi meleset / Sumber daya / Lainnya) + impact preview (task & milestone terdampak). Riwayat pindah ke tab Rencana › Riwayat jadwal; header proyek menampilkan badge "Diperpanjang ×N".
- **E3 — Health v1 (rule-based):** Off track jika lewat deadline atau proyeksi selesai > deadline + 10%; At risk jika ≥ 1 milestone terlewat, > 20% task overdue, atau blocker kritis > 3 hari; selainnya On track. PM/Lead boleh override dengan alasan (tercatat). Health hanya untuk status Active.
- **E4 — Status proyek:** Draft / Active / On Hold / Completed / Cancelled (saat create hanya Draft/Active).

## Glosarium tunggal (wajib dipakai)
| Konsep | Istilah UI | Enum |
|---|---|---|
| Unit kerja | Pekerjaan (item) | WorkItem |
| Jenis | Tugas · Bug · Ide | task · bug · idea |
| Status | Triage · Terbuka · Dikerjakan · Siap QC · Selesai · Dibatalkan | triage · open · in_progress · in_review · done · canceled |
| Kondisi turunan | Telat · Terblokir · Mandek · Dibuka ulang | overdue · blocked · stale · reopened |
| Prioritas | Rendah · Sedang · Tinggi · Kritis | low · medium · high · critical |
| Sumber | Manual · Tiket (intake) · Rapat · Import · Agen | manual · intake · meeting · import · agent |
| Health proyek | Sesuai jalur · Berisiko · Keluar jalur | on_track · at_risk · off_track |
| Rencana proyek | Fase (rentang) · Milestone (titik cek) | Phase · Milestone, task.phaseId |

## IA final (navigasi)
Sidebar: **⌘K Cari/perintah · ＋ Buat cepat · Beranda · Inbox · Proyek · Pekerjaan (Tugas saya · Tiket · Ide & Pengembangan · Siap QC · Semua · View tersimpan) · Rapat & Events · Tim & Kapasitas · Sampah · Pengaturan (Workspace · Peran & izin · AI & Data · Integrasi · Notifikasi)**.
Detail Proyek tabs: **Overview | Pekerjaan | Rencana | Tim | Retro**.
REMOVE final = R1§5.2 (X1–X19). ADD-AI P0 = R1§5.3 (AI-0…AI-7). Diturunkan ke P1 = tabel di akhir R1§5.3.

## Pertanyaan yang tetap dibawa ke user (tidak memblokir)
1. Apakah ada tim QA dengan backlog sendiri? (D1) · 2. Apakah "ticket" dulu dipakai sebagai jenis pekerjaan? (D1) · 3. Kebijakan data & legal untuk rekaman rapat (D3) · 4. Kebijakan visibilitas beban kerja (D10) · 5. Apakah sudah ada integrasi GitHub/GitLab? (D11) · 6. Ukuran tim & anggaran MVP (D12, D17) · 7. Preferensi bahasa label (D16).

---

## Addendum F — Keputusan atas temuan R2 (5 Okt 2026)
Menutup konflik lintas-file di reviews/R2-review-deliverables.md §5. **Workflow tetap acuan tunggal**; wireframe mengikuti nilai di bawah ini.

| ID | Temuan R2 | Keputusan final |
|---|---|---|
| F1 | M1 | Tambah transisi **T13** `triage\|open → done` khusus `kind=idea` lewat aksi "Promote" oleh PM/Admin manusia (efek `promoted_to_ids`/`project_id`, `completed_at`). Item dari Hasil Rapat dengan proyek + PIC → Terbuka dengan **prioritas default Sedang** (bisa diubah di layar Review). |
| F2 | M2 | Dua label berbeda: **"Tolak saran"** (buang saran AI, item tetap Triage) dan **"Tolak tiket"** (keputusan → Dibatalkan + alasan). Aksi triage lengkap di Tiket: Terima · Tolak tiket… · ⋯ (Gabung duplikat · Minta info → label "Menunggu pelapor" · Teruskan ke PM…). Istilah "Tutup tiket" tidak dipakai. |
| F3 | M3, m18 | Matriks izin workflow = sumber tunggal. Guest: default Viewer, maksimal Member. **Viewer boleh berkomentar**. Guest hanya berkomentar pada item yang ia laporkan/ikuti. Tolak tiket: PM, atau pelapor untuk itemnya sendiri. Hapus item: PM atau pembuat item. Promote ide lintas proyek: PM proyek tujuan atau Admin. |
| F4 | M4 | Bottom bar PWA: **Beranda · Pekerjaan · ＋ · Rapat · Inbox**. "Lainnya" lewat menu avatar di header. |
| F5 | M5 | Export CSV = **P0** (KEEP). Kanal intake portal/email = **P1**; intake P0 = "Laporkan tiket" in-app + ＋ Buat cepat. Gabung item rapat dengan item yang ada (cari manual) = **P0b**; saran kemiripan otomatis = P1. **AI-5 = L1** (draf baca-edit); konfirmasi formal ada di AI-6 (L2). |
| F6 | M6 | KPI ke-4 untuk PM per gelombang: P0a "Item menunggu Triage" → P0b "Proyek Berisiko/Keluar jalur" → P1 "Kapasitas tim %". |
| F7 | M7 | Satu nama: tombol **"Ubah deadline"**, judul dialog "Ubah deadline · {proyek}", simpan "Simpan perubahan"; badge tetap "Diperpanjang ×N". Opsi "Geser fase terakhir & milestone-nya ke deadline baru" **default ON**; geser proporsional = P1. Tenggat pekerjaan tidak ikut digeser. Alasan minimal 20 karakter. |
| F8 | M8 | Retro P0 hanya menampilkan **agregat tim**. Rincian per orang hanya untuk ybs + PM/Lead (D10); blok kontribusi tanpa peringkat = P1. |
| F9 | M9 | Penyebut Health = **pekerjaan aktif** (status ∉ {Selesai, Dibatalkan}, tidak termasuk Triage). Semua contoh angka wajib konsisten dengan definisi ini. |
| F10 | M10 | Composer punya mode **"Laporkan tiket"** (judul, deskripsi, proyek opsional, lampiran → Triage, `source=intake`, tanpa prioritas/assignee); "＋ Tiket" membuka mode ini. Tambah layar **Tampilan Guest**. |
| F11 | M11 | Tambah layar P0: **Sampah** (30 hari, Pulihkan; Member hanya item yang ia hapus), **Pengaturan › Notifikasi** (jenis × kanal), **Pengaturan › Peran & izin** (read-only matriks), **Tiket › Berjalan**, dan **Catatan retro manual P0** (Berjalan baik · Meleset & kenapa · Yang kita ubah). |
| F12 | M12 | Istilah turunan baru **"Aktif" = Terbuka + Dikerjakan + Siap QC**. Chip agregat memakai "Aktif"; "Terbuka" hanya untuk status `open`. |
| F13 | m1 | Persona tunggal: Member = **Rina Wijaya**, PM/Lead = **Sari Wulandari**, Admin = **Andi Nugroho**. Proyek "Atlas" dan "Payment Gateway v2" berada di workspace yang sama. |
| F14 | m3 | Status milestone: **Menunggu · Tercapai · Meleset**. Kartu retro: **Selesai · Meleset · Masih terblokir · Item baru · Perpanjangan**. |
| F15 | m4 | Undo batch import = **7 hari** (dipicu manusia); undo aksi AI L3 = **24 jam**. |
| F16 | m5 | Ambang "Segera" = **≤ 2 hari kerja**. Setiap sinyal warna wajib punya teks/ikon pendamping. |
| F17 | m8 | Toggle AI per proyek: header Detail Proyek **⋯ › Pengaturan proyek › AI**. |
| F18 | m9 | Enum `AISuggestion.status` = pending · accepted · edited · rejected · expired ("Ubah" = edited). |
| F19 | m12, m20 | Tiket › Triage memuat semua item Triage **kecuali kind=idea** (ide ditinjau di Ide & Pengembangan). Import punya pilihan "Sumber item: Import (default) · Tiket (intake)". |
| F20 | m15, m11d | Rapat eksternal: audio tidak direkam, tetapi **Foto whiteboard, Tempel, dan Ketik tetap boleh**. Item rapat tentang milestone → aksi "Buka Rencana untuk menggeser milestone" (E2 hanya untuk deadline proyek). |
